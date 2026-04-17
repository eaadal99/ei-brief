import { SECTOR_MAP } from '@/lib/types';

interface SectorDotProps {
  sector: string | null | undefined;
  size?: number;
  className?: string;
}

/**
 * An 8px coloured dot — the quiet signature of the new UI.
 * Replaces verbose pill badges with a single editorial mark.
 */
export function SectorDot({ sector, size = 8, className = '' }: SectorDotProps) {
  const s = sector ? SECTOR_MAP[sector as keyof typeof SECTOR_MAP] : null;
  const color = s?.color ?? '#78716C';
  return (
    <span
      aria-label={s?.label ?? 'Unsorted'}
      title={s?.label ?? 'Unsorted'}
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

export function SectorTag({ sector }: { sector: string | null | undefined }) {
  const s = sector ? SECTOR_MAP[sector as keyof typeof SECTOR_MAP] : null;
  if (!s) return null;
  return (
    <span className="inline-flex items-center gap-1.5 eyebrow text-muted-foreground">
      <SectorDot sector={sector} />
      <span>{s.label}</span>
    </span>
  );
}
