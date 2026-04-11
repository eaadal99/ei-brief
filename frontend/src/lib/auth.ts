/**
 * Auth client — JWT-based per-user authentication.
 *
 * login()       → POST /auth/login → store {token, user} in localStorage
 * logout()      → clear localStorage → redirect to /login
 * getToken()    → retrieve JWT
 * getCurrentUser() → retrieve stored user object
 * isAdmin()     → check is_admin flag on stored user
 */

import type { CurrentUser, AuthSession } from './types';

const STORAGE_KEY = 'eib_session';

// ── Session storage ──────────────────────────────────────────────────────────

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function setSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function getCurrentUser(): CurrentUser | null {
  return getSession()?.user ?? null;
}

export function isAdmin(): boolean {
  return getSession()?.user?.is_admin === true;
}

// ── Login / logout ───────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? 'eib_dev_key_2026';

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Invalid username or password' };
    }

    const data = await res.json();
    setSession({ token: data.token, user: data.user });
    return { success: true };
  } catch {
    return { success: false, error: 'Unable to connect. Please try again.' };
  }
}

export function logout() {
  clearSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// ── Legacy aliases (kept for backward compat with any remaining usages) ───────

/** @deprecated Use getCurrentUser() */
export function clearCurrentUser() {
  clearSession();
}

/** @deprecated Use getCurrentUser() */
export function setCurrentUser(user: CurrentUser) {
  const existing = getSession();
  if (existing) {
    setSession({ ...existing, user });
  }
}
