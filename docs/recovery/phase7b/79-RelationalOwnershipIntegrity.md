# 79 — Relational Ownership Integrity

| Responsibility | Authoritative owner | Secondary consumers |
|---|---|---|
| Current-message intent | `humanNeedDetector` / runtime intent | Orchestrator |
| Prayer intent | `humanNeedDetector` + revision block | `prayerCompanionEngine` |
| Relationship-context *view* | `relationshipContextSelector` (read-only adapter) | Prayer, recall |
| Persist relationship signals | `relationshipMemoryEngine.recordRelationshipSignal` | Orchestrator callers |
| Active conversation | `activeConversationManager` | Selector |
| Continuation | `conversationContinuationMemory` / doctrine state | Selector, revision |
| Corrections | correction ledger / `userCorrectionMemory` | Prefs |
| Remember UX | Orchestrator early exit | Selector detectors + ack copy |
| Forget | `forgetUserMemory` (+ prefs via companionMemoryManager) | Orchestrator |
| Prayer composition | `prayerCompanionEngine` | — |
| Recall wording | `relationshipSummaryEngine` | — |
| Presence/celebration routing | Orchestrator (uses selector detectors) | — |
| Response polish | `companionReplyPolish` | — |
| Learning candidates (BNC) | `reflectionMemoryEngine` | Must not own personal remember UX |

## Issues found

- Duplicate `recordRelationshipSignal` calls per turn (redundant, same owner).
- Pre-existing parallel JSON stores (reflection, pins, runtime-relationship-memory) — documented, not newly introduced.
- Selector previously wrote memory — **consolidated**: writes only via `relationshipMemoryEngine`.

## Decision

**Option B** — small ownership/contract corrections (completed in this phase). No Option D.
