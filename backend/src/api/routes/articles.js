/**
 * Articles routes — saved/bookmarked articles.
 *
 * GET /articles/saved — list user's saved articles
 */

import express from 'express';
import { query } from '../../lib/db.js';

const router = express.Router();

// GET /articles/saved
router.get('/saved', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.headline, a.url, a.summary, a.source_name, a.source_key,
              a.sector, a.geography, a.published_at, a.fetched_at,
              usa.saved_at, true AS is_saved
       FROM user_saved_articles usa
       JOIN articles a ON a.id = usa.article_id
       WHERE usa.user_id = $1
       ORDER BY usa.saved_at DESC`,
      [req.userId]
    );

    return res.json({ articles: result.rows });
  } catch (err) {
    console.error('[articles] Error loading saved:', err.message);
    return res.status(500).json({ error: 'Failed to load saved articles' });
  }
});

export default router;
