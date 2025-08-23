import React from 'react';
import { useAdminMetrics, useAdminLoadingStates } from '../../../stores/useAdminStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Users, UserCheck, Activity, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';

interface ProviderMetric {
  name: string;
  hits: number;
  avgLatency: number;
  errorCount: number;
  status: 'healthy' | 'warning' | 'error';
}

// Mock provider metrics
const mockProviderMetrics: ProviderMetric[] = [
  {
    name: 'Yahoo Finance',
    hits: 1247,
    avgLatency: 145,
    errorCount: 3,
    status: 'healthy'
  },
  {
    name: 'Google Finance',
    hits: 892,
    avgLatency: 203,
    errorCount: 8,
    status: 'warning'
  },
  {
    name: 'Fallback',
    hits: 156,
    avgLatency: 89,
    errorCount: 0,
    status: 'healthy'
  }
];

export function AdminKpis() {
  const metrics = useAdminMetrics();
  const { isLoadingMetrics } = useAdminLoadingStates();

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalHits = mockProviderMetrics.reduce((sum, provider) => sum + provider.hits, 0);
  const avgLatency = Math.round(
    mockProviderMetrics.reduce((sum, provider) => sum + provider.avgLatency * provider.hits, 0) / totalHits
  );
  const totalErrors = mockProviderMetrics.reduce((sum, provider) => sum + provider.errorCount, 0);

  if (isLoadingMetrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics?.users.totalUsers || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics?.users.activeUsers || 0)} active
            </p>
          </CardContent>
        </Card>

        {/* Active Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(metrics?.users.newUsersToday || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              New users today
            </p>
          </CardContent>
        </Card>

        {/* Total API Hits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Hits Today</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(totalHits)}</div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </CardContent>
        </Card>

        {/* Average Latency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{avgLatency}ms</div>
            <p className="text-xs text-muted-foreground">
              Weighted average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* System Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.system.uptime || '0d 0h 0m'}</div>
            <p className="text-xs text-muted-foreground">
              Since last restart
            </p>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.system.memoryUsage?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-muted-foreground">
              System memory
            </p>
          </CardContent>
        </Card>

        {/* CPU Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Activity className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.system.cpuUsage?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-muted-foreground">
              Current load
            </p>
          </CardContent>
        </Card>

        {/* Total Errors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Count</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatNumber(totalErrors)}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            API Provider Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockProviderMetrics.map((provider) => (
              <div key={provider.name} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{provider.name}</h4>
                  <Badge className={getStatusColor(provider.status)}>
                    {provider.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Hits</div>
                    <div className="font-semibold">{formatNumber(provider.hits)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Latency</div>
                    <div className="font-semibold">{provider.avgLatency}ms</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Errors</div>
                    <div className={`font-semibold ${provider.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {provider.errorCount}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(provider.hits / totalHits) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {((provider.hits / totalHits) * 100).toFixed(1)}% of total traffic
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}