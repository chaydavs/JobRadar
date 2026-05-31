/**
 * Stale-while-revalidate cache for GitHub job data.
 *
 * - On load: returns cached data immediately (if available)
 * - Fetches fresh data in background if cache is older than CACHE_TTL
 * - Falls back to network-only if no cache exists
 */

const CACHE_KEY = "jobRadarCache";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function getCachedJobs() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    const age = Date.now() - cached.timestamp;
    const fresh = age < CACHE_TTL;

    return { jobs: cached.jobs, fresh, cachedAt: cached.timestamp };
  } catch {
    return null;
  }
}

export function setCachedJobs(jobs) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      jobs,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage full — silently ignore
  }
}

export function formatCacheTime(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString();
}
