/**
 * Feed routes — personal feed, all news, feedback.
 *
 * GET  /feed          — personal feed (filtered by user preferences, scored by team feedback)
 * GET  /feed/all      — all articles (unfiltered, paginated)
 * POST /feed/feedback — record relevant/not_relevant, update source quality, return next article
 * POST /feed/save/:id — toggle save/unsave an article
 *
 * Ranking formula (personal feed):
 *   score = epoch_hours
 *         + global_votes * 10          (crowd signal)
 *         + (source_quality - 0.5) * 20 (source trust)
 *         + sector_affinity * 15        (personalised: sectors user rates relevant)
 *         + keyword_match * 5           (personalised: keywords from liked articles)
 */

import express from 'express';
import { query } from '../../lib/db.js';

// ── Stop words for keyword extraction ────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was',
  'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may',
  'now', 'old', 'see', 'two', 'who', 'did', 'let', 'put', 'say', 'she', 'too',
  'use', 'this', 'that', 'with', 'have', 'from', 'they', 'will', 'been', 'said',
  'each', 'which', 'their', 'time', 'also', 'into', 'just', 'more', 'than',
  'then', 'when', 'there', 'your', 'could', 'about', 'would', 'other', 'these',
  'some', 'what', 'were', 'over', 'such', 'here', 'after', 'many', 'most',
  'well', 'even', 'back', 'come', 'good', 'like', 'look', 'make', 'need',
  'only', 'open', 'same', 'seem', 'take', 'want', 'year', 'plan', 'says',
  'amid', 'deal', 'show', 'work', 'part', 'last', 'high', 'much', 'long',
  'news', 'first', 'still', 'both', 'next', 'turn', 'home', 'move', 'live',
  'give', 'help', 'keep', 'meet', 'play', 'raise', 'rise', 'risk', 'side',
  'team', 'told', 'used', 'been', 'also', 'into', 'amid', 'adds', 'says',
  'sets', 'sees', 'hits', 'gets', 'cuts', 'puts', 'runs', 'wins', 'loss',
  'gain', 'fall', 'drop', 'push', 'pull', 'call', 'hold', 'seek', 'sign',
  'face', 'grow', 'near', 'base', 'move', 'aims', 'unit', 'firm', 'data',
]);

/**
 * Fetch last 50 relevant article headlines/summaries for a user and extract
 * the top 15 most-frequent meaningful words as a regex alternation pattern.
 * Returns null if the user has no feedback history.
 */
async function getUserKeywordPattern(userId) {
  const result = await query(
    `SELECT a.headline, a.summary
     FROM user_feedback uf
     JOIN articles a ON uf.article_id = a.id
     WHERE uf.user_id = $1 AND uf.feedback = 'relevant'
     ORDER BY uf.created_at DESC
     LIMIT 50`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const wordFreq = {};
  for (const row of result.rows) {
    const text = `${row.headline || ''} ${row.summary || ''}`.toLowerCase();
    const words = text.match(/\b[a-z]{4,}\b/g) || [];
    for (const word of words) {
      if (!STOP_WORDS.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
  }

  const topKeywords = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([w]) => w);

  return topKeywords.length > 0 ? topKeywords.join('|') : null;
}

const router = express.Router();

// ── GET /feed — personal feed ─────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    // Load user preferences + keyword pattern in parallel
    const [prefsResult, kwPattern] = await Promise.all([
      query('SELECT key, value FROM user_preferences WHERE user_id = $1', [userId]),
      getUserKeywordPattern(userId),
    ]);

    const prefs = {};
    prefsResult.rows.forEach(r => { prefs[r.key] = r.value; });

    const sectors = Array.isArray(prefs.sectors_included) && prefs.sectors_included.length > 0
      ? prefs.sectors_included
      : null;
    const geos = Array.isArray(prefs.geographies_included) && prefs.geographies_included.length > 0
      ? prefs.geographies_included
      : null;
    const keywordsInclude = Array.isArray(prefs.keywords_include) ? prefs.keywords_include : [];
    const keywordsExclude = Array.isArray(prefs.keywords_exclude) ? prefs.keywords_exclude : [];
    const strictness = prefs.match_strictness === 'strict' ? 'strict' : 'loose';

    // $1 = userId (reused for CTE, feedback exclusion, and saved check)
    const params = [userId];
    let paramIdx = 2;

    // $2 = keyword pattern (optional — null disables the boost)
    params.push(kwPattern); // may be null; CASE WHEN null => 0 boost
    const kwParamIdx = paramIdx;
    paramIdx++;

    // Build WHERE conditions
    const conditions = ['1=1'];

    // Sector filter
    if (sectors) {
      conditions.push(`a.sector = ANY($${paramIdx})`);
      params.push(sectors);
      paramIdx++;
    }

    // Geography filter
    if (geos) {
      conditions.push(`a.geography = ANY($${paramIdx})`);
      params.push(geos);
      paramIdx++;
    }

    // Keyword exclude filter
    if (keywordsExclude.length > 0) {
      const excludePattern = keywordsExclude.join('|');
      conditions.push(`NOT (a.headline ~* $${paramIdx} OR a.summary ~* $${paramIdx})`);
      params.push(excludePattern);
      paramIdx++;
    }

    // Keyword include filter (strict mode)
    if (strictness === 'strict' && keywordsInclude.length > 0) {
      const includePattern = keywordsInclude.join('|');
      conditions.push(`(a.headline ~* $${paramIdx} OR a.summary ~* $${paramIdx})`);
      params.push(includePattern);
      paramIdx++;
    }

    // Exclude articles user already gave feedback on (reuses $1)
    conditions.push(`a.id NOT IN (SELECT article_id FROM user_feedback WHERE user_id = $1)`);

    const sql = `
      WITH user_sector_affinity AS (
        SELECT
          a.sector,
          COUNT(CASE WHEN uf.feedback = 'relevant' THEN 1 END)::float
          / NULLIF(COUNT(*), 0) AS affinity
        FROM user_feedback uf
        JOIN articles a ON uf.article_id = a.id
        WHERE uf.user_id = $1
        GROUP BY a.sector
      )
      SELECT
        a.id, a.headline, a.url, a.summary, a.source_name, a.source_key,
        a.sector, a.geography, a.published_at, a.fetched_at,
        EXISTS(
          SELECT 1 FROM user_saved_articles usa
          WHERE usa.article_id = a.id AND usa.user_id = $1
        ) AS is_saved,
        COALESCE(scores.global_score, 0) AS global_score
      FROM articles a
      LEFT JOIN (
        SELECT article_id,
          (COUNT(*) FILTER (WHERE feedback = 'relevant'))::int -
          (COUNT(*) FILTER (WHERE feedback = 'not_relevant'))::int AS global_score
        FROM user_feedback
        GROUP BY article_id
      ) scores ON a.id = scores.article_id
      LEFT JOIN rss_sources rs ON a.source_key = rs.id::text
      LEFT JOIN user_sector_affinity sa ON a.sector = sa.sector
      WHERE ${conditions.join(' AND ')}
      ORDER BY (
        EXTRACT(EPOCH FROM COALESCE(a.published_at, a.fetched_at)) / 3600.0
        + COALESCE(scores.global_score, 0) * 10.0
        + (COALESCE(rs.quality_score, 0.5) - 0.5) * 20.0
        + COALESCE(sa.affinity, 0) * 15.0
        + CASE
            WHEN $${kwParamIdx} IS NOT NULL
             AND (a.headline ~* $${kwParamIdx} OR a.summary ~* $${kwParamIdx})
            THEN 5.0
            ELSE 0.0
          END
      ) DESC
      LIMIT 50
    `;

    const result = await query(sql, params);
    return res.json({ articles: result.rows });
  } catch (err) {
    console.error('[feed] Error loading personal feed:', err);
    console.error('[feed] Stack:', err.stack);
    return res.status(500).json({
      error: 'Failed to load feed',
      detail: err.message,
      code: err.code,
    });
  }
});

// ── GET /feed/all — all articles ──────────────────────────────────────────────

router.get('/all', async (req, res) => {
  try {
    const { sector, geography, search, limit = '100', offset = '0' } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    if (sector && sector !== 'all') {
      conditions.push(`sector = $${paramIdx}`);
      params.push(sector);
      paramIdx++;
    }

    if (geography && geography !== 'all') {
      conditions.push(`geography = $${paramIdx}`);
      params.push(geography);
      paramIdx++;
    }

    if (search) {
      conditions.push(`(headline ILIKE $${paramIdx} OR summary ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const userId = req.userId;
    const sql = `
      SELECT a.id, a.headline, a.url, a.summary, a.source_name, a.source_key,
             a.sector, a.geography, a.published_at, a.fetched_at,
             EXISTS(SELECT 1 FROM user_saved_articles usa WHERE usa.article_id = a.id AND usa.user_id = $${paramIdx}) AS is_saved
      FROM articles a
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.published_at DESC NULLS LAST, a.fetched_at DESC
      LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}
    `;
    params.push(userId, parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, params);
    return res.json({ articles: result.rows });
  } catch (err) {
    console.error('[feed] Error loading all articles:', err.message);
    return res.status(500).json({ error: 'Failed to load articles' });
  }
});

// ── POST /feed/feedback ───────────────────────────────────────────────────────

router.post('/feedback', async (req, res) => {
  try {
    const { article_id, feedback, excluded_ids = [] } = req.body;
    if (!article_id || !['relevant', 'not_relevant'].includes(feedback)) {
      return res.status(400).json({ error: 'Invalid feedback' });
    }

    // Upsert feedback
    await query(
      `INSERT INTO user_feedback (user_id, article_id, feedback)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, article_id) DO UPDATE SET feedback = $3, created_at = NOW()`,
      [req.userId, article_id, feedback]
    );

    // Update source quality score based on all feedback for that source
    await query(
      `UPDATE rss_sources rs
       SET
         total_feedback = stats.total,
         relevant_count = stats.relevant,
         quality_score = CASE WHEN stats.total > 0
           THEN stats.relevant::float / stats.total
           ELSE 1.0
         END
       FROM (
         SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE uf.feedback = 'relevant') AS relevant
         FROM user_feedback uf
         JOIN articles a ON uf.article_id = a.id
         WHERE a.source_key = (SELECT source_key FROM articles WHERE id = $1)
       ) stats
       WHERE rs.id::text = (SELECT source_key FROM articles WHERE id = $1)`,
      [article_id]
    );

    // Get next article (not in excluded list, not already rated by this user)
    const allExcluded = [...excluded_ids, article_id];
    const next = await query(
      `SELECT a.id, a.headline, a.url, a.summary, a.source_name, a.source_key,
              a.sector, a.geography, a.published_at, a.fetched_at
       FROM articles a
       WHERE a.id != ALL($1)
         AND a.id NOT IN (SELECT article_id FROM user_feedback WHERE user_id = $2)
       ORDER BY a.published_at DESC NULLS LAST
       LIMIT 1`,
      [allExcluded, req.userId]
    );

    return res.json({
      success: true,
      next_article: next.rows[0] || null,
    });
  } catch (err) {
    console.error('[feed] Feedback error:', err.message);
    return res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// ── POST /feed/save/:id ───────────────────────────────────────────────────────

router.post('/save/:id', async (req, res) => {
  try {
    const articleId = req.params.id;
    const userId = req.userId;

    const existing = await query(
      'SELECT 1 FROM user_saved_articles WHERE user_id = $1 AND article_id = $2',
      [userId, articleId]
    );

    if (existing.rows.length > 0) {
      await query('DELETE FROM user_saved_articles WHERE user_id = $1 AND article_id = $2', [userId, articleId]);
      return res.json({ success: true, is_saved: false });
    } else {
      await query('INSERT INTO user_saved_articles (user_id, article_id) VALUES ($1, $2)', [userId, articleId]);
      return res.json({ success: true, is_saved: true });
    }
  } catch (err) {
    console.error('[feed] Save error:', err.message);
    return res.status(500).json({ error: 'Failed to save article' });
  }
});

export default router;
