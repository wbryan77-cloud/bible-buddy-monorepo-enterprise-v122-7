# 72 — Longitudinal Validation Report

## Simulation plan

| Visit | Scenario | Expected |
|---|---|---|
| 1 | Share dad hospital + pray | Personalized prayer |
| 2 | Remember worry | Natural ack |
| 3 | Recall | Person-first dad/worry |
| 4 | Pray again | Prayer, prior person if stored |
| 5 | Tears on verse | Presence before dump |
| Gap return | “I’m back” | Continuity without profile dump |
| Resolved burden | New topic unrelated | No forced dad mention |
| Preference change | Prefer shorter | Style ack without admin |
| Correction | “No, I meant my father” | Current message wins |

## Local longitudinal smoke (same user)

Executed via Phase 7A regression L1–L4 on shared `*-mem` / `*-pray` users: remember → recall person-first; pray → pray again stays prayer.

Artifact: `fixtures/behavior-family-results.json`, `fixtures/longitudinal-scenarios.json`.

## Production longitudinal

Deferred to post-deploy probes in `73` + Founder Experience Loop (multi-day).
