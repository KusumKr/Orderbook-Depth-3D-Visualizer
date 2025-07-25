import { HistoricalDataPoint, TimeSeriesData, OrderbookLevel } from '../types/orderbook';

export interface HistoricalDataConfig {
  timeRange: string;
  intervalMs: number;
  maxDataPoints: number;
}

export const TIME_RANGE_CONFIGS: Record<string, HistoricalDataConfig> = {
  '1m': { timeRange: '1m', intervalMs: 1000, maxDataPoints: 60 },
  '5m': { timeRange: '5m', intervalMs: 5000, maxDataPoints: 60 },
  '15m': { timeRange: '15m', intervalMs: 15000, maxDataPoints: 60 },
  '1h': { timeRange: '1h', intervalMs: 60000, maxDataPoints: 60 }
};

export class HistoricalDataService {
  private data: TimeSeriesData = {};
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Initialize data structures for each time range
    Object.keys(TIME_RANGE_CONFIGS).forEach(range => {
      this.data[range] = [];
    });
  }

  startRecording(
    timeRange: string,
    getCurrentData: () => { bids: OrderbookLevel[]; asks: OrderbookLevel[]; venues: string[] }
  ) {
    const config = TIME_RANGE_CONFIGS[timeRange];
    if (!config) return;

    // Clear existing interval
    this.stopRecording(timeRange);

    // Start new recording interval
    const interval = setInterval(() => {
      const currentData = getCurrentData();
      
      // Record data for each venue
      currentData.venues.forEach(venue => {
        const venueData: HistoricalDataPoint = {
          timestamp: Date.now(),
          bids: currentData.bids.filter(b => b.venue === venue),
          asks: currentData.asks.filter(a => a.venue === venue),
          venue
        };

        this.addDataPoint(timeRange, venueData);
      });
    }, config.intervalMs);

    this.intervals.set(timeRange, interval);
  }

  stopRecording(timeRange: string) {
    const interval = this.intervals.get(timeRange);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(timeRange);
    }
  }

  private addDataPoint(timeRange: string, dataPoint: HistoricalDataPoint) {
    const config = TIME_RANGE_CONFIGS[timeRange];
    if (!config) return;

    if (!this.data[timeRange]) {
      this.data[timeRange] = [];
    }

    this.data[timeRange].push(dataPoint);

    // Keep only the most recent data points
    if (this.data[timeRange].length > config.maxDataPoints) {
      this.data[timeRange] = this.data[timeRange].slice(-config.maxDataPoints);
    }
  }

  getHistoricalData(timeRange: string, venue?: string): HistoricalDataPoint[] {
    const data = this.data[timeRange] || [];
    
    if (venue) {
      return data.filter(point => point.venue === venue);
    }
    
    return data;
  }

  getTimeSlices(timeRange: string, sliceCount: number = 10): HistoricalDataPoint[][] {
    const data = this.getHistoricalData(timeRange);
    if (data.length === 0) return [];

    const sliceSize = Math.max(1, Math.floor(data.length / sliceCount));
    const slices: HistoricalDataPoint[][] = [];

    for (let i = 0; i < data.length; i += sliceSize) {
      const slice = data.slice(i, i + sliceSize);
      if (slice.length > 0) {
        slices.push(slice);
      }
    }

    return slices.slice(-sliceCount); // Keep only the most recent slices
  }

  // Generate aggregated orderbook for a specific time slice
  getAggregatedSlice(timeRange: string, sliceIndex: number): { bids: OrderbookLevel[]; asks: OrderbookLevel[] } {
    const slices = this.getTimeSlices(timeRange);
    if (sliceIndex >= slices.length) {
      return { bids: [], asks: [] };
    }

    const slice = slices[sliceIndex];
    const allBids: OrderbookLevel[] = [];
    const allAsks: OrderbookLevel[] = [];

    slice.forEach(point => {
      allBids.push(...point.bids);
      allAsks.push(...point.asks);
    });

    // Aggregate by price level
    const bidMap = new Map<number, OrderbookLevel>();
    const askMap = new Map<number, OrderbookLevel>();

    allBids.forEach(bid => {
      const existing = bidMap.get(bid.price);
      if (existing) {
        existing.quantity += bid.quantity;
      } else {
        bidMap.set(bid.price, { ...bid });
      }
    });

    allAsks.forEach(ask => {
      const existing = askMap.get(ask.price);
      if (existing) {
        existing.quantity += ask.quantity;
      } else {
        askMap.set(ask.price, { ...ask });
      }
    });

    return {
      bids: Array.from(bidMap.values()).sort((a, b) => b.price - a.price).slice(0, 20),
      asks: Array.from(askMap.values()).sort((a, b) => a.price - b.price).slice(0, 20)
    };
  }

  // Calculate volume profile over time
  getVolumeProfile(timeRange: string): { price: number; volume: number; timestamp: number }[] {
    const data = this.getHistoricalData(timeRange);
    const volumeMap = new Map<number, { volume: number; timestamp: number }>();

    data.forEach(point => {
      [...point.bids, ...point.asks].forEach(level => {
        const existing = volumeMap.get(level.price);
        if (existing) {
          existing.volume += level.quantity;
          existing.timestamp = Math.max(existing.timestamp, point.timestamp);
        } else {
          volumeMap.set(level.price, {
            volume: level.quantity,
            timestamp: point.timestamp
          });
        }
      });
    });

    return Array.from(volumeMap.entries()).map(([price, data]) => ({
      price,
      volume: data.volume,
      timestamp: data.timestamp
    }));
  }

  // Clean up resources
  destroy() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.data = {};
  }
}

// Singleton instance
export const historicalDataService = new HistoricalDataService();
