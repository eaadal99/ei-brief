/**
 * RSS Fetcher — fetches all enabled RSS sources, parses entries,
 * deduplicates by URL, and inserts new articles into the database.
 *
 * After fetching, triggers AI enrichment for articles missing a summary.
 */

import Parser from 'rss-parser';
import crypto from 'crypto';
import { query } from '../lib/db.js';
import { enrichArticles } from './enrichment.js';

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'EIBrief/1.0 RSS Reader' },
});

/**
 * Fetch all enabled RSS sources and store new articles.
 * @returns {{ articlesAdded: number, sourcesProcessed: number, errors: string[] }}
 */
export async function fetchAllSources() {
  const sourcesResult = await query('SELECT * FROM rss_sources WHERE enabled = true ORDER BY name');
  const sources = sourcesResult.rows;
  console.log(`[rss] Fetching ${sources.length} sources...`);

  let articlesAdded = 0;
  let sourcesProcessed = 0;
  const errors = [];

  // Process sources in parallel batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(source => fetchSingleSource(source))
    );

    for (let j = 0; j < results.length; j++) {
      const source = batch[j];
      const result = results[j];

      if (result.status === 'fulfilled') {
        articlesAdded += result.value;
        sourcesProcessed++;
      } else {
        errors.push(`${source.name}: ${result.reason?.message || 'Unknown error'}`);
        console.warn(`[rss] Failed: ${source.name} — ${result.reason?.message}`);
      }
    }
  }

  console.log(`[rss] Done: ${sourcesProcessed}/${sources.length} sources, ${articlesAdded} new articles`);

  // Enrich articles that are missing summaries
  if (articlesAdded > 0) {
    try {
      await enrichArticles();
    } catch (err) {
      console.error('[rss] Enrichment failed:', err.message);
    }
  }

  if (errors.length > 0) {
    console.warn(`[rss] ${errors.length} source(s) had errors`);
  }

  return { articlesAdded, sourcesProcessed, errors };
}

/**
 * Fetch a single RSS source and insert new articles.
 * @returns {number} Number of new articles inserted.
 */
async function fetchSingleSource(source) {
  const feed = await parser.parseURL(source.rss_url);
  let added = 0;

  for (const item of (feed.items || [])) {
    const url = item.link || item.guid || null;
    const headline = item.title || '';
    if (!headline.trim()) continue;

    const contentHash = crypto
      .createHash('md5')
      .update(headline + (url || ''))
      .digest('hex');

    const published = item.pubDate ? new Date(item.pubDate) : null;
    const snippet = item.contentSnippet || item.content || '';
    // Truncate snippet to 500 chars for the initial summary
    const summary = snippet.length > 500 ? snippet.slice(0, 497) + '...' : snippet;

    try {
      const result = await query(
        `INSERT INTO articles (headline, url, summary, source_name, source_key, sector, published_at, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (url) DO NOTHING
         RETURNING id`,
        [
          headline.trim(),
          url,
          summary || null,
          source.name,
          source.id,
          source.sector,
          published,
          contentHash,
        ]
      );

      if (result.rows.length > 0) added++;
    } catch (err) {
      // Skip duplicates or other insertion errors silently
      if (err.code !== '23505') {
        console.warn(`[rss] Insert error for "${headline.slice(0, 60)}": ${err.message}`);
      }
    }
  }

  return added;
}
