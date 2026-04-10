/**
 * Auth routes — team password verification + user management.
 *
 * POST /auth/verify-team  — check password, set cookie
 * GET  /auth/users        — list all non-default users
 * POST /auth/users        — create a new user
 */

import express from 'express';
import { query } from '../../lib/db.js';
import { buildTeamCookieHeader } from '../middleware/team-auth.js';

const router = express.Router();

// POST /auth/verify-team
router.post('/verify-team', async (req, res) => {
  try {
    const { password } = req.body || {};
    const teamPassword = process.env.TEAM_PASSWORD;

    // Open mode — no password set
    if (!teamPassword) {
      res.setHeader('Set-Cookie', buildTeamCookieHeader());
      return res.json({ success: true, mode: 'open' });
    }

    if (password !== teamPassword) {
      return res.status(401).json({ success: false, error: 'invalid_password' });
    }

    res.setHeader('Set-Cookie', buildTeamCookieHeader());
    return res.json({ success: true });
  } catch (err) {
    console.error('[auth] verify-team error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// GET /auth/users
router.get('/users', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, display_name, sector_focus
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

// POST /auth/users
router.post('/users', async (req, res) => {
  try {
    const { name, display_name, sector_focus } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO users (name, display_name, sector_focus)
       VALUES ($1, $2, $3)
       RETURNING id, name, display_name, sector_focus`,
      [name.trim().toLowerCase(), display_name || name.trim(), sector_focus || null]
    );

    return res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'User name already exists' });
    }
    console.error('[auth] create user error:', err.message);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;
