# NextSprintEngineeringBacklog.md

**Updated:** 2026-08-13 (Sprint B closure)  
**Sprint A:** non-regenerable durability — **DONE** (`c2cc61e`)  
**Sprint B:** product/architecture durability decisions + UX reconciliation — **DONE** (email dispatch fix + recommendations)

## P0
**NONE**

## P1
**NONE** unless Founder accepts a durability option below as a required contract.

## P2 — Founder product decisions (recommendations)

### Support Graph Admin decision history
- **RECOMMENDED:** Dual-write **decision rows only** (not full candidate payloads) via existing `founderExperienceDurableStore` when Founder wants governance survival across redeploy.
- **Defer risk:** Admin re-reviews approved/rejected candidates; user answers unaffected (edges are code-backed).

### Founder Intelligence disposition / dedupe
- **RECOMMENDED:** Dual-write **status + flaggedFalsePositive + decidedBy/note** keyed by `stableRecommendationId`; keep generated payloads regenerable.
- **Defer risk:** Rejected items resurface as PENDING after redeploy → Admin workload only.

### Lesson-alignment submission / overlay history
- **RECOMMENDED:** **Defer durability** — diagnostic tool; no production knowledge mutation; regenerable from paste.
- Retain only if Founder wants audit browsing across redeploys.

### Notification preferences / history
- **Prefs:** Product/Help implies persistence → **RECOMMENDED** durable projection of category prefs (and slot pref) when Founder prioritizes alpha UX across redeploy.
- **History:** Operational; durable only if compliance/audit needs it.
- **Email dispatch field bug:** **FIXED** in Sprint B (not a durability decision).

### Sabbath cold-ask wording
- **RECOMMENDED:** Keep current Scripture-first routing; optional copy polish only if Founder prefers more pastoral framing — **no routing change**.

### Medical / life-decision wording
- **RECOMMENDED:** Keep no-diagnosis / crisis contracts; optional unify “not a doctor” vs “can't diagnose” phrasing — **no safety architecture change**.

## P3
- Optional parallel-test isolation for learning-record fixtures

## Infrastructure
- Historical Render exit-1 / health-timeout — classify only with real logs
