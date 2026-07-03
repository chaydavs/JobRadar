#!/usr/bin/env node
/**
 * Precompute the dashboard feed → public/jobs.json.
 *
 * Runs in CI (.github/workflows/build-feed.yml) on a schedule so the dashboard
 * loads instantly from a static file instead of fetching ~180+ job boards live
 * on every page load. Reuses api/jobs.js's aggregateJobs() — one implementation.
 *
 * Local run:  node scripts/build_feed.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { aggregateJobs } from "../api/jobs.js";

const OUT = fileURLToPath(new URL("../public/jobs.json", import.meta.url));

async function main() {
  const started = Date.now();
  console.log("Aggregating job boards...");
  const jobs = await aggregateJobs();
  const feed = { jobs, fetchedAt: new Date().toISOString(), count: jobs.length };

  await mkdir(fileURLToPath(new URL("../public/", import.meta.url)), { recursive: true });
  await writeFile(OUT, JSON.stringify(feed) + "\n");

  console.log(`Wrote ${jobs.length} jobs → public/jobs.json in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (jobs.length === 0) {
    console.error("WARNING: 0 jobs aggregated — not failing, but check source availability.");
  }
}

main().catch(err => {
  console.error("build_feed failed:", err);
  process.exit(1);
});
