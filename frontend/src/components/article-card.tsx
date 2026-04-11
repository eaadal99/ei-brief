'use client';

import type { Article } from '@/lib/types';
import { SECTOR_MAP } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ── Relative time helper ───────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

// ── SVG icons ──────────────────────────────────────────────────────────────

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbsDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

function BookmarkIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

// ── ArticleCard component ──────────────────────────────────────────────────

interface ArticleCardProps {
  article: Article;
  onFeedback?: (id: string, feedback: 'relevant' | 'not_relevant') => void;
  onSave?: (id: string) => void;
  showFeedback?: boolean;
  /** Set by parent during the brief flash period before article disappears */
  feedbackState?: 'relevant' | 'not_relevant';
}

export function ArticleCard({
  article,
  onFeedback,
  onSave,
  showFeedback = true,
  feedbackState,
}: ArticleCardProps) {
  const sector = article.sector ? SECTOR_MAP[article.sector] : null;
  const isPending = !!feedbackState;

  return (
    <Card
      size="sm"
      className={
        isPending
          ? feedbackState === 'relevant'
            ? 'opacity-60 ring-1 ring-green-400 transition-all duration-300'
            : 'opacity-60 ring-1 ring-red-400 transition-all duration-300'
          : 'transition-all duration-300'
      }
    >
      <CardContent className="flex flex-col gap-2">
        {/* Top row: sector badge, geography, source, time */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {sector && (
            <Badge
              variant="outline"
              className="border-transparent px-1.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: sector.color + '18', color: sector.color }}
            >
              {sector.label}
            </Badge>
          )}
          {article.geography && (
            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {article.geography}
            </span>
          )}
          {article.source_name && (
            <span className="text-muted-foreground">{article.source_name}</span>
          )}
          {article.published_at && (
            <span className="ml-auto text-muted-foreground">
              {relativeTime(article.published_at)}
            </span>
          )}
        </div>

        {/* Headline */}
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold leading-snug hover:underline"
          >
            {article.headline}
          </a>
        ) : (
          <p className="text-base font-semibold leading-snug">
            {article.headline}
          </p>
        )}

        {/* Summary */}
        {article.summary && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {article.summary}
          </p>
        )}

        {/* Bottom row: feedback + save */}
        {(showFeedback || onSave) && (
          <div className="flex items-center gap-1 pt-1">
            {showFeedback && onFeedback && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 w-7 p-0 transition-colors ${
                    feedbackState === 'relevant'
                      ? 'text-green-600'
                      : 'text-muted-foreground hover:text-green-600'
                  }`}
                  disabled={isPending}
                  onClick={() => onFeedback(article.id, 'relevant')}
                >
                  <ThumbsUpIcon className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 w-7 p-0 transition-colors ${
                    feedbackState === 'not_relevant'
                      ? 'text-red-500'
                      : 'text-muted-foreground hover:text-red-500'
                  }`}
                  disabled={isPending}
                  onClick={() => onFeedback(article.id, 'not_relevant')}
                >
                  <ThumbsDownIcon className="size-3.5" />
                </Button>
              </>
            )}

            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onSave(article.id)}
              >
                <BookmarkIcon
                  className="size-3.5"
                  filled={!!article.is_saved}
                />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
