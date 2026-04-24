/**
 * Versioned localStorage utility with migration support
 */

const STORAGE_VERSION = 1;
const VERSION_KEY = 'app_storage_version';

// Keys that should be preserved across logout
const GLOBAL_KEYS = [
  'app_language',
  'app_storage_version',
  'home-theme',
  'sidebar:state',
];

// Keys that contain user-specific data and should be cleared on logout
const USER_DATA_KEYS = [
  'onboarding_completed',
  'app_tour_completed',
  'feed_draft',
  'daily_moment_last_shown',
  'webpush_dismissed',
  'ios_install_prompt_dismissed',
  'breathing-exercise-completed',
  'friend_intro_shown',
  'creator_letter_shown',
];

/**
 * Get current storage version
 */
export function getStorageVersion(): number {
  return parseInt(localStorage.getItem(VERSION_KEY) || '0', 10);
}

/**
 * Migrate storage to latest version
 */
export function migrateStorage(): void {
  const currentVersion = getStorageVersion();

  if (currentVersion < STORAGE_VERSION) {
    console.log(`[Storage] Migrating from v${currentVersion} to v${STORAGE_VERSION}`);

    // Future migrations go here
    // if (currentVersion < 2) { ... }

    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}

/**
 * Clear user-specific data while preserving global settings
 */
export function clearUserData(): void {
  USER_DATA_KEYS.forEach(key => localStorage.removeItem(key));
}

/**
 * Get preserved global settings
 */
export function getPreservedSettings(): Record<string, string | null> {
  const preserved: Record<string, string | null> = {};
  GLOBAL_KEYS.forEach(key => {
    preserved[key] = localStorage.getItem(key);
  });
  return preserved;
}

/**
 * Restore preserved settings after clearing
 */
export function restoreSettings(preserved: Record<string, string | null>): void {
  Object.entries(preserved).forEach(([key, value]) => {
    if (value !== null) {
      localStorage.setItem(key, value);
    }
  });
}
