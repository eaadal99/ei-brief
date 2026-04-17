'use client';

import type { Article } from '@/lib/types';
import { SectorDot } from './sector-dot';
import { shortRelativeTime } from '@/lib/reading-time';

interface ListRowProps {
  article: Article;
  onSave?: (id: string) => void;
  onToggleRead?: (id: string) => void;
  isRead?: boolean;
  index?: number;
}

/**
 * Dense single-line article row — the library/terminal workhorse.
 * Layout: [time] [sector-dot] [headline] [source] [save]
 */
export function ListRow({ article, onSave, onToggleRead, isRead, index = 0 }: ListRowProps) {
  return (
    <div
      className="group flex items-center gap-3 py-3 border-b border-border/70 animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 10) * 20}ms` }}
    >
      <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-12 tabular-nums">
        {shortRelativeTime(article.published_at)}
      </span>

      <SectorDot sector={article.sector} />

      <div className="flex-1 min-w-0">
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block truncate text-sm font-medium ${isRead ? 'text-muted-foreground' : 'text-foreground'} hover:brand-text transition-colors`}
          >
            {article.headline}
          </a>
        ) : (
          <span className="block truncate text-sm font-medium">{article.headline}</span>
        )}
      </div>

      {article.source_name && (
        <span className="hidden md:inline text-[11px] text-muted-foreground shrink-0 truncate max-w-[160px]">
          {article.source_name}
        </span>
      )}

      {article.geography && (
        <span className="hidden lg:inline eyebrow text-muted-foreground/80 shrink-0">
          {article.geography}
        </span>
      )}

      <div className="flex items-center gap-0.5 shrink-0">
        {onToggleRead && (
          <button
            onClick={() => onToggleRead(article.id)}
            className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 transition-all"
            title={isRead ? 'Mark unread' : 'Mark read'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isRead ? (
                <>
                  <path d="m1 12 4.5 4.5L22 2" />
                  <path d="M22 12c0 5.5-4.5 10-10 10" opacity="0.4" />
                </>
              ) : (
                <circle cx="12" cy="12" r="3" />
              )}
            </svg>
          </button>
        )}
        {onSave && (
          <button
            onClick={() => onSave(article.id)}
            className={[
              'p-1.5 rounded-md transition-colors',
              article.is_saved
                ? 'text-foreground'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100',
            ].join(' ')}
            title={article.is_saved ? 'Unsave' : 'Save'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={article.is_saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
