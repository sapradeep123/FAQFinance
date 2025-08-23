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
export declare const useSettingsStore: any;
export declare const useTheme: () => any;
export declare const useEffectiveTheme: () => any;
export declare const usePreferences: () => any;
export declare const useKeyboardShortcuts: () => any;
export declare const useSidebarCollapsed: () => any;
export type { UserPreferences, KeyboardShortcuts };
//# sourceMappingURL=useSettingsStore.d.ts.map