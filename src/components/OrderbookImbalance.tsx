'use client';

import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { OrderbookLevel } from '../types/orderbook';

interface OrderbookImbalanceProps {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  position?: [number, number, number];
}

interface ImbalanceData {
  ratio: number;
  bidVolume: number;
  askVolume: number;
  imbalancePercentage: number;
  dominantSide: 'bid' | 'ask' | 'balanced';
}

export default function OrderbookImbalance({ 
  bids, 
  asks, 
  position = [0, 15, 0] 
}: OrderbookImbalanceProps) {
  const imbalanceData = useMemo((): ImbalanceData => {
    // Calculate total volumes for top 10 levels
    const topBids = bids.slice(0, 10);
    const topAsks = asks.slice(0, 10);
    
    const bidVolume = topBids.reduce((sum, bid) => sum + bid.quantity, 0);
    const askVolume = topAsks.reduce((sum, ask) => sum + ask.quantity, 0);
    
    const totalVolume = bidVolume + askVolume;
    const ratio = totalVolume > 0 ? bidVolume / askVolume : 1;
    
    let dominantSide: 'bid' | 'ask' | 'balanced' = 'balanced';
    let imbalancePercentage = 0;
    
    if (ratio > 1.2) {
      dominantSide = 'bid';
      imbalancePercentage = ((bidVolume - askVolume) / totalVolume) * 100;
    } else if (ratio < 0.8) {
      dominantSide = 'ask';
      imbalancePercentage = ((askVolume - bidVolume) / totalVolume) * 100;
    }
    
    return {
      ratio,
      bidVolume,
      askVolume,
      imbalancePercentage: Math.abs(imbalancePercentage),
      dominantSide
    };
  }, [bids, asks]);

  const getImbalanceColor = () => {
    switch (imbalanceData.dominantSide) {
      case 'bid': return '#10b981';
      case 'ask': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getImbalanceText = () => {
    if (imbalanceData.dominantSide === 'balanced') {
      return 'BALANCED';
    }
    return `${imbalanceData.dominantSide.toUpperCase()} DOMINANT`;
  };

  return (
    <group position={position}>
      {/* Imbalance indicator sphere */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial 
          color={getImbalanceColor()} 
          transparent 
          opacity={0.7}
          emissive={getImbalanceColor()}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Main imbalance text */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.4}
        color={getImbalanceColor()}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {getImbalanceText()}
      </Text>

      {/* Ratio display */}
      <Text
        position={[0, 1, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {`Ratio: ${imbalanceData.ratio.toFixed(2)}`}
      </Text>

      {/* Percentage display */}
      {imbalanceData.dominantSide !== 'balanced' && (
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.25}
          color={getImbalanceColor()}
          anchorX="center"
          anchorY="middle"
        >
          {`${imbalanceData.imbalancePercentage.toFixed(1)}%`}
        </Text>
      )}

      {/* Volume breakdown */}
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.2}
        color="#10b981"
        anchorX="center"
        anchorY="middle"
      >
        {`Bids: ${imbalanceData.bidVolume.toFixed(0)}`}
      </Text>

      <Text
        position={[0, -0.8, 0]}
        fontSize={0.2}
        color="#ef4444"
        anchorX="center"
        anchorY="middle"
      >
        {`Asks: ${imbalanceData.askVolume.toFixed(0)}`}
      </Text>

      {/* Animated pulsing ring for high imbalance */}
      {imbalanceData.imbalancePercentage > 20 && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.2, 16]} />
          <meshBasicMaterial 
            color={getImbalanceColor()} 
            transparent 
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}
