import { API_CONFIG } from './config.js';

// Read a cached value from sessionStorage.
// Returns null if the data doesn't exist, is too old, or is corrupted somehow.
export function readCache(key) {
  const rawData = sessionStorage.getItem(key);
  const timestamp = sessionStorage.getItem(`${key}_timestamp`);

  if (!rawData || !timestamp) return null;

  const age = Date.now() - Number(timestamp);
  if (age > API_CONFIG.CACHE_DURATION) return null;

  try {
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

// Save a value to sessionStorage along with the current timestamp.
// The timestamp is checked by readCache to decide if the data is still fresh.
export function writeCache(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
  sessionStorage.setItem(`${key}_timestamp`, Date.now().toString());
}

// Remove a cached value — used on logout so the next sign-in never
// accidentally reuses a different account's cached data.
export function clearCache(key) {
  sessionStorage.removeItem(key);
  sessionStorage.removeItem(`${key}_timestamp`);
}
