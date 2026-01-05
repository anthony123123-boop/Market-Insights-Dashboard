import { format, toZonedTime } from 'date-fns-tz';

const ET_TIMEZONE = 'America/New_York';

/**
 * Get current time in Eastern Time
 */
export function nowET(): Date {
  return toZonedTime(new Date(), ET_TIMEZONE);
}

/**
 * Format a date to ET string
 */
export function formatET(date: Date, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return format(toZonedTime(date, ET_TIMEZONE), formatStr, { timeZone: ET_TIMEZONE });
}

/**
 * Get current ET timestamp string
 */
export function getETTimestamp(): string {
  return formatET(new Date(), "yyyy-MM-dd HH:mm:ss 'ET'");
}

/**
 * Format for display (shorter)
 */
export function formatETDisplay(date: Date): string {
  return formatET(date, "MMM d, HH:mm 'ET'");
}

/**
 * Check if market is open (simplified)
 */
export function isMarketOpen(): boolean {
  const now = nowET();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();

  // Weekends
  if (day === 0 || day === 6) return false;

  // Market hours: 9:30 AM - 4:00 PM ET
  const currentMinutes = hours * 60 + minutes;
  const openMinutes = 9 * 60 + 30;
  const closeMinutes = 16 * 60;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Get market session type
 */
export function getMarketSession(): 'PRE' | 'REGULAR' | 'POST' | 'CLOSE' {
  const now = nowET();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();

  // Weekends
  if (day === 0 || day === 6) return 'CLOSE';

  const currentMinutes = hours * 60 + minutes;
  const preOpenMinutes = 4 * 60; // 4:00 AM
  const openMinutes = 9 * 60 + 30; // 9:30 AM
  const closeMinutes = 16 * 60; // 4:00 PM
  const afterHoursEnd = 20 * 60; // 8:00 PM

  if (currentMinutes >= preOpenMinutes && currentMinutes < openMinutes) return 'PRE';
  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) return 'REGULAR';
  if (currentMinutes >= closeMinutes && currentMinutes < afterHoursEnd) return 'POST';

  return 'CLOSE';
}
