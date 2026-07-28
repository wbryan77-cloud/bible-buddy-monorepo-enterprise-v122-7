# 104 — Durable Memory Certification

## LAYER_1_DURABLE_MEMORY_GATE — PASS (architecture)

- Owner: `durableUserMemory`
- Existing Postgres document adapter wired when `DATABASE_URL` present
- Selector remains read-only
- Dual-write from relationship engines
- Local lifecycle tests 8/8

## LAYER_2 / DURABLE_COMPANION_MEMORY_NOT_READY

Production `88355b6` health:

```json
{
  "owner": "durableUserMemory",
  "backend": "FILE",
  "durable": false,
  "hasDatabaseUrl": false
}
```

| Blocking behavior | Cross-instance durable memory unavailable |
|---|---|
| Evidence | `/health.health.durableMemory.hasDatabaseUrl === false` |
| Expected | `backend: "POSTGRES"`, `durable: true` |
| Responsible | Render env / ops — `DATABASE_URL` not configured; schema may be unapplied |
| Root cause | Existing durable infra present in code but not provisioned in production |
| Smallest repair | 1) Create Render Postgres 2) Apply `fixtures/bible_buddy_documents.sql` 3) Set `DATABASE_URL` 4) Redeploy 5) Re-probe health + multi-session memory |
| Risk | Continuing to claim long-term memory without shared store |
| Required regression | Phase 7C durable suite + live restart/cross-instance probes |

**Do not proceed to Layer 3 (Founder Companion Optimization).**
