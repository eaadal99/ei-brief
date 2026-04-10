/**
 * Auth client — team password, user identity, persona seeding.
 */

import { api } from './api';
import type { CurrentUser } from './types';
import { PERSONAS } from './types';

const STORAGE_KEY = 'eib_current_user';

// ── LocalStorage user identity ──────────────────────────────────────────────

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearCurrentUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Team password ───────────────────────────────────────────────────────────

export async function verifyTeamPassword(password: string): Promise<{ success: boolean; error?: string; mode?: string }> {
  const res = await api('/auth/verify-team', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'invalid_password' };
  }
  const data = await res.json().catch(() => ({}));
  return { success: true, mode: data.mode };
}

// ── Users ───────────────────────────────────────────────────────────────────

export async function listUsers(): Promise<CurrentUser[]> {
  const res = await api('/auth/users');
  if (!res.ok) return [];
  const data = await res.json();
  return data.users || [];
}

export async function createUser(input: { name: string; display_name: string; sector_focus?: string }): Promise<CurrentUser> {
  const res = await api('/auth/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('create_user_failed');
  const data = await res.json();
  return data.user;
}

// ── Persona seeding ─────────────────────────────────────────────────────────

export async function applyPersona(personaKey: string, user: CurrentUser): Promise<void> {
  const persona = PERSONAS[personaKey];
  if (!persona) return;

  const entries: Array<[string, unknown]> = [
    ['sectors_included', persona.sectors],
    ['geographies_included', persona.geographies],
    ['keywords_include', persona.keywords],
    ['keywords_exclude', []],
    ['match_strictness', 'loose'],
  ];

  await Promise.all(entries.map(async ([key, value]) => {
    const res = await api(`/preferences/${key}`, {
      method: 'PUT',
      headers: { 'x-user-id': user.id },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      console.error(`[persona] Failed to save ${key}: ${res.status}`);
      throw new Error(`Failed to save preference ${key}`);
    }
  }));
}
