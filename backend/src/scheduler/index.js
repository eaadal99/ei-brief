/**
 * Scheduler — runs RSS fetch + enrichment on a cron schedule.
 *
 * Default: every 6 hours.
 * Set CRON_SCHEDULE env var to override.
 */

import cron from 'node-cron';
import { fetchAllSources } from '../engine/rss-fetcher.js';

let task = null;

export function startScheduler() {
  const schedule = process.env.CRON_SCHEDULE || '0 */6 * * *';

  // Validate the schedule
  if (!cron.validate(schedule)) {
    console.error(`[scheduler] Invalid cron schedule: ${schedule}`);
    return;
  }

  task = cron.schedule(schedule, async () => {
    console.log(`[scheduler] Starting scheduled RSS fetch at ${new Date().toISOString()}`);
    try {
      const result = await fetchAllSources();
      console.log(`[scheduler] Complete: ${result.articlesAdded} articles, ${result.sourcesProcessed} sources`);
    } catch (err) {
      console.error('[scheduler] Run failed:', err.message);
    }
  });

  console.log(`[scheduler] Scheduled RSS fetch: ${schedule}`);
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    console.log('[scheduler] Stopped');
  }
}
