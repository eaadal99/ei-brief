-- E&I Brief v1 — Initial Schema
-- Run once on a fresh PostgreSQL database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  sector_focus  TEXT,
  last_active   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a default user (fallback for team-wide settings)
INSERT INTO users (name, display_name, sector_focus)
VALUES ('default', 'Default User', 'all')
ON CONFLICT (name) DO NOTHING;

-- ─── User Preferences ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

-- ─── RSS Sources ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rss_sources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  rss_url    TEXT NOT NULL UNIQUE,
  sector     TEXT NOT NULL DEFAULT 'general',
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Articles ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline      TEXT NOT NULL,
  url           TEXT UNIQUE,
  summary       TEXT,
  source_name   TEXT,
  source_key    TEXT,
  sector        TEXT,
  geography     TEXT,
  published_at  TIMESTAMPTZ,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content_hash  TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_sector ON articles(sector);
CREATE INDEX IF NOT EXISTS idx_articles_fetched ON articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);

-- ─── User Feedback ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  feedback    TEXT NOT NULL CHECK (feedback IN ('relevant', 'not_relevant')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, article_id)
);

-- ─── User Saved Articles ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_saved_articles (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);

-- ─── Newsletter Config ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_area  TEXT NOT NULL,
  sector_keys    TEXT[] NOT NULL DEFAULT '{}',
  display_order  INT NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT true
);

-- ─── Newsletter Archive ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_archive (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  html_content  TEXT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  article_ids   UUID[] NOT NULL DEFAULT '{}'
);

-- Seed default newsletter sections
INSERT INTO newsletter_config (practice_area, sector_keys, display_order) VALUES
  ('Nuclear', ARRAY['nuclear'], 1),
  ('Oil & Gas', ARRAY['oil_gas'], 2),
  ('Renewables', ARRAY['wind', 'solar', 'hydrogen'], 3),
  ('Mining & Critical Minerals', ARRAY['mining'], 4),
  ('Carbon & Climate', ARRAY['ccus', 'carbon_markets'], 5),
  ('Grid & Infrastructure', ARRAY['grid_infrastructure', 'bess', 'data_centres'], 6)
ON CONFLICT DO NOTHING;
