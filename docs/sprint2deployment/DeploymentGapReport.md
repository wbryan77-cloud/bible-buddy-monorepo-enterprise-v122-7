# Sprint 2.DEPLOYMENT — Deployment Gap Report

**Generated:** 2026-05-31  
**Branch:** `main`  
**Remote:** `origin` → `https://github.com/wbryan77-cloud/bible-buddy-monorepo-enterprise-v122-7.git`

---

## 1. Git Status

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit: 23 modified service files
Untracked: 36 Sprint 2 service files, tests, scripts, docs/sprint213/, data/* (runtime)
Staged: none
```

---

## 2. Modified Files (not staged)

| File |
|------|
| services/autonomousCompanion.js |
| services/buddyBrain.js |
| services/contentInsight.js |
| services/continuityMemoryRuntime.js |
| services/continuityStudySessionRuntime.js |
| services/doctrineContinuityRules.js |
| services/doctrineGuard.js |
| services/doctrineRuntimePipeline.js |
| services/fallbackLoopSuppressor.js |
| services/parallelVerseExpansionEngine.js |
| services/retrievalFirstBuddyOrchestrator.js |
| services/runtimeLineUponLineTraversalEngine.js |
| services/runtimeLoopGuard.js |
| services/runtimeMemoryBridge.js |
| services/runtimeOrchestrator.js |
| services/runtimeQualityValidator.js |
| services/runtimeRelationshipMemoryEngine.js |
| services/runtimeResponseSanitizer.js |
| services/scriptureChainExpansion.js |
| services/scriptureConfidenceRuntime.js |
| services/sourceGroundedResponder.js |
| services/structuredCompanionRuntime.js |
| services/studyContinuityRuntime.js |

---

## 3. Untracked Files (Sprint 2 — must commit)

### Services (36)

companionDeliveryLayer.js, companionDoctrinePresenter.js, companionLearningLayer.js, companionNextSteps.js, companionReflectionLayer.js, companionRelationshipOrchestrator.js, companionReplyPolish.js, continueStudyEngine.js, continueStudyIntent.js, doctrineSafetyLayer.js, doctrineStudyCatalogResolver.js, emotionalArcEngine.js, genesisToRevelationContinuityRegistry.js, griefCompanionResponse.js, healthCompanionResponse.js, historicalContextRouter.js, lifeTimelineMemory.js, memoryRecallEngine.js, memoryTruthfulness.js, milestoneTracking.js, openLoopsEngine.js, personalizedFallback.js, prayerCompanionResponse.js, prayerContinuityFollowup.js, registryGovernance.js, registryStudyPresenter.js, relationshipMemoryBridge.js, relationshipRecallEngine.js, runtimeLabelStripper.js, sabbathHistoryCompanion.js, sabbathIntentRouter.js, scriptureCertaintyFramework.js, scriptureWitnessEngine.js, studyConnectionIntent.js, studyJourneyEngine.js, studyModeGating.js

### Tests, scripts, docs

tests/phase2Sprint*.test.js, tests/sprint2*.js, tests/postSprint2FinalPolish.test.js, tests/openaiProductionSmokeTest.js, scripts/sprint213AcceptanceHttp.js, scripts/sprint2RepairTrace.js, scripts/sprint2DeployValidation.js, docs/sprint213/, docs/sprint2deployment/

### Excluded from commit (runtime data)

data/*.json, data/*.jsonl — local session/memory state, not source code

---

## 4. Staged Files

**None** (prior to Sprint 2.DEPLOYMENT commit)

---

## 5. Committed Files (production baseline)

**359** files under `services/` tracked in git at HEAD.

Sprint 2 companion layer **not** in committed set: presenter, grief/health/prayer, history router, continue study, registry presenter, etc.

---

## 6. Last Deployed Commit

| Field | Value |
|-------|-------|
| SHA | `e572e40d1db971b276b68f1ee35c649a168023dc` |
| Message | `feat(doctrine): activate doctrine intercept pipeline` |
| Date | 2026-05-28 21:08:58 -0700 |
| Remote | `origin/main` (matches local branch tip **before** deploy commit) |
| Render | `autoDeploy: true` in render.yaml — deploys on push to connected branch |

**Production behavior at e572e40:** `POST /buddy/chat` → `runBuddy()` → raw `sourceGroundedResponder` (no presenter, no Sprint 2 intercepts).

---

## 7. Current Local Commit

| Field | Value |
|-------|-------|
| Before deploy commit | `e572e40` (same as deployed) |
| After Sprint 2.DEPLOYMENT commit | *(see git log -1 after push)* |

Working tree contains full Sprint 2 companion stack; **not deployed until pushed**.

---

## Gap Summary

| Gap | Impact |
|-----|--------|
| 36 untracked Sprint 2 modules | Production `require()` would fail if only buddyBrain pushed without them |
| 23 modified core files | Production runs old intercept order and fallback text |
| chat.html wrong route | `/api/ai/chat` (404) — fixed in this sprint |
| No HTTP validation on production | Local 15/15 pass; production unverified until push |
