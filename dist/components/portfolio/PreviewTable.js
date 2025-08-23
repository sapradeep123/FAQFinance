"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewTable = PreviewTable;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const button_1 = require("../ui/button");
const badge_1 = require("../ui/badge");
const table_1 = require("../ui/table");
function PreviewTable({ data, onDeleteRow, onUndoRow }) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    };
    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        catch {
            return dateStr;
        }
    };
    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(value);
    };
    const activeRows = data.filter(row => !row.isDeleted);
    const deletedRows = data.filter(row => row.isDeleted);
    const totalValue = activeRows.reduce((sum, row) => sum + (row.qty * row.avg_cost), 0);
    if (data.length === 0) {
        return (<div className="text-center py-8 text-muted-foreground">
        No data to preview
      </div>);
    }
    return (<div className="space-y-4">
      
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

      
      {activeRows.length > 0 && (<div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <lucide_react_1.Hash className="h-5 w-5"/>
            Active Positions ({activeRows.length})
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead className="w-20">Ticker</table_1.TableHead>
                  <table_1.TableHead className="text-right w-24">Quantity</table_1.TableHead>
                  <table_1.TableHead className="text-right w-28">Avg Cost</table_1.TableHead>
                  <table_1.TableHead className="text-right w-28">Total Value</table_1.TableHead>
                  <table_1.TableHead className="w-28">As of Date</table_1.TableHead>
                  <table_1.TableHead className="w-20 text-center">Action</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {activeRows.map((row) => {
                const totalRowValue = row.qty * row.avg_cost;
                return (<table_1.TableRow key={row.id} className="hover:bg-muted/50">
                      <table_1.TableCell>
                        <badge_1.Badge variant="outline" className="font-mono font-semibold">
                          {row.ticker}
                        </badge_1.Badge>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right font-mono">
                        {formatNumber(row.qty)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right font-mono">
                        {formatCurrency(row.avg_cost)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(totalRowValue)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <lucide_react_1.Calendar className="h-3 w-3 text-muted-foreground"/>
                          {formatDate(row.as_of_date)}
                        </div>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-center">
                        <button_1.Button variant="ghost" size="sm" onClick={() => onDeleteRow(row.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <lucide_react_1.Trash2 className="h-4 w-4"/>
                        </button_1.Button>
                      </table_1.TableCell>
                    </table_1.TableRow>);
            })}
              </table_1.TableBody>
            </table_1.Table>
          </div>
        </div>)}

      
      {deletedRows.length > 0 && (<div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <lucide_react_1.Trash2 className="h-5 w-5"/>
            Deleted Positions ({deletedRows.length})
          </h3>
          <div className="border rounded-lg overflow-hidden opacity-60">
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead className="w-20">Ticker</table_1.TableHead>
                  <table_1.TableHead className="text-right w-24">Quantity</table_1.TableHead>
                  <table_1.TableHead className="text-right w-28">Avg Cost</table_1.TableHead>
                  <table_1.TableHead className="text-right w-28">Total Value</table_1.TableHead>
                  <table_1.TableHead className="w-28">As of Date</table_1.TableHead>
                  <table_1.TableHead className="w-20 text-center">Action</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {deletedRows.map((row) => {
                const totalRowValue = row.qty * row.avg_cost;
                return (<table_1.TableRow key={row.id} className="bg-destructive/5">
                      <table_1.TableCell>
                        <badge_1.Badge variant="secondary" className="font-mono font-semibold line-through">
                          {row.ticker}
                        </badge_1.Badge>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right font-mono line-through">
                        {formatNumber(row.qty)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right font-mono line-through">
                        {formatCurrency(row.avg_cost)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right font-mono font-semibold line-through">
                        {formatCurrency(totalRowValue)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-sm line-through">
                        <div className="flex items-center gap-1">
                          <lucide_react_1.Calendar className="h-3 w-3 text-muted-foreground"/>
                          {formatDate(row.as_of_date)}
                        </div>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-center">
                        <button_1.Button variant="ghost" size="sm" onClick={() => onUndoRow(row.id)} className="h-8 w-8 p-0 text-green-600 hover:text-green-600 hover:bg-green-600/10">
                          <lucide_react_1.Undo2 className="h-4 w-4"/>
                        </button_1.Button>
                      </table_1.TableCell>
                    </table_1.TableRow>);
            })}
              </table_1.TableBody>
            </table_1.Table>
          </div>
        </div>)}

      
      {activeRows.length === 0 && deletedRows.length > 0 && (<div className="text-center py-8">
          <div className="text-muted-foreground">
            All positions have been deleted. Use the undo button to restore them.
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=PreviewTable.js.map