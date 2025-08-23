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
exports.AdminPage = AdminPage;
const react_1 = __importStar(require("react"));
const useAdminStore_1 = require("../../stores/useAdminStore");
const AdminKpis_1 = require("./components/AdminKpis");
const AdminUsersTable_1 = require("./components/AdminUsersTable");
const AdminApiConfigForm_1 = require("./components/AdminApiConfigForm");
const AdminLogs_1 = require("./components/AdminLogs");
const button_1 = require("../../components/ui/button");
const card_1 = require("../../components/ui/card");
const tabs_1 = require("../../components/ui/tabs");
const alert_1 = require("../../components/ui/alert");
const lucide_react_1 = require("lucide-react");
const use_toast_1 = require("../../hooks/use-toast");
function AdminPage() {
    const { refreshAll, clearErrors } = (0, useAdminStore_1.useAdminActions)();
    const { isLoadingMetrics, isLoadingUsers, isLoadingApiConfigs, isLoadingLogs } = (0, useAdminStore_1.useAdminLoadingStates)();
    const { metricsError, usersError, apiConfigsError, logsError } = (0, useAdminStore_1.useAdminErrors)();
    const { toast } = (0, use_toast_1.useToast)();
    const isLoading = isLoadingMetrics || isLoadingUsers || isLoadingApiConfigs || isLoadingLogs;
    const hasErrors = metricsError || usersError || apiConfigsError || logsError;
    (0, react_1.useEffect)(() => {
        refreshAll().catch((error) => {
            toast({
                title: 'Failed to load admin data',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                variant: 'destructive'
            });
        });
    }, [refreshAll, toast]);
    const handleRefresh = async () => {
        try {
            await refreshAll();
            toast({
                title: 'Data refreshed',
                description: 'All admin data has been updated successfully'
            });
        }
        catch (error) {
            toast({
                title: 'Refresh failed',
                description: error instanceof Error ? error.message : 'Failed to refresh data',
                variant: 'destructive'
            });
        }
    };
    const handleClearErrors = () => {
        clearErrors();
        toast({
            title: 'Errors cleared',
            description: 'All error messages have been dismissed'
        });
    };
    return (<div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <lucide_react_1.Shield className="h-8 w-8 text-blue-600"/>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">System management and configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasErrors && (<button_1.Button variant="outline" onClick={handleClearErrors} className="text-red-600 border-red-200 hover:bg-red-50">
                <lucide_react_1.AlertTriangle className="h-4 w-4 mr-2"/>
                Clear Errors
              </button_1.Button>)}
            <button_1.Button onClick={handleRefresh} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <lucide_react_1.RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}/>
              Refresh
            </button_1.Button>
          </div>
        </div>

        
        {hasErrors && (<div className="space-y-2">
            {metricsError && (<alert_1.Alert className="border-red-200 bg-red-50">
                <lucide_react_1.AlertTriangle className="h-4 w-4 text-red-600"/>
                <alert_1.AlertDescription className="text-red-800">
                  <strong>Metrics Error:</strong> {metricsError}
                </alert_1.AlertDescription>
              </alert_1.Alert>)}
            {usersError && (<alert_1.Alert className="border-red-200 bg-red-50">
                <lucide_react_1.AlertTriangle className="h-4 w-4 text-red-600"/>
                <alert_1.AlertDescription className="text-red-800">
                  <strong>Users Error:</strong> {usersError}
                </alert_1.AlertDescription>
              </alert_1.Alert>)}
            {apiConfigsError && (<alert_1.Alert className="border-red-200 bg-red-50">
                <lucide_react_1.AlertTriangle className="h-4 w-4 text-red-600"/>
                <alert_1.AlertDescription className="text-red-800">
                  <strong>API Config Error:</strong> {apiConfigsError}
                </alert_1.AlertDescription>
              </alert_1.Alert>)}
            {logsError && (<alert_1.Alert className="border-red-200 bg-red-50">
                <lucide_react_1.AlertTriangle className="h-4 w-4 text-red-600"/>
                <alert_1.AlertDescription className="text-red-800">
                  <strong>Logs Error:</strong> {logsError}
                </alert_1.AlertDescription>
              </alert_1.Alert>)}
          </div>)}

        
        <AdminKpis_1.AdminKpis />

        
        <tabs_1.Tabs defaultValue="users" className="space-y-6">
          <tabs_1.TabsList className="grid w-full grid-cols-3">
            <tabs_1.TabsTrigger value="users">User Management</tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="api-config">API Configuration</tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="logs">System Logs</tabs_1.TabsTrigger>
          </tabs_1.TabsList>

          <tabs_1.TabsContent value="users" className="space-y-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>User Management</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <AdminUsersTable_1.AdminUsersTable />
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>

          <tabs_1.TabsContent value="api-config" className="space-y-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>API Configuration</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <AdminApiConfigForm_1.AdminApiConfigForm />
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>

          <tabs_1.TabsContent value="logs" className="space-y-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>System Logs</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <AdminLogs_1.AdminLogs />
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>
        </tabs_1.Tabs>
      </div>
    </div>);
}
//# sourceMappingURL=AdminPage.js.map