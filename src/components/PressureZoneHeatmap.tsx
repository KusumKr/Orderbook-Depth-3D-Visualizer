'use client';

import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { analyzePressureZones, getPressureZoneColor } from '../utils/pressureZoneAnalysis';

interface OrderbookLevel {
  price: number;
  quantity: number;
  side: "bid" | "ask";
}

interface PressureZoneHeatmapProps {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  priceRange: { min: number; max: number };
  showPressureZones: boolean;
}

interface HeatmapPlaneProps {
  position: [number, number, number];
  size: [number, number];
  intensity: number;
  side: "bid" | "ask";
  price: number;
  volume: number;
}

function HeatmapPlane({ position, size, intensity, side, price, volume }: HeatmapPlaneProps) {
  const color = getPressureZoneColor(intensity, side);
  
  return (
    <group>
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={size} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.3 + intensity * 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Volume label */}
      <Text
        position={[position[0], position[1] + 0.1, position[2]]}
        fontSize={0.3}
        color={side === 'bid' ? '#10b981' : '#ef4444'}
        anchorX="center"
        anchorY="middle"
      >
        {volume.toFixed(2)}
      </Text>
      
      {/* Price label */}
      <Text
        position={[position[0], position[1] + 0.5, position[2]]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        ${price.toFixed(2)}
      </Text>
    </group>
  );
}

interface PressureZoneIndicatorProps {
  position: [number, number, number];
  intensity: number;
  side: "bid" | "ask";
  volume: number;
}

function PressureZoneIndicator({ position, intensity, side, volume }: PressureZoneIndicatorProps) {
  const scale = 0.5 + intensity * 1.5;
  const color = side === 'bid' ? '#10b981' : '#ef4444';
  
  return (
    <group position={position}>
      {/* Pulsing sphere for high pressure zones */}
      <mesh scale={[scale, scale, scale]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={0.6}
          emissive={color}
          emissiveIntensity={intensity * 0.3}
        />
      </mesh>
      
      {/* Ring effect for critical zones */}
      {intensity > 0.7 && (
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[scale * 1.5, scale * 1.5, 1]}>
          <ringGeometry args={[0.4, 0.6, 16]} />
          <meshBasicMaterial 
            color={color}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Volume text */}
      <Text
        position={[0, scale + 0.5, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {volume.toFixed(1)}
      </Text>
    </group>
  );
}

export default function PressureZoneHeatmap({ 
  bids, 
  asks, 
  priceRange, 
  showPressureZones 
}: PressureZoneHeatmapProps) {
  const { heatmapPlanes, pressureIndicators, criticalZones } = useMemo(() => {
    if (!showPressureZones || (!bids.length && !asks.length)) {
      return { heatmapPlanes: [], pressureIndicators: [], criticalZones: [] };
    }

    const analysis = analyzePressureZones(bids, asks, {
      minVolumeThreshold: 0.1,
      priceGroupingPercent: 0.2,
      intensityThreshold: 0.6
    });

    const priceSpread = priceRange.max - priceRange.min;
    const heatmapPlanes: any[] = [];
    const pressureIndicators: any[] = [];

    analysis.zones.forEach((zone, index) => {
      // Calculate position in 3D space
      const normalizedPrice = (zone.averagePrice - priceRange.min) / priceSpread;
      const x = (normalizedPrice - 0.5) * 20; // Scale to -10 to +10
      const y = 0.1; // Just above the ground
      const z = 0;

      // Create heatmap plane
      const planeSize: [number, number] = [
        Math.max(1, (zone.endPrice - zone.startPrice) / priceSpread * 20),
        2
      ];

      heatmapPlanes.push({
        key: `heatmap-${zone.id}`,
        position: [x, y, z] as [number, number, number],
        size: planeSize,
        intensity: zone.intensity,
        side: zone.side,
        price: zone.averagePrice,
        volume: zone.totalVolume
      });

      // Create pressure indicator for significant zones
      if (zone.intensity > 0.4) {
        pressureIndicators.push({
          key: `indicator-${zone.id}`,
          position: [x, zone.totalVolume * 2, z] as [number, number, number],
          intensity: zone.intensity,
          side: zone.side,
          volume: zone.totalVolume
        });
      }
    });

    return { 
      heatmapPlanes, 
      pressureIndicators, 
      criticalZones: analysis.criticalZones 
    };
  }, [bids, asks, priceRange, showPressureZones]);

  if (!showPressureZones) {
    return null;
  }

  return (
    <group>
      {/* Heatmap planes */}
      {heatmapPlanes.map((plane) => (
        <HeatmapPlane
          key={plane.key}
          position={plane.position}
          size={plane.size}
          intensity={plane.intensity}
          side={plane.side}
          price={plane.price}
          volume={plane.volume}
        />
      ))}

      {/* Pressure zone indicators */}
      {pressureIndicators.map((indicator) => (
        <PressureZoneIndicator
          key={indicator.key}
          position={indicator.position}
          intensity={indicator.intensity}
          side={indicator.side}
          volume={indicator.volume}
        />
      ))}

      {/* Critical zone alerts */}
      {criticalZones.length > 0 && (
        <Text
          position={[0, 15, 0]}
          fontSize={0.6}
          color="#ff6b6b"
          anchorX="center"
          anchorY="middle"
        >
          ⚠️ {criticalZones.length} Critical Pressure Zone{criticalZones.length > 1 ? 's' : ''}
        </Text>
      )}

      {/* Legend */}
      <group position={[15, 10, 0]}>
        <Text position={[0, 2, 0]} fontSize={0.4} color="white">
          Pressure Zones
        </Text>
        
        {/* Bid legend */}
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#10b981" transparent opacity={0.8} />
        </mesh>
        <Text position={[1, 1, 0]} fontSize={0.3} color="white">
          Bid Pressure
        </Text>
        
        {/* Ask legend */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#ef4444" transparent opacity={0.8} />
        </mesh>
        <Text position={[1, 0, 0]} fontSize={0.3} color="white">
          Ask Pressure
        </Text>

        {/* Intensity scale */}
        <Text position={[0, -1, 0]} fontSize={0.25} color="gray">
          Size = Volume Intensity
        </Text>
      </group>
    </group>
  );
}
