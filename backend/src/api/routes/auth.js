/**
 * Auth routes — login + admin user management.
 *
 * POST /auth/login              — username + password → JWT
 * GET  /auth/users              — list all users (admin only)
 * POST /auth/users              — create user (admin only)
 * PUT  /auth/users/:id          — update display_name / is_admin (admin only)
 * PUT  /auth/users/:id/password — reset password (admin only)
 * DELETE /auth/users/:id        — delete user (admin only)
 */

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../lib/db.js';
import { requireJwtAuth } from '../middleware/auth.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      name: user.name,
      displayName: user.display_name,
      isAdmin: user.is_admin || false,
    },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    { expiresIn: '90d' }
  );
}

// ── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await query(
      `SELECT id, name, display_name, sector_focus, password_hash, is_admin
       FROM users WHERE name = $1 LIMIT 1`,
      [username.trim().toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        display_name: user.display_name,
        sector_focus: user.sector_focus,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// All routes below require JWT + admin role
router.use(requireJwtAuth);

function requireAdmin(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

// ── GET /auth/users ───────────────────────────────────────────────────────────

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, display_name, sector_focus, is_admin, last_active, created_at
       FROM users
       WHERE name != 'default'
       ORDER BY created_at`
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('[auth] list users error:', err.message);
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

// ── POST /auth/users ──────────────────────────────────────────────────────────

router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { name, display_name, password, sector_focus, is_admin = false } = req.body || {};

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, display_name, sector_focus, password_hash, is_admin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, display_name, sector_focus, is_admin, created_at`,
      [
        name.trim().toLowerCase(),
        (display_name || name).trim(),
        sector_focus || null,
        hash,
        !!is_admin,
      ]
    );

    return res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('[auth] create user error:', err.message);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// ── PUT /auth/users/:id ───────────────────────────────────────────────────────

router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { display_name, is_admin } = req.body || {};
    const updates = [];
    const params = [];
    let i = 1;

    if (display_name !== undefined) {
      updates.push(`display_name = $${i++}`);
      params.push(display_name.trim());
    }
    if (is_admin !== undefined) {
      updates.push(`is_admin = $${i++}`);
      params.push(!!is_admin);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    params.push(req.params.id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, name, display_name, is_admin`,
      params
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[auth] update user error:', err.message);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// ── PUT /auth/users/:id/password ──────────────────────────────────────────────

router.put('/users/:id/password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id`,
      [hash, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[auth] reset password error:', err.message);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── DELETE /auth/users/:id ────────────────────────────────────────────────────

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query(
      `DELETE FROM users WHERE id = $1 AND name != 'default' RETURNING id`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[auth] delete user error:', err.message);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
