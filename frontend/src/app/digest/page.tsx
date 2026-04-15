'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getDigest } from '@/lib/api';
import type { Digest, DigestSection } from '@/lib/types';
import { SECTOR_MAP } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function pubTime(iso: string | null): string {
  if (!iso) return '';
  return timeAgo(iso);
}

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: DigestSection }) {
  const sectorMeta = SECTOR_MAP[section.sector as keyof typeof SECTOR_MAP];
  const color = sectorMeta?.color ?? '#78716C';
  const bgColor = color + '18';

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      {/* Sector badge */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: bgColor, color }}
        >
          {section.label}
        </span>
      </div>

      {/* AI summary */}
      <p className="text-sm text-foreground/80 leading-relaxed italic">
        {section.summary}
      </p>

      {/* Article links */}
      <ul className="space-y-1.5 pt-1">
        {section.articles.slice(0, 3).map((article) => (
          <li key={article.id} className="flex items-start gap-2">
            <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
            <div className="min-w-0">
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground hover:text-foreground/70 transition-colors line-clamp-2"
                >
                  {article.headline}
                </a>
              ) : (
                <span className="text-sm text-foreground line-clamp-2">
                  {article.headline}
                </span>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                {article.source_name && (
                  <span className="text-[11px] text-muted-foreground">{article.source_name}</span>
                )}
                {article.published_at && (
                  <>
                    <span className="text-[11px] text-muted-foreground/50">·</span>
                    <span className="text-[11px] text-muted-foreground">{pubTime(article.published_at)}</span>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DigestPage() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const data = await getDigest(force);
      if (!data) throw new Error('null response');
      setDigest(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Generating your personalised briefing…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !digest) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-muted-foreground">Failed to generate digest. Please try again.</p>
        <button
          onClick={() => load(true)}
          className="text-sm underline underline-offset-2 text-foreground/60 hover:text-foreground transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (digest.sections.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="text-4xl">📭</div>
        <h2 className="text-lg font-semibold">No stories yet</h2>
        <p className="text-sm text-muted-foreground">
          No articles found for your preferred sectors in the last 48 hours.
        </p>
        <Link
          href="/preferences"
          className="inline-block text-sm underline underline-offset-2 text-foreground/60 hover:text-foreground transition-colors"
        >
          Broaden your preferences →
        </Link>
      </div>
    );
  }

  // ── Digest ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Daily Digest</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {digest.cached ? `Last updated ${timeAgo(digest.generated_at)}` : 'Just generated'}
            {' · '}
            {digest.sections.length} sector{digest.sections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? 'animate-spin' : ''}
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {digest.sections.map((section) => (
          <SectionCard key={section.sector} section={section} />
        ))}
      </div>
    </div>
  );
}
