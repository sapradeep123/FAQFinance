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
exports.AdminLogs = AdminLogs;
const react_1 = __importStar(require("react"));
const useAdminStore_1 = require("../../../stores/useAdminStore");
const card_1 = require("../../../components/ui/card");
const button_1 = require("../../../components/ui/button");
const input_1 = require("../../../components/ui/input");
const select_1 = require("../../../components/ui/select");
const badge_1 = require("../../../components/ui/badge");
const skeleton_1 = require("../../../components/ui/skeleton");
const scroll_area_1 = require("../../../components/ui/scroll-area");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
function AdminLogs() {
    const logs = (0, useAdminStore_1.useAdminLogs)();
    const { isLoadingLogs } = (0, useAdminStore_1.useAdminLoadingStates)();
    const { loadLogs, addLog } = (0, useAdminStore_1.useAdminActions)();
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [levelFilter, setLevelFilter] = (0, react_1.useState)('all');
    const [actionFilter, setActionFilter] = (0, react_1.useState)('all');
    const [autoRefresh, setAutoRefresh] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => {
                loadLogs();
            }, 30000);
        }
        return () => {
            if (interval)
                clearInterval(interval);
        };
    }, [autoRefresh, loadLogs]);
    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const logTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - logTime.getTime()) / 1000);
        if (diffInSeconds < 60)
            return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600)
            return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400)
            return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };
    const getLevelIcon = (level) => {
        switch (level) {
            case 'info':
                return <lucide_react_1.Info className="h-4 w-4 text-blue-600"/>;
            case 'warning':
                return <lucide_react_1.AlertCircle className="h-4 w-4 text-yellow-600"/>;
            case 'error':
                return <lucide_react_1.XCircle className="h-4 w-4 text-red-600"/>;
            default:
                return <lucide_react_1.Info className="h-4 w-4 text-gray-600"/>;
        }
    };
    const getLevelColor = (level) => {
        switch (level) {
            case 'info':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'error':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    const handleRefresh = async () => {
        try {
            await loadLogs();
            sonner_1.toast.success('Logs refreshed successfully');
        }
        catch (error) {
            sonner_1.toast.error('Failed to refresh logs');
        }
    };
    const handleExport = () => {
        if (!logs || logs.length === 0) {
            sonner_1.toast.error('No logs to export');
            return;
        }
        const csvContent = [
            'Timestamp,Level,Action,User,IP Address,Details',
            ...filteredLogs.map(log => `"${log.timestamp}","${log.level}","${log.action}","${log.userId || 'System'}","${log.ipAddress || 'N/A'}","${log.details.replace(/"/g, '""')}"`)
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `admin-logs-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        sonner_1.toast.success('Logs exported successfully');
    };
    const filteredLogs = logs?.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
        const matchesAction = actionFilter === 'all' || log.action === actionFilter;
        return matchesSearch && matchesLevel && matchesAction;
    }) || [];
    const uniqueActions = [...new Set(logs?.map(log => log.action) || [])];
    if (isLoadingLogs) {
        return (<card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.FileText className="h-5 w-5"/>
            System Logs
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <skeleton_1.Skeleton className="h-10 flex-1"/>
              <skeleton_1.Skeleton className="h-10 w-32"/>
              <skeleton_1.Skeleton className="h-10 w-32"/>
            </div>
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (<skeleton_1.Skeleton key={i} className="h-16 w-full"/>))}
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.FileText className="h-5 w-5"/>
          System Logs
          <badge_1.Badge variant="secondary" className="ml-auto">
            {filteredLogs.length} entries
          </badge_1.Badge>
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <input_1.Input placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
            </div>
            <select_1.Select value={levelFilter} onValueChange={(value) => setLevelFilter(value)}>
              <select_1.SelectTrigger className="w-full sm:w-32">
                <lucide_react_1.Filter className="h-4 w-4 mr-2"/>
                <select_1.SelectValue />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">All Levels</select_1.SelectItem>
                <select_1.SelectItem value="info">Info</select_1.SelectItem>
                <select_1.SelectItem value="warning">Warning</select_1.SelectItem>
                <select_1.SelectItem value="error">Error</select_1.SelectItem>
              </select_1.SelectContent>
            </select_1.Select>
            <select_1.Select value={actionFilter} onValueChange={setActionFilter}>
              <select_1.SelectTrigger className="w-full sm:w-40">
                <select_1.SelectValue placeholder="All Actions"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">All Actions</select_1.SelectItem>
                {uniqueActions.map(action => (<select_1.SelectItem key={action} value={action}>{action}</select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
            <div className="flex gap-2">
              <button_1.Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-2">
                <lucide_react_1.RefreshCw className="h-4 w-4"/>
                Refresh
              </button_1.Button>
              <button_1.Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-2">
                <lucide_react_1.Download className="h-4 w-4"/>
                Export
              </button_1.Button>
            </div>
          </div>

          
          <div className="flex items-center gap-2">
            <input type="checkbox" id="autoRefresh" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded"/>
            <label htmlFor="autoRefresh" className="text-sm text-muted-foreground">
              Auto-refresh every 30 seconds
            </label>
          </div>

          
          <scroll_area_1.ScrollArea className="h-[600px] border rounded-lg">
            <div className="p-4 space-y-3">
              {filteredLogs.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                  No logs found matching your criteria
                </div>) : (filteredLogs.map((log) => (<div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <badge_1.Badge className={getLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </badge_1.Badge>
                        <span className="font-medium text-sm">{log.action}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {getTimeAgo(log.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {log.details}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatTimestamp(log.timestamp)}</span>
                        {log.userId && (<span>User: {log.userId}</span>)}
                        {log.ipAddress && (<span>IP: {log.ipAddress}</span>)}
                      </div>
                    </div>
                  </div>)))}
            </div>
          </scroll_area_1.ScrollArea>

          
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div>
              Showing {filteredLogs.length} of {logs?.length || 0} log entries
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <lucide_react_1.Info className="h-3 w-3 text-blue-600"/>
                Info: {logs?.filter(l => l.level === 'info').length || 0}
              </span>
              <span className="flex items-center gap-1">
                <lucide_react_1.AlertCircle className="h-3 w-3 text-yellow-600"/>
                Warning: {logs?.filter(l => l.level === 'warning').length || 0}
              </span>
              <span className="flex items-center gap-1">
                <lucide_react_1.XCircle className="h-3 w-3 text-red-600"/>
                Error: {logs?.filter(l => l.level === 'error').length || 0}
              </span>
            </div>
          </div>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
//# sourceMappingURL=AdminLogs.js.map