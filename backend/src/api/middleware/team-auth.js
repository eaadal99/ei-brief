/**
 * Team password gate.
 *
 * Blocks unauthenticated requests with a shared team password.
 * Correct password → HMAC-signed HttpOnly cookie for 90 days.
 *
 * Cookie attributes adapt to environment:
 *   Production: Secure, SameSite=None (cross-origin Vercel → Railway)
 *   Dev:        no Secure, SameSite=Lax (http://localhost works)
 */

import crypto from 'crypto';

const COOKIE_NAME = 'eib_team';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days in seconds

function getSecret() {
  return process.env.TEAM_COOKIE_SECRET
    || process.env.TEAM_PASSWORD
    || process.env.API_KEY
    || 'eib-dev-secret';
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function makeTeamCookieValue() {
  const iat = Date.now().toString();
  return `${iat}.${sign(iat)}`;
}

export function verifyTeamCookieValue(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const [iat, sig] = raw.split('.');
  if (!iat || !sig) return false;
  if (sign(iat) !== sig) return false;
  const ageMs = Date.now() - parseInt(iat, 10);
  if (Number.isNaN(ageMs) || ageMs < 0) return false;
  if (ageMs > COOKIE_MAX_AGE * 1000) return false;
  return true;
}

export function buildTeamCookieHeader() {
  const value = makeTeamCookieValue();
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

// Paths exempt from team auth
const PUBLIC_PATHS = ['/api/v1/auth/verify-team'];

export function requireTeamAuth(req, res, next) {
  // Only guard /api/v1/* routes
  if (!req.path.startsWith('/api/v1')) return next();
  if (PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(p + '/'))) return next();

  // Open mode — no TEAM_PASSWORD set
  if (!process.env.TEAM_PASSWORD) {
    if (!globalThis.__eibTeamAuthOpenWarned) {
      console.warn('[team-auth] No TEAM_PASSWORD set — running in open mode');
      globalThis.__eibTeamAuthOpenWarned = true;
    }
    return next();
  }

  const cookies = parseCookies(req.headers.cookie || '');
  if (verifyTeamCookieValue(cookies[COOKIE_NAME])) return next();

  return res.status(401).json({ error: 'team_auth_required' });
}

export const TEAM_COOKIE_NAME = COOKIE_NAME;
