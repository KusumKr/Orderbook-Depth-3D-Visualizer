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
}

export function useOrderbook(symbol: string = "btcusdt"): OrderbookData {
  const [bids, setBids] = useState<OrderbookLevel[]>([]);
  const [asks, setAsks] = useState<OrderbookLevel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      setError(null);
      // Use the correct Binance WebSocket URL format
      const ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log(`Connected to ${symbol.toUpperCase()} orderbook stream`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastUpdate(Date.now());
          
          // Handle both depth snapshot and depth update formats
          if (data.bids && data.asks) {
            // Depth snapshot format
            setBids(
              data.bids
                .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
                .slice(0, 20)
                .map(([price, quantity]: [string, string]) => ({
                  price: parseFloat(price),
                  quantity: parseFloat(quantity),
                  side: "bid" as const,
                }))
            );
            setAsks(
              data.asks
                .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
                .slice(0, 20)
                .map(([price, quantity]: [string, string]) => ({
                  price: parseFloat(price),
                  quantity: parseFloat(quantity),
                  side: "ask" as const,
                }))
            );
          } else if (data.b && data.a) {
            // Depth update format
            setBids(
              data.b
                .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
                .slice(0, 20)
                .map(([price, quantity]: [string, string]) => ({
                  price: parseFloat(price),
                  quantity: parseFloat(quantity),
                  side: "bid" as const,
                }))
            );
            setAsks(
              data.a
                .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
                .slice(0, 20)
                .map(([price, quantity]: [string, string]) => ({
                  price: parseFloat(price),
                  quantity: parseFloat(quantity),
                  side: "ask" as const,
                }))
            );
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(`Connection error for ${symbol.toUpperCase()}`);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        console.log(`WebSocket closed for ${symbol.toUpperCase()}:`, event.code, event.reason);
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          setError(`Reconnecting in ${delay/1000}s... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError(`Failed to connect after ${maxReconnectAttempts} attempts. Please refresh the page.`);
        }
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setError(`Failed to create WebSocket connection: ${err}`);
      setIsConnected(false);
    }
  }, [symbol]);

  useEffect(() => {
    // Start with demo data immediately
    generateDemoData();
    
    // Then try to connect to real data
    const connectTimer = setTimeout(() => {
      connect();
    }, 1000);

    return () => {
      clearTimeout(connectTimer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
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
                     symbol.toLowerCase().includes('ada') ? 0.45 : 1.2;
    
    const demoBids: OrderbookLevel[] = [];
    const demoAsks: OrderbookLevel[] = [];

    for (let i = 0; i < 20; i++) {
      const priceDiff = basePrice * 0.0002 * (i + 1); // 0.02% increments
      demoBids.push({
        price: basePrice - priceDiff,
        quantity: Math.random() * 5 + 0.1,
        side: "bid"
      });
      demoAsks.push({
        price: basePrice + priceDiff,
        quantity: Math.random() * 5 + 0.1,
        side: "ask"
      });
    }

    setBids(demoBids);
    setAsks(demoAsks);
  }, [symbol]);

  // Generate demo data if no real data is available
  useEffect(() => {
    if (!isConnected && bids.length === 0 && asks.length === 0) {
      generateDemoData();
    }
  }, [isConnected, bids.length, asks.length, generateDemoData]);

  return { bids, asks, error, isConnected, lastUpdate };
}