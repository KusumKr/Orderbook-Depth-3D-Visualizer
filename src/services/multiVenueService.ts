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
      try {
        // Handle both snapshot and update formats
        if (data && typeof data === 'object' && data.bids && data.asks && Array.isArray(data.bids) && Array.isArray(data.asks)) {
          return {
            bids: data.bids
              .filter(([_, quantity]: [string, string]) => {
                const qty = parseFloat(quantity);
                return !isNaN(qty) && qty > 0;
              })
              .slice(0, 20)
              .map(([price, quantity]: [string, string]) => ({
                price: parseFloat(price),
                quantity: parseFloat(quantity),
                side: 'bid' as const,
                venue: 'Binance',
                timestamp: Date.now()
              })),
            asks: data.asks
              .filter(([_, quantity]: [string, string]) => {
                const qty = parseFloat(quantity);
                return !isNaN(qty) && qty > 0;
              })
              .slice(0, 20)
              .map(([price, quantity]: [string, string]) => ({
                price: parseFloat(price),
                quantity: parseFloat(quantity),
                side: 'ask' as const,
                venue: 'Binance',
                timestamp: Date.now()
              }))
          };
        }
      } catch (error) {
        console.error('Binance parse error:', error, data);
      }
      return null;
    },
    color: '#f0b90b'
  },
  okx: {
    name: 'OKX',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    formatSymbol: (symbol: string) => {
      try {
        // Convert btcusdt to BTC-USDT format for OKX
        const upper = symbol.toUpperCase();
        if (upper.includes('USDT')) {
          const base = upper.replace('USDT', '');
          return `${base}-USDT`;
        }
        return upper;
      } catch (error) {
        console.error('OKX symbol format error:', error);
        return 'BTC-USDT'; // fallback
      }
    },
    parseMessage: (data: any) => {
      try {
        // Handle subscription confirmation
        if (data && data.event === 'subscribe') {
          console.log('✅ OKX subscription confirmed');
          return null;
        }
        
        // Handle error responses
        if (data && data.event === 'error') {
          console.error('❌ OKX subscription error:', data.msg || data.code);
          return null;
        }
        
        // Handle orderbook data
        if (data && data.data && Array.isArray(data.data) && data.data[0]) {
          const orderbook = data.data[0];
          if (orderbook.bids && orderbook.asks && Array.isArray(orderbook.bids) && Array.isArray(orderbook.asks)) {
            return {
              bids: orderbook.bids
                .filter(([_, quantity]: [string, string]) => {
                  const qty = parseFloat(quantity);
                  return !isNaN(qty) && qty > 0;
                })
                .slice(0, 20)
                .map(([price, quantity]: [string, string]) => ({
                  price: parseFloat(price),
                  quantity: parseFloat(quantity),
                  side: 'bid' as const,
                  venue: 'OKX',
                  timestamp: Date.now()
                })),
              asks: orderbook.asks
                .filter(([_, quantity]: [string, string]) => {
                  const qty = parseFloat(quantity);
                  return !isNaN(qty) && qty > 0;
                })
                .slice(0, 20)
                .map(([price, quantity]: [string, string]) => ({
                  price: parseFloat(price),
                  quantity: parseFloat(quantity),
                  side: 'ask' as const,
                  venue: 'OKX',
                  timestamp: Date.now()
                }))
            };
          }
        }
      } catch (error) {
        console.error('OKX parse error:', error, data);
      }
      return null;
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
      console.warn(`⚠️ Unknown venue: ${venueId}, using demo mode`);
      return;
    }
    
    this.callbacks.set(venueId, callback);
    
    // For development, skip real connections and use demo mode
    if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
      console.log(`🎭 Using demo mode for ${config.name} (development environment)`);
      return;
    }
    
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
      // Build WebSocket URL based on venue
      let wsUrl: string;
      if (venueId === 'binance') {
        wsUrl = `${config.wsUrl}${config.formatSymbol(this.symbol)}`;
      } else {
        wsUrl = config.wsUrl;
      }
      
      console.log(`🔗 Connecting to ${config.name} at ${wsUrl}`);
      
      // Check if WebSocket is supported
      if (typeof WebSocket === 'undefined') {
        console.error(`❌ WebSocket not supported for ${config.name}`);
        return;
      }
      
      const ws = new WebSocket(wsUrl);
      this.connections.set(venueId, ws);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error(`⏰ Connection timeout for ${config.name}`);
          ws.close(4000, 'Connection timeout');
        }
      }, 15000); // Increased timeout

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`✅ Successfully connected to ${config.name}`);
        this.reconnectAttempts.set(venueId, 0);
        
        // Send subscription message for venues that require it
        if (venueId !== 'binance') {
          setTimeout(() => {
            try {
              if (ws.readyState === WebSocket.OPEN) {
                this.sendSubscription(ws, venueId, config);
              }
            } catch (subError) {
              console.error(`❌ Subscription error for ${config.name}:`, subError);
            }
          }, 200); // Slightly longer delay
        }
      };

      ws.onmessage = (event) => {
        try {
          // Validate message data
          if (!event.data || typeof event.data !== 'string') {
            console.warn(`⚠️ Invalid message data from ${config.name}`);
            return;
          }
          
          const data = JSON.parse(event.data);
          
          // Handle ping/pong for connection health
          if (data.ping) {
            try {
              ws.send(JSON.stringify({ pong: data.ping }));
            } catch (pongError) {
              console.error(`❌ Pong error for ${config.name}:`, pongError);
            }
            return;
          }
          
          // Handle pong responses
          if (data.pong || data.op === 'pong') {
            return;
          }
          
          const parsed = config.parseMessage(data);
          if (parsed && parsed.bids && parsed.asks) {
            const callback = this.callbacks.get(venueId);
            if (callback) {
              callback(parsed);
            }
          }
        } catch (error) {
          console.error(`❌ Message parsing error for ${config.name}:`, error);
          // Don't log the raw data to avoid spam
        }
      };

      ws.onerror = (error) => {
        // Suppress error logging in development mode to reduce console noise
        if (process.env.NODE_ENV !== 'development') {
          console.error(`❌ WebSocket error for ${config.name}:`, {
            error,
            readyState: ws.readyState,
            url: ws.url,
            venue: venueId
          });
        } else {
          console.log(`🔇 WebSocket connection failed for ${config.name} (expected in demo mode)`);
        }
        
        // Clean up the connection
        this.connections.delete(venueId);
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        
        const closeReason = this.getCloseReason(event.code);
        console.log(`🔌 ${config.name} connection closed:`, {
          code: event.code,
          reason: event.reason || closeReason,
          wasClean: event.wasClean,
          venue: venueId
        });
        
        this.connections.delete(venueId);
        
        // Only attempt to reconnect for certain close codes
        const shouldReconnect = this.shouldReconnect(event.code);
        const attempts = this.reconnectAttempts.get(venueId) || 0;
        
        if (shouldReconnect && attempts < this.maxReconnectAttempts) {
          const delay = Math.min(3000 * Math.pow(1.5, attempts), 60000);
          console.log(`🔄 Reconnecting to ${config.name} in ${Math.ceil(delay/1000)}s (${attempts + 1}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.reconnectAttempts.set(venueId, attempts + 1);
            this.createConnection(venueId, config);
          }, delay);
        } else if (attempts >= this.maxReconnectAttempts) {
          console.error(`❌ Max reconnection attempts reached for ${config.name}`);
        } else {
          console.log(`🛑 Not reconnecting to ${config.name} (close code: ${event.code})`);
        }
      };
    } catch (error) {
      console.error(`❌ Failed to create WebSocket connection to ${config.name}:`, error);
    }
  }
  
  private getCloseReason(code: number): string {
    const reasons: Record<number, string> = {
      1000: 'Normal closure',
      1001: 'Going away',
      1002: 'Protocol error',
      1003: 'Unsupported data',
      1004: 'Reserved',
      1005: 'No status received',
      1006: 'Abnormal closure',
      1007: 'Invalid frame payload data',
      1008: 'Policy violation',
      1009: 'Message too big',
      1010: 'Mandatory extension',
      1011: 'Internal server error',
      1015: 'TLS handshake failure',
      4000: 'Connection timeout'
    };
    return reasons[code] || `Unknown close code: ${code}`;
  }
  
  private shouldReconnect(code: number): boolean {
    // Don't reconnect for these codes
    const noReconnectCodes = [1000, 1001, 1008, 4000];
    return !noReconnectCodes.includes(code);
  }

  private sendSubscription(ws: WebSocket, venueId: string, config: VenueConfig) {
    try {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn(`⚠️ Cannot send subscription to ${config.name}: WebSocket not open`);
        return;
      }
      
      const formattedSymbol = config.formatSymbol(this.symbol);
      console.log(`📡 Sending subscription for ${config.name} with symbol: ${formattedSymbol}`);
      
      let subscriptionMessage: string;
      
      switch (venueId) {
        case 'binance':
          // Binance uses URL-based subscription, no message needed
          console.log(`✅ Binance subscription via URL (no message required)`);
          return;
          
        case 'okx':
          subscriptionMessage = JSON.stringify({
            op: 'subscribe',
            args: [{
              channel: 'books',
              instId: formattedSymbol
            }]
          });
          break;
          
        case 'bybit':
          subscriptionMessage = JSON.stringify({
            op: 'subscribe',
            args: [`orderbook.1.${formattedSymbol}`]
          });
          break;
          
        case 'deribit':
          subscriptionMessage = JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'public/subscribe',
            params: {
              channels: [`book.${formattedSymbol}.100ms`]
            }
          });
          break;
          
        default:
          console.error(`❌ Unknown venue for subscription: ${venueId}`);
          return;
      }
      
      console.log(`📤 Sending subscription message to ${config.name}:`, subscriptionMessage);
      ws.send(subscriptionMessage);
      
      // Set a timeout to check if subscription was successful
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log(`⏰ Subscription timeout check for ${config.name}`);
        }
      }, 5000);
      
    } catch (error) {
      console.error(`❌ Failed to send subscription to ${config.name}:`, error);
    }
  }
}
