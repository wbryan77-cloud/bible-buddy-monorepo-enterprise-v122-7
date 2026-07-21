# Alpha Freeze Plan

## Batch 1 — Alpha Core Freeze
Goal: stabilize what users experience.

Includes:
- Doctrine concept accuracy
- Companion response quality
- Human-vs-doctrine ownership
- Fallback response quality
- Scripture-first output standards

Primary files:
- services/bibleReasoningEngine.js
- services/companionDoctrineRouter.js
- services/bibleWideReasoningEngine.js
- services/bibleSemanticConceptNormalizer.js
- services/bibleConceptGraph.js
- services/bibleConceptConcordance.js
- services/openAiFirstCompanionRuntime.js
- services/liveResponseOwner.js

## Batch 2 — Alpha Platform Freeze
Goal: stabilize engineering and release readiness.

Includes:
- regression alignment
- repo cleanup
- startup validation
- Render verification
- alpha checklist
- docs freeze
- feature-flag freeze

Primary outputs:
- docs/alpha/AlphaReadinessChecklist.md
- docs/alpha/RegressionAlignmentNotes.md
- docs/alpha/ArchitectureFreeze.md
