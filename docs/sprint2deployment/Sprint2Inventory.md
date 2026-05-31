# Sprint 2.DEPLOYMENT — Sprint 2 File Inventory

**Generated:** 2026-05-31  
**Legend:** ✅ = yes · ❌ = no · **LOCAL ONLY** = exists locally, not on production until deployed

---

## Core Live Path

| File | Exists locally | Committed (pre-deploy) | Pushed | Deployed | Imported in buddyBrain | Reachable /buddy/chat | Status |
|------|----------------|------------------------|--------|----------|------------------------|----------------------|--------|
| routes/buddy.js | ✅ | ✅ | ✅ | ✅ | N/A (calls runBuddy) | ✅ | ACTIVE |
| services/buddyBrain.js | ✅ | ✅ (stub) | ✅ | ✅ (stub) | — | ✅ | **LOCAL ONLY** (full version) |
| server.js | ✅ | ✅ | ✅ | ✅ | mounts /buddy | ✅ | ACTIVE |

---

## Sprint 2 Companion Layer (direct buddyBrain imports)

| File | Local | Committed | Pushed | Deployed | Imported | Reachable | Status |
|------|-------|-----------|--------|----------|----------|-----------|--------|
| companionDoctrinePresenter.js | ✅ | ❌ | ❌ | ❌ | ✅ L11 | ✅ doctrine path | **LOCAL ONLY** |
| companionReplyPolish.js | ✅ | ❌ | ❌ | ❌ | ✅ L46 | ✅ finalize/presenter | **LOCAL ONLY** |
| runtimeLabelStripper.js | ✅ | ❌ | ❌ | ❌ | ✅ L49 | ✅ polish/sanitize | **LOCAL ONLY** |
| continueStudyIntent.js | ✅ | ❌ | ❌ | ❌ | ✅ L23 | ✅ intercept #2 | **LOCAL ONLY** |
| studyConnectionIntent.js | ✅ | ❌ | ❌ | ❌ | ✅ L42 | ✅ intercept #3 | **LOCAL ONLY** |
| relationshipRecallEngine.js | ✅ | ❌ | ❌ | ❌ | ✅ L29 | ✅ intercept #4 | **LOCAL ONLY** |
| memoryRecallEngine.js | ✅ | ❌ | ❌ | ❌ | ✅ L17 | ✅ every request | **LOCAL ONLY** |
| healthCompanionResponse.js | ✅ | ❌ | ❌ | ❌ | ✅ L40 | ✅ intercept #5 | **LOCAL ONLY** |
| prayerCompanionResponse.js | ✅ | ❌ | ❌ | ❌ | ✅ L41 | ✅ intercept #6 | **LOCAL ONLY** |
| griefCompanionResponse.js | ✅ | ❌ | ❌ | ❌ | ✅ L25 | ✅ intercept #7 | **LOCAL ONLY** |
| sabbathIntentRouter.js | ✅ | ❌ | ❌ | ❌ | ✅ L47 | ✅ intercept #8 | **LOCAL ONLY** |
| sabbathHistoryCompanion.js | ✅ | ❌ | ❌ | ❌ | ✅ L48 | ✅ intercept #8 | **LOCAL ONLY** |
| registryStudyPresenter.js | ✅ | ❌ | ❌ | ❌ | ✅ L26 | ✅ intercept #10 | **LOCAL ONLY** |
| personalizedFallback.js | ✅ | ❌ | ❌ | ❌ | ✅ L27 | ✅ !openai path | **LOCAL ONLY** |
| companionNextSteps.js | ✅ | ❌ | ❌ | ❌ | ✅ L28 | ✅ finalize | **LOCAL ONLY** |
| relationshipMemoryBridge.js | ✅ | ❌ | ❌ | ❌ | ✅ L24 | ✅ persistBuddyMemory | **LOCAL ONLY** |
| companionRelationshipOrchestrator.js | ✅ | ❌ | ❌ | ❌ | ✅ L35 | ✅ enrich/finalize | **LOCAL ONLY** |
| prayerContinuityFollowup.js | ✅ | ❌ | ❌ | ❌ | ✅ L34 | ✅ prayer path | **LOCAL ONLY** |
| companionLearningLayer.js | ✅ | ❌ | ❌ | ❌ | ✅ L16 | ✅ persist/enrich | **LOCAL ONLY** |

---

## Sprint 2 Transitive (required by above)

| File | Local | Committed | Reachable | Status |
|------|-------|-----------|-----------|--------|
| continueStudyEngine.js | ✅ | ❌ | ✅ via continueStudyIntent | **LOCAL ONLY** |
| studyJourneyEngine.js | ✅ | ❌ | ✅ via orchestrator/fallback | **LOCAL ONLY** |
| historicalContextRouter.js | ✅ | ❌ | ✅ presenter/sabbathHistory | **LOCAL ONLY** |
| scriptureWitnessEngine.js | ✅ | ❌ | ✅ presenter/registry | **LOCAL ONLY** |
| companionDeliveryLayer.js | ✅ | ❌ | ✅ presenter/registry | **LOCAL ONLY** |
| companionReflectionLayer.js | ✅ | ❌ | ✅ fallback/enrich | **LOCAL ONLY** |
| doctrineStudyCatalogResolver.js | ✅ | ❌ | ✅ presenter | **LOCAL ONLY** |
| doctrineSafetyLayer.js | ✅ | ❌ | ✅ registry/continue | **LOCAL ONLY** |
| genesisToRevelationContinuityRegistry.js | ✅ | ❌ | ✅ registry/continue | **LOCAL ONLY** |
| studyModeGating.js | ✅ | ❌ | ✅ registry | **LOCAL ONLY** |
| emotionalArcEngine.js | ✅ | ❌ | ✅ relationship orchestrator | **LOCAL ONLY** |
| lifeTimelineMemory.js | ✅ | ❌ | ✅ relationship orchestrator | **LOCAL ONLY** |
| milestoneTracking.js | ✅ | ❌ | ✅ relationship orchestrator | **LOCAL ONLY** |
| openLoopsEngine.js | ✅ | ❌ | ✅ personalizedFallback | **LOCAL ONLY** |
| memoryTruthfulness.js | ✅ | ❌ | ✅ relationship memory | **LOCAL ONLY** |
| registryGovernance.js | ✅ | ❌ | ✅ registry (support) | **LOCAL ONLY** |
| scriptureCertaintyFramework.js | ✅ | ❌ | ✅ witness (support) | **LOCAL ONLY** |

---

## Already Committed (modified in working tree)

| File | Pre-deploy committed | Modified locally | Status |
|------|---------------------|------------------|--------|
| sourceGroundedResponder.js | ✅ | ✅ | **LOCAL ONLY** (cleaned text) |
| fallbackLoopSuppressor.js | ✅ | ✅ | **LOCAL ONLY** |
| runtimeResponseSanitizer.js | ✅ | ✅ | **LOCAL ONLY** |
| doctrineRuntimePipeline.js | ✅ | ✅ | **LOCAL ONLY** |
| doctrineGuard.js | ✅ | ✅ | **LOCAL ONLY** |
| continuityStudySessionRuntime.js | ✅ | ✅ | **LOCAL ONLY** |
| continuityMemoryRuntime.js | ✅ | ✅ | **LOCAL ONLY** |
| runtimeRelationshipMemoryEngine.js | ✅ | ✅ | **LOCAL ONLY** |
| runtimeOrchestrator.js | ✅ | ✅ | **LOCAL ONLY** |
| runtimePrayerContinuityEngine.js | ✅ | ✅ (via buddyBrain) | ACTIVE (committed base) |
| runtimeConversationStateEngine.js | ✅ | ✅ (via buddyBrain) | ACTIVE |
| historicalReferenceIndex.js | ✅ | — | ACTIVE (committed) |
| historicalEvidenceLayer.js | ✅ | — | ACTIVE (committed) |
| doctrineResponseRouter.js | ✅ | — | ACTIVE (committed) |

---

## Frontend

| File | Local | Committed | Route | Status |
|------|-------|-----------|-------|--------|
| public/index.html | ✅ | ✅ | `/buddy/chat` | ACTIVE |
| public/chat.html | ✅ | ✅ | was `/api/ai/chat` → **repaired to `/buddy/chat`** | **LOCAL ONLY** until push |

---

## Tests & Validation Scripts

| File | Status |
|------|--------|
| scripts/sprint213AcceptanceHttp.js | **LOCAL ONLY** |
| scripts/sprint2DeployValidation.js | **LOCAL ONLY** |
| scripts/sprint2RepairTrace.js | **LOCAL ONLY** |
| tests/phase2Sprint*.test.js | **LOCAL ONLY** |
| tests/sprint2RepairRoute.test.js | **LOCAL ONLY** |

---

## Count Summary

| Category | Count |
|----------|-------|
| Sprint 2 files needing first commit | 36 services + tests + scripts |
| Modified committed files | 23 |
| **LOCAL ONLY total** | **59+** files not on production at e572e40 |
