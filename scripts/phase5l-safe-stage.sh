#!/usr/bin/env bash
# Phase 5L — Safe staging only. No workflows, data, evidence-candidates, transcripts.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FILES=(
  services/liveResponseOwner.js
  services/singleCompanionContract.js
  services/companionPresenceEngine.js
  services/bibleCompanionOrchestrator.js
  services/buddyBrain.js
  services/openAiFirstCompanionRuntime.js
  services/prayerCompanionEngine.js
  services/practicalWisdomEngine.js
  services/companionIdentityEngine.js
  services/humanNeedDetector.js
  services/directAnswerFormatter.js
  services/conversationAnchorEngine.js
  services/companionIntentIntelligence.js
  services/practicalGuidanceEngine.js
  services/companionResponseBuilder.js
  services/companionStyleGuard.js
  services/companionMemoryManager.js
  services/relationshipContextModel.js
  services/relationshipMemoryEngine.js
  services/relationshipSummaryEngine.js
  services/scriptureReasoningPlanner.js
  services/noGlitchTurnContract.js
  public/index.html
  scripts/runPhase5LLiveThreadRegression.js
  scripts/runPhase5LNoRegressionGate.js
  scripts/phase5l-safe-stage.sh
  scripts/phase5j1-git-add-alpha-runtime.sh
  Phase5LRootCauseHistoryAudit.md
  Phase5LRouteOwnershipAudit.md
  Phase5LSingleCompanionContractAudit.md
  Phase5LCompanionPresenceReport.md
  Phase5LUIRestorationReport.md
)

for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    git add "$f"
    echo "staged: $f"
  else
    echo "skip (missing): $f"
  fi
done

echo "--- forbidden check ---"
FORBIDDEN=$(git diff --cached --name-only | grep -E '^\.github/workflows/|^data/|^docs/evidence-candidates/|\.env$|\.jsonl$' || true)
if [[ -n "$FORBIDDEN" ]]; then
  echo "FORBIDDEN STAGED:"
  echo "$FORBIDDEN"
  exit 1
fi

echo "--- staged summary ---"
git diff --cached --name-only
