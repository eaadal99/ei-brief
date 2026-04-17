/**
 * Scheduler — runs all article fetchers + enrichment on a cron schedule.
 *
 * Default: every 6 hours.
 * Set CRON_SCHEDULE env var to override.
 *
 * Sources run in parallel:
 *   1. RSS feeds (rss-fetcher)   — existing curated sources
 *   2. GDELT DOC 2.0             — free, unlimited, no API key
 *   3. The Guardian API          — free tier, requires GUARDIAN_API_KEY
 *
 * After all fetchers finish, enrichment runs once for any unenriched articles.
 * (RSS fetcher also triggers enrichment internally, so this is a safety net
 *  to catch GDELT/Guardian articles that don't go through that path.)
 */

import cron from 'node-cron';
import { fetchAllSources } from '../engine/rss-fetcher.js';
import { fetchGdelt } from '../engine/gdelt-fetcher.js';
import { fetchGuardian } from '../engine/guardian-fetcher.js';
import { enrichArticles } from '../engine/enrichment.js';

let task = null;

export function startScheduler() {
  const schedule = process.env.CRON_SCHEDULE || '0 */6 * * *';

  if (!cron.validate(schedule)) {
    console.error(`[scheduler] Invalid cron schedule: ${schedule}`);
    return;
  }

  task = cron.schedule(schedule, async () => {
    console.log(`[scheduler] Starting fetch cycle at ${new Date().toISOString()}`);
    try {
      // Run all fetchers in parallel
      const [rss, gdelt, guardian] = await Promise.allSettled([
        fetchAllSources(),
        fetchGdelt(),
        fetchGuardian(),
      ]);

      const rssAdded = rss.status === 'fulfilled' ? (rss.value?.articlesAdded ?? 0) : 0;
      const gdeltAdded = gdelt.status === 'fulfilled' ? (gdelt.value?.added ?? 0) : 0;
      const guardianAdded = guardian.status === 'fulfilled' ? (guardian.value?.added ?? 0) : 0;
      const totalAdded = rssAdded + gdeltAdded + guardianAdded;

      // Log any fetcher failures
      if (rss.status === 'rejected') console.error('[scheduler] RSS fetch failed:', rss.reason?.message);
      if (gdelt.status === 'rejected') console.error('[scheduler] GDELT fetch failed:', gdelt.reason?.message);
      if (guardian.status === 'rejected') console.error('[scheduler] Guardian fetch failed:', guardian.reason?.message);

      console.log(`[scheduler] Fetch complete: ${rssAdded} RSS + ${gdeltAdded} GDELT + ${guardianAdded} Guardian = ${totalAdded} total`);

      // Enrich any unenriched articles (GDELT/Guardian won't have sector/summary yet)
      // Note: fetchAllSources() already calls enrichArticles() internally for RSS articles.
      // This call catches GDELT and Guardian articles.
      if (gdeltAdded + guardianAdded > 0) {
        try {
          await enrichArticles();
        } catch (err) {
          console.error('[scheduler] Enrichment failed:', err.message);
        }
      }
    } catch (err) {
      console.error('[scheduler] Unexpected error in fetch cycle:', err.message);
    }
  });

  console.log(`[scheduler] Fetch cycle scheduled: ${schedule}`);
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    console.log('[scheduler] Stopped');
  }
}
