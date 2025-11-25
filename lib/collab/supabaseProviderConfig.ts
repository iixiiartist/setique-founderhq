import type SupabaseProvider from 'y-supabase';

export const COLLAB_HEARTBEAT_INTERVAL_MS = 15_000;
export const COLLAB_HEARTBEAT_JITTER_MS = 4_000;
export const COLLAB_RESYNC_INTERVAL_MS = 60_000;
export const DEFAULT_BACKOFF_STEPS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000];

export class CollabBackoffController {
    private attempt = 0;

    constructor(private readonly steps = DEFAULT_BACKOFF_STEPS_MS) {}

    nextDelay(): number {
        const delay = this.steps[Math.min(this.attempt, this.steps.length - 1)];
        this.attempt += 1;
        return delay;
    }

    reset(): void {
        this.attempt = 0;
    }
}

interface HeartbeatMonitorOptions {
    provider: SupabaseProvider;
    intervalMs?: number;
    jitterMs?: number;
    onBeat?: (payload: { online: boolean; timestamp: number }) => void;
}

export function startHeartbeatMonitor({
    provider,
    intervalMs = COLLAB_HEARTBEAT_INTERVAL_MS,
    jitterMs = COLLAB_HEARTBEAT_JITTER_MS,
    onBeat,
}: HeartbeatMonitorOptions): () => void {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
        if (cancelled) {
            return;
        }
        const online = provider.isOnline();
        onBeat?.({ online, timestamp: Date.now() });
        const jitter = Math.random() * jitterMs;
        timer = setTimeout(tick, intervalMs + jitter);
    };

    timer = setTimeout(tick, intervalMs);

    return () => {
        cancelled = true;
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };
}
