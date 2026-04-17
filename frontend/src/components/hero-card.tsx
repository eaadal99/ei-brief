'use client';

import type { Article } from '@/lib/types';
import { SECTOR_MAP } from '@/lib/types';
import { SectorDot } from './sector-dot';
import { readingTime, shortRelativeTime } from '@/lib/reading-time';

interface HeroCardProps {
  article: Article;
  onSave?: (id: string) => void;
  onFeedback?: (id: string, f: 'relevant' | 'not_relevant') => void;
}

export function HeroCard({ article, onSave, onFeedback }: HeroCardProps) {
  const sector = article.sector ? SECTOR_MAP[article.sector as keyof typeof SECTOR_MAP] : null;
  const time = shortRelativeTime(article.published_at);

  return (
    <article className="group relative flex flex-col gap-5 py-10 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 eyebrow text-muted-foreground">
          <SectorDot sector={article.sector} />
          <span className="text-foreground/70">{sector?.label ?? 'Lead'}</span>
          <span className="opacity-40">·</span>
          <span>Lead story</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
          {time && <span>{time}</span>}
          <span>{readingTime(article.headline, article.summary)}</span>
        </div>
      </div>

      {article.url ? (
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
          <h2 className="display-serif text-[2rem] sm:text-[2.75rem] lg:text-[3.5rem] font-semibold leading-[1.05] text-foreground group-hover:text-foreground/85 transition-colors">
            {article.headline}
          </h2>
        </a>
      ) : (
        <h2 className="display-serif text-[2rem] sm:text-[2.75rem] lg:text-[3.5rem] font-semibold leading-[1.05] text-foreground">
          {article.headline}
        </h2>
      )}

      {article.summary && (
        <p className="text-base sm:text-lg text-foreground/70 leading-relaxed max-w-3xl text-balance italic display-serif font-normal">
          &ldquo;{article.summary}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {article.source_name && (
            <span className="font-medium text-foreground/70">{article.source_name}</span>
          )}
          {article.geography && (
            <>
              <span className="opacity-40">·</span>
              <span className="eyebrow text-muted-foreground">{article.geography}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onFeedback && (
            <>
              <button
                onClick={() => onFeedback(article.id, 'relevant')}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Mark relevant (R)"
              >
                Relevant
              </button>
              <button
                onClick={() => onFeedback(article.id, 'not_relevant')}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
                'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5',
                article.is_saved
                  ? 'text-foreground bg-muted/60'
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
    </article>
  );
}
