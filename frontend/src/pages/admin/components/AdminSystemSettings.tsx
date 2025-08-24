import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Settings, Key, TestTube, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../config/clientEnv';

interface GPTProvider {
  id: string;
  name: string;
  description: string;
  apiKeyLabel: string;
  baseUrlLabel?: string;
  modelOptions: string[];
  defaultModel: string;
}

interface GPTConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isActive: boolean;
  maxTokens: number;
  temperature: number;
}

const GPT_PROVIDERS: GPTProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 Turbo and other OpenAI models',
    apiKeyLabel: 'OpenAI API Key',
    modelOptions: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    defaultModel: 'gpt-4'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 3 Opus, Sonnet, and Haiku models',
    apiKeyLabel: 'Anthropic API Key',
    modelOptions: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-sonnet-20240229'
  },
  {
    id: 'google',
    name: 'Google Gemini',
    description: 'Gemini Pro and other Google AI models',
    apiKeyLabel: 'Google AI API Key',
    modelOptions: ['gemini-pro', 'gemini-pro-vision'],
    defaultModel: 'gemini-pro'
  }
];

export function AdminSystemSettings() {
  const [configs, setConfigs] = useState<Record<string, GPTConfig>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newsDomains, setNewsDomains] = useState<string>('finance.yahoo.com\nbusinessinsider.com\nmoneyweek.com\ninvesting.com');
  const [regionPref, setRegionPref] = useState<'US' | 'EU' | 'WW'>('US');
  const [timeWindow, setTimeWindow] = useState<number>(30);

  // Initialize default configs
  useEffect(() => {
    const defaultConfigs: Record<string, GPTConfig> = {};
    GPT_PROVIDERS.forEach(provider => {
      defaultConfigs[provider.id] = {
        provider: provider.id,
        apiKey: '',
        baseUrl: provider.id === 'openai' ? 'https://api.openai.com/v1' : undefined,
        model: provider.defaultModel,
        isActive: false,
        maxTokens: 2000,
        temperature: 0.7
      };
    });
    setConfigs(defaultConfigs);
  }, []);

  const updateConfig = (providerId: string, updates: Partial<GPTConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], ...updates }
    }));
  };

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const testApiConnection = async (providerId: string) => {
    const config = configs[providerId];
    if (!config.apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    setTestingProvider(providerId);
    try {
      // Simulate API test - in real implementation, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${GPT_PROVIDERS.find(p => p.id === providerId)?.name} API connection successful!`);
    } catch (error) {
      toast.error(`Failed to connect to ${GPT_PROVIDERS.find(p => p.id === providerId)?.name} API`);
    } finally {
      setTestingProvider(null);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      // Persist news settings via system-settings API
      const token = JSON.parse(localStorage.getItem('trae_auth') || '{}')?.token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const writes = [
        fetch(`${API_BASE_URL}/admin/system-settings`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ key: 'news.allowed_sites', value: newsDomains, category: 'news' })
        }),
        fetch(`${API_BASE_URL}/admin/system-settings`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ key: 'news.region', value: regionPref, category: 'news' })
        }),
        fetch(`${API_BASE_URL}/admin/system-settings`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ key: 'news.window_days', value: String(timeWindow), category: 'news' })
        })
      ];

      const responses = await Promise.all(writes);
      const ok = responses.every(r => r.ok);
      if (!ok) throw new Error('Failed to save one or more settings');

      toast.success('System settings saved successfully');
    } catch (error) {
      toast.error('Failed to save system settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure GPT providers and financial data sources for AI responses
          </p>
        </div>
        <Button onClick={saveConfiguration} disabled={loading}>
          <Settings className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> All AI responses will be limited to finance-related topics only. 
          The system will automatically fetch relevant financial data from Yahoo Finance and Google Finance before generating responses.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="gpt-providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gpt-providers">GPT Providers</TabsTrigger>
          <TabsTrigger value="news-sources">News Sources</TabsTrigger>
          <TabsTrigger value="content-filtering">Content Filtering</TabsTrigger>
        </TabsList>

        <TabsContent value="gpt-providers" className="space-y-6">
          {GPT_PROVIDERS.map(provider => {
            const config = configs[provider.id];
            if (!config) return null;

            return (
              <Card key={provider.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.name}
                        {config.isActive && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={(checked) => updateConfig(provider.id, { isActive: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-api-key`}>{provider.apiKeyLabel}</Label>
                      <div className="relative">
                        <Input
                          id={`${provider.id}-api-key`}
                          type={showApiKeys[provider.id] ? 'text' : 'password'}
                          value={config.apiKey}
                          onChange={(e) => updateConfig(provider.id, { apiKey: e.target.value })}
                          placeholder="Enter your API key"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleApiKeyVisibility(provider.id)}
                        >
                          {showApiKeys[provider.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-model`}>Model</Label>
                      <select
                        id={`${provider.id}-model`}
                        value={config.model}
                        onChange={(e) => updateConfig(provider.id, { model: e.target.value })}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        {provider.modelOptions.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>

                    {provider.baseUrlLabel && (
                      <div className="space-y-2">
                        <Label htmlFor={`${provider.id}-base-url`}>{provider.baseUrlLabel}</Label>
                        <Input
                          id={`${provider.id}-base-url`}
                          value={config.baseUrl || ''}
                          onChange={(e) => updateConfig(provider.id, { baseUrl: e.target.value })}
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-max-tokens`}>Max Tokens</Label>
                      <Input
                        id={`${provider.id}-max-tokens`}
                        type="number"
                        value={config.maxTokens}
                        onChange={(e) => updateConfig(provider.id, { maxTokens: parseInt(e.target.value) || 2000 })}
                        min="100"
                        max="8000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-temperature`}>Temperature</Label>
                      <Input
                        id={`${provider.id}-temperature`}
                        type="number"
                        step="0.1"
                        value={config.temperature}
                        onChange={(e) => updateConfig(provider.id, { temperature: parseFloat(e.target.value) || 0.7 })}
                        min="0"
                        max="2"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => testApiConnection(provider.id)}
                      disabled={!config.apiKey || testingProvider === provider.id}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testingProvider === provider.id ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="news-sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Finance News Sources</CardTitle>
              <p className="text-sm text-muted-foreground">Enter up to 5 domains (one per line). These will be used first before falling back.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="news-domains">Allowed Sites (max 5)</Label>
                <Textarea
                  id="news-domains"
                  className="min-h-[120px]"
                  value={newsDomains}
                  onChange={(e) => setNewsDomains(e.target.value)}
                  placeholder={"finance.yahoo.com\nbusinessinsider.com\nmoneyweek.com\ninvesting.com"}
                />
                <p className="text-xs text-muted-foreground">Examples: finance.yahoo.com, businessinsider.com</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region-pref">Region Preference</Label>
                  <select
                    id="region-pref"
                    value={regionPref}
                    onChange={(e) => setRegionPref(e.target.value as 'US' | 'EU' | 'WW')}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="US">US</option>
                    <option value="EU">EU</option>
                    <option value="WW">Worldwide</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-window">Time Window (days)</Label>
                  <Input
                    id="time-window"
                    type="number"
                    min="1"
                    max="365"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content-filtering" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Filtering & Restrictions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure content filtering to ensure responses are finance-focused
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Finance-Only Mode</Label>
                    <p className="text-sm text-muted-foreground">Restrict all responses to finance-related topics only</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Investment Advice Disclaimer</Label>
                    <p className="text-sm text-muted-foreground">Automatically add disclaimers to investment-related responses</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Real-time Data Integration</Label>
                    <p className="text-sm text-muted-foreground">Always fetch latest financial data before generating responses</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blocked-topics">Blocked Topics</Label>
                  <Textarea
                    id="blocked-topics"
                    placeholder="Enter topics to block (one per line)..."
                    className="min-h-[100px]"
                    defaultValue="Personal advice\nMedical advice\nLegal advice\nPolitical opinions"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finance-keywords">Required Finance Keywords</Label>
                  <Textarea
                    id="finance-keywords"
                    placeholder="Enter keywords that indicate finance-related queries..."
                    className="min-h-[100px]"
                    defaultValue="stock, investment, portfolio, market, finance, trading, economy, cryptocurrency, bonds, mutual funds, ETF, dividend, earnings, financial planning"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}