interface PreviewPosition {
    id: string;
    ticker: string;
    qty: number;
    avg_cost: number;
    as_of_date: string;
}
interface UploaderProps {
    onFileUpload: (data: PreviewPosition[]) => void;
}
export declare function Uploader({ onFileUpload }: UploaderProps): any;
export {};
//# sourceMappingURL=Uploader.d.ts.map