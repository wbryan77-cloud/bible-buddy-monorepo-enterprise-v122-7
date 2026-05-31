# Sprint 2.DEPLOYMENT — Deployment Checklist

**Goal:** Make production match local Sprint 2 companion behavior.  
**Do not begin Sprint 3.**

---

## Pre-Flight

- [x] Sprint 2.13 audit complete
- [x] Local HTTP acceptance 15/15 (`node scripts/sprint213AcceptanceHttp.js`)
- [x] chat.html repaired → `/buddy/chat`
- [ ] All Sprint 2 files committed
- [ ] Pushed to `origin/main`
- [ ] Render build green
- [ ] Post-deploy validation 8/8

---

## Exact Git Commands

### 1. Stage Sprint 2 source (exclude runtime data)

```bash
cd /Users/william/Documents/bible-buddy-monorepo-enterprise-v122-7

# Modified core services
git add services/autonomousCompanion.js \
  services/buddyBrain.js \
  services/contentInsight.js \
  services/continuityMemoryRuntime.js \
  services/continuityStudySessionRuntime.js \
  services/doctrineContinuityRules.js \
  services/doctrineGuard.js \
  services/doctrineRuntimePipeline.js \
  services/fallbackLoopSuppressor.js \
  services/parallelVerseExpansionEngine.js \
  services/retrievalFirstBuddyOrchestrator.js \
  services/runtimeLineUponLineTraversalEngine.js \
  services/runtimeLoopGuard.js \
  services/runtimeMemoryBridge.js \
  services/runtimeOrchestrator.js \
  services/runtimeQualityValidator.js \
  services/runtimeRelationshipMemoryEngine.js \
  services/runtimeResponseSanitizer.js \
  services/scriptureChainExpansion.js \
  services/scriptureConfidenceRuntime.js \
  services/sourceGroundedResponder.js \
  services/structuredCompanionRuntime.js \
  services/studyContinuityRuntime.js

# New Sprint 2 companion modules
git add services/companionDeliveryLayer.js \
  services/companionDoctrinePresenter.js \
  services/companionLearningLayer.js \
  services/companionNextSteps.js \
  services/companionReflectionLayer.js \
  services/companionRelationshipOrchestrator.js \
  services/companionReplyPolish.js \
  services/continueStudyEngine.js \
  services/continueStudyIntent.js \
  services/doctrineSafetyLayer.js \
  services/doctrineStudyCatalogResolver.js \
  services/emotionalArcEngine.js \
  services/genesisToRevelationContinuityRegistry.js \
  services/griefCompanionResponse.js \
  services/healthCompanionResponse.js \
  services/historicalContextRouter.js \
  services/lifeTimelineMemory.js \
  services/memoryRecallEngine.js \
  services/memoryTruthfulness.js \
  services/milestoneTracking.js \
  services/openLoopsEngine.js \
  services/personalizedFallback.js \
  services/prayerCompanionResponse.js \
  services/prayerContinuityFollowup.js \
  services/registryGovernance.js \
  services/registryStudyPresenter.js \
  services/relationshipMemoryBridge.js \
  services/relationshipRecallEngine.js \
  services/runtimeLabelStripper.js \
  services/sabbathHistoryCompanion.js \
  services/sabbathIntentRouter.js \
  services/scriptureCertaintyFramework.js \
  services/scriptureWitnessEngine.js \
  services/studyConnectionIntent.js \
  services/studyJourneyEngine.js \
  services/studyModeGating.js

# Frontend fix
git add public/chat.html

# Tests, scripts, docs
git add tests/phase2Sprint1.test.js \
  tests/phase2Sprint2.test.js \
  tests/phase2Sprint26.test.js \
  tests/phase2Sprint28.test.js \
  tests/phase2Sprint210.test.js \
  tests/phase2Sprint211.test.js \
  tests/phase2Sprint212a.test.js \
  tests/postSprint2FinalPolish.test.js \
  tests/sprint2FinalVerification.js \
  tests/sprint2RepairRoute.test.js \
  tests/openaiProductionSmokeTest.js \
  scripts/sprint213AcceptanceHttp.js \
  scripts/sprint2RepairTrace.js \
  scripts/sprint2DeployValidation.js \
  docs/sprint213/ \
  docs/sprint2deployment/
```

### 2. Commit

```bash
git commit -m "$(cat <<'EOF'
Deploy Sprint 2 companion layer to production parity.

Wire presenter, intercepts, memory, study journey, and history routing through runBuddy on POST /buddy/chat; repair chat.html route; add deployment validation scripts.
EOF
)"
```

### 3. Push (triggers Render autoDeploy)

```bash
git push origin main
```

---

## Files Explicitly Excluded

Do **not** commit:

- `data/buddy-sessions.jsonl`
- `data/buddy-memory.json`
- `data/*-memory.json` (runtime state)
- `data/*.jsonl` (event logs)

---

## Post-Push Verification

```bash
# Local sanity (same as pre-push)
node scripts/sprint213AcceptanceHttp.js

# Production (set your Render URL)
DEPLOY_URL=https://YOUR-SERVICE.onrender.com node scripts/sprint2DeployValidation.js
```

---

## Render Expectations

| Setting | Value |
|---------|-------|
| Build | `npm install && npx prisma migrate deploy` |
| Start | `node server.js` |
| autoDeploy | true |
| Buddy mount | `/buddy` → `/buddy/chat` |

---

## Rollback

If deploy fails module load:

```bash
git revert HEAD
git push origin main
```

Previous known-good: `e572e40` (doctrine stub only).
