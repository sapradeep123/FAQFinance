import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts as useShortcutsStore } from '../stores/useSettingsStore';
import { toast } from 'sonner';

interface KeyboardShortcutHandlers {
  onGlobalSearch?: () => void;
  onSendChat?: () => void;
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers = {}) {
  const navigate = useNavigate();
  const shortcuts = useShortcutsStore();

  const handleGlobalSearch = useCallback(() => {
    if (handlers.onGlobalSearch) {
      handlers.onGlobalSearch();
      return;
    }

    // Default behavior: focus search input or navigate to chat
    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    } else {
      // If no search input found, navigate to chat page
      navigate('/app/chat');
      toast.info('Navigated to chat - use Ctrl+K again to focus search');
    }
  }, [handlers.onGlobalSearch, navigate]);

  const handleSendChat = useCallback(() => {
    if (handlers.onSendChat) {
      handlers.onSendChat();
      return;
    }

    // Default behavior: find and click send button or submit form
    const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
    const chatForm = document.querySelector('[data-chat-form]') as HTMLFormElement;
    
    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else if (chatForm) {
      chatForm.requestSubmit();
    }
  }, [handlers.onSendChat]);

  const handleToggleSidebar = useCallback(() => {
    if (handlers.onToggleSidebar) {
      handlers.onToggleSidebar();
      return;
    }

    // Default behavior: find and click sidebar toggle
    const sidebarToggle = document.querySelector('[data-sidebar-toggle]') as HTMLButtonElement;
    if (sidebarToggle) {
      sidebarToggle.click();
    }
  }, [handlers.onToggleSidebar]);

  const handleNewChat = useCallback(() => {
    if (handlers.onNewChat) {
      handlers.onNewChat();
      return;
    }

    // Default behavior: navigate to new chat
    navigate('/app/chat');
    toast.info('Started new chat');
  }, [handlers.onNewChat, navigate]);

  const parseShortcut = (shortcut: string) => {
    const parts = shortcut.toLowerCase().split('+');
    return {
      ctrl: parts.includes('ctrl'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      meta: parts.includes('meta') || parts.includes('cmd'),
      key: parts[parts.length - 1]
    };
  };

  const matchesShortcut = (event: KeyboardEvent, shortcut: string) => {
    const parsed = parseShortcut(shortcut);
    return (
      event.ctrlKey === parsed.ctrl &&
      event.altKey === parsed.alt &&
      event.shiftKey === parsed.shift &&
      event.metaKey === parsed.meta &&
      event.key.toLowerCase() === parsed.key
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except for specific cases)
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.contentEditable === 'true';

      // Global search (Ctrl+K) should work everywhere
      if (matchesShortcut(event, shortcuts.globalSearch)) {
        event.preventDefault();
        handleGlobalSearch();
        return;
      }

      // Send chat (Ctrl+Enter) should work in text inputs
      if (matchesShortcut(event, shortcuts.sendChat)) {
        if (isInputElement || target.closest('[data-chat-container]')) {
          event.preventDefault();
          handleSendChat();
          return;
        }
      }

      // Other shortcuts should not trigger when typing
      if (isInputElement) {
        return;
      }

      // Toggle sidebar (Ctrl+B)
      if (matchesShortcut(event, shortcuts.toggleSidebar)) {
        event.preventDefault();
        handleToggleSidebar();
        return;
      }

      // New chat (Ctrl+N)
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

// Hook for components that want to register custom shortcut handlers
export function useCustomKeyboardShortcuts(customShortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.contentEditable === 'true';

      // Don't trigger custom shortcuts when typing in inputs
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

        if (
          event.ctrlKey === ctrl &&
          event.altKey === alt &&
          event.shiftKey === shift &&
          event.metaKey === meta &&
          event.key.toLowerCase() === key
        ) {
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

// Utility function to display shortcut in UI
export function formatShortcut(shortcut: string): string {
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

// Export types
export type { KeyboardShortcutHandlers };