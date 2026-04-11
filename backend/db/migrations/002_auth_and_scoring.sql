-- Migration 002: Per-user auth + aggregate feedback scoring
-- Run this after 001_initial_schema.sql

-- Per-user authentication fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Source quality tracking (updated after each feedback event)
ALTER TABLE rss_sources ADD COLUMN IF NOT EXISTS quality_score FLOAT NOT NULL DEFAULT 1.0;
ALTER TABLE rss_sources ADD COLUMN IF NOT EXISTS total_feedback INT NOT NULL DEFAULT 0;
ALTER TABLE rss_sources ADD COLUMN IF NOT EXISTS relevant_count INT NOT NULL DEFAULT 0;
