import { useEffect, useCallback } from 'react';
import { TabType } from '../types';
import { Tab } from '../constants';

interface KeyboardShortcutsConfig {
  onNewTask?: () => void;
  onSearch?: () => void;
  onHelp?: () => void;
  onTabChange?: (tab: TabType) => void;
  onEscape?: () => void;
  onToggleAI?: () => void;
  enabled?: boolean;
}

/**
 * Global keyboard shortcuts hook for accessibility and power users
 * 
 * Shortcuts:
 * - Ctrl+N or N: New task (context-aware)
 * - Ctrl+K or /: Focus search
 * - Ctrl+/: Toggle AI assistant
 * - ?: Show keyboard shortcuts help
 * - 1-9: Switch tabs
 * - Escape: Close modals/dropdowns
 */
export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  const {
    onNewTask,
    onSearch,
    onHelp,
    onTabChange,
    onEscape,
    onToggleAI,
    enabled = true
  } = config;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs/textareas or content-editable elements
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                   target.tagName === 'TEXTAREA' || 
                   target.tagName === 'SELECT' ||
                   target.isContentEditable ||
                   target.closest('[role="textbox"]') !== null ||
                   target.closest('[contenteditable="true"]') !== null;

    // Don't trigger shortcuts when inside a modal dialog (except Escape)
    const isInModal = target.closest('[role="dialog"]') !== null || 
                      target.closest('.modal') !== null;

    // Escape: Close modals/dropdowns (works anywhere)
    if (event.key === 'Escape') {
      onEscape?.();
      return;
    }

    // Don't process any other shortcuts when in input fields or modals
    if (isInput || isInModal) return;

    // Ctrl+N: New task (only when not in input/modal)
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      onNewTask?.();
      return;
    }

    // Ctrl+K: Focus search (only when not in input/modal)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      onSearch?.();
      return;
    }

    // Ctrl+/: Toggle AI assistant (only when not in input/modal)
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      onToggleAI?.();
      return;
    }

    // /: Focus search (only when not in input/modal)
    if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      onSearch?.();
      return;
    }

    // ?: Show keyboard shortcuts help
    if (event.shiftKey && event.key === '?') {
      event.preventDefault();
      onHelp?.();
      return;
    }

    // N: New task (only when not in input)
    if (event.key === 'n' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      onNewTask?.();
      return;
    }

    // 1-9: Switch tabs (only when not in input)
    const tabShortcuts: Record<string, TabType> = {
      '1': Tab.Dashboard,
      '2': Tab.ProductsServices,
      '3': Tab.Investors,
      '4': Tab.Marketing,
      '5': Tab.Financials,
      '6': Tab.Calendar,
      '7': Tab.Documents,
      '8': Tab.Settings
    };

    const newTab = tabShortcuts[event.key];
    if (newTab && onTabChange) {
      event.preventDefault();
      onTabChange(newTab);
      return;
    }
  }, [enabled, onNewTask, onSearch, onHelp, onTabChange, onEscape, onToggleAI]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Return helper functions for components
  return {
    // Check if a specific shortcut key is pressed
    isShortcutKey: (event: React.KeyboardEvent, key: string) => {
      return event.key === key;
    },
    
    // Check if modifier key is pressed
    isModifierPressed: (event: React.KeyboardEvent | KeyboardEvent) => {
      return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
    }
  };
};

/**
 * Hook to get formatted keyboard shortcuts for display
 */
export const useKeyboardShortcutLabels = () => {
  // Detect if user is on Mac (use Cmd instead of Ctrl)
  const isMac = typeof navigator !== 'undefined' && 
                navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const mod = isMac ? '⌘' : 'Ctrl';

  return {
    shortcuts: [
      {
        category: 'Navigation',
        items: [
          { keys: ['1', '2', '3', '...', '9'], description: 'Switch tabs' },
          { keys: [mod, 'K'], description: 'Focus search' },
          { keys: ['/'], description: 'Focus search (alternative)' },
          { keys: ['Escape'], description: 'Close modals' }
        ]
      },
      {
        category: 'Actions',
        items: [
          { keys: [mod, 'N'], description: 'New task' },
          { keys: ['N'], description: 'New task (when not typing)' },
          { keys: [mod, '/'], description: 'Toggle AI assistant' },
          { keys: ['?'], description: 'Show this help' }
        ]
      },
      {
        category: 'Accessibility',
        items: [
          { keys: ['Tab'], description: 'Move focus forward' },
          { keys: ['Shift', 'Tab'], description: 'Move focus backward' },
          { keys: ['Enter'], description: 'Activate button/link' },
          { keys: ['Space'], description: 'Toggle checkbox/button' }
        ]
      }
    ],
    mod
  };
};
