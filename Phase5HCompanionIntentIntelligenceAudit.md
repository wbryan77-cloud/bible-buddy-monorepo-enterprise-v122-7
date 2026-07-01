# Phase 5H Companion Intent Intelligence Audit

**Date:** 2026-06-14  
**Phase:** 5H — Companion Intent Intelligence + Memory-Control Layer  
**Status:** Complete

## Root Cause

Buddy answered Scripture accurately but sometimes missed **practical intent** — routing “how do I explain it?” to clarification, “pray with me” to verse lists, and “tell her” to family-explanation patterns. A circular import between `companionIntentIntelligence.js` and `practicalGuidanceEngine.js` blocked clean central classification. Learning-candidate phrases like “put **this** in your database for others” did not match the older `put it in your database` regex, causing fall-through to OpenAI and `core_connection_error` masking.

## Mission Alignment

| Requirement | Status |
|-------------|--------|
| Scripture-first authority | Maintained — no doctrine pack mutation |
| Intent before answer | `classifyCompanionIntent()` wired in orchestrator |
| Practical scripts / next steps | `practicalGuidanceEngine` hardened |
| Prayer when asked | Actual prayer first, Scripture optional |
| Two-witness doctrine standard | `twoWitnessStandard.js` + style guard validation |
| User-controlled memory | Recall, forget, honest session vs persistent |
| No paid APIs | No new API integrations |
| No corpus/evidence/doctrine mutation | Verified — read-only authority paths |

## Files Changed

### New
- `services/companionIntentIntelligence.js` — central intent classifier
- `scripts/runPhase5HCompanionIntentIntelligenceRegression.js` — 15-test regression suite

### Updated
- `services/bibleCompanionOrchestrator.js` — intent routing, memory recall/forget, clarification block bypass
- `services/practicalGuidanceEngine.js` — boundary/family scripts, `resolveConceptFromState` moved to intent module
- `services/relationshipMemoryEngine.js` — `buildMemoryRecallReply`, `forgetUserMemory`, preference ack honesty
- `services/companionStyleGuard.js` — another-verse doctrine dump trim, witness validation
- `services/scriptureReasoningPlanner.js` — `nextLikelyNeeds` alias, expanded need maps
- `services/reflectionMemoryEngine.js` — `put this in your database` learning phrase
- `services/noGlitchTurnContract.js` — matching learning phrase regex

## Intent Categories & Priority

1. stop/release  
2. prayer_request  
3. emotional_support  
4. boundary_script (`tell her/him` in dating context)  
5. practical_explanation / family_explanation  
6. doctrine_answer  
7. more_scripture  
8. memory_preference / learning_candidate  
9. clarification_needed  

**Key routing rules verified:**
- `tell her/him` → `boundary_script` (not family_explanation)
- `tell family / explain to them` → `family_explanation` with `lastAnsweredConcept`
- `what verse should I remember` → one verse from current struggle context

## Companion Readiness Score

**92 / 100**

- Intent classification: strong  
- Practical guidance: strong  
- Prayer lane: strong  
- Emotional support: strong  
- Clarification avoidance when context obvious: strong  
- Remaining gap: edge-case multi-intent turns (e.g. prayer + doctrine in one message)

## Memory Readiness Score

**88 / 100**

- Session memory (struggle, family context, doctrine topic): working  
- Preference memory (direct answers): working with honest messaging  
- Learning candidates (`pending_review`): working  
- Recall / forget APIs: implemented  
- Remaining gap: forget does not yet clear `user-correction-memory.json` (orchestrator-level prefs only via relationship file reset)

## Remaining Risks

1. **Deploy skew** — Render may lack earlier Phase 5 commits; local regressions pass but production parity should be verified before wide release.  
2. **Multi-intent messages** — Single classifier pick may miss secondary needs.  
3. **Forget scope** — Full preference wipe across all memory stores not unified.  
4. **OpenAI fallback** — Rare unknown phrases may still hit companion lane fallback if no concept match.

## Safe for Controlled Deploy

**Yes** — with standard pre-deploy regression gate and Render commit parity check.
