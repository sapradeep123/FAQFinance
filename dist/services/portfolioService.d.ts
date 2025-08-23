import { Portfolio, Position } from '../lib/dexie';
export interface CreatePortfolioData {
    name: string;
    description?: string;
    currency: string;
}
export interface PositionData {
    ticker: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currency?: string;
    sector?: string;
    exchange?: string;
}
export interface CSVPositionRow {
    ticker: string;
    name: string;
    quantity: string | number;
    averagePrice: string | number;
    currency?: string;
    sector?: string;
    exchange?: string;
}
declare class PortfolioService {
    createPortfolio(data: CreatePortfolioData): Promise<Portfolio>;
    listPortfolios(): Promise<Portfolio[]>;
    getPortfolio(id: string): Promise<Portfolio | undefined>;
    updatePortfolio(id: string, updates: Partial<Omit<Portfolio, 'id' | 'createdAt'>>): Promise<void>;
    deletePortfolio(id: string): Promise<void>;
    getPositions(portfolioId: string): Promise<Position[]>;
    addPosition(portfolioId: string, positionData: PositionData): Promise<Position>;
    updatePosition(id: string, updates: Partial<Omit<Position, 'id' | 'portfolioId' | 'createdAt'>>): Promise<void>;
    deletePosition(id: string): Promise<void>;
    savePositionsCSVorXLSX(portfolioId: string, file: File): Promise<Position[]>;
    private parseCSV;
    private parseXLSX;
    exportPositionsCSV(portfolioId: string): Promise<string>;
    getTotalPositions(): Promise<number>;
    getTotalPortfolios(): Promise<number>;
}
export declare const portfolioService: PortfolioService;
export default portfolioService;
//# sourceMappingURL=portfolioService.d.ts.map