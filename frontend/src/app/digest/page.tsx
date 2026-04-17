'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PageShell from '@/components/page-shell';
import { getDigest } from '@/lib/api';
import type { Digest, DigestSection } from '@/lib/types';
import { SECTOR_MAP } from '@/lib/types';
import { SectorDot } from '@/components/sector-dot';
import { shortRelativeTime } from '@/lib/reading-time';
import { getCurrentUser } from '@/lib/auth';

// ── Section ───────────────────────────────────────────────────────────────────

function BriefSection({ section, index }: { section: DigestSection; index: number }) {
  const meta = SECTOR_MAP[section.sector as keyof typeof SECTOR_MAP];
  return (
    <section
      className="py-10 border-t border-border animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      {/* Sector rule */}
      <span
        className="block w-12 h-px mb-4"
        style={{ backgroundColor: meta?.color ?? 'var(--brand)' }}
      />

      <div className="flex items-baseline gap-3 mb-4">
        <div className="flex items-center gap-2 eyebrow text-muted-foreground">
          <SectorDot sector={section.sector} />
          <span>{section.label}</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {section.articles.length} stor{section.articles.length === 1 ? 'y' : 'ies'}
        </span>
      </div>

      <h2 className="display-serif text-3xl sm:text-4xl font-semibold leading-[1.05] mb-5 text-balance">
        {briefTitle(section)}
      </h2>

      <blockquote className="display-serif italic text-lg text-foreground/75 leading-relaxed max-w-2xl text-balance">
        &ldquo;{section.summary}&rdquo;
      </blockquote>

      <ul className="mt-6 divide-y divide-border/70 border-t border-border/70">
        {section.articles.map((a) => (
          <li key={a.id} className="py-3 flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted-foreground w-10 tabular-nums shrink-0">
              {shortRelativeTime(a.published_at)}
            </span>
            <div className="flex-1 min-w-0">
              {a.url ? (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:brand-text transition-colors line-clamp-2"
                >
                  {a.headline}
                </a>
              ) : (
                <span className="text-sm font-medium">{a.headline}</span>
              )}
            </div>
            {a.source_name && (
              <span className="eyebrow text-muted-foreground/80 shrink-0 hidden sm:inline">
                {a.source_name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Lift a title out of the first article headline. A cheap "editor's heading"
 * that feels hand-written without asking the model for another round-trip.
 */
function briefTitle(section: DigestSection): string {
  const first = section.articles[0]?.headline;
  if (!first) return section.label;
  // Clip to first natural break for a tighter display
  const clipped = first.split(/[:—–|]/)[0].trim();
  return clipped.length > 80 ? clipped.slice(0, 80) + '…' : clipped;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function BriefSkeleton() {
  return (
    <section className="py-10 border-t border-border animate-pulse space-y-4">
      <div className="h-3 w-32 bg-muted rounded" />
      <div className="h-10 w-4/5 bg-muted rounded" />
      <div className="h-4 w-2/3 bg-muted rounded" />
      <div className="space-y-2 pt-4">
        {[1,2,3].map(i => <div key={i} className="h-4 w-full bg-muted rounded" />)}
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DigestPage() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [greetingName, setGreetingName] = useState<string>('');

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

  useEffect(() => {
    load(false);
    const u = getCurrentUser();
    setGreetingName(u?.display_name?.split(' ')[0] ?? u?.name ?? '');
  }, [load]);

  const hour = new Date().getHours();
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const totalStories = digest?.sections.reduce((n, s) => n + s.articles.length, 0) ?? 0;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <PageShell
      title="The Brief"
      eyebrow={today}
      width="narrow"
      actions={
        digest ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 eyebrow flex items-center gap-1.5 no-print"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 eyebrow flex items-center gap-1.5 disabled:opacity-50 no-print"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        ) : null
      }
      subtitle={
        digest
          ? `${digest.cached ? `Refreshed ${shortRelativeTime(digest.generated_at)} ago` : 'Fresh from the press'}  ·  ${digest.sections.length} section${digest.sections.length === 1 ? '' : 's'}  ·  ${totalStories} stories`
          : undefined
      }
    >
      <div className="brief-print">
        {loading ? (
          <>
            {[1, 2, 3].map(i => <BriefSkeleton key={i} />)}
          </>
        ) : error || !digest ? (
          <div className="py-20 text-center space-y-3 border-y border-border">
            <p className="display-serif text-2xl">The wire went quiet.</p>
            <p className="text-sm text-muted-foreground">We couldn&rsquo;t generate your brief this time.</p>
            <button
              onClick={() => load(true)}
              className="text-sm text-muted-foreground hover:text-foreground link-underline"
            >
              Try again
            </button>
          </div>
        ) : digest.sections.length === 0 ? (
          <div className="py-20 text-center space-y-4 border-y border-border">
            <p className="display-serif text-2xl">Nothing in your sectors yet.</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No articles found for your preferred sectors in the last 48 hours.
            </p>
            <Link
              href="/preferences"
              className="inline-block text-sm text-muted-foreground hover:text-foreground link-underline"
            >
              Broaden your preferences →
            </Link>
          </div>
        ) : (
          <>
            {/* Editor's note */}
            <div className="pb-6 animate-fade-up">
              <p className="display-serif italic text-xl sm:text-2xl text-foreground/85 leading-[1.35] text-balance max-w-2xl">
                {salutation}{greetingName ? `, ${greetingName}` : ''}.  Here&rsquo;s what moved in energy over the past 48 hours — across {digest.sections.length} sector{digest.sections.length === 1 ? '' : 's'} you follow.
              </p>
            </div>

            {/* Table of contents */}
            <nav className="flex flex-wrap gap-x-4 gap-y-2 pb-6 border-t border-border pt-4 no-print">
              {digest.sections.map((s) => (
                <a
                  key={s.sector}
                  href={`#section-${s.sector}`}
                  className="flex items-center gap-1.5 eyebrow text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SectorDot sector={s.sector} />
                  {s.label}
                </a>
              ))}
            </nav>

            {/* Sections */}
            <div>
              {digest.sections.map((section, i) => (
                <div id={`section-${section.sector}`} key={section.sector}>
                  <BriefSection section={section} index={i} />
                </div>
              ))}
            </div>

            {/* Sign-off */}
            <div className="py-10 border-t border-border text-center">
              <p className="eyebrow text-muted-foreground">— End of brief —</p>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
