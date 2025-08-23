import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Percent, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { AllocationDonut } from './AllocationDonut';

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

interface AllocationData {
  ticker: string;
  value: number;
  percentage: number;
  color: string;
}

export function InsightsPanel({ positions, isLoading = false }: InsightsPanelProps) {
  // Calculate KPIs
  const totalCostBasis = positions.reduce((sum, pos) => sum + (pos.qty * pos.avg_cost), 0);
  const totalMarketValue = positions.reduce((sum, pos) => sum + (pos.market_value || pos.qty * pos.avg_cost), 0);
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);
  const totalUnrealizedPnLPercent = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;

  // Calculate allocations for top 5 positions
  const allocations: AllocationData[] = positions
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
        '#3b82f6', // blue-500
        '#10b981', // emerald-500
        '#f59e0b', // amber-500
        '#ef4444', // red-500
        '#8b5cf6'  // violet-500
      ][index] || '#6b7280' // gray-500
    }));

  // Check for concentration warnings (>60%)
  const concentrationWarnings = allocations.filter(alloc => alloc.percentage > 60);
  const hasHighConcentration = concentrationWarnings.length > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  if (positions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No positions to analyze</p>
          <p className="text-sm">Upload portfolio data to see insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMarketValue)}</div>
            <p className="text-xs text-muted-foreground">
              Cost basis: {formatCurrency(totalCostBasis)}
            </p>
          </CardContent>
        </Card>

        {/* Unrealized P&L */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            {totalUnrealizedPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(totalUnrealizedPnL)}
            </div>
            <p className={`text-xs ${
              totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercent(totalUnrealizedPnLPercent)}
            </p>
          </CardContent>
        </Card>

        {/* Position Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">
              {allocations.length} in top 5
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Concentration Warnings */}
      {hasHighConcentration && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>High Concentration Warning:</strong> The following positions exceed 60% allocation:
            <div className="mt-2 space-x-2">
              {concentrationWarnings.map(warning => (
                <Badge key={warning.ticker} variant="outline" className="text-orange-700 border-orange-300">
                  {warning.ticker}: {formatPercent(warning.percentage)}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Allocation Donut Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Top 5 Allocations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AllocationDonut 
            data={allocations} 
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Allocation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allocations.map((alloc, index) => (
              <div key={alloc.ticker} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: alloc.color }}
                  />
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
              </div>
            ))}
            {positions.length > 5 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-gray-300" />
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}