'use client';

import type { Article } from '@/lib/types';
import { SECTOR_MAP } from '@/lib/types';
import { SectorDot } from './sector-dot';
import { readingTime, shortRelativeTime } from '@/lib/reading-time';

// ── ArticleCard ────────────────────────────────────────────────────────────

interface ArticleCardProps {
  article: Article;
  onFeedback?: (id: string, feedback: 'relevant' | 'not_relevant') => void;
  onSave?: (id: string) => void;
  showFeedback?: boolean;
  feedbackState?: 'relevant' | 'not_relevant';
  /** 'standard' = full card (default), 'compact' = tile for rails */
  variant?: 'standard' | 'compact';
  index?: number;
}

export function ArticleCard({
  article,
  onFeedback,
  onSave,
  showFeedback = true,
  feedbackState,
  variant = 'standard',
  index = 0,
}: ArticleCardProps) {
  const sector = article.sector ? SECTOR_MAP[article.sector as keyof typeof SECTOR_MAP] : null;
  const isPending = !!feedbackState;
  const time = shortRelativeTime(article.published_at);

  if (variant === 'compact') {
    return (
      <article
        className="group snap-start shrink-0 w-[320px] flex flex-col gap-3 py-4 px-4 bg-card/60 rounded-lg hover:bg-card hover:-translate-y-0.5 transition-all duration-200 animate-fade-up"
        style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 eyebrow text-muted-foreground">
            <SectorDot sector={article.sector} />
            <span>{sector?.label ?? 'Other'}</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{time}</span>
        </div>

        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="display-serif text-[17px] font-semibold leading-[1.2] text-foreground group-hover:text-foreground/80 transition-colors line-clamp-3"
          >
            {article.headline}
          </a>
        ) : (
          <h3 className="display-serif text-[17px] font-semibold leading-[1.2] line-clamp-3">{article.headline}</h3>
        )}

        {article.summary && (
          <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-3">
            {article.summary}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate max-w-[60%]">{article.source_name}</span>
          {onSave && (
            <button
              onClick={() => onSave(article.id)}
              className={`transition-colors ${article.is_saved ? 'text-foreground' : 'hover:text-foreground'}`}
              title={article.is_saved ? 'Unsave' : 'Save'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={article.is_saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            </button>
          )}
        </div>
      </article>
    );
  }

  // Standard — dense, editorial, thin top-rule
  return (
    <article
      className={[
        'group relative flex gap-4 sm:gap-6 py-6 transition-opacity animate-fade-up',
        isPending ? 'opacity-50' : '',
      ].join(' ')}
      style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
    >
      {/* Left meta column (desktop) */}
      <div className="hidden sm:flex flex-col gap-2 shrink-0 w-[120px] pt-1">
        <div className="flex items-center gap-1.5 eyebrow text-muted-foreground">
          <SectorDot sector={article.sector} />
          <span className="truncate">{sector?.label ?? 'Other'}</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{time}</span>
        <span className="font-mono text-[11px] text-muted-foreground/70 tabular-nums">
          {readingTime(article.headline, article.summary)}
        </span>
      </div>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Mobile meta */}
        <div className="sm:hidden flex items-center gap-2 eyebrow text-muted-foreground">
          <SectorDot sector={article.sector} />
          <span>{sector?.label ?? 'Other'}</span>
          <span className="opacity-40">·</span>
          <span className="font-mono">{time}</span>
        </div>

        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <h3 className="display-serif text-[20px] sm:text-[22px] font-semibold leading-[1.18] text-foreground group-hover:text-foreground/80 transition-colors">
              {article.headline}
            </h3>
          </a>
        ) : (
          <h3 className="display-serif text-[20px] sm:text-[22px] font-semibold leading-[1.18]">
            {article.headline}
          </h3>
        )}

        {article.summary && (
          <p className="text-[13px] sm:text-[13.5px] text-muted-foreground leading-relaxed line-clamp-2 max-w-2xl">
            {article.summary}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 mt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            {article.source_name && (
              <span className="font-medium text-foreground/70 truncate">{article.source_name}</span>
            )}
            {article.geography && (
              <>
                <span className="opacity-40">·</span>
                <span className="eyebrow">{article.geography}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {showFeedback && onFeedback && (
              <>
                <button
                  disabled={isPending}
                  onClick={() => onFeedback(article.id, 'relevant')}
                  className={[
                    'px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                    feedbackState === 'relevant'
                      ? 'text-emerald-400'
                      : 'text-muted-foreground hover:text-emerald-400 hover:bg-muted/60',
                  ].join(' ')}
                  title="Mark relevant (R)"
                >
                  Relevant
                </button>
                <button
                  disabled={isPending}
                  onClick={() => onFeedback(article.id, 'not_relevant')}
                  className={[
                    'px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                    feedbackState === 'not_relevant'
                      ? 'text-rose-400'
                      : 'text-muted-foreground hover:text-rose-400 hover:bg-muted/60',
                  ].join(' ')}
                  title="Skip (X)"
                >
                  Skip
                </button>
              </>
            )}

            {onSave && (
              <button
                onClick={() => onSave(article.id)}
                className={[
                  'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  article.is_saved
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                ].join(' ')}
                title="Save (S)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill={article.is_saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
                {article.is_saved ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
