import React from 'react';
import { Trash2, Undo2, DollarSign, Calendar, Hash } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

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

export function PreviewTable({ data, onDeleteRow, onUndoRow }: PreviewTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const activeRows = data.filter(row => !row.isDeleted);
  const deletedRows = data.filter(row => row.isDeleted);
  const totalValue = activeRows.reduce((sum, row) => sum + (row.qty * row.avg_cost), 0);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data to preview
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{activeRows.length}</div>
          <div className="text-xs text-muted-foreground">Active Positions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
          <div className="text-xs text-muted-foreground">Total Value</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{deletedRows.length}</div>
          <div className="text-xs text-muted-foreground">Deleted Rows</div>
        </div>
      </div>

      {/* Active Positions Table */}
      {activeRows.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Active Positions ({activeRows.length})
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Ticker</TableHead>
                  <TableHead className="text-right w-24">Quantity</TableHead>
                  <TableHead className="text-right w-28">Avg Cost</TableHead>
                  <TableHead className="text-right w-28">Total Value</TableHead>
                  <TableHead className="w-28">As of Date</TableHead>
                  <TableHead className="w-20 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRows.map((row) => {
                  const totalRowValue = row.qty * row.avg_cost;
                  return (
                    <TableRow key={row.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge variant="outline" className="font-mono font-semibold">
                          {row.ticker}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.qty)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.avg_cost)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(totalRowValue)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(row.as_of_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteRow(row.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Deleted Positions */}
      {deletedRows.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <Trash2 className="h-5 w-5" />
            Deleted Positions ({deletedRows.length})
          </h3>
          <div className="border rounded-lg overflow-hidden opacity-60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Ticker</TableHead>
                  <TableHead className="text-right w-24">Quantity</TableHead>
                  <TableHead className="text-right w-28">Avg Cost</TableHead>
                  <TableHead className="text-right w-28">Total Value</TableHead>
                  <TableHead className="w-28">As of Date</TableHead>
                  <TableHead className="w-20 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedRows.map((row) => {
                  const totalRowValue = row.qty * row.avg_cost;
                  return (
                    <TableRow key={row.id} className="bg-destructive/5">
                      <TableCell>
                        <Badge variant="secondary" className="font-mono font-semibold line-through">
                          {row.ticker}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono line-through">
                        {formatNumber(row.qty)}
                      </TableCell>
                      <TableCell className="text-right font-mono line-through">
                        {formatCurrency(row.avg_cost)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold line-through">
                        {formatCurrency(totalRowValue)}
                      </TableCell>
                      <TableCell className="text-sm line-through">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(row.as_of_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUndoRow(row.id)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* No Active Positions Message */}
      {activeRows.length === 0 && deletedRows.length > 0 && (
        <div className="text-center py-8">
          <div className="text-muted-foreground">
            All positions have been deleted. Use the undo button to restore them.
          </div>
        </div>
      )}
    </div>
  );
}