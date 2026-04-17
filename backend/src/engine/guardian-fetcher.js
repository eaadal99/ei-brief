/**
 * The Guardian Open Platform Fetcher
 *
 * Queries The Guardian's free Content API for energy-related articles.
 * Free tier: 5,000 requests/day — more than enough.
 *
 * Requires GUARDIAN_API_KEY in environment.
 * Register for a free key at: https://open-platform.theguardian.com/access/
 *
 * Gracefully skips if the key is absent, so the app still works without it.
 */

import { query } from '../lib/db.js';

const BASE_URL = 'https://content.guardianapis.com/search';

// Per-sector search queries targeting The Guardian's content
const SECTOR_QUERIES = {
  nuclear: 'nuclear power nuclear energy nuclear reactor',
  oil_gas: 'oil gas petroleum LNG natural gas',
  wind: 'wind energy wind power offshore wind',
  solar: 'solar energy solar power photovoltaic',
  hydrogen: 'green hydrogen hydrogen fuel hydrogen energy',
  mining: 'lithium mining copper mining critical minerals battery materials',
  ccus: 'carbon capture CCS CCUS carbon sequestration',
  bess: 'battery storage energy storage grid storage',
  grid_infrastructure: 'electricity grid power grid transmission infrastructure',
  carbon_markets: 'carbon credits emissions trading carbon market ETS',
  ppa: 'power purchase agreement PPA renewable contract',
  data_centres: 'data centre energy data center power AI compute energy',
};

/**
 * Fetch energy articles from The Guardian for all configured sectors.
 * @returns {{ added: number }}
 */
export async function fetchGuardian() {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) {
    console.log('[guardian] GUARDIAN_API_KEY not set — skipping');
    return { added: 0 };
  }

  // Query articles from the last 48 hours
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const fromDate = since.toISOString().slice(0, 10); // YYYY-MM-DD

  let totalAdded = 0;
  const errors = [];

  for (const [sector, keywords] of Object.entries(SECTOR_QUERIES)) {
    try {
      const qs = new URLSearchParams({
        q: keywords,
        'api-key': apiKey,
        'show-fields': 'trailText,publication',
        'page-size': '50',
        'from-date': fromDate,
        'order-by': 'newest',
        // Focus on sections most likely to carry energy news
        section: 'environment,business,politics,technology,world',
      });

      const resp = await fetch(`${BASE_URL}?${qs.toString()}`, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'EIBrief/1.0 NewsAggregator' },
      });

      if (!resp.ok) {
        errors.push(`${sector}: HTTP ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const results = data?.response?.results ?? [];

      for (const item of results) {
        const articleUrl = item.webUrl;
        const headline = (item.webTitle || '').trim();
        if (!headline || !articleUrl) continue;

        const summary = item.fields?.trailText
          ? item.fields.trailText.replace(/<[^>]+>/g, '').trim() // strip any HTML
          : null;

        const publishedAt = item.webPublicationDate
          ? new Date(item.webPublicationDate)
          : null;

        try {
          const result = await query(
            `INSERT INTO articles (headline, url, summary, source_name, source_key, published_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (url) DO NOTHING
             RETURNING id`,
            [headline, articleUrl, summary, 'The Guardian', 'guardian', publishedAt]
          );
          if (result.rows.length > 0) totalAdded++;
        } catch (err) {
          if (err.code !== '23505') {
            console.warn(`[guardian] Insert error: ${err.message}`);
          }
        }
      }
    } catch (err) {
      errors.push(`${sector}: ${err.message}`);
      console.warn(`[guardian] ${sector} fetch failed: ${err.message}`);
    }
  }

  console.log(`[guardian] Done: ${totalAdded} new articles`);
  if (errors.length > 0) console.warn(`[guardian] ${errors.length} sector(s) had errors`);
  return { added: totalAdded };
}
