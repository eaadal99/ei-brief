/**
 * Newsletter routes — generate, preview, download, archive.
 *
 * POST /newsletter/generate  — generate newsletter from selected articles
 * GET  /newsletter/archive   — list past newsletters
 * GET  /newsletter/archive/:id — get a specific archived newsletter
 */

import express from 'express';
import { query } from '../../lib/db.js';
import { generateNewsletter } from '../../engine/newsletter-gen.js';

const router = express.Router();

// POST /newsletter/generate
router.post('/generate', async (req, res) => {
  try {
    const { article_ids, title } = req.body;
    if (!article_ids || !Array.isArray(article_ids) || article_ids.length === 0) {
      return res.status(400).json({ error: 'article_ids array is required' });
    }

    // Fetch the selected articles
    const articlesResult = await query(
      `SELECT id, headline, url, summary, source_name, sector, geography, published_at
       FROM articles
       WHERE id = ANY($1)
       ORDER BY sector, published_at DESC`,
      [article_ids]
    );

    if (articlesResult.rows.length === 0) {
      return res.status(404).json({ error: 'No articles found' });
    }

    // Load newsletter config for section grouping
    const configResult = await query(
      'SELECT * FROM newsletter_config WHERE active = true ORDER BY display_order'
    );

    // Generate the newsletter via AI
    const newsletter = await generateNewsletter({
      articles: articlesResult.rows,
      config: configResult.rows,
      title: title || `E&I Brief — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    });

    // Archive it
    const archiveResult = await query(
      `INSERT INTO newsletter_archive (title, html_content, article_ids)
       VALUES ($1, $2, $3)
       RETURNING id, title, generated_at`,
      [newsletter.title, newsletter.html, article_ids]
    );

    return res.json({
      success: true,
      newsletter: {
        id: archiveResult.rows[0].id,
        title: newsletter.title,
        html: newsletter.html,
        generated_at: archiveResult.rows[0].generated_at,
      },
    });
  } catch (err) {
    console.error('[newsletter] Generate error:', err.message);
    return res.status(500).json({ error: 'Failed to generate newsletter' });
  }
});

// GET /newsletter/archive
router.get('/archive', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, title, generated_at, array_length(article_ids, 1) AS article_count
       FROM newsletter_archive
       ORDER BY generated_at DESC
       LIMIT 50`
    );
    return res.json({ newsletters: result.rows });
  } catch (err) {
    console.error('[newsletter] Archive list error:', err.message);
    return res.status(500).json({ error: 'Failed to load archive' });
  }
});

// GET /newsletter/archive/:id
router.get('/archive/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM newsletter_archive WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    return res.json({ newsletter: result.rows[0] });
  } catch (err) {
    console.error('[newsletter] Archive get error:', err.message);
    return res.status(500).json({ error: 'Failed to load newsletter' });
  }
});

export default router;
