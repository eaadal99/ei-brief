/**
 * Attaches req.userId and req.userName from the x-user-id header.
 *
 * The header can be a UUID (preferred) or a user name.
 * Falls back to the 'default' user if missing or unknown.
 */

import { query } from '../../lib/db.js';

let defaultUserIdCache = null;

async function getDefaultUserId() {
  if (defaultUserIdCache) return defaultUserIdCache;
  const res = await query(`SELECT id FROM users WHERE name = 'default' LIMIT 1`);
  defaultUserIdCache = res.rows[0]?.id || null;
  return defaultUserIdCache;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function attachUser(req, res, next) {
  try {
    const raw = req.headers['x-user-id'];
    let userRow = null;

    if (raw && typeof raw === 'string') {
      if (UUID_RE.test(raw)) {
        const r = await query('SELECT id, name FROM users WHERE id = $1', [raw]);
        userRow = r.rows[0] || null;
      } else {
        const r = await query('SELECT id, name FROM users WHERE name = $1', [raw]);
        userRow = r.rows[0] || null;
      }
    }

    if (!userRow) {
      const defaultId = await getDefaultUserId();
      // Validate cache — if the cached ID no longer exists, refetch
      if (defaultId) {
        const check = await query('SELECT id FROM users WHERE id = $1', [defaultId]);
        if (!check.rows.length) {
          defaultUserIdCache = null;
          const refetched = await getDefaultUserId();
          req.userId = refetched;
        } else {
          req.userId = defaultId;
        }
      } else {
        req.userId = null;
      }
      req.userName = 'default';
    } else {
      req.userId = userRow.id;
      req.userName = userRow.name;
      // Fire-and-forget last_active update
      query('UPDATE users SET last_active = NOW() WHERE id = $1', [userRow.id])
        .catch(err => console.warn('[user-context] last_active update failed:', err.message));
    }

    return next();
  } catch (err) {
    console.error('[user-context] Error:', err.message);
    // Fall back to default so downstream routes don't crash
    try {
      req.userId = await getDefaultUserId();
      req.userName = 'default';
    } catch {
      req.userId = null;
      req.userName = 'default';
    }
    return next();
  }
}
