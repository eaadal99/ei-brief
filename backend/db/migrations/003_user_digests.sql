-- Migration 003: user_digests table for AI digest caching
-- Run via Railway DB browser

CREATE TABLE IF NOT EXISTS user_digests (
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  digest_json  JSONB       NOT NULL,
  PRIMARY KEY (user_id)
);
