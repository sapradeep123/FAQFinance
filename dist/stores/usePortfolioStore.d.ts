import type { Portfolio, Position } from '../lib/dexie';
interface PortfolioInsights {
    totalValue: number;
    totalCost: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    dayChange: number;
    dayChangePercent: number;
    allocation: Array<{
        symbol: string;
        value: number;
        percentage: number;
        sector: string;
    }>;
    sectorAllocation: Array<{
        sector: string;
        value: number;
        percentage: number;
    }>;
}
export declare const usePortfolioStore: any;
export type { Portfolio, Position, PortfolioInsights };
//# sourceMappingURL=usePortfolioStore.d.ts.map