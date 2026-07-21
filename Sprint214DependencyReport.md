# Sprint 2.14 Dependency Report

**Generated:** 2026-05-31  
**Route:** `POST /buddy/chat` → `routes/buddy.js` → `runBuddy()` in `services/buddyBrain.js`  
**Method:** Static import trace + acceptance test coverage

---

## Route Entry

| Layer | File | Status |
|-------|------|--------|
| HTTP mount | `server.js` → `/buddy` | In HEAD ✅ |
| Router | `routes/buddy.js` | In HEAD ✅ |
| Orchestrator | `services/buddyBrain.js` | Staged + unstaged 2.14 delta |

---

## runBuddy() Intercept Order & Module Reachability

| # | Intercept | Module | Imported in buddyBrain? | Reachable via /buddy/chat? | Tested in 2.14 suite? |
|---|-----------|--------|-------------------------|----------------------------|----------------------|
| 1 | Crisis safety | `buddyBrain.js` (inline) | ✅ | ✅ | TEST 3 |
| 2 | Continue study | `continueStudyIntent.js` | ✅ | ✅ | TEST 9, 11–14, 18 |
| 2b | Continue engine | `continueStudyEngine.js` | ✅ (via intent) | ✅ | TEST 9, 18 |
| 3 | Study connection | `studyConnectionIntent.js` | ✅ | ✅ | TEST 15 |
| 4 | Memory recall | `relationshipRecallEngine.js` | ✅ | ✅ | TEST 7, 19, 20 |
| 4b | Memory read | `memoryRecallEngine.js` | ✅ | ✅ | TEST 7 |
| 4c | Memory truth | `memoryTruthfulness.js` | ✅ (via recall) | ✅ | TEST 7 |
| 5 | Health | `healthCompanionResponse.js` | ✅ | ✅ | TEST 2, 16 |
| 5b | Health detect | `relationshipMemoryBridge.js` | ✅ (via health) | ✅ | TEST 2, 16 |
| 6 | Prayer | `prayerCompanionResponse.js` | ✅ | ✅ | TEST 6, 19 |
| 6b | Prayer follow-up | `prayerContinuityFollowup.js` | ✅ | ✅ | TEST 6 |
| 7 | Grief / rest | `griefCompanionResponse.js` | ✅ | ✅ | TEST 1, 17 |
| 8 | Sabbath history | `sabbathHistoryCompanion.js` | ✅ | ✅ | TEST 5, 10 |
| 8b | Sabbath intent | `sabbathIntentRouter.js` | ✅ | ✅ | TEST 5, 10 |
| 9 | Doctrine | `doctrineRuntimePipeline.js` | ✅ | ✅ | TEST 4, 8 |
| 9b | Doctrine present | `companionDoctrinePresenter.js` | ✅ | ✅ | TEST 4, 8 |
| 9c | Source grounded | `sourceGroundedResponder.js` | ✅ (via doctrine) | ✅ | TEST 4 |
| 9d | Scripture witness | `scriptureWitnessEngine.js` | ✅ (via presenter) | ✅ | TEST 4, 8 |
| 9e | Historical context | `historicalContextRouter.js` | ✅ (via presenter/history) | ✅ | TEST 5 |
| 10 | Registry study | `registryStudyPresenter.js` | ✅ | ✅ | TEST 8, 12 |
| 11 | Fallback | `personalizedFallback.js` | ✅ | ✅ | TEST 3 |
| 12 | Finalize | `companionRelationshipOrchestrator.js` | ✅ | ✅ | All tests |
| 12b | Polish | `companionReplyPolish.js` | ✅ | ✅ | All tests |
| 12c | Label strip | `runtimeLabelStripper.js` | ✅ | ✅ | TEST 4, 5, 10 |
| 12d | Next steps | `companionNextSteps.js` | ✅ | ✅ | TEST 19 |

---

## Transitive Dependencies (Sprint 2 Stack)

Modules not directly imported by `buddyBrain.js` but required at runtime:

| Module | Required by | In HEAD? | Staged? | Reachable? |
|--------|-------------|----------|---------|------------|
| `companionDeliveryLayer.js` | presenter, health, grief, prayer, registry, fallback | ❌ | ✅ | ✅ |
| `companionLearningLayer.js` | nextSteps, recall, fallback, orchestrator | ❌ | ✅ | ✅ |
| `companionReflectionLayer.js` | presenter, prayer, orchestrator | ❌ | ✅ | ✅ |
| `continuityStudySessionRuntime.js` | continueStudy, presenter, registry | Modified | ✅ | ✅ |
| `continuityMemoryRuntime.js` | recall, buddyBrain persist | Modified | ✅ | ✅ |
| `doctrineSafetyLayer.js` | continueStudyEngine, registry | ❌ | ✅ | ✅ |
| `doctrineStudyCatalogResolver.js` | presenter | ❌ | ✅ | ✅ |
| `genesisToRevelationContinuityRegistry.js` | continueStudy, registry, studyConnection | ❌ | ✅ | ✅ |
| `studyJourneyEngine.js` | orchestrator, nextSteps, fallback | ❌ | ✅ | ✅ |
| `studyModeGating.js` | registry, studyConnection | ❌ | ✅ | ✅ |
| `runtimeRelationshipMemoryEngine.js` | recall, bridge, grief | Modified | ✅ | ✅ |
| `runtimePrayerContinuityEngine.js` | buddyBrain, recall, nextSteps | In HEAD | ✅ | ✅ |
| `runtimeConversationStateEngine.js` | buddyBrain, recall | In HEAD | ✅ | ✅ |
| `emotionalArcEngine.js` | recall, nextSteps, orchestrator | ❌ | ✅ | ✅ |
| `openLoopsEngine.js` | recall, nextSteps, fallback | ❌ | ✅ | ✅ |
| `lifeTimelineMemory.js` | recall, orchestrator | ❌ | ✅ | ✅ |
| `milestoneTracking.js` | orchestrator | ❌ | ✅ | ✅ |
| `runtimeCompanionPresenceEngine.js` | presenter | In HEAD | — | ✅ |
| `runtimeCompanionReflectionEngine.js` | presenter | In HEAD | — | ✅ |
| `runtimePersonalizedFollowupEngine.js` | presenter | In HEAD | — | ✅ |
| `emotionalOrchestrator.js` | presenter | In HEAD | — | ✅ |
| `relationalPresence.js` | deliveryLayer, orchestrator | In HEAD | — | ✅ |
| `runtimeLineUponLineTraversalEngine.js` | presenter | Modified | ✅ | ✅ |
| `fallbackLoopSuppressor.js` | buddyBrain | Modified | ✅ | ✅ |
| `runtimeLoopGuard.js` | buddyBrain, fallback | Modified | ✅ | ✅ |

---

## Modules Present but NOT Reachable from /buddy/chat

| Module | Why excluded |
|--------|--------------|
| `structuredCompanionRuntime.js` | Wired to button router, not runBuddy |
| `autonomousCompanion.js` | distributedEcosystem only |
| `registryGovernance.js` | Admin/governance — no runBuddy import |

These are staged but **optional** for Sprint 2.14 release.

---

## Dependency Health

| Check | Result |
|-------|--------|
| All buddyBrain imports resolve on disk | ✅ |
| No missing module errors in acceptance run | ✅ |
| Transitive deps from HEAD (pre-Sprint 2) present | ✅ |
| Sprint 2 new modules all staged | ✅ |
| Sprint 2.14 fixes applied on disk | ✅ |
| Sprint 2.14 fixes fully staged | ❌ 11 files |

---

## Test Coverage Matrix

| Feature area | Module(s) | Acceptance tests |
|--------------|-----------|-------------------|
| Memory | relationshipRecallEngine, memoryRecallEngine | 7, 16, 19, 20 |
| Study | continueStudyIntent, continueStudyEngine, studyJourneyEngine | 9, 11–15, 18 |
| Prayer | prayerCompanionResponse, prayerContinuityFollowup | 6, 19 |
| Grief | griefCompanionResponse | 1, 17 |
| Health | healthCompanionResponse | 2, 16 |
| Doctrine | companionDoctrinePresenter, sourceGroundedResponder | 4, 8 |
| History | sabbathHistoryCompanion, sabbathIntentRouter | 5, 10 |
| Continue study | continueStudyIntent, continueStudyEngine | 9, 11–14, 18 |
| Organic flow | companionReplyPolish, companionRelationshipOrchestrator | All (polish pass) |
| Listening | health, grief, prayer intercepts | 10, 16, 17 |

**20/20 tests pass** against working-tree dependency graph.
