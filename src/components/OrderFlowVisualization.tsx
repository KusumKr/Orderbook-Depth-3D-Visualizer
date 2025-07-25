'use client';

import { useMemo, useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrderbookLevel {
  price: number;
  quantity: number;
  side: "bid" | "ask";
}

interface OrderFlowProps {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  priceRange: { min: number; max: number };
  showOrderFlow: boolean;
  isConnected: boolean;
}

interface OrderFlowParticle {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  side: "bid" | "ask";
  type: "placement" | "execution" | "cancellation";
}

export default function OrderFlowVisualization({ 
  bids, 
  asks, 
  priceRange, 
  showOrderFlow,
  isConnected 
}: OrderFlowProps) {
  const particlesRef = useRef<OrderFlowParticle[]>([]);
  const lastUpdateRef = useRef<{ bids: OrderbookLevel[]; asks: OrderbookLevel[] }>({ bids: [], asks: [] });
  const groupRef = useRef<THREE.Group>(null);

  // Generate order flow particles based on orderbook changes
  const generateParticles = useMemo(() => {
    if (!showOrderFlow || !isConnected) return [];

    const newParticles: OrderFlowParticle[] = [];
    const priceSpread = priceRange.max - priceRange.min;

    // Compare current orderbook with previous to detect changes
    const prevBids = lastUpdateRef.current.bids;
    const prevAsks = lastUpdateRef.current.asks;

    // Detect bid changes
    bids.forEach((bid, index) => {
      const prevBid = prevBids[index];
      if (prevBid && Math.abs(bid.quantity - prevBid.quantity) > 0.01) {
        const normalizedPrice = (bid.price - priceRange.min) / priceSpread;
        const x = (normalizedPrice - 0.5) * 20;
        const y = Math.random() * 5 + 2;
        const z = Math.random() * 4 - 2;

        const type = bid.quantity > prevBid.quantity ? "placement" : 
                    bid.quantity < prevBid.quantity ? "execution" : "cancellation";

        newParticles.push({
          id: `bid-${index}-${Date.now()}-${Math.random()}`,
          position: new THREE.Vector3(x, y, z),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.05 + 0.02,
            (Math.random() - 0.5) * 0.1
          ),
          life: 0,
          maxLife: 3000, // 3 seconds
          size: Math.min(Math.abs(bid.quantity - prevBid.quantity) * 2, 0.5),
          color: type === "placement" ? "#10b981" : 
                 type === "execution" ? "#3b82f6" : "#f59e0b",
          side: "bid",
          type
        });
      }
    });

    // Detect ask changes
    asks.forEach((ask, index) => {
      const prevAsk = prevAsks[index];
      if (prevAsk && Math.abs(ask.quantity - prevAsk.quantity) > 0.01) {
        const normalizedPrice = (ask.price - priceRange.min) / priceSpread;
        const x = (normalizedPrice - 0.5) * 20;
        const y = Math.random() * 5 + 2;
        const z = Math.random() * 4 - 2;

        const type = ask.quantity > prevAsk.quantity ? "placement" : 
                    ask.quantity < prevAsk.quantity ? "execution" : "cancellation";

        newParticles.push({
          id: `ask-${index}-${Date.now()}-${Math.random()}`,
          position: new THREE.Vector3(x, y, z),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.05 + 0.02,
            (Math.random() - 0.5) * 0.1
          ),
          life: 0,
          maxLife: 3000,
          size: Math.min(Math.abs(ask.quantity - prevAsk.quantity) * 2, 0.5),
          color: type === "placement" ? "#ef4444" : 
                 type === "execution" ? "#8b5cf6" : "#f59e0b",
          side: "ask",
          type
        });
      }
    });

    // Update last state
    lastUpdateRef.current = { bids: [...bids], asks: [...asks] };
    
    return newParticles;
  }, [bids, asks, priceRange, showOrderFlow, isConnected]);

  // Add new particles to the system
  useEffect(() => {
    if (generateParticles.length > 0) {
      particlesRef.current = [...particlesRef.current, ...generateParticles];
    }
  }, [generateParticles]);

  // Animate particles
  useFrame((state, delta) => {
    if (!showOrderFlow) return;

    const deltaMs = delta * 1000;
    
    particlesRef.current = particlesRef.current.filter(particle => {
      particle.life += deltaMs;
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      
      // Apply gravity
      particle.velocity.y -= 0.01 * delta;
      
      // Fade out over time
      const alpha = 1 - (particle.life / particle.maxLife);
      
      return particle.life < particle.maxLife;
    });

    // Limit particle count for performance
    if (particlesRef.current.length > 200) {
      particlesRef.current = particlesRef.current.slice(-200);
    }
  });

  if (!showOrderFlow) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* Render particles */}
      {particlesRef.current.map((particle) => {
        const alpha = Math.max(0, 1 - (particle.life / particle.maxLife));
        
        return (
          <OrderFlowParticle
            key={particle.id}
            particle={particle}
            alpha={alpha}
          />
        );
      })}

      {/* Order Flow Legend */}
      <group position={[15, 5, 0]}>
        <Text position={[0, 2, 0]} fontSize={0.4} color="white">
          Order Flow
        </Text>
        
        {/* Placement */}
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#10b981" />
        </mesh>
        <Text position={[1, 1, 0]} fontSize={0.25} color="white">
          New Orders
        </Text>
        
        {/* Execution */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <Text position={[1, 0.5, 0]} fontSize={0.25} color="white">
          Executions
        </Text>
        
        {/* Cancellation */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <Text position={[1, 0, 0]} fontSize={0.25} color="white">
          Cancellations
        </Text>

        <Text position={[0, -0.5, 0]} fontSize={0.2} color="gray">
          Size = Volume Change
        </Text>
      </group>

      {/* Flow Statistics */}
      <group position={[15, -5, 0]}>
        <Text position={[0, 1, 0]} fontSize={0.3} color="white">
          Flow Stats
        </Text>
        <Text position={[0, 0.5, 0]} fontSize={0.25} color="gray">
          Active Particles: {particlesRef.current.length}
        </Text>
        <Text position={[0, 0, 0]} fontSize={0.25} color="gray">
          Connection: {isConnected ? 'Live' : 'Demo'}
        </Text>
      </group>
    </group>
  );
}

interface OrderFlowParticleProps {
  particle: OrderFlowParticle;
  alpha: number;
}

function OrderFlowParticle({ particle, alpha }: OrderFlowParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(particle.position);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[particle.size, 8, 8]} />
      <meshStandardMaterial 
        color={particle.color}
        transparent
        opacity={alpha}
        emissive={particle.color}
        emissiveIntensity={alpha * 0.3}
      />
    </mesh>
  );
}
