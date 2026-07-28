# 73 — Production Relational Validation

**Certified production commit:** `4f9bc62`  
**Health check:** `/health.releaseCommit` = `4f9bc62`  
**Probe log:** `logs/01-production-probes.jsonl`

## Case results (live)

| Case | Result | Route | Notes |
|---|---|---|---|
| C1 Prayer | **PASS** | `phase5k_prayer_companion` | Prays for dad + hospital burden; no greeting dump |
| C2 Remember | **PASS** | `companion_personal_remember` | Natural ack; no admin language |
| C3 Recall | **PASS** | `relationship_memory_recall` | Person-first (dad / worry / prayer) |
| C4 Pray again | **PASS** | `phase5k_prayer_companion` | Stays prayer; reuses dad (after overwrite fix) |
| C5 Celebration | **PASS** | `companion_celebration_presence` | Presence before verse dump |
| C6 Return | **PASS** | `reason_first_openai` | Continuity without profile dump |
| GK control | **PASS** | `reason_first_openai` | Paris |

## Local corpus

`scripts/runPhase7ARelationalRegression.js` → **15/15** prior to final hotfix; unit confirmed pray-again subject retention.

## Residual

File-backed relationship memory remains host-local (Render). Sticky instance behavior is sufficient for sequential chat; shared durable memory is out of Phase 7A scope (no new DB).
