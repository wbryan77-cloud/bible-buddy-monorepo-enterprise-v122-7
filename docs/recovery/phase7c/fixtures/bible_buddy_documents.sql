-- Phase 7C — Existing bible_buddy_documents schema (postgresAdapter.js)
-- Not a new relationship database — generic document store already designed.

CREATE TABLE IF NOT EXISTS bible_buddy_documents (
  doc_key     TEXT PRIMARY KEY,
  doc_value   JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
