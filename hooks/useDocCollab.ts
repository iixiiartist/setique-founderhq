import { useState, useCallback, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import SupabaseProvider from 'y-supabase';
import { supabase } from '../lib/supabase';
import { telemetry } from '../lib/services/telemetry';

// Heartbeat monitor constants
const HEARTBEAT_INTERVAL_MS = 5000;
const COLLAB_RESYNC_INTERVAL_MS = 30_000;

interface CollabBackoffController {
  delays: number[];
  index: number;
  nextDelay: () => number;
  reset: () => void;
}

function createBackoffController(delays: number[]): CollabBackoffController {
  let index = 0;
  return {
    delays,
    index,
    nextDelay: () => {
      const delay = delays[Math.min(index, delays.length - 1)];
      index++;
      return delay;
    },
    reset: () => {
      index = 0;
    },
  };
}

interface HeartbeatOptions {
  provider: SupabaseProvider;
  onBeat: (info: { online: boolean; timestamp: number }) => void;
}

function startHeartbeatMonitor(options: HeartbeatOptions): () => void {
  const { provider, onBeat } = options;
  let lastOnline = true;
  
  const interval = setInterval(() => {
    // Check provider connection status
    const online = provider.synced && provider.awareness.getLocalState() !== null;
    onBeat({ online, timestamp: Date.now() });
    lastOnline = online;
  }, HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(interval);
}

export type CollabStatus = 'disconnected' | 'connecting' | 'connected';

export interface UseDocCollabOptions {
  docId: string | undefined;
  workspaceId: string;
  userId: string;
  tableName?: string;
  columnName?: string;
}

export interface UseDocCollabResult {
  ydoc: Y.Doc | null;
  provider: SupabaseProvider | null;
  collabStatus: CollabStatus;
  activeUsers: any[];
  collabWarning: string | null;
  clearCollabWarning: () => void;
  yjsInitialSyncComplete: boolean;
  yjsHasContent: boolean;
}

/**
 * useDocCollab - Manages Yjs collaboration provider lifecycle
 * 
 * @param options - Configuration for the collaboration
 * @returns Yjs document, provider, and status information
 */
export function useDocCollab(options: UseDocCollabOptions): UseDocCollabResult {
  const {
    docId,
    workspaceId,
    userId,
    tableName = 'gtm_docs',
    columnName = 'content',
  } = options;

  const [provider, setProvider] = useState<SupabaseProvider | null>(null);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [collabStatus, setCollabStatus] = useState<CollabStatus>('disconnected');
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [collabWarning, setCollabWarning] = useState<string | null>(null);
  const [yjsInitialSyncComplete, setYjsInitialSyncComplete] = useState(false);
  const [yjsHasContent, setYjsHasContent] = useState(false);

  const heartbeatCleanupRef = useRef<(() => void) | null>(null);
  const offlineSinceRef = useRef<number | null>(null);
  const lastHeartbeatOnlineRef = useRef<boolean | null>(null);
  const offlineWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineWarningBackoffRef = useRef(createBackoffController([8000, 20000, 45000]));
  const lastStatusTelemetryRef = useRef<string | null>(null);
  const collabWarningLatchedRef = useRef(false);
  const handshakeStartRef = useRef<number | null>(null);
  const handshakeTrackedRef = useRef(false);

  const setLatchedCollabWarning = useCallback((message: string) => {
    collabWarningLatchedRef.current = true;
    setCollabWarning(message);
  }, []);

  const clearCollabWarning = useCallback(() => {
    collabWarningLatchedRef.current = false;
    setCollabWarning(null);
  }, []);

  useEffect(() => {
    if (!docId) {
      // Reset state for non-collab mode
      setYdoc(null);
      setProvider(null);
      setCollabStatus('disconnected');
      setActiveUsers([]);
      setYjsInitialSyncComplete(false);
      setYjsHasContent(false);
      heartbeatCleanupRef.current?.();
      heartbeatCleanupRef.current = null;
      if (offlineWarningTimeoutRef.current) {
        clearTimeout(offlineWarningTimeoutRef.current);
        offlineWarningTimeoutRef.current = null;
      }
      offlineSinceRef.current = null;
      lastHeartbeatOnlineRef.current = null;
      clearCollabWarning();
      return;
    }

    const doc = new Y.Doc();
    const providerInstance = new SupabaseProvider(doc, supabase, {
      channel: `doc-collab-${docId}`,
      id: docId,
      tableName,
      columnName,
      resyncInterval: COLLAB_RESYNC_INTERVAL_MS,
    });

    const connectionStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let handshakeLogged = false;
    handshakeStartRef.current = Date.now();
    handshakeTrackedRef.current = false;

    const statusListener = (event: any) => {
      setCollabStatus(event.status);

      if (lastStatusTelemetryRef.current !== event.status) {
        lastStatusTelemetryRef.current = event.status;
        telemetry.track('collab_channel_health', {
          workspaceId,
          userId,
          docId,
          metadata: {
            event: 'status',
            status: event.status,
          },
        });
      }

      if (!handshakeLogged && event.status === 'connected') {
        handshakeLogged = true;
        const latencySource = typeof performance !== 'undefined' ? performance.now() : Date.now();
        telemetry.track('collab_channel_health', {
          workspaceId,
          userId,
          docId,
          metadata: {
            event: 'handshake',
            latencyMs: Math.round(latencySource - connectionStartedAt),
          },
        });
      }

      if (event.status === 'connected' && !handshakeTrackedRef.current) {
        const durationMs = Math.max(0, Date.now() - (handshakeStartRef.current ?? Date.now()));
        telemetry.track('yjs_handshake_latency', {
          workspaceId,
          userId,
          docId,
          metadata: {
            durationMs,
          },
        });
        handshakeTrackedRef.current = true;
      }
    };

    providerInstance.on('status', statusListener);

    const heartbeatCleanup = startHeartbeatMonitor({
      provider: providerInstance,
      onBeat: ({ online, timestamp }) => {
        if (lastHeartbeatOnlineRef.current !== online) {
          telemetry.track('collab_channel_health', {
            workspaceId,
            userId,
            docId,
            metadata: {
              event: 'heartbeat',
              online,
              offlineDurationMs:
                !online && offlineSinceRef.current
                  ? timestamp - offlineSinceRef.current
                  : 0,
            },
          });
          lastHeartbeatOnlineRef.current = online;
        }

        if (online) {
          offlineSinceRef.current = null;
          if (offlineWarningTimeoutRef.current) {
            clearTimeout(offlineWarningTimeoutRef.current);
            offlineWarningTimeoutRef.current = null;
          }
          offlineWarningBackoffRef.current.reset();
          clearCollabWarning();
        } else if (offlineSinceRef.current === null) {
          offlineSinceRef.current = timestamp;
          const delay = offlineWarningBackoffRef.current.nextDelay();
          if (offlineWarningTimeoutRef.current) {
            clearTimeout(offlineWarningTimeoutRef.current);
          }
          offlineWarningTimeoutRef.current = setTimeout(() => {
            setLatchedCollabWarning('Realtime sync is offline. Edits remain local until we reconnect.');
          }, delay);
        } else if (offlineSinceRef.current) {
          const offlineDuration = timestamp - offlineSinceRef.current;
          if (offlineDuration > 60_000) {
            setLatchedCollabWarning('Realtime sync lost for over a minute. Consider refreshing to reconnect.');
          }
        }
      },
    });

    heartbeatCleanupRef.current?.();
    heartbeatCleanupRef.current = heartbeatCleanup;

    const awarenessListener = () => {
      const states = Array.from(providerInstance.awareness.getStates().values());
      setActiveUsers(states);
    };
    providerInstance.awareness.on('change', awarenessListener);

    // Track when Yjs syncs and check if it has content
    const syncListener = (synced: boolean) => {
      if (synced) {
        setYjsInitialSyncComplete(true);
        // Check if the Yjs document has meaningful content
        const fragment = doc.getXmlFragment('default');
        const hasContent = fragment && fragment.length > 0;
        setYjsHasContent(hasContent);
        telemetry.track('yjs_initial_sync', {
          workspaceId,
          userId,
          docId,
          metadata: {
            hasContent,
            fragmentLength: fragment?.length || 0,
          },
        });
      }
    };
    providerInstance.on('sync', syncListener);

    setYdoc(doc);
    setProvider(providerInstance);

    return () => {
      heartbeatCleanupRef.current?.();
      heartbeatCleanupRef.current = null;
      if (offlineWarningTimeoutRef.current) {
        clearTimeout(offlineWarningTimeoutRef.current);
        offlineWarningTimeoutRef.current = null;
      }
      offlineSinceRef.current = null;
      lastHeartbeatOnlineRef.current = null;
      clearCollabWarning();

      // Reset Yjs sync tracking
      setYjsInitialSyncComplete(false);
      setYjsHasContent(false);

      if (typeof providerInstance.awareness?.off === 'function') {
        providerInstance.awareness.off('change', awarenessListener);
      }

      if (typeof providerInstance.off === 'function') {
        providerInstance.off('status', statusListener);
        providerInstance.off('sync', syncListener);
      } else {
        providerInstance.removeListener('status', statusListener);
        providerInstance.removeListener('sync', syncListener);
      }

      providerInstance.destroy();
      doc.destroy();
    };
  }, [docId, userId, workspaceId, tableName, columnName, clearCollabWarning, setLatchedCollabWarning]);

  return {
    ydoc,
    provider,
    collabStatus,
    activeUsers,
    collabWarning,
    clearCollabWarning,
    yjsInitialSyncComplete,
    yjsHasContent,
  };
}

export default useDocCollab;
