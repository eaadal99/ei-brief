'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Command } from 'cmdk';
import { useArticlesContext } from './articles-context';
import { SECTORS } from '@/lib/types';
import { SectorDot } from './sector-dot';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { articles } = useArticlesContext();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] p-4 bg-background/75 backdrop-blur-sm no-print"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-up"
      >
        <Command label="Command menu" className="[&_[cmdk-input]]:outline-none">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search articles, jump to sector, toggle theme…"
              className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"
            />
            <kbd className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-muted/60">esc</kbd>
          </div>

          <Command.List className="max-h-[50vh] overflow-y-auto p-1.5 text-sm">
            <Command.Empty className="px-4 py-6 text-sm text-muted-foreground">
              No matches.
            </Command.Empty>

            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
              {[
                { href: '/', label: 'My Feed' },
                { href: '/digest', label: 'Digest · The Brief' },
                { href: '/all', label: 'All News' },
                { href: '/saved', label: 'Saved · Reading list' },
                { href: '/newsletter', label: 'Newsletter' },
                { href: '/preferences', label: 'Preferences' },
                { href: '/system', label: 'System' },
              ].map((p) => (
                <PaletteItem key={p.href} onSelect={() => go(p.href)}>
                  <span className="text-muted-foreground text-xs w-10 shrink-0">→</span>
                  <span>{p.label}</span>
                </PaletteItem>
              ))}
            </Command.Group>

            <Command.Group heading="Sectors" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
              {SECTORS.filter(s => s.key !== 'general').map((s) => (
                <PaletteItem key={s.key} onSelect={() => go(`/all?sector=${s.key}`)}>
                  <span className="w-10 shrink-0 flex items-center justify-center">
                    <SectorDot sector={s.key} />
                  </span>
                  <span>{s.label}</span>
                </PaletteItem>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
              <PaletteItem
                onSelect={() => {
                  setTheme(theme === 'paper' ? 'ink' : 'paper');
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground text-xs w-10 shrink-0">⎔</span>
                <span>Toggle theme ({theme === 'paper' ? 'ink' : 'paper'})</span>
              </PaletteItem>
              <PaletteItem onSelect={() => { setOpen(false); window.location.reload(); }}>
                <span className="text-muted-foreground text-xs w-10 shrink-0">↻</span>
                <span>Reload</span>
              </PaletteItem>
            </Command.Group>

            {articles.length > 0 && (
              <Command.Group heading="Articles on this page" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                {articles.slice(0, 20).map((a) => (
                  <PaletteItem
                    key={a.id}
                    onSelect={() => {
                      if (a.url) window.open(a.url, '_blank');
                      setOpen(false);
                    }}
                    value={`${a.headline} ${a.source_name ?? ''} ${a.summary ?? ''}`}
                  >
                    <span className="w-10 shrink-0 flex items-center justify-center">
                      <SectorDot sector={a.sector} />
                    </span>
                    <span className="truncate">{a.headline}</span>
                  </PaletteItem>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function PaletteItem({
  children,
  onSelect,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      value={value}
      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer data-[selected=true]:bg-muted/70 text-foreground/90"
    >
      {children}
    </Command.Item>
  );
}
