interface PreviewPosition {
    id: string;
    ticker: string;
    qty: number;
    avg_cost: number;
    as_of_date: string;
    isDeleted?: boolean;
}
interface PreviewTableProps {
    data: PreviewPosition[];
    onDeleteRow: (id: string) => void;
    onUndoRow: (id: string) => void;
}
export declare function PreviewTable({ data, onDeleteRow, onUndoRow }: PreviewTableProps): any;
export {};
//# sourceMappingURL=PreviewTable.d.ts.map