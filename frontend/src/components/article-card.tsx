'use client';

import type { Article } from '@/lib/types';
import { SECTOR_MAP } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// ── Icons ──────────────────────────────────────────────────────────────────

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbsDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

function BookmarkIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

// ── ArticleCard ────────────────────────────────────────────────────────────

interface ArticleCardProps {
  article: Article;
  onFeedback?: (id: string, feedback: 'relevant' | 'not_relevant') => void;
  onSave?: (id: string) => void;
  showFeedback?: boolean;
  feedbackState?: 'relevant' | 'not_relevant';
}

export function ArticleCard({
  article,
  onFeedback,
  onSave,
  showFeedback = true,
  feedbackState,
}: ArticleCardProps) {
  const sector = article.sector ? SECTOR_MAP[article.sector as keyof typeof SECTOR_MAP] : null;
  const isPending = !!feedbackState;

  return (
    <article
      className={[
        'group relative bg-card rounded-xl border transition-all duration-200',
        'hover:shadow-[0_4px_16px_oklch(0_0_0/7%)] hover:-translate-y-px',
        isPending && feedbackState === 'relevant'
          ? 'opacity-60 ring-1 ring-green-400 border-green-200'
          : isPending
          ? 'opacity-60 ring-1 ring-red-400 border-red-200'
          : 'border-border',
      ].filter(Boolean).join(' ')}
      style={sector ? { borderLeftColor: sector.color, borderLeftWidth: '3px' } : {}}
    >
      <div className="px-4 pt-4 pb-3 flex flex-col gap-2.5">

        {/* Meta row: source + time on left, geo + sector on right */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
            {article.source_name && (
              <span className="font-medium truncate">{article.source_name}</span>
            )}
            {article.published_at && (
              <>
                <span className="opacity-30 shrink-0">·</span>
                <span className="shrink-0 tabular-nums">{relativeTime(article.published_at)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {article.geography && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                {article.geography}
              </span>
            )}
            {sector && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ backgroundColor: sector.color + '1a', color: sector.color }}
              >
                {sector.label}
              </span>
            )}
          </div>
        </div>

        {/* Headline */}
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-start gap-1.5"
          >
            <span className="text-[0.9375rem] font-semibold leading-snug text-foreground group-hover/link:text-foreground/70 transition-colors">
              {article.headline}
            </span>
            <ExternalLinkIcon className="size-3 mt-1 shrink-0 text-muted-foreground/40 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>
        ) : (
          <p className="text-[0.9375rem] font-semibold leading-snug">{article.headline}</p>
        )}

        {/* Summary */}
        {article.summary && (
          <p className="text-[0.8125rem] text-muted-foreground leading-relaxed line-clamp-2">
            {article.summary}
          </p>
        )}

        {/* Action row */}
        {(showFeedback || onSave) && (
          <div className="flex items-center gap-0.5 pt-2 mt-0.5 border-t border-border/50">
            {showFeedback && onFeedback && (
              <div className="flex items-center gap-0.5">
                <button
                  disabled={isPending}
                  onClick={() => onFeedback(article.id, 'relevant')}
                  className={[
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                    feedbackState === 'relevant'
                      ? 'bg-green-50 text-green-600 dark:bg-green-950/40'
                      : 'text-muted-foreground hover:bg-muted hover:text-green-600',
                    isPending ? 'cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <ThumbsUpIcon className="size-3" />
                  <span>Relevant</span>
                </button>
                <button
                  disabled={isPending}
                  onClick={() => onFeedback(article.id, 'not_relevant')}
                  className={[
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                    feedbackState === 'not_relevant'
                      ? 'bg-red-50 text-red-500 dark:bg-red-950/40'
                      : 'text-muted-foreground hover:bg-muted hover:text-red-500',
                    isPending ? 'cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <ThumbsDownIcon className="size-3" />
                  <span>Skip</span>
                </button>
              </div>
            )}

            {onSave && (
              <button
                onClick={() => onSave(article.id)}
                className={[
                  'ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  article.is_saved
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                <BookmarkIcon className="size-3" filled={!!article.is_saved} />
                <span>{article.is_saved ? 'Saved' : 'Save'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
