/**
 * Preferences routes — per-user settings + newsletter config.
 *
 * GET  /preferences          — all user prefs + newsletter config
 * PUT  /preferences/:key     — update a single preference
 * PUT  /preferences/newsletter/:id  — update newsletter section
 * POST /preferences/newsletter      — add newsletter section
 * DELETE /preferences/newsletter/:id — remove newsletter section
 */

import express from 'express';
import { query } from '../../lib/db.js';

const router = express.Router();

// GET /preferences
router.get('/', async (req, res) => {
  try {
    const prefsResult = await query(
      'SELECT key, value FROM user_preferences WHERE user_id = $1',
      [req.userId]
    );
    const prefs = {};
    prefsResult.rows.forEach(r => { prefs[r.key] = r.value; });

    const newsletterResult = await query(
      'SELECT * FROM newsletter_config ORDER BY display_order'
    );

    return res.json({
      preferences: prefs,
      newsletter_config: newsletterResult.rows,
    });
  } catch (err) {
    console.error('[prefs] Error loading:', err.message);
    return res.status(500).json({ error: 'Failed to load preferences' });
  }
});

// PUT /preferences/:key
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    // Don't allow overwriting newsletter routes
    if (key === 'newsletter') {
      return res.status(400).json({ error: 'Use /preferences/newsletter endpoints' });
    }

    await query(
      `INSERT INTO user_preferences (user_id, key, value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, key) DO UPDATE
         SET value = $3, updated_at = NOW()`,
      [req.userId, key, JSON.stringify(value)]
    );

    return res.json({ success: true, key, value });
  } catch (err) {
    console.error('[prefs] Error saving:', err.message);
    return res.status(500).json({ error: 'Failed to save preference' });
  }
});

// PUT /preferences/newsletter/:id
router.put('/newsletter/:id', async (req, res) => {
  try {
    const { practice_area, sector_keys, display_order, active } = req.body;
    await query(
      `UPDATE newsletter_config
       SET practice_area = COALESCE($1, practice_area),
           sector_keys = COALESCE($2, sector_keys),
           display_order = COALESCE($3, display_order),
           active = COALESCE($4, active)
       WHERE id = $5`,
      [practice_area, sector_keys, display_order, active, req.params.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[prefs] Newsletter update error:', err.message);
    return res.status(500).json({ error: 'Failed to update newsletter config' });
  }
});

// POST /preferences/newsletter
router.post('/newsletter', async (req, res) => {
  try {
    const { practice_area, sector_keys, display_order } = req.body;
    if (!practice_area || !practice_area.trim()) {
      return res.status(400).json({ error: 'practice_area is required' });
    }
    const result = await query(
      `INSERT INTO newsletter_config (practice_area, sector_keys, display_order)
       VALUES ($1, $2, $3) RETURNING *`,
      [practice_area.trim(), sector_keys || [], display_order || 99]
    );
    return res.json({ success: true, config: result.rows[0] });
  } catch (err) {
    console.error('[prefs] Newsletter add error:', err.message);
    return res.status(500).json({ error: 'Failed to add newsletter config' });
  }
});

// DELETE /preferences/newsletter/:id
router.delete('/newsletter/:id', async (req, res) => {
  try {
    await query('DELETE FROM newsletter_config WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[prefs] Newsletter delete error:', err.message);
    return res.status(500).json({ error: 'Failed to delete newsletter config' });
  }
});

export default router;
