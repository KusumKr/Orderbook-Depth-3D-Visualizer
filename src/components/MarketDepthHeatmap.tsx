'use client';

import { useMemo } from 'react';
import { OrderbookLevel } from '../types/orderbook';
import * as THREE from 'three';

interface MarketDepthHeatmapProps {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  priceRange: { min: number; max: number };
  position?: [number, number, number];
}

export default function MarketDepthHeatmap({ 
  bids, 
  asks, 
  priceRange,
  position = [0, 0, -2] 
}: MarketDepthHeatmapProps) {
  const heatmapData = useMemo(() => {
    const gridSize = 20;
    const maxQuantity = Math.max(
      ...bids.map(b => b.quantity),
      ...asks.map(a => a.quantity)
    );

    // Create intensity grid
    const intensityGrid = new Float32Array(gridSize * gridSize);
    const priceSpread = priceRange.max - priceRange.min;

    // Map orderbook data to grid
    [...bids, ...asks].forEach(level => {
      const normalizedPrice = (level.price - priceRange.min) / priceSpread;
      const gridX = Math.floor(normalizedPrice * (gridSize - 1));
      const intensity = level.quantity / maxQuantity;
      
      // Apply intensity to surrounding grid points with falloff
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = Math.max(0, Math.min(gridSize - 1, gridX + dx));
          const y = Math.max(0, Math.min(gridSize - 1, Math.floor(gridSize / 2) + dy));
          const distance = Math.sqrt(dx * dx + dy * dy);
          const falloff = Math.max(0, 1 - distance / 3);
          const index = y * gridSize + x;
          intensityGrid[index] = Math.max(intensityGrid[index], intensity * falloff);
        }
      }
    });

    return { intensityGrid, gridSize };
  }, [bids, asks, priceRange]);

  // Create color texture from intensity data
  const colorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = heatmapData.gridSize;
    canvas.height = heatmapData.gridSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    const imageData = ctx.createImageData(heatmapData.gridSize, heatmapData.gridSize);
    
    for (let i = 0; i < heatmapData.intensityGrid.length; i++) {
      const intensity = heatmapData.intensityGrid[i];
      const pixelIndex = i * 4;
      
      // Create heat colors: blue -> green -> yellow -> red
      if (intensity < 0.25) {
        imageData.data[pixelIndex] = 0; // R
        imageData.data[pixelIndex + 1] = Math.floor(intensity * 4 * 255); // G
        imageData.data[pixelIndex + 2] = 255; // B
      } else if (intensity < 0.5) {
        imageData.data[pixelIndex] = 0; // R
        imageData.data[pixelIndex + 1] = 255; // G
        imageData.data[pixelIndex + 2] = Math.floor((0.5 - intensity) * 4 * 255); // B
      } else if (intensity < 0.75) {
        imageData.data[pixelIndex] = Math.floor((intensity - 0.5) * 4 * 255); // R
        imageData.data[pixelIndex + 1] = 255; // G
        imageData.data[pixelIndex + 2] = 0; // B
      } else {
        imageData.data[pixelIndex] = 255; // R
        imageData.data[pixelIndex + 1] = Math.floor((1 - intensity) * 4 * 255); // G
        imageData.data[pixelIndex + 2] = 0; // B
      }
      
      imageData.data[pixelIndex + 3] = Math.floor(intensity * 180 + 50); // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [heatmapData]);

  if (!colorTexture) return null;

  return (
    <group position={position}>
      {/* Main heatmap plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20, 1, 1]} />
        <meshBasicMaterial 
          map={colorTexture}
          transparent 
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grid overlay for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[20, 20, 10, 10]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent 
          opacity={0.1}
          wireframe
        />
      </mesh>
    </group>
  );
}
