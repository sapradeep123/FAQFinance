import React, { useState, useEffect } from 'react';
import { useAdminApiConfigs, useAdminLoadingStates, useAdminActions } from '../../../stores/useAdminStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { Settings, Eye, EyeOff, Save, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ApiConfig } from '../../../services/adminService';
import { toast } from 'sonner';

export function AdminApiConfigForm() {
  const apiConfigs = useAdminApiConfigs();
  const { isLoadingApiConfigs } = useAdminLoadingStates();
  const { setApiConfigs } = useAdminActions();
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [formData, setFormData] = useState<ApiConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: 'success' | 'error' | 'pending' }>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (apiConfigs && apiConfigs.length > 0 && !selectedProvider) {
      setSelectedProvider(apiConfigs[0].providerName);
    }
  }, [apiConfigs, selectedProvider]);

  useEffect(() => {
    if (selectedProvider && apiConfigs) {
      const config = apiConfigs.find(c => c.providerName === selectedProvider);
      if (config) {
        setFormData({ ...config });
        setHasChanges(false);
      }
    }
  }, [selectedProvider, apiConfigs]);

  const handleInputChange = (field: keyof ApiConfig, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
      setHasChanges(true);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const handleSave = async () => {
    if (!formData || !apiConfigs) return;
    
    try {
      const updatedConfigs = apiConfigs.map(config => 
        config.providerName === formData.providerName ? formData : config
      );
      await setApiConfigs(updatedConfigs);
      setHasChanges(false);
      toast.success(`${formData.providerName} configuration saved successfully`);
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const handleTest = async (providerName: string) => {
    setIsTesting(true);
    setTestResults({ ...testResults, [providerName]: 'pending' });
    
    // Mock test with random delay and result
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate
      setTestResults({ ...testResults, [providerName]: success ? 'success' : 'error' });
      setIsTesting(false);
      
      if (success) {
        toast.success(`${providerName} connection test successful`);
      } else {
        toast.error(`${providerName} connection test failed`);
      }
    }, 1500 + Math.random() * 1000);
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTestResultIcon = (result: 'success' | 'error' | 'pending' | undefined) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default:
        return null;
    }
  };

  if (isLoadingApiConfigs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-24" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!apiConfigs || apiConfigs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No API configurations found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          API Configuration
          {hasChanges && (
            <Badge variant="outline" className="ml-auto text-orange-600 border-orange-200">
              Unsaved changes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Provider Tabs */}
          <div className="flex flex-wrap gap-2">
            {apiConfigs.map((config) => {
              const testResult = testResults[config.providerName];
              return (
                <Button
                  key={config.providerName}
                  variant={selectedProvider === config.providerName ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedProvider(config.providerName)}
                  className="flex items-center gap-2"
                >
                  {config.providerName}
                  <Badge className={getStatusColor(config.enabled)}>
                    {config.enabled ? 'ON' : 'OFF'}
                  </Badge>
                  {getTestResultIcon(testResult)}
                </Button>
              );
            })}
          </div>

          {/* Configuration Form */}
          {formData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Provider Name */}
                <div className="space-y-2">
                  <Label htmlFor="providerName">Provider Name</Label>
                  <Input
                    id="providerName"
                    value={formData.providerName}
                    disabled
                    className="bg-muted"
                  />
                </div>

                {/* Enabled Toggle */}
                <div className="space-y-2">
                  <Label htmlFor="enabled">Status</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      id="enabled"
                      checked={formData.enabled}
                      onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                    />
                    <span className={`text-sm font-medium ${
                      formData.enabled ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {formData.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Base URL */}
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    value={formData.baseUrl}
                    onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                    placeholder="https://api.example.com"
                  />
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={showApiKey ? formData.apiKey : maskApiKey(formData.apiKey)}
                      onChange={(e) => handleInputChange('apiKey', e.target.value)}
                      placeholder="Enter API key"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Model/Variant */}
                <div className="space-y-2">
                  <Label htmlFor="modelOrVariant">Model/Variant</Label>
                  <Input
                    id="modelOrVariant"
                    value={formData.modelOrVariant || ''}
                    onChange={(e) => handleInputChange('modelOrVariant', e.target.value)}
                    placeholder="gpt-4, claude-3, etc."
                  />
                </div>

                {/* Rate Limit */}
                <div className="space-y-2">
                  <Label htmlFor="rateLimit">Rate Limit (req/min)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={formData.rateLimit || ''}
                    onChange={(e) => handleInputChange('rateLimit', parseInt(e.target.value) || 0)}
                    placeholder="60"
                    min="0"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional configuration notes..."
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Configuration
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleTest(formData.providerName)}
                    disabled={isTesting || !formData.enabled}
                    className="flex items-center gap-2"
                  >
                    <TestTube className="h-4 w-4" />
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
                
                {/* Last Updated */}
                <div className="text-sm text-muted-foreground">
                  Last updated: {new Date(formData.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}