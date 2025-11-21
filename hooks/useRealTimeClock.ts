import { useEffect, useMemo, useState } from 'react';

interface RealTimeClock {
  /** Epoch timestamp in milliseconds */
  now: number;
  /** Cached Date instance for the current tick */
  date: Date;
  /** ISO8601 date string (YYYY-MM-DD) derived from the current tick */
  isoDate: string;
  /** Human readable time string (HH:MM) */
  timeString: string;
}

/**
 * Lightweight real-time clock hook that keeps a single source of truth for "now".
 * Defaults to 1-minute precision to keep renders cheap but can be overridden.
 */
export function useRealTimeClock(intervalMs: number = 60_000): RealTimeClock {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    // Ensure immediate sync in case interval is large
    tick();

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const date = useMemo(() => new Date(now), [now]);

  return {
    now,
    date,
    isoDate: date.toISOString().split('T')[0],
    timeString: date.toTimeString().slice(0, 5),
  };
}
