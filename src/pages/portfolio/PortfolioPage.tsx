import React, { useEffect, useState } from 'react';
import { usePortfolioStore } from '../../stores/usePortfolioStore';
import { Uploader } from '../../components/portfolio/Uploader';
import { PreviewTable } from '../../components/portfolio/PreviewTable';
import { InsightsPanel } from '../../components/portfolio/InsightsPanel';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Plus, Download } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface PreviewPosition {
  id: string;
  ticker: string;
  qty: number;
  avg_cost: number;
  as_of_date: string;
  isDeleted?: boolean;
}

export default function PortfolioPage() {
  const {
    portfolios,
    activePortfolioId,
    positions,
    insights,
    isLoading,
    error,
    loadPortfolios,
    createPortfolio,
    setActivePortfolio,
    loadPositions,
    refreshMarketData,
    exportPositions,
    clearError
  } = usePortfolioStore();

  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<PreviewPosition[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  useEffect(() => {
    if (activePortfolioId) {
      loadPositions();
    }
  }, [activePortfolioId, loadPositions]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    
    try {
      await createPortfolio(newPortfolioName.trim());
      setNewPortfolioName('');
      setShowCreateDialog(false);
      toast({
        title: 'Success',
        description: 'Portfolio created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create portfolio',
        variant: 'destructive'
      });
    }
  };

  const handleFileUpload = (data: PreviewPosition[]) => {
    setPreviewData(data);
  };

  const handleDeletePreviewRow = (id: string) => {
    setPreviewData(prev => 
      prev.map(row => 
        row.id === id ? { ...row, isDeleted: true } : row
      )
    );
  };

  const handleUndoPreviewRow = (id: string) => {
    setPreviewData(prev => 
      prev.map(row => 
        row.id === id ? { ...row, isDeleted: false } : row
      )
    );
  };

  const handleSavePositions = async () => {
    if (!activePortfolioId) {
      toast({
        title: 'Error',
        description: 'Please select a portfolio first',
        variant: 'destructive'
      });
      return;
    }

    const validData = previewData.filter(row => !row.isDeleted);
    if (validData.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid positions to save',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Convert preview data to CSV format for import
      const csvContent = [
        'ticker,qty,avg_cost,as_of_date',
        ...validData.map(row => `${row.ticker},${row.qty},${row.avg_cost},${row.as_of_date}`)
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'positions.csv', { type: 'text/csv' });
      
      await usePortfolioStore.getState().importPositions(file);
      setPreviewData([]);
      
      toast({
        title: 'Success',
        description: `Saved ${validData.length} positions successfully`
      });
      
      // Refresh market data after import
      await refreshMarketData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save positions',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'ticker,qty,avg_cost,as_of_date\nAAPL,100,150.00,2024-01-15\nGOOGL,50,2800.00,2024-01-15';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload, manage, and analyze your investment portfolios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Template
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Portfolio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Portfolio name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePortfolio()}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePortfolio}
                    disabled={!newPortfolioName.trim()}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Portfolio Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Active Portfolio:</label>
        <Select
          value={activePortfolioId || ''}
          onValueChange={setActivePortfolio}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a portfolio" />
          </SelectTrigger>
          <SelectContent>
            {portfolios.map((portfolio) => (
              <SelectItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activePortfolioId && (
          <Button
            variant="outline"
            onClick={exportPositions}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      {activePortfolioId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload and Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Uploader */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Positions</h2>
              <Uploader onFileUpload={handleFileUpload} />
            </div>

            {/* Preview Table */}
            {previewData.length > 0 && (
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Preview Data</h2>
                  <Button
                    onClick={handleSavePositions}
                    disabled={isSaving || previewData.every(row => row.isDeleted)}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? 'Saving...' : 'Save Positions'}
                  </Button>
                </div>
                <PreviewTable
                  data={previewData}
                  onDeleteRow={handleDeletePreviewRow}
                  onUndoRow={handleUndoPreviewRow}
                />
              </div>
            )}
          </div>

          {/* Right Column - Insights */}
          <div className="space-y-6">
            <InsightsPanel
              insights={insights}
              positions={positions}
              isLoading={isLoading}
              onRefresh={refreshMarketData}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            Please select or create a portfolio to get started
          </p>
        </div>
      )}
    </div>
  );
}