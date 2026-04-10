'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/page-shell';
import {
  getAllArticles,
  generateNewsletter,
  getNewsletterArchive,
  getArchivedNewsletter,
} from '@/lib/api';
import type { Article, NewsletterArchiveItem } from '@/lib/types';
import { SECTORS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NewsletterPage() {
  return (
    <PageShell title="Newsletter" subtitle="Generate and download weekly briefs">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <GenerateTab />
        </TabsContent>
        <TabsContent value="archive">
          <ArchiveTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

// ── Generate Tab ────────────────────────────────────────────────────────────

function GenerateTab() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllArticles({ limit: 100 });
      setArticles(data.articles);
    } catch {
      console.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const visible = filtered.map((a) => a.id);
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((id) => next.add(id));
      return next;
    });
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function handleGenerate() {
    if (selected.size === 0) return;
    setGenerating(true);
    try {
      const result = await generateNewsletter(
        Array.from(selected),
        title.trim() || undefined
      );
      setPreview(result.newsletter.html);
    } catch {
      console.error('Newsletter generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!preview) return;
    const blob = new Blob([preview], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ei-brief-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = sectorFilter
    ? articles.filter((a) => a.sector === sectorFilter)
    : articles;

  if (preview) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Newsletter Preview</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
              Back
            </Button>
            <Button size="sm" onClick={handleDownload}>
              Download HTML
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <iframe
              srcDoc={preview}
              title="Newsletter preview"
              className="w-full min-h-[600px] border-0 rounded-lg"
              sandbox="allow-same-origin"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Title input */}
      <Input
        placeholder="Newsletter title (optional — AI will generate one)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* Sector pills */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={sectorFilter === null ? 'default' : 'outline'}
          className="cursor-pointer select-none px-2.5 py-0.5 text-[11px]"
          onClick={() => setSectorFilter(null)}
        >
          All
        </Badge>
        {SECTORS.filter((s) => s.key !== 'general').map((s) => (
          <Badge
            key={s.key}
            variant={sectorFilter === s.key ? 'default' : 'outline'}
            className="cursor-pointer select-none px-2.5 py-0.5 text-[11px]"
            style={
              sectorFilter === s.key
                ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                : {}
            }
            onClick={() => setSectorFilter(sectorFilter === s.key ? null : s.key)}
          >
            {s.label}
          </Badge>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select visible
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            Clear
          </Button>
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
        </div>
        <Button
          size="sm"
          disabled={selected.size === 0 || generating}
          onClick={handleGenerate}
        >
          {generating ? 'Generating...' : `Generate (${selected.size})`}
        </Button>
      </div>

      {/* Article list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading articles...
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No articles available.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => toggleSelect(article.id)}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                selected.has(article.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent'
              }`}
            >
              <div
                className={`mt-0.5 size-4 shrink-0 rounded border-2 flex items-center justify-center ${
                  selected.has(article.id)
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                }`}
              >
                {selected.has(article.id) && (
                  <svg viewBox="0 0 12 12" className="size-2.5 text-primary-foreground">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug truncate">
                  {article.headline}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {article.sector && (
                    <span className="text-[11px] text-muted-foreground">
                      {SECTORS.find((s) => s.key === article.sector)?.label ?? article.sector}
                    </span>
                  )}
                  {article.source_name && (
                    <span className="text-[11px] text-muted-foreground">
                      {article.source_name}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Archive Tab ─────────────────────────────────────────────────────────────

function ArchiveTab() {
  const [items, setItems] = useState<NewsletterArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<{ title: string; html: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNewsletterArchive();
      setItems(data.newsletters);
    } catch {
      console.error('Failed to load archive');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleView(id: string) {
    try {
      const data = await getArchivedNewsletter(id);
      setViewing({ title: data.newsletter.title, html: data.newsletter.html_content });
    } catch {
      console.error('Failed to load newsletter');
    }
  }

  function handleDownload() {
    if (!viewing) return;
    const blob = new Blob([viewing.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewing.title.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (viewing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{viewing.title}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewing(null)}>
              Back
            </Button>
            <Button size="sm" onClick={handleDownload}>
              Download
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <iframe
              srcDoc={viewing.html}
              title="Newsletter"
              className="w-full min-h-[600px] border-0 rounded-lg"
              sandbox="allow-same-origin"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading archive...
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No newsletters generated yet.
        </p>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleView(item.id)}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-accent"
          >
            <div>
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(item.generated_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                · {item.article_count} articles
              </p>
            </div>
            <svg
              className="size-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ))
      )}
    </div>
  );
}
