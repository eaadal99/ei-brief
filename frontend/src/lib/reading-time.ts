/**
 * Rough reading-time estimate from headline + summary.
 * 225 words-per-minute baseline. Minimum 1 min.
 */
export function readingTime(...parts: (string | null | undefined)[]): string {
  const text = parts.filter(Boolean).join(' ');
  if (!text) return '1 min read';
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 225));
  return `${mins} min read`;
}

/**
 * Concise relative time — tuned for a financial terminal feel.
 * Returns "just now", "12m", "3h", "2d", "Apr 14".
 */
export function shortRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'now';
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
