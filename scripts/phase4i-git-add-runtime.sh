#!/usr/bin/env bash
# Phase 4I — Stage runtime-only files. Review before commit. Does NOT commit or push.
set -euo pipefail
cd "$(dirname "$0")/.."

git add \
  server.js \
  routes/buddy.js \
  routes/runtimeHealth.js \
  services/buddyBrain.js \
  services/openAiFirstCompanionRuntime.js \
  services/reasonFirstComposer.js \
  services/activeConversationManager.js \
  services/liveResponseCapture.js \
  services/strictDoctrineGate.js \
  services/doctrineFinalAuthorityEngine.js \
  services/doctrineTopicDetector.js \
  services/doctrineFinalityContract.js \
  services/doctrineStrictPhraseGuard.js \
  services/doctrineAuthorityContract.js \
  services/doctrineStrictValidator.js \
  services/doctrineStrictSafeAnswer.js \
  services/doctrineFinalityMode.js \
  services/doctrineErrorFirewall.js \
  services/doctrineConversationState.js \
  services/doctrineCorrectionMemory.js \
  services/doctrineWitnessInventory.js \
  services/doctrineLivePathHandlers.js \
  services/responseGuarantee.js \
  services/runtimeHealthMonitor.js \
  services/safeJsonlWriter.js \
  services/stateTtlCleanup.js \
  services/phase4eRuntimeDiagnostics.js \
  services/phase4d1RuntimeDiagnostics.js \
  services/phase4c1RuntimeDiagnostics.js \
  scripts/runPhase4FCombinedStabilityRegression.js \
  scripts/runPhase4HDoctrineParityRegression.js \
  scripts/runPhase4HMemoryStressTest.js \
  scripts/runPhase4GProductionParityVerification.js \
  scripts/phase4i-git-add-runtime.sh

# Optional: Phase 4 reports
for f in Phase4E*.md Phase4F*.md Phase4G*.md Phase4H*.md Phase4I*.md; do
  [ -f "$f" ] && git add "$f"
done

echo "Staged files:"
git diff --cached --name-only
echo ""
echo "Review with: git diff --cached --stat"
echo "Commit only after explicit approval."
