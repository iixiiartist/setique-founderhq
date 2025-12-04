// lib/services/desktopNotificationService.ts
// Service for managing browser/desktop notifications
// Handles permission requests, notification display, and settings sync

import { logger } from '../logger';
import { supabase } from '../supabase';

// ============================================
// TYPES
// ============================================

export type DesktopNotificationPermission = 'granted' | 'denied' | 'default';

export interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string; // Unique tag to replace existing notification
  requireInteraction?: boolean; // Keep visible until user interacts
  silent?: boolean;
  data?: Record<string, unknown>;
  onClick?: () => void;
  onClose?: () => void;
}

interface SettingsRow {
  id: string;
  user_id: string;
  workspace_id: string;
  settings: {
    desktopNotifications?: boolean;
    [key: string]: unknown;
  };
}

// ============================================
// DESKTOP NOTIFICATION SERVICE
// ============================================

class DesktopNotificationService {
  private static instance: DesktopNotificationService;
  private enabled: boolean = false;
  private permission: DesktopNotificationPermission = 'default';
  private userId: string | null = null;
  private workspaceId: string | null = null;
  private activeNotifications: Map<string, Notification> = new Map();

  private constructor() {
    // Check initial permission state
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission as DesktopNotificationPermission;
    }
  }

  static getInstance(): DesktopNotificationService {
    if (!DesktopNotificationService.instance) {
      DesktopNotificationService.instance = new DesktopNotificationService();
    }
    return DesktopNotificationService.instance;
  }

  /**
   * Initialize the service with user context
   */
  async initialize(userId: string, workspaceId: string): Promise<void> {
    this.userId = userId;
    this.workspaceId = workspaceId;
    
    // Load saved preference from database
    await this.loadPreference();
    
    logger.info('[DesktopNotificationService] Initialized:', {
      enabled: this.enabled,
      permission: this.permission,
    });
  }

  /**
   * Load desktop notification preference from user settings
   */
  private async loadPreference(): Promise<void> {
    if (!this.userId || !this.workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('user_workspace_settings')
        .select('settings')
        .eq('user_id', this.userId)
        .eq('workspace_id', this.workspaceId)
        .maybeSingle();

      if (error) {
        logger.error('[DesktopNotificationService] Error loading preference:', error);
        return;
      }

      if (data?.settings?.desktopNotifications !== undefined) {
        this.enabled = data.settings.desktopNotifications;
      }
    } catch (err) {
      logger.error('[DesktopNotificationService] Unexpected error loading preference:', err);
    }
  }

  /**
   * Save desktop notification preference to database
   */
  async savePreference(enabled: boolean): Promise<boolean> {
    if (!this.userId || !this.workspaceId) {
      logger.warn('[DesktopNotificationService] Cannot save preference - no user context');
      return false;
    }

    try {
      // Upsert the setting
      const { error } = await supabase
        .from('user_workspace_settings')
        .upsert({
          user_id: this.userId,
          workspace_id: this.workspaceId,
          settings: { desktopNotifications: enabled },
        }, {
          onConflict: 'user_id,workspace_id',
        });

      if (error) {
        logger.error('[DesktopNotificationService] Error saving preference:', error);
        return false;
      }

      this.enabled = enabled;
      logger.info('[DesktopNotificationService] Preference saved:', enabled);
      return true;
    } catch (err) {
      logger.error('[DesktopNotificationService] Unexpected error saving preference:', err);
      return false;
    }
  }

  /**
   * Request notification permission from the browser
   */
  async requestPermission(): Promise<DesktopNotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      logger.warn('[DesktopNotificationService] Notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission as DesktopNotificationPermission;
      
      // If permission granted, enable desktop notifications
      if (permission === 'granted') {
        await this.savePreference(true);
      }
      
      logger.info('[DesktopNotificationService] Permission result:', permission);
      return this.permission;
    } catch (err) {
      logger.error('[DesktopNotificationService] Error requesting permission:', err);
      return 'denied';
    }
  }

  /**
   * Check if desktop notifications are available and enabled
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           this.permission === 'granted' && 
           this.enabled;
  }

  /**
   * Check current permission status
   */
  getPermission(): DesktopNotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission as DesktopNotificationPermission;
    }
    return this.permission;
  }

  /**
   * Check if notifications are enabled in settings
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable desktop notifications
   */
  async setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled && this.permission !== 'granted') {
      // Need to request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }
    
    return this.savePreference(enabled);
  }

  /**
   * Show a desktop notification
   */
  show(options: DesktopNotificationOptions): Notification | null {
    if (!this.isAvailable()) {
      logger.debug('[DesktopNotificationService] Cannot show notification - not available');
      return null;
    }

    try {
      // Close existing notification with same tag
      if (options.tag && this.activeNotifications.has(options.tag)) {
        this.activeNotifications.get(options.tag)?.close();
      }

      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/logo192.png',
        badge: options.badge || '/logo192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction ?? false,
        silent: options.silent ?? false,
        data: options.data,
      });

      // Handle click
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };

      // Handle close
      notification.onclose = () => {
        if (options.tag) {
          this.activeNotifications.delete(options.tag);
        }
        options.onClose?.();
      };

      // Track active notification
      if (options.tag) {
        this.activeNotifications.set(options.tag, notification);
      }

      logger.debug('[DesktopNotificationService] Notification shown:', options.title);
      return notification;
    } catch (err) {
      logger.error('[DesktopNotificationService] Error showing notification:', err);
      return null;
    }
  }

  /**
   * Show notification for agent job completion
   */
  showAgentJobComplete(target: string, reportId?: string): Notification | null {
    return this.show({
      title: '✅ Research Report Ready',
      body: `Your "${target}" research is complete. Click to view.`,
      tag: `agent-job-${reportId}`,
      requireInteraction: false,
      onClick: () => {
        if (reportId) {
          window.location.href = `/agents?report=${reportId}`;
        } else {
          window.location.href = '/agents';
        }
      },
    });
  }

  /**
   * Show notification for agent job failure
   */
  showAgentJobFailed(target: string, jobId: string): Notification | null {
    return this.show({
      title: '❌ Research Failed',
      body: `The "${target}" research encountered an error.`,
      tag: `agent-job-failed-${jobId}`,
      requireInteraction: false,
      onClick: () => {
        window.location.href = '/agents';
      },
    });
  }

  /**
   * Show notification for market brief
   */
  showMarketBriefReady(title: string, briefId: string): Notification | null {
    return this.show({
      title: '📊 Market Brief Ready',
      body: `Your market brief "${title}" is ready to view.`,
      tag: `market-brief-${briefId}`,
      requireInteraction: false,
      onClick: () => {
        window.location.href = `/marketing?tab=market-briefs&brief=${briefId}`;
      },
    });
  }

  /**
   * Show notification for sync completion
   */
  showSyncComplete(syncType: string, count: number): Notification | null {
    return this.show({
      title: '🔄 Sync Complete',
      body: `${syncType} sync completed. ${count} items updated.`,
      tag: `sync-${syncType}`,
      silent: true,
    });
  }

  /**
   * Show notification for sync failure
   */
  showSyncFailed(syncType: string, error: string): Notification | null {
    return this.show({
      title: '⚠️ Sync Failed',
      body: `${syncType} sync failed: ${error}`,
      tag: `sync-failed-${syncType}`,
      requireInteraction: true,
    });
  }

  /**
   * Show a generic notification
   */
  showGeneric(title: string, body: string, actionUrl?: string): Notification | null {
    return this.show({
      title,
      body,
      tag: `generic-${Date.now()}`,
      onClick: actionUrl ? () => {
        window.location.href = actionUrl;
      } : undefined,
    });
  }

  /**
   * Close all active notifications
   */
  closeAll(): void {
    this.activeNotifications.forEach(notification => notification.close());
    this.activeNotifications.clear();
  }

  /**
   * Close a specific notification by tag
   */
  close(tag: string): void {
    const notification = this.activeNotifications.get(tag);
    if (notification) {
      notification.close();
      this.activeNotifications.delete(tag);
    }
  }
}

// Export singleton instance
export const desktopNotificationService = DesktopNotificationService.getInstance();
export default desktopNotificationService;
