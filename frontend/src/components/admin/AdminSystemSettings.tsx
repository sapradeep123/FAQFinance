import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GptConfig {
  id: number;
  provider: 'openai' | 'anthropic' | 'google';
  api_key: string;
  model: string;
  is_active: boolean;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

interface SystemSetting {
  key: string;
  value: string;
  category: string;
  updated_at: string;
}

const AdminSystemSettings: React.FC = () => {
  const [gptConfigs, setGptConfigs] = useState<GptConfig[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKeys, setShowApiKeys] = useState<{[key: number]: boolean}>({});
  const { toast } = useToast();

  const [newConfig, setNewConfig] = useState({
    provider: 'openai' as const,
    api_key: '',
    model: '',
    max_tokens: 2000,
    temperature: 0.7
  });

  const providerModels = {
    openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    anthropic: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    google: ['gemini-pro', 'gemini-pro-vision']
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gptResponse, settingsResponse] = await Promise.all([
        fetch('/api/admin/gpt-configs'),
        fetch('/api/admin/system-settings')
      ]);

      if (gptResponse.ok) {
        const gptData = await gptResponse.json();
        setGptConfigs(gptData.data || []);
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSystemSettings(settingsData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGptConfig = async () => {
    try {
      const response = await fetch('/api/admin/gpt-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'GPT configuration created successfully'
        });
        setNewConfig({
          provider: 'openai',
          api_key: '',
          model: '',
          max_tokens: 2000,
          temperature: 0.7
        });
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create configuration');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create configuration',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateGptConfig = async (id: number, updates: Partial<GptConfig>) => {
    try {
      const response = await fetch(`/api/admin/gpt-configs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Configuration updated successfully'
        });
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update configuration');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update configuration',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteGptConfig = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/gpt-configs/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Configuration deleted successfully'
        });
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete configuration');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete configuration',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateSystemSetting = async (key: string, value: string) => {
    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'System setting updated successfully'
        });
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update setting');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update setting',
        variant: 'destructive'
      });
    }
  };

  const toggleApiKeyVisibility = (configId: number) => {
    setShowApiKeys(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }));
  };

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
    return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading system settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground">
          Configure GPT API integrations and system-wide settings
        </p>
      </div>

      <Tabs defaultValue="gpt-configs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gpt-configs">GPT Configurations</TabsTrigger>
          <TabsTrigger value="system-settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="gpt-configs" className="space-y-4">
          {/* Add New GPT Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New GPT Configuration
              </CardTitle>
              <CardDescription>
                Configure API keys and settings for GPT providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={newConfig.provider}
                    onValueChange={(value: 'openai' | 'anthropic' | 'google') => 
                      setNewConfig(prev => ({ ...prev, provider: value, model: '' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={newConfig.model}
                    onValueChange={(value) => setNewConfig(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerModels[newConfig.provider].map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={newConfig.api_key}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, api_key: e.target.value }))}
                    placeholder="Enter API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    min="100"
                    max="8000"
                    value={newConfig.max_tokens}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={newConfig.temperature}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleCreateGptConfig}
                disabled={!newConfig.provider || !newConfig.model || !newConfig.api_key}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            </CardContent>
          </Card>

          {/* Existing GPT Configurations */}
          <div className="space-y-4">
            {gptConfigs.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="capitalize">{config.provider}</CardTitle>
                      <Badge variant={config.is_active ? "default" : "secondary"}>
                        {config.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(checked) => 
                          handleUpdateGptConfig(config.id, { is_active: checked })
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGptConfig(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{config.model}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showApiKeys[config.id] ? "text" : "password"}
                          value={showApiKeys[config.id] ? config.api_key : maskApiKey(config.api_key)}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleApiKeyVisibility(config.id)}
                        >
                          {showApiKeys[config.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input value={config.model} readOnly />
                    </div>

                    <div className="space-y-2">
                      <Label>Max Tokens</Label>
                      <Input
                        type="number"
                        value={config.max_tokens}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 100 && value <= 8000) {
                            handleUpdateGptConfig(config.id, { max_tokens: value });
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Temperature</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={config.temperature}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value >= 0 && value <= 2) {
                            handleUpdateGptConfig(config.id, { temperature: value });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(config.created_at).toLocaleString()}
                    {config.updated_at !== config.created_at && (
                      <> • Updated: {new Date(config.updated_at).toLocaleString()}</>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {gptConfigs.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No GPT configurations found. Add one above to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system-settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Manage system-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['finance', 'ai', 'general'].map(category => {
                  const categorySettings = systemSettings.filter(s => s.category === category);
                  if (categorySettings.length === 0) return null;

                  return (
                    <div key={category} className="space-y-4">
                      <h3 className="text-lg font-semibold capitalize">{category} Settings</h3>
                      <div className="grid gap-4">
                        {categorySettings.map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">
                                {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Last updated: {new Date(setting.updated_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {setting.value === 'true' || setting.value === 'false' ? (
                                <Switch
                                  checked={setting.value === 'true'}
                                  onCheckedChange={(checked) => 
                                    handleUpdateSystemSetting(setting.key, checked.toString())
                                  }
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={setting.value}
                                    onChange={(e) => {
                                      // Update on blur or Enter key
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value !== setting.value) {
                                        handleUpdateSystemSetting(setting.key, e.target.value);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const target = e.target as HTMLInputElement;
                                        if (target.value !== setting.value) {
                                          handleUpdateSystemSetting(setting.key, target.value);
                                        }
                                      }
                                    }}
                                    className="w-32"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {systemSettings.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No system settings found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSystemSettings;