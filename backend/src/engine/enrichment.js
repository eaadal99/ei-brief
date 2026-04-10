/**
 * AI Enrichment — uses Claude to enrich articles with:
 *   - Sector classification (if not already set by RSS source)
 *   - 2-line professional summary
 *   - Geography detection
 *
 * Processes articles in batches to stay within rate limits.
 */

import { completeJSON, isAvailable } from '../lib/ai-client.js';
import { query } from '../lib/db.js';

const BATCH_SIZE = 10; // articles per AI call

const VALID_SECTORS = [
  'nuclear', 'oil_gas', 'wind', 'solar', 'hydrogen', 'mining',
  'ccus', 'carbon_markets', 'bess', 'data_centres', 'grid_infrastructure',
  'ppa', 'general',
];

const VALID_GEOGRAPHIES = [
  'UK', 'EU', 'US', 'Middle East', 'Asia Pacific', 'Africa', 'Americas', 'Global',
];

/**
 * Enrich articles that have no AI-generated summary (summary is just the RSS snippet).
 * We check for articles with no geography set — that's our "not yet enriched" marker.
 */
export async function enrichArticles() {
  if (!isAvailable()) {
    console.log('[enrich] No AI provider — skipping enrichment');
    return;
  }

  const result = await query(
    `SELECT id, headline, summary, sector, source_name
     FROM articles
     WHERE geography IS NULL
     ORDER BY fetched_at DESC
     LIMIT 50`
  );

  const articles = result.rows;
  if (articles.length === 0) {
    console.log('[enrich] No articles to enrich');
    return;
  }

  console.log(`[enrich] Enriching ${articles.length} articles...`);

  // Process in batches
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    await enrichBatch(batch);
  }

  console.log('[enrich] Done');
}

async function enrichBatch(articles) {
  const articleList = articles.map((a, idx) =>
    `${idx + 1}. "${a.headline}" (source: ${a.source_name}, current sector: ${a.sector || 'unknown'})\n   Snippet: ${(a.summary || '').slice(0, 200)}`
  ).join('\n\n');

  const response = await completeJSON({
    system: `You are an energy sector analyst. For each article, provide:
1. sector: The most relevant sector from this list: ${VALID_SECTORS.join(', ')}
2. geography: The primary geography from: ${VALID_GEOGRAPHIES.join(', ')}
3. summary: A concise 2-sentence professional summary suitable for a law firm's energy intelligence briefing.

Respond with a JSON array of objects: [{ "index": 1, "sector": "...", "geography": "...", "summary": "..." }, ...]`,
    user: `Classify and summarise these energy news articles:\n\n${articleList}`,
    maxTokens: 3000,
    temperature: 0.2,
  });

  if (!Array.isArray(response)) {
    console.warn('[enrich] AI returned non-array response');
    return;
  }

  for (const item of response) {
    const article = articles[item.index - 1];
    if (!article) continue;

    const sector = VALID_SECTORS.includes(item.sector) ? item.sector : article.sector;
    const geography = VALID_GEOGRAPHIES.includes(item.geography) ? item.geography : 'Global';
    const summary = typeof item.summary === 'string' && item.summary.length > 10
      ? item.summary
      : article.summary;

    try {
      await query(
        `UPDATE articles SET sector = $1, geography = $2, summary = $3 WHERE id = $4`,
        [sector, geography, summary, article.id]
      );
    } catch (err) {
      console.warn(`[enrich] Update failed for ${article.id}: ${err.message}`);
    }
  }
}
