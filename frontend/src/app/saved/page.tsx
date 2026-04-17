'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { getSavedArticles, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';

export default function SavedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSavedArticles();
      setArticles(data.articles);
    } catch {
      console.error('Failed to load saved articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUnsave(articleId: string) {
    await toggleSave(articleId);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  }

  return (
    <PageShell
      title="Saved"
      subtitle={
        !loading && articles.length > 0
          ? `${articles.length} bookmarked article${articles.length === 1 ? '' : 's'}`
          : 'Your bookmarked articles'
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-muted-foreground">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">No saved articles yet</p>
            <p className="text-sm text-muted-foreground">
              Tap the save button on any article to bookmark it here.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            Back to feed
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={{ ...article, is_saved: true }}
              showFeedback={false}
              onSave={handleUnsave}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
