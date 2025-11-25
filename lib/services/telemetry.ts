import { logger } from '../logger';

type TelemetryEventName =
    | 'doc_editor_boot'
    | 'doc_storage_failure'
    | 'yjs_handshake_latency'
    | 'canvas_shell_toggled'
    | 'canvas_palette_interaction'
    | 'collab_channel_health';

interface TrackOptions {
    workspaceId?: string | null;
    userId?: string | null;
    docId?: string | null;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

interface TelemetryPayload extends TrackOptions {
    event: string;
    timestamp: string;
}

class TelemetryService {
    private endpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT ?? '';
    private queue: TelemetryPayload[] = [];
    private flushTimer: ReturnType<typeof setTimeout> | null = null;

    track(event: TelemetryEventName | string, options: TrackOptions = {}): void {
        const payload: TelemetryPayload = {
            event,
            timestamp: new Date().toISOString(),
            workspaceId: options.workspaceId ?? null,
            userId: options.userId ?? null,
            docId: options.docId ?? null,
            metadata: options.metadata ?? {},
        };

        if (!this.endpoint) {
            logger.info('[telemetry]', payload);
            return;
        }

        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            try {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                const sent = navigator.sendBeacon(this.endpoint, blob);
                if (sent) {
                    return;
                }
            } catch (error) {
                logger.warn('telemetry sendBeacon failed', { error });
            }
        }

        this.queue.push(payload);
        this.scheduleFlush();
    }

    private scheduleFlush(): void {
        if (this.flushTimer) {
            return;
        }
        this.flushTimer = setTimeout(() => this.flushQueue(), 250);
    }

    private async flushQueue(): Promise<void> {
        if (!this.endpoint || !this.queue.length) {
            this.flushTimer = null;
            return;
        }

        const batch = [...this.queue];
        this.queue = [];

        try {
            if (typeof fetch === 'function') {
                await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ events: batch }),
                    keepalive: true,
                });
            }
        } catch (error) {
            logger.warn('telemetry flush failed; re-queueing batch', { error });
            this.queue.unshift(...batch);
        } finally {
            this.flushTimer = null;
            if (this.queue.length) {
                this.scheduleFlush();
            }
        }
    }
}

export const telemetry = new TelemetryService();
