'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { HeroCard } from '@/components/hero-card';
import { Rail } from '@/components/rail';
import { getPersonalFeed, submitFeedback, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';
import { SECTORS } from '@/lib/types';
import { useArticlesContext } from '@/components/articles-context';
import { useShortcut } from '@/components/keyboard-shortcuts';

// ── Skeletons ─────────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="py-8 border-t border-b border-border animate-pulse space-y-4">
      <div className="h-3 w-32 bg-muted rounded" />
      <div className="h-14 w-5/6 bg-muted rounded" />
      <div className="h-14 w-3/4 bg-muted rounded" />
      <div className="h-4 w-2/3 bg-muted rounded mt-4" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="py-5 border-b border-border animate-pulse flex gap-6">
      <div className="hidden sm:flex flex-col gap-2 w-[120px]">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-5 w-4/5 bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyFeedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingFeedback, setPendingFeedback] = useState<Record<string, 'relevant' | 'not_relevant'>>({});
  const [notedIds, setNotedIds] = useState<Record<string, 'relevant' | 'not_relevant'>>({});
  const [cursor, setCursor] = useState(0);
  const { setArticles: setCtxArticles } = useArticlesContext();
  const headingRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPersonalFeed();
      setArticles(data.articles);
      setCtxArticles(data.articles);
    } catch {
      console.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [setCtxArticles]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function handleFeedback(articleId: string, feedback: 'relevant' | 'not_relevant') {
    // Show "Noted/Skipped" overlay immediately
    setNotedIds(prev => ({ ...prev, [articleId]: feedback }));
    setPendingFeedback(prev => ({ ...prev, [articleId]: feedback }));
    setTimeout(async () => {
      const excludedIds = articles.map((a) => a.id);
      const result = await submitFeedback(articleId, feedback, excludedIds);
      setArticles((prev) => {
        const updated = prev.filter((a) => a.id !== articleId);
        if (result.next_article) updated.push(result.next_article);
        setCtxArticles(updated);
        return updated;
      });
      setPendingFeedback(prev => {
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
      setNotedIds(prev => {
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
    }, 400);
  }

  async function handleSave(articleId: string) {
    const result = await toggleSave(articleId);
    setArticles((prev) => {
      const next = prev.map((a) => a.id === articleId ? { ...a, is_saved: result.is_saved } : a);
      setCtxArticles(next);
      return next;
    });
  }

  // Partition: top article = hero, next = secondary pair, rest = rails by sector
  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 2);
  const remainder = rest.slice(2);

  const bySector = new Map<string, Article[]>();
  for (const a of remainder) {
    const key = a.sector ?? 'general';
    if (!bySector.has(key)) bySector.set(key, []);
    bySector.get(key)!.push(a);
  }

  // Keep sector order consistent (matches SECTORS config order)
  const sectorOrder = SECTORS.filter(s => bySector.has(s.key)).map(s => s.key);
  const rails = sectorOrder.map(k => ({ key: k, items: bySector.get(k)! }));

  // Keyboard: J/K to navigate through the stacked (non-rail) articles
  const stackedArticles = [lead, ...secondary].filter(Boolean);
  useShortcut('j', () => setCursor((c) => Math.min(c + 1, stackedArticles.length - 1)), [stackedArticles.length]);
  useShortcut('k', () => setCursor((c) => Math.max(c - 1, 0)), [stackedArticles.length]);
  useShortcut('s', () => {
    const a = stackedArticles[cursor];
    if (a) handleSave(a.id);
  }, [cursor, stackedArticles]);
  useShortcut('r', () => {
    const a = stackedArticles[cursor];
    if (a) handleFeedback(a.id, 'relevant');
  }, [cursor, stackedArticles]);
  useShortcut('x', () => {
    const a = stackedArticles[cursor];
    if (a) handleFeedback(a.id, 'not_relevant');
  }, [cursor, stackedArticles]);

  return (
    <PageShell
      title="My Feed"
      eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      subtitle={
        !loading && articles.length > 0
          ? `${articles.length} stories curated to your preferences.  Press ? for keyboard shortcuts.`
          : 'Your personalised energy desk.'
      }
      actions={
        !loading && articles.length > 0 ? (
          <button
            onClick={loadFeed}
            className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors eyebrow flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Refresh
          </button>
        ) : null
      }
    >
      <div ref={headingRef} />

      {loading ? (
        <div className="space-y-0">
          <HeroSkeleton />
          {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState onRefresh={loadFeed} />
      ) : (
        <div className="space-y-14">
          {/* Hero */}
          {lead && (
            <HeroCard
              article={lead}
              onFeedback={handleFeedback}
              onSave={handleSave}
              notedState={notedIds[lead.id]}
            />
          )}

          {/* Secondary row */}
          {secondary.length > 0 && (
            <section>
              <div className="grid md:grid-cols-2 gap-0 md:gap-8">
                {secondary.map((a, i) => (
                  <div key={a.id} className={i === 0 ? 'md:border-r md:border-border md:pr-8 md:pl-0' : 'md:pl-0'}>
                    <ArticleCard
                      article={a}
                      onFeedback={handleFeedback}
                      onSave={handleSave}
                      feedbackState={pendingFeedback[a.id]}
                      notedState={notedIds[a.id]}
                      index={i}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sector rails */}
          {rails.length > 0 && (
            <div className="space-y-12 pt-4">
              {rails.map((r) => (
                <Rail key={r.key} sectorKey={r.key} count={r.items.length}>
                  {r.items.map((a, i) => (
                    <ArticleCard
                      key={a.id}
                      article={a}
                      variant="compact"
                      onSave={handleSave}
                      onFeedback={handleFeedback}
                      feedbackState={pendingFeedback[a.id]}
                      notedState={notedIds[a.id]}
                      index={i}
                    />
                  ))}
                </Rail>
              ))}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-6 border-y border-border">
      <div className="flex items-center gap-2 eyebrow text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full brand-bg" />
        Nothing to brief yet
      </div>
      <h2 className="display-serif text-3xl font-semibold max-w-md">
        Tell us what matters, and we&rsquo;ll find it.
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        Set a few sectors and keywords. We&rsquo;ll personalise your feed the moment the next pipeline run lands.
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/preferences"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/85 transition-colors"
        >
          Configure preferences
        </Link>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          Refresh feed
        </button>
      </div>
    </div>
  );
}
