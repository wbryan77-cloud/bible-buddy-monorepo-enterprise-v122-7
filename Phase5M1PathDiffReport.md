# Phase 5M.1 Path Diff Report

**Date:** 2026-06-16

Compares **known-good path (Phase 5G–5I)** vs **current live path** after 5M.1 restoration.

## Route Chain Comparison

| Stage | Known-Good (5G–5I) | Current (5M.1) | Change |
|-------|-------------------|----------------|--------|
| HTTP | `withBuddyChatGuarantee` | Same | — |
| Brain | `runBuddy` | Same | — |
| Runtime | `openAiFirstCompanionRuntime` | Same | — |
| Routing | `bibleCompanionOrchestrator` | Same | — |
| Answer builders | `companionResponseBuilder`, `practicalGuidanceEngine`, prayer/practical lanes | Same + `practicalWisdomEngine` depth lane (5K) | **Additive helpers** |
| Final polish | `finalizeBuddyResponse` + `polishCompanionReply` + `companionStyleGuard` | `finalizeBuddyResponse` → `liveResponseOwner` → `singleCompanionContract` | **Gate added** (not new brain) |
| Return | JSON | Same | — |

## File-by-File Diff

### `routes/buddy.js`
- **Known-good:** `withBuddyChatGuarantee` → `runBuddy`
- **Current:** Same
- **Interception:** None

### `services/buddyBrain.js`
- **Known-good:** `finalizeBuddyResponse` polish only
- **Current:** `finalizeLiveResponse` before return (contract gate)
- **Interception fixed:** All return paths still enter `finalizeBuddyResponse`; contract repairs bad drafts

### `services/openAiFirstCompanionRuntime.js`
- **Known-good:** Orchestrator first; OpenAI blocked on strict doctrine
- **Current:** Same; `returnCompanionLaneStructured` / `returnBibleWideStructured` / `returnStrictDoctrineStructured` all call `finalizeBuddyResponse`
- **Interception fixed:** Stale `buildFinalAuthorityAnswer` fallback only when strict topic in current turn

### `services/bibleCompanionOrchestrator.js`
- **Known-good:** Intent → practical / companion / strict / wide
- **Current:** + Phase 5K depth lane, 5I pipeline; meta-context routed to practical wisdom (5M fix)
- **What intercepted (broken):** `bible_wide` semantic match on meta turns; `buildClarificationReply` on established threads
- **Restored:** `runPhase5KDepthLane` practical_words_to_say; CONTEXT_META in `practicalWisdomEngine`

### `services/directAnswerFormatter.js`
- **Role:** Draft polish for doctrine polarity
- **Diff:** Still helper; contract enforces No-first on pork

### `services/doctrineFinalAuthorityEngine.js`
- **Known-good:** Warm authority drafts
- **Broken phrase:** `Absolutely — staying with the Bible text:` (draft leak)
- **5M.1:** Phrase removed from Acts 10 draft; contract still strips if present

### `services/bibleWideReasoningEngine.js`
- **Known-good:** Wide topic drafts with witnesses
- **Broken phrase:** `Scripture witnesses:` label
- **5M.1:** Draft only; contract strips label; meta turns no longer default here

### `services/practicalGuidanceEngine.js`
- **Known-good:** Family explain, prayer, boundary — **working path owner**
- **Current:** Still primary practical builder; not replaced

### `services/prayerCompanionEngine.js`
- **Known-good:** Prayer drafts (5K split from practical)
- **Current:** Helper feeding orchestrator + contract repair
- **Bypass fixed:** Prayer challenge routes no longer verse-only

### `services/companionIdentityEngine.js`
- **Known-good:** App identity answers
- **Current:** Helper; contract enforces on identity questions

### `services/liveResponseOwner.js`
- **5L addition:** Thin wrapper — calls `enforceSingleCompanionContract` on orchestrator draft
- **Not a new brain:** Does not route or classify; only finalizes text

### `services/singleCompanionContract.js`
- **5L addition:** Final gate — repairs forbidden phrases, enforces modes
- **Not a new doctrine system:** Uses existing helper builders for repair

## What Returned Final Text Too Early (Historical)

| Module | Failure | 5M.1 status |
|--------|---------|-------------|
| `doctrineFinalAuthorityEngine` | Template as final | Demoted to draft; contract repairs |
| `bibleWideReasoningEngine` | Wide answer as final | Goes through contract |
| `buildClarificationReply` | Loop on known context | Contract blocks + practical lane |
| `noGlitchTurnContract` | Emergency safe replies only | Still preflight; contract on finalize |
| `companionResponseBuilder` | `Scripture witnesses:` on continuation | Contract strips |
| OpenAI fallback | Generic / connection errors | Orchestrator-first; fallback last |

## What Bypassed Warm Response Builder

- **Meta-context turns** → bible_wide `ten_commandments` (fixed: practical wisdom + anchor pin)
- **Bare nervous** → phase5i family template without family ctx (fixed: presence engine + contract)
- **Prayer** → verse list templates (fixed: prayer companion + contract)

## What Bypassed Context Memory

- Semantic concept match ignored `sessionMemory.activeConcept` (fixed: `resolveStableDoctrineConcept`)
- `recordAnswerTurnMemory` polluted `lastAnsweredConcept` on wrong wide route (fixed: route to practical first)

## Helper-Only Modules (Must Not Replace Working Path)

`humanNeedDetector`, `conversationAnchorEngine`, `practicalWisdomEngine`, `prayerCompanionEngine`, `companionIdentityEngine`, `companionPresenceEngine`, `relationshipMemoryEngine`, `relationshipSummaryEngine`, `bibleWordSenseEngine`, `followUpContextResolver`, `twoWitnessStandard` — all feed orchestrator drafts or contract repair only.

## Working Path Restored As

**Orchestrator known builders** (`companionResponseBuilder`, `practicalGuidanceEngine`, prayer/practical lanes) remain the answer path; **contract is the only final text authority** ensuring those builders’ output reaches the user without template leakage.
