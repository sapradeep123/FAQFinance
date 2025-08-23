"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsPanel = InsightsPanel;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const card_1 = require("../ui/card");
const badge_1 = require("../ui/badge");
const alert_1 = require("../ui/alert");
const AllocationDonut_1 = require("./AllocationDonut");
function InsightsPanel({ positions, isLoading = false }) {
    const totalCostBasis = positions.reduce((sum, pos) => sum + (pos.qty * pos.avg_cost), 0);
    const totalMarketValue = positions.reduce((sum, pos) => sum + (pos.market_value || pos.qty * pos.avg_cost), 0);
    const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);
    const totalUnrealizedPnLPercent = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
    const allocations = positions
        .map(pos => ({
        ticker: pos.ticker,
        value: pos.market_value || pos.qty * pos.avg_cost,
        percentage: totalMarketValue > 0 ? ((pos.market_value || pos.qty * pos.avg_cost) / totalMarketValue) * 100 : 0,
        color: ''
    }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((item, index) => ({
        ...item,
        color: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6'
        ][index] || '#6b7280'
    }));
    const concentrationWarnings = allocations.filter(alloc => alloc.percentage > 60);
    const hasHighConcentration = concentrationWarnings.length > 0;
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };
    const formatPercent = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    };
    if (positions.length === 0) {
        return (<div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <lucide_react_1.PieChart className="h-12 w-12 mx-auto mb-4 opacity-50"/>
          <p>No positions to analyze</p>
          <p className="text-sm">Upload portfolio data to see insights</p>
        </div>
      </div>);
    }
    return (<div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Total Value</card_1.CardTitle>
            <lucide_react_1.DollarSign className="h-4 w-4 text-muted-foreground"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMarketValue)}</div>
            <p className="text-xs text-muted-foreground">
              Cost basis: {formatCurrency(totalCostBasis)}
            </p>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Unrealized P&L</card_1.CardTitle>
            {totalUnrealizedPnL >= 0 ? (<lucide_react_1.TrendingUp className="h-4 w-4 text-green-600"/>) : (<lucide_react_1.TrendingDown className="h-4 w-4 text-red-600"/>)}
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className={`text-2xl font-bold ${totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalUnrealizedPnL)}
            </div>
            <p className={`text-xs ${totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(totalUnrealizedPnLPercent)}
            </p>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Positions</card_1.CardTitle>
            <lucide_react_1.Percent className="h-4 w-4 text-muted-foreground"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">
              {allocations.length} in top 5
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      
      {hasHighConcentration && (<alert_1.Alert className="border-orange-200 bg-orange-50">
          <lucide_react_1.AlertTriangle className="h-4 w-4 text-orange-600"/>
          <alert_1.AlertDescription className="text-orange-800">
            <strong>High Concentration Warning:</strong> The following positions exceed 60% allocation:
            <div className="mt-2 space-x-2">
              {concentrationWarnings.map(warning => (<badge_1.Badge key={warning.ticker} variant="outline" className="text-orange-700 border-orange-300">
                  {warning.ticker}: {formatPercent(warning.percentage)}
                </badge_1.Badge>))}
            </div>
          </alert_1.AlertDescription>
        </alert_1.Alert>)}

      
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.PieChart className="h-5 w-5"/>
            Top 5 Allocations
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <AllocationDonut_1.AllocationDonut data={allocations} isLoading={isLoading}/>
        </card_1.CardContent>
      </card_1.Card>

      
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Allocation Breakdown</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-3">
            {allocations.map((alloc, index) => (<div key={alloc.ticker} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: alloc.color }}/>
                  <div>
                    <div className="font-medium">{alloc.ticker}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(alloc.value)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatPercent(alloc.percentage)}</div>
                  <div className="text-sm text-muted-foreground">#{index + 1}</div>
                </div>
              </div>))}
            {positions.length > 5 && (<div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-gray-300"/>
                  <div>
                    <div className="font-medium text-muted-foreground">Others</div>
                    <div className="text-sm text-muted-foreground">
                      {positions.length - 5} positions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-muted-foreground">
                    {formatPercent(100 - allocations.reduce((sum, alloc) => sum + alloc.percentage, 0))}
                  </div>
                </div>
              </div>)}
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
//# sourceMappingURL=InsightsPanel.js.map