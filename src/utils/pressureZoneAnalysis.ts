interface OrderbookLevel {
  price: number;
  quantity: number;
  side: "bid" | "ask";
}

interface PressureZone {
  id: string;
  startPrice: number;
  endPrice: number;
  totalVolume: number;
  averagePrice: number;
  intensity: number; // 0-1 scale
  side: "bid" | "ask";
  levels: OrderbookLevel[];
}

interface PressureZoneAnalysis {
  zones: PressureZone[];
  maxIntensity: number;
  criticalZones: PressureZone[];
}

export function analyzePressureZones(
  bids: OrderbookLevel[],
  asks: OrderbookLevel[],
  options: {
    minVolumeThreshold?: number;
    priceGroupingPercent?: number;
    intensityThreshold?: number;
  } = {}
): PressureZoneAnalysis {
  const {
    minVolumeThreshold = 0.5,
    priceGroupingPercent = 0.1, // Group prices within 0.1% of each other
    intensityThreshold = 0.7
  } = options;

  const allLevels = [...bids, ...asks];
  if (allLevels.length === 0) {
    return { zones: [], maxIntensity: 0, criticalZones: [] };
  }

  // Calculate total volume for normalization
  const totalVolume = allLevels.reduce((sum, level) => sum + level.quantity, 0);
  
  // Group nearby price levels
  const bidZones = groupPriceLevels(bids, priceGroupingPercent);
  const askZones = groupPriceLevels(asks, priceGroupingPercent);
  
  // Calculate pressure zones
  const allZones = [...bidZones, ...askZones]
    .filter(zone => zone.totalVolume >= minVolumeThreshold)
    .map(zone => ({
      ...zone,
      intensity: Math.min(zone.totalVolume / (totalVolume * 0.1), 1), // Normalize intensity
    }));

  const maxIntensity = Math.max(...allZones.map(z => z.intensity), 0);
  
  // Identify critical zones (high intensity)
  const criticalZones = allZones.filter(zone => zone.intensity >= intensityThreshold);

  return {
    zones: allZones,
    maxIntensity,
    criticalZones
  };
}

function groupPriceLevels(levels: OrderbookLevel[], groupingPercent: number): PressureZone[] {
  if (levels.length === 0) return [];

  // Sort levels by price
  const sortedLevels = [...levels].sort((a, b) => 
    levels[0].side === 'bid' ? b.price - a.price : a.price - b.price
  );

  const zones: PressureZone[] = [];
  let currentGroup: OrderbookLevel[] = [sortedLevels[0]];
  let groupStartPrice = sortedLevels[0].price;

  for (let i = 1; i < sortedLevels.length; i++) {
    const level = sortedLevels[i];
    const priceThreshold = groupStartPrice * (groupingPercent / 100);
    
    // Check if this level should be grouped with current group
    if (Math.abs(level.price - groupStartPrice) <= priceThreshold) {
      currentGroup.push(level);
    } else {
      // Finalize current group and start new one
      if (currentGroup.length > 0) {
        zones.push(createPressureZone(currentGroup));
      }
      currentGroup = [level];
      groupStartPrice = level.price;
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    zones.push(createPressureZone(currentGroup));
  }

  return zones;
}

function createPressureZone(levels: OrderbookLevel[]): PressureZone {
  const totalVolume = levels.reduce((sum, level) => sum + level.quantity, 0);
  const averagePrice = levels.reduce((sum, level) => sum + level.price * level.quantity, 0) / totalVolume;
  const prices = levels.map(l => l.price);
  
  return {
    id: `${levels[0].side}-${Math.random().toString(36).substr(2, 9)}`,
    startPrice: Math.min(...prices),
    endPrice: Math.max(...prices),
    totalVolume,
    averagePrice,
    intensity: 0, // Will be calculated later
    side: levels[0].side,
    levels
  };
}

// Utility function to get color based on pressure intensity
export function getPressureZoneColor(intensity: number, side: "bid" | "ask"): string {
  const alpha = Math.max(0.3, intensity);
  
  if (side === 'bid') {
    // Green gradient for bids
    const green = Math.floor(255 * (0.4 + 0.6 * intensity));
    return `rgba(16, ${green}, 129, ${alpha})`;
  } else {
    // Red gradient for asks
    const red = Math.floor(255 * (0.6 + 0.4 * intensity));
    return `rgba(${red}, 68, 68, ${alpha})`;
  }
}

// Calculate volume-weighted average price for a zone
export function calculateVWAP(levels: OrderbookLevel[]): number {
  const totalVolume = levels.reduce((sum, level) => sum + level.quantity, 0);
  if (totalVolume === 0) return 0;
  
  return levels.reduce((sum, level) => sum + level.price * level.quantity, 0) / totalVolume;
}

// Detect support and resistance levels
export function detectSupportResistance(
  bids: OrderbookLevel[],
  asks: OrderbookLevel[]
): { support: number[]; resistance: number[] } {
  const bidZones = groupPriceLevels(bids, 0.05); // Tighter grouping for S/R
  const askZones = groupPriceLevels(asks, 0.05);
  
  // Sort by volume to find strongest levels
  const strongBidLevels = bidZones
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 3)
    .map(zone => zone.averagePrice);
    
  const strongAskLevels = askZones
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 3)
    .map(zone => zone.averagePrice);

  return {
    support: strongBidLevels,
    resistance: strongAskLevels
  };
}
