# 120 — Production Activation Report

## Attempted activation

| Step | Result |
|---|---|
| Detect DATABASE_URL on production | **Missing** |
| Configure via agent / Render API | **Impossible** — no `RENDER_API_KEY`, no dashboard access |
| Apply schema remotely | Blocked on missing URL |
| Redeploy for durability flip | Code ready; env not set |

## Founder action required (smallest repair)

1. In Render: create **or attach existing** Postgres to the `bible-buddy` web service (reuse one DB if already present for the account).
2. Ensure `DATABASE_URL` is set on the web service.
3. Redeploy (or restart) so `durableUserMemory` selects POSTGRES.
4. Confirm `/health`:

```json
"durableMemory": { "backend": "POSTGRES", "durable": true, "hasDatabaseUrl": true }
```

5. Schema auto-creates on first durable read/write (`ensureSchema`).

No new database product is required beyond attaching the existing Postgres capability Render already supports.
