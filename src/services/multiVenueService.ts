import { OrderbookLevel } from '../types/orderbook';

export interface VenueConfig {
  name: string;
  wsUrl: string;
  formatSymbol: (symbol: string) => string;
  parseMessage: (data: any) => { bids: OrderbookLevel[]; asks: OrderbookLevel[] } | null;
  color: string;
}

export const VENUE_CONFIGS: Record<string, VenueConfig> = {
  binance: {
    name: 'Binance',
    wsUrl: 'wss://stream.binance.com:9443/ws/',
    formatSymbol: (symbol: string) => `${symbol.toLowerCase()}@depth20@100ms`,
    parseMessage: (data: any) => {
      if (!data.bids || !data.asks) return null;
      
      return {
        bids: data.bids
          .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
          .slice(0, 20)
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            side: 'bid' as const,
            venue: 'Binance',
            timestamp: Date.now()
          })),
        asks: data.asks
          .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
          .slice(0, 20)
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            side: 'ask' as const,
            venue: 'Binance',
            timestamp: Date.now()
          }))
      };
    },
    color: '#f0b90b'
  },
  okx: {
    name: 'OKX',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    formatSymbol: (symbol: string) => {
      // Convert btcusdt to BTC-USDT format for OKX
      const upper = symbol.toUpperCase();
      if (upper.endsWith('USDT')) {
        return upper.replace('USDT', '-USDT');
      }
      return upper;
    },
    parseMessage: (data: any) => {
      if (!data.data || !data.data[0] || !data.data[0].bids || !data.data[0].asks) return null;
      
      const orderbook = data.data[0];
      return {
        bids: orderbook.bids
          .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
          .slice(0, 20)
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            side: 'bid' as const,
            venue: 'OKX',
            timestamp: Date.now()
          })),
        asks: orderbook.asks
          .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
          .slice(0, 20)
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            side: 'ask' as const,
            venue: 'OKX',
            timestamp: Date.now()
          }))
      };
    },
    color: '#0052ff'
  },
  bybit: {
    name: 'Bybit',
    wsUrl: 'wss://stream.bybit.com/v5/public/spot',
    formatSymbol: (symbol: string) => symbol.toUpperCase(),
    parseMessage: (data: any) => {
      if (!data.data || !data.data.b || !data.data.a) return null;
      
      return {
        bids: data.data.b
          .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
          .slice(0, 20)
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            side: 'bid' as const,
            venue: 'Bybit',
            timestamp: Date.now()
          })),
        asks: data.data.a
          .filter(([_, quantity]: [string, string]) => parseFloat(quantity) > 0)
          .slice(0, 20)
          .map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            side: 'ask' as const,
            venue: 'Bybit',
            timestamp: Date.now()
          }))
      };
    },
    color: '#f7a600'
  },
  deribit: {
    name: 'Deribit',
    wsUrl: 'wss://www.deribit.com/ws/api/v2',
    formatSymbol: (symbol: string) => symbol.toUpperCase().replace('USDT', '-PERPETUAL'),
    parseMessage: (data: any) => {
      if (!data.params || !data.params.data || !data.params.data.bids || !data.params.data.asks) return null;
      
      const orderbook = data.params.data;
      return {
        bids: orderbook.bids
          .filter(([_, quantity]: [number, number]) => quantity > 0)
          .slice(0, 20)
          .map(([price, quantity]: [number, number]) => ({
            price: price,
            quantity: quantity,
            side: 'bid' as const,
            venue: 'Deribit',
            timestamp: Date.now()
          })),
        asks: orderbook.asks
          .filter(([_, quantity]: [number, number]) => quantity > 0)
          .slice(0, 20)
          .map(([price, quantity]: [number, number]) => ({
            price: price,
            quantity: quantity,
            side: 'ask' as const,
            venue: 'Deribit',
            timestamp: Date.now()
          }))
      };
    },
    color: '#1a1a1a'
  }
};

export class MultiVenueConnection {
  private connections: Map<string, WebSocket> = new Map();
  private callbacks: Map<string, (data: { bids: OrderbookLevel[]; asks: OrderbookLevel[] }) => void> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;

  constructor(private symbol: string) {}

  connect(venueId: string, callback: (data: { bids: OrderbookLevel[]; asks: OrderbookLevel[] }) => void) {
    const config = VENUE_CONFIGS[venueId];
    if (!config) {
      console.error(`Unknown venue: ${venueId}`);
      return;
    }

    this.callbacks.set(venueId, callback);
    this.createConnection(venueId, config);
  }

  disconnect(venueId: string) {
    const ws = this.connections.get(venueId);
    if (ws) {
      ws.close(1000, 'Manual disconnect');
      this.connections.delete(venueId);
      this.callbacks.delete(venueId);
      this.reconnectAttempts.delete(venueId);
    }
  }

  disconnectAll() {
    for (const venueId of this.connections.keys()) {
      this.disconnect(venueId);
    }
  }

  private createConnection(venueId: string, config: VenueConfig) {
    try {
      // For Binance, append the stream name to the URL
      const wsUrl = venueId === 'binance' 
        ? `${config.wsUrl}${config.formatSymbol(this.symbol)}`
        : config.wsUrl;
      
      const ws = new WebSocket(wsUrl);
      this.connections.set(venueId, ws);

      ws.onopen = () => {
        console.log(`Connected to ${config.name}`);
        this.reconnectAttempts.set(venueId, 0);
        
        // Send subscription message based on venue (Binance doesn't need this)
        if (venueId !== 'binance') {
          this.sendSubscription(ws, venueId, config);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const parsed = config.parseMessage(data);
          
          if (parsed) {
            const callback = this.callbacks.get(venueId);
            if (callback) {
              callback(parsed);
            }
          }
        } catch (error) {
          console.error(`Error parsing message from ${config.name}:`, error);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${config.name}:`, {
          error,
          url: wsUrl,
          readyState: ws.readyState,
          venue: venueId
        });
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed for ${config.name}:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          url: wsUrl,
          venue: venueId
        });
        this.connections.delete(venueId);
        
        // Attempt to reconnect if not a manual disconnect
        const attempts = this.reconnectAttempts.get(venueId) || 0;
        if (event.code !== 1000 && attempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
          console.log(`Attempting to reconnect to ${config.name} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
          setTimeout(() => {
            this.reconnectAttempts.set(venueId, attempts + 1);
            this.createConnection(venueId, config);
          }, delay);
        } else if (attempts >= this.maxReconnectAttempts) {
          console.error(`Max reconnection attempts reached for ${config.name}`);
        }
      };
    } catch (error) {
      console.error(`Failed to create connection to ${config.name}:`, error);
    }
  }

  private sendSubscription(ws: WebSocket, venueId: string, config: VenueConfig) {
    const formattedSymbol = config.formatSymbol(this.symbol);
    
    switch (venueId) {
      case 'binance':
        // Binance uses URL-based subscription, no message needed
        break;
      case 'okx':
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [{
            channel: 'books',
            instId: formattedSymbol
          }]
        }));
        break;
      case 'bybit':
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [`orderbook.1.${formattedSymbol}`]
        }));
        break;
      case 'deribit':
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'public/subscribe',
          params: {
            channels: [`book.${formattedSymbol}.100ms`]
          }
        }));
        break;
    }
  }
}
