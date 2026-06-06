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

function polishFinalReply(reply = '') {
  return polishCompanionReply(sanitizeDoctrineResponse(stripInternalRuntimeLabels(String(reply || ''))));
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
    maxAttempts: 4,
  });

  let structured = composed.structured;
  let openaiCalled = !!composed.openaiCalled;
  let finalAnswerAuthor = 'openai';
  let fallbackUsed = false;
  let errorMessage = composed.apiError || null;
  let regenerated = false;
  const currentIntent = evidencePack.currentIntent || 'unclear';
  const historyAllowed = !!evidencePack.historyAllowed;

  if (!openaiCalled) {
    fallbackUsed = true;
    finalAnswerAuthor = 'connection_error';
    structured = buildConnectionErrorReply({
      error: errorMessage || composed.validation?.issues?.[0] || 'openai_unavailable',
      safety,
    });
    structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
    structured.runtime = {
      ...(structured.runtime || {}),
      buddyRuntime: 'core_openai_first',
      companionPresentation: {
        skipRelationshipEnrichment: true,
        skipStudyPrompts: true,
      },
    };
  } else {
    structured.reply = polishFinalReply(structured.reply);

    const runGuards = () => {
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
      return { ownership, directness, forbidden };
    };

    let guards = runGuards();
    const needsRegen =
      !guards.ownership.passed || !guards.directness.passed || guards.forbidden.detected;

    if (needsRegen) {
      const regenInstruction =
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
        maxAttempts: 2,
        regenInstruction,
      });

      if (composed.openaiCalled) {
        structured = composed.structured;
        structured.reply = polishFinalReply(structured.reply);
        regenerated = true;
        guards = runGuards();
      }
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

  structured.runtime = {
    ...(structured.runtime || {}),
    buddyRuntime: 'core_openai_first',
    masterRoute: structured.runtime?.masterRoute || (openaiCalled ? 'core_openai_compose' : 'core_connection_error'),
    openAiCalled: openaiCalled,
    evidenceTopic: evidencePack.topic,
    routingHintsOnly: true,
    currentIntent,
    historyAllowed,
    validation,
    regenerated,
    ownershipGuard: ownershipFinal,
    directnessGuard: directnessFinal,
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
  });

  structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });

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
