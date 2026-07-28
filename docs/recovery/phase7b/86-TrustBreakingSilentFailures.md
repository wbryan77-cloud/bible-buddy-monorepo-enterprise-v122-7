# 86 — Trust-Breaking Silent Failures

| Failure | Pre-7B | Post-7B | Detected by regression? |
|---|---|---|---|
| “pray for mother's” | Silent grammar FAIL | Fixed kinship-first extract | U_mother_possessive |
| “pray for the” | Confabulation | Stopwords + clarifier | U_stop_the / U_vague |
| Short prayer → empty bible_wide | Trust break | humanNeed + concise prayer | L_I_short |
| Prayer request text as burden | Awkward | compactBurdenText rejects pray-only text | L_E_change |
| Active crisis after “home now” | Silent stale | resolved concern | L_F_recall_resolved |
| Selector persistence contradicting docs | Architecture trust | Removed write | boundary review |
| File memory ≠ durable promise | Silent infra | Documented in 81 | topology |

Fixtures: `fixtures/silent-failure-cases.json`
