"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSidebarCollapsed = exports.useKeyboardShortcuts = exports.usePreferences = exports.useEffectiveTheme = exports.useTheme = exports.useSettingsStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const defaultPreferences = {
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
const defaultKeyboardShortcuts = {
    globalSearch: 'ctrl+k',
    sendChat: 'ctrl+enter',
    toggleSidebar: 'ctrl+b',
    newChat: 'ctrl+n'
};
exports.useSettingsStore = (0, zustand_1.create)()();
(0, middleware_1.devtools)((0, middleware_1.persist)((set, get) => ({
    preferences: defaultPreferences,
    keyboardShortcuts: defaultKeyboardShortcuts,
    sidebarCollapsed: false,
    updatePreferences: (newPreferences) => {
        set((state) => {
            const updatedPreferences = { ...state.preferences, ...newPreferences };
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
        }
        else {
            root.classList.remove('dark');
        }
        root.setAttribute('data-theme', effectiveTheme);
    }
}), {
    name: 'settings-storage',
    partialize: (state) => ({
        preferences: state.preferences,
        keyboardShortcuts: state.keyboardShortcuts,
        sidebarCollapsed: state.sidebarCollapsed
    })
}), { name: 'SettingsStore' });
;
const useTheme = () => (0, exports.useSettingsStore)((state) => state.preferences.theme);
exports.useTheme = useTheme;
const useEffectiveTheme = () => (0, exports.useSettingsStore)((state) => state.getEffectiveTheme());
exports.useEffectiveTheme = useEffectiveTheme;
const usePreferences = () => (0, exports.useSettingsStore)((state) => state.preferences);
exports.usePreferences = usePreferences;
const useKeyboardShortcuts = () => (0, exports.useSettingsStore)((state) => state.keyboardShortcuts);
exports.useKeyboardShortcuts = useKeyboardShortcuts;
const useSidebarCollapsed = () => (0, exports.useSettingsStore)((state) => state.sidebarCollapsed);
exports.useSidebarCollapsed = useSidebarCollapsed;
if (typeof window !== 'undefined') {
    const store = exports.useSettingsStore.getState();
    store.applyTheme();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
        const currentStore = exports.useSettingsStore.getState();
        if (currentStore.preferences.theme === 'system') {
            currentStore.applyTheme();
        }
    });
}
//# sourceMappingURL=useSettingsStore.js.map