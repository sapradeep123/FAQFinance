import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface UserPreferences {
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

export interface KeyboardShortcuts {
  globalSearch: string;
  sendChat: string;
  toggleSidebar: string;
  newChat: string;
}

interface SettingsState {
  // Preferences
  preferences: UserPreferences;
  keyboardShortcuts: KeyboardShortcuts;
  
  // UI State
  sidebarCollapsed: boolean;
  
  // Actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updateNotificationPreference: (key: keyof UserPreferences['notifications'], value: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  resetPreferences: () => void;
  
  // Theme utilities
  getEffectiveTheme: () => 'light' | 'dark';
  applyTheme: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  defaultRegion: 'US',
  defaultCurrency: 'USD',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    marketing: false
  }
};

const defaultKeyboardShortcuts: KeyboardShortcuts = {
  globalSearch: 'ctrl+k',
  sendChat: 'ctrl+enter',
  toggleSidebar: 'ctrl+b',
  newChat: 'ctrl+n'
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        preferences: defaultPreferences,
        keyboardShortcuts: defaultKeyboardShortcuts,
        sidebarCollapsed: false,

        // Actions
        updatePreferences: (newPreferences) => {
          set((state) => {
            const updatedPreferences = { ...state.preferences, ...newPreferences };
            
            // Apply theme immediately if it changed
            if (newPreferences.theme && newPreferences.theme !== state.preferences.theme) {
              setTimeout(() => get().applyTheme(), 0);
            }
            
            return { preferences: updatedPreferences };
          });
        },

        updateNotificationPreference: (key, value) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              notifications: {
                ...state.preferences.notifications,
                [key]: value
              }
            }
          }));
        },

        setTheme: (theme) => {
          set((state) => ({
            preferences: { ...state.preferences, theme }
          }));
          // Apply theme immediately
          setTimeout(() => get().applyTheme(), 0);
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
        },

        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed });
        },

        resetPreferences: () => {
          set({ preferences: defaultPreferences });
          setTimeout(() => get().applyTheme(), 0);
        },

        // Theme utilities
        getEffectiveTheme: () => {
          const { theme } = get().preferences;
          if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          return theme;
        },

        applyTheme: () => {
          const effectiveTheme = get().getEffectiveTheme();
          const root = document.documentElement;
          
          if (effectiveTheme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
          
          // Store the effective theme for CSS custom properties
          root.setAttribute('data-theme', effectiveTheme);
        }
      }),
      {
        name: 'settings-storage',
        partialize: (state) => ({
          preferences: state.preferences,
          keyboardShortcuts: state.keyboardShortcuts,
          sidebarCollapsed: state.sidebarCollapsed
        })
      }
    ),
    { name: 'SettingsStore' }
  )
);

// Selectors for easier access
export const useTheme = () => useSettingsStore((state) => state.preferences.theme);
export const useEffectiveTheme = () => useSettingsStore((state) => state.getEffectiveTheme());
export const usePreferences = () => useSettingsStore((state) => state.preferences);
export const useKeyboardShortcuts = () => useSettingsStore((state) => state.keyboardShortcuts);
export const useSidebarCollapsed = () => useSettingsStore((state) => state.sidebarCollapsed);

// Initialize theme on store creation
if (typeof window !== 'undefined') {
  // Apply theme on initial load
  const store = useSettingsStore.getState();
  store.applyTheme();
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const currentStore = useSettingsStore.getState();
    if (currentStore.preferences.theme === 'system') {
      currentStore.applyTheme();
    }
  });
}

// Types are already exported above