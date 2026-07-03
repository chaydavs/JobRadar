/**
 * Job feed fetch strategy.
 *
 * Prefer the precomputed static feed (public/jobs.json, refreshed on a schedule by
 * the build-feed GitHub Action) for instant loads that don't hammer ~180+ job
 * boards on every visit. Fall back to the live /api/jobs endpoint when the static
 * feed is missing, stale, empty, or a force-refresh is requested.
 */

const STATIC_FEED = "/jobs.json";
const LIVE_API = "/api/jobs";
const STATIC_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h — older than this, go live

async function fetchLive() {
  const res = await fetch(LIVE_API);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  const { jobs } = await res.json();
  return jobs;
}

export async function fetchJobFeed(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const res = await fetch(STATIC_FEED, { cache: "no-cache" });
      if (res.ok) {
        const feed = await res.json();
        const age = Date.now() - new Date(feed.fetchedAt).getTime();
        if (Array.isArray(feed.jobs) && feed.jobs.length > 0 && age < STATIC_MAX_AGE_MS) {
          return feed.jobs;
        }
      }
    } catch {
      // static feed unavailable — fall through to the live endpoint
    }
  }
  return fetchLive();
}
