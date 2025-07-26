export interface OrderbookLevel {
  price: number;
  quantity: number;
  side: "bid" | "ask";
  venue?: string;
  timestamp?: number;
  color?: string; // <-- color property for visualization
}

export interface OrderbookData {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  error: string | null;
  isConnected: boolean;
  lastUpdate: number;
  venues?: string[];
}

export interface MultiVenueOrderbookData {
  [venue: string]: {
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
    isConnected: boolean;
    lastUpdate: number;
    error: string | null;
  };
}

export interface AggregatedOrderbook {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  venueData: MultiVenueOrderbookData;
  totalVenues: number;
  connectedVenues: number;
  lastUpdate: number;
}

export interface HistoricalDataPoint {
  timestamp: number;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  venue: string;
}

export interface TimeSeriesData {
  [timeRange: string]: HistoricalDataPoint[];
}

export interface TradeExecution {
  id: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  venue: string;
  timestamp: number;
  matchedOrders: {
    bidPrice: number;
    askPrice: number;
    executedQuantity: number;
  };
}

export interface OrderFlowEvent {
  id: string;
  type: "placement" | "execution" | "cancellation";
  price: number;
  quantity: number;
  side: "bid" | "ask";
  venue: string;
  timestamp: number;
}
