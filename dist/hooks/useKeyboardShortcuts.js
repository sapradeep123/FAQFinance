"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useKeyboardShortcuts = useKeyboardShortcuts;
exports.useCustomKeyboardShortcuts = useCustomKeyboardShortcuts;
exports.formatShortcut = formatShortcut;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const useSettingsStore_1 = require("../stores/useSettingsStore");
const sonner_1 = require("sonner");
function useKeyboardShortcuts(handlers = {}) {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const shortcuts = (0, useSettingsStore_1.useKeyboardShortcuts)();
    const handleGlobalSearch = (0, react_1.useCallback)(() => {
        if (handlers.onGlobalSearch) {
            handlers.onGlobalSearch();
            return;
        }
        const searchInput = document.querySelector('[data-search-input]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
        else {
            navigate('/app/chat');
            sonner_1.toast.info('Navigated to chat - use Ctrl+K again to focus search');
        }
    }, [handlers.onGlobalSearch, navigate]);
    const handleSendChat = (0, react_1.useCallback)(() => {
        if (handlers.onSendChat) {
            handlers.onSendChat();
            return;
        }
        const sendButton = document.querySelector('[data-send-button]');
        const chatForm = document.querySelector('[data-chat-form]');
        if (sendButton && !sendButton.disabled) {
            sendButton.click();
        }
        else if (chatForm) {
            chatForm.requestSubmit();
        }
    }, [handlers.onSendChat]);
    const handleToggleSidebar = (0, react_1.useCallback)(() => {
        if (handlers.onToggleSidebar) {
            handlers.onToggleSidebar();
            return;
        }
        const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
        if (sidebarToggle) {
            sidebarToggle.click();
        }
    }, [handlers.onToggleSidebar]);
    const handleNewChat = (0, react_1.useCallback)(() => {
        if (handlers.onNewChat) {
            handlers.onNewChat();
            return;
        }
        navigate('/app/chat');
        sonner_1.toast.info('Started new chat');
    }, [handlers.onNewChat, navigate]);
    const parseShortcut = (shortcut) => {
        const parts = shortcut.toLowerCase().split('+');
        return {
            ctrl: parts.includes('ctrl'),
            alt: parts.includes('alt'),
            shift: parts.includes('shift'),
            meta: parts.includes('meta') || parts.includes('cmd'),
            key: parts[parts.length - 1]
        };
    };
    const matchesShortcut = (event, shortcut) => {
        const parsed = parseShortcut(shortcut);
        return (event.ctrlKey === parsed.ctrl &&
            event.altKey === parsed.alt &&
            event.shiftKey === parsed.shift &&
            event.metaKey === parsed.meta &&
            event.key.toLowerCase() === parsed.key);
    };
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (event) => {
            const target = event.target;
            const isInputElement = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.contentEditable === 'true';
            if (matchesShortcut(event, shortcuts.globalSearch)) {
                event.preventDefault();
                handleGlobalSearch();
                return;
            }
            if (matchesShortcut(event, shortcuts.sendChat)) {
                if (isInputElement || target.closest('[data-chat-container]')) {
                    event.preventDefault();
                    handleSendChat();
                    return;
                }
            }
            if (isInputElement) {
                return;
            }
            if (matchesShortcut(event, shortcuts.toggleSidebar)) {
                event.preventDefault();
                handleToggleSidebar();
                return;
            }
            if (matchesShortcut(event, shortcuts.newChat)) {
                event.preventDefault();
                handleNewChat();
                return;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts, handleGlobalSearch, handleSendChat, handleToggleSidebar, handleNewChat]);
    return {
        shortcuts,
        handlers: {
            handleGlobalSearch,
            handleSendChat,
            handleToggleSidebar,
            handleNewChat
        }
    };
}
function useCustomKeyboardShortcuts(customShortcuts) {
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (event) => {
            const target = event.target;
            const isInputElement = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.contentEditable === 'true';
            if (isInputElement) {
                return;
            }
            for (const [shortcut, handler] of Object.entries(customShortcuts)) {
                const parts = shortcut.toLowerCase().split('+');
                const key = parts[parts.length - 1];
                const ctrl = parts.includes('ctrl');
                const alt = parts.includes('alt');
                const shift = parts.includes('shift');
                const meta = parts.includes('meta') || parts.includes('cmd');
                if (event.ctrlKey === ctrl &&
                    event.altKey === alt &&
                    event.shiftKey === shift &&
                    event.metaKey === meta &&
                    event.key.toLowerCase() === key) {
                    event.preventDefault();
                    handler();
                    break;
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [customShortcuts]);
}
function formatShortcut(shortcut) {
    return shortcut
        .split('+')
        .map(part => {
        switch (part.toLowerCase()) {
            case 'ctrl': return '⌃';
            case 'cmd':
            case 'meta': return '⌘';
            case 'alt': return '⌥';
            case 'shift': return '⇧';
            case 'enter': return '↵';
            default: return part.toUpperCase();
        }
    })
        .join('');
}
//# sourceMappingURL=useKeyboardShortcuts.js.map