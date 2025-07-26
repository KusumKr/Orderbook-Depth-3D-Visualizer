import { useEffect, useState, useRef, useCallback } from "react";
import { MultiVenueConnection, VENUE_CONFIGS } from '../services/multiVenueService';
import { OrderbookLevel, AggregatedOrderbook, MultiVenueOrderbookData } from '../types/orderbook';

export function useMultiVenueOrderbook(
  symbol: string = "btcusdt",
  selectedVenues: string[] = ['binance']
): AggregatedOrderbook {
  const [venueData, setVenueData] = useState<MultiVenueOrderbookData>({});
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const connectionRef = useRef<MultiVenueConnection | null>(null);
  const activeVenuesRef = useRef<Set<string>>(new Set());

  // Generate demo data for venues when not connected
  const generateDemoData = useCallback((venue: string) => {
    const basePrice = symbol.toLowerCase().includes('btc') ? 45000 : 
                     symbol.toLowerCase().includes('eth') ? 2500 : 
                     symbol.toLowerCase().includes('ada') ? 0.45 : 1.2;
    
    // Add slight price variation per venue
    const venueMultiplier = venue === 'binance' ? 1.0 : 
                           venue === 'okx' ? 1.001 : 
                           venue === 'bybit' ? 0.999 : 1.002;
    
    const adjustedBasePrice = basePrice * venueMultiplier;

    // Utility to get color for each venue and side
    const getVenueSideColor = (venue: string, side: "bid" | "ask") => {
      // if (side === "bid") return "#00ff00"; // Green for bids
      // if (side === "ask") return "#ff3333"; // Red for asks
      return VENUE_CONFIGS[venue]?.color || (side === "bid" ? "#00ff00" : "#ff3333");
    };

    const demoBids: OrderbookLevel[] = [];
    const demoAsks: OrderbookLevel[] = [];

    for (let i = 0; i < 20; i++) {
      const priceDiff = adjustedBasePrice * 0.0002 * (i + 1);
      demoBids.push({
        price: adjustedBasePrice - priceDiff,
        quantity: Math.random() * 5 + 0.1,
        side: "bid",
        venue: VENUE_CONFIGS[venue]?.name || venue,
        timestamp: Date.now(),
        color: getVenueSideColor(venue, "bid")
      });
      demoAsks.push({
        price: adjustedBasePrice + priceDiff,
        quantity: Math.random() * 5 + 0.1,
        side: "ask",
        venue: VENUE_CONFIGS[venue]?.name || venue,
        timestamp: Date.now(),
        color: getVenueSideColor(venue, "ask")
      });
    }

    return { bids: demoBids, asks: demoAsks };
  }, [symbol]);

  // Initialize multi-venue connection
  useEffect(() => {
    connectionRef.current = new MultiVenueConnection(symbol);
    
    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnectAll();
      }
    };
  }, [symbol]);

  // Handle venue selection changes
  useEffect(() => {
    if (!connectionRef.current) return;

    const currentVenues = new Set(selectedVenues);
    const previousVenues = activeVenuesRef.current;

    // Disconnect removed venues
    for (const venue of previousVenues) {
      if (!currentVenues.has(venue)) {
        connectionRef.current.disconnect(venue);
        setVenueData(prev => {
          const updated = { ...prev };
          delete updated[venue];
          return updated;
        });
      }
    }

    // Connect new venues and immediately provide demo data as fallback
    for (const venue of currentVenues) {
      if (!previousVenues.has(venue) && VENUE_CONFIGS[venue]) {
        // Immediately set demo data for this venue
        const demoData = generateDemoData(venue);
        setVenueData(prev => ({
          ...prev,
          [venue]: {
            bids: demoData.bids,
            asks: demoData.asks,
            isConnected: false,
            lastUpdate: Date.now(),
            error: 'Connecting... (demo data)'
          }
        }));
        
        // Attempt real connection (will be skipped in development mode)
        connectionRef.current.connect(venue, (data) => {
          setVenueData(prev => ({
            ...prev,
            [venue]: {
              bids: data.bids,
              asks: data.asks,
              isConnected: true,
              lastUpdate: Date.now(),
              error: null
            }
          }));
          setLastUpdate(Date.now());
        });
      }
    }

    activeVenuesRef.current = currentVenues;
    setLastUpdate(Date.now());
  }, [selectedVenues, generateDemoData]);

  // Provide demo data for disconnected venues
  useEffect(() => {
    const timer = setInterval(() => {
      setVenueData(prev => {
        const updated = { ...prev };
        let hasUpdates = false;

        for (const venue of selectedVenues) {
          if (!updated[venue] || !updated[venue].isConnected) {
            const demoData = generateDemoData(venue);
            updated[venue] = {
              bids: demoData.bids,
              asks: demoData.asks,
              isConnected: false,
              lastUpdate: Date.now(),
              error: 'Demo data - connection failed'
            };
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          setLastUpdate(Date.now());
        }

        return updated;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [selectedVenues, generateDemoData]);

  // Aggregate orderbook data from all venues
  const aggregatedOrderbook: AggregatedOrderbook = {
    bids: [],
    asks: [],
    venueData,
    totalVenues: selectedVenues.length,
    connectedVenues: Object.values(venueData).filter(v => v.isConnected).length,
    lastUpdate
  };

  // Combine and sort all bids and asks
  const allBids: OrderbookLevel[] = [];
  const allAsks: OrderbookLevel[] = [];

  Object.entries(venueData).forEach(([venue, data]) => {
    if (selectedVenues.includes(venue)) {
      allBids.push(...data.bids);
      allAsks.push(...data.asks);
    }
  });

  // Sort bids (highest price first) and asks (lowest price first)
  aggregatedOrderbook.bids = allBids
    .sort((a, b) => b.price - a.price)
    .slice(0, 50); // Limit for performance

  aggregatedOrderbook.asks = allAsks
    .sort((a, b) => a.price - b.price)
    .slice(0, 50); // Limit for performance

  return aggregatedOrderbook;
}

// Utility function to get venue color
export function getVenueColor(venue: string): string {
  const venueKey = venue.toLowerCase();
  return VENUE_CONFIGS[venueKey]?.color || '#666666';
}

// Utility function to aggregate orderbook levels by price
export function aggregateByPrice(levels: OrderbookLevel[]): OrderbookLevel[] {
  const priceMap = new Map<number, OrderbookLevel>();

  levels.forEach(level => {
    const existing = priceMap.get(level.price);
    if (existing) {
      existing.quantity += level.quantity;
      // Keep the most recent timestamp
      if (level.timestamp && (!existing.timestamp || level.timestamp > existing.timestamp)) {
        existing.timestamp = level.timestamp;
      }
    } else {
      priceMap.set(level.price, { ...level });
    }
  });
 return Array.from(priceMap.values());
}