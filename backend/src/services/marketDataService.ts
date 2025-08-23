import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';

export interface MarketSnapshot {
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  currency: string;
  exchange: string;
  last_updated: Date;
  provider: 'YAHOO' | 'GOOGLE' | 'FALLBACK';
  metadata?: Record<string, any>;
}

export interface HistoricalPrice {
  ticker: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close?: number;
}

export interface MarketDataProvider {
  provider: 'YAHOO' | 'GOOGLE' | 'FALLBACK';
  priority: number;
  timeout_ms: number;
  base_url: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'RATE_LIMITED';
}

class MarketDataService {
  private readonly CACHE_DURATION_MINUTES = 5; // Cache market data for 5 minutes
  private readonly STALE_THRESHOLD_MINUTES = 15; // Mark data as stale after 15 minutes

  private async getActiveProviders(): Promise<MarketDataProvider[]> {
    const result = await pool.query(
      `SELECT provider, priority, timeout_ms, base_url, status
       FROM api_configs 
       WHERE status = 'ACTIVE'
       ORDER BY priority ASC`,
      []
    );

    return result.rows;
  }

  private async getCachedSnapshot(ticker: string): Promise<MarketSnapshot | null> {
    const result = await pool.query(
      `SELECT ticker, price, change_amount, change_percent, volume, market_cap,
              pe_ratio, dividend_yield, fifty_two_week_high, fifty_two_week_low,
              currency, exchange, last_updated, provider, metadata
       FROM market_data_cache 
       WHERE ticker = $1 
         AND last_updated > CURRENT_TIMESTAMP - INTERVAL '${this.CACHE_DURATION_MINUTES} minutes'
       ORDER BY last_updated DESC 
       LIMIT 1`,
      [ticker.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ticker: row.ticker,
      price: parseFloat(row.price),
      change: parseFloat(row.change_amount),
      change_percent: parseFloat(row.change_percent),
      volume: parseInt(row.volume),
      market_cap: row.market_cap ? parseFloat(row.market_cap) : undefined,
      pe_ratio: row.pe_ratio ? parseFloat(row.pe_ratio) : undefined,
      dividend_yield: row.dividend_yield ? parseFloat(row.dividend_yield) : undefined,
      fifty_two_week_high: row.fifty_two_week_high ? parseFloat(row.fifty_two_week_high) : undefined,
      fifty_two_week_low: row.fifty_two_week_low ? parseFloat(row.fifty_two_week_low) : undefined,
      currency: row.currency,
      exchange: row.exchange,
      last_updated: row.last_updated,
      provider: row.provider,
      metadata: row.metadata
    };
  }

  private async cacheSnapshot(snapshot: MarketSnapshot): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO market_data_cache (
          ticker, price, change_amount, change_percent, volume, market_cap,
          pe_ratio, dividend_yield, fifty_two_week_high, fifty_two_week_low,
          currency, exchange, provider, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (ticker) DO UPDATE SET
          price = EXCLUDED.price,
          change_amount = EXCLUDED.change_amount,
          change_percent = EXCLUDED.change_percent,
          volume = EXCLUDED.volume,
          market_cap = EXCLUDED.market_cap,
          pe_ratio = EXCLUDED.pe_ratio,
          dividend_yield = EXCLUDED.dividend_yield,
          fifty_two_week_high = EXCLUDED.fifty_two_week_high,
          fifty_two_week_low = EXCLUDED.fifty_two_week_low,
          currency = EXCLUDED.currency,
          exchange = EXCLUDED.exchange,
          provider = EXCLUDED.provider,
          metadata = EXCLUDED.metadata,
          last_updated = CURRENT_TIMESTAMP`,
        [
          snapshot.ticker.toUpperCase(),
          snapshot.price,
          snapshot.change,
          snapshot.change_percent,
          snapshot.volume,
          snapshot.market_cap,
          snapshot.pe_ratio,
          snapshot.dividend_yield,
          snapshot.fifty_two_week_high,
          snapshot.fifty_two_week_low,
          snapshot.currency,
          snapshot.exchange,
          snapshot.provider,
          JSON.stringify(snapshot.metadata || {})
        ]
      );
    } catch (error) {
      console.error('Failed to cache market snapshot:', error);
      // Don't throw - caching failures shouldn't break the main flow
    }
  }

  private async mockProviderCall(
    provider: MarketDataProvider,
    ticker: string
  ): Promise<MarketSnapshot> {
    const startTime = Date.now();
    
    // Simulate network delay
    const delay = Math.random() * 1000 + 200;
    await new Promise(resolve => setTimeout(resolve, delay));

    const responseTime = Date.now() - startTime;

    // Generate mock data based on ticker
    const mockData = this.generateMockMarketData(ticker, provider.provider);
    
    return {
      ...mockData,
      last_updated: new Date(),
      provider: provider.provider,
      metadata: {
        response_time_ms: responseTime,
        source: provider.base_url,
        api_version: '1.0'
      }
    };
  }

  private generateMockMarketData(
    ticker: string,
    provider: 'YAHOO' | 'GOOGLE' | 'FALLBACK'
  ): Omit<MarketSnapshot, 'last_updated' | 'provider' | 'metadata'> {
    // Seed random number generator with ticker for consistent results
    const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed * 9301 + 49297) % 233280 / 233280;
    
    // Base prices for common tickers
    const basePrices: Record<string, number> = {
      'AAPL': 175.00,
      'GOOGL': 2800.00,
      'MSFT': 350.00,
      'AMZN': 3200.00,
      'TSLA': 800.00,
      'META': 320.00,
      'NVDA': 450.00,
      'NFLX': 400.00,
      'SPY': 420.00,
      'QQQ': 350.00,
      'VTI': 220.00,
      'BTC-USD': 45000.00,
      'ETH-USD': 3000.00
    };

    const basePrice = basePrices[ticker.toUpperCase()] || (50 + random * 200);
    
    // Add some variation based on provider (simulate different data sources)
    const providerVariation = {
      'YAHOO': 1.0,
      'GOOGLE': 0.998,
      'FALLBACK': 1.002
    };
    
    const price = basePrice * providerVariation[provider] * (0.95 + random * 0.1);
    const change = (random - 0.5) * price * 0.05; // ±2.5% change
    const changePercent = (change / (price - change)) * 100;
    
    // Generate other market data
    const volume = Math.floor(1000000 + random * 10000000);
    const marketCap = price * (100000000 + random * 1000000000); // Mock shares outstanding
    
    return {
      ticker: ticker.toUpperCase(),
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      change_percent: Math.round(changePercent * 100) / 100,
      volume,
      market_cap: Math.round(marketCap),
      pe_ratio: 15 + random * 20, // 15-35 P/E ratio
      dividend_yield: random < 0.7 ? Math.round(random * 4 * 100) / 100 : undefined, // 0-4% dividend yield
      fifty_two_week_high: Math.round(price * (1.1 + random * 0.3) * 100) / 100,
      fifty_two_week_low: Math.round(price * (0.7 - random * 0.2) * 100) / 100,
      currency: ticker.includes('-USD') ? 'USD' : 'USD',
      exchange: this.getExchangeForTicker(ticker)
    };
  }

  private getExchangeForTicker(ticker: string): string {
    const exchanges: Record<string, string> = {
      'AAPL': 'NASDAQ',
      'GOOGL': 'NASDAQ',
      'MSFT': 'NASDAQ',
      'AMZN': 'NASDAQ',
      'TSLA': 'NASDAQ',
      'META': 'NASDAQ',
      'NVDA': 'NASDAQ',
      'NFLX': 'NASDAQ',
      'SPY': 'NYSE',
      'QQQ': 'NASDAQ',
      'VTI': 'NYSE'
    };

    if (ticker.includes('-USD')) {
      return 'CRYPTO';
    }

    return exchanges[ticker.toUpperCase()] || 'NYSE';
  }

  async getSnapshot(ticker: string): Promise<MarketSnapshot> {
    // Check cache first
    const cached = await this.getCachedSnapshot(ticker);
    if (cached) {
      return cached;
    }

    const providers = await this.getActiveProviders();
    if (providers.length === 0) {
      throw createError(503, 'No active market data providers available');
    }

    // Try providers in priority order
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        const snapshot = await this.mockProviderCall(provider, ticker);
        
        // Cache the successful result
        await this.cacheSnapshot(snapshot);
        
        return snapshot;
      } catch (error) {
        console.error(`Provider ${provider.provider} failed for ticker ${ticker}:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
        continue;
      }
    }

    // All providers failed
    throw createError(503, `Failed to fetch market data for ${ticker}: ${lastError?.message}`);
  }

  async getMultipleSnapshots(tickers: string[]): Promise<MarketSnapshot[]> {
    // Process in parallel but limit concurrency to avoid overwhelming providers
    const BATCH_SIZE = 5;
    const results: MarketSnapshot[] = [];
    
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      const batch = tickers.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(ticker => 
        this.getSnapshot(ticker).catch(error => {
          console.error(`Failed to fetch data for ${ticker}:`, error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as MarketSnapshot[]);
    }
    
    return results;
  }

  async getHistoricalPrices(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]> {
    // For now, return mock historical data
    // In a real implementation, this would call the provider APIs
    const prices: HistoricalPrice[] = [];
    const currentDate = new Date(startDate);
    const snapshot = await this.getSnapshot(ticker);
    
    let currentPrice = snapshot.price;
    
    while (currentDate <= endDate) {
      // Skip weekends for stock data
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const dailyChange = (Math.random() - 0.5) * 0.04; // ±2% daily change
        const open = currentPrice;
        const close = currentPrice * (1 + dailyChange);
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        const volume = Math.floor(500000 + Math.random() * 2000000);
        
        prices.push({
          ticker: ticker.toUpperCase(),
          date: new Date(currentDate),
          open: Math.round(open * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume,
          adjusted_close: Math.round(close * 100) / 100
        });
        
        currentPrice = close;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return prices;
  }

  async searchTickers(query: string, limit: number = 10): Promise<{
    ticker: string;
    name: string;
    exchange: string;
    type: 'stock' | 'etf' | 'crypto' | 'index';
  }[]> {
    // Mock ticker search results
    const mockTickers = [
      { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock' as const },
      { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ', type: 'stock' as const },
      { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'stock' as const },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'stock' as const },
      { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'stock' as const },
      { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'stock' as const },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock' as const },
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', type: 'etf' as const },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', type: 'etf' as const },
      { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE', type: 'etf' as const },
      { ticker: 'BTC-USD', name: 'Bitcoin USD', exchange: 'CRYPTO', type: 'crypto' as const },
      { ticker: 'ETH-USD', name: 'Ethereum USD', exchange: 'CRYPTO', type: 'crypto' as const }
    ];

    const lowerQuery = query.toLowerCase();
    const filtered = mockTickers.filter(ticker => 
      ticker.ticker.toLowerCase().includes(lowerQuery) ||
      ticker.name.toLowerCase().includes(lowerQuery)
    );

    return filtered.slice(0, limit);
  }

  async getMarketStatus(): Promise<{
    market: string;
    status: 'open' | 'closed' | 'pre_market' | 'after_hours';
    next_open?: Date;
    next_close?: Date;
  }[]> {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Simple market hours logic (US markets)
    let status: 'open' | 'closed' | 'pre_market' | 'after_hours' = 'closed';
    
    if (day >= 1 && day <= 5) { // Monday to Friday
      if (hour >= 9 && hour < 16) {
        status = 'open';
      } else if (hour >= 4 && hour < 9) {
        status = 'pre_market';
      } else if (hour >= 16 && hour < 20) {
        status = 'after_hours';
      }
    }
    
    return [
      {
        market: 'NYSE',
        status,
        next_open: this.getNextMarketOpen(now),
        next_close: this.getNextMarketClose(now)
      },
      {
        market: 'NASDAQ',
        status,
        next_open: this.getNextMarketOpen(now),
        next_close: this.getNextMarketClose(now)
      },
      {
        market: 'CRYPTO',
        status: 'open', // Crypto markets are always open
      }
    ];
  }

  private getNextMarketOpen(now: Date): Date {
    const next = new Date(now);
    next.setHours(9, 30, 0, 0);
    
    // If it's past market open today, move to next business day
    if (now.getHours() >= 9 && now.getMinutes() >= 30) {
      next.setDate(next.getDate() + 1);
    }
    
    // Skip weekends
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }

  private getNextMarketClose(now: Date): Date {
    const next = new Date(now);
    next.setHours(16, 0, 0, 0);
    
    // If it's past market close today, move to next business day
    if (now.getHours() >= 16) {
      next.setDate(next.getDate() + 1);
    }
    
    // Skip weekends
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }

  async cleanupStaleData(): Promise<number> {
    const result = await pool.query(
      `DELETE FROM market_data_cache 
       WHERE last_updated < CURRENT_TIMESTAMP - INTERVAL '${this.STALE_THRESHOLD_MINUTES} minutes'`
    );
    
    return result.rowCount || 0;
  }
}

export const marketDataService = new MarketDataService();
export default marketDataService;