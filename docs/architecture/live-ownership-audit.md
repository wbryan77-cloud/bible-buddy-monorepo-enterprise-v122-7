# BibleBuddy Live Ownership Audit

Generated: 2026-07-16T23:12:51.682Z

Scanned JavaScript files: 804

## Expected live ownership chain

| File | Exists | Reachable | Direct callers |
|---|---:|---:|---|
| routes/buddy.js | yes | yes | scripts/liveResponseCaptureRun.js, scripts/runPhase5BLiveHttpRegression.js, scripts/runPhase5M4LiveTruthRegression.js, scripts/runPhase5M5UnifiedIntentAuthorityRegression.js, scripts/uiContractReproduce.js |
| services/buddyBrain.js | yes | yes | routes/buddy.js, scripts/alpha/decisionOwnershipSmoke.js, scripts/alpha/scriptureFidelitySmoke.js, scripts/baePhase1aRegression.js, scripts/baePhase1bLiveMeasurement.js, scripts/baePhase1bValidation.js, scripts/bibleBuddyLiteBaselineExperiment.js, scripts/bibleOnlyAuthorityRegression.js, scripts/companionConversationExperiment.js, scripts/companionOperatingModelExperiment.js, scripts/companionTurnIntentValidation.js, scripts/coreRestorationRegressionTest.js, scripts/deployParityVerification.js, scripts/doctrineAuthorityFailureProbe.js, scripts/e2eDoctrineProofAndEnvParity.js, scripts/emergencyHardCutoverRegression.js, scripts/emotionalCenterPreservationValidation.js, scripts/emptyReplyTrace.js, scripts/endToEndDoctrineTurnProof.js, scripts/goldenCompanionExamplesValidation.js, scripts/liveRuntimeVerification.js, scripts/openAiFirstRegressionTest.js, scripts/ownershipAuditBattery.js, scripts/phase1BibleLearningValidation.js, scripts/phase1StabilityPhase2aRegression.js, scripts/phase1cClaimGenerationCompliance.js, scripts/phase2aClaimExtractorRegression.js, scripts/phase2bSupportRelationshipRegression.js, scripts/phase2fConversationStressTest.js, scripts/phase2hRegression.js, scripts/phase2iConversationStressTest.js, scripts/postOpenAiCoreRestorationSmokeTest.js, scripts/promptHierarchyExperiment.js, scripts/raclValidation.js, scripts/realDoctrineTurnTraceRunner.js, scripts/reasonFirstLiteExperiment.js, scripts/reasonFirstMigration.js, scripts/responseOwnershipTraceAudit.js, scripts/responseStructureRemovalExperiment.js, scripts/runPhase4D2LiveCompanionPathRegression.js, scripts/runPhase4D3LiveCompanionRealPathRegression.js, scripts/runPhase4ELiveBrowserPathRegression.js, scripts/runPhase4FCombinedStabilityRegression.js, scripts/runPhase4GProductionParityVerification.js, scripts/runPhase4HDoctrineParityRegression.js, scripts/runPhase4HMemoryStressTest.js, scripts/runPhase4MCompanionRoutingRegression.js, scripts/runPhase4NResponseClarityRegression.js, scripts/runPhase4OBibleWideReasoningRegression.js, scripts/runPhase5ABibleCompanionOrchestrationRegression.js, scripts/runPhase5EBibleNaturalConcordanceRegression.js, scripts/runPhase5FNoGlitchMemoryReasoningRegression.js, scripts/runPhase5GCompanionRelationshipRegression.js, scripts/runPhase5HCompanionIntentIntelligenceRegression.js, scripts/runPhase5IRelationshipIntelligenceRegression.js, scripts/runPhase5JAlphaLoadSmoke.js, scripts/runPhase5JConversationEvalPack.js, scripts/runPhase5KRelationshipDepthRegression.js, scripts/runPhase5LLiveThreadRegression.js, scripts/runPhase5M1KnownWorkingPathRegression.js, scripts/runPhase5M2LiveRouteVerification.js, scripts/runPhase5M3OldPhraseQuarantineRegression.js, scripts/runPhase5MLastKnownGoodRecoveryRegression.js, scripts/scriptureAuthorityAuditRunner.js, scripts/shadowRuntimeComparison.js, scripts/sprint213AcceptanceHttp.js, scripts/sprint214AcceptanceHttp.js, scripts/sprint214bSabbathHistoryHttp.js, scripts/sprint214cNaturalReasoningHttp.js, scripts/sprint214dActiveConversationHttp.js, scripts/sprint2FinalBMetaQuestionHttp.js, scripts/sprint2FinalCReasoningFirstHttp.js, scripts/sprint2FinalMasterRuntimeHttp.js, scripts/sprint2RepairTrace.js, scripts/traceBuddyChatPath.js, scripts/traceLiveBuddyRoute.js, services/bibleBuddyLiteRuntime.js, services/companionConversationExperimentRuntime.js, services/companionOperatingModelExperiment.js, services/minimalReasonFirstRuntime.js, services/reasonFirstComposer.js, services/reasonFirstLiteRuntime.js, services/responseStructureRemovalExperiment.js, services/runtimeHealthMonitor.js, services/shadowReasonFirstRuntime.js |
| services/openAiFirstCompanionRuntime.js | yes | yes | services/buddyBrain.js |
| services/bibleCompanionOrchestrator.js | yes | yes | services/openAiFirstCompanionRuntime.js |
| services/bibleWideReasoningEngine.js | yes | yes | services/bibleCompanionOrchestrator.js, services/companionDoctrineRouter.js, services/pendingQuestionResolver.js |
| services/liveResponseOwner.js | yes | yes | services/buddyBrain.js |
| services/singleCompanionContract.js | yes | yes | scripts/runPhase5LLiveThreadRegression.js, scripts/runPhase5LNoRegressionGate.js, scripts/runPhase5M1DeployParityGate.js, scripts/runPhase5M1KnownWorkingPathRegression.js, scripts/runPhase5M3OldPhraseQuarantineRegression.js, scripts/runPhase5MDeployParityGate.js, scripts/runPhase5MLastKnownGoodRecoveryRegression.js, services/bibleCompanionOrchestrator.js, services/liveResponseOwner.js, services/openAiFirstCompanionRuntime.js |

## Ownership symbols

### runBuddy

- routes/buddy.js — occurrences=3, exported=false
- scripts/alpha/decisionOwnershipSmoke.js — occurrences=2, exported=false
- scripts/alpha/scriptureFidelitySmoke.js — occurrences=2, exported=false
- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- scripts/baePhase1aRegression.js — occurrences=2, exported=false
- scripts/baePhase1bLiveMeasurement.js — occurrences=3, exported=false
- scripts/baePhase1bValidation.js — occurrences=2, exported=false
- scripts/bibleBuddyLiteBaselineExperiment.js — occurrences=4, exported=false
- scripts/bibleOnlyAuthorityRegression.js — occurrences=2, exported=false
- scripts/companionIntelligenceValidationSuite.js — occurrences=1, exported=false
- scripts/companionTurnIntentValidation.js — occurrences=2, exported=false
- scripts/coreRestorationRegressionTest.js — occurrences=2, exported=false
- scripts/deployParityVerification.js — occurrences=4, exported=false
- scripts/doctrineAuthorityFailureProbe.js — occurrences=2, exported=false
- scripts/e2eDoctrineProofAndEnvParity.js — occurrences=4, exported=false
- scripts/emergencyHardCutoverRegression.js — occurrences=2, exported=false
- scripts/emotionalCenterPreservationValidation.js — occurrences=2, exported=false
- scripts/emptyReplyTrace.js — occurrences=3, exported=false
- scripts/endToEndDoctrineTurnProof.js — occurrences=3, exported=false
- scripts/goldenCompanionExamplesValidation.js — occurrences=2, exported=false
- scripts/liveRuntimeVerification.js — occurrences=2, exported=false
- scripts/openAiFirstDependencyAudit.js — occurrences=1, exported=false
- scripts/openAiFirstRegressionTest.js — occurrences=3, exported=false
- scripts/ownershipAuditBattery.js — occurrences=3, exported=false
- scripts/phase1BibleLearningValidation.js — occurrences=2, exported=false
- scripts/phase1StabilityPhase2aRegression.js — occurrences=2, exported=false
- scripts/phase2aClaimExtractorRegression.js — occurrences=3, exported=false
- scripts/phase2bSupportRelationshipRegression.js — occurrences=2, exported=false
- scripts/phase2fConversationStressTest.js — occurrences=2, exported=false
- scripts/phase2hRegression.js — occurrences=2, exported=false
- scripts/phase2iConversationStressTest.js — occurrences=2, exported=false
- scripts/postOpenAiCoreRestorationSmokeTest.js — occurrences=2, exported=false
- scripts/promptHierarchyExperiment.js — occurrences=2, exported=false
- scripts/raclValidation.js — occurrences=2, exported=false
- scripts/realDoctrineTurnTraceRunner.js — occurrences=5, exported=false
- scripts/reasonFirstMigration.js — occurrences=2, exported=false
- scripts/responseOwnershipTraceAudit.js — occurrences=3, exported=false
- scripts/runPhase4D2LiveCompanionPathRegression.js — occurrences=6, exported=false
- scripts/runPhase4D3LiveCompanionRealPathRegression.js — occurrences=4, exported=false
- scripts/runPhase4ELiveBrowserPathRegression.js — occurrences=3, exported=false
- scripts/runPhase4FCombinedStabilityRegression.js — occurrences=3, exported=false
- scripts/runPhase4GProductionParityVerification.js — occurrences=2, exported=false
- scripts/runPhase4HDoctrineParityRegression.js — occurrences=2, exported=false
- scripts/runPhase4HMemoryStressTest.js — occurrences=3, exported=false
- scripts/runPhase4MCompanionRoutingRegression.js — occurrences=3, exported=false
- scripts/runPhase4NResponseClarityRegression.js — occurrences=2, exported=false
- scripts/runPhase4OBibleWideReasoningRegression.js — occurrences=2, exported=false
- scripts/runPhase5ABibleCompanionOrchestrationRegression.js — occurrences=2, exported=false
- scripts/runPhase5EBibleNaturalConcordanceRegression.js — occurrences=2, exported=false
- scripts/runPhase5FNoGlitchMemoryReasoningRegression.js — occurrences=2, exported=false
- scripts/runPhase5GCompanionRelationshipRegression.js — occurrences=2, exported=false
- scripts/runPhase5HCompanionIntentIntelligenceRegression.js — occurrences=2, exported=false
- scripts/runPhase5IRelationshipIntelligenceRegression.js — occurrences=2, exported=false
- scripts/runPhase5JAlphaLoadSmoke.js — occurrences=2, exported=false
- scripts/runPhase5JConversationEvalPack.js — occurrences=2, exported=false
- scripts/runPhase5KRelationshipDepthRegression.js — occurrences=2, exported=false
- scripts/runPhase5LLiveThreadRegression.js — occurrences=2, exported=false
- scripts/runPhase5M1DeployParityGate.js — occurrences=4, exported=false
- scripts/runPhase5M1KnownWorkingPathRegression.js — occurrences=2, exported=false
- scripts/runPhase5M2LiveRouteVerification.js — occurrences=3, exported=false
- scripts/runPhase5M3OldPhraseQuarantineRegression.js — occurrences=2, exported=false
- scripts/runPhase5M4DeployTruthCheck.js — occurrences=3, exported=false
- scripts/runPhase5MDeployParityGate.js — occurrences=1, exported=false
- scripts/runPhase5MLastKnownGoodRecoveryRegression.js — occurrences=2, exported=false
- scripts/scriptureAuthorityAuditRunner.js — occurrences=2, exported=false
- scripts/shadowRuntimeComparison.js — occurrences=4, exported=false
- scripts/sprint213AcceptanceHttp.js — occurrences=2, exported=false
- scripts/sprint214AcceptanceHttp.js — occurrences=2, exported=false
- scripts/sprint214bSabbathHistoryHttp.js — occurrences=2, exported=false
- scripts/sprint214cNaturalReasoningHttp.js — occurrences=2, exported=false
- scripts/sprint214dActiveConversationHttp.js — occurrences=2, exported=false
- scripts/sprint2FinalBMetaQuestionHttp.js — occurrences=3, exported=false
- scripts/sprint2FinalCReasoningFirstHttp.js — occurrences=2, exported=false
- scripts/sprint2FinalMasterRuntimeHttp.js — occurrences=3, exported=false
- scripts/sprint2RepairTrace.js — occurrences=5, exported=false
- scripts/traceBuddyChatPath.js — occurrences=3, exported=false
- scripts/traceLiveBuddyRoute.js — occurrences=4, exported=false
- services/autonomousCompanion.js — occurrences=1, exported=false
- services/buddyBrain.js — occurrences=2, exported=true
- services/buddyLivePathVerifier.js — occurrences=2, exported=false
- services/buddyRuntimeConfig.js — occurrences=2, exported=false
- services/masterBuddyRuntime.js — occurrences=1, exported=false
- services/reasonFirstBuddyRuntime.js — occurrences=1, exported=false
- services/responseGuarantee.js — occurrences=1, exported=false
- services/structuredCompanionRuntime.js — occurrences=1, exported=false

### runOpenAiFirstCompanionRuntime

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- scripts/deployParityVerification.js — occurrences=3, exported=false
- services/buddyBrain.js — occurrences=2, exported=false
- services/openAiFirstCompanionRuntime.js — occurrences=2, exported=true

### runBibleCompanionOrchestrator

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- scripts/runPhase5M1DeployParityGate.js — occurrences=3, exported=false
- scripts/runPhase5M2LiveRouteVerification.js — occurrences=1, exported=false
- services/bibleCompanionOrchestrator.js — occurrences=2, exported=true
- services/openAiFirstCompanionRuntime.js — occurrences=2, exported=false

### runStrictDoctrineGate

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- services/bibleCompanionOrchestrator.js — occurrences=2, exported=false
- services/openAiFirstCompanionRuntime.js — occurrences=2, exported=false
- services/strictDoctrineGate.js — occurrences=2, exported=true

### buildBibleWideAnswer

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- services/bibleCompanionOrchestrator.js — occurrences=3, exported=false
- services/bibleWideReasoningEngine.js — occurrences=2, exported=true
- services/companionDoctrineRouter.js — occurrences=2, exported=false
- services/liveRequestTrace.js — occurrences=1, exported=false
- services/pendingQuestionResolver.js — occurrences=2, exported=false

### resolveConceptForMessage

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- services/bibleCompanionOrchestrator.js — occurrences=2, exported=false
- services/bibleWideReasoningEngine.js — occurrences=3, exported=true

### buildConnectionErrorReply

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- scripts/responseOwnershipTraceAudit.js — occurrences=2, exported=false
- scripts/runPhase4D3LiveCompanionRealPathRegression.js — occurrences=1, exported=false
- services/coreResponseGuards.js — occurrences=2, exported=true
- services/openAiFirstCompanionRuntime.js — occurrences=2, exported=false

### finalizeBuddyResponse

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- scripts/runPhase5M1DeployParityGate.js — occurrences=2, exported=false
- services/buddyBrain.js — occurrences=6, exported=false
- services/doctrineCompanionPath.js — occurrences=1, exported=false
- services/masterBuddyRuntime.js — occurrences=2, exported=false
- services/openAiFirstCompanionRuntime.js — occurrences=5, exported=false
- services/reasonFirstBuddyRuntime.js — occurrences=1, exported=false

### finalizeLiveResponse

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- scripts/runPhase5LNoRegressionGate.js — occurrences=1, exported=false
- scripts/runPhase5M1DeployParityGate.js — occurrences=2, exported=false
- scripts/runPhase5MDeployParityGate.js — occurrences=4, exported=false
- services/buddyBrain.js — occurrences=2, exported=false
- services/liveResponseOwner.js — occurrences=2, exported=true

### enforceSingleCompanionContract

- scripts/architectureOwnershipAudit.js — occurrences=1, exported=false
- scripts/runPhase5LNoRegressionGate.js — occurrences=2, exported=false
- scripts/runPhase5M1DeployParityGate.js — occurrences=4, exported=false
- scripts/runPhase5MDeployParityGate.js — occurrences=2, exported=false
- services/liveResponseOwner.js — occurrences=2, exported=false
- services/singleCompanionContract.js — occurrences=2, exported=true

## Dormant runtime candidates

- scripts/alpha/decisionOwnershipSmoke.js
- scripts/architectureOwnershipAudit.js
- scripts/liveRuntimeVerification.js
- scripts/ownershipAuditBattery.js
- scripts/responseOwnershipTraceAudit.js
- scripts/shadowRuntimeComparison.js
- scripts/sprint2FinalMasterRuntimeHttp.js
- scripts/uiContractReproduce.js
- services/ambiguityEscalationRuntime.js
- services/contradictionSuppressionRuntime.js
- services/doctrineAwareMemoryRuntime.js
- services/masterBuddyRuntime.js
- services/reasonFirstBuddyRuntime.js
- services/replayRegressionTestingRuntime.js
- services/runtimeAdaptiveConversationEngine.js
- services/runtimeApostolicContinuityEngine.js
- services/runtimeAudioBibleContinuity.js
- services/runtimeBibleJourneyScheduler.js
- services/runtimeBiblicalCalendarContinuityEngine.js
- services/runtimeBiblicalHierarchyContinuityEngine.js
- services/runtimeButtonContinuityRouter.js
- services/runtimeCanonicalAISermonFlowEngine.js
- services/runtimeCanonicalBiblicalHospitalityEngine.js
- services/runtimeCanonicalBiblicalLanguageContinuityEngine.js
- services/runtimeCanonicalContextEngine.js
- services/runtimeCanonicalContinuityReinforcementAI.js
- services/runtimeCanonicalCreationStewardshipEngine.js
- services/runtimeCanonicalEndurancePerseveranceEngine.js
- services/runtimeCanonicalFastingDisciplineEngine.js
- services/runtimeCanonicalJusticeMercyEngine.js
- services/runtimeCanonicalKingdomEducationPathwayEngine.js
- services/runtimeCanonicalKnowledgeRouter.js
- services/runtimeCanonicalMinistryOperationsEngine.js
- services/runtimeCanonicalSabbathRestFormationEngine.js
- services/runtimeCanonicalScriptureAlignmentEngine.js
- services/runtimeCanonicalScriptureMemorizationEngine.js
- services/runtimeCanonicalSpiritualWarfareDiscernmentEngine.js
- services/runtimeCanonicalStudyFlow.js
- services/runtimeCanonicalThemeRegistry.js
- services/runtimeCanonicalTraversalPaths.js
- services/runtimeCanonicalWitnessReasoningOrchestrator.js
- services/runtimeChapterContinuityEngine.js
- services/runtimeChapterSequenceNeighbors.js
- services/runtimeChurchStudyContinuityEngine.js
- services/runtimeCommunityAccountabilityEngine.js
- services/runtimeConnectedChapterFlow.js
- services/runtimeConnectedThemeNeighbors.js
- services/runtimeContextBridgeEngine.js
- services/runtimeContextualNarrativeRouter.js
- services/runtimeContextualScriptureSuggestionEngine.js
- services/runtimeContextualVerseNeighbors.js
- services/runtimeCovenantContinuityEngine.js
- services/runtimeCrossBookIndex.js
- services/runtimeCrossBookNarrativeGraph.js
- services/runtimeDailyBibleJourneyTracker.js
- services/runtimeDietaryLawContinuityEngine.js
- services/runtimeDiscipleshipContinuityEngine.js
- services/runtimeDynamicPropheticCorrespondenceAI.js
- services/runtimeDynamicPropheticExpansionEngine.js
- services/runtimeDynamicStudySessionEngine.js
- services/runtimeFamilyDiscipleshipEngine.js
- services/runtimeFeastDayContinuityEngine.js
- services/runtimeGenealogyTraversalEngine.js
- services/runtimeGenesisRevelationContinuityGraph.js
- services/runtimeGenesisRevelationWitnessFramework.js
- services/runtimeGenesisToRevelationNavigator.js
- services/runtimeHistoricalReferenceLayer.js
- services/runtimeKingdomDiscipleshipAnalyticsEngine.js
- services/runtimeKingdomInheritanceContinuityEngine.js
- services/runtimeKingdomMediaDistributionEngine.js
- services/runtimeKingdomServiceOpportunityAlignmentEngine.js
- services/runtimeLifeEventContinuityEngine.js
- services/runtimeLineUponLineEngine.js
- services/runtimeMessiahWitnessMatrix.js
- services/runtimeMessianicLineageTraversalEngine.js
- services/runtimeNarrativeBridgeIndex.js
- services/runtimeNarrativeContinuityEngine.js
- services/runtimeNarrativeProgressionMap.js
- services/runtimeNarrativeSequenceMatrix.js
- services/runtimeNarrativeThemeTraversal.js
- services/runtimePrimarySourceScriptureEngine.js
- services/runtimeProphecyContinuityEngine.js
- services/runtimePropheticContinuityEngine.js
- services/runtimePropheticWitnessRouter.js
- services/runtimeProvenanceTracker.js
- services/runtimeReferenceConnectionIndex.js
- services/runtimeSabbathContinuityEngine.js
- services/runtimeScripturalMonthContinuityEngine.js
- services/runtimeScriptureAnchorNetwork.js
- services/runtimeScriptureAssemblyContinuityEngine.js
- services/runtimeScriptureCanonicalReasoningEngine.js
- services/runtimeScriptureChainRenderer.js
- services/runtimeScriptureContextMesh.js
- services/runtimeScriptureContinuityApologeticsEngine.js
- services/runtimeScriptureContinuityEmotionalGuidanceLayer.js
- services/runtimeScriptureContinuityFamilyPrayerEngine.js
- services/runtimeScriptureContinuityGlobalMissionsEngine.js
- services/runtimeScriptureContinuityIntercessoryPrayerNetworkEngine.js
- services/runtimeScriptureContinuityMarriageFormationEngine.js
- services/runtimeScriptureContinuityMatrix.js
- services/runtimeScriptureContinuityOrchestrator.js
- services/runtimeScriptureContinuityPersonalizationEngine.js
- services/runtimeScriptureContinuityReasoningAI.js
- services/runtimeScriptureContinuityTeachingAI.js
- services/runtimeScriptureCovenantContinuityEngine.js
- services/runtimeScriptureDiscernmentEngine.js
- services/runtimeScriptureDiscernmentEngineV2.js
- services/runtimeScriptureFaithContinuityEngine.js
- services/runtimeScriptureFlowTopology.js
- services/runtimeScriptureGraceContinuityEngine.js
- services/runtimeScriptureHarmonyEngine.js
- services/runtimeScriptureHolinessContinuityEngine.js
- services/runtimeScriptureHopeContinuityEngine.js
- services/runtimeScriptureJudgmentContinuityEngine.js
- services/runtimeScriptureKingdomContinuityEngine.js
- services/runtimeScriptureKnowledgeDiscernmentRouter.js
- services/runtimeScriptureKnowledgeTopology.js
- services/runtimeScriptureLanguageGovernanceEngine.js
- services/runtimeScriptureLightContinuityEngine.js
- services/runtimeScriptureLoveContinuityEngine.js
- services/runtimeScriptureMeditationEngine.js
- services/runtimeScriptureMercyContinuityEngine.js
- services/runtimeScriptureMessiahWitnessEngine.js
- services/runtimeScriptureNarrativeIntegrityEngine.js
- services/runtimeScriptureObedienceContinuityEngine.js
- services/runtimeScripturePeaceContinuityEngine.js
- services/runtimeScripturePreceptEngine.js
- services/runtimeScripturePropheticFulfillmentEngine.js
- services/runtimeScriptureRestorationContinuityFramework.js
- services/runtimeScriptureResurrectionWitnessEngine.js
- services/runtimeScriptureRighteousnessContinuityEngine.js
- services/runtimeScriptureSalvationContinuityEngine.js
- services/runtimeScriptureSequenceRouter.js
- services/runtimeScriptureTimelineEngine.js
- services/runtimeScriptureTraversalEngine.js
- services/runtimeScriptureTraversalEngineV2.js
- services/runtimeScriptureTruthFramework.js
- services/runtimeScriptureTruthLightMatrix.js
- services/runtimeScriptureUnderstandingMatrix.js
- services/runtimeScriptureWisdomContinuityFramework.js
- services/runtimeScriptureWisdomEngine.js
- services/runtimeScriptureWitnessContinuityMatrix.js
- services/runtimeScriptureWordContinuityEngine.js
- services/runtimeSequentialReadingPlan.js
- services/runtimeSequentialThemeTraversal.js
- services/runtimeSpiritualGrowthJourneyEngine.js
- services/runtimeStudyReferenceIndex.js
- services/runtimeTeachingAuthorityContinuityEngine.js
- services/runtimeTeachingAuthorityContinuityEngineV2.js
- services/runtimeTempleStewardshipScannerEngine.js
- services/runtimeUnresolvedThreadEngine.js
- services/runtimeVoicePrayerCompanion.js
- services/runtimeWellnessStewardshipEngine.js
- services/runtimeWisdomPatternEngine.js
- services/runtimeYouthDiscipleshipContinuityEngine.js
- services/runtimeYouthDiscipleshipEngine.js
- services/scriptureOnlyRuntimePolicy.js
- services/uploadContinuityRuntime.js

## Disconnected runtime candidates

- routes/runtimeHealth.js — callers: scripts/runPhase5BLiveHttpRegression.js
- services/bibleBuddyLiteRuntime.js — callers: scripts/bibleBuddyLiteBaselineExperiment.js
- services/buddyRuntimeConfig.js — callers: scripts/liveRuntimeVerification.js
- services/companionButtonRuntime.js — callers: services/retrievalFirstRuntime.js
- services/companionConversationExperimentRuntime.js — callers: scripts/companionConversationExperiment.js
- services/continuityRegressionRuntime.js — callers: services/runtimeContinuityOrchestrator.js, services/runtimeMemoryBridge.js
- services/dailyBibleJourneyRuntime.js — callers: services/retrievalFirstRuntime.js, services/runtimeButtonContinuityRouter.js
- services/liveRuntimeTraversalEngine.js — callers: services/runtimeCanonicalStudyFlow.js
- services/minimalReasonFirstRuntime.js — callers: scripts/promptHierarchyExperiment.js
- services/platformUnification/continuity/continuityStateContract.js — callers: services/platformUnification/orchestrator.js
- services/platformUnification/knowledgeGraph/kingdomKnowledgeGraphContract.js — callers: services/platformUnification/orchestrator.js
- services/platformUnification/orchestrator.js — callers: routes/platformUnification.js
- services/platformUnification/runtime/orchestrationRuntimeEventContracts.js — callers: services/platformUnification/orchestrator.js
- services/platformUnification/runtime/runtimeRecoveryContracts.js — callers: services/platformUnification/orchestrator.js
- services/platformUnification/runtime/runtimeStabilizationPolicies.js — callers: services/platformUnification/orchestrator.js
- services/platformUnification/runtime/unifiedRuntimeRegistry.js — callers: services/platformUnification/orchestrator.js
- services/reasonFirstLiteRuntime.js — callers: scripts/reasonFirstLiteExperiment.js
- services/responseContract.js — callers: services/answerMatchGate.js, services/masterBuddyRuntime.js
- services/retrievalFirstRuntime.js — callers: services/runtimeContinuityOrchestrator.js
- services/routeOwnershipTable.js — callers: scripts/traceBuddyChatPath.js, services/masterBuddyRuntime.js
- services/runtimeCanonicalBiblicalDecisionEngine.js — callers: services/runtimeCanonicalSpiritualWarfareDiscernmentEngine.js, services/runtimeScriptureContinuityApologeticsEngine.js, services/runtimeScriptureContinuityMentorEngine.js
- services/runtimeCanonicalChurchLeadershipFormationEngine.js — callers: services/runtimeCanonicalRevivalAwakeningPrayerEngine.js, services/runtimeKingdomLeadershipTrainingEngine.js
- services/runtimeCanonicalContinuityOrchestrator.js — callers: services/runtimeCanonicalDoctrineValidator.js
- services/runtimeCanonicalContradictionDetectionEngine.js — callers: services/runtimeCanonicalWisdomDiscernmentLayer.js, services/runtimeScriptureContinuityReasoningAI.js
- services/runtimeCanonicalCovenantTimelineEngine.js — callers: services/runtimeCanonicalBiblicalLanguageContinuityEngine.js
- services/runtimeCanonicalDoctrineValidator.js — callers: services/runtimeGenesisToRevelationTraversalEngine.js
- services/runtimeCanonicalFamilyDiscipleshipEngine.js — callers: services/runtimeScriptureContinuityFamilyPrayerEngine.js, services/runtimeScriptureContinuityMarriageFormationEngine.js
- services/runtimeCanonicalFellowshipCommunityEngine.js — callers: services/runtimeCanonicalBiblicalHospitalityEngine.js, services/runtimeCanonicalChurchLeadershipFormationEngine.js, services/runtimeKingdomOutreachCoordinationEngine.js, services/runtimeScriptureContinuityMissionEngine.js
- services/runtimeCanonicalGraphRegistry.js — callers: services/runtimeCanonicalKnowledgeGraphExpansionLayer.js, services/runtimeScripturePathResolver.js, services/runtimeScriptureRelationshipMapper.js
- services/runtimeCanonicalHistoricalTimelineEngine.js — callers: services/runtimeScriptureContinuityInsightGenerator.js, services/runtimeVisualKingdomKnowledgeGraphEngine.js
- services/runtimeCanonicalKingdomEthicsEngine.js — callers: services/runtimeCanonicalJusticeMercyEngine.js
- services/runtimeCanonicalKnowledgeGraphExpansionLayer.js — callers: services/runtimeCanonicalVerseEmbeddingSystem.js, services/runtimeVisualKingdomKnowledgeGraphEngine.js
- services/runtimeCanonicalMediaTeachingGenerationEngine.js — callers: services/runtimeCanonicalAISermonFlowEngine.js, services/runtimeKingdomMediaDistributionEngine.js
- services/runtimeCanonicalMemoryLayer.js — callers: services/runtimeDynamicStudySessionEngine.js, services/runtimeScriptureContinuityConversationEngine.js
- services/runtimeCanonicalMultiDayStudyPlanner.js — callers: services/runtimeCanonicalSpiritualFormationEngine.js, services/runtimeScriptureContinuityPersonalizationEngine.js
- services/runtimeCanonicalPeacemakingReconciliationEngine.js — callers: services/runtimeScriptureContinuityMarriageFormationEngine.js
- services/runtimeCanonicalPrayerJournalEngine.js — callers: services/runtimeScriptureContinuityFamilyPrayerEngine.js, services/runtimeScriptureContinuityIntercessoryPrayerNetworkEngine.js
- services/runtimeCanonicalRevelationRestorationEngine.js — callers: services/runtimeEternalKingdomContinuityEngine.js, services/runtimeScriptureContinuityPrayerEngine.js
- services/runtimeCanonicalRevivalAwakeningPrayerEngine.js — callers: services/runtimeScriptureContinuityIntercessoryPrayerNetworkEngine.js
- services/runtimeCanonicalSemanticRankingAI.js — callers: services/runtimeScriptureContinuityInsightGenerator.js
- services/runtimeCanonicalSemanticRetrievalEngine.js — callers: services/runtimeCanonicalSemanticRankingAI.js
- services/runtimeCanonicalSmallGroupStudyEngine.js — callers: services/runtimeCanonicalMinistryOperationsEngine.js
- services/runtimeCanonicalSpiritualFormationEngine.js — callers: services/runtimeCanonicalEndurancePerseveranceEngine.js, services/runtimeCanonicalFamilyDiscipleshipEngine.js, services/runtimeCanonicalFellowshipCommunityEngine.js, services/runtimeCanonicalSabbathRestFormationEngine.js, services/runtimeScriptureContinuityCounselingEngine.js, services/runtimeScriptureContinuityDevotionalEngine.js, services/runtimeScriptureContinuityMemoryCompanion.js, services/runtimeScriptureContinuityMentorEngine.js, services/runtimeYouthDiscipleshipContinuityEngine.js, services/runtimeYouthDiscipleshipEngine.js
- services/runtimeCanonicalStudyGenerator.js — callers: services/runtimeCanonicalMultiDayStudyPlanner.js, services/runtimeDynamicStudySessionEngine.js
- services/runtimeCanonicalTopicExpansionAI.js — callers: services/runtimeScriptureContinuityReasoningAI.js, services/runtimeScriptureJourneyRecommendationEngine.js
- services/runtimeCanonicalVerseEmbeddingSystem.js — callers: services/runtimeCanonicalSemanticRetrievalEngine.js
- services/runtimeCanonicalWisdomDiscernmentLayer.js — callers: services/runtimeCanonicalBiblicalDecisionEngine.js, services/runtimeCanonicalChurchLeadershipFormationEngine.js, services/runtimeCanonicalFamilyDiscipleshipEngine.js, services/runtimeCanonicalKingdomEthicsEngine.js, services/runtimeCanonicalPeacemakingReconciliationEngine.js, services/runtimeCanonicalSpiritualFormationEngine.js, services/runtimeCanonicalSpiritualWarfareDiscernmentEngine.js, services/runtimeCanonicalWisdomLiteratureEngine.js, services/runtimeKingdomCallingAlignmentEngine.js, services/runtimeKingdomStewardshipFormationEngine.js, services/runtimeScriptureContinuityApologeticsEngine.js, services/runtimeScriptureContinuityPrayerEngine.js, services/runtimeYouthDiscipleshipContinuityEngine.js
- services/runtimeCanonicalWisdomLiteratureEngine.js — callers: services/runtimeCanonicalCreationStewardshipEngine.js, services/runtimeCanonicalKingdomEthicsEngine.js
- services/runtimeContinuityOrchestrator.js — callers: services/structuredCompanionRuntime.js
- services/runtimeContinuityRankingEngine.js — callers: services/runtimeCanonicalTopicExpansionAI.js
- services/runtimeDynamicCovenantSymmetryMapper.js — callers: services/runtimeDynamicPropheticCorrespondenceAI.js
- services/runtimeDynamicDoctrineLineageMapper.js — callers: services/runtimeDynamicCovenantSymmetryMapper.js, services/runtimeDynamicRevelationCompletionMapper.js
- services/runtimeDynamicRevelationCompletionMapper.js — callers: services/runtimeCanonicalRevelationRestorationEngine.js, services/runtimeEternalKingdomContinuityEngine.js, services/runtimeResurrectionContinuityEngine.js, services/runtimeScriptureContinuityInsightGenerator.js
- services/runtimeEmotionalContinuityEngine.js — callers: services/runtimeContextualScriptureSuggestionEngine.js
- services/runtimeEternalKingdomContinuityEngine.js — callers: services/runtimeKingdomInheritanceContinuityEngine.js, services/runtimeResurrectionContinuityEngine.js
- services/runtimeGenesisToRevelationTraversalEngine.js — callers: services/runtimeCanonicalStudyGenerator.js, services/runtimeScriptureContinuityContextEngine.js, services/runtimeScriptureIntegrityChecker.js
- services/runtimeKingdomCallingAlignmentEngine.js — callers: services/runtimeKingdomCreativityPurposeEngine.js, services/runtimeKingdomServiceOpportunityAlignmentEngine.js
- services/runtimeKingdomCreativityPurposeEngine.js — callers: services/runtimeScriptureContinuityWorshipArtsEngine.js
- services/runtimeKingdomLeadershipTrainingEngine.js — callers: services/runtimeCanonicalKingdomEducationPathwayEngine.js, services/runtimeCanonicalMinistryOperationsEngine.js
- services/runtimeKingdomOutreachCoordinationEngine.js — callers: services/runtimeScriptureContinuityGlobalMissionsEngine.js
- services/runtimeKingdomStewardshipFormationEngine.js — callers: services/runtimeCanonicalCreationStewardshipEngine.js
- services/runtimeMemoryBridge.js — callers: services/structuredCompanionRuntime.js
- services/runtimeNaturalConversationRenderer.js — callers: services/runtimeAdaptiveConversationEngine.js
- services/runtimePropheticFulfillmentResolver.js — callers: services/runtimeDynamicDoctrineLineageMapper.js, services/runtimeDynamicPropheticExpansionEngine.js
- services/runtimeReplayQA.js — callers: services/runtimeMemoryBridge.js
- services/runtimeResurrectionContinuityEngine.js — callers: services/runtimeKingdomInheritanceContinuityEngine.js
- services/runtimeRevelationCompletionEngine.js — callers: services/runtimeDynamicRevelationCompletionMapper.js
- services/runtimeScriptureChainMemory.js — callers: services/runtimeCanonicalStudyFlow.js
- services/runtimeScriptureContinuityContextEngine.js — callers: services/runtimeCanonicalSemanticRetrievalEngine.js
- services/runtimeScriptureContinuityConversationEngine.js — callers: services/runtimeCanonicalFellowshipCommunityEngine.js, services/runtimeScriptureContinuityMemoryCompanion.js, services/runtimeScriptureContinuityTeachingAI.js
- services/runtimeScriptureContinuityCounselingEngine.js — callers: services/runtimeCanonicalPeacemakingReconciliationEngine.js
- services/runtimeScriptureContinuityDevotionalEngine.js — callers: services/runtimeCanonicalKingdomEducationPathwayEngine.js, services/runtimeCanonicalScriptureMemorizationEngine.js, services/runtimeYouthDiscipleshipContinuityEngine.js, services/runtimeYouthDiscipleshipEngine.js
- services/runtimeScriptureContinuityHistoricalEngine.js — callers: services/runtimeCanonicalHistoricalTimelineEngine.js, services/runtimeScriptureContinuityPatternRecognitionAI.js
- services/runtimeScriptureContinuityInsightGenerator.js — callers: services/runtimeCanonicalAISermonFlowEngine.js, services/runtimeCanonicalBiblicalDecisionEngine.js, services/runtimeCanonicalBiblicalLanguageContinuityEngine.js, services/runtimeCanonicalCovenantTimelineEngine.js, services/runtimeCanonicalMediaTeachingGenerationEngine.js, services/runtimeCanonicalRevelationRestorationEngine.js, services/runtimeCanonicalScriptureMemorizationEngine.js, services/runtimeCanonicalWisdomLiteratureEngine.js, services/runtimeScriptureContinuityPatternRecognitionAI.js
- services/runtimeScriptureContinuityMemoryCompanion.js — callers: services/runtimeCanonicalPrayerJournalEngine.js, services/runtimeKingdomDiscipleshipAnalyticsEngine.js
- services/runtimeScriptureContinuityMentorEngine.js — callers: services/runtimeKingdomDiscipleshipAnalyticsEngine.js, services/runtimeKingdomLeadershipTrainingEngine.js
- services/runtimeScriptureContinuityMissionEngine.js — callers: services/runtimeCanonicalBiblicalHospitalityEngine.js, services/runtimeCanonicalJusticeMercyEngine.js, services/runtimeKingdomCallingAlignmentEngine.js, services/runtimeKingdomOutreachCoordinationEngine.js, services/runtimeKingdomServiceOpportunityAlignmentEngine.js, services/runtimeScriptureContinuityGlobalMissionsEngine.js
- services/runtimeScriptureContinuityPatternRecognitionAI.js — callers: services/runtimeDynamicCovenantSymmetryMapper.js, services/runtimeDynamicPropheticCorrespondenceAI.js
- services/runtimeScriptureContinuityPrayerEngine.js — callers: services/runtimeCanonicalEndurancePerseveranceEngine.js, services/runtimeCanonicalPrayerJournalEngine.js, services/runtimeCanonicalRevivalAwakeningPrayerEngine.js, services/runtimeScriptureContinuityDevotionalEngine.js
- services/runtimeScriptureContinuityWorshipArtsEngine.js — callers: services/runtimeKingdomMediaDistributionEngine.js
- services/runtimeScriptureIntegrityChecker.js — callers: services/runtimeCanonicalContinuityReinforcementAI.js, services/runtimeCanonicalContradictionDetectionEngine.js, services/runtimeCanonicalStudyGenerator.js
- services/runtimeScriptureJourneyRecommendationEngine.js — callers: services/runtimeCanonicalMultiDayStudyPlanner.js, services/runtimeScriptureContinuityTeachingAI.js
- services/runtimeScripturePathResolver.js — callers: services/runtimeContinuityRankingEngine.js, services/runtimeDynamicDoctrineLineageMapper.js
- services/runtimeScriptureRelationshipMapper.js — callers: services/runtimeCanonicalKnowledgeGraphExpansionLayer.js, services/runtimeCanonicalTopicExpansionAI.js
- services/runtimeVisualKingdomKnowledgeGraphEngine.js — callers: services/runtimeCanonicalCovenantTimelineEngine.js, services/runtimeCanonicalMediaTeachingGenerationEngine.js
- services/scriptureConfidenceRuntime.js — callers: services/structuredCompanionRuntime.js
- services/scriptureHistoryProvenanceRuntime.js — callers: services/runtimeMemoryBridge.js
- services/scriptureOnlyRuntime.js — callers: services/structuredCompanionRuntime.js
- services/scriptureThemeRetrievalRuntime.js — callers: services/runtimeContinuityOrchestrator.js
- services/shadowReasonFirstRuntime.js — callers: scripts/shadowRuntimeComparison.js
- services/structuredCompanionRuntime.js — callers: services/runtimeButtonContinuityRouter.js
- services/studyClarificationRuntime.js — callers: services/runtimeContinuityOrchestrator.js

## Important limitation

This is a static CommonJS/ES-module ownership map. Dynamic imports, runtime string-based loading, environment-gated paths, and reflection must be verified through execution traces before deletion.
