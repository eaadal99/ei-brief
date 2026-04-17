'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import PageShell from '@/components/page-shell';
import { ListRow } from '@/components/list-row';
import { getSavedArticles, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';
import { useArticlesContext } from '@/components/articles-context';

const READ_KEY = 'ei-brief:read';

function loadRead(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveRead(s: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(READ_KEY, JSON.stringify([...s]));
}

type Tab = 'all' | 'unread' | 'read';

export default function SavedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('all');
  const { setArticles: setCtxArticles } = useArticlesContext();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSavedArticles();
      setArticles(data.articles);
      setCtxArticles(data.articles);
    } catch {
      console.error('Failed to load saved articles');
    } finally {
      setLoading(false);
    }
  }, [setCtxArticles]);

  useEffect(() => {
    setRead(loadRead());
    load();
  }, [load]);

  async function handleUnsave(articleId: string) {
    await toggleSave(articleId);
    setArticles((prev) => {
      const next = prev.filter((a) => a.id !== articleId);
      setCtxArticles(next);
      return next;
    });
  }

  function toggleRead(articleId: string) {
    setRead((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      saveRead(next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    if (tab === 'unread') return articles.filter(a => !read.has(a.id));
    if (tab === 'read') return articles.filter(a => read.has(a.id));
    return articles;
  }, [articles, read, tab]);

  const counts = {
    all: articles.length,
    unread: articles.filter(a => !read.has(a.id)).length,
    read: articles.filter(a => read.has(a.id)).length,
  };

  return (
    <PageShell
      title="Reading List"
      eyebrow="Saved"
      subtitle="Bookmarked stories. Marked read stays here for reference; unsave to remove."
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0 mb-2">
        {(['all', 'unread', 'read'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'relative px-4 py-3 text-sm font-medium transition-colors',
              tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            <span className="capitalize">{t}</span>
            <span className="ml-2 font-mono text-[11px] text-muted-foreground tabular-nums">
              {counts[t]}
            </span>
            {tab === t && (
              <span className="absolute left-0 right-0 -bottom-px h-px brand-bg" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border-y border-border">
          <p className="display-serif text-3xl max-w-md">Nothing saved yet.</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Tap the bookmark on any article to put it in your reading list.
          </p>
          <Link
            href="/"
            className="inline-block text-sm text-muted-foreground hover:text-foreground link-underline"
          >
            Back to feed →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Nothing in <span className="capitalize">{tab}</span>.
          <button
            onClick={() => setTab('all')}
            className="ml-2 link-underline"
          >
            Show all
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border/70">
          {filtered.map((article, i) => (
            <ListRow
              key={article.id}
              article={{ ...article, is_saved: true }}
              onSave={handleUnsave}
              onToggleRead={toggleRead}
              isRead={read.has(article.id)}
              index={i}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
