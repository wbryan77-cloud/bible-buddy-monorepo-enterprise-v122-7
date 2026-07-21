# Phase 5M.1 Known Working Path Audit

**Date:** 2026-06-16

## Last-Known-Good Point

**Phase 5G–5I** (reports dated 2026-06-14; commit family `f7f570f` “Phase 5E–5K companion maturity” on feature branch; on `main` baseline `a3ee789` Phase 4M + `ce08268`/`f2b8d19` Phase 5A orchestrator).

This is when Buddy answered warmly, directly, and biblically:

| Behavior | Evidence |
|----------|----------|
| Pork starts with clear **No.** | Phase 5G regression pork→Acts thread 15/15 |
| Acts 10 correct (people not food) | Phase 5G/5H doctrine lanes |
| Family/practical uses context | `practicalGuidanceEngine` + `companionResponseBuilder` |
| Prayer actually prays | `practicalGuidanceEngine.buildPrayerResponse` |
| App identity warm | Phase 5K `companionIdentityEngine` |
| Not search-engine tone | `companionStyleGuard` + warm openers |

## Exact Live Route (Known-Good)

```
POST /buddy/chat
  → routes/buddy.js (withBuddyChatGuarantee)
  → buddyBrain.runBuddy
  → openAiFirstCompanionRuntime
  → bibleCompanionOrchestrator
  → known-working builders (below)
  → finalizeBuddyResponse
  → [5L/5M] liveResponseOwner + singleCompanionContract (polish gate — no new brain)
  → JSON reply
```

## Files Controlling Answers (Known-Good)

| Role | File |
|------|------|
| Route entry | `routes/buddy.js` |
| Runtime shell | `services/openAiFirstCompanionRuntime.js` |
| Turn routing | `services/bibleCompanionOrchestrator.js` |
| Warm companion answers | `services/companionResponseBuilder.js` |
| Practical wording | `services/practicalGuidanceEngine.js` |
| Prayer drafts | `services/prayerCompanionEngine.js` (5K; feeds practical lane) |
| App identity | `services/companionIdentityEngine.js` |
| Doctrine direct answers | `services/strictDoctrineGate.js`, concept graph |
| Wide Bible answers | `services/bibleWideReasoningEngine.js` (draft only) |

## Files Controlling Warmth

| File | Role |
|------|------|
| `companionResponseBuilder.js` | Emotional openers, family nervous, bad day |
| `companionStyleGuard.js` | Blocks cold Q&A, clarification loops |
| `companionPresenceEngine.js` | Nervous/overwhelmed presence drafts |
| `practicalWisdomEngine.js` | “You could say…” family scripts |
| `companionCuriosityEngine.js` | One follow-up question |

## Files Controlling Doctrine Guard

| File | Role |
|------|------|
| `strictDoctrineGate.js` | Strict topic routing |
| `companionDoctrineRouter.js` | Lane release (4M) |
| `twoWitnessStandard.js` | Witness minimums |
| `doctrineFinalAuthorityEngine.js` | Authority drafts (not final owner) |
| `singleCompanionContract.js` | Forbidden phrase + mode repair (5L/M) |

## Files Controlling Memory / Context

| File | Role |
|------|------|
| `doctrineConversationState.js` | Session memory, lastAnsweredConcept |
| `relationshipMemoryEngine.js` | Family context, relationship signals |
| `conversationAnchorEngine.js` | Active situation anchor |
| `followUpContextResolver.js` | Continuation context |
| `companionIntentIntelligence.js` | Intent before answer |

## What Warmth Was Lost After 5I

1. **Template engines returned final text** — `doctrineFinalAuthorityEngine`, `bibleWideReasoningEngine`, clarification template bypassed companion builders.
2. **Semantic mis-route** — meta-context turns hit `ten_commandments` via weak concept match.
3. **No single final gate** — polish ran on some paths only until 5L added contract.
4. **Deploy parity** — workflow file in commits blocked push; Render tested stale code.

## Restoration Approach (5M.1)

**Did not add a new brain.** Restored 5G–5I orchestrator builders as the only answer path; newer modules are helpers; `liveResponseOwner` + `singleCompanionContract` are the **same path’s final polish gate** (not a competing brain).
