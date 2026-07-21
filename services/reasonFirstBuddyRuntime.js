/**
 * Reason-first Buddy runtime — primary OpenAI composer path.
 *
 * Activated via BUDDY_RUNTIME=reason_first (buddyBrain.runBuddy).
 * Legacy runtime unchanged (BUDDY_RUNTIME=legacy).
 *
 * Flow:
 *   User message → conversation understanding → retrieve evidence → OpenAI compose
 *   → doctrine validation → light polish → persist
 */

const { buildRuntimeContext, scoreCompanionQuality } = require('./runtimeOrchestrator');
const { buildRetrievalEvidencePack } = require('./retrievalEvidencePack');
const { composeReasonFirstReply } = require('./reasonFirstComposer');
const { validateReasonFirstReply } = require('./doctrineBoundaryValidator');
const { logReasonFirstTrace } = require('./reasonFirstTrace');
const { updateActiveConversation } = require('./activeConversationManager');

let recordCompanionEventFn = () => ({ ok: true, skipped: true });
try {
  ({ recordCompanionEvent: recordCompanionEventFn } = require('./companionIntelligence'));
} catch (_) {}

const CRISIS_REPLY =
  "I'm really sorry you're carrying this. I am not a therapist or emergency service, but your safety matters right now. If you might hurt yourself or feel in immediate danger, please call emergency services now. If you're in the U.S., call or text 988 for the Suicide & Crisis Lifeline.";

function recordReasonFirstConversation({ userId, message, structured, evidencePack }) {
  const topic =
    evidencePack.topic ||
    evidencePack.companionContext?.grief
      ? 'grief'
      : evidencePack.companionContext?.health
        ? 'health'
        : evidencePack.companionContext?.prayer
          ? 'prayer'
          : evidencePack.companionContext?.discernment
            ? 'discernment'
            : null;

  if (!topic) return;

  updateActiveConversation({
    userId,
    topic,
    subtopic: evidencePack.understanding?.requestedAnswerType || null,
    questionType: evidencePack.understanding?.questionType,
    message,
    answerSummary: String(structured.reply || '').slice(0, 200),
    lastDirectQuestion: String(message || '').slice(0, 400),
    lockUntilResolved: !!evidencePack.understanding?.strictAnswerMode,
    allowMemorySurfacing: !evidencePack.understanding?.strictAnswerMode,
    allowStudyPrompt: false,
    correctionMode: !!evidencePack.understanding?.isCorrection,
    frustrationMode: !!evidencePack.understanding?.isFrustrated,
    strictAnswerMode: !!evidencePack.understanding?.strictAnswerMode,
    correctionCount: evidencePack.correctionLedger?.correctionCount || evidencePack.activeConversation?.correctionCount || 0,
  });
}

/**
 * Reason-first entry — same signature as runMasterBuddyRuntime.
 */
async function runReasonFirstBuddyRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const startedAt = Date.now();
  const { userId, mode, personaKey, message } = H.normalizeInput(inputOrUserId, modeArg, personaKeyArg, messageArg);

  if (!message || !String(message).trim()) {
    const empty = H.fallbackReply({ message, safety: { level: 'standard' } });
    logReasonFirstTrace({
      runtimeUsed: 'reason_first',
      openaiCalled: false,
      reply: empty.reply,
      userQuestion: message,
      validation: { doctrineValidationResult: 'skipped' },
      userId,
      masterRoute: 'reason_first_empty',
      elapsedMs: Date.now() - startedAt,
    });
    return empty;
  }

  const safety = H.classifySafety(message);
  const profile = H.getUserCompanionProfile(userId);
  const recentSessions = H.getRecentSessions(userId, 10);

  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, safety });
  runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  runtimeContext.userId = userId;
  runtimeContext.safety = safety;

  if (safety.level === 'crisis') {
    const structured = {
      reply: CRISIS_REPLY,
      scripture: [{ reference: 'Psalm 34:18', text: '', reason: 'comfort in crisis' }],
      mode: 'crisis',
      confidence: 'high',
      memory_used: false,
      safety_level: 'crisis',
      runtime: { masterRoute: 'reason_first_crisis', openaiCalled: false },
    };
    structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
    H.appendSession({ userId, mode, personaKey, message, reply: structured.reply, structured, safety, runtime: runtimeContext, quality: structured.quality });
    logReasonFirstTrace({
      runtimeUsed: 'reason_first',
      openaiCalled: false,
      reply: structured.reply,
      userQuestion: message,
      validation: { doctrineValidationResult: 'crisis_protocol' },
      userId,
      masterRoute: 'reason_first_crisis',
      elapsedMs: Date.now() - startedAt,
    });
    return structured;
  }

  const evidencePack = buildRetrievalEvidencePack({
    userId,
    message,
    mode,
    recentSessions,
    runtimeContext,
    profile,
    safety,
  });

  const composed = await composeReasonFirstReply({
    userId,
    mode,
    personaKey,
    message,
    safety,
    profile,
    runtimeContext,
    evidencePack,
  });

  let structured = composed.structured;
  const validation = composed.validation || validateReasonFirstReply({ reply: structured.reply, evidencePack });

  structured.runtime = {
    ...(structured.runtime || {}),
    buddyRuntime: 'reason_first',
    masterRoute: structured.runtime?.masterRoute || 'reason_first_openai',
    openaiCalled: composed.openaiCalled,
    evidenceTopic: evidencePack.topic,
    validation,
    reasoningSnapshot: evidencePack.understanding,
    companionPresentation: { skipRelationshipEnrichment: true, skipStudyPrompts: true },
  };

  structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });

  const finalized = H.finalizeBuddyResponse({
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    doctrineTopic: evidencePack.topic,
  });

  recordReasonFirstConversation({ userId, message, structured: finalized, evidencePack });

  logReasonFirstTrace({
    runtimeUsed: 'reason_first',
    openaiCalled: composed.openaiCalled,
    reply: finalized.reply,
    userQuestion: message,
    validation,
    userId,
    masterRoute: finalized.runtime?.masterRoute,
    elapsedMs: Date.now() - startedAt,
  });

  recordCompanionEventFn({
    type: 'reason_first_runtime',
    userId,
    mode,
    durationMs: Date.now() - startedAt,
    openaiCalled: composed.openaiCalled,
    validationPassed: validation.passed,
  });

  return finalized;
}

module.exports = {
  runReasonFirstBuddyRuntime,
};
