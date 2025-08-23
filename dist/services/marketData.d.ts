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
export declare class MarketDataService {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly cacheTimeout;
    constructor();
    getQuote(symbol: string): Promise<MarketQuote>;
    getMultipleQuotes(symbols: string[]): Promise<MarketQuote[]>;
    getHistoricalData(symbol: string, period?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y'): Promise<HistoricalData[]>;
    searchSymbols(query: string): Promise<SearchResult[]>;
    getMarketNews(symbols?: string[], limit?: number): Promise<MarketNews[]>;
    getMarketIndices(): Promise<MarketQuote[]>;
    getSectorPerformance(): Promise<any[]>;
    private getCachedQuote;
    private cacheQuote;
    private getCutoffDate;
    static isValidSymbol(symbol: string): boolean;
    static getSupportedExchanges(): string[];
}
export default MarketDataService;
//# sourceMappingURL=marketData.d.ts.map