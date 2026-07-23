# Recurring Failure Lineage (critical subset)

## 1. “Tell me more.” → ask-again / core_connection_error

| Field | Value |
|---|---|
| Problem | Short follow-up after app-identity returns clarifier |
| First observed | Phase 5O / Founder readiness reports |
| Root cause | Phase 5K answers never called `saveContinuationMemory` |
| Permanent repair | Save continuation memory on Phase 5K + finalizeBuddyResponse; preserve need across follow-ups |
| Files | `bibleCompanionOrchestrator.js`, `buddyBrain.js`, `conversationContinuationMemory.js` |
| Mandatory fixture | `scripts/runPhase5OContinuationRegression.js`, corpus A1–A3 |
| Local result | PASS |
| Production result | Pending deploy of recovery commit |

## 2. Correction → ask-again

| Field | Value |
|---|---|
| Problem | “That verse does not say…” fell to connection error |
| Root cause | No correction owner; humanNeed patterns incomplete; OpenAI fall-through |
| Permanent repair | `buildCorrectionReply` in responseRevisionOwner; expanded humanNeedDetector |
| Mandatory fixture | corpus F2 |
| Local result | PASS |

## 3. False READY from Admin health

| Field | Value |
|---|---|
| Problem | Ops/release scoring could imply Alpha readiness |
| Permanent repair | `coreCompanionIncident.js` OPEN → Release Intelligence forced BLOCK |
| Local result | BLOCK / NOT_READY_FOR_FOUNDER_ALPHA |

## Remaining lineage items (tracked, not fully closed this commit)

- Full IOG/ICOJ utilization proof across all packs
- Shadow `masterBuddyRuntime` / unused sabbath history path removal (Stage 25)
- Stream vs non-stream parity replay on production UI
- Complete Genesis-to-Revelation coverage metrics for all doctrine topics
