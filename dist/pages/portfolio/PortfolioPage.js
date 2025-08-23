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
exports.default = PortfolioPage;
const react_1 = __importStar(require("react"));
const usePortfolioStore_1 = require("../../stores/usePortfolioStore");
const Uploader_1 = require("../../components/portfolio/Uploader");
const PreviewTable_1 = require("../../components/portfolio/PreviewTable");
const InsightsPanel_1 = require("../../components/portfolio/InsightsPanel");
const button_1 = require("../../components/ui/button");
const select_1 = require("../../components/ui/select");
const input_1 = require("../../components/ui/input");
const dialog_1 = require("../../components/ui/dialog");
const lucide_react_1 = require("lucide-react");
const use_toast_1 = require("../../hooks/use-toast");
function PortfolioPage() {
    const { portfolios, activePortfolioId, positions, insights, isLoading, error, loadPortfolios, createPortfolio, setActivePortfolio, loadPositions, refreshMarketData, exportPositions, clearError } = (0, usePortfolioStore_1.usePortfolioStore)();
    const { toast } = (0, use_toast_1.useToast)();
    const [previewData, setPreviewData] = (0, react_1.useState)([]);
    const [showCreateDialog, setShowCreateDialog] = (0, react_1.useState)(false);
    const [newPortfolioName, setNewPortfolioName] = (0, react_1.useState)('');
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        loadPortfolios();
    }, [loadPortfolios]);
    (0, react_1.useEffect)(() => {
        if (activePortfolioId) {
            loadPositions();
        }
    }, [activePortfolioId, loadPositions]);
    (0, react_1.useEffect)(() => {
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
        if (!newPortfolioName.trim())
            return;
        try {
            await createPortfolio(newPortfolioName.trim());
            setNewPortfolioName('');
            setShowCreateDialog(false);
            toast({
                title: 'Success',
                description: 'Portfolio created successfully'
            });
        }
        catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create portfolio',
                variant: 'destructive'
            });
        }
    };
    const handleFileUpload = (data) => {
        setPreviewData(data);
    };
    const handleDeletePreviewRow = (id) => {
        setPreviewData(prev => prev.map(row => row.id === id ? { ...row, isDeleted: true } : row));
    };
    const handleUndoPreviewRow = (id) => {
        setPreviewData(prev => prev.map(row => row.id === id ? { ...row, isDeleted: false } : row));
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
            const csvContent = [
                'ticker,qty,avg_cost,as_of_date',
                ...validData.map(row => `${row.ticker},${row.qty},${row.avg_cost},${row.as_of_date}`)
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const file = new File([blob], 'positions.csv', { type: 'text/csv' });
            await usePortfolioStore_1.usePortfolioStore.getState().importPositions(file);
            setPreviewData([]);
            toast({
                title: 'Success',
                description: `Saved ${validData.length} positions successfully`
            });
            await refreshMarketData();
        }
        catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save positions',
                variant: 'destructive'
            });
        }
        finally {
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
    return (<div className="container mx-auto p-6 space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload, manage, and analyze your investment portfolios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button_1.Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
            <lucide_react_1.Download className="h-4 w-4"/>
            Template
          </button_1.Button>
          <dialog_1.Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <dialog_1.DialogTrigger asChild>
              <button_1.Button className="flex items-center gap-2">
                <lucide_react_1.Plus className="h-4 w-4"/>
                New Portfolio
              </button_1.Button>
            </dialog_1.DialogTrigger>
            <dialog_1.DialogContent>
              <dialog_1.DialogHeader>
                <dialog_1.DialogTitle>Create New Portfolio</dialog_1.DialogTitle>
              </dialog_1.DialogHeader>
              <div className="space-y-4 pt-4">
                <input_1.Input placeholder="Portfolio name" value={newPortfolioName} onChange={(e) => setNewPortfolioName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreatePortfolio()}/>
                <div className="flex justify-end gap-2">
                  <button_1.Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </button_1.Button>
                  <button_1.Button onClick={handleCreatePortfolio} disabled={!newPortfolioName.trim()}>
                    Create
                  </button_1.Button>
                </div>
              </div>
            </dialog_1.DialogContent>
          </dialog_1.Dialog>
        </div>
      </div>

      
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Active Portfolio:</label>
        <select_1.Select value={activePortfolioId || ''} onValueChange={setActivePortfolio}>
          <select_1.SelectTrigger className="w-64">
            <select_1.SelectValue placeholder="Select a portfolio"/>
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            {portfolios.map((portfolio) => (<select_1.SelectItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </select_1.SelectItem>))}
          </select_1.SelectContent>
        </select_1.Select>
        {activePortfolioId && (<button_1.Button variant="outline" onClick={exportPositions} className="flex items-center gap-2">
            <lucide_react_1.Download className="h-4 w-4"/>
            Export
          </button_1.Button>)}
      </div>

      {activePortfolioId ? (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Positions</h2>
              <Uploader_1.Uploader onFileUpload={handleFileUpload}/>
            </div>

            
            {previewData.length > 0 && (<div className="bg-card rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Preview Data</h2>
                  <button_1.Button onClick={handleSavePositions} disabled={isSaving || previewData.every(row => row.isDeleted)} className="flex items-center gap-2">
                    {isSaving ? 'Saving...' : 'Save Positions'}
                  </button_1.Button>
                </div>
                <PreviewTable_1.PreviewTable data={previewData} onDeleteRow={handleDeletePreviewRow} onUndoRow={handleUndoPreviewRow}/>
              </div>)}
          </div>

          
          <div className="space-y-6">
            <InsightsPanel_1.InsightsPanel insights={insights} positions={positions} isLoading={isLoading} onRefresh={refreshMarketData}/>
          </div>
        </div>) : (<div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            Please select or create a portfolio to get started
          </p>
        </div>)}
    </div>);
}
//# sourceMappingURL=PortfolioPage.js.map