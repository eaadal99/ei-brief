'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { getPersonalFeed, submitFeedback, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';
import { SECTORS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

  // ── Feedback handler ────────────────────────────────────────────────────
  async function handleFeedback(articleId: string, feedback: 'relevant' | 'not_relevant') {
    // Flash the button, then remove article after 800ms
    setPendingFeedback(prev => ({ ...prev, [articleId]: feedback }));

    setTimeout(async () => {
      const excludedIds = articles.map((a) => a.id);
      const result = await submitFeedback(articleId, feedback, excludedIds);

      setArticles((prev) => {
        const updated = prev.filter((a) => a.id !== articleId);
        if (result.next_article) {
          updated.push(result.next_article);
        }
        return updated;
      });

      setPendingFeedback(prev => {
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
    }, 600);
  }

  // ── Save handler ────────────────────────────────────────────────────────
  async function handleSave(articleId: string) {
    const result = await toggleSave(articleId);
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId ? { ...a, is_saved: result.is_saved } : a
      )
    );
  }

  // ── Only show pills for sectors that have articles ──────────────────────
  const sectorsInFeed = new Set(articles.map(a => a.sector).filter(Boolean));
  const visibleSectors = SECTORS.filter(s => s.key !== 'general' && sectorsInFeed.has(s.key));

  // ── Filter by sector (client-side) ──────────────────────────────────────
  const filtered = activeSector
    ? articles.filter((a) => a.sector === activeSector)
    : articles;

  return (
    <PageShell
      title="My Feed"
      subtitle={
        !loading && articles.length > 0
          ? `${articles.length} article${articles.length === 1 ? '' : 's'} in your feed`
          : 'Articles tailored to your preferences'
      }
    >
      {/* Sector filter pills — only sectors present in current feed */}
      {visibleSectors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <Badge
            variant={activeSector === null ? 'default' : 'outline'}
            className="cursor-pointer select-none px-3 py-1 text-xs"
            onClick={() => setActiveSector(null)}
          >
            All
          </Badge>
          {visibleSectors.map((s) => (
            <Badge
              key={s.key}
              variant={activeSector === s.key ? 'default' : 'outline'}
              className="cursor-pointer select-none px-3 py-1 text-xs"
              style={
                activeSector === s.key
                  ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                  : {}
              }
              onClick={() => setActiveSector(activeSector === s.key ? null : s.key)}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading your feed...
        </div>
      ) : articles.length === 0 ? (
        // ── Empty state: onboarding CTA ──────────────────────────────────
        <div className="flex flex-col items-center justify-center py-16">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-4 pt-6 pb-5 text-center">
              <div className="text-3xl">📰</div>
              <div>
                <p className="font-semibold mb-1">No articles in your feed yet</p>
                <p className="text-sm text-muted-foreground">
                  Set your sectors, geographies and keywords to personalise your feed, or check back after the next scheduled fetch.
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/preferences">
                  <Button size="sm">Set up preferences</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={loadFeed}>
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">No articles in this sector yet.</p>
          <button
            className="mt-2 text-xs underline text-muted-foreground"
            onClick={() => setActiveSector(null)}
          >
            Show all sectors
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
