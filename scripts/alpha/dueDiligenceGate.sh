#!/usr/bin/env bash
set -euo pipefail

echo "===== Due-Diligence Gate ====="
git status --short

echo
echo "===== Current branch / HEAD ====="
git branch --show-current
git log --oneline -5

echo
echo "===== Target runtime files syntax ====="
node --check services/companionDoctrineRouter.js
node --check services/bibleReasoningEngine.js
node --check services/bibleSemanticConceptNormalizer.js
node --check services/bibleWideReasoningEngine.js
node --check services/bibleCompanionOrchestrator.js

echo
echo "===== Known Alpha Guardrail Docs ====="
ls docs/alpha docs/alpha/governance docs/alpha/architecture docs/alpha/checklists 2>/dev/null || true

echo "PASS: due-diligence baseline complete."
