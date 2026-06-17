#!/usr/bin/env bash
# Phase 5J.1 — Stage only safe Phase 5E–5J runtime files. Do NOT use git add -A.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FILES=(
  services/bibleCompanionOrchestrator.js
  services/companionIntentIntelligence.js
  services/relationshipContextModel.js
  services/companionMemoryManager.js
  services/companionResponseBuilder.js
  services/relationshipMemoryEngine.js
  services/practicalGuidanceEngine.js
  services/companionStyleGuard.js
  services/scriptureReasoningPlanner.js
  services/noGlitchTurnContract.js
  services/bibleNaturalConcordanceBuilder.js
  services/bibleSemanticConceptNormalizer.js
  services/bibleWordSenseEngine.js
  services/bncSafetyValidator.js
  services/followUpContextResolver.js
  services/twoWitnessStandard.js
  services/directAnswerFormatter.js
  services/bibleConceptConcordance.js
  services/bibleWideReasoningEngine.js
  services/userCorrectionMemory.js
  services/reflectionMemoryEngine.js
  services/runtimeHealthMonitor.js
  services/responseGuarantee.js
  services/safeJsonlWriter.js
  services/buddyLivePathVerifier.js
  services/alphaConversationCapture.js
  services/alphaFeedbackCapture.js
  services/alphaIssueAggregator.js
  services/alphaNotificationScheduler.js
  services/alphaTesterManager.js
  routes/alphaAdmin.js
  routes/alphaTest.js
  routes/buddy.js
  routes/runtimeHealth.js
  server.js
  admin/alpha-dashboard.html
  admin/alpha-test.html
  scripts/runPhase5JConversationEvalPack.js
  scripts/runPhase5JAlphaLoadSmoke.js
  scripts/runPhase5JAlphaIssueAggregation.js
  scripts/runPhase5IRelationshipIntelligenceRegression.js
  scripts/runPhase5HCompanionIntentIntelligenceRegression.js
  scripts/runPhase5FNoGlitchMemoryReasoningRegression.js
  scripts/runPhase5EBibleNaturalConcordanceRegression.js
  scripts/runPhase5BLiveHttpRegression.js
  scripts/runPhase5J1DeploymentIntegrityGate.js
  scripts/runPhase5J1ModuleLoadAudit.js
  scripts/phase5j1-git-add-alpha-runtime.sh
  docs/legal/AlphaTesterAgreement.md
  docs/legal/AlphaTesterConsentNotice.md
  docs/alpha/AlphaTesterInviteTextMessage.md
  docs/alpha/AlphaTesterInstructions.md
  docs/alpha/Phase5J100ConversationEvaluationPack.md
  services/conversationAnchorEngine.js
  services/humanNeedDetector.js
  services/companionCuriosityEngine.js
  services/practicalWisdomEngine.js
  services/prayerCompanionEngine.js
  services/companionIdentityEngine.js
  services/relationshipSummaryEngine.js
  public/index.html
  scripts/runPhase5KRelationshipDepthRegression.js
  Phase5KRelationshipDepthAudit.md
)

for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    git add "$f"
    echo "staged: $f"
  else
    echo "skip (missing): $f"
  fi
done

echo "--- staged summary ---"
git diff --cached --name-only
