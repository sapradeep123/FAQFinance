"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminKpis = AdminKpis;
const react_1 = __importDefault(require("react"));
const useAdminStore_1 = require("../../../stores/useAdminStore");
const card_1 = require("../../../components/ui/card");
const badge_1 = require("../../../components/ui/badge");
const lucide_react_1 = require("lucide-react");
const skeleton_1 = require("../../../components/ui/skeleton");
const mockProviderMetrics = [
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
function AdminKpis() {
    const metrics = (0, useAdminStore_1.useAdminMetrics)();
    const { isLoadingMetrics } = (0, useAdminStore_1.useAdminLoadingStates)();
    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(num);
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
            case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'error': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    const totalHits = mockProviderMetrics.reduce((sum, provider) => sum + provider.hits, 0);
    const avgLatency = Math.round(mockProviderMetrics.reduce((sum, provider) => sum + provider.avgLatency * provider.hits, 0) / totalHits);
    const totalErrors = mockProviderMetrics.reduce((sum, provider) => sum + provider.errorCount, 0);
    if (isLoadingMetrics) {
        return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (<card_1.Card key={i}>
            <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <skeleton_1.Skeleton className="h-4 w-24"/>
              <skeleton_1.Skeleton className="h-4 w-4"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <skeleton_1.Skeleton className="h-8 w-16 mb-2"/>
              <skeleton_1.Skeleton className="h-3 w-32"/>
            </card_1.CardContent>
          </card_1.Card>))}
      </div>);
    }
    return (<div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Total Users</card_1.CardTitle>
            <lucide_react_1.Users className="h-4 w-4 text-muted-foreground"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics?.users.totalUsers || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics?.users.activeUsers || 0)} active
            </p>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Active Today</card_1.CardTitle>
            <lucide_react_1.UserCheck className="h-4 w-4 text-green-600"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(metrics?.users.newUsersToday || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              New users today
            </p>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">API Hits Today</card_1.CardTitle>
            <lucide_react_1.Activity className="h-4 w-4 text-blue-600"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(totalHits)}</div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Avg Latency</card_1.CardTitle>
            <lucide_react_1.Clock className="h-4 w-4 text-orange-600"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold text-orange-600">{avgLatency}ms</div>
            <p className="text-xs text-muted-foreground">
              Weighted average
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">System Uptime</card_1.CardTitle>
            <lucide_react_1.TrendingUp className="h-4 w-4 text-green-600"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{metrics?.system.uptime || '0d 0h 0m'}</div>
            <p className="text-xs text-muted-foreground">
              Since last restart
            </p>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Memory Usage</card_1.CardTitle>
            <lucide_react_1.Activity className="h-4 w-4 text-purple-600"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{metrics?.system.memoryUsage?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-muted-foreground">
              System memory
            </p>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">CPU Usage</card_1.CardTitle>
            <lucide_react_1.Activity className="h-4 w-4 text-indigo-600"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{metrics?.system.cpuUsage?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-muted-foreground">
              Current load
            </p>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Error Count</card_1.CardTitle>
            <lucide_react_1.AlertCircle className="h-4 w-4 text-red-600"/>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold text-red-600">{formatNumber(totalErrors)}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.Activity className="h-5 w-5"/>
            API Provider Performance
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockProviderMetrics.map((provider) => (<div key={provider.name} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{provider.name}</h4>
                  <badge_1.Badge className={getStatusColor(provider.status)}>
                    {provider.status}
                  </badge_1.Badge>
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
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(provider.hits / totalHits) * 100}%` }}/>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {((provider.hits / totalHits) * 100).toFixed(1)}% of total traffic
                </div>
              </div>))}
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
//# sourceMappingURL=AdminKpis.js.map