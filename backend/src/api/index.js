/**
 * E&I Brief — Express API server.
 *
 * Layers:
 *   1. CORS
 *   2. Health check (public)
 *   3. API key check
 *   4. POST /auth/login (public — no JWT needed)
 *   5. JWT auth (all other /api/v1 routes)
 *   6. Feature routes
 */

import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import { pool, query } from '../lib/db.js';
import { requireApiKey, requireJwtAuth } from './middleware/auth.js';
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
if (!process.env.JWT_SECRET) console.warn('[startup] JWT_SECRET not set — using insecure dev default');
if (!process.env.API_KEY) console.warn('[startup] API_KEY not set — API key auth disabled');
if (!process.env.ANTHROPIC_API_KEY) console.warn('[startup] ANTHROPIC_API_KEY not set — AI features disabled');

// ── CORS ─────────────────────────────────────────────────────────────────────

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
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

// ── API key check ────────────────────────────────────────────────────────────

app.use('/api/v1', requireApiKey);

// ── Public auth route: login (no JWT required) ───────────────────────────────

app.use('/api/v1/auth', authRouter);

// ── JWT auth: all remaining routes require a valid token ─────────────────────

app.use('/api/v1', requireJwtAuth);

// ── Feature routes ───────────────────────────────────────────────────────────

app.use('/api/v1/feed', feedRouter);
app.use('/api/v1/articles', articlesRouter);
app.use('/api/v1/preferences', preferencesRouter);
app.use('/api/v1/sources', sourcesRouter);
app.use('/api/v1/newsletter', newsletterRouter);
app.use('/api/v1/system', systemRouter);

// ── Error handler ────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
});

// ── Start server ─────────────────────────────────────────────────────────────

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

  // Seed admin user if env vars provided and no admin exists yet
  if (process.env.SEED_ADMIN_NAME && process.env.SEED_ADMIN_PASSWORD) {
    try {
      const existing = await query(`SELECT id FROM users WHERE is_admin = true LIMIT 1`);
      if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 10);
        await query(
          `INSERT INTO users (name, display_name, password_hash, is_admin)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (name) DO UPDATE
             SET password_hash = EXCLUDED.password_hash,
                 is_admin = true`,
          [
            process.env.SEED_ADMIN_NAME.trim().toLowerCase(),
            process.env.SEED_ADMIN_NAME.trim(),
            hash,
          ]
        );
        console.log(`[admin-seed] Admin user '${process.env.SEED_ADMIN_NAME}' created`);
      }
    } catch (err) {
      console.error('[admin-seed] Failed:', err.message);
    }
  }

  // Start scheduler
  startScheduler();

  console.log('=== Ready ===');
  console.log('');
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

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
