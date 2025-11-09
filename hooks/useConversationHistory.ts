import { useState, useEffect, useCallback } from 'react';
import { TabType } from '../constants';

// Conversation history structure matching ModuleAssistant's Content format
interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { id?: string; name: string; args: any };
  functionResponse?: { id?: string; name: string; response: any };
}

export interface Content {
  role: 'user' | 'model' | 'tool';
  parts: Part[];
}

interface ConversationMetadata {
  lastUpdated: number;
  messageCount: number;
  size: number; // in bytes
}

interface ConversationStore {
  [context: string]: {
    history: Content[];
    metadata: ConversationMetadata;
  };
}

const STORAGE_KEY_PREFIX = 'ai_conversation_';
const MAX_HISTORY_SIZE = 1024 * 1024; // 1MB per context
const MAX_MESSAGES_PER_CONTEXT = 100;
const CLEANUP_AFTER_DAYS = 30;

/**
 * Hook to manage conversation history per assistant context
 * Features:
 * - Persists to localStorage with size limits
 * - Auto-cleanup of old conversations
 * - Efficient storage (removes large file data after processing)
 * - Separate history per context (Platform, CRM, Marketing, etc.)
 */
export const useConversationHistory = (context: TabType) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${context}`;
  
  const [history, setHistory] = useState<Content[]>(() => {
    return loadHistory(storageKey);
  });

  // Save history to localStorage whenever it changes
  useEffect(() => {
    saveHistory(storageKey, history);
  }, [history, storageKey]);

  // Load history from localStorage
  function loadHistory(key: string): Content[] {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      const { history: storedHistory, metadata } = parsed;

      // Check if conversation is too old
      const daysSinceUpdate = (Date.now() - metadata.lastUpdated) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > CLEANUP_AFTER_DAYS) {
        localStorage.removeItem(key);
        return [];
      }

      return storedHistory || [];
    } catch (error) {
      console.error(`[useConversationHistory] Failed to load history for ${key}:`, error);
      return [];
    }
  }

  // Save history to localStorage with metadata
  function saveHistory(key: string, historyToSave: Content[]) {
    try {
      // Clean history to remove large inline data (keep only metadata)
      const cleanedHistory = historyToSave.map(msg => ({
        ...msg,
        parts: msg.parts.map(part => {
          if (part.inlineData) {
            // Keep only mimeType and filename hint, remove base64 data
            return {
              text: part.text,
              inlineData: {
                mimeType: part.inlineData.mimeType,
                data: '[file data removed for storage]'
              }
            };
          }
          return part;
        })
      }));

      const store: ConversationStore[string] = {
        history: cleanedHistory,
        metadata: {
          lastUpdated: Date.now(),
          messageCount: cleanedHistory.length,
          size: JSON.stringify(cleanedHistory).length
        }
      };

      // Check size limit
      const storeString = JSON.stringify(store);
      if (storeString.length > MAX_HISTORY_SIZE) {
        // Remove oldest messages if over limit
        const trimmedHistory = cleanedHistory.slice(-Math.floor(MAX_MESSAGES_PER_CONTEXT / 2));
        store.history = trimmedHistory;
        store.metadata.messageCount = trimmedHistory.length;
        store.metadata.size = JSON.stringify(trimmedHistory).length;
      }

      localStorage.setItem(key, JSON.stringify(store));
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[useConversationHistory] Storage quota exceeded, clearing old conversations');
        clearOldConversations();
        // Try again with reduced history
        const reducedHistory = historyToSave.slice(-20);
        saveHistory(key, reducedHistory);
      } else {
        console.error(`[useConversationHistory] Failed to save history for ${key}:`, error);
      }
    }
  }

  // Clear old conversations from all contexts
  function clearOldConversations() {
    try {
      const keys = Object.keys(localStorage);
      const conversationKeys = keys.filter(k => k.startsWith(STORAGE_KEY_PREFIX));
      
      conversationKeys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (!stored) return;

          const { metadata } = JSON.parse(stored);
          const daysSinceUpdate = (Date.now() - metadata.lastUpdated) / (1000 * 60 * 60 * 24);
          
          // Remove if older than 7 days or if oversized
          if (daysSinceUpdate > 7 || metadata.size > MAX_HISTORY_SIZE) {
            localStorage.removeItem(key);
          }
        } catch (err) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('[useConversationHistory] Failed to cleanup old conversations:', error);
    }
  }

  // Add message to history
  const addMessage = useCallback((message: Content) => {
    setHistory(prev => {
      const newHistory = [...prev, message];
      // Enforce max messages limit
      if (newHistory.length > MAX_MESSAGES_PER_CONTEXT) {
        return newHistory.slice(-MAX_MESSAGES_PER_CONTEXT);
      }
      return newHistory;
    });
  }, []);

  // Add multiple messages (batch)
  const addMessages = useCallback((messages: Content[]) => {
    setHistory(prev => {
      const newHistory = [...prev, ...messages];
      if (newHistory.length > MAX_MESSAGES_PER_CONTEXT) {
        return newHistory.slice(-MAX_MESSAGES_PER_CONTEXT);
      }
      return newHistory;
    });
  }, []);

  // Update entire history (for loading or replacing)
  const updateHistory = useCallback((newHistory: Content[]) => {
    setHistory(newHistory);
  }, []);

  // Clear history for current context
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('[useConversationHistory] Failed to clear history:', error);
    }
  }, [storageKey]);

  // Get conversation metadata
  const getMetadata = useCallback((): ConversationMetadata | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      
      const { metadata } = JSON.parse(stored);
      return metadata;
    } catch (error) {
      return null;
    }
  }, [storageKey]);

  // Export conversation as text
  const exportAsText = useCallback((): string => {
    return history.map(msg => {
      const role = msg.role === 'user' ? 'You' : msg.role === 'model' ? 'AI' : 'Tool';
      const text = msg.parts.find(p => p.text)?.text || '[No text]';
      return `${role}: ${text}`;
    }).join('\n\n');
  }, [history]);

  // Export conversation as JSON
  const exportAsJSON = useCallback((): string => {
    return JSON.stringify(history, null, 2);
  }, [history]);

  return {
    history,
    addMessage,
    addMessages,
    updateHistory,
    clearHistory,
    getMetadata,
    exportAsText,
    exportAsJSON,
    messageCount: history.length
  };
};
