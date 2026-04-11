/**
 * Auth middleware — API key check + JWT user authentication.
 *
 * requireApiKey: validates x-api-key header (server-level access control)
 * requireJwtAuth: validates Bearer JWT, attaches req.userId + req.isAdmin
 */

import jwt from 'jsonwebtoken';
import { query } from '../../lib/db.js';

// ── API key check ────────────────────────────────────────────────────────────

export function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  const expected = process.env.API_KEY;

  if (!expected) {
    // No key configured — allow all (dev convenience)
    return next();
  }

  if (key === expected) {
    return next();
  }

  return res.status(401).json({ error: 'Invalid or missing API key' });
}

// ── JWT auth ─────────────────────────────────────────────────────────────────

export function requireJwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorisation token' });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.warn('[auth] JWT_SECRET not set — auth disabled in dev mode');
    req.userId = null;
    req.isAdmin = false;
    return next();
  }

  try {
    const payload = jwt.verify(token, secret);
    req.userId = payload.userId;
    req.isAdmin = payload.isAdmin || false;
    req.userName = payload.name;

    // Fire-and-forget last_active update
    query('UPDATE users SET last_active = NOW() WHERE id = $1', [payload.userId])
      .catch(err => console.warn('[auth] last_active update failed:', err.message));

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
