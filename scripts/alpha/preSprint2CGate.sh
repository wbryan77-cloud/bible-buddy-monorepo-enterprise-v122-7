#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo " Sprint 2C Pre-Implementation Gate"
echo "============================================================"

echo
echo "1) Runtime diff check"
git diff -- services/bibleReasoningEngine.js services/bibleWideReasoningEngine.js services/companionDoctrineRouter.js services/masterBuddyRuntime.js services/buddyBrain.js || true

echo
echo "2) Required inventories exist"
test -f docs/alpha/consolidation/precedence-design/CanonicalRetrievalContract.md
test -f docs/alpha/consolidation/precedence-design/ImplementationTarget.md
test -f docs/alpha/consolidation/precedence-gate-code/01-code-windows.md

echo
echo "3) Syntax baseline"
node --check services/bibleReasoningEngine.js
node --check services/bibleWideReasoningEngine.js
node --check services/companionDoctrineRouter.js
node --check services/masterBuddyRuntime.js

echo
echo "4) Current focused baseline"
node scripts/alpha/alphaCoreTruthSmoke.js || true
node scripts/alpha/decisionOwnershipSmoke.js || true
node scripts/alpha/scriptureFidelitySmoke.js || true

echo
echo "============================================================"
echo "Gate complete. Proceed only with one canonical precedence implementation."
echo "============================================================"
