'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageShell from '@/components/page-shell';
import { ArticleCard } from '@/components/article-card';
import { getAllArticles, toggleSave } from '@/lib/api';
import type { Article } from '@/lib/types';
import { SECTORS, GEOGRAPHIES, SECTOR_MAP } from '@/lib/types';
import { useArticlesContext } from '@/components/articles-context';
import { SectorDot } from '@/components/sector-dot';
import { useShortcut } from '@/components/keyboard-shortcuts';

function AllNewsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState(searchParams.get('sector') ?? '');
  const [geography, setGeography] = useState(searchParams.get('geography') ?? '');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [offset, setOffset] = useState(0);
  const { setArticles: setCtxArticles } = useArticlesContext();
  const LIMIT = 40;

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
      setCtxArticles(data.articles);
    } catch {
      console.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [sector, geography, search, offset, setCtxArticles]);

  useEffect(() => { load(); }, [load]);

  // Sync filter state → URL (so deep links work, shared URLs land correctly)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (sector) qs.set('sector', sector);
    if (geography) qs.set('geography', geography);
    if (search) qs.set('q', search);
    const str = qs.toString();
    router.replace(str ? `/all?${str}` : '/all', { scroll: false });
  }, [sector, geography, search, router]);

  async function handleSave(articleId: string) {
    const result = await toggleSave(articleId);
    setArticles((prev) => {
      const next = prev.map((a) => a.id === articleId ? { ...a, is_saved: result.is_saved } : a);
      setCtxArticles(next);
      return next;
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSector(''); setGeography(''); setSearch(''); setSearchInput(''); setOffset(0);
  }

  useShortcut('/', (e) => {
    e.preventDefault();
    const el = document.getElementById('all-search-input');
    if (el instanceof HTMLInputElement) el.focus();
  });

  const hasFilters = !!sector || !!geography || !!search;
  const activeSector = sector ? SECTOR_MAP[sector as keyof typeof SECTOR_MAP] : null;

  return (
    <PageShell
      title="All News"
      eyebrow="Archive"
      subtitle="Every article we ingest — searchable, filterable, dense."
      width="wide"
    >
      <div className="max-w-[1100px] mx-auto w-full">
        {/* Search + filter toolbar */}
        <div className="sticky top-[calc(env(safe-area-inset-top)+88px)] z-10 -mt-4 pt-4 pb-4 bg-background">
          <form onSubmit={handleSearch} className="relative mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              id="all-search-input"
              type="text"
              placeholder="Search headlines and summaries…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 pl-9 pr-24 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setSector(''); setOffset(0); }}
              className={[
                'px-3 py-1 rounded-full text-[11px] eyebrow whitespace-nowrap transition-colors',
                !sector ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              ].join(' ')}
            >
              All sectors
            </button>
            {SECTORS.filter(s => s.key !== 'general').map((s) => (
              <button
                key={s.key}
                onClick={() => { setSector(sector === s.key ? '' : s.key); setOffset(0); }}
                className={[
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] eyebrow whitespace-nowrap transition-colors',
                  sector === s.key
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                ].join(' ')}
              >
                <SectorDot sector={s.key} size={6} />
                {s.label}
              </button>
            ))}

            <span className="mx-1 h-5 w-px bg-border shrink-0" />

            <select
              value={geography}
              onChange={(e) => { setGeography(e.target.value); setOffset(0); }}
              className="h-7 px-2 rounded-md bg-card border border-border text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">Any region</option>
              {GEOGRAPHIES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[11px] eyebrow text-muted-foreground hover:text-foreground px-2 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between pt-6 pb-2">
          <div className="flex items-center gap-2 eyebrow text-muted-foreground">
            {activeSector && <SectorDot sector={activeSector.key} />}
            <span>{activeSector?.label ?? 'All sectors'}</span>
            {geography && <><span className="opacity-40">/</span><span>{geography}</span></>}
            {search && <><span className="opacity-40">/</span><span className="italic">“{search}”</span></>}
          </div>
          {!loading && (
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {offset + 1}–{offset + articles.length}
            </span>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <p className="display-serif text-2xl">No matches</p>
            <p className="text-sm text-muted-foreground">Loosen filters or try another search.</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-muted-foreground hover:text-foreground link-underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {articles.map((a, i) => (
                <div key={a.id} className="border-b border-border/50 last:border-0">
                  <ArticleCard
                    article={a}
                    onSave={handleSave}
                    showFeedback={false}
                    index={i}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-8">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none eyebrow"
              >
                ← Previous
              </button>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {offset + 1}–{offset + articles.length}
              </span>
              <button
                disabled={articles.length < LIMIT}
                onClick={() => setOffset(offset + LIMIT)}
                className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none eyebrow"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}

export default function AllNewsPage() {
  return (
    <Suspense fallback={<div />}>
      <AllNewsInner />
    </Suspense>
  );
}
