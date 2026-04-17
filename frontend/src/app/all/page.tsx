'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { getAllArticles, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';
import { SECTORS, GEOGRAPHIES } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function AllNewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState('');
  const [geography, setGeography] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllArticles({
        sector: sector || undefined,
        geography: geography || undefined,
        search: search || undefined,
        limit: LIMIT,
        offset,
      });
      setArticles(data.articles);
    } catch {
      console.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [sector, geography, search, offset]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(articleId: string) {
    const result = await toggleSave(articleId);
    setArticles((prev) =>
      prev.map((a) => a.id === articleId ? { ...a, is_saved: result.is_saved } : a)
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSector(''); setGeography(''); setSearch(''); setSearchInput(''); setOffset(0);
  }

  const hasFilters = !!sector || !!geography || !!search;

  return (
    <PageShell title="All News" subtitle="Browse all articles across every sector">

      {/* Filter bar */}
      <div className="space-y-3 mb-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search headlines and summaries…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-20 h-10"
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-xs"
          >
            Search
          </Button>
        </form>

        {/* Dropdowns + clear */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sector || 'all'}
            onValueChange={(v: string | null) => { setSector(!v || v === 'all' ? '' : v); setOffset(0); }}
          >
            <SelectTrigger className="w-[152px] h-9 text-sm">
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {SECTORS.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={geography || 'all'}
            onValueChange={(v: string | null) => { setGeography(!v || v === 'all' ? '' : v); setOffset(0); }}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="All regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {GEOGRAPHIES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {/* Sector quick-pills */}
        <div className="flex flex-wrap gap-1.5">
          {SECTORS.filter((s) => s.key !== 'general').map((s) => (
            <button
              key={s.key}
              onClick={() => { setSector(sector === s.key ? '' : s.key); setOffset(0); }}
              className={[
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all',
                sector === s.key ? 'text-white shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground',
              ].join(' ')}
              style={sector === s.key ? { backgroundColor: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Article list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <p className="text-sm font-medium">No articles found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} showFeedback={false} onSave={handleSave} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-6 mt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              ← Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {offset + 1}–{offset + articles.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={articles.length < LIMIT}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Next →
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}
