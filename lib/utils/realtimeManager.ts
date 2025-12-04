/**
 * Realtime Channel Manager
 * =========================
 * Centralized management of Supabase realtime subscriptions.
 * Prevents duplicate subscriptions, handles cleanup, and optimizes channel usage.
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { throttle } from './rateLimiting';

// ============================================================================
// TYPES
// ============================================================================

export interface ChannelConfig {
  /** Channel name/identifier */
  name: string;
  /** Table to listen to (for postgres_changes) */
  table?: string;
  /** Filter expression */
  filter?: string;
  /** Schema (default: public) */
  schema?: string;
  /** Events to listen for */
  events?: Array<'INSERT' | 'UPDATE' | 'DELETE' | '*'>;
  /** Callback for changes */
  onChanges?: (payload: RealtimePostgresChangesPayload<any>) => void;
  /** Enable presence tracking */
  presence?: boolean;
  /** Presence key */
  presenceKey?: string;
  /** Callback for presence sync */
  onPresenceSync?: (state: Record<string, unknown[]>) => void;
  /** Debounce presence updates (ms) */
  presenceDebounceMs?: number;
}

interface ManagedChannel {
  channel: RealtimeChannel;
  config: ChannelConfig;
  subscribers: Set<string>;
  lastActivity: number;
  status: 'subscribed' | 'subscribing' | 'error' | 'closed';
}

// ============================================================================
// CHANNEL MANAGER SINGLETON
// ============================================================================

class RealtimeChannelManager {
  private channels: Map<string, ManagedChannel> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute
  private readonly IDLE_TIMEOUT_MS = 300000; // 5 minutes

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Subscribe to a channel with the given config
   * Returns an unsubscribe function
   */
  subscribe(
    subscriberId: string,
    config: ChannelConfig
  ): () => void {
    const channelKey = this.getChannelKey(config);
    
    let managed = this.channels.get(channelKey);
    
    if (!managed) {
      // Create new channel
      managed = this.createChannel(channelKey, config);
      this.channels.set(channelKey, managed);
    }

    // Add subscriber
    managed.subscribers.add(subscriberId);
    managed.lastActivity = Date.now();
    
    logger.debug(`[RealtimeManager] Subscriber ${subscriberId} added to ${channelKey}. Total: ${managed.subscribers.size}`);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriberId, channelKey);
    };
  }

  /**
   * Unsubscribe a specific subscriber from a channel
   */
  private unsubscribe(subscriberId: string, channelKey: string) {
    const managed = this.channels.get(channelKey);
    if (!managed) return;

    managed.subscribers.delete(subscriberId);
    logger.debug(`[RealtimeManager] Subscriber ${subscriberId} removed from ${channelKey}. Remaining: ${managed.subscribers.size}`);

    // Don't immediately close - let cleanup task handle it
    // This prevents rapid subscribe/unsubscribe cycles from causing issues
    managed.lastActivity = Date.now();
  }

  /**
   * Force close a channel immediately
   */
  closeChannel(channelKey: string) {
    const managed = this.channels.get(channelKey);
    if (!managed) return;

    logger.info(`[RealtimeManager] Closing channel: ${channelKey}`);
    managed.channel.unsubscribe();
    managed.status = 'closed';
    this.channels.delete(channelKey);
  }

  /**
   * Close all channels
   */
  closeAll() {
    logger.info(`[RealtimeManager] Closing all ${this.channels.size} channels`);
    for (const [key, managed] of this.channels) {
      managed.channel.unsubscribe();
      managed.status = 'closed';
    }
    this.channels.clear();
  }

  /**
   * Get channel status
   */
  getStatus(): Record<string, { subscribers: number; status: string; lastActivity: number }> {
    const status: Record<string, { subscribers: number; status: string; lastActivity: number }> = {};
    for (const [key, managed] of this.channels) {
      status[key] = {
        subscribers: managed.subscribers.size,
        status: managed.status,
        lastActivity: managed.lastActivity,
      };
    }
    return status;
  }

  /**
   * Generate unique key for channel config
   */
  private getChannelKey(config: ChannelConfig): string {
    const parts = [config.name];
    if (config.table) parts.push(`table:${config.table}`);
    if (config.filter) parts.push(`filter:${config.filter}`);
    if (config.presence) parts.push('presence');
    return parts.join('|');
  }

  /**
   * Create and configure a new channel
   */
  private createChannel(key: string, config: ChannelConfig): ManagedChannel {
    logger.info(`[RealtimeManager] Creating channel: ${key}`);
    
    const channel = supabase.channel(config.name, {
      config: {
        presence: config.presence ? { key: config.presenceKey } : undefined,
      },
    });

    const managed: ManagedChannel = {
      channel,
      config,
      subscribers: new Set(),
      lastActivity: Date.now(),
      status: 'subscribing',
    };

    // Set up postgres_changes listener if configured
    if (config.table && config.onChanges) {
      const events = config.events || ['*'];
      events.forEach(event => {
        channel.on(
          'postgres_changes' as any,
          {
            event: event as any,
            schema: config.schema || 'public',
            table: config.table!,
            filter: config.filter,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            managed.lastActivity = Date.now();
            config.onChanges!(payload);
          }
        );
      });
    }

    // Set up presence listener if configured
    if (config.presence && config.onPresenceSync) {
      const debouncedSync = config.presenceDebounceMs
        ? throttle(config.onPresenceSync, config.presenceDebounceMs)
        : config.onPresenceSync;

      channel.on('presence', { event: 'sync' }, () => {
        managed.lastActivity = Date.now();
        const state = channel.presenceState();
        debouncedSync(state);
      });
    }

    // Subscribe
    channel.subscribe((status) => {
      logger.debug(`[RealtimeManager] Channel ${key} status: ${status}`);
      if (status === 'SUBSCRIBED') {
        managed.status = 'subscribed';
      } else if (status === 'CHANNEL_ERROR') {
        managed.status = 'error';
        // Attempt reconnect after delay
        setTimeout(() => this.reconnectChannel(key), 5000);
      }
    });

    return managed;
  }

  /**
   * Reconnect a failed channel
   */
  private reconnectChannel(key: string) {
    const managed = this.channels.get(key);
    if (!managed || managed.subscribers.size === 0) {
      // No subscribers, just close
      if (managed) {
        this.closeChannel(key);
      }
      return;
    }

    logger.info(`[RealtimeManager] Reconnecting channel: ${key}`);
    
    // Unsubscribe old channel
    managed.channel.unsubscribe();
    
    // Create new channel with same config
    const newManaged = this.createChannel(key, managed.config);
    newManaged.subscribers = managed.subscribers;
    this.channels.set(key, newManaged);
  }

  /**
   * Start periodic cleanup of idle channels
   */
  private startCleanupTask() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleChannels();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up channels with no subscribers that have been idle
   */
  private cleanupIdleChannels() {
    const now = Date.now();
    const toClose: string[] = [];

    for (const [key, managed] of this.channels) {
      if (managed.subscribers.size === 0 && (now - managed.lastActivity) > this.IDLE_TIMEOUT_MS) {
        toClose.push(key);
      }
    }

    if (toClose.length > 0) {
      logger.info(`[RealtimeManager] Cleaning up ${toClose.length} idle channels`);
      toClose.forEach(key => this.closeChannel(key));
    }
  }

  /**
   * Stop the cleanup task (for cleanup on app shutdown)
   */
  stopCleanupTask() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const realtimeManager = new RealtimeChannelManager();

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook to subscribe to a realtime channel
 * Automatically handles cleanup on unmount
 */
export function useRealtimeChannel(
  config: ChannelConfig | null,
  deps: React.DependencyList = []
) {
  const subscriberIdRef = useRef(`${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!config) {
      // Unsubscribe if config becomes null
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Unsubscribe from previous channel if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to new channel
    unsubscribeRef.current = realtimeManager.subscribe(
      subscriberIdRef.current,
      config
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [config?.name, config?.table, config?.filter, ...deps]);
}

/**
 * Hook for table changes subscription
 */
export function useTableChanges<T = unknown>(
  table: string,
  filter?: string,
  onChanges?: (payload: RealtimePostgresChangesPayload<T>) => void,
  events: Array<'INSERT' | 'UPDATE' | 'DELETE' | '*'> = ['*']
) {
  const config: ChannelConfig | null = table && onChanges
    ? {
        name: `table:${table}:${filter || 'all'}`,
        table,
        filter,
        events,
        onChanges: onChanges as (payload: RealtimePostgresChangesPayload<any>) => void,
      }
    : null;

  useRealtimeChannel(config, [table, filter, onChanges]);
}

/**
 * Hook for room-scoped message subscription (Huddle)
 */
export function useRoomMessages(
  roomId: string | undefined,
  onMessage: (message: any) => void,
  onDelete?: (messageId: string) => void
) {
  const handleChanges = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      if (payload.eventType === 'INSERT') {
        onMessage(payload.new);
      } else if (payload.eventType === 'UPDATE' && payload.new.deleted_at && onDelete) {
        onDelete(payload.new.id);
      }
    },
    [onMessage, onDelete]
  );

  const config: ChannelConfig | null = roomId
    ? {
        name: `huddle:messages:${roomId}`,
        table: 'huddle_messages',
        filter: `room_id=eq.${roomId}`,
        events: ['INSERT', 'UPDATE'],
        onChanges: handleChanges,
      }
    : null;

  useRealtimeChannel(config, [roomId]);
}

/**
 * Hook for presence (typing indicators, online status)
 */
export function usePresence(
  channelName: string | undefined,
  userId: string | undefined,
  presenceData?: Record<string, unknown>
) {
  const [presenceState, setPresenceState] = useState<Record<string, unknown[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!channelName || !userId) return;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setPresenceState(channel.presenceState());
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && presenceData) {
          await channel.track(presenceData);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelName, userId]);

  const updatePresence = useCallback(
    async (data: Record<string, unknown>) => {
      if (channelRef.current) {
        await channelRef.current.track(data);
      }
    },
    []
  );

  return { presenceState, updatePresence };
}

/**
 * Hook for typing indicators with debounced updates
 */
export function useTypingIndicator(
  roomId: string | undefined,
  userId: string | undefined,
  userName: string
) {
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string }>>([]);
  const { presenceState, updatePresence } = usePresence(
    roomId ? `typing:${roomId}` : undefined,
    userId
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process presence state to get typing users
  useEffect(() => {
    const typing: Array<{ id: string; name: string }> = [];
    for (const [key, presences] of Object.entries(presenceState)) {
      if (key === userId) continue; // Skip self
      for (const presence of presences as any[]) {
        if (presence.typing) {
          typing.push({ id: key, name: presence.userName || 'User' });
        }
      }
    }
    setTypingUsers(typing);
  }, [presenceState, userId]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      updatePresence({ typing: isTyping, userName });

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          updatePresence({ typing: false, userName });
        }, 3000);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
    [updatePresence, userName]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { typingUsers, setTyping };
}

// Export for testing/debugging
export { RealtimeChannelManager };
