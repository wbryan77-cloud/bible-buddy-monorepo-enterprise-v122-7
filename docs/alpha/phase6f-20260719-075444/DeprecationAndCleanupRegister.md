# Phase 6F — Part 14: Deprecation and Cleanup Register

**No files were deleted in this batch.** Per the batch's explicit
instruction ("Only remove code when: no production caller, no active
test caller, no migration dependency, no rollback value, purpose is
superseded, deletion is proven safe... Prefer a deprecation register
over premature deletion"), this document records cleanup candidates
identified by static analysis for a **future, separately-approved**
cleanup batch — not an action taken now.

## Method and Confidence

Two independent checks were run:

1. **Live require-graph closure** from `server.js` (see
   `ArchitectureScaleReadiness.md`) — 283 of 664 `services/routes/lib`
   files are loaded when the server starts.
2. **Whole-repo basename reference search** — for every file in
   `services/`, `routes/`, `lib/`, does its basename (e.g.
   `runtimeScriptureWisdomEngine`) appear as a substring **anywhere
   else** in the repository (`services/`, `routes/`, `lib/`, `scripts/`,
   `tests/`, `config/`, `worker/`, `project-brain/`, `templates/`,
   `render/`, `public/`, `admin/`, `data/`, `server.js`,
   `package.json`)? **167 files' basenames appear nowhere else in the
   entire repository** — no `require(...)`, no test reference, no
   mention in any script or doc.

This is a **candidate list, not a deletion order**. Before any of these
are removed in a future batch, each candidate still needs: (a) a
confirmation that it isn't loaded via a fully-dynamic computed path this
static scan couldn't see, (b) a check for git history / rollback value,
and (c) explicit sign-off, exactly as the batch requires.

## Category A — High-Confidence Orphan Candidates (167 files)

The overwhelming majority (roughly 150 of 167) follow an obvious
naming pattern: `services/runtime*ContinuityEngine.js`,
`services/runtime*Framework.js`, `services/runtime*Matrix.js`,
`services/runtimeCanonical*Engine.js`, and similar. These read as a
large batch-generated set of "continuity/traversal/discernment" engines
from an earlier development phase that were scaffolded but never wired
into the live `bibleCompanionOrchestrator` → `openAiFirstCompanionRuntime`
chain, and never referenced by any other file, script, or test.

Full list (verbatim, for the record):

```
services/adminDoctrineReviewFlags.js
services/ambiguityEscalationRuntime.js
services/bibleOnlyRetrievalMode.js
services/canonicalContinuityLinks.js
services/cleanUncleanSymbolismCatalog.js
services/companionRetrievalHints.js
services/contradictionSuppressionRuntime.js
services/coveringLawOrderReferenceCatalog.js
services/doctrineAwareMemoryRetrieval.js
services/doctrineAwareMemoryRuntime.js
services/doctrineCompanionPath.js
services/doctrineConfidenceScoring.js
services/doctrineMemoryContinuity.js
services/doctrineReplayEngine.js
services/doctrineReplayQaHooks.js
services/doctrineSessionIndex.js
services/faithWorksCatalog.js
services/historicalReferenceSeparation.js
services/kingsProphetsTimelineCatalog.js
services/livingOSAggregator.js
services/prayerFastingCatalog.js
services/replayRegressionTestingRuntime.js
services/resourceIngestionReview.js
services/runtimeAdaptiveConversationEngine.js
services/runtimeApostolicContinuityEngine.js
services/runtimeAudioBibleContinuity.js
services/runtimeBibleJourneyScheduler.js
services/runtimeBiblicalCalendarContinuityEngine.js
services/runtimeBiblicalHierarchyContinuityEngine.js
services/runtimeButtonContinuityRouter.js
services/runtimeCanonicalAISermonFlowEngine.js
services/runtimeCanonicalBiblicalHospitalityEngine.js
services/runtimeCanonicalBiblicalLanguageContinuityEngine.js
services/runtimeCanonicalContextEngine.js
services/runtimeCanonicalContinuityReinforcementAI.js
services/runtimeCanonicalCreationStewardshipEngine.js
services/runtimeCanonicalEndurancePerseveranceEngine.js
services/runtimeCanonicalFastingDisciplineEngine.js
services/runtimeCanonicalJusticeMercyEngine.js
services/runtimeCanonicalKingdomEducationPathwayEngine.js
services/runtimeCanonicalKnowledgeRouter.js
services/runtimeCanonicalMinistryOperationsEngine.js
services/runtimeCanonicalSabbathRestFormationEngine.js
services/runtimeCanonicalScriptureAlignmentEngine.js
services/runtimeCanonicalScriptureMemorizationEngine.js
services/runtimeCanonicalSpiritualWarfareDiscernmentEngine.js
services/runtimeCanonicalStudyFlow.js
services/runtimeCanonicalThemeRegistry.js
services/runtimeCanonicalTraversalPaths.js
services/runtimeCanonicalWitnessReasoningOrchestrator.js
services/runtimeChapterContinuityEngine.js
services/runtimeChapterSequenceNeighbors.js
services/runtimeCommunityAccountabilityEngine.js
services/runtimeConnectedChapterFlow.js
services/runtimeConnectedThemeNeighbors.js
services/runtimeContextBridgeEngine.js
services/runtimeContextualNarrativeRouter.js
services/runtimeContextualScriptureSuggestionEngine.js
services/runtimeContextualVerseNeighbors.js
services/runtimeCrossBookIndex.js
services/runtimeDailyBibleJourneyTracker.js
services/runtimeDietaryLawContinuityEngine.js
services/runtimeDiscipleshipContinuityEngine.js
services/runtimeDynamicPropheticCorrespondenceAI.js
services/runtimeDynamicPropheticExpansionEngine.js
services/runtimeDynamicStudySessionEngine.js
services/runtimeFamilyDiscipleshipEngine.js
services/runtimeGenealogyTraversalEngine.js
services/runtimeGenesisRevelationContinuityGraph.js
services/runtimeGenesisRevelationWitnessFramework.js
services/runtimeGenesisToRevelationNavigator.js
services/runtimeHistoricalReferenceLayer.js
services/runtimeKingdomDiscipleshipAnalyticsEngine.js
services/runtimeKingdomInheritanceContinuityEngine.js
services/runtimeKingdomMediaDistributionEngine.js
services/runtimeKingdomServiceOpportunityAlignmentEngine.js
services/runtimeLifeEventContinuityEngine.js
services/runtimeLineUponLineEngine.js
services/runtimeMessianicLineageTraversalEngine.js
services/runtimeNarrativeBridgeIndex.js
services/runtimeNarrativeContinuityEngine.js
services/runtimeNarrativeProgressionMap.js
services/runtimeNarrativeSequenceMatrix.js
services/runtimeNarrativeThemeTraversal.js
services/runtimePrimarySourceScriptureEngine.js
services/runtimeProphecyContinuityEngine.js
services/runtimePropheticContinuityEngine.js
services/runtimePropheticWitnessRouter.js
services/runtimeProvenanceTracker.js
services/runtimeScripturalMonthContinuityEngine.js
services/runtimeScriptureAnchorNetwork.js
services/runtimeScriptureAssemblyContinuityEngine.js
services/runtimeScriptureCanonicalReasoningEngine.js
services/runtimeScriptureChainRenderer.js
services/runtimeScriptureContextMesh.js
services/runtimeScriptureContinuityApologeticsEngine.js
services/runtimeScriptureContinuityEmotionalGuidanceLayer.js
services/runtimeScriptureContinuityFamilyPrayerEngine.js
services/runtimeScriptureContinuityGlobalMissionsEngine.js
services/runtimeScriptureContinuityIntercessoryPrayerNetworkEngine.js
services/runtimeScriptureContinuityMarriageFormationEngine.js
services/runtimeScriptureContinuityMatrix.js
services/runtimeScriptureContinuityOrchestrator.js
services/runtimeScriptureContinuityPersonalizationEngine.js
services/runtimeScriptureContinuityReasoningAI.js
services/runtimeScriptureContinuityTeachingAI.js
services/runtimeScriptureCovenantContinuityEngine.js
services/runtimeScriptureDiscernmentEngine.js
services/runtimeScriptureDiscernmentEngineV2.js
services/runtimeScriptureFaithContinuityEngine.js
services/runtimeScriptureFlowTopology.js
services/runtimeScriptureGraceContinuityEngine.js
services/runtimeScriptureHarmonyEngine.js
services/runtimeScriptureHopeContinuityEngine.js
services/runtimeScriptureJudgmentContinuityEngine.js
services/runtimeScriptureKnowledgeDiscernmentRouter.js
services/runtimeScriptureKnowledgeTopology.js
services/runtimeScriptureLanguageGovernanceEngine.js
services/runtimeScriptureLightContinuityEngine.js
services/runtimeScriptureLoveContinuityEngine.js
services/runtimeScriptureMeditationEngine.js
services/runtimeScriptureMercyContinuityEngine.js
services/runtimeScriptureNarrativeIntegrityEngine.js
services/runtimeScriptureObedienceContinuityEngine.js
services/runtimeScripturePeaceContinuityEngine.js
services/runtimeScripturePreceptEngine.js
services/runtimeScripturePropheticFulfillmentEngine.js
services/runtimeScriptureRestorationContinuityFramework.js
services/runtimeScriptureResurrectionWitnessEngine.js
services/runtimeScriptureRighteousnessContinuityEngine.js
services/runtimeScriptureSalvationContinuityEngine.js
services/runtimeScriptureSequenceRouter.js
services/runtimeScriptureTimelineEngine.js
services/runtimeScriptureTraversalEngine.js
services/runtimeScriptureTraversalEngineV2.js
services/runtimeScriptureTruthFramework.js
services/runtimeScriptureTruthLightMatrix.js
services/runtimeScriptureUnderstandingMatrix.js
services/runtimeScriptureWisdomContinuityFramework.js
services/runtimeScriptureWisdomEngine.js
services/runtimeScriptureWitnessContinuityMatrix.js
services/runtimeScriptureWordContinuityEngine.js
services/runtimeSequentialReadingPlan.js
services/runtimeSequentialThemeTraversal.js
services/runtimeSpiritualGrowthJourneyEngine.js
services/runtimeStudyReferenceIndex.js
services/runtimeTeachingAuthorityContinuityEngine.js
services/runtimeTeachingAuthorityContinuityEngineV2.js
services/runtimeTempleStewardshipScannerEngine.js
services/runtimeUnresolvedThreadEngine.js
services/runtimeVoicePrayerCompanion.js
services/runtimeWellnessStewardshipEngine.js
services/runtimeWisdomPatternEngine.js
services/runtimeYouthDiscipleshipContinuityEngine.js
services/runtimeYouthDiscipleshipEngine.js
services/sacrificialLawReferenceCatalog.js
services/scriptureConfidenceWeighting.js
services/scriptureContinuityChecks.js
services/scriptureHistoryRenderer.js
services/scriptureOnlyRuntimePolicy.js
services/scriptureTeachingOrderEngine.js
services/teachingOrderProphetessReferenceCatalog.js
services/templeReferenceCatalog.js
services/topicContinuityPersistence.js
services/topicMemoryEmbeddings.js
services/uploadContinuityRuntime.js
services/verseGraphRelationships.js
```

**Recommended action:** `ADMIN_REVIEW` / `REMOVE_IF_PROVEN_UNUSED` in a
dedicated future cleanup batch — not this one. Some of these (e.g.
`services/runtimeScriptureDiscernmentEngineV2.js` alongside
`runtimeScriptureDiscernmentEngine.js`, or
`runtimeTeachingAuthorityContinuityEngineV2.js` alongside its non-V2
counterpart) look like exactly the "V1/V2 scaffold" duplication the
batch asked about — both members of each such pair are equally
unreferenced, so neither can be assumed to be the "real" one without
manual code reading.

## Category B — Unused Dependency

- **`multer`** is declared in `package.json` but never `require`d
  anywhere in the live codebase (verified: zero matches for
  `require('multer')` or `require("multer")` repo-wide). Recommended
  action: `REMOVE_IF_PROVEN_UNUSED` in a future cleanup pass, OR
  `KEEP` if Part 11's deferred file-upload feature is built soon (multer
  is the natural fit for that).

## Category C — Present but Unwired Infrastructure (do not remove — flag for a decision)

- **`prisma/schema.prisma`** exists but there is no `@prisma/client` (or
  any DB client) dependency and no code path instantiates a Prisma
  client. This is not "orphaned" in the same sense as Category A (it's a
  forward-looking scaffold, not dead output) — flagged `ADMIN_REVIEW`:
  either commit to wiring up a real database before Beta, or explicitly
  document that file-based JSONL storage is the intended Founder/Closed
  Alpha architecture and the schema is aspirational.
- **`services/phase3fContentExtraction.js`** actively uses `pdf-parse`
  and is a real, working PDF-text-extraction capability — flagged `KEEP`,
  and specifically recommended for reuse if/when Part 11's deferred
  file-upload feature is implemented post-Alpha (avoids rebuilding PDF
  parsing from scratch).

## Category D — Needs Manual Review Before Any Decision

- `services/reasonFirstBuddyRuntime.js` and `services/masterBuddyRuntime.js`
  were present in the require-graph walk from `server.js` (i.e. they ARE
  reachable, unlike Category A) but their exact current role relative to
  the confirmed-active `openAiFirstCompanionRuntime` → `bibleCompanionOrchestrator`
  chain was not exhaustively traced in this pass. Flagged
  `UNKNOWN_NEEDS_REVIEW` — do not combine or remove without a dedicated
  trace of which runtime handles which request path.

## What Was NOT Done (and why)

- No file was deleted, moved, or edited as part of this Part.
- No behavioral test was run to "prove" these 167 files are safe to
  remove (e.g. temporarily deleting each and re-running the full
  regression suite) — that level of verification is exactly the kind of
  dedicated, careful cleanup batch the parent batch's own rules
  anticipate as a *separate* piece of work, not something to rush inside
  Phase 6F's knowledge/product-completion scope.
