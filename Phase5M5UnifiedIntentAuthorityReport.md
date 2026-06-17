# Phase 5M.5 — Unified Intent Authority Report

**Date:** 2026-06-17  
**Status:** Complete (not committed)

## Root cause

Two competing intent systems were routing the same turn:

| System | Location | Categories |
|--------|----------|------------|
| **humanNeedDetector** | `humanNeedDetector.js` | `app_identity`, `prayer`, `practical_words_to_say`, `anxiety_support`, etc. |
| **classifyCurrentTurnIntent** | `companionDoctrineRouter.js` | `emotional_support`, `strict_doctrine_direct`, `bible_concept_direct`, etc. |

`planCompanionDoctrineRouting()` only used `classifyCurrentTurnIntent()`. Companion turns like prayer and app identity could be downgraded to doctrine/bible_wide lanes before the orchestrator or strict gate ran.

## Fix

Made `detectHumanNeed()` authoritative for companion routing in `companionDoctrineRouter.js`:

1. Call `detectHumanNeed(message, {}, context)` at the start of `planCompanionDoctrineRouting()`.
2. Early return `lane: 'companion'` with `protectedHumanNeed: true` when humanNeed is in the protected companion set — **before** strict/bible_wide branching.
3. Include `humanNeed` on every route plan return.
4. `strictDoctrineGate.js` skips strict processing when `protectedHumanNeed` or `lane === 'companion'`.
5. `openAiFirstCompanionRuntime.js` records `routePlanHumanNeed` / `protectedHumanNeed` on `liveTruthTrace` and skips `mustBlockOpenAi` for protected turns.

`doctrine_answer` humanNeed is **not** protected — strict doctrine (pork, Acts 10, Sabbath, death_state, etc.) unchanged.

## Files changed

| File | Change |
|------|--------|
| `services/companionDoctrineRouter.js` | humanNeed import, protected set, early companion return, humanNeed on all plans |
| `services/strictDoctrineGate.js` | Skip strict gate for protected/companion route plans |
| `services/openAiFirstCompanionRuntime.js` | Trace routePlan humanNeed; skip OpenAI block for protected needs |
| `scripts/runPhase5M5UnifiedIntentAuthorityRegression.js` | New HTTP regression (7 cases) |

## Proof humanNeed is authoritative for companion turns

HTTP regression shows `protectedHumanNeed: true` on live trace for:

| Message | routePlanHumanNeed | protectedHumanNeed |
|---------|-------------------|-------------------|
| What is this app? | `app_identity` | `true` |
| Can you pray with me? | `prayer` | `true` |
| How do I explain it to my family? | `practical_words_to_say` | `true` |
| I'm nervous. | `anxiety_support` | `true` |

Companion turns no longer enter strict doctrine routing or OpenAI strict-block paths.

## Proof strict doctrine still works

| Message | humanNeed | protected | Route |
|---------|-----------|-----------|-------|
| Can we eat pork? | `doctrine_answer` | `false` | `doctrine_final_authority` |
| What about Acts 10? | `doctrine_answer` | `false` | `doctrine_final_authority` (Acts 10:28) |
| Does pork taste good? | `doctrine_answer` | `false` | `doctrine_final_authority` (taste distinction) |

## Test results

| Suite | Result |
|-------|--------|
| `runPhase5M5UnifiedIntentAuthorityRegression.js` | **7/7 PASS** |
| `runPhase5M4LiveTruthRegression.js` | **8/8 PASS** |
| `runPhase4HDoctrineParityRegression.js` | **28/28 PASS** |

## Safe for controlled alpha?

**Yes** — companion intent authority is unified at the router layer without new engines or architecture. Strict doctrine parity preserved. No doctrine/evidence/corpus changes.

**Not committed. Not pushed.**
