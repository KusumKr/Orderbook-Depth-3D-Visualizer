'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';
import { useRef, useMemo, useEffect } from 'react';
import { useMultiVenueOrderbook, getVenueColor } from '../hooks/useMultiVenueOrderbook';
import { historicalDataService } from '../services/historicalDataService';
import { performanceOptimizer } from '../utils/performanceOptimizer';
import PressureZoneHeatmap from './PressureZoneHeatmap';
import VolumeProfile from './VolumeProfile';
import OrderFlowVisualization from './OrderFlowVisualization';
import OrderMatchingVisualization from './OrderMatchingVisualization';
import OrderbookImbalance from './OrderbookImbalance';
import MarketDepthHeatmap from './MarketDepthHeatmap';
import MobileControls from './MobileControls';
import * as THREE from 'three';

interface OrderbookBarProps {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  price: number;
  quantity: number;
  venue?: string;
  lod?: 'high' | 'medium' | 'low';
}

function OrderbookBar({ position, scale, color, price, quantity, venue, lod = 'high' }: OrderbookBarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const complexity = performanceOptimizer.getGeometryComplexity(lod);

  return (
    <group>
      <mesh ref={meshRef} position={position} scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={venue ? getVenueColor(venue) : color} 
          transparent 
          opacity={0.8}
          metalness={0.1}
          roughness={0.7}
        />
      </mesh>
      {lod === 'high' && (
        <>
          <Text
            position={[position[0], position[1] + scale[1] / 2 + 0.5, position[2]]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {`$${price.toFixed(2)}`}
          </Text>
          {venue && (
            <Text
              position={[position[0], position[1] + scale[1] / 2 + 0.8, position[2]]}
              fontSize={0.2}
              color={getVenueColor(venue)}
              anchorX="center"
              anchorY="middle"
            >
              {venue}
            </Text>
          )}
        </>
      )}
    </group>
  );
}

interface OrderbookSceneProps {
  symbol: string;
  selectedVenues: string[];
  timeSlices: number;
  timeRange: string;
  showPressureZones: boolean;
  showVolumeProfile: boolean;
  showOrderFlow: boolean;
  showOrderMatching: boolean;
  showImbalance: boolean;
  showDepthHeatmap: boolean;
  autoRotate: boolean;
}

function OrderbookScene({ 
  symbol, 
  selectedVenues,
  timeSlices, 
  timeRange,
  showPressureZones, 
  showVolumeProfile,
  showOrderFlow,
  showOrderMatching,
  showImbalance,
  showDepthHeatmap,
  autoRotate 
}: OrderbookSceneProps) {
  const aggregatedData = useMultiVenueOrderbook(symbol, selectedVenues);
  const cameraRef = useRef<THREE.Camera>(null);

  // Start historical data recording
  useEffect(() => {
    historicalDataService.startRecording(timeRange, () => ({
      bids: aggregatedData.bids,
      asks: aggregatedData.asks,
      venues: selectedVenues
    }));

    return () => {
      historicalDataService.stopRecording(timeRange);
    };
  }, [timeRange, selectedVenues, aggregatedData.bids, aggregatedData.asks]);

  // Performance optimization
  const { optimizedBids, optimizedAsks, priceRange } = useMemo(() => {
    const optimized = performanceOptimizer.optimizeOrderbookData(
      aggregatedData.bids, 
      aggregatedData.asks
    );

    if (!optimized.bids.length || !optimized.asks.length) {
      return { optimizedBids: [], optimizedAsks: [], priceRange: { min: 0, max: 0 } };
    }

    // Get price range for scaling
    const allPrices = [...optimized.bids.map((b: any) => b.price), ...optimized.asks.map((a: any) => a.price)];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = { min: minPrice, max: maxPrice };

    return { optimizedBids: optimized.bids, optimizedAsks: optimized.asks, priceRange };
  }, [aggregatedData.bids, aggregatedData.asks]);

  // Create 3D bars with historical depth
  const { bidBars, askBars } = useMemo(() => {
    if (!optimizedBids.length || !optimizedAsks.length) {
      return { bidBars: [], askBars: [] };
    }

    const priceSpread = priceRange.max - priceRange.min;
    const maxQuantity = Math.max(
      ...optimizedBids.map((b: any) => b.quantity),
      ...optimizedAsks.map((a: any) => a.quantity)
    );

    const bidBars = optimizedBids.slice(0, 20).map((bid: any, index: number) => {
      const normalizedPrice = (bid.price - priceRange.min) / priceSpread;
      const x = (normalizedPrice - 0.5) * 20;
      const y = (bid.quantity / maxQuantity) * 10;
      const z = 0;

      return {
        position: [x, y / 2, z] as [number, number, number],
        scale: [0.8, y, 0.8] as [number, number, number],
        color: '#10b981',
        price: bid.price,
        quantity: bid.quantity,
        venue: bid.venue,
        lod: 'high' as const
      };
    });

    const askBars = optimizedAsks.slice(0, 20).map((ask: any, index: number) => {
      const normalizedPrice = (ask.price - priceRange.min) / priceSpread;
      const x = (normalizedPrice - 0.5) * 20;
      const y = (ask.quantity / maxQuantity) * 10;
      const z = 0;

      return {
        position: [x, y / 2, z] as [number, number, number],
        scale: [0.8, y, 0.8] as [number, number, number],
        color: '#ef4444',
        price: ask.price,
        quantity: ask.quantity,
        venue: ask.venue,
        lod: 'high' as const
      };
    });

    return { bidBars, askBars };
  }, [optimizedBids, optimizedAsks, priceRange]);

  if (aggregatedData.connectedVenues === 0 && optimizedBids.length === 0) {
    return (
      <group>
        <Text position={[0, 2, 0]} fontSize={1} color="red" anchorX="center">
          No Venue Data
        </Text>
        <Text position={[0, 0, 0]} fontSize={0.5} color="orange" anchorX="center">
          Check venue connections
        </Text>
      </group>
    );
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Grid and axes */}
      <Grid
        args={[20, 20]}
        position={[0, -0.1, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#333333"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#666666"
      />

      {/* Axis labels */}
      <Text position={[12, 0, 0]} fontSize={0.8} color="white">
        Price →
      </Text>
      <Text position={[0, 12, 0]} fontSize={0.8} color="white">
        ↑ Quantity
      </Text>
      <Text position={[0, 0, 12]} fontSize={0.8} color="white">
        Time →
      </Text>

      {/* Render bid bars */}
      {bidBars.map((bar: any, index: number) => (
        <OrderbookBar
          key={`bid-${index}`}
          position={bar.position}
          scale={bar.scale}
          color={bar.color}
          price={bar.price}
          quantity={bar.quantity}
          venue={bar.venue}
          lod={bar.lod || 'high'}
        />
      ))}

      {/* Render ask bars */}
      {askBars.map((bar: any, index: number) => (
        <OrderbookBar
          key={`ask-${index}`}
          position={bar.position}
          scale={bar.scale}
          color={bar.color}
          price={bar.price}
          quantity={bar.quantity}
          venue={bar.venue}
          lod={bar.lod || 'high'}
        />
      ))}

      {/* Advanced visualization components */}
      {showPressureZones && performanceOptimizer.shouldEnableFeature('heatmap') && (
        <PressureZoneHeatmap
          bids={optimizedBids}
          asks={optimizedAsks}
          priceRange={priceRange}
          showPressureZones={showPressureZones}
        />
      )}

      {showVolumeProfile && performanceOptimizer.shouldEnableFeature('volumeProfile') && (
        <VolumeProfile
          bids={optimizedBids}
          asks={optimizedAsks}
          priceRange={priceRange}
          showVolumeProfile={showVolumeProfile}
        />
      )}

      {showOrderFlow && performanceOptimizer.shouldEnableFeature('particles') && (
        <OrderFlowVisualization
          bids={optimizedBids}
          asks={optimizedAsks}
          priceRange={priceRange}
          showOrderFlow={showOrderFlow}
          isConnected={aggregatedData.connectedVenues > 0}
        />
      )}

      {showOrderMatching && performanceOptimizer.shouldEnableFeature('animations') && (
        <OrderMatchingVisualization
          bids={optimizedBids}
          asks={optimizedAsks}
          priceRange={priceRange}
          showOrderMatching={showOrderMatching}
          isConnected={aggregatedData.connectedVenues > 0}
        />
      )}

      {/* Bonus Features */}
      {showImbalance && (
        <OrderbookImbalance
          bids={optimizedBids}
          asks={optimizedAsks}
          position={[15, 10, 0]}
        />
      )}

      {showDepthHeatmap && performanceOptimizer.shouldEnableFeature('heatmap') && (
        <MarketDepthHeatmap
          bids={optimizedBids}
          asks={optimizedAsks}
          priceRange={priceRange}
          position={[0, 0, -2]}
        />
      )}

      {/* Legend */}
      <group position={[-15, 8, 0]}>
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[1, 0.5, 0.5]} />
          <meshStandardMaterial color="#10b981" />
        </mesh>
        <Text position={[2, 1, 0]} fontSize={0.5} color="white">
          Bids
        </Text>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 0.5, 0.5]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <Text position={[2, 0, 0]} fontSize={0.5} color="white">
          Asks
        </Text>
      </group>
    </>
  );
}

interface OrderbookVisualizationProps {
  symbol?: string;
  selectedVenues?: string[];
  className?: string;
  timeRange?: string;
  showPressureZones?: boolean;
  showVolumeProfile?: boolean;
  showOrderFlow?: boolean;
  showOrderMatching?: boolean;
  showImbalance?: boolean;
  showDepthHeatmap?: boolean;
  autoRotate?: boolean;
}

export default function OrderbookVisualization({ 
  symbol = 'btcusdt', 
  selectedVenues = ['binance'],
  className = '',
  timeRange = '1m',
  showPressureZones = false,
  showVolumeProfile = false,
  showOrderFlow = false,
  showOrderMatching = false,
  showImbalance = false,
  showDepthHeatmap = false,
  autoRotate = true
}: OrderbookVisualizationProps) {
  return (
    <div className={`w-full h-full bg-gray-900 ${className}`}>
      <Canvas
        camera={{ position: [15, 15, 15], fov: 60 }}
        style={{ background: '#111827' }}
      >
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          maxDistance={50}
          minDistance={5}
        />
        <OrderbookScene 
          symbol={symbol}
          selectedVenues={selectedVenues}
          timeSlices={10}
          timeRange={timeRange}
          showPressureZones={showPressureZones}
          showVolumeProfile={showVolumeProfile}
          showOrderFlow={showOrderFlow}
          showOrderMatching={showOrderMatching}
          showImbalance={showImbalance}
          showDepthHeatmap={showDepthHeatmap}
          autoRotate={autoRotate}
        />
      </Canvas>

      {/* Mobile controls overlay */}
      <MobileControls
        autoRotate={autoRotate}
        onAutoRotateToggle={() => {}}
        showPressureZones={showPressureZones}
        onPressureZonesToggle={() => {}}
        showVolumeProfile={showVolumeProfile}
        onVolumeProfileToggle={() => {}}
      />
    </div>
  );
}
