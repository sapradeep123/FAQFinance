interface Position {
    id: string;
    ticker: string;
    qty: number;
    avg_cost: number;
    current_price?: number;
    market_value?: number;
    unrealized_pnl?: number;
    unrealized_pnl_percent?: number;
}
interface InsightsPanelProps {
    positions: Position[];
    isLoading?: boolean;
}
export declare function InsightsPanel({ positions, isLoading }: InsightsPanelProps): any;
export {};
//# sourceMappingURL=InsightsPanel.d.ts.map