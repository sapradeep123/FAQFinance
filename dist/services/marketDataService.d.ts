interface MarketSnapshot {
    price: number;
    currency: string;
    exchange: string;
    sector: string;
    source: 'yahoo' | 'google' | 'fallback';
}
declare class MarketDataService {
    private cache;
    private readonly CACHE_TTL;
    private isValidCache;
    private getCachedData;
    private setCachedData;
    getSnapshot(ticker: string): Promise<MarketSnapshot>;
    private getYahooData;
    private getGoogleData;
    private getFallbackData;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        entries: string[];
    };
}
export declare const marketDataService: MarketDataService;
export type { MarketSnapshot };
//# sourceMappingURL=marketDataService.d.ts.map