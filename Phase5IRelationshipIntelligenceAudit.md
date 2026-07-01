# Phase 5I Relationship Intelligence Audit

**Date:** 2026-06-14  
**Phase:** 5I — Relationship Intelligence + Scripture-Anchored Companion Memory

## Executive Summary

Phase 5H fixed intent routing; Phase 5I adds a **relationship context model**, unified **companion memory manager**, **Scripture-anchored response plan**, and **companion response builder** so Buddy understands what the user means, feels, and needs next — before formatting Scripture.

---

## Where User Emotion Is Detected

| Location | Mechanism |
|----------|-----------|
| `relationshipContextModel.js` | `detectUserEmotion()` — overwhelmed, heartbreak, nervous, fear, sad |
| `companionIntentIntelligence.js` | `EMOTIONAL_RE`, `detectEmotionalNeed()` |
| `companionStateEngine.js` | `EMOTIONAL_PATTERNS`, listener mode |
| `noGlitchTurnContract.js` | `EMOTIONAL_RE` for contract lane |
| `relationshipMemoryEngine.js` | Records struggle on overwhelmed/sad signals |

**Gap (resolved in 5I):** Stale `lastPrayerRequest` could override nervous follow-up → fixed by not using stale prayer state in plan routing.

---

## Where Practical Intent Is Detected

| Location | Mechanism |
|----------|-----------|
| `companionIntentIntelligence.js` | `classifyCompanionIntent()` — boundary, family explain, verse, prayer |
| `relationshipContextModel.js` | `detectUserGoal()` — explain_to_family, set_boundary, verse_to_remember |
| `practicalGuidanceEngine.js` | `PRACTICAL_HELP_RE`, `detectPracticalHelpRequest()` |
| `scriptureReasoningPlanner.js` | `buildScriptureAnchoredResponsePlan()` — practicalScriptNeeded flags |
| `companionResponseBuilder.js` | Family scripts, boundary scripts, verse selection |

---

## Where Prior Topic Is Stored

| Layer | Field | File |
|-------|-------|------|
| Doctrine conversation | `lastAnsweredConcept`, `sessionMemory.activeConcept` | `doctrineConversationState.js` |
| Turn memory | `turnMemory.lastAnsweredConcept`, `lastRefsShown` | `doctrineConversationState.js` |
| Relationship file | via `lastAnsweredConcept` merge | `relationshipMemoryEngine.js` |
| Phase 5I snapshot | `session.lastTopic` | `companionMemoryManager.js` |
| Pronoun resolution | `resolvePronounsAndReferences()` | `relationshipContextModel.js` |

---

## Where Last Struggle Is Stored

| Layer | Field | File |
|-------|-------|------|
| Relationship JSON | `currentStruggle`, `recentConcern` | `relationshipMemoryEngine.js` |
| Session memory | `sessionMemory.currentStruggle` | `doctrineConversationState.js` |
| Phase 5I context | `relationshipContext.currentStruggle` | `relationshipContextModel.js` |
| Phase 5I snapshot | `session.currentStruggle` | `companionMemoryManager.js` |

---

## Where Prayer Need Is Stored

| Location | Notes |
|----------|-------|
| `relationshipMemoryEngine` | `lastPrayerRequest` on `\bpray\b` |
| `companionIntentIntelligence` | `prayer_request` category |
| `relationshipContextModel` | `prayerNeed` from current message only (5I fix) |
| `scriptureReasoningPlanner` | `prayerNeeded` in anchored plan |

---

## Where User Preferences Are Stored

| Store | Path | Preferences |
|-------|------|-------------|
| User correction memory | `data/user-correction-memory.json` | directAnswerFirst, yesNoDirect, forbidPhrases |
| Doctrine session | correction preferences via `addCorrectionPreference` | `doctrineConversationState.js` |
| Phase 5I manager | `getMemorySnapshot().preferences` | unified read |
| Clear on forget | `clearUserPreferences()` | explicit false after forget |

---

## Where Learning Candidates Are Stored

| Store | Path | Status |
|-------|------|--------|
| Growth candidates | `docs/bible-learning/concept-growth-candidates.json` | `pending_review` |
| Reflection memory | `data/reflection-memory.json` | globalCandidates |
| `reflectionMemoryEngine` | `recordConceptLearningCandidate()` | no doctrine mutation |

---

## Memory Recall & Forget

| Action | Handler |
|--------|---------|
| What do you remember | `companionMemoryManager.buildMemoryDisclosureReply()` |
| Forget preference | `forgetMemory({ scope: 'preferences' })` + `clearUserPreferences()` |
| Forget all context | `forgetMemory({ scope: 'all' })` |
| Orchestrator routes | `relationship_memory_recall`, `companion_memory_forget_preferences` |

---

## Gaps Between State, Memory, and Final Answer (Pre-5I → Post-5I)

| Gap | Resolution |
|-----|------------|
| Intent routed but wording generic | `companionResponseBuilder` with human openings |
| Prayer stale context on follow-up | Current-message-only `prayerNeed` |
| Memory recall scattered | `companionMemoryManager` single interface |
| Forget left default prefs true | `clearUserPreferences` sets explicit false |
| No Scripture plan before companion tone | `buildScriptureAnchoredResponsePlan` |
| Multi-intent prayer + verse | `multi_prayer_verse` answer type |

---

## Orchestrator Flow (Phase 5I)

1. Load state (`getDoctrineConversationState`)
2. Build relationship context (`buildRelationshipContext`)
3. Memory snapshot (`getMemorySnapshot`)
4. No-glitch turn contract (preflight)
5. Concept / intent (`classifyCompanionIntent`)
6. Scripture-anchored plan (`buildScriptureAnchoredResponsePlan`)
7. Witness validation (style guard + `twoWitnessStandard`)
8. Final response (`buildCompanionResponse`)
9. Style guard (`applyCompanionStyleGuard`)
10. Record memory (`recordTurnMemory`)
11. Return

Strict doctrine / bible_wide paths preserved for initial doctrine questions.

---

## Safe for Controlled Deploy

**Yes** — pending full regression pass (all suites green locally).
