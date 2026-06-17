# Phase 5M Last Known Good Path Audit

**Date:** 2026-06-16

## Last Known Good Warm Path

**Phase 5G–5I** when `bibleCompanionOrchestrator` owned companion turns with `companionResponseBuilder` + `practicalGuidanceEngine`, before strict template engines returned user-visible text directly.

**Route owner:** `openAiFirstCompanionRuntime` → `bibleCompanionOrchestrator` → specialist drafts.

## Where Warmth Was Lost

| Layer | Problem |
|-------|---------|
| `doctrineFinalAuthorityEngine` | `Absolutely — staying with the Bible text:` |
| `directAnswerFormatter` | `No. Staying with Scripture,` stacking / lowercase staying |
| `bibleWideReasoningEngine` | `Scripture witnesses:` label |
| `buildClarificationReply` | Topic loop on established threads |
| OpenAI fallback | Connection/generic when orchestrator missed intent |
| **Git parity** | Workflow file in commits blocks GitHub push → Render stale |

## Current Live Path (5M)

`/buddy/chat` → `buddyBrain` → `openAiFirstCompanionRuntime` → orchestrator **draft** → `finalizeBuddyResponse` → **`liveResponseOwner`** → **`singleCompanionContract`**.

## Files by concern (draft vs final)

| Concern | Draft source | Final owner |
|---------|--------------|-------------|
| Pork / Acts 10 | graph / wide engine | `singleCompanionContract` |
| Family explain | `practicalWisdomEngine` | contract |
| Prayer | `prayerCompanionEngine` | contract |
| App identity | `companionIdentityEngine` | contract |
| Nervous / steps | `companionPresenceEngine` | contract |
| Correction | `userCorrectionMemory` + contract ack | contract |

## Old phrases still in code (helper-only — blocked at contract)

- `doctrineFinalAuthorityEngine.js` — Absolutely staying (draft input)
- `bibleCompanionOrchestrator.js` — clarification template (blocked if context exists)
- `practicalGuidanceEngine.js` — Scripture witnesses (stripped at contract)

## Phase 5M Root Cause Fix (meta-context)

**Bug:** Meta turns (“what we were talking about”) did not match `practicalWisdomEngine` family/explain regex → `runPhase5KDepthLane` returned null → `bibleWideReasoningEngine` semantic match selected `ten_commandments` → polluted `lastAnsweredConcept` → contract repair failed because practical wisdom returned null.

**Fix:** CONTEXT_META patterns in `practicalWisdomEngine`, stable concept via `sessionMemory.activeConcept`, anchor pinning in `conversationAnchorEngine`, `resolveStableDoctrineConcept` in contract.


All listed in Part 5 of spec — must not return final text; feed `liveResponseOwner`.
