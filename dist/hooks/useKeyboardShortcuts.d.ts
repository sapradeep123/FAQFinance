interface KeyboardShortcutHandlers {
    onGlobalSearch?: () => void;
    onSendChat?: () => void;
    onToggleSidebar?: () => void;
    onNewChat?: () => void;
}
export declare function useKeyboardShortcuts(handlers?: KeyboardShortcutHandlers): {
    shortcuts: any;
    handlers: {
        handleGlobalSearch: any;
        handleSendChat: any;
        handleToggleSidebar: any;
        handleNewChat: any;
    };
};
export declare function useCustomKeyboardShortcuts(customShortcuts: Record<string, () => void>): void;
export declare function formatShortcut(shortcut: string): string;
export type { KeyboardShortcutHandlers };
//# sourceMappingURL=useKeyboardShortcuts.d.ts.map