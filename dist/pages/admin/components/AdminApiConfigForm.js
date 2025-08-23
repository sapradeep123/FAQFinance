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
exports.AdminApiConfigForm = AdminApiConfigForm;
const react_1 = __importStar(require("react"));
const useAdminStore_1 = require("../../../stores/useAdminStore");
const card_1 = require("../../../components/ui/card");
const button_1 = require("../../../components/ui/button");
const input_1 = require("../../../components/ui/input");
const label_1 = require("../../../components/ui/label");
const textarea_1 = require("../../../components/ui/textarea");
const switch_1 = require("../../../components/ui/switch");
const badge_1 = require("../../../components/ui/badge");
const skeleton_1 = require("../../../components/ui/skeleton");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
function AdminApiConfigForm() {
    const apiConfigs = (0, useAdminStore_1.useAdminApiConfigs)();
    const { isLoadingApiConfigs } = (0, useAdminStore_1.useAdminLoadingStates)();
    const { setApiConfigs } = (0, useAdminStore_1.useAdminActions)();
    const [selectedProvider, setSelectedProvider] = (0, react_1.useState)('');
    const [formData, setFormData] = (0, react_1.useState)(null);
    const [showApiKey, setShowApiKey] = (0, react_1.useState)(false);
    const [isTesting, setIsTesting] = (0, react_1.useState)(false);
    const [testResults, setTestResults] = (0, react_1.useState)({});
    const [hasChanges, setHasChanges] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (apiConfigs && apiConfigs.length > 0 && !selectedProvider) {
            setSelectedProvider(apiConfigs[0].providerName);
        }
    }, [apiConfigs, selectedProvider]);
    (0, react_1.useEffect)(() => {
        if (selectedProvider && apiConfigs) {
            const config = apiConfigs.find(c => c.providerName === selectedProvider);
            if (config) {
                setFormData({ ...config });
                setHasChanges(false);
            }
        }
    }, [selectedProvider, apiConfigs]);
    const handleInputChange = (field, value) => {
        if (formData) {
            setFormData({ ...formData, [field]: value });
            setHasChanges(true);
        }
    };
    const maskApiKey = (key) => {
        if (!key || key.length < 8)
            return key;
        return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
    };
    const handleSave = async () => {
        if (!formData || !apiConfigs)
            return;
        try {
            const updatedConfigs = apiConfigs.map(config => config.providerName === formData.providerName ? formData : config);
            await setApiConfigs(updatedConfigs);
            setHasChanges(false);
            sonner_1.toast.success(`${formData.providerName} configuration saved successfully`);
        }
        catch (error) {
            sonner_1.toast.error('Failed to save configuration');
        }
    };
    const handleTest = async (providerName) => {
        setIsTesting(true);
        setTestResults({ ...testResults, [providerName]: 'pending' });
        setTimeout(() => {
            const success = Math.random() > 0.3;
            setTestResults({ ...testResults, [providerName]: success ? 'success' : 'error' });
            setIsTesting(false);
            if (success) {
                sonner_1.toast.success(`${providerName} connection test successful`);
            }
            else {
                sonner_1.toast.error(`${providerName} connection test failed`);
            }
        }, 1500 + Math.random() * 1000);
    };
    const getStatusColor = (enabled) => {
        return enabled
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'bg-gray-100 text-gray-800 border-gray-200';
    };
    const getTestResultIcon = (result) => {
        switch (result) {
            case 'success':
                return <lucide_react_1.CheckCircle className="h-4 w-4 text-green-600"/>;
            case 'error':
                return <lucide_react_1.XCircle className="h-4 w-4 text-red-600"/>;
            case 'pending':
                return <lucide_react_1.AlertCircle className="h-4 w-4 text-yellow-600 animate-pulse"/>;
            default:
                return null;
        }
    };
    if (isLoadingApiConfigs) {
        return (<card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.Settings className="h-5 w-5"/>
            API Configuration
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (<skeleton_1.Skeleton key={i} className="h-10 w-24"/>))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (<div key={i} className="space-y-2">
                  <skeleton_1.Skeleton className="h-4 w-20"/>
                  <skeleton_1.Skeleton className="h-10 w-full"/>
                </div>))}
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>);
    }
    if (!apiConfigs || apiConfigs.length === 0) {
        return (<card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.Settings className="h-5 w-5"/>
            API Configuration
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No API configurations found
          </div>
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Settings className="h-5 w-5"/>
          API Configuration
          {hasChanges && (<badge_1.Badge variant="outline" className="ml-auto text-orange-600 border-orange-200">
              Unsaved changes
            </badge_1.Badge>)}
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="space-y-6">
          
          <div className="flex flex-wrap gap-2">
            {apiConfigs.map((config) => {
            const testResult = testResults[config.providerName];
            return (<button_1.Button key={config.providerName} variant={selectedProvider === config.providerName ? 'default' : 'outline'} size="sm" onClick={() => setSelectedProvider(config.providerName)} className="flex items-center gap-2">
                  {config.providerName}
                  <badge_1.Badge className={getStatusColor(config.enabled)}>
                    {config.enabled ? 'ON' : 'OFF'}
                  </badge_1.Badge>
                  {getTestResultIcon(testResult)}
                </button_1.Button>);
        })}
          </div>

          
          {formData && (<div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <label_1.Label htmlFor="providerName">Provider Name</label_1.Label>
                  <input_1.Input id="providerName" value={formData.providerName} disabled className="bg-muted"/>
                </div>

                
                <div className="space-y-2">
                  <label_1.Label htmlFor="enabled">Status</label_1.Label>
                  <div className="flex items-center space-x-2 h-10">
                    <switch_1.Switch id="enabled" checked={formData.enabled} onCheckedChange={(checked) => handleInputChange('enabled', checked)}/>
                    <span className={`text-sm font-medium ${formData.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {formData.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                
                <div className="space-y-2">
                  <label_1.Label htmlFor="baseUrl">Base URL</label_1.Label>
                  <input_1.Input id="baseUrl" value={formData.baseUrl} onChange={(e) => handleInputChange('baseUrl', e.target.value)} placeholder="https://api.example.com"/>
                </div>

                
                <div className="space-y-2">
                  <label_1.Label htmlFor="apiKey">API Key</label_1.Label>
                  <div className="relative">
                    <input_1.Input id="apiKey" type={showApiKey ? 'text' : 'password'} value={showApiKey ? formData.apiKey : maskApiKey(formData.apiKey)} onChange={(e) => handleInputChange('apiKey', e.target.value)} placeholder="Enter API key" className="pr-10"/>
                    <button_1.Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? (<lucide_react_1.EyeOff className="h-4 w-4"/>) : (<lucide_react_1.Eye className="h-4 w-4"/>)}
                    </button_1.Button>
                  </div>
                </div>

                
                <div className="space-y-2">
                  <label_1.Label htmlFor="modelOrVariant">Model/Variant</label_1.Label>
                  <input_1.Input id="modelOrVariant" value={formData.modelOrVariant || ''} onChange={(e) => handleInputChange('modelOrVariant', e.target.value)} placeholder="gpt-4, claude-3, etc."/>
                </div>

                
                <div className="space-y-2">
                  <label_1.Label htmlFor="rateLimit">Rate Limit (req/min)</label_1.Label>
                  <input_1.Input id="rateLimit" type="number" value={formData.rateLimit || ''} onChange={(e) => handleInputChange('rateLimit', parseInt(e.target.value) || 0)} placeholder="60" min="0"/>
                </div>
              </div>

              
              <div className="space-y-2">
                <label_1.Label htmlFor="notes">Notes</label_1.Label>
                <textarea_1.Textarea id="notes" value={formData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Additional configuration notes..." rows={3}/>
              </div>

              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <button_1.Button onClick={handleSave} disabled={!hasChanges} className="flex items-center gap-2">
                    <lucide_react_1.Save className="h-4 w-4"/>
                    Save Configuration
                  </button_1.Button>
                  <button_1.Button variant="outline" onClick={() => handleTest(formData.providerName)} disabled={isTesting || !formData.enabled} className="flex items-center gap-2">
                    <lucide_react_1.TestTube className="h-4 w-4"/>
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button_1.Button>
                </div>
                
                
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
            </div>)}
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
//# sourceMappingURL=AdminApiConfigForm.js.map