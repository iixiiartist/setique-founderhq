import { useState, useEffect, useCallback } from 'react';
import { TabType } from '../constants';

interface AssistantState {
  isOpen: boolean;
  selectedContext: TabType;
  hasUnread: boolean;
  unreadCount: number;
}

const STORAGE_KEY = 'floatingAssistantState';

const getInitialState = (currentTab: TabType): AssistantState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        selectedContext: currentTab, // Always start with current tab
        hasUnread: false, // Reset unread on page load
        unreadCount: 0,
      };
    }
  } catch (error) {
    console.error('Failed to load assistant state:', error);
  }
  
  return {
    isOpen: false,
    selectedContext: currentTab,
    hasUnread: false,
    unreadCount: 0,
  };
};

export const useAssistantState = (currentTab: TabType) => {
  const [state, setState] = useState<AssistantState>(() => getInitialState(currentTab));
  
  // Persist to localStorage on state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isOpen: state.isOpen,
        selectedContext: state.selectedContext,
        // Don't persist unread state
      }));
    } catch (error) {
      console.error('Failed to save assistant state:', error);
    }
  }, [state.isOpen, state.selectedContext]);
  
  // Update selected context when current tab changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      selectedContext: currentTab,
    }));
  }, [currentTab]);
  
  const toggle = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: !prev.isOpen,
      // Clear unread when opening
      hasUnread: prev.isOpen ? prev.hasUnread : false,
      unreadCount: prev.isOpen ? prev.unreadCount : 0,
    }));
  }, []);
  
  const minimize = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);
  
  const open = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      hasUnread: false,
      unreadCount: 0,
    }));
  }, []);
  
  const setContext = useCallback((context: TabType) => {
    setState(prev => ({
      ...prev,
      selectedContext: context,
    }));
  }, []);
  
  const markUnread = useCallback(() => {
    setState(prev => {
      // Only mark unread if modal is closed
      if (prev.isOpen) {
        return prev;
      }
      
      return {
        ...prev,
        hasUnread: true,
        unreadCount: prev.unreadCount + 1,
      };
    });
  }, []);
  
  const clearUnread = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasUnread: false,
      unreadCount: 0,
    }));
  }, []);
  
  return {
    ...state,
    toggle,
    minimize,
    open,
    setContext,
    markUnread,
    clearUnread,
  };
};
