# 90 — Controlled Repair Report

Repairs only after reproduced failures:

| Repair | Owner | Change |
|---|---|---|
| Possessive/kinship extract | selector | Kinship-first; strip `'s`; stopwords |
| Vague “the” person | prayer engine | Clarifier when no recoverable person |
| Short prayer → bible_wide | humanNeedDetector + prayer | `prayer for` / short prayer → prayer need; concise template |
| No explanation | prayer engine | Skip scripture coda / sermon lines |
| Burden = instruction text | selector compactBurden | Reject pray-only struggle text |
| Resolved burden | relationshipMemoryEngine | `recentConcern=resolved` |
| Selector persistence | selector + orchestrator | Writes only via memory engine |
| OpenAI prayer userId | openAiFirstCompanionRuntime | Pass `userId` |
| Forget prefs | forgetUserMemory | Also clear preference scope |

Regression: `scripts/runPhase7BRelationalIntegrityRegression.js` **20/20**; Phase 7A suite re-run after repairs.
