/**
 * Time utilities for America/New_York timezone
 */

const NY_TIMEZONE = 'America/New_York';

/**
 * Get current time in NY timezone as ISO string
 */
export function getNYTimestamp(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: NY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Get current time in NY timezone formatted for display
 */
export function getNYDisplayTime(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: NY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Get current ISO timestamp
 */
export function getISOTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      timeZone: NY_TIMEZONE,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timestamp;
  }
}

/**
 * Calculate age in seconds from timestamp
 */
export function getAgeSeconds(timestamp: string): number {
  try {
    const then = new Date(timestamp).getTime();
    const now = Date.now();
    return Math.floor((now - then) / 1000);
  } catch {
    return 0;
  }
}
