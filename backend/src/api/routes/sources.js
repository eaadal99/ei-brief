/**
 * RSS source routes — CRUD for RSS feeds.
 *
 * GET    /sources         — list all sources
 * POST   /sources         — add a new RSS source
 * PUT    /sources/:id     — update (toggle enabled, rename, etc.)
 * DELETE /sources/:id     — remove a source
 */

import express from 'express';
import { query } from '../../lib/db.js';

const router = express.Router();

// GET /sources
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM rss_sources ORDER BY sector, name');
    return res.json({ sources: result.rows });
  } catch (err) {
    console.error('[sources] List error:', err.message);
    return res.status(500).json({ error: 'Failed to list sources' });
  }
});

// POST /sources
router.post('/', async (req, res) => {
  try {
    const { name, rss_url, sector } = req.body;
    if (!name || !rss_url) {
      return res.status(400).json({ error: 'name and rss_url are required' });
    }

    const result = await query(
      `INSERT INTO rss_sources (name, rss_url, sector)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), rss_url.trim(), sector || 'general']
    );

    return res.json({ success: true, source: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'RSS URL already exists' });
    }
    console.error('[sources] Add error:', err.message);
    return res.status(500).json({ error: 'Failed to add source' });
  }
});

// PUT /sources/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, rss_url, sector, enabled } = req.body;
    await query(
      `UPDATE rss_sources
       SET name = COALESCE($1, name),
           rss_url = COALESCE($2, rss_url),
           sector = COALESCE($3, sector),
           enabled = COALESCE($4, enabled)
       WHERE id = $5`,
      [name, rss_url, sector, enabled, req.params.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[sources] Update error:', err.message);
    return res.status(500).json({ error: 'Failed to update source' });
  }
});

// DELETE /sources/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM rss_sources WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[sources] Delete error:', err.message);
    return res.status(500).json({ error: 'Failed to delete source' });
  }
});

export default router;
