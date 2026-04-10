'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { getAllArticles, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';
import { SECTORS, GEOGRAPHIES } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(articleId: string) {
    const result = await toggleSave(articleId);
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId ? { ...a, is_saved: result.is_saved } : a
      )
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSector('');
    setGeography('');
    setSearch('');
    setSearchInput('');
    setOffset(0);
  }

  const hasFilters = !!sector || !!geography || !!search;

  return (
    <PageShell title="All News" subtitle="Browse all articles across every sector">
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search headlines..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Select value={sector} onValueChange={(v: string | null) => { setSector(!v || v === 'all' ? '' : v); setOffset(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {SECTORS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={geography} onValueChange={(v: string | null) => { setGeography(!v || v === 'all' ? '' : v); setOffset(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {GEOGRAPHIES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {/* Sector quick-pills */}
        <div className="flex flex-wrap gap-1.5">
          {SECTORS.filter((s) => s.key !== 'general').map((s) => (
            <Badge
              key={s.key}
              variant={sector === s.key ? 'default' : 'outline'}
              className="cursor-pointer select-none px-2.5 py-0.5 text-[11px]"
              style={
                sector === s.key
                  ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                  : {}
              }
              onClick={() => { setSector(sector === s.key ? '' : s.key); setOffset(0); }}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Articles */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading articles...
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">
            No articles found. Try adjusting your filters.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                showFeedback={false}
                onSave={handleSave}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {offset + 1}–{offset + articles.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={articles.length < LIMIT}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}
