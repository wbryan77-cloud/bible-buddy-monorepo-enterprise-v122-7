# 64 — Relational Root-Cause Confirmation

## Reproduced on production (`logs/00-case-repro.jsonl`)

| Case | Observed route | Root cause |
|---|---|---|
| 1 Prayer | `phase5k_prayer_companion` + generic focus | Prayer engine ignored person/burden; false “namesDad” via Father regex |
| 2 Remember | `no_glitch_learning_candidate` | Admin `LEARNING_ACK` surfaced as companion reply |
| 3 Recall | `relationship_memory_recall` | Pref-first recall ordering |
| 4 Pray again | `response_revision_explanation_context` | Short-message “again” → revision |
| 5 Celebration | `bible_wide_reasoning` | No presence gate before verse dump |
| 6 Return | `reason_first_openai` continuity works | Proves stores exist; care lanes under-consumed context |

## Systemic diagnosis

**Not** “missing Relationship Intelligence Engine.”  
**Is** “existing stores + care owners not sharing a selected context contract; admin/revision collisions.”

## Confirmation method

Trace: message → orchestrator early exits → lane engines → polish → reply. Matches code paths in `bibleCompanionOrchestrator.js`, `prayerCompanionEngine.js`, `responseRevisionOwner.js`, `reflectionMemoryEngine.js`.
