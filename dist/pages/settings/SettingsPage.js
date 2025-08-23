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
exports.SettingsPage = SettingsPage;
const react_1 = __importStar(require("react"));
const card_1 = require("../../components/ui/card");
const button_1 = require("../../components/ui/button");
const label_1 = require("../../components/ui/label");
const select_1 = require("../../components/ui/select");
const switch_1 = require("../../components/ui/switch");
const separator_1 = require("../../components/ui/separator");
const badge_1 = require("../../components/ui/badge");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const useAuthStore_1 = require("../../stores/useAuthStore");
const REGIONS = [
    { value: 'US', label: 'United States', flag: '🇺🇸' },
    { value: 'EU', label: 'European Union', flag: '🇪🇺' },
    { value: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'CA', label: 'Canada', flag: '🇨🇦' },
    { value: 'AU', label: 'Australia', flag: '🇦🇺' },
    { value: 'JP', label: 'Japan', flag: '🇯🇵' },
    { value: 'SG', label: 'Singapore', flag: '🇸🇬' },
    { value: 'HK', label: 'Hong Kong', flag: '🇭🇰' }
];
const CURRENCIES = [
    { value: 'USD', label: 'US Dollar', symbol: '$' },
    { value: 'EUR', label: 'Euro', symbol: '€' },
    { value: 'GBP', label: 'British Pound', symbol: '£' },
    { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
    { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
    { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
    { value: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
    { value: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$' }
];
const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' }
];
function SettingsPage() {
    const { user, updateProfile } = (0, useAuthStore_1.useAuthStore)();
    const [preferences, setPreferences] = (0, react_1.useState)({
        theme: 'system',
        defaultRegion: 'US',
        defaultCurrency: 'USD',
        language: 'en',
        notifications: {
            email: true,
            push: true,
            marketing: false
        }
    });
    const [hasChanges, setHasChanges] = (0, react_1.useState)(false);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
            try {
                const parsed = JSON.parse(savedPreferences);
                setPreferences(prev => ({ ...prev, ...parsed }));
            }
            catch (error) {
                console.error('Failed to parse saved preferences:', error);
            }
        }
        if (user?.profile) {
            setPreferences(prev => ({
                ...prev,
                defaultRegion: user.profile.region || prev.defaultRegion,
                defaultCurrency: user.profile.currency || prev.defaultCurrency,
                language: user.profile.language || prev.language
            }));
        }
    }, [user]);
    (0, react_1.useEffect)(() => {
        const root = document.documentElement;
        if (preferences.theme === 'dark') {
            root.classList.add('dark');
        }
        else if (preferences.theme === 'light') {
            root.classList.remove('dark');
        }
        else {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            if (mediaQuery.matches) {
                root.classList.add('dark');
            }
            else {
                root.classList.remove('dark');
            }
        }
    }, [preferences.theme]);
    const handlePreferenceChange = (key, value) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };
    const handleNotificationChange = (key, value) => {
        setPreferences(prev => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: value }
        }));
        setHasChanges(true);
    };
    const handleSave = async () => {
        setIsSaving(true);
        try {
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
            if (user) {
                await updateProfile({
                    region: preferences.defaultRegion,
                    currency: preferences.defaultCurrency,
                    language: preferences.language
                });
            }
            setHasChanges(false);
            sonner_1.toast.success('Settings saved successfully');
        }
        catch (error) {
            console.error('Failed to save settings:', error);
            sonner_1.toast.error('Failed to save settings');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleReset = () => {
        const defaultPreferences = {
            theme: 'system',
            defaultRegion: user?.profile?.region || 'US',
            defaultCurrency: user?.profile?.currency || 'USD',
            language: user?.profile?.language || 'en',
            notifications: {
                email: true,
                push: true,
                marketing: false
            }
        };
        setPreferences(defaultPreferences);
        setHasChanges(true);
    };
    const getThemeIcon = () => {
        switch (preferences.theme) {
            case 'dark': return <lucide_react_1.Moon className="h-4 w-4"/>;
            case 'light': return <lucide_react_1.Sun className="h-4 w-4"/>;
            default: return <lucide_react_1.Palette className="h-4 w-4"/>;
        }
    };
    return (<div className="container mx-auto py-6 space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <lucide_react_1.Settings className="h-8 w-8"/>
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize your experience and preferences
          </p>
        </div>
        {hasChanges && (<badge_1.Badge variant="outline" className="text-orange-600 border-orange-200">
            Unsaved changes
          </badge_1.Badge>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.Palette className="h-5 w-5"/>
              Appearance
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="theme">Theme</label_1.Label>
              <select_1.Select value={preferences.theme} onValueChange={(value) => handlePreferenceChange('theme', value)}>
                <select_1.SelectTrigger>
                  <div className="flex items-center gap-2">
                    {getThemeIcon()}
                    <select_1.SelectValue />
                  </div>
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <lucide_react_1.Palette className="h-4 w-4"/>
                      System
                    </div>
                  </select_1.SelectItem>
                  <select_1.SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <lucide_react_1.Sun className="h-4 w-4"/>
                      Light
                    </div>
                  </select_1.SelectItem>
                  <select_1.SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <lucide_react_1.Moon className="h-4 w-4"/>
                      Dark
                    </div>
                  </select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme or follow system settings
              </p>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="language">Language</label_1.Label>
              <select_1.Select value={preferences.language} onValueChange={(value) => handlePreferenceChange('language', value)}>
                <select_1.SelectTrigger>
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {LANGUAGES.map(lang => (<select_1.SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.Globe className="h-5 w-5"/>
              Regional Preferences
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="region">Default Region</label_1.Label>
              <select_1.Select value={preferences.defaultRegion} onValueChange={(value) => handlePreferenceChange('defaultRegion', value)}>
                <select_1.SelectTrigger>
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {REGIONS.map(region => (<select_1.SelectItem key={region.value} value={region.value}>
                      <div className="flex items-center gap-2">
                        <span>{region.flag}</span>
                        {region.label}
                      </div>
                    </select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="currency">Default Currency</label_1.Label>
              <select_1.Select value={preferences.defaultCurrency} onValueChange={(value) => handlePreferenceChange('defaultCurrency', value)}>
                <select_1.SelectTrigger>
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {CURRENCIES.map(currency => (<select_1.SelectItem key={currency.value} value={currency.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{currency.symbol}</span>
                        {currency.label} ({currency.value})
                      </div>
                    </select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <lucide_react_1.User className="h-4 w-4"/>
                <span className="font-medium">Profile Integration</span>
              </div>
              <p>
                These settings will be saved to your profile and used across all devices.
              </p>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.Settings className="h-5 w-5"/>
              Notifications
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label_1.Label htmlFor="email-notifications">Email Notifications</label_1.Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <switch_1.Switch id="email-notifications" checked={preferences.notifications.email} onCheckedChange={(checked) => handleNotificationChange('email', checked)}/>
            </div>

            <separator_1.Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label_1.Label htmlFor="push-notifications">Push Notifications</label_1.Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser notifications
                </p>
              </div>
              <switch_1.Switch id="push-notifications" checked={preferences.notifications.push} onCheckedChange={(checked) => handleNotificationChange('push', checked)}/>
            </div>

            <separator_1.Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label_1.Label htmlFor="marketing-notifications">Marketing Communications</label_1.Label>
                <p className="text-sm text-muted-foreground">
                  Receive product updates and offers
                </p>
              </div>
              <switch_1.Switch id="marketing-notifications" checked={preferences.notifications.marketing} onCheckedChange={(checked) => handleNotificationChange('marketing', checked)}/>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.User className="h-5 w-5"/>
              Account Information
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            {user ? (<div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Username</span>
                  <span className="text-sm text-muted-foreground">{user.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Email</span>
                  <span className="text-sm text-muted-foreground">{user.email || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Role</span>
                  <badge_1.Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user.role}
                  </badge_1.Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Member since</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>) : (<p className="text-sm text-muted-foreground">Not logged in</p>)}
          </card_1.CardContent>
        </card_1.Card>
      </div>

      
      <div className="flex justify-between items-center pt-6 border-t">
        <button_1.Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </button_1.Button>
        <div className="flex gap-2">
          <button_1.Button onClick={handleSave} disabled={!hasChanges || isSaving} className="flex items-center gap-2">
            <lucide_react_1.Save className="h-4 w-4"/>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button_1.Button>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=SettingsPage.js.map