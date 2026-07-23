# Architecture Truth Report — Core Companion Recovery

**Incident:** `CRITICAL_COMPANION_SCRIPTURE_CONVERSATION_AND_RUNTIME_ARCHITECTURE_FAILURE`  
**Status:** `NOT_READY_FOR_FOUNDER_ALPHA` (incident OPEN)  
**Branch:** `recovery/core-companion-master-v1`  
**Pre-recovery tag:** `recovery-pre-core-companion-v1.0.0`  
**Baseline commit (local = remote main = prod before repair):** `1a59160`

## Absolute rule

There must be exactly one authoritative path:

`POST /buddy/chat → routes/buddy.js → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime → bibleCompanionOrchestrator → finalizeBuddyResponse → liveResponseOwner → JSON`

## Proven root causes (this batch)

1. **Continuation memory not written after Phase 5K answers** (app identity, prayer, presence). Short follow-ups (“Tell me more.”) fell through to OpenAI → `core_connection_error` → ask-again clarifier.
2. **Correction turns not owned** when challenging a prior Scripture claim; fell through to the same connection-error mask.
3. **False readiness**: Admin/ops health could report GO while Companion quality failed Founder testing.

## Repairs applied

| Fix | Files |
|---|---|
| Persist continuation memory on Phase 5K + all successful finalizes | `bibleCompanionOrchestrator.js`, `buddyBrain.js`, `conversationContinuationMemory.js` |
| Preserve substantive `lastHumanNeed` across follow-ups | `conversationContinuationMemory.js` |
| Correction owner before OpenAI fall-through | `responseRevisionOwner.js`, `humanNeedDetector.js` |
| Freeze Alpha readiness while incident OPEN | `coreCompanionIncident.js`, `releaseIntelligenceEngine.js` |
| Founder multi-turn outcome corpus | `scripts/runFounderMultiTurnCorpus.js` |

## Competing owners (still present but ordered)

Orchestrator still has multiple early-exit handlers (revision, continuation, Phase5O duplicate, Phase5K, strict, bible_wide, life decision). After this repair they share **one continuation-memory contract** and corrections/revisions win before OpenAI. Full removal of shadow paths (`masterBuddyRuntime`, sabbath history via unused `dispatchActiveConversationFollowUp`) is staged for Stage 25 after production replay.

## Gates status (local)

| Gate | Local |
|---|---|
| Phase 5O continuation | PASS |
| Founder multi-turn corpus | PASS (after correction repair) |
| Scripture fidelity smoke | PASS |
| Decision ownership smoke | PASS |
| Release Intelligence under incident | BLOCK / NOT_READY_FOR_FOUNDER_ALPHA |

Production deploy of this recovery commit is required before Founder review.
