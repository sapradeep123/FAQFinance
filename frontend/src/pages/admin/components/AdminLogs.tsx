import React, { useState, useEffect } from 'react';
import { useAdminLogs, useAdminLoadingStates, useAdminActions } from '../../../stores/useAdminStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { FileText, Search, Filter, RefreshCw, Download, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { LogEntry } from '../../../services/adminService';
import { toast } from 'sonner';

export function AdminLogs() {
  const logs = useAdminLogs();
  const { isLoadingLogs } = useAdminLoadingStates();
  const { loadLogs, addLog } = useAdminActions();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh logs every 30 seconds if enabled
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadLogs();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, loadLogs]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - logTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getLevelIcon = (level: 'info' | 'warning' | 'error') => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLevelColor = (level: 'info' | 'warning' | 'error') => {
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
      toast.success('Logs refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh logs');
    }
  };

  const handleExport = () => {
    if (!logs || logs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const csvContent = [
      'Timestamp,Level,Action,User,IP Address,Details',
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.level}","${log.action}","${log.userId || 'System'}","${log.ipAddress || 'N/A'}","${log.details.replace(/"/g, '""')}"`
      )
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
    
    toast.success('Logs exported successfully');
  };

  // Filter logs
  const filteredLogs = logs?.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesLevel && matchesAction;
  }) || [];

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs?.map(log => log.action) || [])];

  if (isLoadingLogs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            System Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          System Logs
          <Badge variant="secondary" className="ml-auto">
            {filteredLogs.length} entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={levelFilter} onValueChange={(value: 'all' | 'info' | 'warning' | 'error') => setLevelFilter(value)}>
              <SelectTrigger className="w-full sm:w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-muted-foreground">
              Auto-refresh every 30 seconds
            </label>
          </div>

          {/* Logs List */}
          <ScrollArea className="h-[600px] border rounded-lg">
            <div className="p-4 space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No logs found matching your criteria
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
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
                        {log.userId && (
                          <span>User: {log.userId}</span>
                        )}
                        {log.ipAddress && (
                          <span>IP: {log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div>
              Showing {filteredLogs.length} of {logs?.length || 0} log entries
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3 text-blue-600" />
                Info: {logs?.filter(l => l.level === 'info').length || 0}
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-yellow-600" />
                Warning: {logs?.filter(l => l.level === 'warning').length || 0}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                Error: {logs?.filter(l => l.level === 'error').length || 0}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}