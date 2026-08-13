# NextSprintEngineeringBacklog.md

**Created:** 2026-08-12  
**After closure SHA:** `8096e54`  
**Mode:** Handoff only — **do not implement in the closed sprint**

## P0
**NONE** — unless contradictory production evidence appears.

## P1 — Non-regenerable user/Admin state durability

### A. User-assistance escalations
| Field | Notes |
|---|---|
| CURRENT_OWNER | `services/userAssistanceEscalationStore.js` |
| CURRENT_WRITE_PATH | append JSONL `data/user-assistance-escalations.jsonl` |
| CURRENT_READ_PATH | read same JSONL |
| CURRENT_FILE_STORE | file-only |
| EXISTING_POSTGRES_CAPABILITY | extend `founderExperienceDurableStore` / `bible_buddy_documents` pattern |
| RESTART_BEHAVIOR | pending escalations lost on Render redeploy |
| EXPECTED_SEMANTICS | pending user-support items survive restart |
| MINIMAL_REPAIR | dual-write + boot hydrate (same pattern as audit/learning) |
| REGRESSION_TEST_REQUIRED | WRITE → durable → wipe file → hydrate → READ equality |

### B. Alpha-feedback
| Field | Notes |
|---|---|
| CURRENT_OWNER | `services/alphaFeedbackCapture.js` |
| CURRENT_WRITE_PATH | `data/alpha-feedback.jsonl` |
| CURRENT_READ_PATH | same JSONL (+ knowledge-improvement input) |
| CURRENT_FILE_STORE | file-only |
| EXISTING_POSTGRES_CAPABILITY | same durable document projection pattern |
| RESTART_BEHAVIOR | submitted tags/history lost on redeploy |
| EXPECTED_SEMANTICS | user-submitted feedback retained |
| MINIMAL_REPAIR | dual-write + hydrate via existing durable infrastructure |
| REGRESSION_TEST_REQUIRED | WRITE → durable → wipe → hydrate → READ |

### C. Help Center Admin edits
| Field | Notes |
|---|---|
| CURRENT_OWNER | `services/helpCenterContentStore.js` |
| CURRENT_WRITE_PATH | `storageAdapter` → `data/help-center-articles.json` |
| CURRENT_READ_PATH | same (seed on empty) |
| CURRENT_FILE_STORE | default FILE; does **not** auto-force Postgres on `DATABASE_URL` |
| EXISTING_POSTGRES_CAPABILITY | `storageAdapter` Postgres path (see `durableUserMemory` contrast) |
| RESTART_BEHAVIOR | seed recovers empty file; **Admin edits** do not |
| EXPECTED_SEMANTICS | Admin-authored articles survive; seed remains empty-file fallback |
| MINIMAL_REPAIR | when `DATABASE_URL` set, persist Help docs via Postgres adapter; keep seed fallback |
| REGRESSION_TEST_REQUIRED | Admin write → durable → wipe file → read recovers edit (not only seed) |

## P2 — Product / architecture decisions (no auto-implement)
- support-graph decision/status history across redeploy
- Founder Intelligence decision/dedupe history across redeploy
- lesson-alignment history
- notification preferences/history
- Sabbath cold-ask wording
- medical / life-decision wording

## P3 — Engineering hygiene
- Optional parallel-test isolation for learning-record durable fixtures (`node --test` concurrency)

## Infrastructure follow-up
- Historical Render exit-1 / health-timeout logs — classify **only** when logs are obtained; do not speculate an app fix

---

## Recommended next sprint

**SPRINT A — NON-REGENERABLE USER/ADMIN STATE DURABILITY**

Scope (in order):
1. Escalations  
2. Alpha-feedback  
3. Help Center Admin edits  

**Why:** These are non-regenerable user/Admin states with established semantics; FE governance durability is already done. Prefer extending existing Postgres/`founderExperienceDurableStore`/`storageAdapter` patterns — **no** new DB, queue, or governance framework.

Required contract per item:  
`WRITE → durable persistence → simulate ephemeral/file loss → restart/hydrate → READ → semantic equality`
