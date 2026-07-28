# 118 — Existing Infrastructure Reuse

## Reused (not replaced)

1. `services/persistence/storageAdapter.js`
2. `services/persistence/postgresAdapter.js` → `bible_buddy_documents`
3. `services/durableUserMemory.js` (Phase 7C owner — no new engine in 7C.1)
4. Render `DATABASE_URL` env slot already declared in `render.yaml`

## Not created

- No new relationship database
- No new memory engine
- No parallel persistence layer
- No new orchestrator / runtime

## 7C.1 code delta

`PostgresStorageAdapter.ensureSchema()` — idempotent `CREATE TABLE IF NOT EXISTS bible_buddy_documents` so first connect after Founder sets `DATABASE_URL` self-prepares the existing designed table.
