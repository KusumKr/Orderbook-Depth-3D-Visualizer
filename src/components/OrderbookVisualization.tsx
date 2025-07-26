'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';
import { useRef, useMemo, useEffect } from 'react';
import { useMultiVenueOrderbook } from '../hooks/useMultiVenueOrderbook';
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
  const barColor = color; // Use the color prop directly

  return (
    <group>
      <mesh 
        ref={meshRef} 
        position={position} 
        scale={scale}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={barColor}
          transparent 
          opacity={0.8}
          metalness={0.1}
          roughness={0.4}
        />
      </mesh>
      
      {lod === 'high' && (
        <Text
          position={[position[0], position[1] + scale[1] / 2 + 0.5, position[2]]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {`$${price.toFixed(2)}`}
        </Text>
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

  // Debug logging
  useEffect(() => {
    console.log('🔍 OrderbookScene Debug Info:', {
      symbol,
      selectedVenues,
      connectedVenues: aggregatedData.connectedVenues,
      totalVenues: aggregatedData.totalVenues,
      bidsCount: aggregatedData.bids.length,
      asksCount: aggregatedData.asks.length,
      venueData: Object.keys(aggregatedData.venueData)
    });
  }, [symbol, selectedVenues, aggregatedData]);

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

  // Use real data, not fallback demo data
  const { optimizedBids, optimizedAsks, priceRange } = useMemo(() => {
    const bidsToUse = aggregatedData.bids;
    const asksToUse = aggregatedData.asks;

    const allPrices = [...bidsToUse.map((b: any) => b.price), ...asksToUse.map((a: any) => a.price)];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = { min: minPrice, max: maxPrice };

    return { 
      optimizedBids: bidsToUse.slice(0, 15), 
      optimizedAsks: asksToUse.slice(0, 15), 
      priceRange 
    };
  }, [aggregatedData.bids, aggregatedData.asks]);

  // Create 3D bars with venue color
  const { bidBars, askBars } = useMemo(() => {
    const bidBars = optimizedBids.map((bid: any, index: number) => {
      const x = (index - optimizedBids.length / 2) * 1.2;
      const y = Math.max(bid.quantity * 2, 0.5);
      const z = -2;

      return {
        position: [x, y / 2, z] as [number, number, number],
        scale: [0.8, y, 0.8] as [number, number, number],
        color: bid.color, // venue color from data
        price: bid.price,
        quantity: bid.quantity,
        venue: bid.venue || 'Demo',
        lod: 'high' as const
      };
    });
    const askBars = optimizedAsks.map((ask: any, index: number) => {
      const x = (index - optimizedAsks.length / 2) * 1.2;
      const y = Math.max(ask.quantity * 2, 0.5);
      const z = 2;

      return {
        position: [x, y / 2, z] as [number, number, number],
        scale: [0.8, y, 0.8] as [number, number, number],
        color: ask.color, // venue color from data
        price: ask.price,
        quantity: ask.quantity,
        venue: ask.venue || 'Demo',
        lod: 'high' as const
      };
    });

    return { bidBars, askBars };
  }, [optimizedBids, optimizedAsks]);

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
        camera={{ 
          position: [15, 15, 15], 
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          width: '100%',
          height: '100%'
        }}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: false,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
          precision: 'highp',
          premultipliedAlpha: true
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        onCreated={(state) => {
          console.log('✅ Canvas created successfully', state);
        }}
      >
        {/* Basic Lighting Setup */}
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.0} 
          color="#ffffff"
          castShadow
        />
        <pointLight 
          position={[0, 15, 0]} 
          intensity={0.6} 
          color="#10b981"
          distance={30}
          decay={2}
        />
        
        {/* Fog for depth perception */}
        <fog attach="fog" args={['#0f172a', 20, 80]} />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          maxDistance={50}
          minDistance={5}
          maxPolarAngle={Math.PI * 0.8}
          minPolarAngle={Math.PI * 0.1}
          enableDamping={true}
          dampingFactor={0.05}
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