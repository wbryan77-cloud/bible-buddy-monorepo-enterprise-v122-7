# Phase 4C.1 Render Runtime Stability Audit

Generated: 2026-06-11T03:03:52.848Z

## Pattern scan (services + scripts + docs/evidence-candidates)

### core_connection_error
- services/coreResponseGuards.js (2 hits)
- services/doctrineErrorFirewall.js (2 hits)
- services/liveRequestTrace.js (2 hits)
- services/openAiFirstCompanionRuntime.js (1 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- scripts/runPhase4D1WitnessInventoryRegression.js (2 hits)
- scripts/runPhase4D2LiveCompanionPathRegression.js (1 hits)
- scripts/scriptureAuthorityAuditRunner.js (1 hits)

### buildConnectionErrorReplyUsed
- services/coreResponseGuards.js (1 hits)
- services/coreRestorationDebug.js (3 hits)
- services/liveRequestTrace.js (2 hits)
- services/openAiFirstCompanionRuntime.js (1 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- scripts/baePhase1aRegression.js (1 hits)
- scripts/baePhase1bValidation.js (1 hits)
- scripts/bibleOnlyAuthorityRegression.js (1 hits)
- ... 10 more files

### openai_unavailable
- services/bibleBuddyLiteRuntime.js (1 hits)
- services/companionConversationExperimentRuntime.js (1 hits)
- services/companionOperatingModelExperiment.js (1 hits)
- services/doctrineErrorFirewall.js (1 hits)
- services/minimalReasonFirstRuntime.js (1 hits)
- services/openAiFirstCompanionRuntime.js (2 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- services/reasonFirstComposer.js (1 hits)
- ... 8 more files

### OpenAIAuthError
- services/doctrineErrorFirewall.js (1 hits)
- services/liveRequestTrace.js (1 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)

### correctionRepair
- services/coreRestorationDebug.js (2 hits)
- services/currentMessageIntent.js (1 hits)
- services/directnessGuard.js (2 hits)
- services/openAiFirstCompanionRuntime.js (2 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- scripts/emergencyHardCutoverRegression.js (1 hits)

### fallbackUsed
- services/coreRestorationDebug.js (6 hits)
- services/doctrineBoundaryValidator.js (1 hits)
- services/liveRequestTrace.js (4 hits)
- services/openAiFirstCompanionRuntime.js (10 hits)
- services/ownershipAntiOverrideGuard.js (3 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- scripts/baePhase1aRegression.js (1 hits)
- scripts/bibleOnlyAuthorityRegression.js (1 hits)
- ... 12 more files

### regenerated
- services/answerMatchGate.js (5 hits)
- services/answerVerifier.js (5 hits)
- services/coreRestorationDebug.js (3 hits)
- services/doctrineAnswerTrace.js (2 hits)
- services/liveRequestTrace.js (3 hits)
- services/masterBuddyRuntime.js (2 hits)
- services/openAiFirstCompanionRuntime.js (15 hits)
- services/phase4c1RuntimeDiagnostics.js (2 hits)
- ... 11 more files

### maxAttempts
- services/companionConversationExperimentRuntime.js (2 hits)
- services/companionOperatingModelExperiment.js (2 hits)
- services/openAiFirstCompanionRuntime.js (3 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- services/reasonFirstComposer.js (2 hits)
- services/reasonFirstLiteRuntime.js (2 hits)
- services/responseStructureRemovalExperiment.js (2 hits)
- scripts/e2eDoctrineProofAndEnvParity.js (1 hits)
- ... 1 more files

### timeout
- services/doctrineErrorFirewall.js (2 hits)
- services/liveRequestTrace.js (2 hits)
- services/openAiFirstCompanionRuntime.js (4 hits)
- services/openSourceScrubber.js (4 hits)
- services/phase3fContentExtraction.js (2 hits)
- services/phase3rSourceRecovery.js (1 hits)
- services/phase3sSourceScrubOrganization.js (2 hits)
- services/phase3tSourceWorkerOrganization.js (2 hits)
- ... 18 more files

### AbortController
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- scripts/e2eDoctrineProofAndEnvParity.js (1 hits)

### memoryUsage
- services/buddyRuntimeConfig.js (1 hits)
- services/candidatePromotionEngine.js (2 hits)
- services/liveRequestTrace.js (4 hits)
- services/phase2lLiveValidation.js (1 hits)
- services/phase2mSecondBatch.js (2 hits)
- services/phase2pTopicPackApproval.js (2 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- services/postImplementationRegression.js (2 hits)
- ... 2 more files

### heapUsedMB
- services/buddyRuntimeConfig.js (1 hits)
- services/liveRequestTrace.js (1 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- services/requestMemoryLogger.js (1 hits)
- scripts/e2eDoctrineProofAndEnvParity.js (2 hits)
- scripts/liveRuntimeVerification.js (1 hits)
- scripts/phase1StabilityPhase2aRegression.js (2 hits)

### rssMB
- services/buddyRuntimeConfig.js (1 hits)
- services/candidatePromotionEngine.js (1 hits)
- services/liveRequestTrace.js (3 hits)
- services/phase2lLiveValidation.js (2 hits)
- services/phase2mSecondBatch.js (1 hits)
- services/phase2pTopicPackApproval.js (1 hits)
- services/phase2qLiveValidation.js (4 hits)
- services/phase4c1RuntimeDiagnostics.js (1 hits)
- ... 26 more files

## Stability checklist
1. Correction pressure → guard regen can add OpenAI attempts; Phase 4C.1 adds max one doctrine strict regen
2. Validator regeneration capped at one per strict doctrine answer (doctrineStrictRegenerated flag)
3. Failed validation returns safe corpus answer — not repeated connection_error loops
4. OpenAI timeout added via OPENAI_TIMEOUT_MS in reasonFirstComposer.callOpenAI
5. Render memory: requestMemoryLogger logs heap/rss; evidence pack size tracked in runtime
6. buddy route uses try/catch in finalize path; doctrine validation failures are non-fatal
7. Safe corpus fallback on OpenAI failure when doctrineStrict enabled
8. logDoctrineStrictFailure writes structured JSONL diagnostics
9. openaiAttempts cap flag at >2 attempts
10. Orb state defaults from structured reply; connection_error path sets speaking state