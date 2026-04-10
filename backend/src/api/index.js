/**
 * E&I Brief — Express API server.
 *
 * Layers:
 *   1. CORS
 *   2. Health check (public)
 *   3. Team password gate
 *   4. API key check
 *   5. Auth routes (verify-team, users)
 *   6. User context (attach userId)
 *   7. All other routes
 */

import 'dotenv/config';
import express from 'express';
import { pool, query } from '../lib/db.js';
import { requireApiKey } from './middleware/auth.js';
import { requireTeamAuth } from './middleware/team-auth.js';
import { attachUser } from './middleware/user-context.js';
import authRouter from './routes/auth.js';
import feedRouter from './routes/feed.js';
import articlesRouter from './routes/articles.js';
import preferencesRouter from './routes/preferences.js';
import sourcesRouter from './routes/sources.js';
import newsletterRouter from './routes/newsletter.js';
import systemRouter from './routes/system.js';
import { startScheduler, stopScheduler } from '../scheduler/index.js';
import RSS_CATALOG from '../lib/rss-catalog.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Startup validation
if (!process.env.API_KEY) console.warn('[startup] API_KEY not set — API key auth disabled');
if (!process.env.ANTHROPIC_API_KEY) console.warn('[startup] ANTHROPIC_API_KEY not set — AI features disabled');

// ── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = origin && (
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.includes('vercel.app') ||
    ALLOWED_ORIGINS_ENV.includes(origin)
  );

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-user-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '5mb' }));

// ── Health check (public — no auth) ─────────────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// ── Team password gate ──────────────────────────────────────────────────────

app.use(requireTeamAuth);

// ── API key check ───────────────────────────────────────────────────────────

app.use('/api/v1', requireApiKey);

// ── Auth routes (before user context — creating a user happens before identity) ─

app.use('/api/v1/auth', authRouter);

// ── User context ────────────────────────────────────────────────────────────

app.use('/api/v1', attachUser);

// ── All other routes ────────────────────────────────────────────────────────

app.use('/api/v1/feed', feedRouter);
app.use('/api/v1/articles', articlesRouter);
app.use('/api/v1/preferences', preferencesRouter);
app.use('/api/v1/sources', sourcesRouter);
app.use('/api/v1/newsletter', newsletterRouter);
app.use('/api/v1/system', systemRouter);

// ── Error handler ───────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
});

// ── Start server ────────────────────────────────────────────────────────────

const server = app.listen(PORT, async () => {
  console.log('');
  console.log('=== E&I Brief ===');
  console.log(`API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);

  // Seed built-in RSS sources (safe to re-run — skips duplicates)
  try {
    let seeded = 0;
    for (const source of RSS_CATALOG) {
      const result = await query(
        `INSERT INTO rss_sources (name, rss_url, sector)
         VALUES ($1, $2, $3)
         ON CONFLICT (rss_url) DO NOTHING
         RETURNING id`,
        [source.name, source.rss_url, source.sector]
      );
      if (result.rows.length > 0) seeded++;
    }
    console.log(`[rss-seed] ${seeded} new sources added, ${RSS_CATALOG.length - seeded} already present`);
  } catch (err) {
    console.error('[rss-seed] Failed:', err.message);
  }

  // Start scheduler
  startScheduler();

  console.log('=== Ready ===');
  console.log('');
});

// ── Graceful shutdown ───────────────────────────────────────────────────────

function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down...`);
  stopScheduler();
  server.close(async () => {
    await pool.end();
    console.log('E&I Brief stopped.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
