'use client';

import { useRef } from 'react';
import { SECTOR_MAP } from '@/lib/types';

interface RailProps {
  sectorKey: string;
  children: React.ReactNode;
  count?: number;
}

/**
 * Horizontally-scrolling sector rail with section heading, sector-coloured rule,
 * and prev/next scroll buttons. Snap points + momentum via CSS.
 */
export function Rail({ sectorKey, children, count }: RailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sector = SECTOR_MAP[sectorKey as keyof typeof SECTOR_MAP];

  function scrollBy(delta: number) {
    ref.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  return (
    <section className="relative" id={`rail-${sectorKey}`}>
      {/* Heading row */}
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-3">
          <span
            className="block w-8 h-px mb-1.5"
            style={{ backgroundColor: sector?.color ?? 'var(--brand)' }}
          />
          <h3 className="display-serif text-2xl font-semibold text-foreground">
            {sector?.label ?? 'Other'}
          </h3>
          {typeof count === 'number' && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {count} article{count === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrollBy(-360)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Scroll left"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => scrollBy(360)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Scroll right"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scroll container */}
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-6 px-6"
      >
        {children}
      </div>

      {/* Edge fades */}
      <span className="pointer-events-none absolute left-0 top-12 bottom-2 w-8 bg-gradient-to-r from-background to-transparent" />
      <span className="pointer-events-none absolute right-0 top-12 bottom-2 w-8 bg-gradient-to-l from-background to-transparent" />
    </section>
  );
}
