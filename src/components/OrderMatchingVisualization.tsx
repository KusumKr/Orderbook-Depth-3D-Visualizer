'use client';

import { useMemo, useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrderbookLevel, TradeExecution } from '../types/orderbook';

interface OrderMatchingProps {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  priceRange: { min: number; max: number };
  showOrderMatching: boolean;
  isConnected: boolean;
}

interface MatchingAnimation {
  id: string;
  bidPosition: THREE.Vector3;
  askPosition: THREE.Vector3;
  meetingPoint: THREE.Vector3;
  progress: number;
  maxProgress: number;
  size: number;
  color: string;
  executedQuantity: number;
  price: number;
  bidParticle: THREE.Vector3;
  askParticle: THREE.Vector3;
  explosionParticles: THREE.Vector3[];
  explosionProgress: number;
}

export default function OrderMatchingVisualization({
  bids,
  asks,
  priceRange,
  showOrderMatching,
  isConnected
}: OrderMatchingProps) {
  const animationsRef = useRef<MatchingAnimation[]>([]);
  const lastOrderbookRef = useRef<{ bids: OrderbookLevel[]; asks: OrderbookLevel[] }>({ bids: [], asks: [] });
  const groupRef = useRef<THREE.Group>(null);

  // Detect potential matches and create animations
  const detectMatches = useMemo(() => {
    if (!showOrderMatching || !isConnected || bids.length === 0 || asks.length === 0) {
      return [];
    }

    const newAnimations: MatchingAnimation[] = [];
    const priceSpread = priceRange.max - priceRange.min;

    // Find crossing orders (bid price >= ask price)
    const sortedBids = [...bids].sort((a, b) => b.price - a.price);
    const sortedAsks = [...asks].sort((a, b) => a.price - b.price);

    for (let i = 0; i < Math.min(sortedBids.length, sortedAsks.length, 5); i++) {
      const bid = sortedBids[i];
      const ask = sortedAsks[i];

      // Check if orders can match (bid price >= ask price)
      if (bid.price >= ask.price) {
        const executionPrice = (bid.price + ask.price) / 2;
        const executedQuantity = Math.min(bid.quantity, ask.quantity);

        // Calculate 3D positions
        const bidNormalizedPrice = (bid.price - priceRange.min) / priceSpread;
        const askNormalizedPrice = (ask.price - priceRange.min) / priceSpread;
        const executionNormalizedPrice = (executionPrice - priceRange.min) / priceSpread;

        const bidX = (bidNormalizedPrice - 0.5) * 20;
        const askX = (askNormalizedPrice - 0.5) * 20;
        const executionX = (executionNormalizedPrice - 0.5) * 20;

        const bidPosition = new THREE.Vector3(bidX, (bid.quantity / 10) * 5, -2);
        const askPosition = new THREE.Vector3(askX, (ask.quantity / 10) * 5, 2);
        const meetingPoint = new THREE.Vector3(executionX, Math.max(bidPosition.y, askPosition.y) + 2, 0);

        // Create explosion particles
        const explosionParticles: THREE.Vector3[] = [];
        for (let j = 0; j < 8; j++) {
          const angle = (j / 8) * Math.PI * 2;
          const radius = 0.5 + Math.random() * 1;
          explosionParticles.push(new THREE.Vector3(
            meetingPoint.x + Math.cos(angle) * radius,
            meetingPoint.y + Math.sin(angle) * radius,
            meetingPoint.z + (Math.random() - 0.5) * 2
          ));
        }

        newAnimations.push({
          id: `match-${Date.now()}-${i}`,
          bidPosition: bidPosition.clone(),
          askPosition: askPosition.clone(),
          meetingPoint: meetingPoint.clone(),
          progress: 0,
          maxProgress: 2000, // 2 seconds
          size: Math.min(executedQuantity * 0.5, 1),
          color: '#ffeb3b',
          executedQuantity,
          price: executionPrice,
          bidParticle: bidPosition.clone(),
          askParticle: askPosition.clone(),
          explosionParticles,
          explosionProgress: 0
        });
      }
    }

    return newAnimations;
  }, [bids, asks, priceRange, showOrderMatching, isConnected]);

  // Add new animations when matches are detected
  useEffect(() => {
    if (detectMatches.length > 0) {
      animationsRef.current = [...animationsRef.current, ...detectMatches];
    }
  }, [detectMatches]);

  // Animate the matching process
  useFrame((state, delta) => {
    if (!showOrderMatching) return;

    const deltaMs = delta * 1000;

    animationsRef.current = animationsRef.current.filter(animation => {
      animation.progress += deltaMs;
      const normalizedProgress = Math.min(animation.progress / animation.maxProgress, 1);

      if (normalizedProgress < 0.6) {
        // Phase 1: Particles move toward meeting point
        const t = normalizedProgress / 0.6;
        const easeT = 1 - Math.pow(1 - t, 3); // Ease out cubic

        animation.bidParticle.lerpVectors(animation.bidPosition, animation.meetingPoint, easeT);
        animation.askParticle.lerpVectors(animation.askPosition, animation.meetingPoint, easeT);
      } else if (normalizedProgress < 0.8) {
        // Phase 2: Explosion at meeting point
        animation.explosionProgress = (normalizedProgress - 0.6) / 0.2;
        
        // Both particles at meeting point
        animation.bidParticle.copy(animation.meetingPoint);
        animation.askParticle.copy(animation.meetingPoint);
      } else {
        // Phase 3: Fade out
        const fadeProgress = (normalizedProgress - 0.8) / 0.2;
        animation.explosionProgress = 1 - fadeProgress;
      }

      return normalizedProgress < 1;
    });

    // Limit animation count for performance
    if (animationsRef.current.length > 20) {
      animationsRef.current = animationsRef.current.slice(-20);
    }
  });

  if (!showOrderMatching) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* Render active animations */}
      {animationsRef.current.map((animation) => {
        const normalizedProgress = Math.min(animation.progress / animation.maxProgress, 1);
        const alpha = normalizedProgress < 0.8 ? 1 : (1 - (normalizedProgress - 0.8) / 0.2);

        return (
          <group key={animation.id}>
            {/* Bid particle */}
            {normalizedProgress < 0.6 && (
              <mesh position={animation.bidParticle}>
                <sphereGeometry args={[animation.size * 0.3, 8, 8]} />
                <meshStandardMaterial 
                  color="#10b981"
                  transparent
                  opacity={alpha}
                  emissive="#10b981"
                  emissiveIntensity={0.3}
                />
              </mesh>
            )}

            {/* Ask particle */}
            {normalizedProgress < 0.6 && (
              <mesh position={animation.askParticle}>
                <sphereGeometry args={[animation.size * 0.3, 8, 8]} />
                <meshStandardMaterial 
                  color="#ef4444"
                  transparent
                  opacity={alpha}
                  emissive="#ef4444"
                  emissiveIntensity={0.3}
                />
              </mesh>
            )}

            {/* Explosion effect */}
            {normalizedProgress >= 0.6 && animation.explosionProgress > 0 && (
              <>
                {/* Central explosion */}
                <mesh position={animation.meetingPoint} scale={[1 + animation.explosionProgress, 1 + animation.explosionProgress, 1 + animation.explosionProgress]}>
                  <sphereGeometry args={[animation.size * 0.5, 12, 12]} />
                  <meshStandardMaterial 
                    color={animation.color}
                    transparent
                    opacity={animation.explosionProgress * alpha}
                    emissive={animation.color}
                    emissiveIntensity={animation.explosionProgress * 0.8}
                  />
                </mesh>

                {/* Explosion particles */}
                {animation.explosionParticles.map((particle, index) => (
                  <mesh 
                    key={`explosion-${index}`}
                    position={[
                      animation.meetingPoint.x + (particle.x - animation.meetingPoint.x) * animation.explosionProgress,
                      animation.meetingPoint.y + (particle.y - animation.meetingPoint.y) * animation.explosionProgress,
                      animation.meetingPoint.z + (particle.z - animation.meetingPoint.z) * animation.explosionProgress
                    ]}
                    scale={[1 - animation.explosionProgress * 0.5, 1 - animation.explosionProgress * 0.5, 1 - animation.explosionProgress * 0.5]}
                  >
                    <sphereGeometry args={[0.1, 6, 6]} />
                    <meshStandardMaterial 
                      color={animation.color}
                      transparent
                      opacity={(1 - animation.explosionProgress) * alpha}
                      emissive={animation.color}
                      emissiveIntensity={0.5}
                    />
                  </mesh>
                ))}

                {/* Trade execution label */}
                <Text
                  position={[animation.meetingPoint.x, animation.meetingPoint.y + 1, animation.meetingPoint.z]}
                  fontSize={0.3}
                  color={animation.color}
                  anchorX="center"
                  anchorY="middle"
                >
                  {`${animation.executedQuantity.toFixed(2)} @ $${animation.price.toFixed(2)}`}
                </Text>
              </>
            )}

            {/* Connection lines during movement */}
            {normalizedProgress < 0.6 && (
              <>
                {/* Line from bid to meeting point */}
                <mesh>
                  <cylinderGeometry 
                    args={[
                      0.02, 
                      0.02, 
                      animation.bidParticle.distanceTo(animation.meetingPoint),
                      4
                    ]} 
                  />
                  <meshBasicMaterial color="#10b981" transparent opacity={alpha * 0.5} />
                </mesh>

                {/* Line from ask to meeting point */}
                <mesh>
                  <cylinderGeometry 
                    args={[
                      0.02, 
                      0.02, 
                      animation.askParticle.distanceTo(animation.meetingPoint),
                      4
                    ]} 
                  />
                  <meshBasicMaterial color="#ef4444" transparent opacity={alpha * 0.5} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* Order Matching Legend */}
      <group position={[15, -2, 0]}>
        <Text position={[0, 2, 0]} fontSize={0.4} color="white">
          Order Matching
        </Text>
        
        {/* Bid order */}
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.3} />
        </mesh>
        <Text position={[1, 1, 0]} fontSize={0.25} color="white">
          Bid Order
        </Text>
        
        {/* Ask order */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
        </mesh>
        <Text position={[1, 0.5, 0]} fontSize={0.25} color="white">
          Ask Order
        </Text>
        
        {/* Execution */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={0.5} />
        </mesh>
        <Text position={[1, 0, 0]} fontSize={0.25} color="white">
          Execution
        </Text>

        <Text position={[0, -0.5, 0]} fontSize={0.2} color="gray">
          Live Trade Matching
        </Text>
      </group>

      {/* Matching Statistics */}
      <group position={[15, -8, 0]}>
        <Text position={[0, 1, 0]} fontSize={0.3} color="white">
          Match Stats
        </Text>
        <Text position={[0, 0.5, 0]} fontSize={0.25} color="gray">
          Active: {animationsRef.current.length}
        </Text>
        <Text position={[0, 0, 0]} fontSize={0.25} color="gray">
          Mode: {isConnected ? 'Live' : 'Demo'}
        </Text>
      </group>
    </group>
  );
}
