/**
 * Digest route — personalised AI-generated sector briefing.
 *
 * GET /digest        — return cached or freshly generated digest
 * GET /digest?force=1 — force regeneration (bypass 6h cache)
 *
 * For each of the user's preferred sectors (max 6), fetches the top
 * articles from the last 48h and calls Claude to write a 2-3 sentence
 * expert summary. Results are cached per user in user_digests (6h TTL).
 */

import express from 'express';
import { query } from '../../lib/db.js';
import { complete, isAvailable } from '../../lib/ai-client.js';

const router = express.Router();

const SECTOR_LABELS = {
  nuclear: 'Nuclear',
  oil_gas: 'Oil & Gas',
  wind: 'Wind',
  solar: 'Solar',
  hydrogen: 'Hydrogen',
  mining: 'Mining',
  ccus: 'CCUS',
  carbon_markets: 'Carbon Markets',
  bess: 'Storage',
  data_centres: 'Data Centres',
  grid_infrastructure: 'Grid Infrastructure',
  ppa: 'PPAs',
  general: 'General',
};

const DEFAULT_SECTORS = [
  'nuclear', 'oil_gas', 'wind', 'solar', 'hydrogen',
  'mining', 'ccus', 'bess', 'grid_infrastructure',
];

// ── GET /digest ───────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const force = req.query.force === '1';

    // Return cached digest if fresh (< 6h) and force not requested
    if (!force) {
      const cached = await query(
        `SELECT digest_json, generated_at
         FROM user_digests
         WHERE user_id = $1 AND generated_at > NOW() - INTERVAL '6 hours'`,
        [userId]
      );
      if (cached.rows.length > 0) {
        return res.json({
          ...cached.rows[0].digest_json,
          generated_at: cached.rows[0].generated_at,
          cached: true,
        });
      }
    }

    // Load user's preferred sectors
    const prefsResult = await query(
      `SELECT value FROM user_preferences WHERE user_id = $1 AND key = 'sectors_included'`,
      [userId]
    );
    let sectors = prefsResult.rows[0]?.value;
    if (!Array.isArray(sectors) || sectors.length === 0) {
      sectors = DEFAULT_SECTORS;
    }
    sectors = sectors.slice(0, 6); // max 6 sections per digest

    // Build sections in parallel (one AI call per sector with ≥ 2 articles)
    const sectionPromises = sectors.map(async (sector) => {
      const articles = await query(
        `SELECT id, headline, url, source_name, published_at, summary
         FROM articles
         WHERE sector = $1
           AND (
             published_at > NOW() - INTERVAL '48 hours'
             OR fetched_at > NOW() - INTERVAL '48 hours'
           )
         ORDER BY COALESCE(published_at, fetched_at) DESC
         LIMIT 5`,
        [sector]
      );

      if (articles.rows.length < 2) return null; // skip sparse sectors

      const label = SECTOR_LABELS[sector] || sector;
      const headlines = articles.rows
        .map((a, i) => `${i + 1}. ${a.headline}`)
        .join('\n');

      let summary = null;
      if (isAvailable()) {
        summary = await complete({
          system:
            'You are a senior energy industry analyst writing a concise morning brief for expert professionals. ' +
            'Be specific, factual, and authoritative. No filler phrases like "In recent news" or "It is worth noting". ' +
            'Write in present tense. Maximum 3 sentences.',
          user: `Summarise these ${label} headlines for an expert audience:\n\n${headlines}`,
          maxTokens: 180,
          temperature: 0.2,
        });
      }

      return {
        sector,
        label,
        summary: summary || `${articles.rows.length} ${label} stories in the last 48 hours.`,
        articles: articles.rows.map(a => ({
          id: a.id,
          headline: a.headline,
          url: a.url,
          source_name: a.source_name,
          published_at: a.published_at,
        })),
      };
    });

    const sectionResults = await Promise.all(sectionPromises);
    const sections = sectionResults.filter(Boolean);

    const digest = {
      sections,
      generated_at: new Date().toISOString(),
      cached: false,
    };

    // Upsert into cache
    await query(
      `INSERT INTO user_digests (user_id, generated_at, digest_json)
       VALUES ($1, NOW(), $2)
       ON CONFLICT (user_id) DO UPDATE
         SET generated_at = NOW(), digest_json = $2`,
      [userId, JSON.stringify(digest)]
    );

    return res.json(digest);
  } catch (err) {
    console.error('[digest] Error generating digest:', err.message);
    return res.status(500).json({ error: 'Failed to generate digest' });
  }
});

export default router;
