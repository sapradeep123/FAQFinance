"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDataService = void 0;
class MarketDataService {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 60 * 1000;
    }
    isValidCache(entry) {
        return Date.now() - entry.timestamp < this.CACHE_TTL;
    }
    getCachedData(ticker) {
        const entry = this.cache.get(ticker);
        if (entry && this.isValidCache(entry)) {
            return entry.data;
        }
        return null;
    }
    setCachedData(ticker, data) {
        this.cache.set(ticker, {
            data,
            timestamp: Date.now()
        });
    }
    async getSnapshot(ticker) {
        const cached = this.getCachedData(ticker);
        if (cached) {
            return cached;
        }
        let snapshot;
        try {
            snapshot = await this.getYahooData(ticker);
        }
        catch (error) {
            try {
                snapshot = await this.getGoogleData(ticker);
            }
            catch (error) {
                snapshot = this.getFallbackData(ticker);
            }
        }
        this.setCachedData(ticker, snapshot);
        return snapshot;
    }
    async getYahooData(ticker) {
        const mockPrices = {
            'AAPL': 175.43,
            'GOOGL': 2847.52,
            'MSFT': 378.85,
            'TSLA': 248.42,
            'AMZN': 3342.88,
            'NVDA': 875.28,
            'META': 331.26,
            'NFLX': 445.03
        };
        const mockSectors = {
            'AAPL': 'Technology',
            'GOOGL': 'Technology',
            'MSFT': 'Technology',
            'TSLA': 'Consumer Cyclical',
            'AMZN': 'Consumer Cyclical',
            'NVDA': 'Technology',
            'META': 'Technology',
            'NFLX': 'Communication Services'
        };
        await new Promise(resolve => setTimeout(resolve, 100));
        const basePrice = mockPrices[ticker] || 100;
        const variation = (Math.random() - 0.5) * 0.1;
        const price = basePrice * (1 + variation);
        return {
            price: Math.round(price * 100) / 100,
            currency: 'USD',
            exchange: 'NASDAQ',
            sector: mockSectors[ticker] || 'Technology',
            source: 'yahoo'
        };
    }
    async getGoogleData(ticker) {
        const mockPrices = {
            'AAPL': 174.89,
            'GOOGL': 2851.33,
            'MSFT': 379.12,
            'TSLA': 247.85,
            'AMZN': 3338.45,
            'NVDA': 873.91,
            'META': 332.14,
            'NFLX': 446.78
        };
        await new Promise(resolve => setTimeout(resolve, 150));
        const basePrice = mockPrices[ticker] || 95;
        const variation = (Math.random() - 0.5) * 0.08;
        const price = basePrice * (1 + variation);
        return {
            price: Math.round(price * 100) / 100,
            currency: 'USD',
            exchange: 'NYSE',
            sector: 'Technology',
            source: 'google'
        };
    }
    getFallbackData(ticker) {
        const hash = ticker.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const basePrice = Math.abs(hash % 1000) + 50;
        const variation = (Math.random() - 0.5) * 0.05;
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
    clearCache() {
        this.cache.clear();
    }
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}
exports.marketDataService = new MarketDataService();
//# sourceMappingURL=marketDataService.js.map