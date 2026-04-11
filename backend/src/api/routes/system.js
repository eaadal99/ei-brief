/**
 * System routes — health, status, manual run trigger.
 *
 * GET  /system/status  — overall system health + stats
 * POST /system/run     — trigger a manual RSS fetch + enrichment
 */

import express from 'express';
import { query, pool } from '../../lib/db.js';
import { isAvailable as aiAvailable, getProvider, getUsageStats } from '../../lib/ai-client.js';
import { fetchAllSources } from '../../engine/rss-fetcher.js';

const router = express.Router();

// Track run state
let runState = {
  running: false,
  lastRun: null,
  lastDuration: null,
  lastError: null,
  articlesAdded: 0,
};

// GET /system/status
router.get('/status', async (req, res) => {
  try {
    // Database check
    let dbStatus = 'disconnected';
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch { /* keep disconnected */ }

    // Article stats
    const statsResult = await query(`
      SELECT
        COUNT(*) AS total_articles,
        COUNT(*) FILTER (WHERE fetched_at > NOW() - INTERVAL '24 hours') AS articles_24h,
        COUNT(*) FILTER (WHERE fetched_at > NOW() - INTERVAL '7 days') AS articles_7d,
        COUNT(DISTINCT sector) AS sectors_represented
      FROM articles
    `);
    const stats = statsResult.rows[0];

    // Source stats
    const sourcesResult = await query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE enabled = true) AS enabled
      FROM rss_sources
    `);
    const sources = sourcesResult.rows[0];

    // User count
    const userResult = await query(
      `SELECT COUNT(*) AS count FROM users WHERE name != 'default'`
    );

    return res.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      database: dbStatus,
      ai: { available: aiAvailable(), provider: getProvider(), usage: getUsageStats() },
      articles: {
        total: parseInt(stats.total_articles, 10),
        last_24h: parseInt(stats.articles_24h, 10),
        last_7d: parseInt(stats.articles_7d, 10),
        sectors: parseInt(stats.sectors_represented, 10),
      },
      sources: {
        total: parseInt(sources.total, 10),
        enabled: parseInt(sources.enabled, 10),
      },
      users: parseInt(userResult.rows[0].count, 10),
      run: runState,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[system] Status error:', err.message);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// GET /system/users — list all users (admin only)
router.get('/users', async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  try {
    const result = await query(
      `SELECT id, name, display_name, is_admin, last_active, created_at
       FROM users WHERE name != 'default' ORDER BY created_at`
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('[system] list users error:', err.message);
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

// POST /system/run — manual trigger
router.post('/run', async (req, res) => {
  if (runState.running) {
    return res.status(409).json({ error: 'A run is already in progress' });
  }

  runState.running = true;
  runState.lastError = null;
  res.json({ success: true, message: 'Run started' });

  // Run in background
  const t0 = Date.now();
  try {
    const result = await fetchAllSources();
    runState = {
      running: false,
      lastRun: new Date().toISOString(),
      lastDuration: Date.now() - t0,
      lastError: null,
      articlesAdded: result.articlesAdded,
    };
    console.log(`[system] Manual run complete: ${result.articlesAdded} articles added in ${Date.now() - t0}ms`);
  } catch (err) {
    runState = {
      running: false,
      lastRun: new Date().toISOString(),
      lastDuration: Date.now() - t0,
      lastError: err.message,
      articlesAdded: 0,
    };
    console.error('[system] Manual run failed:', err.message);
  }
});

export default router;
