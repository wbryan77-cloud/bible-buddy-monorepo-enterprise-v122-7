# BibleBuddy Conversation Architecture Audit

Generated: Mon Jun 22 16:41:37 PDT 2026


## Git / Deploy State
```
a01deb4dba76dc9d153fa9a32109da0e985722ea
 M Phase4FCombinedStabilityRegressionReport.md
 M Phase4HDoctrineParityRegressionReport.md
 M Phase4HMemoryStressTestReport.md
 M Phase4MCompanionRoutingRegressionReport.md
 M Phase5ABibleCompanionOrchestrationRegressionReport.md
 M admin/index.html
 M docs/bible-learning/approved-doctrine-registry.json
 M docs/companion-intelligence/validation-results.json
 M docs/regression-trace/deploy-parity-verification.json
 M docs/regression-trace/emergency-hard-cutover-root-cause-results.json
 M docs/regression-trace/phase4m-companion-routing-results.json
 M docs/sprint214b/sabbath-history-depth-results.json
 M docs/sprint214c/natural-reasoning-results.json
 M docs/sprint214d/active-conversation-results.json
 M docs/sprint2final/master-runtime-results.json
 M package-lock.json
 M package.json
 M project-brain/providers.json
 M routes/buddy.js
 M services/approvedCatalogEvidence.js
 M services/bibleConceptGraph.js
 M services/bibleReasoningEngine.js
 M services/bibleWideReasoningEngine.js
 M services/buddyRuntimeConfig.js
 M services/claimToScriptureValidator.js
 M services/companionIntelligence.js
 M services/companionStateEngine.js
 M services/doctrineConversationState.js
 M services/doctrineErrorFirewall.js
 M services/doctrineFinalAuthorityEngine.js
 M services/doctrineLivePathHandlers.js
 M services/doctrineTopicDetector.js
 M services/evidenceCards/deathState.card.js
 M services/evidenceCards/index.js
 M services/evidenceCards/sabbath.card.js
 M services/healthCompanionResponse.js
 M services/liveRequestTrace.js
 M services/masterBuddyRuntime.js
 M services/reasonFirstComposer.js
 M services/retrievalEvidencePack.js
 M services/routeOwnershipTable.js
 M services/sabbathHistoryDeepResponder.js
?? .github/
?? AdminCommandCenterReport.md
?? AdminCommandCenterVerificationReport.md
?? AdminNotificationPlan.md
?? AdminPriorityRanking.md
?? AdminReviewMemoryReport.md
?? AdminReviewPackage.md
?? AdminReviewSimplificationReport.md
?? AdminWorkflowConsolidationReport.md
?? AffirmationCoverageReport.md
?? AnswerVerifierDependencyAudit.md
?? AnswerVerifierResolutionReport.md
?? ApprovedSupportGraphReport.md
?? ArchitectureRollbackAnalysis.md
?? AuthorityArchitectureComparison.md
?? AuthorityOrderScorecard.md
?? AuthorityScorecard.md
?? Batch4CandidatePacket.md
?? Batch4ImplementationPreparation.md
?? Batch4SimpleCandidatePacket.md
?? BetaBaselineStabilizationPlan.md
?? BetaCommitReadinessReport.md
?? BetaReadinessRootCauseAudit.md
?? BibleAuthorityEngineArchitectureDecision.md
?? BibleAuthorityEngineImplementationRecommendation.md
?? BibleAuthorityEnginePhase1AImplementationReport.md
?? BibleAuthorityEnginePhase1Design.md
?? BibleAuthorityEnginePhase2AReport.md
?? BibleAuthorityEnginePhase2BReport.md
?? BibleAuthorityEngineRootCausePlan.md
?? BibleAuthorityEngineStrategicRecommendation.md
?? BibleAuthorityGapMatrix.md
?? BibleAuthorityImplementationPreparation.md
?? BibleAuthorityImplementationReadiness.md
?? BibleAuthorityPhase1AValidationReport.md
?? BibleAuthorityPhase1BMeasurementReport.md
?? BibleAuthorityPhase1BReport.md
?? BibleAuthorityPhase2CCoverageGapReport.md
?? BibleAuthorityPhase2DReport.md
?? BibleAuthorityPhase2EReport.md
?? BibleAuthorityPhase2FReport.md
?? BibleAuthorityPhase2HReport.md
?? BibleAuthorityPhase2IFullStressReport.md
?? BibleAuthorityPhase2JDReport.md
?? BibleAuthorityPhase2JEReport.md
?? BibleAuthorityPhase2JFReport.md
?? BibleAuthorityPhase2JGReport.md
?? BibleAuthorityPhase2JHReport.md
?? BibleAuthorityPhase2JIReport.md
?? BibleAuthorityPhase2JJReport.md
?? BibleAuthorityPhase2JKReport.md
?? BibleAuthorityPhase2JLReport.md
?? BibleAuthorityPhase2JMPlusReport.md
?? BibleAuthorityPhase2JNReport.md
?? BibleAuthorityPhase2JOReport.md
?? BibleAuthorityPhase2JPReport.md
?? BibleAuthorityPhase2JQReport.md
?? BibleAuthorityPhase2KReport.md
?? BibleAuthorityPhase2LReport.md
?? BibleAuthorityPhase2MReport.md
?? BibleAuthorityPhase2NReport.md
?? BibleAuthorityPhase2OReport.md
?? BibleAuthorityPhase2PReport.md
?? BibleAuthorityPhase2QReport.md
?? BibleAuthorityPhase2RReport.md
?? BibleAuthorityPhase3AReport.md
?? BibleAuthorityPhase3BReport.md
?? BibleAuthorityPhase3CReport.md
?? BibleAuthorityPhase3DReport.md
?? BibleAuthorityPhase3EReport.md
?? BibleAuthorityPhase3FReport.md
?? BibleAuthorityPhase3GReport.md
?? BibleAuthorityPhase3IReport.md
?? BibleAuthorityPhase3JReport.md
?? BibleAuthorityPhase3KReport.md
?? BibleAuthorityPhase3LReport.md
?? BibleAuthorityPhase3MReport.md
?? BibleAuthorityPhase3NReport.md
?? BibleAuthorityPhase3OReport.md
?? BibleAuthorityPhase3PReport.md
?? BibleAuthorityPhase3QReport.md
?? BibleAuthorityPhase3RReport.md
?? BibleAuthorityPhase3SReport.md
?? BibleAuthorityPhase3TReport.md
?? BibleAuthorityPhase3UReport.md
?? BibleAuthorityPhase3VReport.md
?? BibleAuthorityPhase3W2Report.md
?? BibleAuthorityPhase3WReport.md
?? BibleAuthorityPhase4A3Report.md
?? BibleAuthorityPhase4A4Report.md
?? BibleAuthorityPhase4AReport.md
?? BibleAuthorityPhase4BReport.md
?? BibleAuthorityReadinessScoreV2.md
?? BibleAuthorityReadinessScoreV3.md
?? BibleAuthorityReadinessScoreV4.md
?? BibleAuthorityReadinessScoreV5.md
?? BibleAuthorityRoadmap.md
?? BibleAuthoritySimplificationResetReport.md
?? BibleAuthorityTraceabilityAudit.md
?? BibleBuddyLiteComparisonReport.md
?? BibleBuddyOpenAIExecutionTrace.md
?? BibleBuddyReasonFirstArchitecture.md
?? BibleLearningArchitectureAudit.md
?? BibleLearningAssetInventory.md
?? BibleLearningEngineImplementationRecommendation.md
?? BibleLearningEnginePlan.md
?? BibleWideDoctrinePackDiscovery.md
?? BibleWideScriptureEnrichmentReport.md
?? BibleWideTopicMap.md
?? BottomLineNecessityAudit.md
?? BulkReviewAccelerationDashboard.md
?? BulkSourceInventory.md
?? CampChurchRecovery.md
?? CampLessonTitleNormalization.md
?? CandidatePromotionWorkflow.md
?? CandidateReviewDashboard.md
?? CandidateReviewSafetyReport.md
?? CandidateScoreValidation.md
?? ClaimAuthorityComparison.md
?? ClaimExtractionAccuracyReport.md
?? ClaimExtractionFailureAudit.md
?? ClaimExtractionFeasibilityReport.md
?? ClaimExtractorImplementationReport.md
?? ClaimGenerationRootCause.md
?? ClaimGenerationScorecard.md
?? ClaimInferenceAudit.md
?? ClaimOwnershipAnalysis.md
?? ClaimOwnershipRecommendation.md
?? ClaimSupportAccuracyReport.md
?? ClaimSupportDeltaReport.md
?? ClaimTraceabilityMatrix.md
?? ClaimTraceabilityMatrixV2.md
?? ClaimsPipelineVerification.md
?? ClassCClaimInventory.md
?? ClassCClaimInventoryV2.md
?? ClassCClusterAnalysis.md
?? ClassCFixPrioritization.md
?? ClassCFrequencyRanking.md
?? ClaudeReadOnlyReviewPhase3Q.md
?? ClaudeReviewAudit.md
?? ClaudeSourceRecoveryAudit.md
?? ClaudeYouTubeReadOnlyScrub.md
?? ClaudeYouTubeSourceWorkerReport.md
?? CompanionOperatingModelExperimentReport.md
?? CompanionTurnIntentImplementationReport.md
?? CompanionUIDivergenceReport.md
?? ComplexityDebtAudit.md
?? ComposerEmotionalCenterForensicAudit.md
?? ComposerForensicAudit.md
?? ComposerObjectiveConflictAudit.md
?? ComposerPromptAudit.md
?? ContentExtractionFailureAudit.md
?? ContentExtractionImplementationQueues.md
?? ContentExtractionScriptureRanking.md
?? ContentExtractionTargetReport.md
?? ContinuityScriptureAudit.md
?? ContradictionLogicResetReport.md
?? ConversationArchitectureAudit_20260622_164137.md
?? ConversationExperimentReport.md
?? ConversationShapeAudit.md
?? ConversationStressDataset.md
?? ConversationTraceMatrix.md
?? CoreRestorationReport.md
?? CorpusCompletionAudit.md
?? CorpusExpansionGenesisRevelationReport.md
?? CorpusExpansionImpactReport.md
?? CorpusExpansionQuestionInventory.md
?? CorpusExpansionScriptureInventory.md
?? CorpusExpansionSourceInventory.md
?? CorpusExpansionSupportRanking.md
?? CovenantAndKingdomRecovery.md
?? CoverageCorrelationReport.md
?? CoverageImpactMatrix.md
?? CoverageReadinessProjection.md
?? CurrentRuntimeBaselineReport.md
?? CursorRecoveredSourceOrganizationV2.md
?? DeathResurrectionCoverageReport.md
?? DeepScriptureExpansion.md
?? DiscoveryClusteringAudit.md
?? DiscoveryCoverageAudit.md
?? DiscoveryExpansionReadiness.md
?? DiscoveryExtractionAudit.md
?? DiscoveryQualityReport.md
?? DiscoverySupportRanking.md
?? DoctrineAuthorityFailureMatrix.md
?? DoctrineAuthorityReadinessScore.md
?? DoctrineConclusionDerivationReport.md
?? DoctrineMetadataReadinessScore.md
?? DoctrineOwnershipVerification.md
?? DoctrinePackEnrichmentReport.md
?? DoctrinePackHumanReviewPackets.md
?? DoctrinePackMissingLinksReport.md
?? DoctrinePipelineFailureLocation.md
?? DoctrinePipelineVerdict.md
?? DuplicateCompressionAudit.md
?? DuplicateReductionReport.md
?? EmotionalCenterPreservationPlan.md
?? EmotionalCenterPreservationReport.md
?? EmptyReplyRootCauseReport.md
?? EndToEndDoctrineTurnTrace.md
?? EngineeringHealthSnapshot.md
?? EngineeringHealthSnapshotV2.md
?? EngineeringHealthSnapshotV3.md
?? EngineeringIntelligenceReport.md
?? EngineeringStabilityAfterPhase2K.md
?? EnvironmentParityReport.md
?? EsauEdomDoctrinePack.md
?? EvidenceCoverageReadinessScore.md
?? EvidenceGapRanking.md
?? ExecutiveGrowthDashboardReport.md
?? ExecutiveGrowthDashboardV2.md
?? ExecutiveGrowthDashboardV3.md
?? ExecutiveGrowthSnapshot.md
?? ExecutiveGrowthUpdate.md
?? ExecutiveValidationSummary.md
?? ExpandedChainScriptureSupportReport.md
?? ExpandedContinuityScriptures.md
?? ExpandedCorpusRanking.md
?? ExpandedDiscoverySourceInventory.md
?? ExpandedGenesisToRevelationChains.md
?? ExpandedImplementationPreparationQueue.md
?? ExpandedImplementationQueues.md
?? ExpandedOpenTopicDiscoveryReport.md
?? ExpandedParallelScriptures.md
?? ExpandedParallelSupportingContinuityReport.md
?? ExpandedQuestionInventory.md
?? ExpandedScriptureChainBuildReport.md
?? ExpandedScriptureChainInventory.md
?? ExpandedSourceFetchReport.md
?? ExpandedSupportingScriptures.md
?? ExternalBibleTeachingIngestionPlan.md
?? ExternalTeachingCandidatePipelineReport.md
?? FacebookManualDescriptionQueue.md
?? FacebookManualPasteWorkflow.md
?? FacebookSourceRecovery.md
?? FeastCoverageVerification.md
?? FeastDayDoctrinePacks.md
?? FeastDoctrineVerification.md
?? FeastGapStrengtheningReport.md
?? FeastsHighSabbathsDeepPack.md
?? FinalDoctrineGapReport.md
?? FinalImplementationReadinessReport.md
?? FinalProseAuthorshipInventory.md
?? FinalResponseOwnershipAudit.md
?? FirstApprovalBatchPromotionPlan.md
?? FirstApprovalBatchRegressionReport.md
?? FirstApprovalBatchSelection.md
?? FirstApprovalBatchStagingReport.md
?? FirstBatchEffectivenessReport.md
?? FirstImplementationRollbackPlan.md
?? FirstScriptureImplementationReport.md
?? FlowRegressionAudit.md
?? FrontendExecutionTraceReport.md
?? FullCampSourceInventory.md
?? FullCorpusGapReport.md
?? FullCorpusImplementationQueues.md
?? FullCorpusRescrubReport.md
?? FullCorpusScriptureRanking.md
?? FullDoctrinePackExpansion.md
?? FullGenesisToRevelationMaturityReport.md
?? FullParallelSupportingScriptureExpansion.md
?? FullQuestionInventory.md
?? FullRegressionRootCauseReport.md
?? FullScriptureChainInventory.md
?? FullScriptureWitnessExpansionReport.md
?? FullSourceProcessingReport.md
?? GapItemRecoveryReport.md
?? GenesisRevelationCoverageAudit.md
?? GenesisRevelationDiscoverySafetyReport.md
?? GenesisToRevelationExpansionReport.md
?? GenesisToRevelationExpansionV2.md
?? GenesisToRevelationExpansionWorkspace.md
?? GenesisToRevelationVerificationReport.md
?? GlobalReconciliationReport.md
?? GoldenCompanionExamplesReport.md
?? GreenCandidates.md
?? HighPriorityRecoveredPackReport.md
?? HolyCardApprovalReport.md
?? HolyEvidenceCardRecommendation.md
?? HolyGapAnalysis.md
?? HolySpiritDeepPack.md
?? HolySpiritDoctrinePack.md
?? HolySpiritSourceExpansion.md
?? HolySpiritVerification.md
?? HumanBetaEnablementPlan.md
?? HumanBetaTestingInventoryAudit.md
?? HumanConversationGapReport.md
?? HumanReviewTopicPackets.md
?? ICOJDocumentationOrganization.md
?? ICOJPDFExtractionReview.md
?? ICOJPDFHumanReviewPipeline.md
?? IOGIngestionPilotPlan.md
?? IOGIngestionPreparationPlan.md
?? ImplementationImpactAnalysis.md
?? ImplementationPreparationQueue.md
?? ImplementationReadinessAudit.md
?? ImplementationReadinessByTopic.md
?? ImplementationReadinessReport.md
?? ImplementationTrendReport.md
?? ImplementationValueReport.md
?? Isaiah58SupportCoverageReport.md
?? IssueDetectionReport.md
?? JacobIsraelLineageDeepPack.md
?? JacobIsraelTwelveTribesPack.md
?? JesusOTNTDeepPack.md
?? JesusOTNTSourceExpansion.md
?? JesusOTNTVerification.md
?? JesusOldTestamentNewTestamentPack.md
?? JsonEncodingAudit.md
?? JsonModeComplianceAudit.md
?? JsonModeFailurePaths.md
?? LedgerIntegrationReport.md
?? LedgerValidationReport.md
?? LessonTitleCoverageAudit.md
?? Listening75GapAnalysis.md
?? Listening75RefinementPlan.md
?? ListeningScoreAudit.md
?? ListeningSuccessCorrelationAudit.md
?? LivePostImplementationStressReport.md
?? LiveResponseCaptureReport.md
?? LiveRouteOwnershipInvestigation.md
?? LiveRuntimeVerificationReport.md
?? LiveValidationReport.md
?? LogosCoverageReport.md
?? LogosDoctrineTrace.md
?? MasterGenesisToRevelationExpansion.md
?? MasterQuestionInventory.md
?? MasterScriptureChainInventory.md
?? MasterScriptureRanking.md
?? MasterScriptureTopicPacks.md
?? MasterSourceInventory.md
?? MasterTopicPackInventory.md
?? MasterTopicPackRanking.md
?? MasterTopicPackReport.md
?? MetaQuestionAnswerVerificationReport.md
?? MillennialKingdomDeepPack.md
?? MillennialKingdomDoctrinePack.md
?? MissingDoctrinePackRecoveryReport.md
?? MissingEntryResolutionV2.md
?? MissingSourceExtractionPlan.md
?? MissingStageReport.md
?? MissingTopicAudit.md
?? MissingTopicSourceRecovery.md
?? MissingTopicWatchlist.md
?? ModelAuthorityLeakReport.md
?? NaturalLanguageResearchPlan.md
?? NextBatchCandidateReviewPackage.md
?? NextBatchCandidateReviewPacket.md
?? NextBatchDecisionTemplateReport.md
?? OneHundredFortyFourThousandDeepPack.md
?? OneHundredFortyFourThousandPack.md
?? OpenAIBypassInventory.md
?? OpenAICallFlowMap.md
?? OpenAIClientTraceReport.md
?? OpenAIExecutionDecisionTree.md
?? OpenAIExecutionStabilityAudit.md
?? OpenAIFalsePathInventory.md
?? OpenAIFirstRestorationPlan.md
?? OpenAIFirstRestorationReport.md
?? OpenAIFirstRuntimeCompletenessReport.md
?? OpenAIFirstRuntimeDependencyReport.md
?? OpenAIJsonRequirementGapReport.md
?? OpenTopicDiscoveryReport.md
?? OpeningSentenceAttributionAudit.md
?? OwnershipCleanupImplementationReport.md
?? PDFSourceRecovery.md
?? ParallelScriptureAnalysis.md
?? ParallelScriptureAudit.md
?? ParallelScriptureExpansionReport.md
?? PathTo7Point5.md
?? PdfHandoutExtractionReport.md
?? PeopleStudyRecovery.md
?? PersonFirstCompositionAudit.md
?? PersonFirstReflectImplementationReport.md
?? PeterApostleDoctrinePack.md
?? PeterPaulAlignmentPack.md
?? Phase1BMeasurementRepairReport.md
?? Phase1BetaImplementationReport.md
?? Phase2GRecommendation.md
?? Phase3FinalGoNoGoRecommendation.md
?? Phase3GoNoGoRecommendation.md
?? Phase3QCoverageUpdate.md
?? Phase3QHumanReviewPackets.md
?? Phase3SCoverageUpdate.md
?? Phase3SSourceMapAudit.md
?? Phase3ScriptureDiscoveryPreparation.md
?? Phase3TCoverageUpdate.md
?? Phase3UCoverageUpdate.md
?? Phase4A1ImpactReport.md
?? Phase4AAnswerTraceabilityReport.md
?? Phase4AFailureReport.md
?? Phase4ARelationshipSafetyReport.md
?? Phase4AResponseQualityReport.md
?? Phase4ASandboxSetupReport.md
?? Phase4AScriptureVineNavigationReport.md
?? Phase4BAuthorizationCertificate.md
?? Phase4BAuthorizationReport.md
?? Phase4BCandidateSafetyReport.md
?? Phase4BContinuityReport.md
?? Phase4BEntryReadiness.md
?? Phase4BHallucinationReport.md
?? Phase4BPreFlightReport.md
?? Phase4BRelationshipNavigationReport.md
?? Phase4BRetrievalIntegrityReport.md
?? Phase4BTestingCharter.md
?? Phase4BTraceabilityReport.md
?? Phase4BVineNavigationReport.md
?? Phase4BWitnessValidationReport.md
?? Phase4C1DoctrineStrictRegressionReport.md
?? Phase4C1EvidenceSourceAudit.md
?? Phase4C1RenderRuntimeStabilityAudit.md
?? Phase4D1WitnessInventoryRegressionReport.md
?? Phase4D2LiveCompanionPathRegressionReport.md
?? Phase4D2LivePathWiringAudit.md
?? Phase4D3LiveCompanionRealPathRegressionReport.md
?? Phase4D3LiveLeakAudit.md
?? Phase4JDeploymentParityAudit.md
?? Phase4JHealthEndpointAudit.md
?? Phase4JMemoryForensicsReport.md
?? Phase4JRenderOOMTrace.md
?? Phase4JRootCauseRanking.md
?? Phase4JScalingRiskReport.md
?? Phase4K1RetrievalEvidenceParityAudit.md
?? Phase4KCommitReadinessDecision.md
?? Phase4KFinalLocalRegressionReport.md
?? Phase4KFinalSafetyAssessment.md
?? Phase4KForbiddenFileCheck.md
?? Phase4KPackageRiskReview.md
?? Phase4KPostDeployCommandSheet.md
?? Phase4KPushDeployReadinessDecision.md
?? Phase4KStagedRuntimePackageReport.md
?? Phase4KStagedSecretScanReport.md
?? Phase4L2DoctrineAnswerTraceAudit.md
?? Phase4LClaimSubsystemAudit.md
?? Phase4NResponseClarityAudit.md
?? Phase4NResponseClarityRegressionReport.md
?? Phase4OBibleWideReasoningAudit.md
?? Phase4OBibleWideReasoningRegressionReport.md
?? Phase5BHardCutoverReport.md
?? Phase5BLiveHttpRegressionReport.md
?? Phase5BLiveRouteTraceReport.md
?? Phase5CModuleManifestAudit.json
?? Phase5CProductionFallbackRootCauseReport.md
?? Phase5EBibleNaturalConcordanceAssetAudit.md
?? Phase5EBibleNaturalConcordanceAudit.md
?? Phase5EBibleNaturalConcordanceCoverageReport.md
?? Phase5EBibleNaturalConcordanceRegressionReport.md
?? Phase5EFalseDoctrineSafetyReport.md
?? Phase5FMemoryArchitectureReport.md
?? Phase5FNoGlitchMemoryReasoningRegressionReport.md
?? Phase5FNoGlitchTurnContractAudit.md
?? Phase5FWordSenseSafetyReport.md
?? Phase5GCompanionRelationshipAudit.md
?? Phase5GCompanionRelationshipRegressionReport.md
?? Phase5GMemoryAndPracticalGuidanceReport.md
?? Phase5HCompanionIntentIntelligenceAudit.md
?? Phase5HCompanionIntentIntelligenceRegressionReport.md
?? Phase5HRelationshipMemoryReport.md
?? Phase5HTwoWitnessStandardReport.md
?? Phase5ICompanionMemoryReport.md
?? Phase5IRelationshipIntelligenceAudit.md
?? Phase5IRelationshipIntelligenceRegressionReport.md
?? Phase5IScriptureAnchoredResponsePlanReport.md
?? Phase5J100ConversationEvaluationReport.md
?? Phase5J1DeploymentIntegrityGateReport.md
?? Phase5J1FinalDeployReadiness.md
?? Phase5J1ModuleLoadAudit.md
?? Phase5J1RequiredFileManifest.md
?? Phase5J1StagingSafetyReport.md
?? Phase5JAlphaConversationCaptureReport.md
?? Phase5JAlphaIssueAggregationReport.md
?? Phase5JAlphaLoadSmokeReport.md
?? Phase5JAlphaNotificationReport.md
?? Phase5JAlphaTesterOnboardingReport.md
?? Phase5JAlphaTestingSystemAudit.md
?? Phase5KCompanionMaturityReport.md
?? Phase5KRelationshipDepthRegressionReport.md
?? Phase5KUISmokeReport.md
?? Phase5LFinalAlphaReadinessReport.md
?? Phase5LLiveThreadRegressionReport.md
?? Phase5LNoRegressionGateReport.md
?? Phase5LSafeStagingReport.md
?? Phase5M1DeployParityReport.md
?? Phase5M1KnownWorkingPathAudit.md
?? Phase5M1KnownWorkingPathRegressionReport.md
?? Phase5M1PathDiffReport.md
?? Phase5M2LiveRouteOwnershipReport.md
?? Phase5M3OldPhraseQuarantineReport.md
?? Phase5M3RegressionReport.md
?? Phase5M4DeployTruthCheckReport.md
?? Phase5M4LiveTruthRegressionReport.md
?? Phase5MDeployParityReport.md
?? Phase5MFinalControlledAlphaReadiness.md
?? Phase5MLastKnownGoodRecoveryRegressionReport.md
?? Post2HConversationTraceMatrix.md
?? PostCrashBibleBuddyRestorationPlan.md
?? PostGapCompletionCoverageReport.md
?? PostImplementationRegressionReport.md
?? PostOpenAICoreRestorationReport.md
?? PreceptDiscoveryDesign.md
?? PreceptDiscoveryReadinessReport.md
?? PriorityGapTargetReport.md
?? PriorityPackCoverageUpdate.md
?? PriorityPackSourceLinkageReport.md
?? PriorityPackStrengtheningReport.md
?? PriorityPackStructuredReviewPackets.md
?? PrioritySourceChainExtraction.md
?? ProductionParityReport.md
?? PromotionImpactAnalysis.md
?? PromotionPriorityReport.md
?? PromotionReadinessReport.md
?? PromotionReadinessScore.md
?? PromotionRegressionReport.md
?? PromptHierarchyConflictResolutionAudit.md
?? PromptHierarchyExperiment.md
?? PropheticDoctrineRecovery.md
?? PushVerificationReport.md
?? QuestionCoverageAudit.md
?? QuestionDepthAudit.md
?? QuestionDiscoveryInventory.md
?? QuestionRecoveryPool.md
?? RACLImpactAudit.md
?? RACLImplementationReport.md
?? RawConversationDifferentialAudit.md
?? RawOpenAIResponseAudit.md
?? RealDoctrineTurnTrace.md
?? ReasonFirstMigrationReport.md
?? ReasonFirstRestorationCheck.md
?? ReasonFirstSimplificationExperiment.md
?? ReasoningFirstCompanionRepairReport.md
?? ReasoningOwnershipMap.md
?? RecoveredDoctrineHumanReviewPackets.md
?? RecoveredDoctrinePackMaturation.md
?? RecoveredGenesisToRevelationStructure.md
?? RecoveredImplementationPreparation.md
?? RecoveredPackHumanReviewPacketsV2.md
?? RecoveredPackInputAudit.md
?? RecoveredPackMissingLinkFill.md
?? RecoveredPackReviewReadiness.md
?? RecoveredPreceptChainOrganization.md
?? RecoveredSourceOrganizationReport.md
?? RecoveredSourcePackLinkageV2.md
?? RecoveredSourceToPackLinkage.md
?? RecoveryConfidenceRanking.md
?? RecursiveSeedExpansionReport.md
?? RedCandidates.md
?? ReferenceNormalizationReport.md
?? RelationshipObjectiveAudit.md
?? ReleaseCandidateValidation.md
?? ReleaseCommitVerification.md
?? RemainingClassCPost2HReview.md
?? RemainingCoverageGapInventory.md
?? RemainingMissingEntryTriage.md
?? RemainingMissingSourceAudit.md
?? RenderDoctrineStressStabilityPlan.md
?? RenderMemoryCorrelationReport.md
?? RenderMemoryStabilityAudit.md
?? RenderMemoryStabilityNotes.md
?? RenderParityFixReport.md
?? RenderRestartRootCauseAudit.md
?? RenderStabilityStressReport.md
?? RenderStabilityVerification.md
?? RenderStabilityVerificationReport.md
?? RenderStressAfterBAEReport.md
?? ReplyOwnershipMatrix.md
?? ResearchImpactDashboard.md
?? ResearchParallelScriptures.md
?? ResponseOwnershipTraceReport.md
?? ResponseStructureRemovalExperiment.md
?? RestoredScriptureRanking.md
?? RetrievalLoopControlDecisionReport.md
?? RetrievalQualityAudit.md
?? ReviewRecommendationReport.md
?? ReviewSimplificationReport.md
?? RuntimeCallGraph.md
?? RuntimeMismatchDiagnosis.md
?? SabbathCoverageCompletionReport.md
?? SabbathCoverageReport.md
?? SchemaEnforcementAudit.md
?? ScriptureAuthorityAudit.md
?? ScriptureAuthorityCoverageReport.md
?? ScriptureAuthorityCoverageUpdate.md
?? ScriptureAuthorityLedger.md
?? ScriptureAuthorityReviewReport.md
?? ScriptureCandidateCrossCheckReport.md
?? ScriptureCandidatePrioritizationReport.md
?? ScriptureChainBuilder.md
?? ScriptureDiscoveryAdminDigestPlan.md
?? ScriptureDiscoveryAdminWorkflowPlan.md
?? ScriptureDiscoveryPilotReport.md
?? ScriptureDiscoveryQuestionInventory.md
?? ScriptureDiscoverySafetyReport.md
?? ScriptureDiscoverySourcePlan.md
?? ScriptureExtractionInventory.md
?? ScriptureImplementationEffectiveness.md
?? ScriptureImplementationFlowReport.md
?? ScriptureRecoveryReport.md
?? ScriptureReferenceNormalizationReport.md
?? ScriptureRelationshipGroups.md
?? ScriptureResearchReviewConsoleReport.md
?? ScriptureReviewSortingGuide.md
?? ScriptureScoreExplanationReport.md
?? ScriptureStrengthTierReport.md
?? ScriptureSupportRanking.md
?? ScriptureSupportRankingV2.md
?? SecondBatchEffectivenessReport.md
?? SecondBatchRegressionReport.md
?? SecondBatchRollbackPlan.md
?? SecondBatchStagingReport.md
?? ShadowRuntimeProofReport.md
?? SimpleSupportScoreReport.md
?? SimplifiedAdminReviewReport.md
?? SituationalResponseCalibrationAudit.md
?? SourceCoverageAudit.md
?? SourceCoverageRecoveryReport.md
?? SourceEffectivenessReport.md
?? SourceFailureAudit.md
?? SourceFirstTopicRecovery.md
?? SourceGapEliminationReport.md
?? SourceRecoveryHumanReviewPacketsV2.md
?? SourceToDoctrineCoverageAudit.md
?? SourceToPackLinkageRecovery.md
?? SpanishIOGRecoveryReport.md
?? SpanishIOGWorkflowV2.md
?? SpanishLessonLinkageReport.md
?? SpanishLessonRecovery.md
?? Sprint214BCPrePushVerification.md
?? Sprint214CompanionQualityReport.md
?? Sprint214DependencyReport.md
?? Sprint214FinalReadinessAudit.md
?? Sprint214LocationReport.md
?? Sprint214ReleaseCandidate.txt
?? Sprint214ReleaseInventory.md
?? SupportGraphCandidateQueuePlan.md
?? SupportGraphQualityReport.md
?? SupportGraphUsageReport.md
?? SupportRelationshipEngineReport.md
?? ThirdBatchCandidatePacket.md
?? ThirdBatchRegressionReport.md
?? ThirdBatchTopicPackApprovalReport.md
?? ThirdHeavenDoctrineTrace.md
?? ThirdImplementationPacket.md
?? ThirdScriptureImplementationReport.md
?? Top20CoverageGaps.md
?? TopRemainingListeningFailures.md
?? TopicApprovalPacks.md
?? TopicCollapseAudit.md
?? TopicCoverageDashboard.md
?? TopicExpansionCandidates.md
?? TopicMergeAnalysis.md
?? TopicPackConsolidationReport.md
?? TopicPackDuplicateReductionReport.md
?? TopicPackPrioritizationReport.md
?? TopicPackReviewDashboard.md
?? TopicPackScoringAudit.md
?? TopicPackSimplifiedReviewReport.md
?? TopicReviewBundles.md
?? TopicScriptureConsolidationReport.md
?? TranscriptProcessingReport.md
?? UIContractRepairPlan.md
?? UnknownTopicInventory.md
?? UpdatedHumanReviewPackets.md
?? ValidationRecoveryAudit.md
?? VideoDescriptionScriptureExtractionReport.md
?? VoiceResearchExpansionPlan.md
?? VoiceResearchPreparationPlan.md
?? WeakPackRecoveryAudit.md
?? WeakPackRecoveryExpansion.md
?? WeakPackStrengtheningReport.md
?? WebsiteHandoutScrubReport.md
?? WebsiteLessonExtractionReport.md
?? WitnessClassificationReport.md
?? YellowCandidates.md
?? YouTubeSourceRecovery.md
?? YouTubeTranscriptRecoveryReport.md
?? YouTubeTranscriptRecoveryV2.md
?? YouTubeVideoScrubReport.md
?? admin/beta-review.html
?? admin/bible-authority.html
?? admin/js/beta-review.js
?? admin/js/bible-authority.js
?? docs/baseline-experiment/
?? docs/bible-learning/bible-natural-concordance.generated.json
?? docs/bible-learning/concept-growth-candidates.json
?? docs/companion-conversation-experiment/
?? docs/companion-operating-model/
?? docs/companion-turn-intent/
?? docs/emotional-center-preservation/
?? docs/evidence-candidates/
?? docs/golden-companion-examples/
?? docs/precommit/
?? docs/prompt-hierarchy-experiment/
?? docs/racl/
?? docs/reason-first-lite-experiment/
?? docs/reason-first-migration/
?? docs/regression-trace/LiveAuthorityFailureDistribution.json
?? docs/regression-trace/OwnershipDamageRanking.json
?? docs/regression-trace/RootCauseDistribution.json
?? docs/regression-trace/bae-gap-audit.json
?? docs/regression-trace/bae-phase1a-results.json
?? docs/regression-trace/bae-phase1b-results.json
?? docs/regression-trace/claim-traceability-matrix-v2.json
?? docs/regression-trace/core-restoration-results.json
?? docs/regression-trace/e2e-doctrine-env-parity-audit.json
?? docs/regression-trace/empty-reply-trace-logos.json
?? docs/regression-trace/end-to-end-doctrine-turn-proof.json
?? docs/regression-trace/frontend-execution-simulate.json
?? docs/regression-trace/live-response-capture-run.json
?? docs/regression-trace/live-runtime-verification.json
?? docs/regression-trace/openai-first-completeness-audit.json
?? docs/regression-trace/openai-first-dependency-audit.json
?? docs/regression-trace/openai-first-results.json
?? docs/regression-trace/ownership-cleanup-results.json
?? docs/regression-trace/phase1-bible-learning-validation.json
?? docs/regression-trace/phase1c-claim-generation-compliance.json
?? docs/regression-trace/phase2a-claim-extractor-regression.json
?? docs/regression-trace/phase2b-support-relationship-regression.json
?? docs/regression-trace/phase2d-class-c-offline-replay.json
?? docs/regression-trace/phase2d-reference-normalization-audit.json
?? docs/regression-trace/phase2f-conversation-stress-results.json
?? docs/regression-trace/phase2g-class-c-inventory.json
?? docs/regression-trace/phase2h-regression-results.json
?? docs/regression-trace/phase2i-baseline-snapshot.json
?? docs/regression-trace/phase2i-conversation-stress-results.json
?? docs/regression-trace/phase2q-validation-results.json
?? docs/regression-trace/phase2r-implementation-value-results.json
?? docs/regression-trace/phase3a-corpus-rescrub-results.json
?? docs/regression-trace/phase3b-discovery-audit-results.json
?? docs/regression-trace/phase3c-discovery-depth-results.json
?? docs/regression-trace/phase3d-corpus-expansion-results.json
?? docs/regression-trace/phase3e-open-source-scrub-results.json
?? docs/regression-trace/phase3f-content-extraction-results.json
?? docs/regression-trace/phase3g-topic-pack-consolidation-results.json
?? docs/regression-trace/phase3i-recursive-expansion-results.json
?? docs/regression-trace/phase3j-doctrine-pack-maturation-results.json
?? docs/regression-trace/phase3k-missing-pack-recovery-results.json
?? docs/regression-trace/phase3l-recovered-pack-strengthening-results.json
?? docs/regression-trace/phase3m-source-doctrine-verification-results.json
?? docs/regression-trace/phase3n-source-gap-recovery-results.json
?? docs/regression-trace/phase3o-source-gap-completion-results.json
?? docs/regression-trace/phase3p-priority-pack-strengthening-results.json
?? docs/regression-trace/phase3q-weak-pack-deep-recovery-results.json
?? docs/regression-trace/phase3r-source-recovery-results.json
?? docs/regression-trace/phase3s-source-scrub-organization-results.json
?? docs/regression-trace/phase3t-source-worker-organization-results.json
?? docs/regression-trace/phase3u-normalization-linkage-results.json
?? docs/regression-trace/phase3v-relationship-intelligence-results.json
?? docs/regression-trace/phase3w-corpus-quality-results.json
?? docs/regression-trace/phase3w2-intelligence-validation-results.json
?? docs/regression-trace/phase3w3-corpus-freeze-results.json
?? docs/regression-trace/phase4g-parity-results.json
?? docs/regression-trace/phase4n-response-clarity-results.json
?? docs/regression-trace/phase4o-bible-wide-results.json
?? docs/regression-trace/phase5a-orchestration-results.json
?? docs/regression-trace/post-implementation-2k-results.json
?? docs/regression-trace/real-doctrine-turn-trace.json
?? docs/regression-trace/render-stability-verification.json
?? docs/regression-trace/response-ownership-trace.json
?? docs/regression-trace/scripture-authority-audit.json
?? docs/regression-trace/second-batch-regression-results.json
?? docs/regression-trace/simplification-reset-results.json
?? docs/regression-trace/third-batch-regression-results.json
?? docs/regression-trace/third-heaven-case-study.json
?? docs/regression-trace/trace-results.json
?? docs/regression-trace/ui-contract-reproduce-logos.json
?? docs/release-gate/
?? docs/response-structure-removal/
?? docs/shadow-runtime/
?? docs/sprint214/
?? docs/sprint2finalb/
?? docs/sprint2finalc/
?? public/beta.html
?? reports/
?? routes/beta.js
?? routes/bibleAuthorityAdmin.js
?? scripts/baeAuthorityGapAudit.js
?? scripts/baeClaimValidatorFixtures.js
?? scripts/baePhase1aRegression.js
?? scripts/baePhase1bLiveMeasurement.js
?? scripts/baePhase1bValidation.js
?? scripts/bibleBuddyLiteBaselineExperiment.js
?? scripts/companionConversationExperiment.js
?? scripts/companionOperatingModelExperiment.js
?? scripts/companionTurnIntentValidation.js
?? scripts/coreRestorationRegressionTest.js
?? scripts/doctrineAuthorityFailureProbe.js
?? scripts/e2eDoctrineProofAndEnvParity.js
?? scripts/emotionalCenterPreservationValidation.js
?? scripts/emptyReplyTrace.js
?? scripts/endToEndDoctrineTurnProof.js
?? scripts/evidenceTraceabilityAudit.js
?? scripts/exportBetaData.js
?? scripts/frontendExecutionSimulate.js
?? scripts/goldenCompanionExamplesValidation.js
?? scripts/ingestTeachingCandidatePilot.js
?? scripts/liveResponseCaptureRun.js
?? scripts/liveRuntimeVerification.js
?? scripts/openAiFirstCompletenessAudit.js
?? scripts/openAiFirstDependencyAudit.js
?? scripts/openAiFirstRegressionTest.js
?? scripts/ownershipAuditBattery.js
?? scripts/phase1BibleLearningValidation.js
?? scripts/phase1cClaimGenerationCompliance.js
?? scripts/phase2aClaimExtractorRegression.js
?? scripts/phase2aClaimExtractorUnitTest.js
?? scripts/phase2bSupportRelationshipRegression.js
?? scripts/phase2dClassCOfflineReplay.js
?? scripts/phase2dReferenceNormalizationAudit.js
?? scripts/phase2fConversationStressTest.js
?? scripts/phase2fGenerateReports.js
?? scripts/phase2gClassCAudit.js
?? scripts/phase2hGenerateReports.js
?? scripts/phase2hRegression.js
?? scripts/phase2iConversationStressTest.js
?? scripts/phase2iGenerateReports.js
?? scripts/phase2jAdminReviewPackage.js
?? scripts/phase2lLiveStressTest.js
?? scripts/phase2qLiveStressTest.js
?? scripts/postOpenAiCoreRestorationSmokeTest.js
?? scripts/promptHierarchyExperiment.js
?? scripts/raclValidation.js
?? scripts/realDoctrineTurnTraceRunner.js
?? scripts/reasonFirstLiteExperiment.js
?? scripts/reasonFirstMigration.js
?? scripts/renderParityFixVerify.js
?? scripts/renderStabilityVerification.js
?? scripts/responseOwnershipTraceAudit.js
?? scripts/responseStructureRemovalExperiment.js
?? scripts/runBibleAuthorityPhase2K.js
?? scripts/runBibleAuthorityPhase2L.js
?? scripts/runBibleAuthorityPhase2M.js
?? scripts/runBibleAuthorityPhase2N.js
?? scripts/runBibleAuthorityPhase2O.js
?? scripts/runBibleAuthorityPhase2P.js
?? scripts/runBibleAuthorityPhase2Q.js
?? scripts/runBibleAuthorityPhase2R.js
?? scripts/runBibleAuthorityPhase3A.js
?? scripts/runBibleAuthorityPhase3B.js
?? scripts/runBibleAuthorityPhase3C.js
?? scripts/runBibleAuthorityPhase3D.js
?? scripts/runBibleAuthorityPhase3E.js
?? scripts/runBibleAuthorityPhase3F.js
?? scripts/runBibleAuthorityPhase3G.js
?? scripts/runBibleAuthorityPhase3I.js
?? scripts/runBibleAuthorityPhase3J.js
?? scripts/runBibleAuthorityPhase3K.js
?? scripts/runBibleAuthorityPhase3L.js
?? scripts/runBibleAuthorityPhase3M.js
?? scripts/runBibleAuthorityPhase3N.js
?? scripts/runBibleAuthorityPhase3O.js
?? scripts/runBibleAuthorityPhase3P.js
?? scripts/runBibleAuthorityPhase3Q.js
?? scripts/runBibleAuthorityPhase3R.js
?? scripts/runBibleAuthorityPhase3S.js
?? scripts/runBibleAuthorityPhase3T.js
?? scripts/runBibleAuthorityPhase3U.js
?? scripts/runBibleAuthorityPhase3V.js
?? scripts/runBibleAuthorityPhase3W.js
?? scripts/runBibleAuthorityPhase3W2.js
?? scripts/runBibleAuthorityPhase3W3.js
?? scripts/runBibleAuthorityPhase4A.js
?? scripts/runBibleAuthorityPhase4A1.js
?? scripts/runBibleAuthorityPhase4A2.js
?? scripts/runBibleAuthorityPhase4A3.js
?? scripts/runBibleAuthorityPhase4A4.js
?? scripts/runBibleAuthorityPhase4AFinal.js
?? scripts/runBibleAuthorityPhase4B.js
?? scripts/runBibleAuthoritySimplificationReset.js
?? scripts/runBulkScriptureDiscovery.js
?? scripts/runConversationArchitectureAudit.sh
?? scripts/runCorpusCompletionAudit.js
?? scripts/runCorpusExpansionDiscovery.js
?? scripts/runCorpusGrowthReports.js
?? scripts/runDiscoveryCoverageAudit.js
?? scripts/runExpandedScriptureDiscovery.js
?? scripts/runFirstApprovalBatch.js
?? scripts/runPhase2jDPromotionWorkflow.js
?? scripts/runPhase4C1DoctrineStrictRegression.js
?? scripts/runPhase4D1WitnessInventoryRegression.js
?? scripts/runPhase4D2LiveCompanionPathRegression.js
?? scripts/runPhase4D3LiveCompanionRealPathRegression.js
?? scripts/runPhase4ELiveBrowserPathRegression.js
?? scripts/runPhase4NResponseClarityRegression.js
?? scripts/runPhase4OBibleWideReasoningRegression.js
?? scripts/runPhase5CModuleManifestAudit.js
?? scripts/runPhase5GCompanionRelationshipRegression.js
?? scripts/runPhase5M1DeployParityGate.js
?? scripts/runPhase5M2LiveRouteVerification.js
?? scripts/runQuestionScriptureRecovery.js
?? scripts/runReviewAccelerationLayer.js
?? scripts/runScriptureApprovalWorkflow.js
?? scripts/runScriptureDiscoveryGenesisRevelation.js
?? scripts/runScriptureDiscoveryPilot.js
?? scripts/runScriptureResearchReviewConsole.js
?? scripts/runScriptureResearchWorkspace.js
?? scripts/runScriptureStrengthReview.js
?? scripts/runWitnessQualityAudit.js
?? scripts/scriptureAuthorityAuditRunner.js
?? scripts/shadowRuntimeComparison.js
?? scripts/sprint214ProductionAcceptance.js
?? scripts/sprint2FinalBMetaQuestionHttp.js
?? scripts/sprint2FinalCReasoningFirstHttp.js
?? scripts/sprint2FinalReleaseGate.js
?? scripts/traceBuddyChatPath.js
?? scripts/traceLiveBuddyRoute.js
?? scripts/uiContractReproduce.js
?? services/answerMatchGate.js
?? services/betaRegistry.js
?? services/betaSessionReader.js
?? services/bibleAuthorityAdminCenter.js
?? services/bibleAuthoritySimplificationReset.js
?? services/bibleBuddyLiteRuntime.js
?? services/bibleWideTopicDiscovery.js
?? services/bulkScriptureDiscovery.js
?? services/candidatePromotionEngine.js
?? services/companionConversationBehavior.js
?? services/companionConversationExperimentRuntime.js
?? services/companionOperatingModelExperiment.js
?? services/companionPostureValidator.js
?? services/companionRetrievalHints.js
?? services/companionTurnIntent.js
?? services/conversationShapeAnalyzer.js
?? services/corpusCompletionAudit.js
?? services/corpusExpansionDiscovery.js
?? services/corpusGrowthReports.js
?? services/discoveryCoverageAudit.js
?? services/doctrineCompanionPath.js
?? services/evidenceCards/holiness.card.js
?? services/expandedScriptureDiscovery.js
?? services/firstApprovalBatch.js
?? services/firstScriptureImplementation.js
?? services/fullCorpusSourceRegistry.js
?? services/implementationValueScore.js
?? services/minimalReasonFirstRuntime.js
?? services/openSourceScrubber.js
?? services/phase2lLiveValidation.js
?? services/phase2mSecondBatch.js
?? services/phase2pTopicPackApproval.js
?? services/phase2qLiveValidation.js
?? services/phase2rImplementationValue.js
?? services/phase3aCorpusRescrub.js
?? services/phase3bDiscoveryAudit.js
?? services/phase3cDiscoveryDepthAudit.js
?? services/phase3dCorpusExpansion.js
?? services/phase3eOpenSourceScrub.js
?? services/phase3fContentExtraction.js
?? services/phase3fScriptureNormalizer.js
?? services/phase3gTopicPackConsolidation.js
?? services/phase3iRecursiveExpansion.js
?? services/phase3jDoctrinePackMaturation.js
?? services/phase3kMissingPackRecovery.js
?? services/phase3lRecoveredPackStrengthening.js
?? services/phase3mSourceDoctrineVerification.js
?? services/phase3nSourceGapRecovery.js
?? services/phase3oSourceGapCompletion.js
?? services/phase3pPriorityPackStrengthening.js
?? services/phase3qWeakPackDeepRecovery.js
?? services/phase3rSourceRecovery.js
?? services/phase3sSourceScrubOrganization.js
?? services/phase3tSourceWorkerOrganization.js
?? services/phase3uNormalizationLinkageGapClosure.js
?? services/phase3vRelationshipIntelligence.js
?? services/phase3w2IntelligenceValidation.js
?? services/phase3w3CorpusFreezePreparation.js
?? services/phase3wCorpusQualityAssurance.js
?? services/phase4a1PrimaryChainVineCompletion.js
?? services/phase4a2ClassificationGovernanceReview.js
?? services/phase4a3CorpusCertification.js
?? services/phase4a4GovernanceActivation.js
?? services/phase4aFinalHandoff.js
?? services/phase4bControlledEngineValidation.js
?? services/postImplementationRegression.js
?? services/questionScriptureRecovery.js
?? services/reasonFirstBuddyRuntime.js
?? services/reasonFirstLiteRuntime.js
?? services/reasonFirstTrace.js
?? services/replySourceClassifier.js
?? services/responseContract.js
?? services/responseStructureRemovalExperiment.js
?? services/reviewAccelerationLayer.js
?? services/sandboxBibleAuthorityEngine.js
?? services/sandboxBibleAuthorityRetriever.js
?? services/sandboxScriptureAnswerTester.js
?? services/scriptureApprovalWorkflow.js
?? services/scriptureAuthorityLedger.js
?? services/scriptureDiscoveryCrossReference.js
?? services/scriptureDiscoveryGenesisRevelation.js
?? services/scriptureDiscoveryPilot.js
?? services/scriptureRelationshipConsolidation.js
?? services/scriptureResearchReviewConsole.js
?? services/scriptureResearchWorkspace.js
?? services/scriptureStrengthReview.js
?? services/secondScriptureImplementation.js
?? services/shadowReasonFirstRuntime.js
?? services/supportGraphCandidateQueue.js
?? services/teachingCandidateCrossCheck.js
?? services/thirdScriptureImplementation.js
?? services/topicApprovalPacks.js
?? services/witnessQualityAudit.js
```

## All Intent / Human Need / Route Deciders
```
services/bibleReasoningEngine.js:const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
services/bibleReasoningEngine.js:const { detectSemanticConcept, shouldClearStaleTopic } = require('./bibleSemanticConceptNormalizer');
services/bibleReasoningEngine.js:const { planCompanionDoctrineRouting, buildRoutingContext } = require('./companionDoctrineRouter');
services/bibleReasoningEngine.js:  const routePlan = planCompanionDoctrineRouting({ userId, message, recentSessions, runtimeContext });
services/bibleReasoningEngine.js:    detectSemanticConcept(m, context) ||
services/bibleReasoningEngine.js:    detectStrictTopicFromMessage(m) ||
services/companionIntentIntelligence.js:const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
services/companionIntentIntelligence.js:function classifyCompanionIntent({ message = '', state = {}, concept = null } = {}) {
services/companionIntentIntelligence.js:  const conceptMatch = concept || detectSemanticConcept(m, state);
services/companionIntentIntelligence.js:  if (CONTINUATION_PHRASE_RE.test(m) && hasEstablishedTopic(state) && !detectSemanticConcept(m, state)) {
services/companionIntentIntelligence.js:  classifyCompanionIntent,
services/bibleWideReasoningEngine.js:const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
services/bibleWideReasoningEngine.js:  const semantic = detectSemanticConcept(message, context);
services/companionStateEngine.js:const { planCompanionDoctrineRouting, buildRoutingContext } = require('./companionDoctrineRouter');
services/companionStateEngine.js:const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
services/companionStateEngine.js:  const routePlan = planCompanionDoctrineRouting({ userId, message, recentSessions, runtimeContext });
services/companionStateEngine.js:  const concept = detectSemanticConcept(m, context) || detectConceptFromGraph(m);
services/openAiFirstCompanionRuntime.js:  planCompanionDoctrineRouting,
services/openAiFirstCompanionRuntime.js:const { detectHumanNeed } = require('./humanNeedDetector');
services/openAiFirstCompanionRuntime.js:const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
services/openAiFirstCompanionRuntime.js:  const conceptMatch = detectSemanticConcept(message, mergedState);
services/openAiFirstCompanionRuntime.js:    planCompanionDoctrineRouting({
services/strictDoctrineGate.js:  planCompanionDoctrineRouting,
services/strictDoctrineGate.js:    planCompanionDoctrineRouting({
services/strictDoctrineGate.js:    planCompanionDoctrineRouting({
services/strictDoctrineGate.js:    planCompanionDoctrineRouting({
services/doctrineLivePathHandlers.js:  classifyCurrentTurnIntent,
services/doctrineLivePathHandlers.js:  const intent = routePlan?.intent || classifyCurrentTurnIntent(effectiveMessage, routingContext);
services/companionDoctrineRouter.js:const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
services/companionDoctrineRouter.js:const { detectSemanticConcept, shouldClearStaleTopic } = require('./bibleSemanticConceptNormalizer');
services/companionDoctrineRouter.js:const { detectHumanNeed } = require('./humanNeedDetector');
services/companionDoctrineRouter.js:function classifyCurrentTurnIntent(message = '', context = {}) {
services/companionDoctrineRouter.js:  const semanticConcept = detectSemanticConcept(m, context);
services/companionDoctrineRouter.js:  const messageTopic = detectStrictTopicFromMessage(m);
services/companionDoctrineRouter.js:  const newTopic = detectStrictTopicFromMessage(m);
services/companionDoctrineRouter.js:  const intent = classifyCurrentTurnIntent(message, context);
services/companionDoctrineRouter.js:  const newTopic = detectStrictTopicFromMessage(normalizeMessage(message));
services/companionDoctrineRouter.js:  const newTopic = detectStrictTopicFromMessage(m);
services/companionDoctrineRouter.js:  const intent = classifyCurrentTurnIntent(message, context);
services/companionDoctrineRouter.js:    const topic = detectStrictTopicFromMessage(m);
services/companionDoctrineRouter.js:    return !detectStrictTopicFromMessage(normalizeMessage(message));
services/companionDoctrineRouter.js:  const intent = classifyCurrentTurnIntent(message, context);
services/companionDoctrineRouter.js:    !detectStrictTopicFromMessage(normalizeMessage(message)) &&
services/companionDoctrineRouter.js:function planCompanionDoctrineRouting({ userId, message, recentSessions = [], runtimeContext = {} } = {}) {
services/companionDoctrineRouter.js:  const humanNeed = detectHumanNeed(message, {}, context);
services/companionDoctrineRouter.js:  const intent = classifyCurrentTurnIntent(message, context);
services/companionDoctrineRouter.js:  const messageTopic = detectStrictTopicFromMessage(m);
services/companionDoctrineRouter.js:  classifyCurrentTurnIntent,
services/companionDoctrineRouter.js:  planCompanionDoctrineRouting,
services/humanNeedDetector.js:const { classifyCompanionIntent } = require('./companionIntentIntelligence');
services/humanNeedDetector.js:function detectHumanNeed(message = '', anchor = {}, state = {}) {
services/humanNeedDetector.js:  const intent = classifyCompanionIntent({ message: m, state });
services/humanNeedDetector.js:  detectHumanNeed,
services/buddyBrain.js:const { detectHumanNeed } = require('./humanNeedDetector');
services/buddyBrain.js:    const humanNeed = detectHumanNeed(message, anchor, doctrineState);
services/bibleCompanionOrchestrator.js:  planCompanionDoctrineRouting,
services/bibleCompanionOrchestrator.js:  classifyTurnContract,
services/bibleCompanionOrchestrator.js:const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
services/bibleCompanionOrchestrator.js:const { classifyCompanionIntent } = require('./companionIntentIntelligence');
services/bibleCompanionOrchestrator.js:const { detectHumanNeed } = require('./humanNeedDetector');
services/bibleCompanionOrchestrator.js:  const humanNeed = detectHumanNeed(message, anchor, state);
services/bibleCompanionOrchestrator.js:  let conceptMatch = detectSemanticConcept(message, state);
services/bibleCompanionOrchestrator.js:  const contract = classifyTurnContract({ message, state, conceptMatch });
services/bibleCompanionOrchestrator.js:    humanNeed: detectHumanNeed(message, buildConversationAnchor({ userId, message, state: mergedState }), mergedState),
services/bibleCompanionOrchestrator.js:  const humanNeed = detectHumanNeed(message, conversationAnchor, mergedState);
services/bibleCompanionOrchestrator.js:  const conceptMatchEarly = detectSemanticConcept(message, mergedState);
services/bibleCompanionOrchestrator.js:  const companionIntent = classifyCompanionIntent({
services/bibleCompanionOrchestrator.js:    const clarHumanNeed = detectHumanNeed(message, clarAnchor, mergedState);
services/followUpContextResolver.js:const { detectSemanticConcept, rankConceptCandidates } = require('./bibleSemanticConceptNormalizer');
services/followUpContextResolver.js:  const explicit = detectSemanticConcept(m, context);
services/noGlitchTurnContract.js:const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
services/noGlitchTurnContract.js:const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
services/noGlitchTurnContract.js:  if (detectStrictTopicFromMessage(m)) return false;
services/noGlitchTurnContract.js:  if (detectSemanticConcept(m)) return false;
services/noGlitchTurnContract.js:function classifyTurnContract({ message = '', state = {}, conceptMatch = null } = {}) {
services/noGlitchTurnContract.js:  const concept = conceptMatch || detectSemanticConcept(m, state);
services/noGlitchTurnContract.js:  const strictTopicFromMessage = detectStrictTopicFromMessage(m);
services/noGlitchTurnContract.js:  classifyTurnContract,
services/doctrineAuthorityContract.js:  const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
services/doctrineAuthorityContract.js:  const detected = detectStrictTopicFromMessage(messageRaw);
services/doctrineTopicDetector.js:function detectStrictTopicFromMessage(message = '') {
services/doctrineTopicDetector.js:  detectStrictTopicFromMessage,
services/singleCompanionContract.js:const { detectHumanNeed, APP_IDENTITY_RE } = require('./humanNeedDetector');
services/singleCompanionContract.js:  const need = humanNeed || detectHumanNeed(message, anchor, state);
services/bibleSemanticConceptNormalizer.js:function detectSemanticConcept(message = '', context = {}) {
services/bibleSemanticConceptNormalizer.js:  const concept = detectSemanticConcept(message);
services/bibleSemanticConceptNormalizer.js:  const concept = detectSemanticConcept(message, context);
services/bibleSemanticConceptNormalizer.js:  detectSemanticConcept,
scripts/runConversationArchitectureAudit.sh:grep -R "detectHumanNeed\|classifyCurrentTurnIntent\|classifyCompanionIntent\|classifyTurnContract\|planCompanionDoctrineRouting\|detectStrictTopicFromMessage\|detectSemanticConcept" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
scripts/runPhase5HCompanionIntentIntelligenceRegression.js:const { classifyCompanionIntent } = require('../services/companionIntentIntelligence');
scripts/runPhase5HCompanionIntentIntelligenceRegression.js:  const intentTell = classifyCompanionIntent({
```

## All Clarifier Producers
```
services/scriptureDiscoveryPilot.js:    candidateConclusion: 'Clean/unclean distinction with Acts 10-11 gentile clarification',
services/liveRequestTrace.js:  if (lane === 'clarification' || route === 'bible_companion_clarification') {
services/liveRequestTrace.js:  if (route === 'bible_companion_clarification') return 'buildClarificationReply';
services/bibleReasoningEngine.js:    answerLane = 'clarification';
services/companionIntentIntelligence.js:    return { category: 'clarification_needed', conceptId: null, practicalType: null, priority: 9 };
services/companionIntentIntelligence.js:    return { category: 'clarification_needed', conceptId: null, practicalType: null, priority: 9 };
services/approvedSupportGraph.js:    id: 'acts11_gentile_clarification',
services/responseGuarantee.js:  'I want to stay with you on this. Could you ask your question again in one short sentence?';
services/doctrineErrorFirewall.js:  'I am having trouble retrieving additional passages right now. Please try again in a moment.';
services/doctrineErrorFirewall.js:  if (/trouble retrieving additional passages/i.test(reply)) {
services/doctrineErrorFirewall.js:  'I want to stay with you on this. Could you ask your question again in one short sentence?';
services/studyClarificationRuntime.js:    clarificationQuestions: buildClarificationQuestions(message),
services/companionIdentityEngine.js: * Phase 5K/5L — App purpose / identity drafts (not Scripture-topic clarification).
services/companionStateEngine.js: * Phase 5A — Companion state: listener, teacher, prayer partner, clarifier.
services/companionStateEngine.js:  else if (isCorrectionMessage(m) || routePlan.intent === 'user_correction') mode = 'clarifier';
services/claimToScriptureValidator.js:  const doctrineClaims = claims.filter((c) => c.type === 'doctrine' || c.type === 'clarification');
services/runtimeContinuityOrchestrator.js:  const clarification = buildClarificationRuntime({
services/runtimeContinuityOrchestrator.js:    clarification,
services/companionDoctrineRouter.js:    return "Which Bible topic would you like me to continue? I don't have one active right now — what do you want to explore?";
services/bibleWordSenseEngine.js:  if (!id) return 'No confident word-sense match; clarification may be needed.';
services/supportRelationshipEngine.js:    (c) => c.type === 'doctrine' || c.type === 'clarification' || !c.type
services/humanNeedDetector.js:  if (intent.category === 'clarification_needed') return 'clarification';
services/doctrineConclusionBuilder.js:    (c) => (c.type === 'doctrine' || c.type === 'clarification') && String(c.claim || '').trim()
services/bibleCompanionOrchestrator.js:  'I want to make sure I answer the right thing. Are you asking about a Bible passage, a life situation, or something you want prayer for?';
services/bibleCompanionOrchestrator.js:    masterRoute: 'bible_companion_clarification',
services/bibleCompanionOrchestrator.js:    admin_flags: ['clarification_request', 'learning_candidate'],
services/bibleCompanionOrchestrator.js:  if (reasoningPlan.answerLane === 'clarification' && companionIntent.blockClarification) {
services/bibleCompanionOrchestrator.js:  if (reasoningPlan.answerLane === 'clarification') {
services/bibleCompanionOrchestrator.js:        orchestratorLane: 'clarification',
services/evidenceCards/index.js:  acts_10_clarification: 'dietaryLaw',
services/evidenceCards/dietaryLaw.card.js:  questionTypes: ['yes_no', 'what_scripture_says', 'acts_10_clarification', 'clean_unclean_list', 'isaiah_66_17'],
services/runtimeHealthMonitor.js:      type: 'contract_clarifier',
services/reasonFirstComposer.js:- type: doctrine | pastoral | procedural | clarification
services/noGlitchTurnContract.js:  'I can do that. Which Bible topic would you like more Scriptures about — the Sabbath, the Kingdom, clean foods, death, or something else?';
services/noGlitchTurnContract.js:      masterRoute: 'no_glitch_clarifier',
services/alphaIssueAggregator.js:    re: /core_connection_error|trouble retrieving/i,
services/doctrineAuthorityContract.js:  acts_10_clarification: 'dietary_law',
services/singleCompanionContract.js:    id: 'clarification_loop',
services/singleCompanionContract.js:  'I want to make sure I answer the right thing. Are you asking about a Bible passage, a life situation, or something you want prayer for?';
services/singleCompanionContract.js:    repairLane: 'safe_clarification_fallback',
services/singleCompanionContract.js:  if (stillForbidden.includes('clarification_loop') && contract.hasEstablishedTopic) {
services/companionStyleGuard.js:const RETRIEVAL_ERROR_RE = /\btrouble retrieving additional passages\b/i;
services/companionStyleGuard.js:      'I want to stay with you on this. Could you ask your question again in one short sentence?';
services/companionStyleGuard.js:  if (/\bhow (do|should) i explain\b/i.test(message) && /which book, topic, or passage/i.test(reply)) failures.push('clarification_loop');
scripts/runPhase5EBibleNaturalConcordanceRegression.js:  if (/trouble retrieving additional passages/i.test(r10.reply)) f10.push('retrieval_error');
scripts/runPhase5JAlphaLoadSmoke.js:const ERROR_RE = /core_connection_error|trouble retrieving additional passages/i;
scripts/runPhase5M2LiveRouteVerification.js:        'return { reply: \'I want to answer from Scripture directly. Could you tell me a little more — which book, topic, or passage you mean?...\', masterRoute: \'bible_companion_clarification\' }',
scripts/runPhase5M2LiveRouteVerification.js:      caller: 'runBibleCompanionOrchestrator when reasoningPlan.answerLane === \'clarification\' (line ~1127)',
scripts/baePhase1bLiveMeasurement.js:  const doctrineClaims = claims.filter((c) => ['doctrine', 'clarification'].includes(c.type || 'doctrine'));
scripts/runPhase4NResponseClarityRegression.js:      assert(!/which bible topic would you like/i.test(t6.reply), 'not orphan clarification'),
scripts/doctrineAuthorityFailureProbe.js:      const doctrineClaims = claimsGenerated.filter((c) => (c.type || 'doctrine') === 'doctrine' || c.type === 'clarification');
scripts/runPhase5IRelationshipIntelligenceRegression.js:const ERROR_RE = /core_connection_error|trouble retrieving additional passages|cannot modify a database/i;
scripts/runPhase5IRelationshipIntelligenceRegression.js:  if (/which book, topic, or passage/i.test(r5.reply)) f5.push('clarification_loop');
scripts/runPhase5IRelationshipIntelligenceRegression.js:  if (/which book, topic, or passage/i.test(r6.reply)) f6.push('clarification_loop');
scripts/runPhase5KRelationshipDepthRegression.js:const ERROR_RE = /core_connection_error|trouble retrieving additional passages/i;
scripts/runConversationArchitectureAudit.sh:grep -R "Could you ask your question again\|Which Bible topic\|make sure I answer the right thing\|trouble retrieving\|clarifier\|clarification" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
scripts/runPhase5HCompanionIntentIntelligenceRegression.js:const ERROR_RE = /core_connection_error|trouble retrieving additional passages|cannot modify a database/i;
scripts/runPhase5HCompanionIntentIntelligenceRegression.js:  if (/which book, topic, or passage/i.test(r4.reply)) f4.push('clarification_loop');
scripts/runPhase5HCompanionIntentIntelligenceRegression.js:  if (/which book, topic, or passage/i.test(r5.reply)) f5.push('clarification_loop');
scripts/runPhase5JConversationEvalPack.js:const ERROR_RE = /core_connection_error|trouble retrieving additional passages/i;
scripts/runPhase4OBibleWideReasoningRegression.js:      assert(/which|topic|explore|active/i.test(t12.reply), 'asks clarification'),
scripts/runPhase5FNoGlitchMemoryReasoningRegression.js:const ERROR_RE = /core_connection_error|trouble retrieving additional passages|cannot modify a database/i;
scripts/runPhase5FNoGlitchMemoryReasoningRegression.js:  if (!/which bible topic|sabbath|kingdom|clean foods|death/i.test(r1.reply)) f1.push('no_clarifier');
scripts/runPhase5FNoGlitchMemoryReasoningRegression.js:  if (r1.route !== 'no_glitch_clarifier' && !/which bible topic/i.test(r1.reply)) f1.push('wrong_route');
scripts/runPhase5FNoGlitchMemoryReasoningRegression.js:  if (!/which bible topic|sabbath|kingdom/i.test(r2.reply)) f2.push('no_clarifier');
scripts/runPhase5FNoGlitchMemoryReasoningRegression.js:    preview: `errors=${healthAfter.errors} pressure=${healthAfter.memoryPressureLevel} clarifiers=${healthAfter.contractClarifiers || 0}`,
scripts/runPhase5GCompanionRelationshipRegression.js:const ERROR_RE = /core_connection_error|trouble retrieving additional passages|cannot modify a database/i;
scripts/runPhase5GCompanionRelationshipRegression.js:  if (/which book, topic, or passage/i.test(r5.reply)) f5.push('clarification_loop');
scripts/runPhase5GCompanionRelationshipRegression.js:  if (/which book, topic, or passage/i.test(r6.reply)) f6.push('clarification_loop');
```

## OpenAI Blocking / Allowing Logic
```
services/doctrineWitnessInventory.js:      openAiCalled: false,
services/liveRequestTrace.js:  const openaiCalled = !!(dbg.openaiCalled ?? rt.openAiCalled);
services/phase4c1RuntimeDiagnostics.js:  lines.push('4. OpenAI timeout added via OPENAI_TIMEOUT_MS in reasonFirstComposer.callOpenAI');
services/phase2mSecondBatch.js:    openaiErrors: process.env.OPENAI_API_KEY ? 'none_in_offline_gate' : 'live_stress_not_run_missing_key',
services/masterBuddyRuntime.js:const MASTER_OPENAI_RULES = `
services/masterBuddyRuntime.js:  const systemPrompt = `${H.buildSystemPrompt({ mode, personaKey, profile, runtimeInstructions })}\n\n${MASTER_OPENAI_RULES}`;
services/masterBuddyRuntime.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
services/companionConversationExperimentRuntime.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
services/phase2qLiveValidation.js:  if (!process.env.OPENAI_API_KEY) {
services/phase2qLiveValidation.js:      reason: 'OPENAI_API_KEY not configured',
services/phase2qLiveValidation.js:      recommendation: 'export OPENAI_API_KEY=... && node scripts/phase2qLiveStressTest.js',
services/doctrineFinalAuthorityEngine.js:      openAiCalled: false,
services/bibleAuthorityAdminCenter.js:  const openaiConfigured = !!process.env.OPENAI_API_KEY;
services/bibleAuthorityAdminCenter.js:      status: openaiConfigured ? 'key_present' : 'missing_OPENAI_API_KEY',
services/responseGuarantee.js:        openAiCalled: false,
services/responseGuarantee.js:      openAiCalled: !!firewalled?.runtime?.openAiCalled,
services/doctrineCompanionPath.js:  if (process.env.BUDDY_OPENAI_FIRST === '0') return false;
services/replySourceClassifier.js:const OPENAI_MARKERS = [
services/replySourceClassifier.js:  if (OPENAI_MARKERS.some((p) => p.test(JSON.stringify(structured)))) {
services/responseStructureRemovalExperiment.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
services/bibleWideReasoningEngine.js:      openAiCalled: false,
services/alphaConversationCapture.js:    openAiCalled: !!runtime.openAiCalled,
services/openAiFirstCompanionRuntime.js:const { runStrictDoctrineGate, mustBlockOpenAi } = require('./strictDoctrineGate');
services/openAiFirstCompanionRuntime.js:        openAiCalled: false,
services/openAiFirstCompanionRuntime.js:    openAiCalled: false,
services/openAiFirstCompanionRuntime.js:    openAiCalled: !!out.runtime?.openAiCalled,
services/openAiFirstCompanionRuntime.js:    openaiCalled: !!out.runtime?.openAiCalled,
services/openAiFirstCompanionRuntime.js:    finalAnswerAuthor: out.runtime?.openAiCalled ? 'openai' : 'companion_release',
services/openAiFirstCompanionRuntime.js:    responderUsed: !!out.runtime?.openAiCalled,
services/openAiFirstCompanionRuntime.js:      openAiCalled: false,
services/openAiFirstCompanionRuntime.js:    !routePlan?.protectedHumanNeed && mustBlockOpenAi(evidencePack, userId, message, routePlan);
services/openAiFirstCompanionRuntime.js:        { reply: '', runtime: { openAiCalled: false } },
services/openAiFirstCompanionRuntime.js:            openAiCalled: false,
services/openAiFirstCompanionRuntime.js:    openAiCalled: openaiCalled,
services/coreResponseGuards.js:      openAiCalled: false,
services/strictDoctrineGate.js:    openAiCalled: false,
services/strictDoctrineGate.js:        openAiCalled: false,
services/strictDoctrineGate.js:function mustBlockOpenAi(evidencePack, userId, message = '', routePlan = null) {
services/strictDoctrineGate.js:  mustBlockOpenAi,
services/doctrineLivePathHandlers.js:      openAiCalled: false,
services/shadowReasonFirstRuntime.js:    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
services/shadowReasonFirstRuntime.js:        '[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]',
services/openaiClient.js:    apiKey: process.env.OPENAI_API_KEY,
services/scriptureRelationshipConsolidation.js:      configured: !!process.env.OPENAI_API_KEY,
services/scriptureRelationshipConsolidation.js:      status: process.env.OPENAI_API_KEY ? 'key_present' : 'missing_OPENAI_API_KEY',
services/reasonFirstLiteRuntime.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
services/phase2lLiveValidation.js:  const hasKey = !!(process.env.OPENAI_API_KEY || options.forceLive);
services/phase2lLiveValidation.js:      reason: 'OPENAI_API_KEY not configured — full 125-turn live suite not executed',
services/phase2lLiveValidation.js:      recommendation: 'export OPENAI_API_KEY=... && node scripts/phase2lLiveStressTest.js',
services/phase2lLiveValidation.js:  const openaiCap = buddy.includes('openAiCalled') || buddy.includes('openai');
services/phase2lLiveValidation.js:  if (!ctx.stress?.liveRan) stopReasons.push('Full live 125-turn stress pending OPENAI_API_KEY');
services/phase2lLiveValidation.js:    && stopReasons.filter((s) => s.includes('OPENAI')).length === (ctx.stress?.liveRan ? 0 : 1);
services/buddyBrain.js:          openAiCalled: entry.structured.runtime.openAiCalled,
services/buddyBrain.js:          openAiCalled: structured.runtime.openAiCalled,
services/buddyBrain.js:  if (process.env.BUDDY_OPENAI_FIRST === '0' || String(process.env.BUDDY_RUNTIME || '').toLowerCase() === 'reason_first') {
services/buddyBrain.js:      'WARN: BUDDY_OPENAI_FIRST=0 and BUDDY_RUNTIME=reason_first are disabled by hard cutover — using openAiFirstCompanionRuntime.'
services/postImplementationRegression.js:    note: 'Cached Phase 2I results — re-run stress suite with OPENAI_API_KEY for live post-2K validation',
services/postImplementationRegression.js:    openaiErrors: process.env.OPENAI_API_KEY ? 'none_in_offline_gate' : 'live_stress_not_run_missing_key',
services/liveResponseCapture.js:    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
services/bibleCompanionOrchestrator.js:      openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:          openAiCalled: false,
services/bibleCompanionOrchestrator.js:          openAiCalled: false,
services/bibleCompanionOrchestrator.js:            openAiCalled: false,
services/bibleCompanionOrchestrator.js:              openAiCalled: false,
services/bibleCompanionOrchestrator.js:            openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:          openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:        openAiCalled: false,
services/bibleCompanionOrchestrator.js:          openAiCalled: false,
services/companionOperatingModelExperiment.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
services/runtimeHealthMonitor.js:  strictDoctrineOpenAiBlocked: 0,
services/runtimeHealthMonitor.js:  openAiDisabled: process.env.BIBLEBUDDY_DISABLE_OPENAI === '1',
services/runtimeHealthMonitor.js:  openAiCalled = false,
services/runtimeHealthMonitor.js:  if (openAiCalled) metrics.openAiCalls += 1;
services/runtimeHealthMonitor.js:  if (strictDoctrine && !openAiCalled) metrics.strictDoctrineOpenAiBlocked += 1;
services/runtimeHealthMonitor.js:  metrics.strictDoctrineOpenAiBlocked += 1;
services/runtimeHealthMonitor.js:    openAiConfigured: !!process.env.OPENAI_API_KEY,
services/runtimeHealthMonitor.js:    openAiDisabled: process.env.BIBLEBUDDY_DISABLE_OPENAI === '1',
services/reasonFirstComposer.js:  return process.env.BIBLEBUDDY_DISABLE_OPENAI === '1';
services/reasonFirstComposer.js:  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 45000);
services/reasonFirstComposer.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:        blockOpenAI: true,
services/noGlitchTurnContract.js:        blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:        blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:      blockOpenAI: true,
services/noGlitchTurnContract.js:    blockOpenAI: false,
services/noGlitchTurnContract.js:  return !!contract.blockOpenAI;
services/noGlitchTurnContract.js:    blockOpenAI: shouldBlockOpenAI(contract),
services/alphaIssueAggregator.js:    field: 'openAiCalled',
services/alphaIssueAggregator.js:      if (rule.field === 'openAiCalled' && c.openAiCalled) matches.push(c);
services/buddyRuntimeConfig.js:  const openAiFirstExplicit = process.env.BUDDY_OPENAI_FIRST;
services/buddyRuntimeConfig.js:    pathLabel = 'openAiFirstCompanionRuntime'; // hard cutover — BUDDY_OPENAI_FIRST=0 ignored in buddyBrain.runBuddy
services/buddyRuntimeConfig.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
services/buddyRuntimeConfig.js:    console.warn('WARN: BUDDY_OPENAI_FIRST=0 — masterBuddyRuntime template responders active.');
services/buddyRuntimeConfig.js:    console.warn('WARN: OPENAI_API_KEY missing — all turns will use connection error path.');
services/bibleBuddyLiteRuntime.js:        '[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]',
services/bibleBuddyLiteRuntime.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
services/minimalReasonFirstRuntime.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
routes/realtime.js:    const apiKey = process.env.OPENAI_API_KEY;
routes/realtime.js:        error: 'OPENAI_API_KEY is not configured.',
routes/realtime.js:    const model = body.model || process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview';
routes/realtime.js:    const voice = body.voice || process.env.OPENAI_REALTIME_VOICE || 'alloy';
routes/realtime.js:    const configuredEndpoint = process.env.OPENAI_REALTIME_EPHEMERAL_ENDPOINT;
routes/realtime.js:    defaultModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
routes/realtime.js:    defaultVoice: process.env.OPENAI_REALTIME_VOICE || 'alloy',
scripts/phase1cClaimGenerationCompliance.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase1cClaimGenerationCompliance.js
scripts/phase1cClaimGenerationCompliance.js:  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
scripts/phase1cClaimGenerationCompliance.js:    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
scripts/phase1cClaimGenerationCompliance.js:    keyPresent: !!process.env.OPENAI_API_KEY,
scripts/phase1cClaimGenerationCompliance.js:    keyLooksSk: String(process.env.OPENAI_API_KEY || '').startsWith('sk-'),
scripts/phase2lLiveStressTest.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2lLiveStressTest.js
scripts/phase2lLiveStressTest.js:if (!process.env.OPENAI_API_KEY) {
scripts/phase2lLiveStressTest.js:  console.error('OPENAI_API_KEY required for live 125-turn stress suite');
scripts/openAiFirstRegressionTest.js: *   OPENAI_API_KEY=... BUDDY_RUNTIME=legacy node scripts/openAiFirstRegressionTest.js
scripts/openAiFirstRegressionTest.js:  const openAiCalled = !!structured.runtime?.openAiCalled;
scripts/openAiFirstRegressionTest.js:  const openAiExpected = test.expectOpenAi && !!process.env.OPENAI_API_KEY;
scripts/openAiFirstRegressionTest.js:  const openAiFail = openAiExpected && !openAiCalled ? 'openAiCalled was false' : null;
scripts/openAiFirstRegressionTest.js:    openAiCalled,
scripts/openAiFirstRegressionTest.js:  if (process.env.BUDDY_OPENAI_FIRST === '0') {
scripts/openAiFirstRegressionTest.js:    console.error('Set BUDDY_OPENAI_FIRST unset (default) or =1; BUDDY_OPENAI_FIRST=0 uses master path.');
scripts/openAiFirstRegressionTest.js:    console.log(`[${status}] ${row.id} route=${row.masterRoute} openAi=${row.openAiCalled}`);
scripts/openAiFirstRegressionTest.js:    buddyOpenAiFirst: process.env.BUDDY_OPENAI_FIRST || 'default-on',
scripts/openAiFirstRegressionTest.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/emptyReplyTrace.js:    openAiCalled: obj.runtime?.openAiCalled ?? obj.coreDebug?.openaiCalled ?? null,
scripts/emptyReplyTrace.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/baePhase1bLiveMeasurement.js: * Requires OPENAI_API_KEY. No code changes to doctrine/retrieval/validators.
scripts/baePhase1bLiveMeasurement.js:    `**Live measurement:** ${liveRan ? 'YES' : 'NO — OPENAI_API_KEY missing'}`,
scripts/baePhase1bLiveMeasurement.js:    ? 'UNMEASURED — run with OPENAI_API_KEY'
scripts/baePhase1bLiveMeasurement.js:**Status:** ${liveRan ? 'LIVE MEASUREMENT COMPLETE' : 'LIVE MEASUREMENT BLOCKED — no OPENAI_API_KEY'}
scripts/baePhase1bLiveMeasurement.js:${liveRan ? `${rows.length} doctrine topics measured with real OpenAI.` : '**Not executed.** Set OPENAI_API_KEY and run `node scripts/baePhase1bLiveMeasurement.js`.'}
scripts/baePhase1bLiveMeasurement.js:    : '**Not executed** — requires OPENAI_API_KEY.'}
scripts/baePhase1bLiveMeasurement.js:  if (!process.env.OPENAI_API_KEY) {
scripts/baePhase1bLiveMeasurement.js:      error: 'OPENAI_API_KEY not set',
scripts/baePhase1bLiveMeasurement.js:      note: 'Run: export OPENAI_API_KEY=sk-... && node scripts/baePhase1bLiveMeasurement.js',
scripts/baePhase1bLiveMeasurement.js:    fs.writeFileSync(CASE_STUDY_OUT, JSON.stringify({ liveRan: false, error: 'OPENAI_API_KEY not set' }, null, 2));
scripts/baePhase1bLiveMeasurement.js:    console.error('OPENAI_API_KEY required for live measurement');
scripts/runPhase4NResponseClarityRegression.js:    openAiCalled: structured.runtime?.openAiCalled,
scripts/runPhase4NResponseClarityRegression.js:      assert(!t7a.openAiCalled, 'no openai doctrine authoring'),
scripts/renderParityFixVerify.js:        attempt.openAiCalled = data.reply?.runtime?.openAiCalled ?? data.reply?.coreDebug?.openaiCalled ?? null;
scripts/doctrineAuthorityFailureProbe.js:  let liveBlocked = !process.env.OPENAI_API_KEY;
scripts/doctrineAuthorityFailureProbe.js:  if (process.env.OPENAI_API_KEY) {
scripts/doctrineAuthorityFailureProbe.js:    notes.push('LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable');
scripts/doctrineAuthorityFailureProbe.js:    lines.push('Run with `OPENAI_API_KEY` to measure D/E/F/G distribution before further implementation.');
scripts/doctrineAuthorityFailureProbe.js:    liveRan: !!process.env.OPENAI_API_KEY,
scripts/companionConversationExperiment.js: *   OPENAI_API_KEY=sk-... node scripts/companionConversationExperiment.js
scripts/companionConversationExperiment.js:    lines.push('> **OpenAI unavailable** — live experiment replies not generated. Re-run with `OPENAI_API_KEY`.');
scripts/companionConversationExperiment.js:        experimentReply: '[Pending — OPENAI_API_KEY required]',
scripts/companionConversationExperiment.js:    note: 'Run: OPENAI_API_KEY=sk-... node scripts/companionConversationExperiment.js',
scripts/companionConversationExperiment.js:  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
scripts/ownershipAuditBattery.js:    openaiCalled: !!(dbg.openaiCalled ?? s.runtime?.openAiCalled),
scripts/ownershipAuditBattery.js:  if (!process.env.OPENAI_API_KEY) {
scripts/ownershipAuditBattery.js:    console.error('OPENAI_API_KEY required for ownership audit battery.');
scripts/ownershipAuditBattery.js:    openAiCalledRate: results.filter((r) => r.openaiCalled).length / results.length,
scripts/runPhase4D2LiveCompanionPathRegression.js:    openAiCalled: structured.runtime?.openAiCalled ?? structured.runtime?.openAiCalled,
scripts/runPhase4D2LiveCompanionPathRegression.js:      assert(t2.route === 'doctrine_witness_inventory' || !t2.structured.runtime?.openAiCalled, 'no OpenAI continuation'),
scripts/runPhase4D2LiveCompanionPathRegression.js:      assert(t4.route === 'doctrine_correction_memory' || !t4.structured.runtime?.openAiCalled, 'correction handler'),
scripts/runPhase4D2LiveCompanionPathRegression.js:      assert(t5.route === 'doctrine_witness_inventory' || !t5.structured.runtime?.openAiCalled, 'inventory route'),
scripts/runPhase4D2LiveCompanionPathRegression.js:      assert(r.route === 'doctrine_witness_inventory' || !r.structured.runtime?.openAiCalled, `iter ${i + 1} no OpenAI`),
scripts/bibleOnlyAuthorityRegression.js: * Bible-only authority happy-path regression — requires OPENAI_API_KEY.
scripts/bibleOnlyAuthorityRegression.js:  if (!process.env.OPENAI_API_KEY) {
scripts/bibleOnlyAuthorityRegression.js:  if (!process.env.OPENAI_API_KEY) {
scripts/bibleOnlyAuthorityRegression.js:    console.error('OPENAI_API_KEY required for happy-path validation');
scripts/bibleOnlyAuthorityRegression.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/bibleOnlyAuthorityRegression.js:  if (!process.env.OPENAI_API_KEY) process.exit(2);
scripts/responseStructureRemovalExperiment.js: *   OPENAI_API_KEY=sk-... node scripts/responseStructureRemovalExperiment.js
scripts/responseStructureRemovalExperiment.js:    lines.push(`Cached RACL baseline listening: **${cachedMetrics?.avgHumanListening ?? 'n/a'}/10**. Experiment pending \`OPENAI_API_KEY\`.`);
scripts/responseStructureRemovalExperiment.js:      experimentReply: '[Pending — OPENAI_API_KEY required]',
scripts/responseStructureRemovalExperiment.js:  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
scripts/liveRuntimeVerification.js:    'OPENAI_API_KEY',
scripts/liveRuntimeVerification.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/promptHierarchyExperiment.js: *   OPENAI_API_KEY=sk-... node scripts/promptHierarchyExperiment.js
scripts/promptHierarchyExperiment.js:    lines.push('> **OpenAI unavailable in this run.** Current scores use cached live replies from `docs/reason-first-migration/validation-results.json`. Re-run with `OPENAI_API_KEY` for live minimal responses.');
scripts/promptHierarchyExperiment.js:    lines.push('> **Minimal response scores pending** — prompt sizes measured; set `OPENAI_API_KEY=sk-...` and re-run for full A/B reply comparison.');
scripts/promptHierarchyExperiment.js:    lines.push('**BLOCKED** — Live OpenAI run required. Set `OPENAI_API_KEY` and re-run.');
scripts/promptHierarchyExperiment.js:    lines.push('OPENAI_API_KEY=sk-... node scripts/promptHierarchyExperiment.js');
scripts/promptHierarchyExperiment.js:  const openaiAvailable = !!process.env.OPENAI_API_KEY && openaiModule;
scripts/promptHierarchyExperiment.js:    console.error('OPENAI_API_KEY required for live A/B experiment.');
scripts/promptHierarchyExperiment.js:    console.error('Usage: OPENAI_API_KEY=sk-... node scripts/promptHierarchyExperiment.js');
scripts/runPhase4FCombinedStabilityRegression.js:    openAiCalled: structured.runtime?.openAiCalled,
scripts/runPhase4FCombinedStabilityRegression.js:      assert(!r.openAiCalled, `no openai ${i + 1}`),
scripts/runPhase4FCombinedStabilityRegression.js:      assert(!r.openAiCalled, `no openai corr ${i + 1}`),
scripts/runPhase4FCombinedStabilityRegression.js:      assert(!r.openAiCalled, `cont no openai ${i + 1}`),
scripts/runPhase4FCombinedStabilityRegression.js:      assert(!r.openAiCalled, `death no openai ${i + 1}`),
scripts/runPhase4FCombinedStabilityRegression.js:      assert(!r.openAiCalled, `death cont ${i + 1}`),
scripts/runPhase4FCombinedStabilityRegression.js:      assert(!r.openAiCalled, `diet no openai ${i + 1}`),
scripts/runPhase4FCombinedStabilityRegression.js:    mixChecks.push(assert(!r.openAiCalled, `mix no openai ${i + 1}`));
scripts/runPhase4FCombinedStabilityRegression.js:    memChecks.push(assert(!r.openAiCalled, `mem no openai ${i + 1}`));
scripts/runPhase4FCombinedStabilityRegression.js:      assert(!r.openAiCalled, `before no openai ${i + 1}`),
scripts/runPhase4FCombinedStabilityRegression.js:  process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
scripts/runPhase4FCombinedStabilityRegression.js:    noAiChecks.push(assert(!r.openAiCalled, `noai blocked ${i + 1}`));
scripts/runPhase4FCombinedStabilityRegression.js:  delete process.env.BIBLEBUDDY_DISABLE_OPENAI;
scripts/runPhase4FCombinedStabilityRegression.js:    pressureChecks.push(assert(!r.openAiCalled, `pressure no openai ${i + 1}`));
scripts/responseOwnershipTraceAudit.js:    unset: ['BUDDY_TEMPLATE_PROSE', 'BUDDY_DISABLE_STUDY_FALLBACK', 'BUDDY_OPENAI_FIRST'],
scripts/responseOwnershipTraceAudit.js:    unset: ['BUDDY_OPENAI_FIRST'],
scripts/responseOwnershipTraceAudit.js:    label: 'Master runtime rollback (BUDDY_OPENAI_FIRST=0)',
scripts/responseOwnershipTraceAudit.js:    env: { BUDDY_RUNTIME: 'legacy', BUDDY_DEBUG: '1', BUDDY_OPENAI_FIRST: '0' },
scripts/responseOwnershipTraceAudit.js:  const openaiCalled = !!(dbg.openaiCalled ?? rt.openAiCalled);
scripts/responseOwnershipTraceAudit.js:    const openAi = rt.openAiCalled || rt.coreDebug?.openaiCalled;
scripts/phase2iConversationStressTest.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2iConversationStressTest.js
scripts/phase2iConversationStressTest.js:      : dbg.openaiCalled || rt.openAiCalled
scripts/phase2iConversationStressTest.js:    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
scripts/runConversationArchitectureAudit.sh:grep -R "blockOpenAI\|mustBlockOpenAi\|OPENAI\|openAiCalled\|strictDoctrineOpenAiBlocked" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
scripts/runBibleAuthorityPhase2Q.js:    lines.push('', `**Reason:** ${stress.reason || 'OPENAI_API_KEY not set'}`, '');
scripts/runBibleAuthorityPhase2Q.js:    lines.push(`**Recommendation:** \`export OPENAI_API_KEY=... && node scripts/phase2qLiveStressTest.js\``, '');
scripts/runBibleAuthorityPhase2Q.js:    `**Live suite:** ${data.liveRan ? 'executed' : 'offline projection (OPENAI_API_KEY required for live)'}`,
scripts/runBibleAuthorityPhase2Q.js:    '**Live re-run:** `export OPENAI_API_KEY=... && node scripts/phase2qLiveStressTest.js && node scripts/runBibleAuthorityPhase2Q.js`',
scripts/reasonFirstMigration.js: *   OPENAI_API_KEY=sk-... node scripts/reasonFirstMigration.js
scripts/reasonFirstMigration.js:    lines.push('> **OpenAI unavailable** in this environment. Reason-first gate will fail until `OPENAI_API_KEY` is set and `openai` package is installed.');
scripts/reasonFirstMigration.js:  lines.push('BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node server.js');
scripts/reasonFirstMigration.js:  const openaiAvailable = !!process.env.OPENAI_API_KEY && openaiModule;
scripts/deployParityVerification.js:    'OPENAI_API_KEY',
scripts/traceBuddyChatPath.js:    openAiConfigured: !!process.env.OPENAI_API_KEY,
scripts/traceBuddyChatPath.js:  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'set' : 'MISSING');
scripts/runBibleAuthorityPhase2P.js:    `10. **Ready for live 125-turn validation:** ${reg.regressionPassed && safety.passed ? 'Yes — run with OPENAI_API_KEY' : 'Resolve blockers first'}`,
scripts/baePhase1aRegression.js: * Requires OPENAI_API_KEY for live compose tests.
scripts/baePhase1aRegression.js:  if (!process.env.OPENAI_API_KEY) {
scripts/baePhase1aRegression.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/baePhase1aRegression.js:  if (!process.env.OPENAI_API_KEY) process.exit(2);
scripts/phase2hRegression.js:      : dbg.openaiCalled || rt.openAiCalled
scripts/phase2hRegression.js:    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
scripts/runPhase4D3LiveCompanionRealPathRegression.js:    openAiCalled: structured.runtime?.openAiCalled,
scripts/runPhase4D3LiveCompanionRealPathRegression.js:      assert(t1.route === 'doctrine_final_authority' || !t1.openAiCalled, 'no OpenAI doctrine reasoning'),
scripts/runPhase4D3LiveCompanionRealPathRegression.js:      assert(!t2.openAiCalled, 'no OpenAI on correction'),
scripts/runPhase4D3LiveCompanionRealPathRegression.js:      assert(!t3.openAiCalled, 'no OpenAI continuation'),
scripts/runPhase4D3LiveCompanionRealPathRegression.js:    challengeChecks.push(assert(!r.openAiCalled, `challenge ${i + 1} no OpenAI`));
scripts/runPhase4D3LiveCompanionRealPathRegression.js:      assert(t5.route === 'doctrine_final_authority' || !t5.openAiCalled, 'final authority path'),
scripts/runPhase4D3LiveCompanionRealPathRegression.js:    deathContChecks.push(assert(!r.openAiCalled, `death cont ${i + 1} no OpenAI`));
scripts/runPhase4D3LiveCompanionRealPathRegression.js:      assert(!t10.openAiCalled, 'no OpenAI'),
scripts/runBibleAuthorityPhase2L.js:    lines.push('', '**To run:** `export OPENAI_API_KEY=... && node scripts/phase2lLiveStressTest.js`', '');
scripts/runBibleAuthorityPhase2L.js:    '**Live stress:** `node scripts/phase2lLiveStressTest.js` (requires OPENAI_API_KEY)',
scripts/baePhase1bValidation.js: * Requires OPENAI_API_KEY for live compose tests.
scripts/baePhase1bValidation.js:  if (!process.env.OPENAI_API_KEY) {
scripts/baePhase1bValidation.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/baePhase1bValidation.js:      allPass: !!fixtureResult.allPass && livePass === liveResults.length && !!process.env.OPENAI_API_KEY,
scripts/baePhase1bValidation.js:  if (!process.env.OPENAI_API_KEY) process.exit(2);
scripts/uiContractReproduce.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/phase2bSupportRelationshipRegression.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2bSupportRelationshipRegression.js
scripts/phase2bSupportRelationshipRegression.js:      : getDbg(reply).openaiCalled || rt.openAiCalled
scripts/phase2bSupportRelationshipRegression.js:    openaiCalled: !!(getDbg(reply).openaiCalled ?? rt.openAiCalled),
scripts/bibleBuddyLiteBaselineExperiment.js: *   OPENAI_API_KEY=sk-... node scripts/bibleBuddyLiteBaselineExperiment.js
scripts/bibleBuddyLiteBaselineExperiment.js:    lines.push('> **Note:** `OPENAI_API_KEY` was not set during this run. Lite runtime could not compose model responses; Lite scores are N/A. Re-run with API key for full A/B human rubric scores.');
scripts/bibleBuddyLiteBaselineExperiment.js:  const openaiAvailable = !!process.env.OPENAI_API_KEY;
scripts/e2eDoctrineProofAndEnvParity.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/e2eDoctrineProofAndEnvParity.js
scripts/e2eDoctrineProofAndEnvParity.js:    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
scripts/e2eDoctrineProofAndEnvParity.js:    OPENAI_API_KEY: fingerprintKey(process.env.OPENAI_API_KEY),
scripts/e2eDoctrineProofAndEnvParity.js:    BUDDY_OPENAI_FIRST: process.env.BUDDY_OPENAI_FIRST ?? null,
scripts/e2eDoctrineProofAndEnvParity.js:  const key = process.env.OPENAI_API_KEY || '';
scripts/e2eDoctrineProofAndEnvParity.js:    apiKeySource: 'process.env.OPENAI_API_KEY (captured at module load)',
scripts/e2eDoctrineProofAndEnvParity.js:    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
scripts/e2eDoctrineProofAndEnvParity.js:      baseURL: process.env.OPENAI_BASE_URL || '(sdk default)',
scripts/e2eDoctrineProofAndEnvParity.js:      organization: process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION || null,
scripts/e2eDoctrineProofAndEnvParity.js:      project: process.env.OPENAI_PROJECT || null,
scripts/e2eDoctrineProofAndEnvParity.js:    const k = process.env.OPENAI_API_KEY || '';
scripts/e2eDoctrineProofAndEnvParity.js:      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
scripts/e2eDoctrineProofAndEnvParity.js:    await openai.responses.create({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input: 'Reply with OK' });
scripts/e2eDoctrineProofAndEnvParity.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
scripts/e2eDoctrineProofAndEnvParity.js:  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
scripts/e2eDoctrineProofAndEnvParity.js:    if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) return { code: 'A', label: 'Environment mismatch', infra: ['Environment', 'Authentication'] };
scripts/e2eDoctrineProofAndEnvParity.js:  const openaiCalled = !!(dbg.openaiCalled ?? rt.openAiCalled);
scripts/e2eDoctrineProofAndEnvParity.js:    if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) failureClassification.categories.push('Environment');
scripts/phase2qLiveStressTest.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2qLiveStressTest.js
scripts/phase2qLiveStressTest.js:if (!process.env.OPENAI_API_KEY) {
scripts/phase2qLiveStressTest.js:  console.error('OPENAI_API_KEY required for live 125-turn / 105-scenario suite');
scripts/emergencyHardCutoverRegression.js:      openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/runPhase5ABibleCompanionOrchestrationRegression.js:    openAiCalled: structured.runtime?.openAiCalled,
scripts/runPhase5ABibleCompanionOrchestrationRegression.js:      assert(!t7.openAiCalled, 'no OpenAI doctrine'),
scripts/traceLiveBuddyRoute.js:      openAiCalled: structured.runtime?.openAiCalled,
scripts/runPhase4MCompanionRoutingRegression.js:  const blockedBefore = healthBefore.strictDoctrineOpenAiBlocked;
scripts/runPhase4MCompanionRoutingRegression.js:    openAiCalled: structured.runtime?.openAiCalled,
scripts/runPhase4MCompanionRoutingRegression.js:    blockedDelta: healthAfter.strictDoctrineOpenAiBlocked - blockedBefore,
scripts/runPhase4MCompanionRoutingRegression.js:      assert(!t1.openAiCalled, 'openAiCalls 0 for strict doctrine'),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(!t12.openAiCalled, 'no OpenAI doctrine authoring'),
scripts/runPhase4MCompanionRoutingRegression.js:    strictDoctrineOpenAiBlocked: healthEnd.strictDoctrineOpenAiBlocked - healthStart.strictDoctrineOpenAiBlocked,
scripts/runPhase4MCompanionRoutingRegression.js:    `- strictDoctrineOpenAiBlocked: ${metrics.strictDoctrineOpenAiBlocked}`,
scripts/companionOperatingModelExperiment.js: *   OPENAI_API_KEY=sk-... node scripts/companionOperatingModelExperiment.js
scripts/companionOperatingModelExperiment.js:        experimentReply: '[Pending — OPENAI_API_KEY required]',
scripts/companionOperatingModelExperiment.js:    note: 'OPENAI_API_KEY=sk-... node scripts/companionOperatingModelExperiment.js',
scripts/companionOperatingModelExperiment.js:  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
scripts/raclValidation.js: *   BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node scripts/raclValidation.js
scripts/raclValidation.js:    lines.push('> **OpenAI unavailable.** Set `OPENAI_API_KEY` for live validation.');
scripts/raclValidation.js:  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
scripts/runPhase5J1DeploymentIntegrityGate.js:    if (/OPENAI_API_KEY|sk-[a-zA-Z0-9]/i.test(f)) forbidden.push(f);
scripts/runPhase4GProductionParityVerification.js:    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini (default)',
scripts/runPhase4GProductionParityVerification.js:    OPENAI_API_KEY: fp(process.env.OPENAI_API_KEY),
scripts/runPhase4GProductionParityVerification.js:    BIBLEBUDDY_DISABLE_OPENAI: process.env.BIBLEBUDDY_DISABLE_OPENAI || 'unset',
scripts/runPhase4GProductionParityVerification.js:    openAiCalled: replyObj?.runtime?.openAiCalled,
scripts/runPhase4GProductionParityVerification.js:    openAiCalled: structured.runtime?.openAiCalled,
scripts/runPhase4GProductionParityVerification.js:  if (checks.noOpenAi && r.openAiCalled) failures.push('OpenAI called');
scripts/runPhase4GProductionParityVerification.js:  return { label, pass: failures.length === 0, failures, latencyMs: r.latencyMs, route: r.route, openAiCalled: r.openAiCalled, replyPreview: r.reply.slice(0, 200) };
scripts/runPhase4GProductionParityVerification.js:  process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
scripts/runPhase4GProductionParityVerification.js:  delete process.env.BIBLEBUDDY_DISABLE_OPENAI;
scripts/phase2aClaimExtractorRegression.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2aClaimExtractorRegression.js
scripts/phase2aClaimExtractorRegression.js:    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
scripts/phase2aClaimExtractorRegression.js:          : dbg.openaiCalled || rt.openAiCalled
scripts/realDoctrineTurnTraceRunner.js:  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
scripts/realDoctrineTurnTraceRunner.js:    keyPresent: !!process.env.OPENAI_API_KEY,
scripts/realDoctrineTurnTraceRunner.js:    keyLen: (process.env.OPENAI_API_KEY || '').length,
scripts/realDoctrineTurnTraceRunner.js:      openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
scripts/realDoctrineTurnTraceRunner.js:      openAiCalledRt: rt.openAiCalled,
scripts/realDoctrineTurnTraceRunner.js:            : dbg.openaiCalled || rt.openAiCalled
scripts/realDoctrineTurnTraceRunner.js:      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
scripts/realDoctrineTurnTraceRunner.js:      keyPresent: !!process.env.OPENAI_API_KEY,
scripts/realDoctrineTurnTraceRunner.js:      keyLen: (process.env.OPENAI_API_KEY || '').length,
scripts/shadowRuntimeComparison.js: *   OPENAI_API_KEY=sk-... node scripts/shadowRuntimeComparison.js
scripts/shadowRuntimeComparison.js:    lines.push('> **OpenAI was unavailable** during this run. Shadow runtime could not compose responses. Re-run with `OPENAI_API_KEY` set and `openai` package installed for a valid A/B verdict.');
scripts/shadowRuntimeComparison.js:  const openaiAvailable = !!process.env.OPENAI_API_KEY;
scripts/shadowRuntimeComparison.js:  console.log(`OPENAI_API_KEY set: ${openaiAvailable}`);
scripts/scriptureAuthorityAuditRunner.js: * Usage: export OPENAI_API_KEY=... && node scripts/scriptureAuthorityAuditRunner.js
scripts/scriptureAuthorityAuditRunner.js:  const openaiCalled = !!(dbg.openaiCalled ?? reply.runtime?.openAiCalled);
scripts/scriptureAuthorityAuditRunner.js:    keyPresent: !!process.env.OPENAI_API_KEY,
scripts/runPhase4HDoctrineParityRegression.js:  if (opts.noOpenAi && r.openAiCalled) failures.push('openai');
scripts/runPhase4HDoctrineParityRegression.js:  return { label, pass: failures.length === 0, failures, latencyMs: r.latencyMs, route: r.route, openAiCalled: r.openAiCalled, preview: reply.slice(0, 160) };
scripts/runPhase4HDoctrineParityRegression.js:    openAiCalled: s.runtime?.openAiCalled,
scripts/runPhase4HDoctrineParityRegression.js:    openAiCalled: replyObj?.runtime?.openAiCalled,
scripts/runPhase4HDoctrineParityRegression.js:  process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
scripts/runPhase4HDoctrineParityRegression.js:  delete process.env.BIBLEBUDDY_DISABLE_OPENAI;
scripts/companionTurnIntentValidation.js: *   BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node scripts/companionTurnIntentValidation.js
scripts/companionTurnIntentValidation.js:    lines.push('> **INCONCLUSIVE** — `OPENAI_API_KEY` required for live validation.');
scripts/companionTurnIntentValidation.js:  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
scripts/companionTurnIntentValidation.js:      note: 'Set OPENAI_API_KEY and re-run',
scripts/companionTurnIntentValidation.js:    console.log('INCONCLUSIVE — no OPENAI_API_KEY');
scripts/goldenCompanionExamplesValidation.js: *   OPENAI_API_KEY=sk-... node scripts/goldenCompanionExamplesValidation.js
scripts/goldenCompanionExamplesValidation.js:    lines.push('*Golden arm not run — set `OPENAI_API_KEY` and re-run `node scripts/goldenCompanionExamplesValidation.js`.*');
scripts/goldenCompanionExamplesValidation.js:    lines.push('> **Live A/B pending:** Export `OPENAI_API_KEY` and run `node scripts/goldenCompanionExamplesValidation.js`.');
scripts/goldenCompanionExamplesValidation.js:  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
scripts/endToEndDoctrineTurnProof.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/endToEndDoctrineTurnProof.js
scripts/endToEndDoctrineTurnProof.js:  const key = process.env.OPENAI_API_KEY || '';
scripts/endToEndDoctrineTurnProof.js:      OPENAI_API_KEY: maskKey(key),
scripts/endToEndDoctrineTurnProof.js:      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
scripts/endToEndDoctrineTurnProof.js:      OPENAI_ORG: process.env.OPENAI_ORG || null,
scripts/endToEndDoctrineTurnProof.js:      OPENAI_ORGANIZATION: process.env.OPENAI_ORGANIZATION || null,
scripts/endToEndDoctrineTurnProof.js:      OPENAI_PROJECT: process.env.OPENAI_PROJECT || null,
scripts/endToEndDoctrineTurnProof.js:      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || null,
scripts/endToEndDoctrineTurnProof.js:      BUDDY_OPENAI_FIRST: process.env.BUDDY_OPENAI_FIRST ?? null,
scripts/endToEndDoctrineTurnProof.js:      apiKeySource: 'process.env.OPENAI_API_KEY',
scripts/endToEndDoctrineTurnProof.js:      explicitBaseURL: !!process.env.OPENAI_BASE_URL,
scripts/endToEndDoctrineTurnProof.js:      explicitOrg: !!(process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION),
scripts/endToEndDoctrineTurnProof.js:      explicitProject: !!process.env.OPENAI_PROJECT,
scripts/endToEndDoctrineTurnProof.js:    if (!process.env.OPENAI_API_KEY || !String(process.env.OPENAI_API_KEY).startsWith('sk-')) {
scripts/endToEndDoctrineTurnProof.js:  turn.openaiCalled = !!(dbg.openaiCalled ?? rt.openAiCalled);
scripts/runPhase4HMemoryStressTest.js:    openAi: s.runtime?.openAiCalled,
scripts/runPhase4HMemoryStressTest.js:  process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
scripts/runPhase4HMemoryStressTest.js:  delete process.env.BIBLEBUDDY_DISABLE_OPENAI;
scripts/postOpenAiCoreRestorationSmokeTest.js: * Post-OpenAI core restoration smoke test — requires OPENAI_API_KEY.
scripts/postOpenAiCoreRestorationSmokeTest.js:  if (!dbg.openaiCalled && !s.runtime?.openAiCalled) {
scripts/postOpenAiCoreRestorationSmokeTest.js:    openaiCalled: dbg.openaiCalled ?? structured.runtime?.openAiCalled,
scripts/postOpenAiCoreRestorationSmokeTest.js:  if (!process.env.OPENAI_API_KEY) {
scripts/postOpenAiCoreRestorationSmokeTest.js:    console.error('OPENAI_API_KEY required for post-OpenAI smoke test.');
scripts/postOpenAiCoreRestorationSmokeTest.js:  if (process.env.BUDDY_OPENAI_FIRST === '0') {
scripts/postOpenAiCoreRestorationSmokeTest.js:    console.error('Unset BUDDY_OPENAI_FIRST=0 for core path.');
scripts/phase1BibleLearningValidation.js:  if (!process.env.OPENAI_API_KEY) {
scripts/phase1BibleLearningValidation.js:    check('live_smoke_skipped', true, 'no OPENAI_API_KEY');
scripts/coreRestorationRegressionTest.js: *   OPENAI_API_KEY=... node scripts/coreRestorationRegressionTest.js
scripts/coreRestorationRegressionTest.js:  const hasApiKey = !!process.env.OPENAI_API_KEY;
scripts/coreRestorationRegressionTest.js:  const openAiCalled = !!(
scripts/coreRestorationRegressionTest.js:    structured.runtime?.openAiCalled || structured.coreDebug?.openaiCalled
scripts/coreRestorationRegressionTest.js:  const openAiFail = hasApiKey && !openAiCalled ? 'openAiCalled false' : null;
scripts/coreRestorationRegressionTest.js:    openAiCalled,
scripts/coreRestorationRegressionTest.js:  if (process.env.BUDDY_OPENAI_FIRST === '0') {
scripts/coreRestorationRegressionTest.js:    console.error('BUDDY_OPENAI_FIRST=0 uses master templates. Unset for core restoration test.');
scripts/coreRestorationRegressionTest.js:    console.log(`[${row.pass ? 'PASS' : 'FAIL'}] ${row.id} route=${row.masterRoute} openAi=${row.openAiCalled}`);
scripts/coreRestorationRegressionTest.js:    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
scripts/runPhase4ELiveBrowserPathRegression.js:    openAiCalled: structured.runtime?.openAiCalled,
scripts/runPhase4ELiveBrowserPathRegression.js:      assert(!t1.openAiCalled, 'no OpenAI on death initial'),
scripts/runPhase4ELiveBrowserPathRegression.js:    contChecks.push(assert(!r.openAiCalled, `death cont ${i + 1} no OpenAI`));
scripts/runPhase4ELiveBrowserPathRegression.js:      assert(!t3.openAiCalled, 'no OpenAI acts initial'),
scripts/runPhase4ELiveBrowserPathRegression.js:      assert(!t4.openAiCalled, 'no OpenAI correction'),
scripts/runPhase4ELiveBrowserPathRegression.js:      assert(!t5.openAiCalled, 'no OpenAI challenge'),
scripts/runPhase4ELiveBrowserPathRegression.js:      assert(!t6.openAiCalled, 'no OpenAI memory'),
scripts/runPhase4ELiveBrowserPathRegression.js:      assert(!t7.openAiCalled, 'no OpenAI before that'),
scripts/runPhase4ELiveBrowserPathRegression.js:  const savedKey = process.env.OPENAI_API_KEY;
scripts/runPhase4ELiveBrowserPathRegression.js:  process.env.OPENAI_API_KEY = '';
scripts/runPhase4ELiveBrowserPathRegression.js:        assert(!t8.openAiCalled, 'openAiCalled false'),
scripts/runPhase4ELiveBrowserPathRegression.js:    process.env.OPENAI_API_KEY = savedKey;
scripts/phase2fConversationStressTest.js: * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2fConversationStressTest.js
scripts/phase2fConversationStressTest.js:      : dbg.openaiCalled || rt.openAiCalled
scripts/phase2fConversationStressTest.js:    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
scripts/reasonFirstLiteExperiment.js: *   OPENAI_API_KEY=sk-... node scripts/reasonFirstLiteExperiment.js
scripts/reasonFirstLiteExperiment.js:    lines.push('> **OpenAI unavailable** — lite run could not complete. Re-run with `OPENAI_API_KEY`.');
scripts/reasonFirstLiteExperiment.js:    lines.push('Lite runtime could not call OpenAI in this environment (`OPENAI_API_KEY` not set). Re-run:');
scripts/reasonFirstLiteExperiment.js:    lines.push('OPENAI_API_KEY=sk-... node scripts/reasonFirstLiteExperiment.js');
scripts/reasonFirstLiteExperiment.js:        liteReply: '[Pending — OPENAI_API_KEY required]',
scripts/reasonFirstLiteExperiment.js:        note: 'Run with OPENAI_API_KEY to populate lite replies',
scripts/reasonFirstLiteExperiment.js:  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
scripts/reasonFirstLiteExperiment.js:    console.error('OPENAI_API_KEY required for lite runtime live replies. Current RF loaded from cache only.');
scripts/emotionalCenterPreservationValidation.js: *   OPENAI_API_KEY=sk-... node scripts/emotionalCenterPreservationValidation.js
scripts/emotionalCenterPreservationValidation.js:    lines.push('> Live ECP arm not run — set `OPENAI_API_KEY` and re-run validation.');
scripts/emotionalCenterPreservationValidation.js:  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
```

## Doctrine Authority / Frozen Answer Paths
```
services/doctrineConversationState.js:    lastLane: 'strict_doctrine',
services/doctrineConversationState.js:  } else if (lane === 'strict_doctrine') {
services/liveRequestTrace.js:  if (/doctrine_final_authority|strict_doctrine/i.test(route)) {
services/liveRequestTrace.js:  if (/doctrine_final_authority/i.test(route)) return 'doctrineFinalAuthorityEngine template';
services/bibleReasoningEngine.js:  if (routePlan.lane === 'strict_doctrine') answerLane = 'strict_doctrine';
services/bibleReasoningEngine.js:  else if (strictTopic && routePlan.lane === 'strict_doctrine') answerLane = 'strict_doctrine';
services/bibleReasoningEngine.js:    needsStrictValidation: answerLane === 'strict_doctrine',
services/doctrineFinalAuthorityEngine.js:    admin_flags: ['doctrine_final_authority'],
services/doctrineFinalAuthorityEngine.js:      masterRoute: 'doctrine_final_authority',
services/phase4a4GovernanceActivation.js:    humanApproved: true,
services/phase4a4GovernanceActivation.js:      evidenceVerified: true,
services/phase4a4GovernanceActivation.js:      humanApproved: true,
services/phase4a4GovernanceActivation.js:    evidenceVerified: true,
services/phase4a4GovernanceActivation.js:    humanApproved: true,
services/coreRestorationDebug.js:  doctrineValidatorUsed = false,
services/coreRestorationDebug.js:  scriptureEvidenceUsed = false,
services/coreRestorationDebug.js:  approvedDoctrineFrozen = true,
services/coreRestorationDebug.js:    doctrineValidatorUsed: !!doctrineValidatorUsed,
services/coreRestorationDebug.js:    scriptureEvidenceUsed: !!scriptureEvidenceUsed,
services/coreRestorationDebug.js:    approvedDoctrineFrozen: !!approvedDoctrineFrozen,
services/companionStateEngine.js:  if (routePlan.lane === 'strict_doctrine') mode = 'bible_teacher';
services/thirdScriptureImplementation.js:    humanApproved: true,
services/openAiFirstCompanionRuntime.js:    doctrineValidatorUsed: false,
services/openAiFirstCompanionRuntime.js:    scriptureEvidenceUsed: !!(out.scripture?.length),
services/openAiFirstCompanionRuntime.js:    doctrineValidatorUsed: false,
services/openAiFirstCompanionRuntime.js:    scriptureEvidenceUsed: !!(out.scripture?.length),
services/openAiFirstCompanionRuntime.js:  recordUserTurn(userId, message, 'strict_doctrine');
services/openAiFirstCompanionRuntime.js:    finalAnswerAuthor: route || out.runtime?.masterRoute || 'strict_doctrine_gate',
services/openAiFirstCompanionRuntime.js:    routeUsed: route || out.runtime?.masterRoute || 'strict_doctrine_gate',
services/openAiFirstCompanionRuntime.js:    doctrineValidatorUsed: true,
services/openAiFirstCompanionRuntime.js:    scriptureEvidenceUsed: !!(out.scripture?.length),
services/openAiFirstCompanionRuntime.js:      doctrineValidatorUsed: false,
services/openAiFirstCompanionRuntime.js:      scriptureEvidenceUsed: false,
services/openAiFirstCompanionRuntime.js:    logPhase4eLivePathError({ userId, message, reason: 'openai_blocked_strict_doctrine' });
services/openAiFirstCompanionRuntime.js:        route: 'doctrine_final_authority_openai_block',
services/openAiFirstCompanionRuntime.js:      violations: [{ code: 'openai_blocked', detail: 'strict_doctrine_local_only' }],
services/openAiFirstCompanionRuntime.js:  const scriptureEvidenceUsed = !!(evidencePack.scripture?.references?.length);
services/openAiFirstCompanionRuntime.js:    doctrineValidatorUsed: true,
services/openAiFirstCompanionRuntime.js:    scriptureEvidenceUsed,
services/openAiFirstCompanionRuntime.js:    approvedDoctrineFrozen: true,
services/strictDoctrineGate.js:  if (plan.lane !== 'strict_doctrine' || !plan.strictTopic) {
services/strictDoctrineGate.js:  if (routePlan.lane !== 'strict_doctrine') {
services/strictDoctrineGate.js:      admin_flags: ['strict_doctrine_challenge_rejection'],
services/strictDoctrineGate.js:        masterRoute: 'strict_doctrine_challenge_rejection',
services/strictDoctrineGate.js:      structured: finalizeStrictStructured(structured, 'acts_10', userId, message, 'strict_doctrine_challenge_rejection'),
services/strictDoctrineGate.js:      structured: finalizeStrictStructured(structured, finalAuth.topic, userId, message, 'doctrine_final_authority'),
services/strictDoctrineGate.js:  if (plan.lane !== 'strict_doctrine') {
services/doctrineLivePathHandlers.js:  if (intent === 'memory_recall' && routePlan?.lane !== 'strict_doctrine') {
services/doctrineLivePathHandlers.js:    (intent === 'doctrine_correction' || routePlan?.lane === 'strict_doctrine')
services/companionDoctrineRouter.js:    return 'strict_doctrine_direct';
services/companionDoctrineRouter.js:      return 'strict_doctrine_direct';
services/companionDoctrineRouter.js:  if (intent === 'strict_doctrine_direct') return false;
services/companionDoctrineRouter.js:  if (intent === 'strict_doctrine_direct') {
services/companionDoctrineRouter.js:    lane = 'strict_doctrine';
services/companionDoctrineRouter.js:  } else if (intent === 'strict_doctrine_direct' && messageTopic) {
services/companionDoctrineRouter.js:    lane = 'strict_doctrine';
services/companionDoctrineRouter.js:    intent === 'strict_doctrine_direct' &&
services/companionDoctrineRouter.js:    lane = 'strict_doctrine';
services/companionDoctrineRouter.js:    lane = bibleConcept.strictTopic ? 'strict_doctrine' : 'bible_wide';
services/companionDoctrineRouter.js:    lane = bibleConcept.strictTopic && !CONTINUATION_PHRASE_RE.test(m) ? 'strict_doctrine' : 'bible_wide';
services/companionDoctrineRouter.js:    lane = 'strict_doctrine';
services/companionDoctrineRouter.js:    lane = 'strict_doctrine';
services/companionDoctrineRouter.js:  if (shouldRouteToCompanion(message, context) && lane !== 'strict_doctrine' && lane !== 'bible_wide') {
services/bibleCompanionOrchestrator.js:      orchestratorLane: 'strict_doctrine',
services/secondScriptureImplementation.js:    humanApproved: true,
services/firstScriptureImplementation.js:    humanApproved: true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": false,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": false,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": false,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": false,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": false,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": false,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": false,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "doctrineValidatorUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "scriptureEvidenceUsed": true,
docs/regression-trace/emergency-hard-cutover-root-cause-results.json:      "approvedDoctrineFrozen": true,
docs/regression-trace/ui-contract-reproduce-logos.json:  "rawResponseBody": "{\"ok\":true,\"reply\":{\"reply\":\"I'm having trouble reaching the AI service right now. Please try again in a moment.\",\"scripture\":[],\"mode\":\"companion\",\"confidence\":\"low\",\"memory_used\":false,\"safety_level\":\"standard\",\"admin_flags\":[\"core_connection_error\"],\"runtime\":{\"masterRoute\":\"core_connection_error\",\"openAiCalled\":false,\"connectionError\":\"401 Incorrect API key provided: sk-proj-********************************************************************************\",\"buildConnectionErrorReplyUsed\":true,\"companionPresentation\":{\"skipRelationshipEnrichment\":true,\"skipStudyPrompts\":true},\"buddyRuntime\":\"core_openai_first\",\"evidenceTopic\":\"messiah_logos\",\"routingHintsOnly\":true,\"currentIntent\":\"meaning_word_study\",\"historyAllowed\":false,\"validation\":{\"passed\":false,\"doctrineValidationResult\":\"skipped\",\"issues\":[\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\"]},\"regenerated\":false,\"ownershipGuard\":{\"passed\":false,\"issues\":[\"openai_not_called\"],\"currentQuestionMatch\":0,\"studyLoopUsed\":false,\"templateUsed\":false,\"regenInstruction\":null,\"allowConnectionFallback\":true},\"directnessGuard\":{\"passed\":false,\"issues\":[\"not_openai_authored\",\"missing_word_study\"],\"forbiddenPhraseDetected\":false,\"forbiddenHits\":[],\"answerMatchesLatestQuestion\":false,\"correctionRepair\":true,\"historyAllowed\":false,\"regenInstruction\":\"Answer the latest user question directly. Use evidence silently. Do not use template language, study continuation, prior-topic continuation, or history unless asked.\"},\"coreDebug\":{\"runtimeUsed\":\"core_openai_first\",\"currentIntent\":\"meaning_word_study\",\"historyAllowed\":false,\"evidenceCardsUsed\":true,\"openaiCalled\":false,\"openaiResponseReceived\":false,\"finalAnswerAuthor\":\"connection_error\",\"templateUsed\":false,\"fallbackUsed\":true,\"studyFallbackUsed\":false,\"responderUsed\":false,\"relationshipEnrichmentUsed\":false,\"sourceGroundedResponderUsed\":false,\"sabbathHistoryDeepResponderUsed\":false,\"forbiddenPhraseDetected\":false,\"answerMatchesLatestQuestion\":false,\"regenerated\":false,\"routeUsed\":\"core_connection_error\",\"studyLoopUsed\":false,\"prayerTemplateUsed\":false,\"scriptureWitnessTemplateUsed\":false,\"doctrineValidatorUsed\":true,\"scriptureEvidenceUsed\":false,\"activeTopicUsedAsContextOnly\":true,\"evidenceTopic\":\"messiah_logos\",\"validationPassed\":false,\"validationIssues\":[\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\"],\"errorMessage\":\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\",\"approvedDoctrineFrozen\":true,\"discoveryReinforcementCount\":1,\"buildConnectionErrorReplyUsed\":true,\"correctionRepair\":true}},\"quality\":{\"score\":100,\"issues\":[],\"passed\":true},\"coreDebug\":{\"runtimeUsed\":\"core_openai_first\",\"currentIntent\":\"meaning_word_study\",\"historyAllowed\":false,\"evidenceCardsUsed\":true,\"openaiCalled\":false,\"openaiResponseReceived\":false,\"finalAnswerAuthor\":\"connection_error\",\"templateUsed\":false,\"fallbackUsed\":true,\"studyFallbackUsed\":false,\"responderUsed\":false,\"relationshipEnrichmentUsed\":false,\"sourceGroundedResponderUsed\":false,\"sabbathHistoryDeepResponderUsed\":false,\"forbiddenPhraseDetected\":false,\"answerMatchesLatestQuestion\":false,\"regenerated\":false,\"routeUsed\":\"core_connection_error\",\"studyLoopUsed\":false,\"prayerTemplateUsed\":false,\"scriptureWitnessTemplateUsed\":false,\"doctrineValidatorUsed\":true,\"scriptureEvidenceUsed\":false,\"activeTopicUsedAsContextOnly\":true,\"evidenceTopic\":\"messiah_logos\",\"validationPassed\":false,\"validationIssues\":[\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\"],\"errorMessage\":\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\",\"approvedDoctrineFrozen\":true,\"discoveryReinforcementCount\":1,\"buildConnectionErrorReplyUsed\":true,\"correctionRepair\":true},\"liveRequestTrace\":{\"ts\":\"2026-06-06T05:21:33.173Z\",\"messagePreview\":\"What does Logos mean in John 1:1?\",\"httpStatus\":200,\"latencyMs\":511,\"runtimeUsed\":\"core_openai_first\",\"currentIntent\":\"meaning_word_study\",\"historyAllowed\":false,\"routeUsed\":\"core_connection_error\",\"openaiCalled\":false,\"openaiResponseReceived\":false,\"finalAnswerAuthor\":\"connection_error\",\"templateUsed\":false,\"fallbackUsed\":true,\"studyFallbackUsed\":false,\"responderUsed\":false,\"forbiddenPhraseDetected\":false,\"answerMatchesLatestQuestion\":false,\"regenerated\":false,\"sourceGroundedResponderUsed\":false,\"sabbathHistoryDeepResponderUsed\":false,\"buildConnectionErrorReplyUsed\":true,\"relationshipEnrichmentUsed\":false,\"evidenceCardsUsed\":true,\"errorName\":\"OpenAIAuthError\",\"errorMessage\":\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. Yo\",\"memoryUsage\":{\"heapUsedMB\":30,\"rssMB\":118},\"violations\":[],\"replyPreview\":\"I'm having trouble reaching the AI service right now. Please try again in a moment.\"}}}",
docs/regression-trace/ui-contract-reproduce-logos.json:          "doctrineValidatorUsed": true,
docs/regression-trace/ui-contract-reproduce-logos.json:          "scriptureEvidenceUsed": false,
docs/regression-trace/ui-contract-reproduce-logos.json:          "approvedDoctrineFrozen": true,
docs/regression-trace/ui-contract-reproduce-logos.json:        "doctrineValidatorUsed": true,
docs/regression-trace/ui-contract-reproduce-logos.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/ui-contract-reproduce-logos.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/ui-contract-reproduce-logos.json:          "doctrineValidatorUsed": true,
docs/regression-trace/ui-contract-reproduce-logos.json:          "scriptureEvidenceUsed": false,
docs/regression-trace/ui-contract-reproduce-logos.json:          "approvedDoctrineFrozen": true,
docs/regression-trace/ui-contract-reproduce-logos.json:        "doctrineValidatorUsed": true,
docs/regression-trace/ui-contract-reproduce-logos.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/ui-contract-reproduce-logos.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/live-response-capture-run.json:    "rawBody": "{\"ok\":true,\"reply\":{\"reply\":\"I'm having trouble reaching the AI service right now. Please try again in a moment.\",\"scripture\":[],\"mode\":\"companion\",\"confidence\":\"low\",\"memory_used\":false,\"safety_level\":\"standard\",\"admin_flags\":[\"core_connection_error\"],\"runtime\":{\"masterRoute\":\"core_connection_error\",\"openAiCalled\":false,\"connectionError\":\"401 Incorrect API key provided: sk-proj-********************************************************************************\",\"buildConnectionErrorReplyUsed\":true,\"companionPresentation\":{\"skipRelationshipEnrichment\":true,\"skipStudyPrompts\":true},\"buddyRuntime\":\"core_openai_first\",\"evidenceTopic\":\"messiah_logos\",\"routingHintsOnly\":true,\"currentIntent\":\"meaning_word_study\",\"historyAllowed\":false,\"validation\":{\"passed\":false,\"doctrineValidationResult\":\"skipped\",\"issues\":[\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\"]},\"regenerated\":false,\"ownershipGuard\":{\"passed\":false,\"issues\":[\"openai_not_called\"],\"currentQuestionMatch\":0,\"studyLoopUsed\":false,\"templateUsed\":false,\"regenInstruction\":null,\"allowConnectionFallback\":true},\"directnessGuard\":{\"passed\":false,\"issues\":[\"not_openai_authored\",\"missing_word_study\"],\"forbiddenPhraseDetected\":false,\"forbiddenHits\":[],\"answerMatchesLatestQuestion\":false,\"correctionRepair\":true,\"historyAllowed\":false,\"regenInstruction\":\"Answer the latest user question directly. Use evidence silently. Do not use template language, study continuation, prior-topic continuation, or history unless asked.\"},\"coreDebug\":{\"runtimeUsed\":\"core_openai_first\",\"currentIntent\":\"meaning_word_study\",\"historyAllowed\":false,\"evidenceCardsUsed\":true,\"openaiCalled\":false,\"openaiResponseReceived\":false,\"finalAnswerAuthor\":\"connection_error\",\"templateUsed\":false,\"fallbackUsed\":true,\"studyFallbackUsed\":false,\"responderUsed\":false,\"relationshipEnrichmentUsed\":false,\"sourceGroundedResponderUsed\":false,\"sabbathHistoryDeepResponderUsed\":false,\"forbiddenPhraseDetected\":false,\"answerMatchesLatestQuestion\":false,\"regenerated\":false,\"routeUsed\":\"core_connection_error\",\"studyLoopUsed\":false,\"prayerTemplateUsed\":false,\"scriptureWitnessTemplateUsed\":false,\"doctrineValidatorUsed\":true,\"scriptureEvidenceUsed\":false,\"activeTopicUsedAsContextOnly\":true,\"evidenceTopic\":\"messiah_logos\",\"validationPassed\":false,\"validationIssues\":[\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\"],\"errorMessage\":\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\",\"approvedDoctrineFrozen\":true,\"discoveryReinforcementCount\":1,\"buildConnectionErrorReplyUsed\":true,\"correctionRepair\":true}},\"quality\":{\"score\":100,\"issues\":[],\"passed\":true},\"coreDebug\":{\"runtimeUsed\":\"core_openai_first\",\"currentIntent\":\"meaning_word_study\",\"historyAllowed\":false,\"evidenceCardsUsed\":true,\"openaiCalled\":false,\"openaiResponseReceived\":false,\"finalAnswerAuthor\":\"connection_error\",\"templateUsed\":false,\"fallbackUsed\":true,\"studyFallbackUsed\":false,\"responderUsed\":false,\"relationshipEnrichmentUsed\":false,\"sourceGroundedResponderUsed\":false,\"sabbathHistoryDeepResponderUsed\":false,\"forbiddenPhraseDetected\":false,\"answerMatchesLatestQuestion\":false,\"regenerated\":false,\"routeUsed\":\"core_connection_error\",\"studyLoopUsed\":false,\"prayerTemplateUsed\":false,\"scriptureWitnessTemplateUsed\":false,\"doctrineValidatorUsed\":true,\"scriptureEvidenceUsed\":false,\"activeTopicUsedAsContextOnly\":true,\"evidenceTopic\":\"messiah_logos\",\"validationPassed\":false,\"validationIssues\":[\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\"],\"errorMessage\":\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. You can find your API key at https://platform.openai.com/account/api-keys.\",\"approvedDoctrineFrozen\":true,\"discoveryReinforcementCount\":1,\"buildConnectionErrorReplyUsed\":true,\"correctionRepair\":true},\"liveRequestTrace\":{\"ts\":\"2026-06-06T05:29:19.171Z\",\"messagePreview\":\"What does Logos mean in John 1:1?\",\"httpStatus\":200,\"latencyMs\":563,\"runtimeUsed\":\"core_openai_first\",\"currentIntent\":\"meaning_word_study\",\"historyAllowed\":false,\"routeUsed\":\"core_connection_error\",\"openaiCalled\":false,\"openaiResponseReceived\":false,\"finalAnswerAuthor\":\"connection_error\",\"templateUsed\":false,\"fallbackUsed\":true,\"studyFallbackUsed\":false,\"responderUsed\":false,\"forbiddenPhraseDetected\":false,\"answerMatchesLatestQuestion\":false,\"regenerated\":false,\"sourceGroundedResponderUsed\":false,\"sabbathHistoryDeepResponderUsed\":false,\"buildConnectionErrorReplyUsed\":true,\"relationshipEnrichmentUsed\":false,\"evidenceCardsUsed\":true,\"errorName\":\"OpenAIAuthError\",\"errorMessage\":\"401 Incorrect API key provided: sk-proj-********************************************************************************************************************************************************nWEA. Yo\",\"memoryUsage\":{\"heapUsedMB\":40,\"rssMB\":137},\"violations\":[],\"replyPreview\":\"I'm having trouble reaching the AI service right now. Please try again in a moment.\"}}}",
docs/regression-trace/live-response-capture-run.json:            "doctrineValidatorUsed": true,
docs/regression-trace/live-response-capture-run.json:            "scriptureEvidenceUsed": false,
docs/regression-trace/live-response-capture-run.json:            "approvedDoctrineFrozen": true,
docs/regression-trace/live-response-capture-run.json:          "doctrineValidatorUsed": true,
docs/regression-trace/live-response-capture-run.json:          "scriptureEvidenceUsed": false,
docs/regression-trace/live-response-capture-run.json:          "approvedDoctrineFrozen": true,
docs/regression-trace/live-response-capture-run.json:            "doctrineValidatorUsed": true,
docs/regression-trace/live-response-capture-run.json:            "scriptureEvidenceUsed": false,
docs/regression-trace/live-response-capture-run.json:            "approvedDoctrineFrozen": true,
docs/regression-trace/live-response-capture-run.json:          "doctrineValidatorUsed": true,
docs/regression-trace/live-response-capture-run.json:          "scriptureEvidenceUsed": false,
docs/regression-trace/live-response-capture-run.json:          "approvedDoctrineFrozen": true,
docs/regression-trace/live-response-capture-run.json:            "doctrineValidatorUsed": true,
docs/regression-trace/live-response-capture-run.json:            "scriptureEvidenceUsed": false,
docs/regression-trace/live-response-capture-run.json:            "approvedDoctrineFrozen": true,
docs/regression-trace/live-response-capture-run.json:          "doctrineValidatorUsed": true,
docs/regression-trace/live-response-capture-run.json:          "scriptureEvidenceUsed": false,
docs/regression-trace/live-response-capture-run.json:          "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bible-only-authority-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bible-only-authority-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bae-phase1a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bae-phase1a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bae-phase1a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bae-phase1a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bae-phase1a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bae-phase1a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/bae-phase1a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bae-phase1a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/bae-phase1a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/bae-phase1a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/bae-phase1a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase4g-parity-results.json:      "route": "doctrine_final_authority",
docs/regression-trace/phase4g-parity-results.json:      "route": "strict_doctrine_challenge_rejection",
docs/regression-trace/phase4g-parity-results.json:      "route": "doctrine_final_authority",
docs/regression-trace/phase4g-parity-results.json:      "route": "doctrine_final_authority",
docs/regression-trace/phase4g-parity-results.json:      "route": "doctrine_final_authority",
docs/regression-trace/empty-reply-trace-logos.json:            "doctrineValidatorUsed": true,
docs/regression-trace/empty-reply-trace-logos.json:            "scriptureEvidenceUsed": false,
docs/regression-trace/empty-reply-trace-logos.json:            "approvedDoctrineFrozen": true,
docs/regression-trace/empty-reply-trace-logos.json:          "doctrineValidatorUsed": true,
docs/regression-trace/empty-reply-trace-logos.json:          "scriptureEvidenceUsed": false,
docs/regression-trace/empty-reply-trace-logos.json:          "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "doctrineValidatorUsed": true,
docs/regression-trace/phase1-stability-phase2a-results.json:        "scriptureEvidenceUsed": false,
docs/regression-trace/phase1-stability-phase2a-results.json:        "approvedDoctrineFrozen": true,
docs/evidence-candidates/first-implementation-applied.json:  "humanApproved": true,
docs/evidence-candidates/scripture-chain-library.json:          "humanApproved": true,
docs/evidence-candidates/scripture-chain-library.json:          "humanApproved": true,
docs/evidence-candidates/scripture-chain-library.json:          "humanApproved": true,
docs/evidence-candidates/Phase4A4GovernanceActivationReport.json:      "evidenceVerified": true,
docs/evidence-candidates/Phase4A4GovernanceActivationReport.json:      "humanApproved": true,
docs/evidence-candidates/Phase4A4GovernanceActivationReport.json:      "evidenceVerified": true,
docs/evidence-candidates/Phase4A4GovernanceActivationReport.json:      "humanApproved": true,
docs/evidence-candidates/Phase4A4GovernanceActivationReport.json:      "evidenceVerified": true,
docs/evidence-candidates/Phase4A4GovernanceActivationReport.json:      "humanApproved": true,
docs/evidence-candidates/Phase4A4GovernanceActivationReport.json:      "evidenceVerified": true,
docs/evidence-candidates/Phase4A4GovernanceActivationReport.json:      "humanApproved": true,
docs/evidence-candidates/third-implementation-applied.json:  "humanApproved": true,
docs/evidence-candidates/second-implementation-applied.json:  "humanApproved": true,
scripts/runPhase5M5UnifiedIntentAuthorityRegression.js:        !/doctrine_final_authority/i.test(r.masterRoute) &&
scripts/runPhase5M5UnifiedIntentAuthorityRegression.js:        /doctrine_final_authority|strict_doctrine/i.test(r.masterRoute || ''),
scripts/runConversationArchitectureAudit.sh:grep -R "doctrine_final_authority\|strict_doctrine\|approvedDoctrineFrozen\|evidenceVerified\|humanApproved\|scriptureEvidenceUsed\|doctrineValidatorUsed" services docs scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
scripts/runPhase4D3LiveCompanionRealPathRegression.js:      assert(t1.route === 'doctrine_final_authority' || !t1.openAiCalled, 'no OpenAI doctrine reasoning'),
scripts/runPhase4D3LiveCompanionRealPathRegression.js:      assert(t5.route === 'doctrine_final_authority' || !t5.openAiCalled, 'final authority path'),
scripts/runPhase4D3LiveCompanionRealPathRegression.js:    '- Strict doctrine initial: `doctrine_final_authority` (NO OpenAI)',
scripts/traceLiveBuddyRoute.js:      /strict_doctrine|doctrine_final_authority|doctrine_before_that|doctrine_memory/i.test(
```

## Memory / Stale Topic Risk
```
services/doctrineConversationState.js:    activeDoctrineTopic: null,
services/doctrineConversationState.js:    previousDoctrineTopic: null,
services/doctrineConversationState.js:    lastAnsweredTopic: null,
services/doctrineConversationState.js:    lastAnsweredConcept: null,
services/doctrineConversationState.js:    turnMemory: {
services/doctrineConversationState.js:      lastAnsweredConcept: null,
services/doctrineConversationState.js:    sessionMemory: {
services/doctrineConversationState.js:      activeConcept: null,
services/doctrineConversationState.js:  const topicChanged = prev.activeDoctrineTopic && prev.activeDoctrineTopic !== topic;
services/doctrineConversationState.js:    ? [...(prev.topicHistory || []), prev.activeDoctrineTopic].filter(Boolean).slice(-8)
services/doctrineConversationState.js:    activeDoctrineTopic: topic,
services/doctrineConversationState.js:    previousDoctrineTopic: topicChanged ? prev.activeDoctrineTopic : prev.previousDoctrineTopic,
services/doctrineConversationState.js:    lastAnsweredTopic: topic,
services/doctrineConversationState.js:    lastAnsweredConcept: topic === 'kingdom' ? 'kingdom_on_earth' : topic === 'dietary_law' ? 'dietary_pork_unclean' : topic === 'sabbath' ? 'sabbath_seventh_day' : null,
services/doctrineConversationState.js:  const releasedTopic = prev.activeDoctrineTopic || null;
services/doctrineConversationState.js:    activeDoctrineTopic: null,
services/doctrineConversationState.js:    previousDoctrineTopic: prev.previousDoctrineTopic,
services/doctrineConversationState.js:    lastAnsweredConcept: blockContinuation ? null : prev.lastAnsweredConcept,
services/doctrineConversationState.js:    lastAnsweredTopic: blockContinuation ? null : prev.lastAnsweredTopic,
services/doctrineConversationState.js:  return getDoctrineConversationState(userId).activeDoctrineTopic || null;
services/doctrineConversationState.js:  const turn = { ...(state.turnMemory || {}), ...patch };
services/doctrineConversationState.js:    ...(state.sessionMemory || {}),
services/doctrineConversationState.js:    activeConcept: patch.lastAnsweredConcept || state.sessionMemory?.activeConcept,
services/doctrineConversationState.js:    pendingQuestion: patch.lastUserQuestion || state.sessionMemory?.pendingQuestion,
services/doctrineConversationState.js:    turnMemory: turn,
services/doctrineConversationState.js:    sessionMemory: session,
services/doctrineConversationState.js:    lastAnsweredConcept: patch.lastAnsweredConcept || state.lastAnsweredConcept,
services/doctrineConversationState.js:    activeDoctrineTopic: null,
services/doctrineConversationState.js:    lastAnsweredConcept: null,
services/doctrineConversationState.js:    lastAnsweredTopic: null,
services/doctrineConversationState.js:    sessionMemory: {
services/doctrineConversationState.js:      ...(prev.sessionMemory || {}),
services/doctrineConversationState.js:      activeConcept: null,
services/liveRequestTrace.js:      doctrineState.lastAnsweredConcept ||
services/liveRequestTrace.js:      doctrineState.sessionMemory?.activeConcept ||
services/bibleReasoningEngine.js:    lastAnsweredConcept: state.lastAnsweredConcept || context.lastAnsweredConcept,
services/companionIntentIntelligence.js:    state.lastAnsweredConcept ||
services/companionIntentIntelligence.js:    state.turnMemory?.lastAnsweredConcept ||
services/companionIntentIntelligence.js:    state.sessionMemory?.activeConcept ||
services/companionIntentIntelligence.js:      return 'dietary_pork_unclean';
services/companionIntentIntelligence.js:    (state.lastAnsweredTopic === 'dietary_law' ? 'dietary_pork_unclean' : null) ||
services/companionIntentIntelligence.js:    (state.lastAnsweredTopic === 'acts_10' ? 'acts_10_people_not_food' : null) ||
services/companionIntentIntelligence.js:    state.lastAnsweredConcept ||
services/companionIntentIntelligence.js:    state.turnMemory?.lastAnsweredConcept ||
services/companionIntentIntelligence.js:    state.sessionMemory?.activeConcept ||
services/companionIntentIntelligence.js:    state.activeDoctrineTopic ||
services/companionIntentIntelligence.js:    state.lastAnsweredTopic
services/companionIntentIntelligence.js:    state.lastAnsweredConcept ||
services/companionIntentIntelligence.js:    state.sessionMemory?.activeConcept ||
services/companionIntentIntelligence.js:    (NERVOUS_BARE_RE.test(m) && (state.familyConversationContext || state.sessionMemory?.familyContext)) ||
services/companionIntentIntelligence.js:  if (NERVOUS_BARE_RE.test(m) && (state.familyConversationContext || state.sessionMemory?.familyContext)) return true;
services/companionIntentIntelligence.js:  if (NERVOUS_FAMILY_RE.test(m) || (NERVOUS_BARE_RE.test(m) && (state.familyConversationContext || state.sessionMemory?.familyContext))) {
services/companionIntentIntelligence.js:      conceptId: conceptId || 'dietary_pork_unclean',
services/companionIntentIntelligence.js:      conceptId: conceptId || 'dietary_pork_unclean',
services/companionMemoryManager.js:        relationship.currentStruggle || state.sessionMemory?.currentStruggle || null,
services/companionMemoryManager.js:        state.lastAnsweredConcept ||
services/companionMemoryManager.js:        state.turnMemory?.lastAnsweredConcept ||
services/companionMemoryManager.js:        state.sessionMemory?.activeConcept ||
services/companionMemoryManager.js:      lastRefsShown: state.turnMemory?.lastRefsShown || [],
services/companionMemoryManager.js:    turnMemory: {
services/companionMemoryManager.js:      ...(state.turnMemory || {}),
services/companionMemoryManager.js:      lastAnsweredConcept: context.priorTopic || answer.conceptId || null,
services/companionMemoryManager.js:    lastAnsweredConcept: context.priorTopic || answer.conceptId || state.lastAnsweredConcept,
services/companionMemoryManager.js:    sessionMemory: {
services/companionMemoryManager.js:      ...(state.sessionMemory || {}),
services/companionMemoryManager.js:      activeConcept: context.priorTopic || state.sessionMemory?.activeConcept,
services/companionMemoryManager.js:      currentStruggle: context.currentStruggle || state.sessionMemory?.currentStruggle,
services/companionMemoryManager.js:      familyContext: context.familyConversationContext || state.sessionMemory?.familyContext,
services/companionMemoryManager.js:      lastScripture: refs[0] || state.sessionMemory?.lastScripture,
services/companionMemoryManager.js:    sessionPatch.lastAnsweredConcept = context.priorTopic;
services/practicalWisdomEngine.js:  const sm = state.sessionMemory || {};
services/practicalWisdomEngine.js:    sm.activeConcept,
services/practicalWisdomEngine.js:    state.lastAnsweredConcept,
services/practicalWisdomEngine.js:    'dietary_pork_unclean',
services/practicalWisdomEngine.js:  return 'dietary_pork_unclean';
services/bibleWideReasoningEngine.js:    lastAnsweredConcept: state.lastAnsweredConcept || state.activeBibleConcept || null,
services/bibleWideReasoningEngine.js:    lastAnsweredConcept: conceptId,
services/bibleWideReasoningEngine.js:    activeDoctrineTopic: null,
services/bibleWideReasoningEngine.js:    lastAnsweredConcept: state.lastAnsweredConcept || state.activeBibleConcept,
services/practicalGuidanceEngine.js:    (state.familyConversationContext || state.sessionMemory?.familyContext)
services/practicalGuidanceEngine.js:  if (id === 'dietary_pork_unclean' || id === 'dietary_law' || id === 'dietary_clean_unclean') {
services/practicalGuidanceEngine.js:  if (id === 'dietary_pork_unclean' || id === 'dietary_law') {
services/practicalGuidanceEngine.js:    const fam = buildFamilyExplanation({ concept: conceptId || 'dietary_pork_unclean' });
services/openAiFirstCompanionRuntime.js:    mergedState.sessionMemory?.activeConcept ||
services/openAiFirstCompanionRuntime.js:    mergedState.lastAnsweredConcept ||
services/companionResponseBuilder.js:  const conceptId = plan.conceptId || plan.relationshipContext?.priorTopic || 'dietary_pork_unclean';
services/strictDoctrineGate.js:    activeDoctrineTopic: getDoctrineConversationState(userId).activeDoctrineTopic,
services/strictDoctrineGate.js:    previousDoctrineTopic: getDoctrineConversationState(userId).previousDoctrineTopic,
services/strictDoctrineGate.js:      activeDoctrineTopic: activeTopic,
services/doctrineLivePathHandlers.js:  let topic = beforeThat ? state.previousDoctrineTopic : state.activeDoctrineTopic;
services/doctrineLivePathHandlers.js:      topic === state.lastAnsweredTopic || topic === state.activeDoctrineTopic
services/doctrineLivePathHandlers.js:      topic === state.lastAnsweredTopic || topic === state.activeDoctrineTopic
services/companionPresenceEngine.js:    state.sessionMemory?.familyContext;
services/companionDoctrineRouter.js:    activeDoctrineTopic: state.activeDoctrineTopic || null,
services/companionDoctrineRouter.js:    lastAnsweredTopic: state.lastAnsweredTopic || state.activeDoctrineTopic || null,
services/companionDoctrineRouter.js:    lastAnsweredConcept: state.lastAnsweredConcept || state.activeBibleConcept || null,
services/companionDoctrineRouter.js:    previousDoctrineTopic: state.previousDoctrineTopic || null,
services/companionDoctrineRouter.js:  if (/\bwhy (are you|did you) say\b/i.test(m) && context.activeDoctrineTopic) {
services/companionDoctrineRouter.js:  if (context.activeDoctrineTopic) return context.activeDoctrineTopic;
services/companionDoctrineRouter.js:  if (recentNonDoctrine && context.lastAnsweredTopic) return context.lastAnsweredTopic;
services/companionDoctrineRouter.js:  if (shouldClearStaleTopic(message, context.activeDoctrineTopic || context.activeBibleConcept, context)) {
services/companionDoctrineRouter.js:  if (intent === 'companion_general' && context.activeDoctrineTopic) return true;
services/companionDoctrineRouter.js:  if (intent === 'unclear' && context.activeDoctrineTopic) return true;
services/companionDoctrineRouter.js:    context.activeDoctrineTopic &&
services/companionDoctrineRouter.js:    newTopic !== context.activeDoctrineTopic &&
services/companionDoctrineRouter.js:    context.activeDoctrineTopic &&
services/companionDoctrineRouter.js:  if (!context.activeDoctrineTopic) return true;
services/companionDoctrineRouter.js:  if (newTopic !== context.activeDoctrineTopic && !shouldUseActiveDoctrineTopic(m, context)) {
services/companionDoctrineRouter.js:      const topicLabel = context.lastAnsweredTopic
services/companionDoctrineRouter.js:        ? TOPIC_LABELS[context.lastAnsweredTopic] || String(context.lastAnsweredTopic).replace(/_/g, ' ')
services/companionDoctrineRouter.js:  if (bareContinuation && !context.activeDoctrineTopic && !context.activeBibleConcept) {
services/companionDoctrineRouter.js:      : context.lastAnsweredConcept ||
services/companionDoctrineRouter.js:        mapTopicToConceptId(context.lastAnsweredTopic) ||
services/companionDoctrineRouter.js:      context.previousDoctrineTopic ||
services/companionDoctrineRouter.js:          !context.activeDoctrineTopic &&
services/bibleWordSenseEngine.js:    context.lastAnsweredConcept === 'abomination_desolation' &&
services/humanNeedDetector.js:  if (/\b(what we were talking about|about what we talked)\b/i.test(m) && (state.lastAnsweredConcept || state.sessionMemory?.activeConcept)) {
services/buddyBrain.js:        sessionMemory: { ...(doctrineState.sessionMemory || {}), alphaTestingContext: true },
services/bibleCompanionOrchestrator.js:    mergedState.sessionMemory?.activeConcept ||
services/bibleCompanionOrchestrator.js:    mergedState.lastAnsweredConcept ||
services/bibleCompanionOrchestrator.js:      ? 'dietary_pork_unclean'
services/bibleCompanionOrchestrator.js:    turnMemory: {
services/bibleCompanionOrchestrator.js:      ...(getDoctrineConversationState(userId).turnMemory || {}),
services/bibleCompanionOrchestrator.js:      lastAnsweredConcept: mapped,
services/bibleCompanionOrchestrator.js:    lastAnsweredConcept: mapped,
services/bibleCompanionOrchestrator.js:      lastAnsweredConcept: mapped,
services/bibleCompanionOrchestrator.js:      sessionMemory: {
services/bibleCompanionOrchestrator.js:        ...(getDoctrineConversationState(userId).sessionMemory || {}),
services/bibleCompanionOrchestrator.js:        activeConcept: mapped,
services/bibleCompanionOrchestrator.js:      mergedState.sessionMemory?.activeConcept ||
services/bibleCompanionOrchestrator.js:      mergedState.lastAnsweredConcept ||
services/bibleCompanionOrchestrator.js:    mergedState.sessionMemory = { ...(mergedState.sessionMemory || {}), alphaTestingContext: true };
services/bibleCompanionOrchestrator.js:    updateDoctrineConversationState(userId, { sessionMemory: mergedState.sessionMemory });
services/bibleCompanionOrchestrator.js:      sessionMemory: {
services/bibleCompanionOrchestrator.js:        ...(mergedState.sessionMemory || {}),
services/bibleCompanionOrchestrator.js:        activeConcept: conversationAnchor.currentDoctrineConcept,
services/bibleCompanionOrchestrator.js:        currentStruggle: conversationAnchor.currentEmotion || mergedState.sessionMemory?.currentStruggle,
services/bibleCompanionOrchestrator.js:  if (humanNeed === 'correction_repair' && mergedState.lastAnsweredConcept) {
services/bibleCompanionOrchestrator.js:    companionIntent.conceptId = mergedState.lastAnsweredConcept;
services/bibleCompanionOrchestrator.js:    lastAnsweredConcept: reasoningPlan.context?.lastAnsweredConcept,
services/bibleCompanionOrchestrator.js:    lastAnsweredTopic: reasoningPlan.context?.lastAnsweredTopic,
services/bibleCompanionOrchestrator.js:      mergedState.lastAnsweredConcept;
services/scriptureReasoningPlanner.js:  dietary_pork_unclean: [
services/scriptureReasoningPlanner.js:    node?.id === 'dietary_pork_unclean'
services/bibleConceptConcordance.js:  dietary_pork_unclean: {
services/bibleConceptConcordance.js:    id: 'dietary_pork_unclean',
services/bibleConceptConcordance.js:    'dietary_pork_unclean',
services/followUpContextResolver.js:    dietary_law: 'dietary_pork_unclean',
services/followUpContextResolver.js:    context.lastAnsweredConcept ||
services/followUpContextResolver.js:    mapTopicToConceptId(context.lastAnsweredTopic) ||
services/noGlitchTurnContract.js:    state.activeDoctrineTopic ||
services/noGlitchTurnContract.js:    state.lastAnsweredConcept ||
services/noGlitchTurnContract.js:    state.lastAnsweredTopic ||
services/noGlitchTurnContract.js:      conceptId: concept?.id || state.lastAnsweredConcept || null,
services/noGlitchTurnContract.js:      strictTopic: state.activeDoctrineTopic || null,
services/noGlitchTurnContract.js:      strictTopic: state.previousDoctrineTopic || state.lastStrictDoctrineTopic || null,
services/noGlitchTurnContract.js:      conceptId: state.lastAnsweredConcept || null,
services/noGlitchTurnContract.js:      strictTopic: state.lastAnsweredTopic || state.lastStrictDoctrineTopic || null,
services/noGlitchTurnContract.js:      conceptId: state.lastAnsweredConcept || null,
services/noGlitchTurnContract.js:      strictTopic: state.lastAnsweredTopic || state.lastStrictDoctrineTopic || null,
services/noGlitchTurnContract.js:          state.lastAnsweredConcept ||
services/noGlitchTurnContract.js:          state.lastAnsweredTopic ||
services/noGlitchTurnContract.js:        strictTopic: state.activeDoctrineTopic || state.lastStrictDoctrineTopic || continuationStrict,
services/relationshipContextModel.js:  if (state.sessionMemory?.currentStruggle) return state.sessionMemory.currentStruggle;
services/relationshipContextModel.js:  if (/\b(them|they)\b/.test(m) && (state.familyConversationContext || priorTopic === 'dietary_pork_unclean')) {
services/relationshipContextModel.js:    state.lastAnsweredConcept ||
services/relationshipContextModel.js:    state.sessionMemory?.activeConcept ||
services/relationshipContextModel.js:      state.turnMemory?.lastRefsShown?.[0] ||
services/relationshipContextModel.js:      state.sessionMemory?.lastScripture ||
services/singleCompanionContract.js:  const sm = state.sessionMemory || {};
services/singleCompanionContract.js:    sm.activeConcept,
services/singleCompanionContract.js:    state.lastAnsweredConcept,
services/singleCompanionContract.js:    state.turnMemory?.lastAnsweredConcept,
services/singleCompanionContract.js:  return sm.activeConcept || state.lastAnsweredConcept || 'dietary_pork_unclean';
services/singleCompanionContract.js:    state.lastAnsweredConcept ||
services/singleCompanionContract.js:    state.sessionMemory?.activeConcept ||
services/singleCompanionContract.js:    state.sessionMemory?.familyContext
services/singleCompanionContract.js:  const sm = state.sessionMemory || {};
services/singleCompanionContract.js:      state.sessionMemory?.familyContext
services/bibleSemanticConceptNormalizer.js:    context.activeDoctrineTopic ||
services/bibleSemanticConceptNormalizer.js:    context.lastAnsweredConcept ||
services/bibleSemanticConceptNormalizer.js:    if (concept.strictTopic && context.activeDoctrineTopic && concept.strictTopic !== context.activeDoctrineTopic) {
services/conversationAnchorEngine.js:    state.sessionMemory?.activeConcept ||
services/conversationAnchorEngine.js:    state.lastAnsweredConcept ||
services/conversationAnchorEngine.js:  if (/dietary|pork|swine|clean food/i.test(m) || concept === 'dietary_pork_unclean') {
services/conversationAnchorEngine.js:    anchor.currentDoctrineConcept = 'dietary_pork_unclean';
services/conversationAnchorEngine.js:  const sm = state.sessionMemory || {};
services/conversationAnchorEngine.js:  if (state.turnMemory?.lastRefsShown?.[0]) anchor.lastHelpfulVerse = state.turnMemory.lastRefsShown[0];
services/conversationAnchorEngine.js:  const doctrineState = state.lastAnsweredConcept ? state : getDoctrineConversationState(userId);
services/relationshipMemoryEngine.js:    sessionPatch.sessionMemory = {
services/relationshipMemoryEngine.js:      ...(state.sessionMemory || {}),
services/relationshipMemoryEngine.js:      currentStruggle: rel.currentStruggle || state.sessionMemory?.currentStruggle,
services/relationshipMemoryEngine.js:    lastAnsweredConcept:
services/relationshipMemoryEngine.js:      state.lastAnsweredConcept ||
services/relationshipMemoryEngine.js:      state.turnMemory?.lastAnsweredConcept ||
services/relationshipMemoryEngine.js:      state.sessionMemory?.activeConcept ||
services/relationshipMemoryEngine.js:    lastDoctrineTopic: state.lastAnsweredTopic || state.activeDoctrineTopic || null,
services/relationshipMemoryEngine.js:      rel.familyConversationContext || state.sessionMemory?.familyContext || false,
services/bibleConceptGraph.js:    relatedConcepts: ['dietary_pork_unclean', 'acts_10'],
services/bibleConceptGraph.js:  'dietary_pork_unclean',
scripts/runConversationArchitectureAudit.sh:grep -R "activeConcept\|lastAnsweredConcept\|lastAnsweredTopic\|activeDoctrineTopic\|sessionMemory\|turnMemory\|previousDoctrineTopic\|dietary_pork_unclean" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
scripts/runPhase4D3LiveCompanionRealPathRegression.js:    '- `doctrineConversationState` activeDoctrineTopic / previousDoctrineTopic',
scripts/runPhase4D3LiveCompanionRealPathRegression.js:    '## activeDoctrineTopic retention',
scripts/runPhase5HCompanionIntentIntelligenceRegression.js:    state: { lastAnsweredConcept: 'fornication_sexual_sin' },
scripts/runPhase4MCompanionRoutingRegression.js:    activeDoctrineTopic: getActiveDoctrineTopic(userId),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(t1.activeDoctrineTopic === 'acts_10', 'activeDoctrineTopic acts_10'),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(!t2.activeDoctrineTopic, 'activeDoctrineTopic cleared or suspended'),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(!t3.activeDoctrineTopic, 'activeDoctrineTopic cleared'),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(t5.activeDoctrineTopic === 'dietary_law', 'activeDoctrineTopic dietary_law'),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(!t6.activeDoctrineTopic || t6.activeDoctrineTopic !== 'dietary_law', 'old dietary topic cleared'),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(!t9.activeDoctrineTopic, 'activeDoctrineTopic cleared'),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(t11.activeDoctrineTopic === 'death_state', 'activeDoctrineTopic death_state'),
scripts/runPhase4MCompanionRoutingRegression.js:      assert(!t13.activeDoctrineTopic, 'clears death_state'),
```

## Practical / Prayer / Emotional Engines
```
services/liveRequestTrace.js:  if (lane === 'practical_wisdom' || /practical_wisdom|practical_guidance/i.test(route)) {
services/liveRequestTrace.js:  if (lane === 'prayer_companion' || /prayer_companion|practical_guidance_prayer/i.test(route)) {
services/bibleReasoningEngine.js:      routePlan.intent === 'emotional_support',
services/masterBuddyRuntime.js:const { classifyPrayerIntent, buildPrayerCompanionResponse } = require('./prayerCompanionResponse');
services/masterBuddyRuntime.js:      const reply = buildPrayerCompanionResponse({
services/masterBuddyRuntime.js:    else if (intent === 'emotional_support' || masterRoute === 'grief_support') topic = 'grief';
services/companionIntentIntelligence.js:      category: 'emotional_support',
services/companionIntentIntelligence.js:      category: 'emotional_support',
services/prayerCompanionResponse.js:function buildPrayerCompanionResponse({
services/prayerCompanionResponse.js:  buildPrayerCompanionResponse,
services/retrievalEvidencePack.js:    caregiver: 'emotional_support_and_prayer',
services/alphaTesterManager.js:  'emotional_support',
services/practicalWisdomEngine.js:const { buildFamilyExplanation, buildBoundaryScript } = require('./practicalGuidanceEngine');
services/practicalWisdomEngine.js:function buildPracticalWisdomResponse({ message = '', anchor = {}, conceptId = null, state = {} } = {}) {
services/practicalWisdomEngine.js:    const fam = buildFamilyExplanation({ concept: id });
services/practicalWisdomEngine.js:        masterRoute: 'phase5l_practical_wisdom_family',
services/practicalWisdomEngine.js:    const boundary = buildBoundaryScript({ situation: m });
services/practicalWisdomEngine.js:      masterRoute: 'phase5k_practical_wisdom_boundary',
services/practicalWisdomEngine.js:  buildPracticalWisdomResponse,
services/companionStateEngine.js:  else if (routePlan.intent === 'emotional_support' || EMOTIONAL_PATTERNS.some((re) => re.test(m))) {
services/practicalGuidanceEngine.js:function buildFamilyExplanation({ concept = null } = {}) {
services/practicalGuidanceEngine.js:function buildBoundaryScript({ situation = '' } = {}) {
services/practicalGuidanceEngine.js:    const boundary = buildBoundaryScript({ situation: message });
services/practicalGuidanceEngine.js:    const fam = buildFamilyExplanation({ concept: conceptId || 'dietary_pork_unclean' });
services/practicalGuidanceEngine.js:  buildFamilyExplanation,
services/practicalGuidanceEngine.js:  buildBoundaryScript,
services/openAiFirstCompanionRuntime.js:const { buildPrayerCompanionResponse } = require('./prayerCompanionEngine');
services/openAiFirstCompanionRuntime.js:const { buildPracticalWisdomResponse } = require('./practicalWisdomEngine');
services/openAiFirstCompanionRuntime.js:const { buildPresenceResponse } = require('./companionPresenceEngine');
services/openAiFirstCompanionRuntime.js:  'emotional_support',
services/openAiFirstCompanionRuntime.js:    const prayer = buildPrayerCompanionResponse({ message, anchor });
services/openAiFirstCompanionRuntime.js:    masterRoute = prayer.masterRoute || 'prayer_companion';
services/openAiFirstCompanionRuntime.js:    const wisdom = buildPracticalWisdomResponse({
services/openAiFirstCompanionRuntime.js:      masterRoute = wisdom.masterRoute || 'practical_wisdom';
services/openAiFirstCompanionRuntime.js:    humanNeed === 'emotional_support' ||
services/openAiFirstCompanionRuntime.js:    const presence = buildPresenceResponse({ message, anchor, state: mergedState });
services/companionResponseBuilder.js:  buildFamilyExplanation,
services/companionResponseBuilder.js:  buildBoundaryScript,
services/companionResponseBuilder.js:    const fam = buildFamilyExplanation({ concept: conceptId });
services/companionResponseBuilder.js:  const fam = buildFamilyExplanation({ concept: conceptId });
services/companionResponseBuilder.js:  const boundary = buildBoundaryScript({ situation: context.message || plan.relationshipContext?.message || '' });
services/companionResponseBuilder.js:    masterRoute: 'phase5i_emotional_support',
services/companionResponseBuilder.js:    case 'emotional_support':
services/companionResponseBuilder.js:  if (plan.oneFollowUpQuestion && built.reply && !built.reply.includes('?') && plan.answerType !== 'emotional_support') {
services/companionPresenceEngine.js:function buildPresenceResponse({ message = '', anchor = {}, state = {} } = {}) {
services/companionPresenceEngine.js:    const curiosity = buildCuriosityFollowUp({ message: m, anchor, humanNeed: 'emotional_support' });
services/companionPresenceEngine.js:  buildPresenceResponse,
services/companionCuriosityEngine.js:  if (humanNeed === 'emotional_support' && !/\?/.test(message)) {
services/companionDoctrinePresenter.js:  if (safety.level === 'crisis' || safety.level === 'emotional_support') {
services/companionDoctrineRouter.js:  if (matchesAny(m, EMOTIONAL_SUPPORT_PATTERNS)) return 'emotional_support';
services/companionDoctrineRouter.js:  'emotional_support',
services/companionDoctrineRouter.js:  if (intent === 'stop_release' || intent === 'emotional_support') return true;
services/companionDoctrineRouter.js:    'emotional_support',
services/companionDoctrineRouter.js:  } else if (intent === 'stop_release' || intent === 'emotional_support') {
services/companionDoctrineRouter.js:        intent === 'emotional_support' ||
services/prayerCompanionEngine.js:function buildPrayerCompanionResponse({ message = '', anchor = {} } = {}) {
services/prayerCompanionEngine.js:    masterRoute: deeper ? 'phase5l_prayer_deeper' : 'phase5k_prayer_companion',
services/prayerCompanionEngine.js:  buildPrayerCompanionResponse,
services/humanNeedDetector.js:      ? 'emotional_support'
services/humanNeedDetector.js:        ? 'emotional_support'
services/buddyBrain.js:const { classifyPrayerIntent, buildPrayerCompanionResponse } = require('./prayerCompanionResponse');
services/buddyBrain.js:    return { level: 'emotional_support', reason: 'grief or loss language detected' };
services/buddyBrain.js:    return { level: 'emotional_support', reason: 'loss language detected' };
services/buddyBrain.js:    return { level: 'emotional_support', reason: 'emotional distress language detected' };
services/buddyBrain.js:  "safety_level": "standard|emotional_support|crisis",
services/buddyBrain.js:          !['health_support', 'prayer', 'memory_recall', 'emotional_support'].includes(
services/buddyBrain.js:  else if (intent === 'emotional_support') topic = supportType === 'rest' ? 'grief' : 'grief';
services/buddyBrain.js:    reply = lockRuntime(reply, 'emotional_support');
services/buddyBrain.js:      safety: { level: 'emotional_support' },
services/buddyBrain.js:    let reply = buildPrayerCompanionResponse({
services/bibleCompanionOrchestrator.js:const { buildPracticalWisdomResponse } = require('./practicalWisdomEngine');
services/bibleCompanionOrchestrator.js:const { buildPrayerCompanionResponse } = require('./prayerCompanionEngine');
services/bibleCompanionOrchestrator.js:const { buildPresenceResponse } = require('./companionPresenceEngine');
services/bibleCompanionOrchestrator.js:    humanNeed === 'emotional_support'
services/bibleCompanionOrchestrator.js:    const prayer = buildPrayerCompanionResponse({ message, anchor });
services/bibleCompanionOrchestrator.js:  const wisdom = buildPracticalWisdomResponse({
services/bibleCompanionOrchestrator.js:    const presence = buildPresenceResponse({ message, anchor, state: mergedState });
services/bibleCompanionOrchestrator.js:    if (presence?.reply) return { ...presence, intentCategory: 'emotional_support' };
services/bibleCompanionOrchestrator.js:  'emotional_support',
services/bibleCompanionOrchestrator.js:    (humanNeed === 'emotional_support' || humanNeed === 'anxiety_support' || humanNeed === 'conflict_guidance')
services/bibleCompanionOrchestrator.js:    if (!/\?[^?]*$/.test(reply.trim()) || humanNeed === 'emotional_support') {
services/bibleCompanionOrchestrator.js:    const prayer = buildPrayerCompanionResponse({ message, anchor });
services/bibleCompanionOrchestrator.js:          orchestratorLane: 'prayer_companion',
services/bibleCompanionOrchestrator.js:    let wisdom = buildPracticalWisdomResponse({
services/bibleCompanionOrchestrator.js:      wisdom = buildPracticalWisdomResponse({
services/bibleCompanionOrchestrator.js:          admin_flags: ['phase5k_practical_wisdom'],
services/bibleCompanionOrchestrator.js:            orchestratorLane: 'practical_wisdom',
services/bibleCompanionOrchestrator.js:  if (humanNeed === 'emotional_support' || humanNeed === 'anxiety_support') {
services/bibleCompanionOrchestrator.js:      const presence = buildPresenceResponse({ message, anchor, state: mergedState });
services/bibleCompanionOrchestrator.js:          admin_flags: ['phase5k_emotional_support'],
services/bibleCompanionOrchestrator.js:            orchestratorLane: 'emotional_support',
services/bibleCompanionOrchestrator.js:    emotional_support: companionIntent.practicalType || null,
services/bibleCompanionOrchestrator.js:    (companionIntent.category === 'emotional_support' && companionIntent.practicalType === 'nervous_family')
services/scriptureReasoningPlanner.js:    answerType = 'emotional_support';
services/scriptureReasoningPlanner.js:  } else if (companionIntent.category === 'emotional_support' || relationshipContext.userGoal === 'emotional_support') {
services/scriptureReasoningPlanner.js:    answerType = 'emotional_support';
services/scriptureReasoningPlanner.js:    isEmotionalSupport: answerType === 'emotional_support',
services/scriptureReasoningPlanner.js:  if (answerType === 'emotional_support') {
services/scriptureReasoningPlanner.js:    isEmotionalSupport: answerType === 'emotional_support',
services/scriptureReasoningPlanner.js:  } else if (humanNeed === 'emotional_support' || anchor.currentEmotion === 'overwhelmed') {
services/noGlitchTurnContract.js:      category: 'emotional_support',
services/relationshipContextModel.js:  if (/\boverwhelmed\b/i.test(m)) return 'emotional_support';
services/relationshipContextModel.js:  if (/\bbad day\b|\bhard day\b/i.test(m)) return 'emotional_support';
services/relationshipContextModel.js:  if (/\blove life\b/i.test(m) && /\bcrash/i.test(m)) return 'emotional_support';
services/alphaIssueAggregator.js:    id: 'emotional_support_weak',
services/singleCompanionContract.js:const { buildPracticalWisdomResponse } = require('./practicalWisdomEngine');
services/singleCompanionContract.js:const { buildPrayerCompanionResponse } = require('./prayerCompanionEngine');
services/singleCompanionContract.js:const { buildPresenceResponse } = require('./companionPresenceEngine');
services/singleCompanionContract.js:    const wisdom = buildPracticalWisdomResponse({
services/singleCompanionContract.js:    const wisdom = buildPracticalWisdomResponse({
services/singleCompanionContract.js:    if (wisdom?.reply) return { reply: wisdom.reply, scripture: wisdom.scripture || [], repaired: true, repairLane: 'practical_wisdom' };
services/singleCompanionContract.js:    const presence = buildPresenceResponse({ message, anchor, state });
services/singleCompanionContract.js:    const prayer = buildPrayerCompanionResponse({ message, anchor });
services/singleCompanionContract.js:    contract.mode === 'emotional_support' ||
services/singleCompanionContract.js:    contract.humanNeed === 'emotional_support' ||
services/singleCompanionContract.js:    const presence = buildPresenceResponse({ message, anchor, state });
services/singleCompanionContract.js:    (contract.mode === 'emotional_support' || /\boverwhelmed\b/i.test(contract.message || '')) &&
services/griefCompanionResponse.js:    safety_level: 'emotional_support',
services/griefCompanionResponse.js:      intent: 'emotional_support',
scripts/runPhase5M5UnifiedIntentAuthorityRegression.js:          r.humanNeed === 'emotional_support' ||
scripts/runConversationArchitectureAudit.sh:grep -R "buildPrayerCompanionResponse\|buildPracticalWisdomResponse\|buildPresenceResponse\|buildFamilyExplanation\|buildBoundaryScript\|prayer_companion\|practical_wisdom\|emotional_support" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
scripts/traceBuddyChatPath.js:    prayer: 'prayerCompanionResponse.buildPrayerCompanionResponse',
```

## Final Owner / Response Repair Layers
```
services/liveRequestTrace.js:  if (/No\.\s+Staying with Scripture/i.test(reply)) return 'singleCompanionContract.buildPorkContractReply';
services/liveRequestTrace.js:  if (runtime.companionRepairLane) return `singleCompanionContract.${runtime.companionRepairLane}`;
services/liveRequestTrace.js:    contractRepairLane: rt.companionRepairLane || null,
services/liveRequestTrace.js:    forbiddenPhraseDetected: rt.forbiddenPhraseDetected || false,
services/liveRequestTrace.js:    finalResponseOwner: rt.liveResponseOwner ? 'liveResponseOwner' : rt.finalAnswerAuthor || 'unknown',
services/liveRequestTrace.js:    forbiddenPhraseDetected: trace.forbiddenPhraseDetected,
services/liveRequestTrace.js:    forbiddenPhraseDetected: !!(dbg.forbiddenPhraseDetected || forbidden.detected),
services/masterBuddyRuntime.js:  // Doctrine path that skipped finalizeBuddyResponse
services/masterBuddyRuntime.js:  const finalized = H.finalizeBuddyResponse({
services/directnessGuard.js:    forbiddenPhraseDetected: forbidden.detected,
services/reasonFirstBuddyRuntime.js:  const finalized = H.finalizeBuddyResponse({
services/responseGuarantee.js:  'POST /buddy/chat → routes/buddy.js → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime → bibleCompanionOrchestrator';
services/responseGuarantee.js:        masterRoute: 'response_guarantee_fallback',
services/responseGuarantee.js:async function withBuddyChatGuarantee(handler, context = {}) {
services/responseGuarantee.js:      route: 'response_guarantee_fallback',
services/responseGuarantee.js:  withBuddyChatGuarantee,
services/doctrineCompanionPath.js:  return H.finalizeBuddyResponse({
services/forbiddenProseGuard.js:    forbiddenPhraseDetected: hits.length > 0,
services/coreRestorationDebug.js:  forbiddenPhraseDetected = false,
services/coreRestorationDebug.js:    forbiddenPhraseDetected: !!forbiddenPhraseDetected,
services/liveResponseOwner.js:} = require('./singleCompanionContract');
services/liveResponseOwner.js:    console.warn('[liveResponseOwner] early return blocked:', entry);
services/liveResponseOwner.js:    liveResponseOwner: true,
services/liveResponseOwner.js:    forbiddenPhraseDetected:
services/liveResponseOwner.js:      enforced.forbiddenPhraseDetected || scanForbiddenFinalSubstrings(finalReply, contract).length > 0,
services/liveResponseOwner.js:    liveResponseOwner: true,
services/liveResponseOwner.js:    companionRepairLane: live.repairLane,
services/liveResponseOwner.js:    forbiddenPhraseDetected: live.forbiddenPhraseDetected || false,
services/liveResponseOwner.js:    owner: 'liveResponseOwner',
services/openAiFirstCompanionRuntime.js:} = require('./singleCompanionContract');
services/openAiFirstCompanionRuntime.js:  return H.finalizeBuddyResponse({
services/openAiFirstCompanionRuntime.js:  return H.finalizeBuddyResponse({
services/openAiFirstCompanionRuntime.js:  return H.finalizeBuddyResponse({
services/openAiFirstCompanionRuntime.js:    return H.finalizeBuddyResponse({
services/openAiFirstCompanionRuntime.js:    forbiddenPhraseDetected: forbiddenCheck.detected,
services/openAiFirstCompanionRuntime.js:  return H.finalizeBuddyResponse({
services/buddyBrain.js:const { finalizeLiveResponse } = require('./liveResponseOwner');
services/buddyBrain.js:function finalizeBuddyResponse({
services/buddyBrain.js:    console.warn('liveResponseOwner finalize skipped:', liveOwnerErr.message);
services/buddyBrain.js:    return finalizeBuddyResponse({
services/buddyBrain.js:    return finalizeBuddyResponse({
services/buddyBrain.js:    return finalizeBuddyResponse({
services/buddyBrain.js:    return finalizeBuddyResponse({
services/buddyBrain.js:    finalizeBuddyResponse,
services/bibleCompanionOrchestrator.js:const { hasEstablishedTopic } = require('./singleCompanionContract');
services/buddyLivePathVerifier.js:    routeOwner: 'POST /buddy/chat → routes/buddy.js → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime → bibleCompanionOrchestrator',
services/buddyLivePathVerifier.js:    exportedHandler: 'POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy',
services/singleCompanionContract.js:        forbiddenPhraseDetected: false,
services/singleCompanionContract.js:  let forbiddenPhraseDetected = scanForbiddenFinalSubstrings(reply, contract).length > 0;
services/singleCompanionContract.js:  if (forbiddenPhraseDetected) {
services/singleCompanionContract.js:    forbiddenPhraseDetected = scanForbiddenFinalSubstrings(reply, contract).length > 0;
services/singleCompanionContract.js:    forbiddenPhraseDetected,
services/singleCompanionContract.js:      detectForbiddenOldPath(reply, contract).length === 0 && !forbiddenPhraseDetected,
routes/buddy.js:const { withBuddyChatGuarantee } = require('../services/responseGuarantee');
routes/buddy.js:  const guaranteed = await withBuddyChatGuarantee(
routes/buddy.js:    const guaranteed = await withBuddyChatGuarantee(
scripts/runPhase5M2LiveRouteVerification.js:    repairLane: ro.contractRepairLane || s.runtime?.companionRepairLane,
scripts/runPhase5M2LiveRouteVerification.js:    owner: ro.finalResponseOwner || (s.runtime?.liveResponseOwner ? 'liveResponseOwner' : 'unknown'),
scripts/runPhase5M2LiveRouteVerification.js:        'Historically: `Absolutely — staying with the Bible text: ${exactConclusion}...` — now stripped by singleCompanionContract.polishDoctrineOpener',
scripts/runPhase5M2LiveRouteVerification.js:        'No live producer for "Absolutely — staying" in services/*.js. Current pork path: singleCompanionContract.buildPorkContractReply → "No. Staying with Scripture, pork is unclean..." (services/singleCompanionContract.js ~100)',
scripts/runPhase5M2LiveRouteVerification.js:  md.push('| `liveResponseOwner` | Assigns final `reply` from draft + contract |');
scripts/runPhase5M2LiveRouteVerification.js:  md.push('| `singleCompanionContract` | Repairs forbidden phrases; may replace draft entirely (`contractRepairLane`) |');
scripts/phase5m-safe-reset-and-stage.sh:  services/liveResponseOwner.js
scripts/phase5m-safe-reset-and-stage.sh:  services/singleCompanionContract.js
scripts/runPhase5M4LiveTruthRegression.js:    forbiddenPhraseDetected: replyObj.runtime?.forbiddenPhraseDetected,
scripts/runPhase5M4LiveTruthRegression.js:        forbiddenPhraseDetected: r.forbiddenPhraseDetected,
scripts/runPhase5M3OldPhraseQuarantineRegression.js:const { scanForbiddenFinalSubstrings } = require('../services/singleCompanionContract');
scripts/runPhase5M3OldPhraseQuarantineRegression.js:    owner: ro.finalResponseOwner || (s.runtime?.liveResponseOwner ? 'liveResponseOwner' : 'unknown'),
scripts/runPhase5M3OldPhraseQuarantineRegression.js:    repairLane: ro.contractRepairLane || s.runtime?.companionRepairLane,
scripts/runPhase5M3OldPhraseQuarantineRegression.js:    forbiddenDetected: s.runtime?.forbiddenPhraseDetected || false,
scripts/runPhase5M3OldPhraseQuarantineRegression.js:  const ownerOk = routeLogs.every((r) => r.owner === 'liveResponseOwner');
scripts/runPhase5M3OldPhraseQuarantineRegression.js:    row('10_route_owner', ownerOk, 'all liveResponseOwner', {
scripts/runPhase5M3OldPhraseQuarantineRegression.js:      owner: ownerOk ? 'liveResponseOwner' : 'mixed',
scripts/runPhase5M3OldPhraseQuarantineRegression.js:      owner: 'liveResponseOwner',
scripts/runPhase5M4DeployTruthCheck.js:  'services/liveResponseOwner.js',
scripts/runPhase4FCombinedStabilityRegression.js:const { withBuddyChatGuarantee } = require('../services/responseGuarantee');
scripts/runPhase4FCombinedStabilityRegression.js:    const g = await withBuddyChatGuarantee(() => Promise.reject(new Error('forced_test_error')), {
scripts/runPhase5M1DeployParityGate.js:  'services/liveResponseOwner.js',
scripts/runPhase5M1DeployParityGate.js:  'services/singleCompanionContract.js',
scripts/runPhase5M1DeployParityGate.js:  'withBuddyChatGuarantee',
scripts/runPhase5M1DeployParityGate.js:  'finalizeBuddyResponse',
scripts/runPhase5M1DeployParityGate.js:  const owner = fs.readFileSync(path.join(ROOT, 'services/liveResponseOwner.js'), 'utf8');
scripts/runPhase5M1DeployParityGate.js:    buddyGuarantee: /withBuddyChatGuarantee/i.test(buddy),
scripts/runPhase5M1DeployParityGate.js:    finalizeBuddy: brain.includes('finalizeBuddyResponse'),
scripts/runPhase5M1DeployParityGate.js:  const { enforceSingleCompanionContract, detectForbiddenOldPath } = require('../services/singleCompanionContract');
scripts/phase2iConversationStressTest.js:  if (dbg.forbiddenPhraseDetected || detectForbiddenProse(text).detected) violations.push('forbidden_phrase');
scripts/runPhase5MDeployParityGate.js:  'services/liveResponseOwner.js',
scripts/runPhase5MDeployParityGate.js:  'services/singleCompanionContract.js',
scripts/runPhase5MDeployParityGate.js:  const owner = fs.existsSync(path.join(ROOT, 'services/liveResponseOwner.js'));
scripts/runPhase5MDeployParityGate.js:  const contract = fs.existsSync(path.join(ROOT, 'services/singleCompanionContract.js'));
scripts/runPhase5MDeployParityGate.js:  const { enforceSingleCompanionContract, detectForbiddenOldPath } = require('../services/singleCompanionContract');
scripts/runPhase5MDeployParityGate.js:    `**liveResponseOwner wired:** ${livePath.finalizeLiveResponse ? 'yes' : 'no'}`,
scripts/runConversationArchitectureAudit.sh:grep -R "finalizeBuddyResponse\|liveResponseOwner\|singleCompanionContract\|companionRepairLane\|forbiddenPhraseDetected\|response_guarantee_fallback\|withBuddyChatGuarantee" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
scripts/runConversationArchitectureAudit.sh:    | jq '{reply:.reply.reply, masterRoute:.reply.runtime.masterRoute, humanNeed:.reply.runtime.liveTruthTrace.orchestratorHumanNeed, routePlanHumanNeed:.reply.runtime.liveTruthTrace.routePlanHumanNeed, protectedHumanNeed:.reply.runtime.liveTruthTrace.protectedHumanNeed, repairLane:.reply.runtime.companionRepairLane, fallback:.reply.runtime.fallbackErrorCode}' >> "$OUT" 2>&1 || true
scripts/deployParityVerification.js:    forbiddenPhraseDetected: !!dbg.forbiddenPhraseDetected,
scripts/phase2hRegression.js:  if (dbg.forbiddenPhraseDetected || detectForbiddenProse(reply.reply || '').detected) violations.push('forbidden');
scripts/runPhase5M1KnownWorkingPathRegression.js:const { detectForbiddenOldPath } = require('../services/singleCompanionContract');
scripts/runPhase5M1KnownWorkingPathRegression.js:    liveOwner: s.runtime?.liveResponseOwner,
scripts/phase5l-safe-stage.sh:  services/liveResponseOwner.js
scripts/phase5l-safe-stage.sh:  services/singleCompanionContract.js
scripts/emergencyHardCutoverRegression.js:    if (dbg.forbiddenPhraseDetected || detectForbiddenProse(replyText).detected) violations.push('forbidden_phrase');
scripts/traceLiveBuddyRoute.js:const { withBuddyChatGuarantee, COMPANION_SAFE_FALLBACK } = require('../services/responseGuarantee');
scripts/traceLiveBuddyRoute.js:  'POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime';
scripts/traceLiveBuddyRoute.js:    const guaranteed = await withBuddyChatGuarantee(
scripts/runPhase5MLastKnownGoodRecoveryRegression.js:const { detectForbiddenOldPath } = require('../services/singleCompanionContract');
scripts/runPhase5MLastKnownGoodRecoveryRegression.js:    liveOwner: s.runtime?.liveResponseOwner,
scripts/runPhase5LNoRegressionGate.js:  'services/liveResponseOwner.js',
scripts/runPhase5LNoRegressionGate.js:  'services/singleCompanionContract.js',
scripts/runPhase5LNoRegressionGate.js:  const { detectForbiddenOldPath, enforceSingleCompanionContract } = require('../services/singleCompanionContract');
scripts/runPhase5LNoRegressionGate.js:  return src.includes('finalizeLiveResponse') && fs.existsSync(path.join(ROOT, 'services/liveResponseOwner.js'));
scripts/runPhase5LLiveThreadRegression.js:const { detectForbiddenOldPath } = require('../services/singleCompanionContract');
scripts/runPhase5LLiveThreadRegression.js:    liveOwner: s.runtime?.liveResponseOwner,
scripts/runPhase4HMemoryStressTest.js:const { withBuddyChatGuarantee } = require('../services/responseGuarantee');
scripts/runPhase4HMemoryStressTest.js:    const g = await withBuddyChatGuarantee(() => Promise.reject(new Error('forced_timeout_test')), { userId: `${userId}-err`, message: 'test' });
scripts/phase2fConversationStressTest.js:  if (dbg.forbiddenPhraseDetected || detectForbiddenProse(text).detected) violations.push('forbidden_phrase');
```

## Known Bad Browser Transcript Failures To Reproduce
```
What does the app do?
I need a better prayer
Prayer as I asked. Are you not able to read the texts?
Decision
I a decision that it not about the bible
What should I say to my son?
How do you know I'm talking about dietary law?
Can we eat shellfish?
Why did you say NO and then give me scriptures?
Only if that yes or no goes with answering the question.
Tell me more.
Stop.
```

## Production Smoke Test
```
### What is this app?
{
  "reply": "BibleBuddy is a Scripture-grounded companion. I'm here to listen, pray with you, help you study the Bible line upon line, and talk through real-life situations with Scripture as the foundation. I'm not here to force you or pressure you. You can ask Bible questions, ask for prayer, talk through something hard, or ask for a verse to hold onto.",
  "masterRoute": "phase5l_app_identity",
  "humanNeed": "app_identity",
  "routePlanHumanNeed": "app_identity",
  "protectedHumanNeed": true,
  "repairLane": "app_identity",
  "fallback": null
}

### What does the app do?
{
  "reply": "I want to make sure I answer the right thing. Are you asking about a Bible passage, a life situation, or something you want prayer for?",
  "masterRoute": "bible_companion_clarification",
  "humanNeed": null,
  "routePlanHumanNeed": "doctrine_answer",
  "protectedHumanNeed": false,
  "repairLane": null,
  "fallback": null
}

### Can you pray with me?
{
  "reply": "Yes, I'll pray with you. Father, please steady my heart. Give me wisdom, peace, courage, and gentleness. Help me walk in truth with love and not fear. In Jesus' name, amen. Philippians 4:6-7 and James 1:5 are good Scriptures to hold onto.",
  "masterRoute": "phase5k_prayer_companion",
  "humanNeed": "prayer",
  "routePlanHumanNeed": "prayer",
  "protectedHumanNeed": true,
  "repairLane": null,
  "fallback": null
}

### I need a better prayer
{
  "reply": "I want to make sure I answer the right thing. Are you asking about a Bible passage, a life situation, or something you want prayer for?",
  "masterRoute": "companion_lane_fallback",
  "humanNeed": null,
  "routePlanHumanNeed": "doctrine_answer",
  "protectedHumanNeed": false,
  "repairLane": "safe_clarification_fallback",
  "fallback": null
}

### I'm nervous about tomorrow.
{
  "reply": "I hear that you're nervous. Pause and breathe for a moment. What's weighing on you most — a conversation, a decision, or something else?",
  "masterRoute": "phase5l_presence_nervous",
  "humanNeed": "anxiety_support",
  "routePlanHumanNeed": "anxiety_support",
  "protectedHumanNeed": true,
  "repairLane": null,
  "fallback": null
}

### Decision
{
  "reply": "I can do that. Which Bible topic would you like more Scriptures about — the Sabbath, the Kingdom, clean foods, death, or something else?",
  "masterRoute": "no_glitch_clarifier",
  "humanNeed": null,
  "routePlanHumanNeed": "clarification",
  "protectedHumanNeed": false,
  "repairLane": null,
  "fallback": null
}

### I have a decision that is not about the Bible.
{
  "reply": "I am having trouble retrieving additional passages right now. Please try again in a moment.",
  "masterRoute": "core_connection_error",
  "humanNeed": null,
  "routePlanHumanNeed": "doctrine_answer",
  "protectedHumanNeed": false,
  "repairLane": null,
  "fallback": null
}

### What should I say to my son?
{
  "reply": "I hear you — you're asking how to say it without sounding harsh. You could say: 'I love you and respect you. I'm not judging anyone. After studying Scripture, I believe God distinguishes clean and unclean foods. Leviticus 11 and Deuteronomy 14 are the passages that led me there, and Acts 10:28 shows Peter's vision was about people, not changing food laws. I'm choosing to follow what I understand God has shown me.' Try to speak with peace, not pressure.",
  "masterRoute": "phase5l_practical_wisdom_family",
  "humanNeed": "practical_words_to_say",
  "routePlanHumanNeed": "practical_words_to_say",
  "protectedHumanNeed": true,
  "repairLane": null,
  "fallback": null
}

### Can we eat pork?
{
  "reply": "No. Staying with Scripture, pork is unclean. Leviticus 11 and Deuteronomy 14 identify swine as unclean. Acts 10 does not overturn that; Peter explains in Acts 10:28 that the vision was about not calling people common or unclean.",
  "masterRoute": "doctrine_final_authority",
  "humanNeed": null,
  "routePlanHumanNeed": "doctrine_answer",
  "protectedHumanNeed": false,
  "repairLane": "pork_contract",
  "fallback": null
}

### Can we eat shellfish?
{
  "reply": "No. Staying with Scripture, staying with Scripture, pork and shellfish remain unclean. Scripture distinguishes clean and unclean animals. Pork and shellfish are unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods. Leviticus 11 and Deuteronomy 14 distinguish clean and unclean animals. Daniel 1:8-16 shows faithful refusal of unclean food. Acts 10:14 shows Peter refusing unclean food. Acts 10:28 explains the vision concerned people, not food permission. Isaiah 66:17 treats eating swine’s flesh seriously in judgment.",
  "masterRoute": "doctrine_final_authority",
  "humanNeed": null,
  "routePlanHumanNeed": "doctrine_answer",
  "protectedHumanNeed": false,
  "repairLane": null,
  "fallback": null
}

### What about Acts 10?
{
  "reply": "Acts 10 does not give permission to eat unclean foods. Peter explains the meaning in Acts 10:28: God showed him not to call any man common or unclean. Acts 10:14 also shows Peter still refusing unclean food.",
  "masterRoute": "doctrine_final_authority",
  "humanNeed": null,
  "routePlanHumanNeed": "doctrine_answer",
  "protectedHumanNeed": false,
  "repairLane": "acts10_doctrine",
  "fallback": null
}

### Tell me more.
{
  "reply": "I am having trouble retrieving additional passages right now. Please try again in a moment.",
  "masterRoute": "core_connection_error",
  "humanNeed": null,
  "routePlanHumanNeed": "doctrine_answer",
  "protectedHumanNeed": false,
  "repairLane": null,
  "fallback": null
}

### Stop.
{
  "reply": "I want to stay with you on this. Could you ask your question again in one short sentence?",
  "masterRoute": "response_guarantee_fallback",
  "humanNeed": null,
  "routePlanHumanNeed": null,
  "protectedHumanNeed": null,
  "repairLane": null,
  "fallback": "RUNTIME_ERROR"
}

```

## Recent Runtime Errors
```
[
  {
    "at": "2026-06-22T21:51:43.655Z",
    "type": "route_fallback",
    "errorCode": "RUNTIME_ERROR",
    "routeOwner": "POST /buddy/chat → routes/buddy.js → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime → bibleCompanionOrchestrator",
    "error": "finalizeStopRelease is not a function",
    "userId": "set",
    "messagePreview": "Stop."
  },
  {
    "at": "2026-06-22T21:51:43.655Z",
    "error": "finalizeStopRelease is not a function",
    "route": "response_guarantee_fallback",
    "userId": "set"
  },
  {
    "at": "2026-06-22T23:42:04.262Z",
    "type": "route_fallback",
    "errorCode": "RUNTIME_ERROR",
    "routeOwner": "POST /buddy/chat → routes/buddy.js → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime → bibleCompanionOrchestrator",
    "error": "finalizeStopRelease is not a function",
    "userId": "set",
    "messagePreview": "Stop."
  },
  {
    "at": "2026-06-22T23:42:04.263Z",
    "error": "finalizeStopRelease is not a function",
    "route": "response_guarantee_fallback",
    "userId": "set"
  }
]
```
