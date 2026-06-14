/**
 * Core BibleBuddy path — OpenAI authors every normal turn.
 * Evidence only; no template responders or study-loop fallback speakers.
 */

const { buildRuntimeContext, scoreCompanionQuality } = require('./runtimeOrchestrator');
const { buildRetrievalEvidencePack } = require('./retrievalEvidencePack');
const { composeReasonFirstReply } = require('./reasonFirstComposer');
const { validateReasonFirstReply } = require('./doctrineBoundaryValidator');
const { polishCompanionReply } = require('./companionReplyPolish');
const { sanitizeDoctrineResponse } = require('./runtimeResponseSanitizer');
const { stripInternalRuntimeLabels } = require('./runtimeLabelStripper');
const {
  isCoreRestorationDebugEnabled,
  buildCoreRestorationDebug,
} = require('./coreRestorationDebug');
const {
  detectDangerousFallbackSpeaker,
  stripDangerousFallbackSpeaker,
  buildConnectionErrorReply,
} = require('./coreResponseGuards');
const { validateOwnershipReply } = require('./ownershipAntiOverrideGuard');
const { evaluateDirectness } = require('./directnessGuard');
const { detectForbiddenProse, stripForbiddenProse } = require('./forbiddenProseGuard');
const { validateBibleOnlyAuthority } = require('./bibleOnlyAuthorityValidator');
const { logRequestMemory } = require('./requestMemoryLogger');
const { normalizeClaims } = require('./claimNormalizer');
const { validateClaimToScripture, applyClaimDegradation } = require('./claimToScriptureValidator');
const { formatDirectDoctrineReply } = require('./directAnswerFormatter');
const { buildDoctrineAnswerTrace, writeDoctrineAnswerTrace } = require('./doctrineAnswerTrace');
const { attachDoctrineStrictContract } = require('./doctrineAuthorityContract');
const { validateDoctrineStrictReply } = require('./doctrineStrictValidator');
const { buildDoctrineStrictSafeAnswer } = require('./doctrineStrictSafeAnswer');
const { logDoctrineStrictFailure } = require('./phase4c1RuntimeDiagnostics');
const {
  syncUsedWitnessesFromReply,
} = require('./doctrineWitnessInventory');
const { setActiveDoctrineConversation, recordUserTurn } = require('./doctrineConversationState');
const { containsMemoryDenial, buildDoctrineMemoryRecallReply } = require('./doctrineLivePathHandlers');
const {
  planCompanionDoctrineRouting,
  applyDoctrineRoutingSideEffects,
  buildCompanionLaneFallbackReply,
  buildRoutingContext,
} = require('./companionDoctrineRouter');
const {
  recordUserCorrection,
  getUserAnswerPreferences,
} = require('./userCorrectionMemory');
const { runBibleCompanionOrchestrator } = require('./bibleCompanionOrchestrator');
const { validateFinalityReply, stripFinalityViolations } = require('./doctrineFinalityMode');
const { applyDoctrineErrorFirewall, mapInternalErrorToUserMessage } = require('./doctrineErrorFirewall');
const { applyDoctrineFinalityPipeline } = require('./doctrineFinalityContract');
const { runStrictDoctrineGate, mustBlockOpenAi } = require('./strictDoctrineGate');
const { logPhase4eLivePathError } = require('./phase4eRuntimeDiagnostics');
const {
  logPhase4d1CircuitBreaker,
  logPhase4d1OpenAiTimeout,
} = require('./phase4d1RuntimeDiagnostics');

function buildDoctrineStrictRegenHint(validation = {}) {
  const parts = (validation.violations || []).map((v) => v.detail || v.code);
  return `DOCTRINE STRICT VALIDATION FAILED. Fix: ${parts.join('; ')}. Use only approved witnesses for doctrine. Do not use caution passages as proof. No forbidden balancing phrases. Yes/no first when required.`;
}

function mergeDoctrineStrictSafeStructured(structured, safe, evidencePack) {
  return {
    ...structured,
    ...safe,
    reply: polishFinalReply(safe.reply || safe.finalAnswer || structured.reply),
    scripture: safe.scriptureWitnesses || structured.scripture || [],
    admin_flags: [
      ...new Set([...(structured.admin_flags || []), 'doctrine_strict_safe_corpus', 'safe_corpus_fallback']),
    ],
    runtime: {
      ...(structured.runtime || {}),
      doctrineStrictSafeAnswer: true,
      doctrineStrictTopic: evidencePack.doctrineStrict?.strictTopic,
    },
  };
}

function polishFinalReply(reply = '', polishCtx = {}) {
  let text = stripInternalRuntimeLabels(String(reply || ''));
  const prefs = polishCtx.userPreferences || getUserAnswerPreferences(polishCtx.userId);
  text = formatDirectDoctrineReply(text, polishCtx.message || '', {
    topic: polishCtx.topic,
    scripture: polishCtx.scripture || [],
    userId: polishCtx.userId,
    userPreferences: prefs,
    polarity: polishCtx.polarity,
  });
  return polishCompanionReply(sanitizeDoctrineResponse(text));
}

function returnBibleWideStructured(H, ctx) {
  const {
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
    route,
    concept,
  } = ctx;

  recordUserTurn(userId, message, 'bible_wide');

  let out = structured;
  out.reply = polishFinalReply(out.reply, {
    message,
    topic: concept,
    scripture: out.scripture,
    userId,
    userPreferences: getUserAnswerPreferences(userId),
  });
  out.quality = scoreCompanionQuality({ message, reply: out.reply, runtimeContext });
  out.runtime = {
    ...(out.runtime || {}),
    masterRoute: route || out.runtime?.masterRoute || 'bible_wide_reasoning',
    openAiCalled: false,
    buddyRuntime: 'core_openai_first',
    bibleWideReasoning: true,
    bibleConcept: concept,
  };

  attachDebug(out, {
    runtimeUsed: 'core_openai_first',
    openaiCalled: false,
    finalAnswerAuthor: 'bible_wide_reasoning',
    fallbackUsed: false,
    templateUsed: false,
    responderUsed: false,
    routeUsed: route || 'bible_wide_reasoning',
    doctrineValidatorUsed: false,
    scriptureEvidenceUsed: !!(out.scripture?.length),
    activeTopicUsedAsContextOnly: false,
    currentIntent: runtimeContext?.intent || 'study',
    historyAllowed: true,
  });

  return H.finalizeBuddyResponse({
    structured: out,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
  });
}

function returnCompanionLaneStructured(H, ctx) {
  const {
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
    route,
    routePlan,
  } = ctx;

  recordUserTurn(userId, message, 'companion');

  let out = structured;
  out.reply = polishFinalReply(out.reply, {
    message,
    scripture: out.scripture,
    userId,
    userPreferences: getUserAnswerPreferences(userId),
  });
  out.quality = scoreCompanionQuality({ message, reply: out.reply, runtimeContext });
  out.runtime = {
    ...(out.runtime || {}),
    masterRoute: route || 'companion_lane',
    openAiCalled: !!out.runtime?.openAiCalled,
    buddyRuntime: 'core_openai_first',
    companionLane: true,
    companionIntent: routePlan?.intent || 'companion_general',
    doctrineTopic: null,
  };

  attachDebug(out, {
    runtimeUsed: 'core_openai_first',
    openaiCalled: !!out.runtime?.openAiCalled,
    finalAnswerAuthor: out.runtime?.openAiCalled ? 'openai' : 'companion_release',
    fallbackUsed: false,
    templateUsed: false,
    responderUsed: !!out.runtime?.openAiCalled,
    routeUsed: route || 'companion_lane',
    doctrineValidatorUsed: false,
    scriptureEvidenceUsed: !!(out.scripture?.length),
    activeTopicUsedAsContextOnly: false,
    currentIntent: routePlan?.intent || runtimeContext?.intent || 'companion',
    historyAllowed: true,
  });

  return H.finalizeBuddyResponse({
    structured: out,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
  });
}

function returnStrictDoctrineStructured(H, ctx) {
  const {
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
    evidencePack,
    topic,
    route,
  } = ctx;

  recordUserTurn(userId, message, 'strict_doctrine');

  let out = structured;
  out.reply = polishFinalReply(out.reply, {
    message,
    topic,
    scripture: out.scripture,
    userId,
    userPreferences: getUserAnswerPreferences(userId),
  });
  out = applyDoctrineFinalityPipeline({
    structured: out,
    topic,
    userId,
    message,
    evidencePack,
  });
  out.quality = scoreCompanionQuality({ message, reply: out.reply, runtimeContext });

  attachDebug(out, {
    runtimeUsed: 'core_openai_first',
    openaiCalled: false,
    finalAnswerAuthor: route || out.runtime?.masterRoute || 'strict_doctrine_gate',
    fallbackUsed: false,
    templateUsed: false,
    responderUsed: false,
    routeUsed: route || out.runtime?.masterRoute || 'strict_doctrine_gate',
    doctrineValidatorUsed: true,
    scriptureEvidenceUsed: !!(out.scripture?.length),
    activeTopicUsedAsContextOnly: true,
    currentIntent: evidencePack.currentIntent || 'study',
    historyAllowed: !!evidencePack.historyAllowed,
  });

  return H.finalizeBuddyResponse({
    structured: out,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
  });
}

function attachDebug(structured, meta) {
  const coreDebug = buildCoreRestorationDebug(meta);
  structured.runtime = { ...(structured.runtime || {}), coreDebug };
  if (isCoreRestorationDebugEnabled()) {
    structured.coreDebug = coreDebug;
  }
  return structured;
}

async function runOpenAiFirstCompanionRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const { userId, testerId, sessionId, cohort, mode, personaKey, message } = H.normalizeInput(
    inputOrUserId,
    modeArg,
    personaKeyArg,
    messageArg
  );

  const safety = H.classifySafety(message);
  const profile = H.getUserCompanionProfile(userId);
  const recentSessions = H.getRecentSessions(userId, 8);

  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, safety });
  runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  runtimeContext.userId = userId;
  runtimeContext.profile = profile;
  runtimeContext.safety = safety;

  if (safety.level === 'crisis') {
    const crisisReply = H.fallbackReply({ message, safety });
    crisisReply.quality = scoreCompanionQuality({ message, reply: crisisReply.reply, runtimeContext });
    crisisReply.reply = polishFinalReply(crisisReply.reply);
    crisisReply.runtime = {
      emotion: runtimeContext.emotion,
      intent: 'crisis',
      masterRoute: 'crisis',
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      companionPresentation: { skipRelationshipEnrichment: true, skipStudyPrompts: true },
    };
    attachDebug(crisisReply, {
      runtimeUsed: 'core_openai_first',
      openaiCalled: false,
      finalAnswerAuthor: 'crisis_protocol',
      fallbackUsed: true,
      templateUsed: false,
      responderUsed: false,
      routeUsed: 'crisis',
      doctrineValidatorUsed: false,
      scriptureEvidenceUsed: false,
      activeTopicUsedAsContextOnly: true,
      currentIntent: 'crisis',
      historyAllowed: false,
    });
    return H.finalizeBuddyResponse({
      structured: crisisReply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
      testerId,
      sessionId,
      cohort,
    });
  }

  const evidencePack = buildRetrievalEvidencePack({
    userId,
    message,
    mode,
    recentSessions,
    runtimeContext,
    profile,
    safety,
    routingHintsOnly: true,
  });
  evidencePack.userMessage = message;
  evidencePack.userId = userId;

  const orchestratorResult = runBibleCompanionOrchestrator({
    H,
    userId,
    message,
    mode,
    personaKey,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
    evidencePack,
    recentSessions,
  });

  if (orchestratorResult.handled) {
    const ctx = orchestratorResult.ctx;
    if (orchestratorResult.dispatch === 'strict') {
      logPhase4d1CircuitBreaker({
        userId,
        message,
        topic: ctx.topic,
        route: ctx.route,
      });
      return returnStrictDoctrineStructured(H, ctx);
    }
    if (orchestratorResult.dispatch === 'bible_wide') {
      return returnBibleWideStructured(H, ctx);
    }
    if (orchestratorResult.dispatch === 'companion') {
      return returnCompanionLaneStructured(H, ctx);
    }
  }

  const routePlan = orchestratorResult.routePlan ||
    planCompanionDoctrineRouting({
      userId,
      message,
      recentSessions,
      runtimeContext,
    });

  if (mustBlockOpenAi(evidencePack, userId, message, routePlan)) {
    logPhase4eLivePathError({
      userId,
      message,
      reason: 'strict_gate_miss_forced_retry',
      topic: routePlan.strictTopic || evidencePack.doctrineStrict?.strictTopic,
    });
    const retryGate = runStrictDoctrineGate({
      userId,
      message,
      evidencePack,
      recentSessions,
      safety,
      runtimeContext,
      routePlan,
    });
    if (retryGate.handled) {
      return returnStrictDoctrineStructured(H, {
        structured: retryGate.structured,
        userId,
        mode,
        personaKey,
        message,
        safety,
        runtimeContext,
        profile,
        testerId,
        sessionId,
        cohort,
        evidencePack,
        topic: retryGate.topic,
      });
    }
  }

  const turnStarted = Date.now();
  let openaiAttempts = 0;
  let doctrineStrictRegenerated = false;
  let doctrineStrictValidation = null;
  let doctrineStrictSafeUsed = false;

  if (mustBlockOpenAi(evidencePack, userId, message, routePlan)) {
    logPhase4eLivePathError({ userId, message, reason: 'openai_blocked_strict_doctrine' });
    const { buildFinalAuthorityAnswer, buildFinalAuthorityStructured } = require('./doctrineFinalAuthorityEngine');
    const topic = routePlan.strictTopic || evidencePack.doctrineStrict?.strictTopic;
    if (!topic) {
      /* companion lane — do not resurrect stale active topic */
    } else {
    const authority = buildFinalAuthorityAnswer({
      topic,
      contract: evidencePack.doctrineStrict?.contract || require('./doctrineAuthorityContract').BASE_CONTRACTS[topic],
      userId,
      message,
    });
    if (authority) {
      return returnStrictDoctrineStructured(H, {
        structured: buildFinalAuthorityStructured(authority, runtimeContext, safety),
        userId,
        mode,
        personaKey,
        message,
        safety,
        runtimeContext,
        profile,
        testerId,
        sessionId,
        cohort,
        evidencePack,
        topic,
        route: 'doctrine_final_authority_openai_block',
      });
    }
    const safe = buildDoctrineStrictSafeAnswer({
      message,
      evidencePack,
      contract: evidencePack.doctrineStrict?.contract,
      violations: [{ code: 'openai_blocked', detail: 'strict_doctrine_local_only' }],
    });
    return returnStrictDoctrineStructured(H, {
      structured: mergeDoctrineStrictSafeStructured(
        { reply: '', runtime: { openAiCalled: false } },
        safe,
        evidencePack,
      ),
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
      testerId,
      sessionId,
      cohort,
      evidencePack,
      topic,
      route: 'doctrine_strict_safe_openai_block',
    });
    }
  }

  let composed = await composeReasonFirstReply({
    userId,
    mode,
    personaKey,
    message,
    safety,
    profile,
    runtimeContext,
    evidencePack,
    coreRestoration: true,
    maxAttempts: 1,
  });
  openaiAttempts += composed.attempts || (composed.openaiCalled ? 1 : 0);

  let structured = composed.structured;
  let openaiCalled = !!composed.openaiCalled;
  let finalAnswerAuthor = 'openai';
  let fallbackUsed = false;
  let errorMessage = composed.apiError || null;
  let regenerated = false;
  let claimDegraded = false;
  let guards = null;
  let claimValidation = null;
  const currentIntent = evidencePack.currentIntent || 'unclear';
  const historyAllowed = !!evidencePack.historyAllowed;

  if (!openaiCalled) {
    if (errorMessage === 'openai_timeout' || String(errorMessage || '').includes('timeout')) {
      logPhase4d1OpenAiTimeout({ userId, message, topic: evidencePack.doctrineStrict?.strictTopic, error: errorMessage });
    }
    if (evidencePack.doctrineStrict?.enabled) {
      const safe = buildDoctrineStrictSafeAnswer({
        message,
        evidencePack,
        contract: evidencePack.doctrineStrict.contract,
        violations: [{ code: 'openai_failure', detail: errorMessage || 'openai_unavailable' }],
      });
      structured = mergeDoctrineStrictSafeStructured(structured, safe, evidencePack);
      fallbackUsed = true;
      doctrineStrictSafeUsed = true;
      finalAnswerAuthor = 'doctrine_strict_safe_corpus';
      setActiveDoctrineConversation({
        userId,
        topic: evidencePack.doctrineStrict.strictTopic,
        contract: evidencePack.doctrineStrict.contract,
        userMessage: message,
        answerSummary: structured.reply,
      });
      syncUsedWitnessesFromReply(userId, evidencePack.doctrineStrict.strictTopic, structured.reply);
      logDoctrineStrictFailure({
        event: 'openai_failure_safe_fallback',
        message,
        topic: evidencePack.doctrineStrict.strictTopic,
        error: errorMessage,
      });
    } else {
      fallbackUsed = true;
      const companionFallback =
        routePlan.lane === 'companion'
          ? buildCompanionLaneFallbackReply(message, buildRoutingContext(userId, { runtimeContext, recentSessions }))
          : null;
      if (companionFallback?.reply) {
        finalAnswerAuthor = 'companion_lane_fallback';
        structured = {
          reply: companionFallback.reply,
          scripture: companionFallback.scripture || [],
          mode: 'companion',
          confidence: 'medium',
          memory_used: false,
          safety_level: safety?.level || 'standard',
          admin_flags: ['companion_lane_fallback', `companion_intent_${routePlan.intent || 'companion'}`],
          runtime: {
            masterRoute: 'companion_lane_fallback',
            openAiCalled: false,
            buddyRuntime: 'core_openai_first',
            companionLane: true,
            companionIntent: routePlan.intent || 'companion_general',
          },
        };
        recordUserTurn(userId, message, 'companion');
      } else {
        finalAnswerAuthor = 'connection_error';
        structured = buildConnectionErrorReply({
          error: errorMessage || composed.validation?.issues?.[0] || 'openai_unavailable',
          safety,
        });
        structured.reply = mapInternalErrorToUserMessage(errorMessage, { strictDoctrine: false });
        structured.runtime = {
          ...(structured.runtime || {}),
          buddyRuntime: 'core_openai_first',
          companionPresentation: {
            skipRelationshipEnrichment: true,
            skipStudyPrompts: true,
          },
        };
      }
      structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
    }
  } else {
    structured.reply = polishFinalReply(structured.reply);

    if (evidencePack.doctrineStrict?.enabled) {
      const finalityCheck = validateFinalityReply(structured.reply);
      if (!finalityCheck.passed) {
        structured.reply = polishFinalReply(stripFinalityViolations(structured.reply));
        structured.admin_flags = [
          ...new Set([...(structured.admin_flags || []), 'finality_violation_stripped']),
        ];
      }
      doctrineStrictValidation = validateDoctrineStrictReply({
        reply: structured.reply,
        message,
        evidencePack,
        structured,
      });

      if (!doctrineStrictValidation.passed && !doctrineStrictRegenerated) {
        if (mustBlockOpenAi(evidencePack, userId, message, routePlan)) {
          const { buildFinalAuthorityAnswer, buildFinalAuthorityStructured } = require('./doctrineFinalAuthorityEngine');
          const blockTopic = routePlan.strictTopic || evidencePack.doctrineStrict.strictTopic;
          const blockAuthority = buildFinalAuthorityAnswer({
            topic: blockTopic,
            contract: evidencePack.doctrineStrict.contract,
            userId,
            message,
          });
          if (blockAuthority) {
            structured = buildFinalAuthorityStructured(blockAuthority, runtimeContext, safety);
            structured.reply = polishFinalReply(structured.reply);
            doctrineStrictRegenerated = true;
            doctrineStrictValidation = validateDoctrineStrictReply({
              reply: structured.reply,
              message,
              evidencePack,
              structured,
            });
          }
        } else {
        const regenInstruction = buildDoctrineStrictRegenHint(doctrineStrictValidation);
        composed = await composeReasonFirstReply({
          userId,
          mode,
          personaKey,
          message,
          safety,
          profile,
          runtimeContext,
          evidencePack: {
            ...evidencePack,
            answerGuidance: {
              ...evidencePack.answerGuidance,
              directAnswerFirst: true,
              forbidStudyContinuation: true,
            },
          },
          coreRestoration: true,
          maxAttempts: 1,
          regenInstruction,
        });
        openaiAttempts += composed.attempts || (composed.openaiCalled ? 1 : 0);
        doctrineStrictRegenerated = true;

        if (composed.openaiCalled) {
          structured = composed.structured;
          structured.reply = polishFinalReply(structured.reply);
          doctrineStrictValidation = validateDoctrineStrictReply({
            reply: structured.reply,
            message,
            evidencePack,
            structured,
          });
        }
        }
      }

      if (!doctrineStrictValidation.passed) {
        logDoctrineStrictFailure({
          event: 'doctrine_strict_validation_failed',
          message,
          topic: evidencePack.doctrineStrict.strictTopic,
          violations: doctrineStrictValidation.violations,
          regenerated: doctrineStrictRegenerated,
        });
        const safe = buildDoctrineStrictSafeAnswer({
          message,
          evidencePack,
          contract: evidencePack.doctrineStrict.contract,
          violations: doctrineStrictValidation.violations,
        });
        structured = mergeDoctrineStrictSafeStructured(structured, safe, evidencePack);
        fallbackUsed = true;
        doctrineStrictSafeUsed = true;
        finalAnswerAuthor = 'doctrine_strict_safe_corpus';
      }

      setActiveDoctrineConversation({
        userId,
        topic: evidencePack.doctrineStrict.strictTopic,
        contract: evidencePack.doctrineStrict.contract,
        userMessage: message,
        answerSummary: structured.reply,
      });
      syncUsedWitnessesFromReply(userId, evidencePack.doctrineStrict.strictTopic, structured.reply);
    }

    const runGuards = () => {
      const claims = structured.claims?.length
        ? structured.claims
        : normalizeClaims([], {
            reply: structured.reply,
            scripture: structured.scripture || [],
            evidencePack,
          });
      const claimCheck = validateClaimToScripture({
        reply: structured.reply,
        claims,
        evidencePack,
        message,
      });
      structured.claims = claims;
      structured.claimValidation = claimCheck;
      claimValidation = claimCheck;

      const ownership = validateOwnershipReply({
        message,
        reply: structured.reply,
        evidencePack,
        openaiCalled: true,
        fallbackUsed: false,
      });
      const directness = evaluateDirectness({
        message,
        reply: structured.reply,
        currentIntent,
        evidencePack,
        openaiCalled: true,
        historyAllowed,
      });
      const forbidden = detectForbiddenProse(structured.reply);
      const bibleOnlyAuthority = validateBibleOnlyAuthority({
        reply: structured.reply,
        evidencePack,
        historyAllowed,
        message,
      });
      return { ownership, directness, forbidden, bibleOnlyAuthority, claimValidation: claimCheck };
    };

    if (containsMemoryDenial(structured.reply)) {
      const recall = buildDoctrineMemoryRecallReply(userId);
      if (recall.topic) structured.reply = polishFinalReply(recall.reply);
    }

    guards = runGuards();
    const needsRegen =
      !evidencePack.doctrineStrict?.enabled &&
      !regenerated &&
      (!guards.ownership.passed ||
        !guards.directness.passed ||
        guards.forbidden.detected ||
        !guards.bibleOnlyAuthority.passed ||
        !guards.claimValidation.passed);

    if (needsRegen) {
      const regenInstruction =
        guards.claimValidation.regenHint ||
        guards.bibleOnlyAuthority.regenHint ||
        guards.directness.regenInstruction ||
        guards.ownership.regenInstruction ||
        'Answer the latest user question directly. Use evidence silently. Do not use template language, study continuation, prior-topic continuation, or history unless asked.';

      composed = await composeReasonFirstReply({
        userId,
        mode,
        personaKey,
        message,
        safety,
        profile,
        runtimeContext,
        evidencePack: {
          ...evidencePack,
          answerGuidance: {
            ...evidencePack.answerGuidance,
            directAnswerFirst: true,
            forbidStudyContinuation: true,
            suppressPriorStudyTopic: true,
          },
        },
        coreRestoration: true,
        maxAttempts: 1,
        regenInstruction,
      });
      openaiAttempts += composed.attempts || (composed.openaiCalled ? 1 : 0);

      if (composed.openaiCalled) {
        structured = composed.structured;
        structured.reply = polishFinalReply(structured.reply);
        regenerated = true;
        guards = runGuards();
      }
    }

    if (guards && !guards.claimValidation.passed) {
      structured.reply = polishFinalReply(
        applyClaimDegradation(structured.reply, guards.claimValidation)
      );
      claimDegraded = true;
      structured.admin_flags = [
        ...new Set([...(structured.admin_flags || []), 'claim_validation_degraded']),
      ];
      guards = runGuards();
      claimValidation = guards.claimValidation;
    }

    const danger = detectDangerousFallbackSpeaker(structured.reply);
    const forbiddenFinal = detectForbiddenProse(structured.reply);
    if (danger.detected || forbiddenFinal.detected) {
      structured.reply = polishFinalReply(
        stripForbiddenProse(stripDangerousFallbackSpeaker(structured.reply))
      );
      structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'dangerous_fallback_stripped'])];
    }
  }

  const validation =
    composed.validation || validateReasonFirstReply({ reply: structured.reply, evidencePack });
  const dangerCheck = detectDangerousFallbackSpeaker(structured.reply);
  const forbiddenCheck = detectForbiddenProse(structured.reply);
  const ownershipFinal = validateOwnershipReply({
    message,
    reply: structured.reply,
    evidencePack,
    openaiCalled,
    fallbackUsed,
  });
  const directnessFinal = evaluateDirectness({
    message,
    reply: structured.reply,
    currentIntent,
    evidencePack,
    openaiCalled,
    historyAllowed,
  });
  const scriptureEvidenceUsed = !!(evidencePack.scripture?.references?.length);
  const evidenceCardsUsed = !!(evidencePack.evidenceCards?.cards?.length);
  const discoveryReinforcementCount = (evidencePack.discoveryReinforcement || []).length;

  if (openaiCalled && evidenceCardsUsed && process.env.BUDDY_LEARNING_LOG === '1') {
    try {
      const { logEvidencePackUsage } = require('./bibleLearningLog');
      logEvidencePackUsage({
        userId,
        message,
        topic: evidencePack.topic,
        evidenceCardsUsed: evidencePack.evidenceCards?.cards || [],
        reinforcement: evidencePack.discoveryReinforcement || [],
        answerQuality: {
          directAnswerFirst: true,
          validatorPassed: validation?.passed ?? null,
          witnessCount: (structured.scripture || []).length,
        },
      });
    } catch (_) {
      /* non-fatal */
    }
  }

  const doctrineTrace = openaiCalled
    ? buildDoctrineAnswerTrace({
        userMessage: message,
        evidencePack,
        claims: structured.claims || [],
        claimValidation: claimValidation || structured.claimValidation || {},
        reply: structured.reply,
        approval: {
          status: claimDegraded ? 'degraded' : claimValidation?.passed === false ? 'rejected' : 'approved',
          degraded: claimDegraded,
          regenerated,
        },
        composeMeta: {
          doctrineConclusion: structured.doctrineConclusion || '',
          openaiAttempts,
        },
      })
    : null;
  if (doctrineTrace) writeDoctrineAnswerTrace(doctrineTrace);

  structured.runtime = {
    ...(structured.runtime || {}),
    buddyRuntime: 'core_openai_first',
    masterRoute: structured.runtime?.masterRoute || (openaiCalled ? 'core_openai_compose' : 'core_connection_error'),
    openAiCalled: openaiCalled,
    evidenceTopic: evidencePack.topic,
    effectiveTopic: evidencePack.effectiveTopic,
    routingHintsOnly: true,
    currentIntent,
    historyAllowed,
    validation: validation ? { passed: validation.passed } : null,
    claimValidation: claimValidation ? { passed: claimValidation.passed } : structured.claimValidation ? { passed: structured.claimValidation.passed } : null,
    claimDegraded,
    doctrineTraceId: doctrineTrace?.traceId || null,
    regenerated,
    doctrineStrict: evidencePack.doctrineStrict?.enabled
      ? {
          enabled: true,
          strictTopic: evidencePack.doctrineStrict.strictTopic,
          validationPassed: doctrineStrictValidation?.passed ?? null,
          violationCodes: (doctrineStrictValidation?.violations || []).map((v) => v.code),
          regenerated: doctrineStrictRegenerated,
          safeCorpusUsed: doctrineStrictSafeUsed,
        }
      : { enabled: false },
    ownershipGuard: { passed: ownershipFinal.passed },
    directnessGuard: {
      passed: directnessFinal.passed,
      answerMatchesLatestQuestion: directnessFinal.answerMatchesLatestQuestion,
    },
    companionPresentation: {
      skipRelationshipEnrichment: true,
      skipStudyPrompts: true,
    },
  };

  attachDebug(structured, {
    runtimeUsed: 'core_openai_first',
    currentIntent,
    historyAllowed,
    openaiCalled,
    openaiResponseReceived: openaiCalled && String(structured.reply || '').length > 10,
    finalAnswerAuthor,
    fallbackUsed,
    templateUsed: dangerCheck.detected || ownershipFinal.templateUsed || forbiddenCheck.detected,
    responderUsed: openaiCalled,
    routeUsed: structured.runtime.masterRoute,
    studyLoopUsed: dangerCheck.studyLoopUsed || ownershipFinal.studyLoopUsed,
    prayerTemplateUsed: dangerCheck.prayerTemplateUsed,
    scriptureWitnessTemplateUsed: dangerCheck.scriptureWitnessTemplateUsed,
    doctrineValidatorUsed: true,
    scriptureEvidenceUsed,
    activeTopicUsedAsContextOnly: true,
    evidenceTopic: evidencePack.topic,
    validation,
    errorMessage,
    currentQuestionMatch: ownershipFinal.currentQuestionMatch,
    evidenceCardsUsed,
    approvedDoctrineFrozen: true,
    discoveryReinforcementCount,
    buildConnectionErrorReplyUsed: !openaiCalled,
    sourceGroundedResponderUsed: false,
    sabbathHistoryDeepResponderUsed: false,
    studyFallbackUsed: dangerCheck.studyLoopUsed || ownershipFinal.studyLoopUsed,
    relationshipEnrichmentUsed: false,
    forbiddenPhraseDetected: forbiddenCheck.detected,
    answerMatchesLatestQuestion: directnessFinal.answerMatchesLatestQuestion,
    correctionRepair: directnessFinal.correctionRepair,
    regenerated,
    openaiAttempts,
    evidenceUsed: validation?.evidenceUsed ?? guards?.bibleOnlyAuthority?.evidenceUsed,
    bibleOnlyAuthorityPassed: validation?.bibleOnlyAuthority?.passed,
    claimValidationPassed: claimValidation?.passed,
    claimDegraded,
    doctrineTraceId: doctrineTrace?.traceId || null,
    doctrineStrictEnabled: evidencePack.doctrineStrict?.enabled || false,
    doctrineStrictSafeUsed,
    doctrineStrictRegenerated,
  });

  structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });

  let evidencePackApproxBytes = 0;
  try {
    evidencePackApproxBytes = Buffer.byteLength(JSON.stringify(evidencePack), 'utf8');
  } catch (_) {
    evidencePackApproxBytes = 0;
  }

  if (openaiAttempts > 2) {
    structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'openai_attempt_cap_exceeded'])];
  }

  logRequestMemory({
    userId,
    message,
    openaiCalled,
    regenerated,
    openaiAttempts: Math.min(openaiAttempts, 2),
    evidencePackApproxBytes,
    latencyMs: Date.now() - turnStarted,
  });

  structured = applyDoctrineErrorFirewall(structured, {
    userId,
    topic: evidencePack.doctrineStrict?.strictTopic || evidencePack.topic,
    strictDoctrine: evidencePack.doctrineStrict?.enabled || false,
  });

  return H.finalizeBuddyResponse({
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    doctrineTopic: evidencePack.topic,
    testerId,
    sessionId,
    cohort,
  });
}

module.exports = {
  runOpenAiFirstCompanionRuntime,
};
