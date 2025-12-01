/**
 * Shared date/time formatting utilities
 * Centralized formatters to replace duplicate implementations across components
 */

/**
 * Format a timestamp to relative time (e.g., "5m ago", "2h ago", "3d ago")
 * 
 * @param timestamp - ISO string, Date object, or Unix timestamp (ms)
 * @returns Formatted relative time string
 * 
 * @example
 * formatRelativeTime('2024-01-15T10:30:00Z') // "2h ago"
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime(1705312200000) // "3d ago"
 */
export function formatRelativeTime(timestamp: string | Date | number | null | undefined): string {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp) 
    : typeof timestamp === 'string' 
      ? new Date(timestamp) 
      : timestamp;
  
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format a timestamp to a short relative time (e.g., "5m", "2h", "3d")
 * Without the "ago" suffix - useful for compact displays
 */
export function formatRelativeTimeShort(timestamp: string | Date | number | null | undefined): string {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp) 
    : typeof timestamp === 'string' 
      ? new Date(timestamp) 
      : timestamp;
  
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a timestamp to human-readable notification time
 * "just now", "5 minutes ago", "2 hours ago", "Yesterday", etc.
 */
export function formatNotificationTime(timestamp: string | Date | number | null | undefined): string {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp) 
    : typeof timestamp === 'string' 
      ? new Date(timestamp) 
      : timestamp;
  
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format a date for display in forms/inputs (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Format a datetime for display in forms/inputs (YYYY-MM-DDTHH:MM)
 */
export function formatDateTimeForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

/**
 * Format a date range for display
 * "Jan 15 - Jan 20, 2024" or "Jan 15, 2024"
 */
export function formatDateRange(
  start: Date | string | null | undefined,
  end?: Date | string | null | undefined
): string {
  if (!start) return '';
  
  const startDate = typeof start === 'string' ? new Date(start) : start;
  if (isNaN(startDate.getTime())) return '';
  
  const startOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  
  if (!end) {
    return startDate.toLocaleDateString('en-US', { ...startOptions, year: 'numeric' });
  }
  
  const endDate = typeof end === 'string' ? new Date(end) : end;
  if (isNaN(endDate.getTime())) {
    return startDate.toLocaleDateString('en-US', { ...startOptions, year: 'numeric' });
  }
  
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  const sameDay = sameMonth && startDate.getDate() === endDate.getDate();
  
  if (sameDay) {
    return startDate.toLocaleDateString('en-US', { ...startOptions, year: 'numeric' });
  }
  
  if (sameMonth) {
    return `${startDate.toLocaleDateString('en-US', startOptions)} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  
  if (sameYear) {
    return `${startDate.toLocaleDateString('en-US', startOptions)} - ${endDate.toLocaleDateString('en-US', { ...startOptions, year: 'numeric' })}`;
  }
  
  return `${startDate.toLocaleDateString('en-US', { ...startOptions, year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { ...startOptions, year: 'numeric' })}`;
}

/**
 * Format duration in milliseconds to human readable
 * "1h 23m", "45m", "2d 3h"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0m';
  
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  return `${minutes}m`;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/**
 * Check if a date is within the last N days
 */
export function isWithinDays(date: Date | string | number, days: number): boolean {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d.getTime() >= cutoff.getTime();
}

export default formatRelativeTime;
