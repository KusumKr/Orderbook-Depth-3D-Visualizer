'use client';

import { useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';

interface MobileControlsProps {
  onRotationChange?: (rotation: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
  autoRotate: boolean;
  onAutoRotateToggle: () => void;
  showPressureZones: boolean;
  onPressureZonesToggle: () => void;
  showVolumeProfile: boolean;
  onVolumeProfileToggle: () => void;
}

export default function MobileControls({
  onRotationChange,
  onZoomChange,
  onPanChange,
  autoRotate,
  onAutoRotateToggle,
  showPressureZones,
  onPressureZonesToggle,
  showVolumeProfile,
  onVolumeProfileToggle
}: MobileControlsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(null);
  const [isMultiTouch, setIsMultiTouch] = useState(false);
  const [initialDistance, setInitialDistance] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(1);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - rotation
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setIsMultiTouch(false);
    } else if (e.touches.length === 2) {
      // Multi-touch - zoom/pan
      setIsMultiTouch(true);
      const distance = Math.sqrt(
        Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
        Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
      );
      setInitialDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && !isMultiTouch && touchStart && lastTouch) {
      // Single touch rotation
      const deltaX = e.touches[0].clientX - lastTouch.x;
      const deltaY = e.touches[0].clientY - lastTouch.y;
      
      const rotationSensitivity = 0.01;
      onRotationChange?.({
        x: deltaY * rotationSensitivity,
        y: deltaX * rotationSensitivity
      });

      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && isMultiTouch) {
      // Multi-touch zoom
      const currentDistance = Math.sqrt(
        Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
        Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
      );

      if (initialDistance > 0) {
        const zoomFactor = currentDistance / initialDistance;
        const newZoom = Math.max(0.5, Math.min(3, currentZoom * zoomFactor));
        setCurrentZoom(newZoom);
        onZoomChange?.(newZoom);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setTouchStart(null);
    setLastTouch(null);
    setIsMultiTouch(false);
    setInitialDistance(0);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Touch overlay for gesture handling */}
      <div
        className="absolute inset-0 z-10 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      />

      {/* Mobile control button */}
      <button
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg"
        onClick={() => setShowControls(!showControls)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      </button>

      {/* Mobile control panel */}
      {showControls && (
        <div className="fixed bottom-20 right-4 z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 max-w-xs">
          <div className="space-y-4">
            {/* Touch instructions */}
            <div className="text-center">
              <h3 className="text-white font-semibold text-sm mb-2">Touch Controls</h3>
              <div className="text-xs text-gray-300 space-y-1">
                <div>• Single finger: Rotate</div>
                <div>• Two fingers: Zoom</div>
                <div>• Pinch: Scale view</div>
              </div>
            </div>

            {/* Quick toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Auto Rotate</span>
                <button
                  onClick={onAutoRotateToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoRotate ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRotate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Pressure Zones</span>
                <button
                  onClick={onPressureZonesToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showPressureZones ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showPressureZones ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Volume Profile</span>
                <button
                  onClick={onVolumeProfileToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showVolumeProfile ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showVolumeProfile ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Zoom controls */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Zoom Level</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const newZoom = Math.max(0.5, currentZoom - 0.2);
                    setCurrentZoom(newZoom);
                    onZoomChange?.(newZoom);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
                >
                  −
                </button>
                <span className="text-white text-sm flex-1 text-center">
                  {(currentZoom * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => {
                    const newZoom = Math.min(3, currentZoom + 0.2);
                    setCurrentZoom(newZoom);
                    onZoomChange?.(newZoom);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Reset view button */}
            <button
              onClick={() => {
                setCurrentZoom(1);
                onZoomChange?.(1);
                onRotationChange?.({ x: 0, y: 0 });
                onPanChange?.({ x: 0, y: 0 });
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded text-sm"
            >
              Reset View
            </button>
          </div>
        </div>
      )}

      {/* Performance indicator for mobile */}
      <div className="fixed top-4 right-4 z-40 bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-1 border border-gray-700">
        <div className="flex items-center space-x-2 text-xs text-gray-300">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Mobile Mode</span>
        </div>
      </div>
    </>
  );
}
