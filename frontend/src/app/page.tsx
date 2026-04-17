'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { getPersonalFeed, submitFeedback, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';
import { SECTORS } from '@/lib/types';

// ── Skeleton loader ───────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border px-4 pt-4 pb-3 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 bg-muted rounded w-32" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-4/5" />
      </div>
      <div className="space-y-1">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-3/4" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyFeedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<Record<string, 'relevant' | 'not_relevant'>>({});

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPersonalFeed();
      setArticles(data.articles);
    } catch {
      console.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function handleFeedback(articleId: string, feedback: 'relevant' | 'not_relevant') {
    setPendingFeedback(prev => ({ ...prev, [articleId]: feedback }));
    setTimeout(async () => {
      const excludedIds = articles.map((a) => a.id);
      const result = await submitFeedback(articleId, feedback, excludedIds);
      setArticles((prev) => {
        const updated = prev.filter((a) => a.id !== articleId);
        if (result.next_article) updated.push(result.next_article);
        return updated;
      });
      setPendingFeedback(prev => {
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
    }, 600);
  }

  async function handleSave(articleId: string) {
    const result = await toggleSave(articleId);
    setArticles((prev) =>
      prev.map((a) => a.id === articleId ? { ...a, is_saved: result.is_saved } : a)
    );
  }

  const sectorsInFeed = new Set(articles.map(a => a.sector).filter(Boolean));
  const visibleSectors = SECTORS.filter(s => s.key !== 'general' && sectorsInFeed.has(s.key));
  const filtered = activeSector ? articles.filter((a) => a.sector === activeSector) : articles;

  return (
    <PageShell
      title="My Feed"
      subtitle={
        !loading && articles.length > 0
          ? `${articles.length} article${articles.length === 1 ? '' : 's'} · personalised`
          : 'Your personalised energy news'
      }
    >
      {/* Sector filter pills */}
      {visibleSectors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <button
            onClick={() => setActiveSector(null)}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              activeSector === null
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            ].join(' ')}
          >
            All
          </button>
          {visibleSectors.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSector(activeSector === s.key ? null : s.key)}
              className={[
                'px-3 py-1 rounded-full text-xs font-medium transition-all',
                activeSector === s.key
                  ? 'text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              ].join(' ')}
              style={
                activeSector === s.key
                  ? { backgroundColor: s.color, borderColor: s.color }
                  : {}
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => <ArticleSkeleton key={i} />)}
        </div>
      ) : articles.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
            </svg>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <p className="text-sm font-semibold">Your feed is empty</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Set up your preferences to get a personalised feed of energy news.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/preferences"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/85 transition-colors"
            >
              Set up preferences
            </Link>
            <button
              onClick={loadFeed}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No articles in this sector right now.
          <button onClick={() => setActiveSector(null)} className="ml-1.5 underline underline-offset-2 hover:text-foreground transition-colors">
            Show all
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onFeedback={handleFeedback}
              onSave={handleSave}
              feedbackState={pendingFeedback[article.id]}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
