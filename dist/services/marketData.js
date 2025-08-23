"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
class MarketDataService {
    constructor() {
        this.cacheTimeout = 60000;
        this.apiKey = env_1.config.marketData.apiKey;
        this.baseUrl = env_1.config.marketData.baseUrl;
    }
    async getQuote(symbol) {
        try {
            const cachedQuote = await this.getCachedQuote(symbol);
            if (cachedQuote) {
                return cachedQuote;
            }
            const response = await axios_1.default.get(`${this.baseUrl}/query`, {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: symbol.toUpperCase(),
                    apikey: this.apiKey
                },
                timeout: 10000
            });
            const data = response.data['Global Quote'];
            if (!data) {
                throw new errorHandler_1.AppError(`Quote not found for symbol: ${symbol}`, 404);
            }
            const quote = {
                symbol: data['01. symbol'],
                price: parseFloat(data['05. price']),
                change: parseFloat(data['09. change']),
                changePercent: parseFloat(data['10. change percent'].replace('%', '')),
                volume: parseInt(data['06. volume']),
                timestamp: new Date()
            };
            await this.cacheQuote(quote);
            return quote;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            throw new errorHandler_1.AppError(`Failed to fetch quote for ${symbol}: ${error.message}`, 500);
        }
    }
    async getMultipleQuotes(symbols) {
        const quotes = await Promise.allSettled(symbols.map(symbol => this.getQuote(symbol)));
        return quotes
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value);
    }
    async getHistoricalData(symbol, period = '1M') {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/query`, {
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
                throw new errorHandler_1.AppError(`Historical data not found for symbol: ${symbol}`, 404);
            }
            const data = Object.entries(timeSeries)
                .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseInt(values['5. volume'])
            }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const cutoffDate = this.getCutoffDate(period);
            return data.filter(item => new Date(item.date) >= cutoffDate);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            throw new errorHandler_1.AppError(`Failed to fetch historical data for ${symbol}: ${error.message}`, 500);
        }
    }
    async searchSymbols(query) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/query`, {
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
            return matches.map((match) => ({
                symbol: match['1. symbol'],
                name: match['2. name'],
                type: match['3. type'],
                exchange: match['4. region']
            })).slice(0, 10);
        }
        catch (error) {
            throw new errorHandler_1.AppError(`Failed to search symbols: ${error.message}`, 500);
        }
    }
    async getMarketNews(symbols, limit = 20) {
        try {
            const params = {
                function: 'NEWS_SENTIMENT',
                apikey: this.apiKey,
                limit: limit.toString()
            };
            if (symbols && symbols.length > 0) {
                params.tickers = symbols.join(',');
            }
            const response = await axios_1.default.get(`${this.baseUrl}/query`, {
                params,
                timeout: 15000
            });
            const feed = response.data.feed;
            if (!feed) {
                return [];
            }
            return feed.map((article) => ({
                id: article.url,
                title: article.title,
                summary: article.summary,
                url: article.url,
                source: article.source,
                publishedAt: new Date(article.time_published),
                symbols: article.ticker_sentiment?.map((t) => t.ticker) || []
            }));
        }
        catch (error) {
            throw new errorHandler_1.AppError(`Failed to fetch market news: ${error.message}`, 500);
        }
    }
    async getMarketIndices() {
        const indices = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'];
        return this.getMultipleQuotes(indices);
    }
    async getSectorPerformance() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/query`, {
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
                performance: parseFloat(performance)
            }));
        }
        catch (error) {
            throw new errorHandler_1.AppError(`Failed to fetch sector performance: ${error.message}`, 500);
        }
    }
    async getCachedQuote(symbol) {
        try {
            const result = await (0, pool_1.query)('SELECT * FROM market_quotes_cache WHERE symbol = $1 AND created_at > NOW() - INTERVAL \'1 minute\'', [symbol.toUpperCase()]);
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
        }
        catch (error) {
            return null;
        }
    }
    async cacheQuote(quote) {
        try {
            await (0, pool_1.query)(`INSERT INTO market_quotes_cache 
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
         created_at = EXCLUDED.created_at`, [
                quote.symbol,
                quote.price,
                quote.change,
                quote.changePercent,
                quote.volume,
                quote.marketCap,
                quote.high52Week,
                quote.low52Week
            ]);
        }
        catch (error) {
            console.error('Failed to cache quote:', error);
        }
    }
    getCutoffDate(period) {
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
    static isValidSymbol(symbol) {
        return /^[A-Z]{1,5}$/.test(symbol.toUpperCase());
    }
    static getSupportedExchanges() {
        return ['NYSE', 'NASDAQ', 'AMEX', 'TSX', 'LSE', 'FRA'];
    }
}
exports.MarketDataService = MarketDataService;
exports.default = MarketDataService;
//# sourceMappingURL=marketData.js.map