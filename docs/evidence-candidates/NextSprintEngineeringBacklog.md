# NextSprintEngineeringBacklog.md

**Updated:** 2026-08-13 (Sprint A closure)  
**After prior closure SHA:** `8096e54`  
**Sprint A:** NON-REGENERABLE USER/ADMIN STATE DURABILITY — **DONE**

## P0
**NONE** — unless contradictory production evidence appears.

## P1 — Non-regenerable user/Admin state durability
**COMPLETED in Sprint A** (dual-write + boot hydrate via `founderExperienceDurableStore`; regression `tests/sprintANonRegenerableDurability.test.js`):

- [x] A. User-assistance escalations (`userAssistanceEscalationStore`)
- [x] B. Alpha-feedback (`alphaFeedbackCapture`)
- [x] C. Help Center Admin edits (`helpCenterContentStore` — durable Admin content wins; seed remains empty-file fallback)

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
