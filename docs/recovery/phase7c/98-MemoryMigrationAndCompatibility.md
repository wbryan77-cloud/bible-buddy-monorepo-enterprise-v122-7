# 98 — Memory Migration and Compatibility

## Schema

Apply once on Render Postgres (existing designed table, not a new relationship DB):

```sql
CREATE TABLE IF NOT EXISTS bible_buddy_documents (
  doc_key TEXT PRIMARY KEY,
  doc_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Activation

1. Set `DATABASE_URL` in Render dashboard.
2. Deploy code with `durableUserMemory` (this phase).
3. `/health.health.durableMemory` should report `{ backend: "POSTGRES", durable: true }`.

## Compatibility

- Without `DATABASE_URL`, FILE fallback remains for local/dev (`durable: false`).
- Local JSON mirrors remain for session continuity but are not claimed durable.
- No data loss migration required for empty production durable doc; optional copy from `relationship-memory.json` can be added later.
