import { OrderbookLevel } from '../types/orderbook';

export interface PerformanceConfig {
  maxOrderbookLevels: number;
  maxParticles: number;
  maxAnimations: number;
  lodThreshold: number;
  frameRateTarget: number;
  isMobile: boolean;
}

export const PERFORMANCE_CONFIGS: Record<string, PerformanceConfig> = {
  desktop: {
    maxOrderbookLevels: 50,
    maxParticles: 200,
    maxAnimations: 20,
    lodThreshold: 100,
    frameRateTarget: 60,
    isMobile: false
  },
  tablet: {
    maxOrderbookLevels: 30,
    maxParticles: 100,
    maxAnimations: 10,
    lodThreshold: 50,
    frameRateTarget: 30,
    isMobile: true
  },
  mobile: {
    maxOrderbookLevels: 20,
    maxParticles: 50,
    maxAnimations: 5,
    lodThreshold: 25,
    frameRateTarget: 30,
    isMobile: true
  }
};

export class PerformanceOptimizer {
  private frameRates: number[] = [];
  private lastFrameTime = 0;
  private config: PerformanceConfig;
  private adaptiveQuality = 1.0;

  constructor(deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop') {
    this.config = PERFORMANCE_CONFIGS[deviceType];
  }

  // Detect device type based on screen size and user agent
  static detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return 'desktop'; // Default to desktop during SSR
    }
    
    const width = window.innerWidth;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (width <= 768 || (isMobileUA && width <= 1024)) {
      return 'mobile';
    } else if (width <= 1024 || isMobileUA) {
      return 'tablet';
    }
    return 'desktop';
  }

  // Update frame rate tracking
  updateFrameRate(currentTime: number) {
    if (this.lastFrameTime > 0) {
      const deltaTime = currentTime - this.lastFrameTime;
      const fps = 1000 / deltaTime;
      
      this.frameRates.push(fps);
      
      // Keep only recent frame rates
      if (this.frameRates.length > 60) {
        this.frameRates = this.frameRates.slice(-60);
      }
      
      // Adjust quality based on performance
      this.adjustQuality();
    }
    
    this.lastFrameTime = currentTime;
  }

  // Get average frame rate
  getAverageFrameRate(): number {
    if (this.frameRates.length === 0) return 60;
    return this.frameRates.reduce((sum, fps) => sum + fps, 0) / this.frameRates.length;
  }

  // Adjust rendering quality based on performance
  private adjustQuality() {
    const avgFps = this.getAverageFrameRate();
    const targetFps = this.config.frameRateTarget;
    
    if (avgFps < targetFps * 0.8) {
      // Performance is poor, reduce quality
      this.adaptiveQuality = Math.max(0.5, this.adaptiveQuality - 0.1);
    } else if (avgFps > targetFps * 0.95) {
      // Performance is good, can increase quality
      this.adaptiveQuality = Math.min(1.0, this.adaptiveQuality + 0.05);
    }
  }

  // Optimize orderbook data for rendering
  optimizeOrderbookData(bids: OrderbookLevel[], asks: OrderbookLevel[]): {
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
  } {
    const maxLevels = Math.floor(this.config.maxOrderbookLevels * this.adaptiveQuality);
    
    return {
      bids: bids.slice(0, maxLevels),
      asks: asks.slice(0, maxLevels)
    };
  }

  // Get level of detail based on distance and performance
  getLevelOfDetail(distance: number): 'high' | 'medium' | 'low' {
    const qualityFactor = this.adaptiveQuality;
    
    if (distance < 20 && qualityFactor > 0.8) {
      return 'high';
    } else if (distance < 50 && qualityFactor > 0.5) {
      return 'medium';
    }
    return 'low';
  }

  // Get geometry complexity based on LOD
  getGeometryComplexity(lod: 'high' | 'medium' | 'low'): {
    segments: number;
    rings: number;
  } {
    switch (lod) {
      case 'high':
        return { segments: 16, rings: 16 };
      case 'medium':
        return { segments: 8, rings: 8 };
      case 'low':
        return { segments: 6, rings: 6 };
    }
  }

  // Limit particle count for performance
  limitParticles<T>(particles: T[]): T[] {
    const maxParticles = Math.floor(this.config.maxParticles * this.adaptiveQuality);
    return particles.slice(-maxParticles);
  }

  // Limit animation count for performance
  limitAnimations<T>(animations: T[]): T[] {
    const maxAnimations = Math.floor(this.config.maxAnimations * this.adaptiveQuality);
    return animations.slice(-maxAnimations);
  }

  // Check if feature should be enabled based on performance
  shouldEnableFeature(feature: 'particles' | 'animations' | 'heatmap' | 'volumeProfile'): boolean {
    const qualityThresholds = {
      particles: 0.6,
      animations: 0.7,
      heatmap: 0.5,
      volumeProfile: 0.8
    };
    
    return this.adaptiveQuality >= qualityThresholds[feature];
  }

  // Get current performance metrics
  getPerformanceMetrics() {
    return {
      averageFrameRate: this.getAverageFrameRate(),
      adaptiveQuality: this.adaptiveQuality,
      config: this.config,
      deviceType: this.config.isMobile ? 'mobile' : 'desktop'
    };
  }

  // Optimize texture sizes based on device
  getOptimalTextureSize(): number {
    if (this.config.isMobile) {
      return Math.floor(512 * this.adaptiveQuality);
    }
    return Math.floor(1024 * this.adaptiveQuality);
  }

  // Get optimal shadow map size
  getOptimalShadowMapSize(): number {
    if (this.config.isMobile) {
      return Math.floor(256 * this.adaptiveQuality);
    }
    return Math.floor(512 * this.adaptiveQuality);
  }

  // Debounce function for expensive operations
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle function for frequent operations
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer(
  PerformanceOptimizer.detectDeviceType()
);
