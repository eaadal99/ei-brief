'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getDigest } from '@/lib/api';
import type { Digest, DigestSection } from '@/lib/types';
import { SECTOR_MAP } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function pubTimeShort(iso: string | null): string {
  if (!iso) return '';
  return timeAgo(iso);
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: DigestSection }) {
  const meta = SECTOR_MAP[section.sector as keyof typeof SECTOR_MAP];
  const color = meta?.color ?? '#78716C';

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden transition-all duration-200 hover:shadow-[0_4px_16px_oklch(0_0_0/7%)]">
      {/* Sector header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/60" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + '1a', color }}
        >
          {section.label}
        </span>

        {/* AI summary */}
        <p className="text-sm text-muted-foreground leading-relaxed mt-2.5 italic">
          {section.summary}
        </p>
      </div>

      {/* Article links */}
      <ul className="divide-y divide-border/50">
        {section.articles.slice(0, 3).map((article) => (
          <li key={article.id} className="px-4 py-3 hover:bg-muted/40 transition-colors">
            {article.url ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start justify-between gap-3"
              >
                <span className="text-sm text-foreground group-hover:text-foreground/70 transition-colors leading-snug line-clamp-2 flex-1">
                  {article.headline}
                </span>
                <div className="shrink-0 text-right mt-0.5">
                  {article.source_name && (
                    <span className="block text-[10px] text-muted-foreground">{article.source_name}</span>
                  )}
                  {article.published_at && (
                    <span className="block text-[10px] text-muted-foreground/60 tabular-nums">{pubTimeShort(article.published_at)}</span>
                  )}
                </div>
              </a>
            ) : (
              <span className="text-sm text-foreground leading-snug line-clamp-2">{article.headline}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DigestSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border px-4 py-4 space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-24" />
      <div className="space-y-1.5">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
      <div className="border-t border-border/50 pt-3 space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-3 bg-muted rounded w-full" />)}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
      if (!data) throw new Error('null');
      setDigest(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  if (loading) {
    return (
      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/70 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="h-5 bg-muted rounded w-28 animate-pulse" />
            <div className="h-3 bg-muted rounded w-48 mt-1.5 animate-pulse" />
          </div>
        </header>
        <div className="px-6 py-6 max-w-2xl mx-auto space-y-4">
          {[1,2,3].map(i => <DigestSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !digest) {
    return (
      <div className="lg:pl-60 flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <p className="text-sm text-muted-foreground">Failed to generate digest.</p>
        <button
          onClick={() => load(true)}
          className="text-sm underline underline-offset-2 text-foreground/60 hover:text-foreground transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (digest.sections.length === 0) {
    return (
      <div className="lg:pl-60 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">No stories yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">No articles found for your preferred sectors in the last 48 hours.</p>
        </div>
        <Link href="/preferences" className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors">
          Broaden your preferences →
        </Link>
      </div>
    );
  }

  return (
    <div className="lg:pl-60 pb-24 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/70 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Daily Digest</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {digest.cached ? `Updated ${timeAgo(digest.generated_at)}` : 'Just generated'}
              {' · '}{digest.sections.length} sector{digest.sections.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Sections */}
      <div className="px-6 py-6 max-w-2xl mx-auto space-y-4">
        {digest.sections.map((section) => (
          <SectionCard key={section.sector} section={section} />
        ))}
      </div>
    </div>
  );
}
