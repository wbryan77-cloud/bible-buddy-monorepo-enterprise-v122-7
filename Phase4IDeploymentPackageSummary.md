# Phase 4I Deployment Package Summary

Generated: 2026-06-11

## Purpose

Single commit deploying Phase 4E–4H runtime: strict doctrine gate, response guarantee, memory bounds, `/api/runtime-health`.

## Files to include (runtime only)

### Routes & server

- `server.js`
- `routes/buddy.js`
- `routes/runtimeHealth.js`

### Core runtime

- `services/buddyBrain.js`
- `services/openAiFirstCompanionRuntime.js`
- `services/reasonFirstComposer.js`
- `services/activeConversationManager.js`
- `services/liveResponseCapture.js`

### Phase 4E–4H modules

- `services/strictDoctrineGate.js`
- `services/doctrineFinalAuthorityEngine.js`
- `services/doctrineTopicDetector.js`
- `services/doctrineFinalityContract.js`
- `services/doctrineStrictPhraseGuard.js`
- `services/doctrineAuthorityContract.js`
- `services/doctrineStrictValidator.js`
- `services/doctrineStrictSafeAnswer.js`
- `services/doctrineFinalityMode.js`
- `services/doctrineErrorFirewall.js`
- `services/doctrineConversationState.js`
- `services/doctrineCorrectionMemory.js`
- `services/doctrineWitnessInventory.js`
- `services/doctrineLivePathHandlers.js`
- `services/responseGuarantee.js`
- `services/runtimeHealthMonitor.js`
- `services/safeJsonlWriter.js`
- `services/stateTtlCleanup.js`
- `services/phase4eRuntimeDiagnostics.js`
- `services/phase4d1RuntimeDiagnostics.js`
- `services/phase4c1RuntimeDiagnostics.js`

### Verification scripts

- `scripts/runPhase4FCombinedStabilityRegression.js`
- `scripts/runPhase4HDoctrineParityRegression.js`
- `scripts/runPhase4HMemoryStressTest.js`
- `scripts/runPhase4GProductionParityVerification.js`

### Reports (optional but recommended)

- `Phase4E*.md`, `Phase4F*.md`, `Phase4G*.md`, `Phase4H*.md`, `Phase4I*.md` (root only)

## Files excluded

- `.env`, `data/*`
- `services/evidenceCards/*`
- `docs/bible-learning/approved-doctrine-registry.json`
- `services/approvedCatalogEvidence.js`
- `docs/regression-trace/*`
- `package.json` / `package-lock.json` (unless separately approved)
- All other unrelated modified/untracked files

## Local tests passed

| Test | Result |
|------|--------|
| Doctrine parity | 28/28 |
| Memory stress | PASS (peak RSS ~288 MB) |
| Combined stability | 1352/1352 |

## Expected after Render deploy

| Check | Before | After |
|-------|--------|-------|
| `GET /api/runtime-health` | 404 | **200** |
| Acts 10 route | `reason_first_openai` | `doctrine_final_authority` |
| `openAiCalled` on strict doctrine | true | **false** |
| Remote smoke | 0/27 | **27/27** target |

## Deploy skew fix

Render autoDeploy from `origin/main` currently lacks these files. This commit closes the gap.
