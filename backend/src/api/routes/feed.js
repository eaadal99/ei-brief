/**
 * Feed routes — personal feed, all news, feedback.
 *
 * GET  /feed          — personal feed (filtered by user preferences, scored by team feedback)
 * GET  /feed/all      — all articles (unfiltered, paginated)
 * POST /feed/feedback — record relevant/not_relevant, update source quality, return next article
 * POST /feed/save/:id — toggle save/unsave an article
 *
 * Ranking formula (personal feed):
 *   score = epoch_hours + global_votes * 10 + (source_quality - 0.5) * 20
 *
 * This keeps recency dominant while letting popular articles (+10h per vote)
 * and quality sources (+10h bonus for 100% relevant) rise in the feed.
 */

import express from 'express';
import { query } from '../../lib/db.js';

const router = express.Router();

// ── GET /feed — personal feed ─────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    // Load user preferences
    const prefsResult = await query(
      'SELECT key, value FROM user_preferences WHERE user_id = $1',
      [userId]
    );
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

    // Build dynamic query
    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

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

    // Keyword include filter (strict mode: require a keyword match)
    if (strictness === 'strict' && keywordsInclude.length > 0) {
      const includePattern = keywordsInclude.join('|');
      conditions.push(`(a.headline ~* $${paramIdx} OR a.summary ~* $${paramIdx})`);
      params.push(includePattern);
      paramIdx++;
    }

    // Exclude articles user already gave feedback on
    conditions.push(`a.id NOT IN (SELECT article_id FROM user_feedback WHERE user_id = $${paramIdx})`);
    params.push(userId);
    paramIdx++;

    // is_saved check param index
    const savedParamIdx = paramIdx;
    params.push(userId);
    paramIdx++;

    const sql = `
      SELECT
        a.id, a.headline, a.url, a.summary, a.source_name, a.source_key,
        a.sector, a.geography, a.published_at, a.fetched_at,
        EXISTS(
          SELECT 1 FROM user_saved_articles usa
          WHERE usa.article_id = a.id AND usa.user_id = $${savedParamIdx}
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
      WHERE ${conditions.join(' AND ')}
      ORDER BY (
        EXTRACT(EPOCH FROM COALESCE(a.published_at, a.fetched_at)) / 3600.0
        + COALESCE(scores.global_score, 0) * 10.0
        + (COALESCE(rs.quality_score, 0.5) - 0.5) * 20.0
      ) DESC
      LIMIT 50
    `;

    const result = await query(sql, params);
    return res.json({ articles: result.rows });
  } catch (err) {
    console.error('[feed] Error loading personal feed:', err.message);
    return res.status(500).json({ error: 'Failed to load feed' });
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
