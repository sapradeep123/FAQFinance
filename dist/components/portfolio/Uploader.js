"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uploader = Uploader;
const react_1 = __importStar(require("react"));
const react_dropzone_1 = require("react-dropzone");
const XLSX = __importStar(require("xlsx"));
const lucide_react_1 = require("lucide-react");
const alert_1 = require("../ui/alert");
const REQUIRED_HEADERS = ['ticker', 'qty', 'avg_cost', 'as_of_date'];
function Uploader({ onFileUpload }) {
    const [uploadStatus, setUploadStatus] = (0, react_1.useState)({ type: null, message: '' });
    const [isProcessing, setIsProcessing] = (0, react_1.useState)(false);
    const validateHeaders = (headers) => {
        const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
        return REQUIRED_HEADERS.every(required => normalizedHeaders.includes(required.toLowerCase()));
    };
    const parseCSV = (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2)
            throw new Error('File must contain at least a header and one data row');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        if (!validateHeaders(headers)) {
            throw new Error(`Invalid headers. Required: ${REQUIRED_HEADERS.join(', ')}. Found: ${headers.join(', ')}`);
        }
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length !== headers.length)
                continue;
            const row = {};
            headers.forEach((header, index) => {
                row[header.toLowerCase()] = values[index];
            });
            data.push(row);
        }
        return data;
    };
    const parseXLSX = (buffer) => {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length < 2) {
            throw new Error('File must contain at least a header and one data row');
        }
        const headers = jsonData[0].map((h) => String(h).toLowerCase().trim());
        if (!validateHeaders(headers)) {
            throw new Error(`Invalid headers. Required: ${REQUIRED_HEADERS.join(', ')}. Found: ${headers.join(', ')}`);
        }
        const data = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = jsonData[i][index];
            });
            if (Object.values(row).some(v => v !== undefined && v !== null && v !== '')) {
                data.push(row);
            }
        }
        return data;
    };
    const validateAndTransformData = (rawData) => {
        const errors = [];
        const validData = [];
        rawData.forEach((row, index) => {
            const rowNum = index + 2;
            if (!row.ticker || typeof row.ticker !== 'string' || !row.ticker.trim()) {
                errors.push(`Row ${rowNum}: Invalid ticker`);
                return;
            }
            const qty = Number(row.qty);
            if (isNaN(qty) || qty <= 0) {
                errors.push(`Row ${rowNum}: Invalid quantity (must be positive number)`);
                return;
            }
            const avgCost = Number(row.avg_cost);
            if (isNaN(avgCost) || avgCost <= 0) {
                errors.push(`Row ${rowNum}: Invalid average cost (must be positive number)`);
                return;
            }
            const dateStr = String(row.as_of_date).trim();
            if (!dateStr) {
                errors.push(`Row ${rowNum}: Missing as_of_date`);
                return;
            }
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                errors.push(`Row ${rowNum}: Invalid date format (${dateStr})`);
                return;
            }
            validData.push({
                id: `preview-${index}`,
                ticker: row.ticker.toString().toUpperCase().trim(),
                qty: qty,
                avg_cost: avgCost,
                as_of_date: dateStr
            });
        });
        if (errors.length > 0) {
            throw new Error(`Validation errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''}`);
        }
        if (validData.length === 0) {
            throw new Error('No valid data rows found');
        }
        return validData;
    };
    const processFile = async (file) => {
        setIsProcessing(true);
        setUploadStatus({ type: null, message: '' });
        try {
            let rawData;
            if (file.name.toLowerCase().endsWith('.csv')) {
                const text = await file.text();
                rawData = parseCSV(text);
            }
            else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                const buffer = await file.arrayBuffer();
                rawData = parseXLSX(buffer);
            }
            else {
                throw new Error('Unsupported file format. Please upload CSV or XLSX files only.');
            }
            const validatedData = validateAndTransformData(rawData);
            onFileUpload(validatedData);
            setUploadStatus({
                type: 'success',
                message: `Successfully processed ${validatedData.length} positions from ${file.name}`
            });
        }
        catch (error) {
            setUploadStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to process file'
            });
        }
        finally {
            setIsProcessing(false);
        }
    };
    const onDrop = (0, react_1.useCallback)((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            processFile(acceptedFiles[0]);
        }
    }, []);
    const { getRootProps, getInputProps, isDragActive } = (0, react_dropzone_1.useDropzone)({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        multiple: false,
        disabled: isProcessing
    });
    return (<div className="space-y-4">
      
      <div {...getRootProps()} className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}>
        <input {...getInputProps()}/>
        <div className="flex flex-col items-center gap-3">
          {isProcessing ? (<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>) : (<lucide_react_1.Upload className="h-8 w-8 text-muted-foreground"/>)}
          <div>
            <p className="text-sm font-medium">
              {isProcessing ? 'Processing file...' :
            isDragActive ? 'Drop the file here' :
                'Drag & drop a file here, or click to select'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports CSV and XLSX files
            </p>
          </div>
        </div>
      </div>

      
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <lucide_react_1.FileText className="h-5 w-5 text-muted-foreground mt-0.5"/>
          <div>
            <p className="text-sm font-medium mb-2">Required Headers:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {REQUIRED_HEADERS.map(header => (<div key={header} className="flex items-center gap-1">
                  <code className="bg-background px-1.5 py-0.5 rounded text-xs">
                    {header}
                  </code>
                </div>))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Headers are case-insensitive. Date format: YYYY-MM-DD or MM/DD/YYYY
            </p>
          </div>
        </div>
      </div>

      
      {uploadStatus.type && (<alert_1.Alert variant={uploadStatus.type === 'error' ? 'destructive' : 'default'}>
          {uploadStatus.type === 'error' ? (<lucide_react_1.AlertCircle className="h-4 w-4"/>) : (<lucide_react_1.CheckCircle className="h-4 w-4"/>)}
          <alert_1.AlertDescription className="whitespace-pre-line">
            {uploadStatus.message}
          </alert_1.AlertDescription>
        </alert_1.Alert>)}
    </div>);
}
//# sourceMappingURL=Uploader.js.map