# Pre-Commit Sprint 2 Deployment Inventory

**Generated:** 2026-05-31

Legend: ✅ = yes · ❌ = no · **Pending** = staged, not yet committed

---

## Memory Systems

| File | Exists locally | Staged | Committed (HEAD) | In pending commit |
|------|----------------|--------|------------------|-------------------|
| memoryRecallEngine.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| relationshipMemoryBridge.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| runtimeRelationshipMemoryEngine.js | ✅ | ✅ | ✅ (base) | ✅ **Pending** (modified) |
| prayerContinuityFollowup.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| companionLearningLayer.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| companionDeliveryLayer.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| relationshipRecallEngine.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| memoryTruthfulness.js | ✅ | ✅ | ❌ | ✅ **Pending** |

**buddyBrain imports:** L16–20, L24, L34, L39 — all present in staged `buddyBrain.js`

---

## Study Systems

| File | Exists locally | Staged | Committed (HEAD) | In pending commit |
|------|----------------|--------|------------------|-------------------|
| continueStudyEngine.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| continueStudyIntent.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| studyJourneyEngine.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| registryStudyPresenter.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| studyConnectionIntent.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| continuityStudySessionRuntime.js | ✅ | ✅ | ✅ (base) | ✅ **Pending** (modified) |
| genesisToRevelationContinuityRegistry.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| doctrineStudyCatalogResolver.js | ✅ | ✅ | ❌ | ✅ **Pending** |

**buddyBrain imports:** L23, L26, L42–45 — all present in staged `buddyBrain.js`

---

## Companion Systems

| File | Exists locally | Staged | Committed (HEAD) | In pending commit |
|------|----------------|--------|------------------|-------------------|
| griefCompanionResponse.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| healthCompanionResponse.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| prayerCompanionResponse.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| companionDoctrinePresenter.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| companionReplyPolish.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| companionNextSteps.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| sabbathIntentRouter.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| sabbathHistoryCompanion.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| historicalContextRouter.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| personalizedFallback.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| companionRelationshipOrchestrator.js | ✅ | ✅ | ❌ | ✅ **Pending** |

**buddyBrain imports:** L11, L25, L27–28, L40–41, L46–48 — all present

---

## Safety Systems

| File | Exists locally | Staged | Committed (HEAD) | In pending commit |
|------|----------------|--------|------------------|-------------------|
| fallbackLoopSuppressor.js | ✅ | ✅ | ✅ (base) | ✅ **Pending** (modified) |
| runtimeLoopGuard.js | ✅ | ✅ | ✅ (base) | ✅ **Pending** (modified) |
| doctrineSafetyLayer.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| runtimeLabelStripper.js | ✅ | ✅ | ❌ | ✅ **Pending** |
| runtimeResponseSanitizer.js | ✅ | ✅ | ✅ (base) | ✅ **Pending** (modified) |

**buddyBrain imports:** L21–22, L49 — all present

---

## Verification Summary

| Check | Result |
|-------|--------|
| All 21 named Sprint 2 modules exist locally | ✅ |
| All 21 named modules staged | ✅ |
| All imported by staged buddyBrain.js | ✅ |
| Any missing from pending commit | ❌ None missing |
| Production has these modules | ❌ HEAD e572e40 lacks 36 new files |

**Conclusion:** Pending commit **includes complete Sprint 2 file set**. Production does **not** have them until commit + push succeed.
