/**
 * GDELT DOC 2.0 Fetcher
 *
 * Queries the GDELT Document 2.0 API for energy-sector articles published in
 * the last 48 hours. No API key required — fully free and unlimited.
 *
 * Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 *
 * One query per sector keyword group. Results are inserted into the articles
 * table with source_key = 'gdelt'. Sector/summary are left null so the
 * enrichment pipeline can classify them via AI (matching existing RSS behaviour).
 */

import { query } from '../lib/db.js';

// Energy keyword queries per sector — broad enough to catch major stories.
const SECTOR_QUERIES = {
  nuclear: 'nuclear power OR nuclear energy OR nuclear reactor OR nuclear plant',
  oil_gas: 'oil gas petroleum LNG OR "natural gas" OR crude oil',
  wind: '"wind energy" OR "wind power" OR "offshore wind" OR "onshore wind"',
  solar: '"solar energy" OR "solar power" OR photovoltaic OR "solar farm"',
  hydrogen: '"green hydrogen" OR "blue hydrogen" OR "hydrogen fuel" OR "hydrogen energy"',
  mining: '"lithium mining" OR "copper mining" OR "battery minerals" OR "critical minerals"',
  ccus: '"carbon capture" OR CCUS OR "carbon sequestration" OR "CCS"',
  bess: '"battery storage" OR "energy storage" OR BESS OR "grid storage"',
  grid_infrastructure: '"power grid" OR "electricity grid" OR "transmission infrastructure" OR "grid investment"',
  carbon_markets: '"carbon credits" OR "emissions trading" OR "carbon market" OR "ETS"',
  ppa: '"power purchase agreement" OR "PPA" renewable',
  data_centres: '"data centre energy" OR "data center power" OR "AI energy" OR "hyperscale power"',
};

/**
 * Format a Date as YYYYMMDDHHMMSS for GDELT query params.
 */
function gdeltDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
}

/**
 * Extract a clean domain label from a URL (e.g. "reuters.com").
 */
function domainFrom(url) {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Fetch energy articles from GDELT DOC 2.0 for all configured sectors.
 * @returns {{ added: number }}
 */
export async function fetchGdelt() {
  const now = new Date();
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000); // last 48h
  const end = gdeltDate(now);
  const start = gdeltDate(since);

  let totalAdded = 0;
  const errors = [];

  for (const [sector, keywords] of Object.entries(SECTOR_QUERIES)) {
    try {
      // Build GDELT query: English only, article list mode
      const qs = new URLSearchParams({
        query: `(${keywords}) sourcelang:english`,
        mode: 'artlist',
        maxrecords: '250',
        format: 'json',
        startdatetime: start,
        enddatetime: end,
      });

      const url = `https://api.gdeltproject.org/api/v2/doc/doc?${qs.toString()}`;
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'EIBrief/1.0 NewsAggregator' },
      });

      if (!resp.ok) {
        errors.push(`[gdelt] ${sector}: HTTP ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const articles = data?.articles ?? [];

      for (const art of articles) {
        const articleUrl = art.url;
        const headline = (art.title || '').trim();
        if (!headline || !articleUrl) continue;

        const sourceName = domainFrom(articleUrl);
        // Parse GDELT date format: "20260417T130000Z"
        let publishedAt = null;
        if (art.seendate) {
          try {
            // Format: YYYYMMDDTHHMMSSZ
            const raw = art.seendate;
            publishedAt = new Date(
              `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}Z`
            );
          } catch { /* leave null */ }
        }

        try {
          const result = await query(
            `INSERT INTO articles (headline, url, source_name, source_key, published_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (url) DO NOTHING
             RETURNING id`,
            [headline, articleUrl, sourceName, 'gdelt', publishedAt]
          );
          if (result.rows.length > 0) totalAdded++;
        } catch (err) {
          if (err.code !== '23505') {
            // Ignore unique constraint violations silently
            console.warn(`[gdelt] Insert error: ${err.message}`);
          }
        }
      }
    } catch (err) {
      errors.push(`${sector}: ${err.message}`);
      console.warn(`[gdelt] ${sector} fetch failed: ${err.message}`);
    }
  }

  console.log(`[gdelt] Done: ${totalAdded} new articles`);
  if (errors.length > 0) console.warn(`[gdelt] ${errors.length} sector(s) had errors`);
  return { added: totalAdded };
}
