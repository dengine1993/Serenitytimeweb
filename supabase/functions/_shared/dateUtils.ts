/**
 * Shared date utilities for Edge Functions
 * Mirrors frontend src/lib/dateUtils.ts for consistency
 */

/**
 * Get today's date in user's timezone (YYYY-MM-DD format)
 * Uses Intl.DateTimeFormat for reliable timezone conversion
 */
export function getTodayInTimezone(timezone: string = 'Europe/Moscow'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    // Fallback to Moscow if timezone is invalid
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  }
}

/**
 * Get start of today (midnight) in user's timezone as ISO string
 * Useful for database queries with >= comparisons
 */
export function getTodayStartInTimezone(timezone: string = 'Europe/Moscow'): string {
  const today = getTodayInTimezone(timezone);
  return `${today}T00:00:00.000Z`;
}
