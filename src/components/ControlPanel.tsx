'use client';

import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ControlPanelProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  venues: string[];
  selectedVenues: string[];
  onVenueToggle: (venue: string) => void;
  connectionStatus: Record<string, 'connected' | 'connecting' | 'disconnected'>;
  autoRotate: boolean;
  onAutoRotateToggle: () => void;
  showPressureZones: boolean;
  onPressureZonesToggle: () => void;
  showVolumeProfile: boolean;
  onVolumeProfileToggle: () => void;
  showOrderFlow: boolean;
  onOrderFlowToggle: () => void;
  showOrderMatching: boolean;
  onOrderMatchingToggle: () => void;
  showImbalance: boolean;
  onImbalanceToggle: () => void;
  showDepthHeatmap: boolean;
  onDepthHeatmapToggle: () => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export default function ControlPanel({
  symbol,
  onSymbolChange,
  venues,
  selectedVenues,
  onVenueToggle,
  connectionStatus,
  autoRotate,
  onAutoRotateToggle,
  showPressureZones,
  onPressureZonesToggle,
  showVolumeProfile,
  onVolumeProfileToggle,
  showOrderFlow,
  onOrderFlowToggle,
  showOrderMatching,
  onOrderMatchingToggle,
  showImbalance,
  onImbalanceToggle,
  showDepthHeatmap,
  onDepthHeatmapToggle,
  timeRange,
  onTimeRangeChange,
}: ControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const popularSymbols = [
    'btcusdt',
    'ethusdt',
    'adausdt',
    'dotusdt',
    'linkusdt',
    'solusdt',
  ];

  const timeRanges = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
  ];

  return (
    <div className="absolute top-4 left-4 z-10 bg-gray-800 rounded-lg shadow-lg border border-gray-700 min-w-80">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-white font-semibold text-lg">Control Panel</h2>
        <button className="text-gray-400 hover:text-white">
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-6">
          {/* Symbol Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trading Pair
            </label>
            <select
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {popularSymbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Venue Filtering */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trading Venues
            </label>
            <div className="space-y-2">
              {venues.map((venue) => (
                <label key={venue} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedVenues.includes(venue)}
                    onChange={() => onVenueToggle(venue)}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-gray-300">{venue}</span>
                  <div 
                    className={`ml-auto w-3 h-3 rounded-full ${
                      venue === 'Binance' ? 'bg-yellow-500' :
                      venue === 'OKX' ? 'bg-blue-500' :
                      venue === 'Bybit' ? 'bg-orange-500' :
                      'bg-purple-500'
                    }`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Visualization Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Visualization
            </label>
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

              {onOrderFlowToggle && (
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Order Flow</span>
                  <button
                    onClick={onOrderFlowToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showOrderFlow ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showOrderFlow ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              )}

              {onOrderMatchingToggle && (
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Order Matching</span>
                  <button
                    onClick={onOrderMatchingToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showOrderMatching ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showOrderMatching ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              )}

              {/* Bonus Features */}
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Orderbook Imbalance</span>
                <button
                  onClick={onImbalanceToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showImbalance ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showImbalance ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Depth Heatmap</span>
                <button
                  onClick={onDepthHeatmapToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showDepthHeatmap ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showDepthHeatmap ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              {/* Theme Toggle */}
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-yellow-500'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Statistics */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Live Statistics
            </label>
            <div className="bg-gray-700 rounded-md p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Spread:</span>
                <span className="text-white">0.01%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Volume:</span>
                <span className="text-white">1,234.56 BTC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Depth:</span>
                <span className="text-white">±2.5%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
              Export Data
            </button>
            <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
              Reset View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
