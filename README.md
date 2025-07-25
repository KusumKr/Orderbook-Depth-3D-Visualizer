# 3D Cryptocurrency Orderbook Visualizer

**GoQuant Technical Assignment Submission**

A real-time 3D visualization of cryptocurrency orderbook data with advanced trading insights, pressure zone analysis, and multi-venue support.

![Project Demo](https://via.placeholder.com/800x400?text=3D+Orderbook+Visualizer)

## 🚀 Features

- **3D Visualization**: Interactive 3D orderbook with Price (X), Quantity (Y), and Time (Z) axes
- **Real-time Data**: Live orderbook data from multiple cryptocurrency exchanges
- **Multi-Venue Support**: Binance, OKX, Bybit, and Deribit integration
- **Pressure Zone Analysis**: Visual heatmaps showing market pressure zones
- **Advanced Controls**: Rotation, zoom, pan, and auto-rotate functionality
- **Volume Profile**: Real-time volume analysis and distribution
- **Order Flow**: Advanced order flow visualization
- **Responsive Design**: Optimized for desktop and mobile devices
- **Theme Support**: Dark/Light theme toggle
- **Performance Optimized**: 60fps rendering with efficient data handling

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.3 with TypeScript
- **3D Graphics**: Three.js with @react-three/fiber
- **Styling**: Tailwind CSS
- **WebSocket**: Native WebSocket API for real-time data
- **State Management**: React hooks and context

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm, yarn, pnpm, or bun package manager
- Modern web browser with WebGL support

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd orderbook-visualizer
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

### 4. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Project Structure

```
orderbook-visualizer/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout with ThemeProvider
│   └── page.tsx           # Main application page
├── src/
│   ├── components/        # React components
│   │   ├── ControlPanel.tsx       # Control panel UI
│   │   ├── OrderbookVisualization.tsx  # 3D visualization
│   │   └── OrderbookImbalance.tsx      # Imbalance analysis
│   ├── contexts/          # React contexts
│   │   └── ThemeContext.tsx       # Theme management
│   ├── hooks/             # Custom React hooks
│   │   └── useMultiVenueOrderbook.ts  # Multi-venue data hook
│   ├── services/          # External services
│   │   └── multiVenueService.ts   # WebSocket connections
│   └── types/             # TypeScript type definitions
│       └── orderbook.ts   # Orderbook data types
└── public/                # Static assets
```

## 🔌 APIs and Data Sources

### Cryptocurrency Exchanges

1. **Binance**
   - WebSocket: `wss://stream.binance.com:9443/ws/`
   - Stream: `{symbol}@depth20@100ms`
   - Documentation: [Binance WebSocket API](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)

2. **OKX**
   - WebSocket: `wss://ws.okx.com:8443/ws/v5/public`
   - Channel: `books`
   - Documentation: [OKX WebSocket API](https://www.okx.com/docs-v5/en/#websocket-api-public-channel-order-book-channel)

3. **Bybit**
   - WebSocket: `wss://stream.bybit.com/v5/public/spot`
   - Topic: `orderbook.1.{symbol}`
   - Documentation: [Bybit WebSocket API](https://bybit-exchange.github.io/docs/v5/websocket/public/orderbook)

4. **Deribit**
   - WebSocket: `wss://www.deribit.com/ws/api/v2`
   - Channel: `book.{symbol}.100ms`
   - Documentation: [Deribit WebSocket API](https://docs.deribit.com/#book-instrument_name-interval)

## 🧠 Technical Decisions

### Architecture Choices

1. **Next.js with App Router**: Chosen for its excellent TypeScript support, built-in optimization, and modern React features.

2. **Three.js with React Three Fiber**: Provides declarative 3D graphics with React paradigms, making complex 3D scenes more manageable.

3. **WebSocket Management**: Custom multi-venue service with automatic reconnection, exponential backoff, and error handling.

4. **State Management**: React hooks and context for simplicity, avoiding external state management libraries for this scope.

### Performance Optimizations

1. **Data Limiting**: Orderbook data limited to top 20-50 levels per side to maintain 60fps
2. **Efficient Rendering**: Using React Three Fiber's optimization features
3. **Memory Management**: Proper cleanup of WebSocket connections and intervals
4. **Debounced Updates**: Throttled data updates to prevent excessive re-renders

### Error Handling

1. **Graceful Degradation**: Demo data fallback when WebSocket connections fail
2. **Automatic Reconnection**: Exponential backoff strategy for failed connections
3. **User Feedback**: Clear connection status indicators in the UI

## 📝 Assumptions Made

### Data Assumptions

1. **Symbol Format**: Assumes standard crypto pair format (e.g., 'btcusdt', 'ethusdt')
2. **Price Precision**: Uses standard floating-point precision for price calculations
3. **Update Frequency**: Assumes 100ms update intervals are sufficient for real-time visualization
4. **Market Hours**: Assumes 24/7 market operation for cryptocurrency exchanges

### Technical Assumptions

1. **Browser Support**: Assumes modern browsers with WebGL and WebSocket support
2. **Network Stability**: Implements reconnection logic assuming intermittent connectivity issues
3. **CORS Policy**: Assumes direct WebSocket connections are allowed (no proxy needed)
4. **Memory Constraints**: Assumes reasonable memory limits for browser-based 3D rendering

### Business Logic Assumptions

1. **Venue Priority**: No specific priority given to any exchange; all treated equally
2. **Data Aggregation**: Simple price-level aggregation without sophisticated matching
3. **Time Zones**: All timestamps normalized to local browser time
4. **Currency Pairs**: Focus on major USDT pairs for demonstration

## 🎮 Usage Guide

### Control Panel Features

- **Trading Pair Selection**: Choose from popular cryptocurrency pairs
- **Venue Filtering**: Toggle individual exchanges on/off
- **Visualization Controls**: Auto-rotate, pressure zones, volume profile
- **Theme Toggle**: Switch between dark and light themes
- **Advanced Features**: Order flow, imbalance analysis, depth heatmap

### 3D Navigation

- **Mouse Controls**: Left-click and drag to rotate, scroll to zoom
- **Touch Controls**: Touch and drag to rotate, pinch to zoom
- **Keyboard**: Arrow keys for rotation, +/- for zoom

## 🚨 Known Limitations

1. **Exchange Rate Limits**: Some exchanges may have connection limits
2. **Browser Performance**: Complex 3D scenes may impact performance on older devices
3. **WebSocket Stability**: Dependent on exchange WebSocket reliability
4. **Data Accuracy**: Real-time data subject to exchange API limitations

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

### Environment Variables

No environment variables required for basic functionality. All exchange connections use public WebSocket endpoints.

## 📊 Performance Metrics

- **Target FPS**: 60fps for smooth 3D rendering
- **Memory Usage**: Optimized for <100MB browser memory
- **Load Time**: <3 seconds initial load on broadband
- **Data Latency**: <200ms from exchange to visualization

## 🤝 Contributing

This project was developed as a technical assignment for GoQuant. For questions or improvements, please refer to the submission guidelines.

## 📄 License

This project is developed for educational and demonstration purposes as part of a technical assessment.

---

**Developed by**: [Your Name]  
**Submission Date**: [Current Date]  
**Assignment**: GoQuant 3D Orderbook Visualizer  
**Contact**: [Your Email]
