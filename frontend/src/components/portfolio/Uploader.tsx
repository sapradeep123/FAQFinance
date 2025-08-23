import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { portfolioService } from '../../services/portfolioService';

interface PreviewPosition {
  id: string;
  ticker: string;
  qty: number;
  avg_cost: number;
  as_of_date: string;
}

interface UploaderProps {
  portfolioId: string;
  onFileUpload: (result: {
    uploaded_positions: number;
    skipped_positions: number;
    errors: string[];
    upload_id: string;
  }) => void;
}

const SUPPORTED_HEADERS = [
  'ticker', 'symbol', 'stock',
  'name', 'company', 'description', 
  'quantity', 'shares', 'units',
  'averageprice', 'price', 'cost', 'average price',
  'sector', 'industry',
  'exchange', 'market'
];

export function Uploader({ portfolioId, onFileUpload }: UploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const validateFile = (file: File): void => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }
    
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only CSV and Excel files are allowed.');
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus({ type: null, message: '' });
    
    try {
      validateFile(file);
      
      const result = await portfolioService.uploadPortfolioFile(portfolioId, file);
      
      onFileUpload(result);
      
      const successMessage = `Successfully uploaded ${result.uploaded_positions} positions from ${file.name}`;
      const warningMessage = result.skipped_positions > 0 
        ? `\n${result.skipped_positions} positions were skipped.`
        : '';
      const errorMessage = result.errors.length > 0
        ? `\n\nErrors:\n${result.errors.slice(0, 3).join('\n')}${result.errors.length > 3 ? `\n... and ${result.errors.length - 3} more errors` : ''}`
        : '';
      
      setUploadStatus({
        type: result.errors.length > 0 ? 'error' : 'success',
        message: successMessage + warningMessage + errorMessage
      });
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload file'
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

      {/* Supported Headers Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-2">Supported Headers (flexible mapping):</p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div>
                <strong>Ticker:</strong> ticker, symbol, stock
              </div>
              <div>
                <strong>Company:</strong> name, company, description
              </div>
              <div>
                <strong>Quantity:</strong> quantity, shares, units
              </div>
              <div>
                <strong>Price:</strong> averageprice, price, cost, "average price"
              </div>
              <div>
                <strong>Optional:</strong> sector, industry, exchange, market
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Headers are case-insensitive and flexible. The system will automatically map common variations.
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