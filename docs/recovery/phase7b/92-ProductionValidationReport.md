# 92 — Production Validation Report

**Behavior commit:** `a1e75d4`  
**Verified:** `/health.releaseCommit` = `a1e75d4`  
**Log:** `logs/01-production-probes.jsonl`

| Probe | Route | Result |
|---|---|---|
| A mother surgery | phase5k_prayer_companion | PASS — my mother + surgery |
| B pray again | phase5k_prayer_companion | PASS — mother retained |
| C Paris | reason_first_openai | PASS |
| C pray again after GK | phase5k_prayer_companion | PASS — mother retained |
| I short prayer dad | phase7b_prayer_concise | PASS |
| K no explanation son | phase7b_prayer_concise | PASS |
| H vague prior | phase5k_prayer_companion | PASS — used last subject (son), not “the” |
| F dad home thanks | reason_first_openai | PASS gratitude |

## Suites

| Suite | Result |
|---|---|
| Phase 7B integrity | 20/20 local |
| Phase 7A relational | 15/15 local |
| Full FTC / 6X / 6Y gates | **Not fully re-run this window** |

## Alpha / admin / auth / streaming

Spot health OK. Full `/alpha` + admin auth matrix not re-executed here — treat as residual verification for FEL / ops.
