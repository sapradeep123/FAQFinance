import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { Settings, Palette, Globe, DollarSign, User, Save, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/useAuthStore';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultRegion: string;
  defaultCurrency: string;
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
}

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

export function SettingsPage() {
  const { user, updateProfile } = useAuthStore();
  const [preferences, setPreferences] = useState<UserPreferences>({
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
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from localStorage and auth profile on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved preferences:', error);
      }
    }

    // Prefill from auth profile if available
    if (user?.profile) {
      setPreferences(prev => ({
        ...prev,
        defaultRegion: user.profile.region || prev.defaultRegion,
        defaultCurrency: user.profile.currency || prev.defaultCurrency,
        language: user.profile.language || prev.language
      }));
    }
  }, [user]);

  // Apply theme changes immediately
  useEffect(() => {
    const root = document.documentElement;
    
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else if (preferences.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [preferences.theme]);

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleNotificationChange = (key: keyof UserPreferences['notifications'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      // Update auth profile with region/currency
      if (user) {
        await updateProfile({
          region: preferences.defaultRegion,
          currency: preferences.defaultCurrency,
          language: preferences.language
        });
      }
      
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultPreferences: UserPreferences = {
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
      case 'dark': return <Moon className="h-4 w-4" />;
      case 'light': return <Sun className="h-4 w-4" />;
      default: return <Palette className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize your experience and preferences
          </p>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Unsaved changes
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={preferences.theme} 
                onValueChange={(value: 'light' | 'dark' | 'system') => handlePreferenceChange('theme', value)}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    {getThemeIcon()}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme or follow system settings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select 
                value={preferences.language} 
                onValueChange={(value) => handlePreferenceChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="region">Default Region</Label>
              <Select 
                value={preferences.defaultRegion} 
                onValueChange={(value) => handlePreferenceChange('defaultRegion', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map(region => (
                    <SelectItem key={region.value} value={region.value}>
                      <div className="flex items-center gap-2">
                        <span>{region.flag}</span>
                        {region.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select 
                value={preferences.defaultCurrency} 
                onValueChange={(value) => handlePreferenceChange('defaultCurrency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(currency => (
                    <SelectItem key={currency.value} value={currency.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{currency.symbol}</span>
                        {currency.label} ({currency.value})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4" />
                <span className="font-medium">Profile Integration</span>
              </div>
              <p>
                These settings will be saved to your profile and used across all devices.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.notifications.email}
                onCheckedChange={(checked) => handleNotificationChange('email', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser notifications
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.notifications.push}
                onCheckedChange={(checked) => handleNotificationChange('push', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing-notifications">Marketing Communications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive product updates and offers
                </p>
              </div>
              <Switch
                id="marketing-notifications"
                checked={preferences.notifications.marketing}
                onCheckedChange={(checked) => handleNotificationChange('marketing', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="space-y-3">
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
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Member since</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not logged in</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}