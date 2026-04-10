'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { getPersonalFeed, submitFeedback, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';
import { SECTORS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function MyFeedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSector, setActiveSector] = useState<string | null>(null);

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
    const excludedIds = articles.map((a) => a.id);
    const result = await submitFeedback(articleId, feedback, excludedIds);

    setArticles((prev) => {
      const updated = prev.filter((a) => a.id !== articleId);
      if (result.next_article) {
        updated.push(result.next_article);
      }
      return updated;
    });
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

  // ── Filter by sector (client-side) ──────────────────────────────────────
  const filtered = activeSector
    ? articles.filter((a) => a.sector === activeSector)
    : articles;

  return (
    <PageShell title="My Feed" subtitle="Articles tailored to your preferences">
      {/* Sector filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <Badge
          variant={activeSector === null ? 'default' : 'outline'}
          className="cursor-pointer select-none px-3 py-1 text-xs"
          onClick={() => setActiveSector(null)}
        >
          All
        </Badge>
        {SECTORS.filter((s) => s.key !== 'general').map((s) => (
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

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading your feed...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">
            {activeSector
              ? 'No articles in this sector yet.'
              : 'No articles in your feed yet. Check your preferences or wait for the next fetch.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onFeedback={handleFeedback}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
