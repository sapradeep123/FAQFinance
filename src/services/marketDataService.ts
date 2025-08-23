import { API_BASE_URL } from '../config/clientEnv';

interface MarketSnapshot {
  price: number;
  currency: string;
  exchange: string;
  sector: string;
  source: 'yahoo' | 'google' | 'fallback';
}

interface CacheEntry {
  data: MarketSnapshot;
  timestamp: number;
}

class MarketDataService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds

  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }

  private getCachedData(ticker: string): MarketSnapshot | null {
    const entry = this.cache.get(ticker);
    if (entry && this.isValidCache(entry)) {
      return entry.data;
    }
    return null;
  }

  private setCachedData(ticker: string, data: MarketSnapshot): void {
    this.cache.set(ticker, {
      data,
      timestamp: Date.now()
    });
  }

  async getSnapshot(ticker: string): Promise<MarketSnapshot> {
    // TODO: Replace with actual API call to GET /market/snapshot/{ticker}
    // const response = await fetch(`${API_BASE_URL}/market/snapshot/${ticker}`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) throw new Error('Failed to get market data');
    // const data = await response.json();
    // this.setCachedData(ticker, data);
    // return data;
    
    // Check cache first
    const cached = this.getCachedData(ticker);
    if (cached) {
      return cached;
    }

    let snapshot: MarketSnapshot;

    try {
      // Try Yahoo Finance first
      snapshot = await this.getYahooData(ticker);
    } catch (error) {
      try {
        // Fallback to Google Finance
        snapshot = await this.getGoogleData(ticker);
      } catch (error) {
        // Final fallback with mock data
        snapshot = this.getFallbackData(ticker);
      }
    }

    // Cache the result
    this.setCachedData(ticker, snapshot);
    return snapshot;
  }

  private async getYahooData(ticker: string): Promise<MarketSnapshot> {
    // Mock Yahoo Finance data
    const mockPrices: Record<string, number> = {
      'AAPL': 175.43,
      'GOOGL': 2847.52,
      'MSFT': 378.85,
      'TSLA': 248.42,
      'AMZN': 3342.88,
      'NVDA': 875.28,
      'META': 331.26,
      'NFLX': 445.03
    };

    const mockSectors: Record<string, string> = {
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'MSFT': 'Technology',
      'TSLA': 'Consumer Cyclical',
      'AMZN': 'Consumer Cyclical',
      'NVDA': 'Technology',
      'META': 'Technology',
      'NFLX': 'Communication Services'
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const basePrice = mockPrices[ticker] || 100;
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);

    return {
      price: Math.round(price * 100) / 100,
      currency: 'USD',
      exchange: 'NASDAQ',
      sector: mockSectors[ticker] || 'Technology',
      source: 'yahoo'
    };
  }

  private async getGoogleData(ticker: string): Promise<MarketSnapshot> {
    // Mock Google Finance data
    const mockPrices: Record<string, number> = {
      'AAPL': 174.89,
      'GOOGL': 2851.33,
      'MSFT': 379.12,
      'TSLA': 247.85,
      'AMZN': 3338.45,
      'NVDA': 873.91,
      'META': 332.14,
      'NFLX': 446.78
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    const basePrice = mockPrices[ticker] || 95;
    const variation = (Math.random() - 0.5) * 0.08; // ±4% variation
    const price = basePrice * (1 + variation);

    return {
      price: Math.round(price * 100) / 100,
      currency: 'USD',
      exchange: 'NYSE',
      sector: 'Technology',
      source: 'google'
    };
  }

  private getFallbackData(ticker: string): MarketSnapshot {
    // Fallback mock data
    const hash = ticker.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const basePrice = Math.abs(hash % 1000) + 50; // Price between 50-1050
    const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
    const price = basePrice * (1 + variation);

    const sectors = ['Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical', 'Energy'];
    const exchanges = ['NYSE', 'NASDAQ', 'AMEX'];

    return {
      price: Math.round(price * 100) / 100,
      currency: 'USD',
      exchange: exchanges[Math.abs(hash) % exchanges.length],
      sector: sectors[Math.abs(hash) % sectors.length],
      source: 'fallback'
    };
  }

  // Clear cache method for testing/maintenance
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const marketDataService = new MarketDataService();
export type { MarketSnapshot };