#!/usr/bin/env bash
# Phase 5M — Safe reset/stage for GitHub-pushable deploy (no workflow files).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Step 1: backup branch ==="
if ! git show-ref --verify --quiet refs/heads/backup/phase5m-before-recovery; then
  git branch backup/phase5m-before-recovery
  echo "created backup/phase5m-before-recovery"
else
  echo "backup/phase5m-before-recovery exists"
fi

echo "=== Step 2: restore workflow from origin/main (exclude from push) ==="
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  git checkout origin/main -- .github/workflows/companion-release-gate.yml 2>/dev/null || echo "no workflow on origin/main"
fi
git reset HEAD -- .github/workflows/ 2>/dev/null || true

echo "=== Step 3: unstage forbidden paths ==="
git reset HEAD -- .github/workflows/ .env data/ docs/evidence-candidates/ 2>/dev/null || true

FILES=(
  services/liveResponseOwner.js
  services/singleCompanionContract.js
  services/companionPresenceEngine.js
  services/bibleCompanionOrchestrator.js
  services/buddyBrain.js
  services/openAiFirstCompanionRuntime.js
  services/humanNeedDetector.js
  services/conversationAnchorEngine.js
  services/prayerCompanionEngine.js
  services/practicalWisdomEngine.js
  services/companionIdentityEngine.js
  services/companionIntentIntelligence.js
  services/companionMemoryManager.js
  services/companionResponseBuilder.js
  services/companionStyleGuard.js
  services/practicalGuidanceEngine.js
  services/relationshipContextModel.js
  services/relationshipMemoryEngine.js
  services/relationshipSummaryEngine.js
  services/scriptureReasoningPlanner.js
  services/noGlitchTurnContract.js
  services/directAnswerFormatter.js
  services/userCorrectionMemory.js
  services/runtimeHealthMonitor.js
  services/responseGuarantee.js
  services/safeJsonlWriter.js
  services/bibleNaturalConcordanceBuilder.js
  services/bibleSemanticConceptNormalizer.js
  services/bibleWordSenseEngine.js
  services/bncSafetyValidator.js
  services/followUpContextResolver.js
  services/twoWitnessStandard.js
  services/bibleWideReasoningEngine.js
  services/bibleConceptConcordance.js
  services/alphaConversationCapture.js
  services/alphaFeedbackCapture.js
  services/alphaIssueAggregator.js
  services/alphaNotificationScheduler.js
  services/alphaTesterManager.js
  routes/buddy.js
  routes/alphaAdmin.js
  routes/alphaTest.js
  routes/runtimeHealth.js
  server.js
  public/index.html
  admin/alpha-dashboard.html
  admin/alpha-test.html
  scripts/runPhase5MLastKnownGoodRecoveryRegression.js
  scripts/runPhase5MDeployParityGate.js
  scripts/runPhase5LLiveThreadRegression.js
  scripts/runPhase5LNoRegressionGate.js
  scripts/runPhase5KRelationshipDepthRegression.js
  scripts/phase5m-safe-reset-and-stage.sh
  scripts/phase5l-safe-stage.sh
  scripts/phase5j1-git-add-alpha-runtime.sh
  Phase5MLastKnownGoodPathAudit.md
  Phase5MModuleConsolidationReport.md
)

for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    git add "$f"
    echo "staged: $f"
  fi
done

echo "=== forbidden staged check ==="
FORBIDDEN=$(git diff --cached --name-only | grep -E '^\.github/workflows/|^\.env$|^data/|^docs/evidence-candidates/|\.jsonl$' || true)
if [[ -n "$FORBIDDEN" ]]; then
  echo "FORBIDDEN STAGED — aborting"
  echo "$FORBIDDEN"
  exit 1
fi

echo "--- staged $(git diff --cached --name-only | wc -l | tr -d ' ') files ---"
git diff --cached --name-only
