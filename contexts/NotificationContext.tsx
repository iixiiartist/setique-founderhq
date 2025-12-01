// contexts/NotificationContext.tsx
// Centralized notification state - single source of truth for bell and center
// Eliminates duplicate realtime subscriptions and divergent unread counts

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { useNotifications, UseNotificationsResult } from '../hooks/useNotifications';

// ============================================
// CONTEXT
// ============================================

interface NotificationContextValue extends UseNotificationsResult {
  isReady: boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface NotificationProviderProps {
  children: React.ReactNode;
  /** Override default page size (default: 50) */
  pageSize?: number;
  /** Enable real-time updates (default: true) */
  realtime?: boolean;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  pageSize = 50,
  realtime = true,
}) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  // Single notifications instance shared by all consumers
  const notifications = useNotifications({
    userId: user?.id || '',
    workspaceId: workspace?.id,
    pageSize,
    realtime,
    respectPreferences: true,
    enablePagination: true,
  });

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<NotificationContextValue>(() => ({
    ...notifications,
    isReady: Boolean(user?.id && workspace?.id),
  }), [notifications, user?.id, workspace?.id]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider. ' +
      'Wrap your component tree with <NotificationProvider>.'
    );
  }
  
  return context;
}

// ============================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================

/**
 * Get just the unread count - minimal re-renders
 */
export function useUnreadCount(): number {
  const { unreadCount } = useNotificationContext();
  return unreadCount;
}

/**
 * Get loading state
 */
export function useNotificationsLoading(): { loading: boolean; refreshing: boolean } {
  const { loading, refreshing } = useNotificationContext();
  return { loading, refreshing };
}

/**
 * Get realtime connection status
 */
export function useNotificationsConnectionStatus(): boolean {
  const { realtimeConnected } = useNotificationContext();
  return realtimeConnected;
}

export default NotificationContext;
