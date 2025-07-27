'use client';

import { useState } from 'react';
import OrderbookVisualization from '../src/components/OrderbookVisualization';
import ControlPanel from '../src/components/ControlPanel';
import { useMultiVenueOrderbook } from '../src/hooks/useMultiVenueOrderbook';

export default function Home() {
  const [symbol, setSymbol] = useState('btcusdt');
  const [selectedVenues, setSelectedVenues] = useState(['binance', 'okx']);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showPressureZones, setShowPressureZones] = useState(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [showOrderFlow, setShowOrderFlow] = useState(false);
  const [showOrderMatching, setShowOrderMatching] = useState(false);
  const [showImbalance, setShowImbalance] = useState(false);
  const [showDepthHeatmap, setShowDepthHeatmap] = useState(false);
  const [timeRange, setTimeRange] = useState('1m');

  const venues = ['binance', 'okx', 'bybit', 'deribit'];
  const aggregatedData = useMultiVenueOrderbook(symbol, selectedVenues);
  const isConnected = aggregatedData.connectedVenues > 0;
  const error = aggregatedData.connectedVenues === 0 ? 'No venues connected' : null;

  const handleVenueToggle = (venue: string) => {
    setSelectedVenues(prev => 
      prev.includes(venue) 
        ? prev.filter(v => v !== venue)
        : [...prev, venue]
    );
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center relative">
            <h1 className="text-2xl font-bold text-white text-center">
              Orderbook Depth 3D Visualizer
            </h1>
            <div className="absolute right-0 flex items-center space-x-4">
              <div className="text-sm text-gray-300 flex items-center space-x-2">
                <span className={isConnected ? "text-green-400" : "text-red-400"}>
                  ●
                </span>
                {isConnected && 'Live Data'}
                {!isConnected && error && 'Connection Error'}
                {!isConnected && !error && 'Demo Mode'}
              </div>
              <div className="text-sm text-gray-300">
                Symbol: <span className="text-white font-mono">{symbol.toUpperCase()}</span> 
              </div>   
            </div>
          </div>
        </div>

      </header>

      {/* Control Panel */}
      <div className="absolute top-20 left-4 z-30">
        <ControlPanel
          symbol={symbol}
          onSymbolChange={setSymbol}
          venues={venues.map(v => v.charAt(0).toUpperCase() + v.slice(1))}
          selectedVenues={selectedVenues.map(v => v.charAt(0).toUpperCase() + v.slice(1))}
          onVenueToggle={(venue) => handleVenueToggle(venue.toLowerCase())}
          connectionStatus={Object.fromEntries(
            selectedVenues.map(venue => [
              venue.charAt(0).toUpperCase() + venue.slice(1),
              aggregatedData.venueData[venue]?.isConnected ? 'connected' : 'disconnected'
            ])
          )}
          autoRotate={autoRotate}
          onAutoRotateToggle={() => setAutoRotate(!autoRotate)}
          showPressureZones={showPressureZones}
          onPressureZonesToggle={() => setShowPressureZones(!showPressureZones)}
          showVolumeProfile={showVolumeProfile}
          onVolumeProfileToggle={() => setShowVolumeProfile(!showVolumeProfile)}
          showOrderFlow={showOrderFlow}
          onOrderFlowToggle={() => setShowOrderFlow(!showOrderFlow)}
          showOrderMatching={showOrderMatching}
          onOrderMatchingToggle={() => setShowOrderMatching(!showOrderMatching)}
          showImbalance={showImbalance}
          onImbalanceToggle={() => setShowImbalance(!showImbalance)}
          showDepthHeatmap={showDepthHeatmap}
          onDepthHeatmapToggle={() => setShowDepthHeatmap(!showDepthHeatmap)}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </div>

      {/* Main 3D Visualization */}
      <main className="h-screen pt-16">
        <OrderbookVisualization 
          symbol={symbol}
          selectedVenues={selectedVenues}
          className="w-full h-full"
          timeRange={timeRange}
          showPressureZones={showPressureZones}
          showVolumeProfile={showVolumeProfile}
          showOrderFlow={showOrderFlow}
          showOrderMatching={showOrderMatching}
          autoRotate={autoRotate}
        />
      </main>

      {/* Status Bar */}
      <div className="absolute bottom-4 right-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
        <div className="flex items-center space-x-4 text-sm text-gray-300">
          <div>
            <span className="text-green-400">Bids:</span> {selectedVenues.length > 0 ? '●' : '○'}
          </div>
          <div>
            <span className="text-red-400">Asks:</span> {selectedVenues.length > 0 ? '●' : '○'}
          </div>
          <div>
            Venues: {selectedVenues.length}/{venues.length}
          </div>
        </div>
      </div>
    </div>
  );
}