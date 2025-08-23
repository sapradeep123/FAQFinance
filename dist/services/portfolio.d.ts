interface Portfolio {
    id: string;
    userId: string;
    name: string;
    description?: string;
    isDefault: boolean;
    totalValue: number;
    totalCost: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    createdAt: Date;
    updatedAt: Date;
}
interface Holding {
    id: string;
    portfolioId: string;
    symbol: string;
    quantity: number;
    averageCost: number;
    totalCost: number;
    currentPrice: number;
    currentValue: number;
    gainLoss: number;
    gainLossPercent: number;
    createdAt: Date;
    updatedAt: Date;
}
interface Transaction {
    id: string;
    portfolioId: string;
    symbol: string;
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
    totalAmount: number;
    fees?: number;
    notes?: string;
    transactionDate: Date;
    createdAt: Date;
}
interface PortfolioPerformance {
    portfolioId: string;
    period: string;
    startValue: number;
    endValue: number;
    gainLoss: number;
    gainLossPercent: number;
    bestPerformer: {
        symbol: string;
        gainLossPercent: number;
    };
    worstPerformer: {
        symbol: string;
        gainLossPercent: number;
    };
}
interface PortfolioAnalytics {
    totalPortfolios: number;
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    topHoldings: Array<{
        symbol: string;
        value: number;
        weight: number;
    }>;
    sectorAllocation: Array<{
        sector: string;
        value: number;
        weight: number;
    }>;
    assetAllocation: Array<{
        type: string;
        value: number;
        weight: number;
    }>;
}
export declare class PortfolioService {
    private marketDataService;
    constructor();
    createPortfolio(userId: string, name: string, description?: string, isDefault?: boolean): Promise<Portfolio>;
    getUserPortfolios(userId: string): Promise<Portfolio[]>;
    getPortfolio(portfolioId: string, userId: string): Promise<Portfolio | null>;
    updatePortfolio(portfolioId: string, userId: string, updates: Partial<{
        name: string;
        description: string;
        isDefault: boolean;
    }>): Promise<Portfolio | null>;
    deletePortfolio(portfolioId: string, userId: string): Promise<void>;
    addHolding(portfolioId: string, userId: string, symbol: string, quantity: number, price: number, fees?: number, notes?: string): Promise<void>;
    removeHolding(portfolioId: string, userId: string, symbol: string, quantity: number, price: number, fees?: number, notes?: string): Promise<void>;
    getPortfolioHoldings(portfolioId: string, userId: string): Promise<Holding[]>;
    getPortfolioTransactions(portfolioId: string, userId: string, limit?: number, offset?: number): Promise<Transaction[]>;
    getPortfolioPerformance(portfolioId: string, userId: string, period?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'): Promise<PortfolioPerformance>;
    getUserPortfolioAnalytics(userId: string): Promise<PortfolioAnalytics>;
    private verifyPortfolioOwnership;
    private calculatePortfolioMetrics;
}
export default PortfolioService;
//# sourceMappingURL=portfolio.d.ts.map