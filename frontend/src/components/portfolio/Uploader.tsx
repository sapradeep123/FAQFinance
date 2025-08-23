import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

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

const REQUIRED_HEADERS = ['ticker', 'qty', 'avg_cost', 'as_of_date'];

export function Uploader({ onFileUpload }: UploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const validateHeaders = (headers: string[]): boolean => {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    return REQUIRED_HEADERS.every(required => 
      normalizedHeaders.includes(required.toLowerCase())
    );
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('File must contain at least a header and one data row');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    if (!validateHeaders(headers)) {
      throw new Error(`Invalid headers. Required: ${REQUIRED_HEADERS.join(', ')}. Found: ${headers.join(', ')}`);
    }
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) continue;
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase()] = values[index];
      });
      data.push(row);
    }
    
    return data;
  };

  const parseXLSX = (buffer: ArrayBuffer): any[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      throw new Error('File must contain at least a header and one data row');
    }
    
    const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
    
    if (!validateHeaders(headers)) {
      throw new Error(`Invalid headers. Required: ${REQUIRED_HEADERS.join(', ')}. Found: ${headers.join(', ')}`);
    }
    
    const data = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = jsonData[i][index];
      });
      if (Object.values(row).some(v => v !== undefined && v !== null && v !== '')) {
        data.push(row);
      }
    }
    
    return data;
  };

  const validateAndTransformData = (rawData: any[]): PreviewPosition[] => {
    const errors: string[] = [];
    const validData: PreviewPosition[] = [];
    
    rawData.forEach((row, index) => {
      const rowNum = index + 2; // +2 because index starts at 0 and we skip header
      
      // Validate ticker
      if (!row.ticker || typeof row.ticker !== 'string' || !row.ticker.trim()) {
        errors.push(`Row ${rowNum}: Invalid ticker`);
        return;
      }
      
      // Validate quantity
      const qty = Number(row.qty);
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Row ${rowNum}: Invalid quantity (must be positive number)`);
        return;
      }
      
      // Validate average cost
      const avgCost = Number(row.avg_cost);
      if (isNaN(avgCost) || avgCost <= 0) {
        errors.push(`Row ${rowNum}: Invalid average cost (must be positive number)`);
        return;
      }
      
      // Validate date
      const dateStr = String(row.as_of_date).trim();
      if (!dateStr) {
        errors.push(`Row ${rowNum}: Missing as_of_date`);
        return;
      }
      
      // Try to parse date
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

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus({ type: null, message: '' });
    
    try {
      let rawData: any[];
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        rawData = parseCSV(text);
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        rawData = parseXLSX(buffer);
      } else {
        throw new Error('Unsupported file format. Please upload CSV or XLSX files only.');
      }
      
      const validatedData = validateAndTransformData(rawData);
      
      onFileUpload(validatedData);
      setUploadStatus({
        type: 'success',
        message: `Successfully processed ${validatedData.length} positions from ${file.name}`
      });
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to process file'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
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

      {/* Required Headers Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-2">Required Headers:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {REQUIRED_HEADERS.map(header => (
                <div key={header} className="flex items-center gap-1">
                  <code className="bg-background px-1.5 py-0.5 rounded text-xs">
                    {header}
                  </code>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Headers are case-insensitive. Date format: YYYY-MM-DD or MM/DD/YYYY
            </p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {uploadStatus.type && (
        <Alert variant={uploadStatus.type === 'error' ? 'destructive' : 'default'}>
          {uploadStatus.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription className="whitespace-pre-line">
            {uploadStatus.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}