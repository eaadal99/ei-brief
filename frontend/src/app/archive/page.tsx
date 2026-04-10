'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { getSavedArticles, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';

export default function ArchivePage() {
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

  useEffect(() => {
    load();
  }, [load]);

  async function handleUnsave(articleId: string) {
    await toggleSave(articleId);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  }

  return (
    <PageShell title="Saved Articles" subtitle="Your bookmarked articles">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading saved articles...
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookmarkEmptyIcon className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">
            No saved articles yet. Bookmark articles from your feed to find them here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground mb-1">
            {articles.length} saved article{articles.length !== 1 ? 's' : ''}
          </p>
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

function BookmarkEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}
