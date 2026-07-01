# Sprint 2.14 Release Inventory

**Generated:** 2026-05-31  
**Source of truth:** Current working tree  
**HEAD:** `e572e40` (unchanged — nothing committed)  
**Action:** Read-only audit — no commit, push, or deploy

---

## Summary Counts

| Bucket | Count |
|--------|------:|
| Staged | 87 |
| Unstaged (modified after staging) | 12 |
| Untracked | 31 |

---

## Classification Key

| Tag | Meaning |
|-----|---------|
| **REQUIRED** | Must ship for Sprint 2.14 companion behavior |
| **OPTIONAL** | Helpful but not required at runtime |
| **RUNTIME DATA** | Local session/memory state — never commit |
| **REPORTS ONLY** | Audit/docs artifacts — never commit |
| **TEST ONLY** | Unit/integration tests — optional in deploy commit |

---

## 1. Staged Files (87)

| File | Classification |
|------|----------------|
| `docs/sprint213/CompanionAcceptanceTests.md` | REPORTS ONLY |
| `docs/sprint213/FailureReport.md` | REPORTS ONLY |
| `docs/sprint213/FinalSprint2ReadinessReport.md` | REPORTS ONLY |
| `docs/sprint213/LiveRouteVerification.md` | REPORTS ONLY |
| `docs/sprint213/MemoryPersistenceAudit.md` | REPORTS ONLY |
| `docs/sprint213/StudyJourneyAudit.md` | REPORTS ONLY |
| `docs/sprint213/StudyJourneyReachabilityReport.md` | REPORTS ONLY |
| `docs/sprint213/acceptance-results.json` | REPORTS ONLY (test output) |
| `docs/sprint2deployment/ChatHtmlRepair.md` | REPORTS ONLY |
| `docs/sprint2deployment/DeploymentChecklist.md` | REPORTS ONLY |
| `docs/sprint2deployment/DeploymentGapReport.md` | REPORTS ONLY |
| `docs/sprint2deployment/RouteParityAudit.md` | REPORTS ONLY |
| `docs/sprint2deployment/Sprint2Inventory.md` | REPORTS ONLY |
| `public/chat.html` | REQUIRED (route repair → `/buddy/chat`) |
| `scripts/sprint213AcceptanceHttp.js` | TEST ONLY |
| `scripts/sprint2DeployValidation.js` | TEST ONLY |
| `scripts/sprint2RepairTrace.js` | TEST ONLY |
| `services/autonomousCompanion.js` | OPTIONAL (not in runBuddy path) |
| `services/buddyBrain.js` | REQUIRED ⚠️ unstaged 2.14 delta exists |
| `services/companionDeliveryLayer.js` | REQUIRED |
| `services/companionDoctrinePresenter.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/companionLearningLayer.js` | REQUIRED |
| `services/companionNextSteps.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/companionReflectionLayer.js` | REQUIRED |
| `services/companionRelationshipOrchestrator.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/companionReplyPolish.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/contentInsight.js` | OPTIONAL |
| `services/continueStudyEngine.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/continueStudyIntent.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/continuityMemoryRuntime.js` | REQUIRED |
| `services/continuityStudySessionRuntime.js` | REQUIRED |
| `services/doctrineContinuityRules.js` | REQUIRED |
| `services/doctrineGuard.js` | REQUIRED |
| `services/doctrineRuntimePipeline.js` | REQUIRED |
| `services/doctrineSafetyLayer.js` | REQUIRED |
| `services/doctrineStudyCatalogResolver.js` | REQUIRED |
| `services/emotionalArcEngine.js` | REQUIRED |
| `services/fallbackLoopSuppressor.js` | REQUIRED |
| `services/genesisToRevelationContinuityRegistry.js` | REQUIRED |
| `services/griefCompanionResponse.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/healthCompanionResponse.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/historicalContextRouter.js` | REQUIRED |
| `services/lifeTimelineMemory.js` | REQUIRED |
| `services/memoryRecallEngine.js` | REQUIRED |
| `services/memoryTruthfulness.js` | REQUIRED |
| `services/milestoneTracking.js` | REQUIRED |
| `services/openLoopsEngine.js` | REQUIRED |
| `services/parallelVerseExpansionEngine.js` | REQUIRED |
| `services/personalizedFallback.js` | REQUIRED |
| `services/prayerCompanionResponse.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/prayerContinuityFollowup.js` | REQUIRED |
| `services/registryGovernance.js` | OPTIONAL |
| `services/registryStudyPresenter.js` | REQUIRED |
| `services/relationshipMemoryBridge.js` | REQUIRED |
| `services/relationshipRecallEngine.js` | REQUIRED ⚠️ unstaged 2.14 delta |
| `services/retrievalFirstBuddyOrchestrator.js` | REQUIRED |
| `services/runtimeLabelStripper.js` | REQUIRED |
| `services/runtimeLineUponLineTraversalEngine.js` | REQUIRED |
| `services/runtimeLoopGuard.js` | REQUIRED |
| `services/runtimeMemoryBridge.js` | REQUIRED |
| `services/runtimeOrchestrator.js` | REQUIRED |
| `services/runtimeQualityValidator.js` | REQUIRED |
| `services/runtimeRelationshipMemoryEngine.js` | REQUIRED |
| `services/runtimeResponseSanitizer.js` | REQUIRED |
| `services/sabbathHistoryCompanion.js` | REQUIRED |
| `services/sabbathIntentRouter.js` | REQUIRED |
| `services/scriptureCertaintyFramework.js` | REQUIRED |
| `services/scriptureChainExpansion.js` | REQUIRED |
| `services/scriptureConfidenceRuntime.js` | REQUIRED |
| `services/scriptureWitnessEngine.js` | REQUIRED |
| `services/sourceGroundedResponder.js` | REQUIRED |
| `services/structuredCompanionRuntime.js` | OPTIONAL (not in runBuddy path) |
| `services/studyConnectionIntent.js` | REQUIRED |
| `services/studyContinuityRuntime.js` | REQUIRED |
| `services/studyJourneyEngine.js` | REQUIRED |
| `services/studyModeGating.js` | REQUIRED |
| `tests/openaiProductionSmokeTest.js` | TEST ONLY |
| `tests/phase2Sprint1.test.js` | TEST ONLY |
| `tests/phase2Sprint2.test.js` | TEST ONLY |
| `tests/phase2Sprint210.test.js` | TEST ONLY |
| `tests/phase2Sprint211.test.js` | TEST ONLY |
| `tests/phase2Sprint212a.test.js` | TEST ONLY |
| `tests/phase2Sprint26.test.js` | TEST ONLY |
| `tests/phase2Sprint28.test.js` | TEST ONLY |
| `tests/postSprint2FinalPolish.test.js` | TEST ONLY |
| `tests/sprint2FinalVerification.js` | TEST ONLY |
| `tests/sprint2RepairRoute.test.js` | TEST ONLY |

**Staged breakdown:** 52 REQUIRED · 13 REPORTS ONLY · 13 TEST ONLY · 3 OPTIONAL · 11 REQUIRED with unstaged 2.14 deltas

---

## 2. Unstaged Files (12)

These are **modified after staging**. Working-tree version ≠ staged version.

| File | Classification | Sprint 2.14 fix? |
|------|----------------|------------------|
| `docs/sprint213/acceptance-results.json` | REPORTS ONLY | Updated results |
| `services/buddyBrain.js` | REQUIRED | Yes — emotional_support reflection skip, userId to classifyEmotionalSupport |
| `services/companionDoctrinePresenter.js` | REQUIRED | Yes — organic flow (skip duplicate TRANSITION) |
| `services/companionNextSteps.js` | REQUIRED | Yes — grief suppressed on health messages |
| `services/companionRelationshipOrchestrator.js` | REQUIRED | Yes — study journey phrase dedupe |
| `services/companionReplyPolish.js` | REQUIRED | Yes — stacked phrase dedupe |
| `services/continueStudyEngine.js` | REQUIRED | Yes — STEP_SIGNIFICANCE, buildContinueJourneyReply |
| `services/continueStudyIntent.js` | REQUIRED | Yes — journey reply + saveStudySession |
| `services/griefCompanionResponse.js` | REQUIRED | Yes — grief follow-up patterns |
| `services/healthCompanionResponse.js` | REQUIRED | Yes — recurring knee pain, listening fix |
| `services/prayerCompanionResponse.js` | REQUIRED | Yes — prayer leads before reflection |
| `services/relationshipRecallEngine.js` | REQUIRED | Yes — relational memory recall |

**All 11 service unstaged files contain Sprint 2.14 quality repairs required for score 97.**

---

## 3. Untracked Files (31)

| File | Classification |
|------|----------------|
| `Sprint214CompanionQualityReport.md` | REPORTS ONLY |
| `Sprint214LocationReport.md` | REPORTS ONLY |
| `data/buddy-memory.json` | RUNTIME DATA |
| `data/buddy-quality-events.jsonl` | RUNTIME DATA |
| `data/buddy-sessions.jsonl` | RUNTIME DATA |
| `data/buddy-study-continuity.json` | RUNTIME DATA |
| `data/companion-events.jsonl` | RUNTIME DATA |
| `data/companion-intelligence-events.jsonl` | RUNTIME DATA |
| `data/companion-learning-profiles.json` | RUNTIME DATA |
| `data/companion-milestones.json` | RUNTIME DATA |
| `data/continuity-memory.json` | RUNTIME DATA |
| `data/continuity-study-sessions.json` | RUNTIME DATA |
| `data/emotional-arc-memory.json` | RUNTIME DATA |
| `data/life-timeline-memory.json` | RUNTIME DATA |
| `data/open-loops-memory.json` | RUNTIME DATA |
| `data/phase2-registry-inventory.json` | RUNTIME DATA |
| `data/runtime-conversation-state.json` | RUNTIME DATA |
| `data/runtime-line-upon-line-traversal.json` | RUNTIME DATA |
| `data/runtime-personality-continuity.json` | RUNTIME DATA |
| `data/runtime-prayer-continuity.json` | RUNTIME DATA |
| `data/runtime-relationship-memory.json` | RUNTIME DATA |
| `data/sprint212-audit-results.json` | RUNTIME DATA |
| `data/sprint2final-verification.json` | RUNTIME DATA |
| `docs/precommit/AcceptanceResults.md` | REPORTS ONLY |
| `docs/precommit/ChatRouteAudit.md` | REPORTS ONLY |
| `docs/precommit/DeploymentInventory.md` | REPORTS ONLY |
| `docs/precommit/LiveRouteVerification.md` | REPORTS ONLY |
| `docs/precommit/PreCommitScorecard.md` | REPORTS ONLY |
| `docs/precommit/Sprint2DeploymentInventory.md` | REPORTS ONLY |
| `docs/sprint214/acceptance-results.json` | REPORTS ONLY (test output) |
| `scripts/sprint214AcceptanceHttp.js` | **REQUIRED** (20-test acceptance runner) |

**Untracked breakdown:** 21 RUNTIME DATA · 8 REPORTS ONLY · 1 REQUIRED (acceptance runner) · 1 REPORT from this audit cycle

---

## Release-Candidate File Totals (working tree)

| Include in commit | Count |
|-------------------|------:|
| REQUIRED runtime (services + public/chat.html) | ~53 |
| REQUIRED acceptance script | 1 |
| OPTIONAL deploy validation script | 1 |
| Exclude: runtime data | 21 |
| Exclude: reports/docs | ~21 |
| Exclude: unit tests (optional) | 13 |
