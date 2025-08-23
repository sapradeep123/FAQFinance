import axios from 'axios';
import { config } from '../config/env';
import { query } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high52Week?: number;
  low52Week?: number;
  timestamp: Date;
}

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: Date;
  symbols: string[];
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export class MarketDataService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheTimeout: number = 60000; // 1 minute cache

  constructor() {
    this.apiKey = config.marketData.apiKey;
    this.baseUrl = config.marketData.baseUrl;
  }

  // Get real-time quote for a symbol
  async getQuote(symbol: string): Promise<MarketQuote> {
    try {
      // Check cache first
      const cachedQuote = await this.getCachedQuote(symbol);
      if (cachedQuote) {
        return cachedQuote;
      }

      // Fetch from external API (Alpha Vantage example)
      const response = await axios.get(`${this.baseUrl}/query`, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data['Global Quote'];
      if (!data) {
        throw new AppError(`Quote not found for symbol: ${symbol}`, 404);
      }

      const quote: MarketQuote = {
        symbol: data['01. symbol'],
        price: parseFloat(data['05. price']),
        change: parseFloat(data['09. change']),
        changePercent: parseFloat(data['10. change percent'].replace('%', '')),
        volume: parseInt(data['06. volume']),
        timestamp: new Date()
      };

      // Cache the quote
      await this.cacheQuote(quote);

      return quote;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to fetch quote for ${symbol}: ${error.message}`, 500);
    }
  }

  // Get multiple quotes
  async getMultipleQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const quotes = await Promise.allSettled(
      symbols.map(symbol => this.getQuote(symbol))
    );

    return quotes
      .filter((result): result is PromiseFulfilledResult<MarketQuote> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  // Get historical data
  async getHistoricalData(
    symbol: string, 
    period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' = '1M'
  ): Promise<HistoricalData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/query`, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey,
          outputsize: period === '1Y' || period === '2Y' || period === '5Y' ? 'full' : 'compact'
        },
        timeout: 15000
      });

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new AppError(`Historical data not found for symbol: ${symbol}`, 404);
      }

      const data: HistoricalData[] = Object.entries(timeSeries)
        .map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Filter by period
      const cutoffDate = this.getCutoffDate(period);
      return data.filter(item => new Date(item.date) >= cutoffDate);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to fetch historical data for ${symbol}: ${error.message}`, 500);
    }
  }

  // Search for symbols
  async searchSymbols(query: string): Promise<SearchResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/query`, {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: query,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const matches = response.data.bestMatches;
      if (!matches) {
        return [];
      }

      return matches.map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        exchange: match['4. region']
      })).slice(0, 10); // Limit to 10 results
    } catch (error) {
      throw new AppError(`Failed to search symbols: ${error.message}`, 500);
    }
  }

  // Get market news
  async getMarketNews(symbols?: string[], limit: number = 20): Promise<MarketNews[]> {
    try {
      const params: any = {
        function: 'NEWS_SENTIMENT',
        apikey: this.apiKey,
        limit: limit.toString()
      };

      if (symbols && symbols.length > 0) {
        params.tickers = symbols.join(',');
      }

      const response = await axios.get(`${this.baseUrl}/query`, {
        params,
        timeout: 15000
      });

      const feed = response.data.feed;
      if (!feed) {
        return [];
      }

      return feed.map((article: any) => ({
        id: article.url, // Using URL as ID
        title: article.title,
        summary: article.summary,
        url: article.url,
        source: article.source,
        publishedAt: new Date(article.time_published),
        symbols: article.ticker_sentiment?.map((t: any) => t.ticker) || []
      }));
    } catch (error) {
      throw new AppError(`Failed to fetch market news: ${error.message}`, 500);
    }
  }

  // Get market indices
  async getMarketIndices(): Promise<MarketQuote[]> {
    const indices = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'];
    return this.getMultipleQuotes(indices);
  }

  // Get sector performance
  async getSectorPerformance(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/query`, {
        params: {
          function: 'SECTOR',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const sectorData = response.data['Rank A: Real-Time Performance'];
      if (!sectorData) {
        return [];
      }

      return Object.entries(sectorData).map(([sector, performance]) => ({
        sector,
        performance: parseFloat(performance as string)
      }));
    } catch (error) {
      throw new AppError(`Failed to fetch sector performance: ${error.message}`, 500);
    }
  }

  // Cache management
  private async getCachedQuote(symbol: string): Promise<MarketQuote | null> {
    try {
      const result = await query(
        'SELECT * FROM market_quotes_cache WHERE symbol = $1 AND created_at > NOW() - INTERVAL \'1 minute\'',
        [symbol.toUpperCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        symbol: row.symbol,
        price: parseFloat(row.price),
        change: parseFloat(row.change),
        changePercent: parseFloat(row.change_percent),
        volume: parseInt(row.volume),
        marketCap: row.market_cap ? parseFloat(row.market_cap) : undefined,
        high52Week: row.high_52_week ? parseFloat(row.high_52_week) : undefined,
        low52Week: row.low_52_week ? parseFloat(row.low_52_week) : undefined,
        timestamp: row.created_at
      };
    } catch (error) {
      // If cache fails, continue without cache
      return null;
    }
  }

  private async cacheQuote(quote: MarketQuote): Promise<void> {
    try {
      await query(
        `INSERT INTO market_quotes_cache 
         (symbol, price, change, change_percent, volume, market_cap, high_52_week, low_52_week, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (symbol) DO UPDATE SET
         price = EXCLUDED.price,
         change = EXCLUDED.change,
         change_percent = EXCLUDED.change_percent,
         volume = EXCLUDED.volume,
         market_cap = EXCLUDED.market_cap,
         high_52_week = EXCLUDED.high_52_week,
         low_52_week = EXCLUDED.low_52_week,
         created_at = EXCLUDED.created_at`,
        [
          quote.symbol,
          quote.price,
          quote.change,
          quote.changePercent,
          quote.volume,
          quote.marketCap,
          quote.high52Week,
          quote.low52Week
        ]
      );
    } catch (error) {
      // If caching fails, continue without cache
      console.error('Failed to cache quote:', error);
    }
  }

  private getCutoffDate(period: string): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (period) {
      case '1D':
        cutoff.setDate(now.getDate() - 1);
        break;
      case '1W':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      case '2Y':
        cutoff.setFullYear(now.getFullYear() - 2);
        break;
      case '5Y':
        cutoff.setFullYear(now.getFullYear() - 5);
        break;
      default:
        cutoff.setMonth(now.getMonth() - 1);
    }

    return cutoff;
  }

  // Validate symbol format
  static isValidSymbol(symbol: string): boolean {
    return /^[A-Z]{1,5}$/.test(symbol.toUpperCase());
  }

  // Get supported exchanges
  static getSupportedExchanges(): string[] {
    return ['NYSE', 'NASDAQ', 'AMEX', 'TSX', 'LSE', 'FRA'];
  }
}

export default MarketDataService;