'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllArticles } from '@/lib/api';
import { SECTORS, SECTOR_MAP } from '@/lib/types';

interface SectorPulse {
  key: string;
  label: string;
  color: string;
  count24h: number;
  prevCount: number; // articles in the 24-48h window before
}

function trend(curr: number, prev: number): '▲' | '▼' | '—' {
  if (curr > prev * 1.15) return '▲';
  if (curr < prev * 0.85) return '▼';
  return '—';
}

export default function MarketTicker() {
  const [pulse, setPulse] = useState<SectorPulse[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getAllArticles({ limit: 300 });
      if (!alive) return;

      const now = Date.now();
      const t24 = now - 24 * 60 * 60 * 1000;
      const t48 = now - 48 * 60 * 60 * 1000;

      const counts24: Record<string, number> = {};
      const countsPrev: Record<string, number> = {};

      for (const a of data.articles) {
        if (!a.sector || a.sector === 'general') continue;
        const ts = new Date(a.published_at ?? a.fetched_at).getTime();
        if (ts >= t24) counts24[a.sector] = (counts24[a.sector] ?? 0) + 1;
        else if (ts >= t48) countsPrev[a.sector] = (countsPrev[a.sector] ?? 0) + 1;
      }

      const ordered: SectorPulse[] = SECTORS
        .filter((s) => s.key !== 'general')
        .map((s) => ({
          key: s.key,
          label: s.label,
          color: s.color,
          count24h: counts24[s.key] ?? 0,
          prevCount: countsPrev[s.key] ?? 0,
        }))
        .sort((a, b) => b.count24h - a.count24h);

      setPulse(ordered);
    })();

    return () => { alive = false; };
  }, []);

  if (pulse.length === 0) {
    return (
      <div className="h-8 w-full border-b border-border bg-background overflow-hidden" />
    );
  }

  const row = (
    <>
      {pulse.map((p) => {
        const t = trend(p.count24h, p.prevCount);
        const tClass = t === '▲' ? 'text-emerald-400' : t === '▼' ? 'text-rose-400' : 'text-muted-foreground';
        return (
          <Link
            key={p.key}
            href={`/all?sector=${p.key}`}
            className="group inline-flex items-center gap-1.5 px-4 shrink-0"
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="eyebrow text-foreground/80 group-hover:text-foreground transition-colors">
              {p.label}
            </span>
            <span className={`font-mono text-[11px] ${tClass}`}>
              {t} {p.count24h}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="h-8 w-full border-b border-border bg-background overflow-hidden flex items-stretch text-[11px] relative">
      <div className="flex items-center gap-1.5 px-4 border-r border-border shrink-0 bg-background z-10">
        <span className="relative inline-flex">
          <span className="w-1.5 h-1.5 rounded-full brand-bg animate-pulse-dot" />
        </span>
        <span className="eyebrow text-muted-foreground">Live · 24h</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="flex items-center absolute inset-y-0 left-0 animate-ticker-scroll whitespace-nowrap will-change-transform">
          {/* Duplicate for seamless loop */}
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}
