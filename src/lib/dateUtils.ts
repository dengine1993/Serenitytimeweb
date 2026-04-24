/**
 * Get today's date in the user's timezone formatted as YYYY-MM-DD
 * This ensures frontend and backend use consistent date calculations
 */
export function getTodayInUserTimezone(timezone: string = 'Europe/Moscow'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Get start of today (midnight) in user's timezone as ISO string
 * Useful for database queries with >= comparisons
 */
export function getTodayStartInUserTimezone(timezone: string = 'Europe/Moscow'): string {
  const today = getTodayInUserTimezone(timezone);
  // Return as ISO string with timezone offset
  const date = new Date(`${today}T00:00:00`);
  return date.toISOString();
}

/**
 * Calculate hours until midnight in user's timezone
 */
export function getHoursUntilMidnight(timezone: string = 'Europe/Moscow'): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  
  const minutesUntilMidnight = (24 * 60) - (hour * 60 + minute);
  return Math.ceil(minutesUntilMidnight / 60);
}

/**
 * Get yesterday's date in user's timezone
 */
export function getYesterdayInTimezone(timezone: string = 'Europe/Moscow'): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(yesterday);
  } catch {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(yesterday);
  }
}

/**
 * Get current hour in user's timezone (0-23)
 */
export function getCurrentHourInTimezone(timezone: string = 'Europe/Moscow'): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Moscow',
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  }
}

/**
 * Determine if daily limits should reset (at 7:00 AM local time)
 */
export function shouldResetLimits(lastReset: string | null, timezone: string): boolean {
  const currentHour = getCurrentHourInTimezone(timezone);
  
  // Before 7 AM - no reset yet today
  if (currentHour < 7) {
    return false;
  }
  
  // No previous reset - need to reset
  if (!lastReset) {
    return true;
  }
  
  const lastResetDate = new Date(lastReset);
  const todayStr = getTodayInUserTimezone(timezone);
  
  // Format last reset date in user's timezone
  let lastResetStr: string;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    lastResetStr = formatter.format(lastResetDate);
  } catch {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    lastResetStr = formatter.format(lastResetDate);
  }
  
  // If last reset was on a different day and it's past 7 AM, reset
  if (lastResetStr !== todayStr) {
    return true;
  }
  
  // Same day - check if last reset was before 7 AM
  let lastResetHour: number;
  try {
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    lastResetHour = parseInt(hourFormatter.format(lastResetDate), 10);
  } catch {
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Moscow',
      hour: 'numeric',
      hour12: false,
    });
    lastResetHour = parseInt(hourFormatter.format(lastResetDate), 10);
  }
  
  // If last reset was before 7 AM and now it's >= 7 AM, reset
  return lastResetHour < 7 && currentHour >= 7;
}
