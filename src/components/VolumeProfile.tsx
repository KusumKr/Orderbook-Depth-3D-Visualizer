'use client';

import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface OrderbookLevel {
  price: number;
  quantity: number;
  side: "bid" | "ask";
}

interface VolumeProfileProps {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  priceRange: { min: number; max: number };
  showVolumeProfile: boolean;
}

interface VolumeProfileBar {
  price: number;
  volume: number;
  cumulativeVolume: number;
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
}

export default function VolumeProfile({ 
  bids, 
  asks, 
  priceRange, 
  showVolumeProfile 
}: VolumeProfileProps) {
  const volumeProfileBars = useMemo(() => {
    if (!showVolumeProfile || (!bids.length && !asks.length)) {
      return [];
    }

    // Combine and sort all levels by price
    const allLevels = [...bids, ...asks].sort((a, b) => a.price - b.price);
    const priceSpread = priceRange.max - priceRange.min;
    
    // Calculate cumulative volume and max volume for scaling
    let cumulativeVolume = 0;
    const maxVolume = Math.max(...allLevels.map(level => level.quantity));
    
    const bars: VolumeProfileBar[] = allLevels.map((level, index) => {
      cumulativeVolume += level.quantity;
      
      // Calculate position in 3D space
      const normalizedPrice = (level.price - priceRange.min) / priceSpread;
      const x = (normalizedPrice - 0.5) * 20; // Scale to -10 to +10
      const y = (level.quantity / maxVolume) * 3; // Scale height for volume profile
      const z = -5; // Position behind the main orderbook
      
      // Scale the bar
      const scale: [number, number, number] = [
        0.3, // Thin bars for volume profile
        y,
        0.3
      ];
      
      // Color based on side and volume intensity
      const intensity = level.quantity / maxVolume;
      const baseColor = level.side === 'bid' ? '#10b981' : '#ef4444';
      const alpha = 0.4 + intensity * 0.6;
      
      return {
        price: level.price,
        volume: level.quantity,
        cumulativeVolume,
        position: [x, y / 2, z] as [number, number, number],
        scale,
        color: baseColor
      };
    });

    return bars;
  }, [bids, asks, priceRange, showVolumeProfile]);

  if (!showVolumeProfile) {
    return null;
  }

  return (
    <group>
      {/* Volume Profile Bars */}
      {volumeProfileBars.map((bar, index) => (
        <group key={`volume-profile-${index}`}>
          <mesh position={bar.position} scale={bar.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial 
              color={bar.color} 
              transparent 
              opacity={0.6}
            />
          </mesh>
          
          {/* Volume label for significant levels */}
          {bar.volume > volumeProfileBars.reduce((sum, b) => sum + b.volume, 0) * 0.1 && (
            <Text
              position={[bar.position[0], bar.position[1] + bar.scale[1] / 2 + 0.3, bar.position[2]]}
              fontSize={0.2}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {bar.volume.toFixed(1)}
            </Text>
          )}
        </group>
      ))}

      {/* Volume Profile Legend */}
      <group position={[12, 8, -5]}>
        <Text position={[0, 1, 0]} fontSize={0.4} color="white">
          Volume Profile
        </Text>
        
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.3, 1, 0.3]} />
          <meshStandardMaterial color="#666666" transparent opacity={0.6} />
        </mesh>
        <Text position={[1, 0, 0]} fontSize={0.3} color="white">
          Cumulative Volume
        </Text>
        
        <Text position={[0, -1, 0]} fontSize={0.25} color="gray">
          Height = Volume at Price
        </Text>
      </group>

      {/* VWAP Line (Volume Weighted Average Price) */}
      {volumeProfileBars.length > 0 && (
        <VWAPLine volumeProfileBars={volumeProfileBars} priceRange={priceRange} />
      )}
    </group>
  );
}

interface VWAPLineProps {
  volumeProfileBars: VolumeProfileBar[];
  priceRange: { min: number; max: number };
}

function VWAPLine({ volumeProfileBars, priceRange }: VWAPLineProps) {
  const vwap = useMemo(() => {
    const totalVolume = volumeProfileBars.reduce((sum, bar) => sum + bar.volume, 0);
    if (totalVolume === 0) return 0;
    
    return volumeProfileBars.reduce((sum, bar) => 
      sum + (bar.price * bar.volume), 0
    ) / totalVolume;
  }, [volumeProfileBars]);

  const vwapPosition = useMemo(() => {
    const priceSpread = priceRange.max - priceRange.min;
    const normalizedPrice = (vwap - priceRange.min) / priceSpread;
    const x = (normalizedPrice - 0.5) * 20;
    return x;
  }, [vwap, priceRange]);

  // Create line geometry for VWAP using a thin cylinder
  return (
    <group>
      {/* VWAP Line as a thin cylinder */}
      <mesh position={[vwapPosition, 5, -6]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 10, 8]} />
        <meshBasicMaterial color="#ffeb3b" />
      </mesh>
      
      {/* VWAP Label */}
      <Text
        position={[vwapPosition, 11, -6]}
        fontSize={0.3}
        color="#ffeb3b"
        anchorX="center"
        anchorY="middle"
      >
        VWAP: ${vwap.toFixed(2)}
      </Text>
    </group>
  );
}
