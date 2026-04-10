/**
 * API client — typed fetch wrapper for all backend calls.
 *
 * Every request includes the API key and user ID headers.
 */

import { getCurrentUser } from './auth';
import type { Article, RssSource, SystemStatus, NewsletterConfig, NewsletterArchiveItem } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? 'eib_dev_key_2026';

/**
 * Low-level fetch wrapper — adds auth headers automatically.
 */
export async function api(path: string, opts: RequestInit = {}): Promise<Response> {
  const user = getCurrentUser();
  return fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(user ? { 'x-user-id': user.id } : {}),
      ...(opts.headers || {}),
    },
  });
}

// ── Feed ────────────────────────────────────────────────────────────────────

export async function getPersonalFeed(): Promise<{ articles: Article[] }> {
  const res = await api('/feed');
  if (!res.ok) return { articles: [] };
  return res.json();
}

export async function getAllArticles(params?: {
  sector?: string;
  geography?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ articles: Article[] }> {
  const qs = new URLSearchParams();
  if (params?.sector) qs.set('sector', params.sector);
  if (params?.geography) qs.set('geography', params.geography);
  if (params?.search) qs.set('search', params.search);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));

  const res = await api(`/feed/all?${qs.toString()}`);
  if (!res.ok) return { articles: [] };
  return res.json();
}

export async function submitFeedback(
  articleId: string,
  feedback: 'relevant' | 'not_relevant',
  excludedIds: string[]
): Promise<{ success: boolean; next_article: Article | null }> {
  const res = await api('/feed/feedback', {
    method: 'POST',
    body: JSON.stringify({ article_id: articleId, feedback, excluded_ids: excludedIds }),
  });
  if (!res.ok) return { success: false, next_article: null };
  return res.json();
}

export async function toggleSave(articleId: string): Promise<{ is_saved: boolean }> {
  const res = await api(`/feed/save/${articleId}`, { method: 'POST' });
  if (!res.ok) return { is_saved: false };
  return res.json();
}

// ── Saved Articles ──────────────────────────────────────────────────────────

export async function getSavedArticles(): Promise<{ articles: Article[] }> {
  const res = await api('/articles/saved');
  if (!res.ok) return { articles: [] };
  return res.json();
}

// ── Preferences ─────────────────────────────────────────────────────────────

export async function getPreferences(): Promise<{ preferences: Record<string, unknown>; newsletter_config: NewsletterConfig[] }> {
  const res = await api('/preferences');
  if (!res.ok) return { preferences: {}, newsletter_config: [] };
  return res.json();
}

export async function updatePreference(key: string, value: unknown): Promise<void> {
  await api(`/preferences/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

// ── Sources ─────────────────────────────────────────────────────────────────

export async function getSources(): Promise<{ sources: RssSource[] }> {
  const res = await api('/sources');
  if (!res.ok) return { sources: [] };
  return res.json();
}

export async function addSource(source: { name: string; rss_url: string; sector: string }): Promise<{ source: RssSource }> {
  const res = await api('/sources', {
    method: 'POST',
    body: JSON.stringify(source),
  });
  return res.json();
}

export async function updateSource(id: string, updates: Partial<RssSource>): Promise<void> {
  await api(`/sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteSource(id: string): Promise<void> {
  await api(`/sources/${id}`, { method: 'DELETE' });
}

// ── Newsletter ──────────────────────────────────────────────────────────────

export async function generateNewsletter(articleIds: string[], title?: string): Promise<{
  newsletter: { id: string; title: string; html: string; generated_at: string };
}> {
  const res = await api('/newsletter/generate', {
    method: 'POST',
    body: JSON.stringify({ article_ids: articleIds, title }),
  });
  if (!res.ok) throw new Error('Newsletter generation failed');
  return res.json();
}

export async function getNewsletterArchive(): Promise<{ newsletters: NewsletterArchiveItem[] }> {
  const res = await api('/newsletter/archive');
  if (!res.ok) return { newsletters: [] };
  return res.json();
}

export async function getArchivedNewsletter(id: string): Promise<{ newsletter: { id: string; title: string; html_content: string; generated_at: string } }> {
  const res = await api(`/newsletter/archive/${id}`);
  if (!res.ok) throw new Error('Newsletter not found');
  return res.json();
}

// ── System ──────────────────────────────────────────────────────────────────

export async function getSystemStatus(): Promise<SystemStatus | null> {
  const res = await api('/system/status');
  if (!res.ok) return null;
  return res.json();
}

export async function triggerRun(): Promise<void> {
  await api('/system/run', { method: 'POST' });
}

// ── Newsletter Config ───────────────────────────────────────────────────────

export async function updateNewsletterConfig(id: string, updates: Partial<NewsletterConfig>): Promise<void> {
  await api(`/preferences/newsletter/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function addNewsletterConfig(config: { practice_area: string; sector_keys: string[]; display_order: number }): Promise<void> {
  await api('/preferences/newsletter', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function deleteNewsletterConfig(id: string): Promise<void> {
  await api(`/preferences/newsletter/${id}`, { method: 'DELETE' });
}
