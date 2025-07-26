import { useEffect, useState, useRef, useCallback } from "react";

interface OrderbookLevel {
  price: number;
  quantity: number;
  side: "bid" | "ask";
}

interface OrderbookData {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  error: string | null;
  isConnected: boolean;
  lastUpdate: number;
  exchange: string;
}

type Exchange = 'binance' | 'okx';

interface ExchangeConfig {
  name: string;
  wsUrl: (symbol: string) => string;
  parseMessage: (data: any) => { bids: [string, string][], asks: [string, string][] } | null;
  subscribeMessage?: (symbol: string) => string;
}

const EXCHANGE_CONFIGS: Record<Exchange, ExchangeConfig> = {
  binance: {
    name: 'Binance',
    wsUrl: (symbol: string) => `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`,
    parseMessage: (data: any) => {
      if (data.bids && data.asks) {
        return { bids: data.bids, asks: data.asks };
      }
      if (data.b && data.a) {
        return { bids: data.b, asks: data.a };
      }
      return null;
    }
  },
  okx: {
    name: 'OKX',
    wsUrl: () => 'wss://ws.okx.com:8443/ws/v5/public',
    parseMessage: (data: any) => {
      if (data.data && data.data[0] && data.data[0].bids && data.data[0].asks) {
        return { 
          bids: data.data[0].bids, 
          asks: data.data[0].asks 
        };
      }
      return null;
    },
    subscribeMessage: (symbol: string) => JSON.stringify({
      op: 'subscribe',
      args: [{
        channel: 'books',
        instId: symbol.toUpperCase()
      }]
    })
  }
};

export function useOrderbook(
  symbol: string = "BTCUSDT", 
  exchange: Exchange = 'binance'
): OrderbookData {
  const [bids, setBids] = useState<OrderbookLevel[]>([]);
  const [asks, setAsks] = useState<OrderbookLevel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const config = EXCHANGE_CONFIGS[exchange];

  const connect = useCallback(() => {
    try {
      // Close existing connection if any
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'Reconnecting');
        }
        wsRef.current = null;
      }

      // Clear any existing ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      setError(null);
      console.log(`Connecting to ${config.name} for ${symbol}...`);
      
      const ws = new WebSocket(config.wsUrl(symbol));
      wsRef.current = ws;

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          setError(`Connection timeout for ${config.name}`);
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log(`Connected to ${config.name} ${symbol} orderbook stream`);
        
        // Send subscription message for exchanges that require it (like OKX)
        if (config.subscribeMessage) {
          ws.send(config.subscribeMessage(symbol));
        }

        // Set up ping for connection health (every 30 seconds)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ op: 'ping' }));
            } catch (e) {
              console.warn('Failed to send ping:', e);
            }
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong responses
          if (data.op === 'pong' || data.pong) {
            return;
          }

          // Handle error responses
          if (data.error || data.code !== undefined) {
            console.error(`${config.name} WebSocket error:`, data);
            setError(`${config.name} API error: ${data.msg || data.error || 'Unknown error'}`);
            return;
          }

          const parsedData = config.parseMessage(data);
          if (parsedData) {
            setLastUpdate(Date.now());
            
            // Process bids (buy orders)
            const processedBids = parsedData.bids
              .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
              .slice(0, 20)
              .map(([price, quantity]: [string, string]) => ({
                price: parseFloat(price),
                quantity: parseFloat(quantity),
                side: "bid" as const,
              }))
              .sort((a, b) => b.price - a.price); // Sort bids descending
            
            // Process asks (sell orders)
            const processedAsks = parsedData.asks
              .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
              .slice(0, 20)
              .map(([price, quantity]: [string, string]) => ({
                price: parseFloat(price),
                quantity: parseFloat(quantity),
                side: "ask" as const,
              }))
              .sort((a, b) => a.price - b.price); // Sort asks ascending

            setBids(processedBids);
            setAsks(processedAsks);
          }
        } catch (parseError) {
          console.error(`Error parsing ${config.name} WebSocket message:`, parseError);
          setError(`Failed to parse ${config.name} data`);
        }
      };

      ws.onerror = (event) => {
        clearTimeout(connectionTimeout);
        console.error(`${config.name} WebSocket error:`, event);
        setError(`Connection error for ${config.name}`);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        console.log(`${config.name} WebSocket closed:`, event.code, event.reason);
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          setError(`Reconnecting to ${config.name} in ${Math.ceil(delay/1000)}s... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError(`Failed to connect to ${config.name} after ${maxReconnectAttempts} attempts. Please refresh the page.`);
        }
      };
    } catch (err) {
      console.error(`${config.name} WebSocket connection error:`, err);
      setError(`Failed to create ${config.name} WebSocket connection: ${err}`);
      setIsConnected(false);
    }
  }, [symbol, exchange, config]);

  useEffect(() => {
    // Start with demo data immediately
    generateDemoData();
    
    // Then try to connect to real data after a short delay
    const connectTimer = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      clearTimeout(connectTimer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  // Function to generate demo data
  const generateDemoData = useCallback(() => {
    const basePrice = symbol.toLowerCase().includes('btc') ? 45000 : 
                     symbol.toLowerCase().includes('eth') ? 2500 : 
                     symbol.toLowerCase().includes('ada') ? 0.45 : 
                     symbol.toLowerCase().includes('sol') ? 100 :
                     symbol.toLowerCase().includes('dot') ? 8 : 1.2;
    
    const demoBids: OrderbookLevel[] = [];
    const demoAsks: OrderbookLevel[] = [];

    for (let i = 0; i < 20; i++) {
      const priceDiff = basePrice * 0.0001 * (i + 1); // 0.01% increments
      demoBids.push({
        price: basePrice - priceDiff,
        quantity: Math.random() * 10 + 0.1,
        side: "bid"
      });
      demoAsks.push({
        price: basePrice + priceDiff,
        quantity: Math.random() * 10 + 0.1,
        side: "ask"
      });
    }

    // Sort demo data properly
    demoBids.sort((a, b) => b.price - a.price);
    demoAsks.sort((a, b) => a.price - b.price);

    setBids(demoBids);
    setAsks(demoAsks);
  }, [symbol]);

  // Generate demo data if no real data is available
  useEffect(() => {
    if (!isConnected && bids.length === 0 && asks.length === 0) {
      generateDemoData();
    }
  }, [isConnected, bids.length, asks.length, generateDemoData]);

  return { 
    bids, 
    asks, 
    error, 
    isConnected, 
    lastUpdate, 
    exchange: config.name 
  };
}