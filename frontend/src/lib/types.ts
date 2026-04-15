// ── Shared types ────────────────────────────────────────────────────────────

export interface Article {
  id: string;
  headline: string;
  url: string | null;
  summary: string | null;
  source_name: string | null;
  source_key: string | null;
  sector: string | null;
  geography: string | null;
  published_at: string | null;
  fetched_at: string;
  is_saved?: boolean;
}

export interface CurrentUser {
  id: string;
  name: string;
  display_name: string | null;
  sector_focus: string | null;
  is_admin?: boolean;
}

export interface AuthSession {
  token: string;
  user: CurrentUser;
}

export interface RssSource {
  id: string;
  name: string;
  rss_url: string;
  sector: string;
  enabled: boolean;
  created_at: string;
  quality_score?: number;
  total_feedback?: number;
  relevant_count?: number;
}

export interface NewsletterConfig {
  id: string;
  practice_area: string;
  sector_keys: string[];
  display_order: number;
  active: boolean;
}

export interface NewsletterArchiveItem {
  id: string;
  title: string;
  generated_at: string;
  article_count: number;
}

export interface DigestArticle {
  id: string;
  headline: string;
  url: string | null;
  source_name: string | null;
  published_at: string | null;
}

export interface DigestSection {
  sector: string;
  label: string;
  summary: string;
  articles: DigestArticle[];
}

export interface Digest {
  sections: DigestSection[];
  generated_at: string;
  cached: boolean;
}

export interface SystemStatus {
  status: string;
  database: string;
  ai: { available: boolean; provider: string };
  articles: { total: number; last_24h: number; last_7d: number; sectors: number };
  sources: { total: number; enabled: number };
  users: number;
  run: {
    running: boolean;
    lastRun: string | null;
    lastDuration: number | null;
    lastError: string | null;
    articlesAdded: number;
  };
  timestamp: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

export const SECTORS = [
  { key: 'nuclear', label: 'Nuclear', color: '#6366F1' },
  { key: 'oil_gas', label: 'Oil & Gas', color: '#8B5CF6' },
  { key: 'wind', label: 'Wind', color: '#06B6D4' },
  { key: 'solar', label: 'Solar', color: '#F59E0B' },
  { key: 'hydrogen', label: 'Hydrogen', color: '#10B981' },
  { key: 'mining', label: 'Mining', color: '#EF4444' },
  { key: 'ccus', label: 'CCUS', color: '#3B82F6' },
  { key: 'carbon_markets', label: 'Carbon Markets', color: '#14B8A6' },
  { key: 'bess', label: 'Storage', color: '#F97316' },
  { key: 'data_centres', label: 'Data Centres', color: '#A855F7' },
  { key: 'grid_infrastructure', label: 'Grid', color: '#64748B' },
  { key: 'ppa', label: 'PPAs', color: '#EC4899' },
  { key: 'general', label: 'General', color: '#78716C' },
] as const;

export const SECTOR_MAP = Object.fromEntries(SECTORS.map(s => [s.key, s]));

export const GEOGRAPHIES = [
  'UK', 'EU', 'US', 'Middle East', 'Asia Pacific', 'Africa', 'Americas', 'Global',
] as const;

export const PERSONAS: Record<string, {
  label: string;
  sectors: string[];
  geographies: string[];
  keywords: string[];
}> = {
  nuclear: { label: 'Nuclear', sectors: ['nuclear'], geographies: ['UK', 'EU', 'US', 'Asia Pacific'], keywords: ['SMR', 'EPR', 'GDA', 'fusion'] },
  oil_gas: { label: 'Oil & Gas', sectors: ['oil_gas'], geographies: ['US', 'Middle East', 'UK', 'EU'], keywords: ['LNG', 'upstream', 'FID'] },
  renewables: { label: 'Renewables', sectors: ['wind', 'solar', 'hydrogen', 'bess'], geographies: ['UK', 'EU', 'US'], keywords: ['PPA', 'offshore wind', 'green hydrogen'] },
  mining: { label: 'Mining & Minerals', sectors: ['mining'], geographies: ['Asia Pacific', 'Africa', 'Americas'], keywords: ['lithium', 'cobalt', 'rare earths', 'copper'] },
  carbon: { label: 'Carbon & Climate', sectors: ['ccus', 'carbon_markets', 'hydrogen'], geographies: [], keywords: ['net zero', 'EU ETS', 'carbon credit', 'CCUS'] },
  all: { label: 'All Sectors', sectors: [], geographies: [], keywords: [] },
  custom: { label: 'Custom (start blank)', sectors: [], geographies: [], keywords: [] },
};
