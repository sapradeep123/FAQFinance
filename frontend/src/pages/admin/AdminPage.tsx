import React, { useEffect } from 'react';
import { useAdminStore, useAdminActions, useAdminLoadingStates, useAdminErrors } from '../../stores/useAdminStore';
import { AdminKpis } from './components/AdminKpis';
import { AdminUsersTable } from './components/AdminUsersTable';
import { AdminApiConfigForm } from './components/AdminApiConfigForm';
import { AdminLogs } from './components/AdminLogs';
import { AdminFAQManagement } from './components/AdminFAQManagement';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export function AdminPage() {
  const { refreshAll, clearErrors } = useAdminActions();
  const { isLoadingMetrics, isLoadingUsers, isLoadingApiConfigs, isLoadingLogs } = useAdminLoadingStates();
  const { metricsError, usersError, apiConfigsError, logsError } = useAdminErrors();
  const { toast } = useToast();

  const isLoading = isLoadingMetrics || isLoadingUsers || isLoadingApiConfigs || isLoadingLogs;
  const hasErrors = metricsError || usersError || apiConfigsError || logsError;

  useEffect(() => {
    // Load all admin data on mount
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
    } catch (error) {
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">System management and configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasErrors && (
              <Button
                variant="outline"
                onClick={handleClearErrors}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Clear Errors
              </Button>
            )}
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Alerts */}
        {hasErrors && (
          <div className="space-y-2">
            {metricsError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Metrics Error:</strong> {metricsError}
                </AlertDescription>
              </Alert>
            )}
            {usersError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Users Error:</strong> {usersError}
                </AlertDescription>
              </Alert>
            )}
            {apiConfigsError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>API Config Error:</strong> {apiConfigsError}
                </AlertDescription>
              </Alert>
            )}
            {logsError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Logs Error:</strong> {logsError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* KPIs Section */}
        <AdminKpis />

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="api-config">API Config</TabsTrigger>
            <TabsTrigger value="faq-management">FAQ Mgmt</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminUsersTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminApiConfigForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq-management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>FAQ Management</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminFAQManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminLogs />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}