/**
 * Phase 4D.2 — Live path handlers: memory recall, correction, continuation routing.
 */

const {
  getDoctrineConversationState,
  getActiveDoctrineTopic,
  setActiveDoctrineConversation,
  topicDisplayLabel,
  setWitnessExhausted,
} = require('./doctrineConversationState');
const {
  isWitnessContinuationRequest,
  handleWitnessContinuation,
  buildWitnessContinuationStructured,
  USER_FACING_EXHAUSTION_MESSAGE,
} = require('./doctrineWitnessInventory');
const {
  detectCorrectionFromMessage,
  logDoctrineCorrection,
  buildActs10CorrectionReply,
  buildCorrectionPromptAppendix,
} = require('./doctrineCorrectionMemory');
const { isInternalSystemMessage } = require('./doctrineErrorFirewall');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');

const MEMORY_RECALL_PATTERNS = [
  /\bcan you remember what we (were talking about|discussed)\b/i,
  /\bwhat were we (talking about|discussing)\b/i,
  /\bdo you remember what we\b/i,
];

const BEFORE_THAT_PATTERNS = [/\bbefore that\b/i, /\bwhat did we discuss before\b/i];

const STOP_SAYING_PATTERNS = [/\bstop saying\b/i, /\bthat is confusing\b/i, /\bit is about people, not food\b/i];

const CORRECTION_CHALLENGE_PATTERNS = [
  /\bwhy are you saying\b/i,
  /\bwhy did you say\b/i,
  /\bwhy do you keep saying\b/i,
];

const CONTINUATION_EXPANDED = [
  /\bcontinue\b/i,
  /\bgive me more\b/i,
  /\bwhy did you say that\b/i,
  /\bi disagree\b/i,
];

const MEMORY_DENIAL_PATTERNS = [
  /\bi do not have the ability to recall\b/i,
  /\bi cannot remember our previous conversation\b/i,
  /\bi can't remember our previous conversation\b/i,
  /\bi don't have access to (our|previous) (conversation|chat)\b/i,
  /\bremind me what we talked about\b/i,
];

function isDoctrineMemoryRecallRequest(message = '') {
  const m = String(message);
  return MEMORY_RECALL_PATTERNS.some((re) => re.test(m)) || BEFORE_THAT_PATTERNS.some((re) => re.test(m));
}

function isBeforeThatRecall(message = '') {
  return BEFORE_THAT_PATTERNS.some((re) => re.test(String(message)));
}

function isDoctrineCorrectionChallenge(message = '') {
  const m = String(message);
  return (
    CORRECTION_CHALLENGE_PATTERNS.some((re) => re.test(m)) ||
    STOP_SAYING_PATTERNS.some((re) => re.test(m))
  );
}

function isDoctrineContinuationRequest(message = '') {
  if (isWitnessContinuationRequest(message)) return true;
  const m = String(message).trim();
  return CONTINUATION_EXPANDED.some((re) => re.test(m));
}

function containsMemoryDenial(text = '') {
  return MEMORY_DENIAL_PATTERNS.some((re) => re.test(String(text)));
}

function buildDoctrineMemoryRecallReply(userId, message = '') {
  const state = getDoctrineConversationState(userId);
  const beforeThat = isBeforeThatRecall(message);
  const topic = beforeThat && state.previousDoctrineTopic ? state.previousDoctrineTopic : state.activeDoctrineTopic;
  if (topic) {
    const label = topicDisplayLabel(topic);
    const summary = state.lastApprovedAnswerSummary || state.lastDoctrineAnswerSummary || label;
    const prefix = beforeThat
      ? `Before that, we were discussing ${topicDisplayLabel(state.previousDoctrineTopic || topic)}.`
      : `We were discussing ${label}. I'll continue from the approved witness chain.`;
    return {
      reply: `${prefix} ${summary.slice(0, 160)}`,
      scripture: state.lastApprovedWitness ? [{ reference: state.lastApprovedWitness, theme: topic }] : [],
      memoryRecall: true,
      topic,
    };
  }
  return {
    reply:
      'I may have lost the thread in this session, but I can continue from the last approved Bible topic if you tell me the topic.',
    scripture: [],
    memoryRecall: true,
    topic: null,
  };
}

function handleDoctrineCorrectionChallenge({ userId, message, recentSessions = [] }) {
  const topic = getActiveDoctrineTopic(userId) || 'acts_10';
  const detected = detectCorrectionFromMessage(message, topic);

  if (/acts\s*10|primarily|mainly|dietary/i.test(message) || topic === 'acts_10' || topic === 'dietary_law') {
    if (detected) {
      logDoctrineCorrection({
        userId,
        topic: 'acts_10',
        avoidPhrase: detected.avoidPhrase,
        preferredWording:
          'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean.',
        userMessage: message,
      });
    }
    return buildActs10CorrectionReply();
  }

  if (detected?.avoidPhrase) {
    logDoctrineCorrection({
      userId,
      topic,
      avoidPhrase: detected.avoidPhrase,
      preferredWording: BASE_CONTRACTS[topic]?.requiredConclusion || '',
      userMessage: message,
    });
  }

  const contract = BASE_CONTRACTS[topic];
  if (!contract) return null;

  return {
    reply: `You are right to push for clarity. ${contract.requiredConclusion}`,
    scripture: (contract.approvedWitnesses || []).slice(0, 2).map((r) => ({ reference: r, theme: topic })),
    doctrineCorrectionApplied: true,
  };
}

function normalizeIncomingMessage(message = '') {
  const m = String(message).trim();
  if (isInternalSystemMessage(m)) {
    return { normalizedMessage: m, isSystemEcho: true };
  }
  return { normalizedMessage: m, isSystemEcho: false };
}

function buildDoctrineHandlerStructured({
  handlerResult,
  message,
  safety,
  runtimeContext,
  topic,
  route,
}) {
  return {
    reply: handlerResult.reply,
    scripture: handlerResult.scripture || [],
    mode: 'companion',
    confidence: 'high',
    memory_used: handlerResult.memoryRecall || false,
    safety_level: safety?.level || 'standard',
    orb_state: runtimeContext?.intent === 'prayer' ? 'praying' : 'speaking',
    admin_flags: [route],
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: runtimeContext?.intent || 'study',
      masterRoute: route,
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      doctrineLivePathHandler: route,
      doctrineTopic: topic,
    },
  };
}

function tryDoctrineLivePathHandlers({
  userId,
  message,
  evidencePack,
  recentSessions,
  safety,
  runtimeContext,
}) {
  const { normalizedMessage, isSystemEcho } = normalizeIncomingMessage(message);
  const effectiveMessage = isSystemEcho ? 'show me another verse' : normalizedMessage;

  if (isDoctrineMemoryRecallRequest(effectiveMessage)) {
    const recall = buildDoctrineMemoryRecallReply(userId, effectiveMessage);
    return {
      handled: true,
      structured: buildDoctrineHandlerStructured({
        handlerResult: recall,
        message,
        safety,
        runtimeContext,
        topic: recall.topic,
        route: 'doctrine_memory_recall',
      }),
    };
  }

  if (isDoctrineCorrectionChallenge(effectiveMessage)) {
    const correction = handleDoctrineCorrectionChallenge({ userId, message: effectiveMessage, recentSessions });
    if (correction) {
      const topic = getActiveDoctrineTopic(userId) || 'acts_10';
      setActiveDoctrineConversation({
        userId,
        topic,
        contract: BASE_CONTRACTS[topic],
        userMessage: effectiveMessage,
        answerSummary: correction.reply,
      });
      return {
        handled: true,
        structured: buildDoctrineHandlerStructured({
          handlerResult: correction,
          message,
          safety,
          runtimeContext,
          topic,
          route: 'doctrine_correction_memory',
        }),
      };
    }
  }

  if (isDoctrineContinuationRequest(effectiveMessage)) {
    const witnessResult = handleWitnessContinuation({
      userId,
      message: effectiveMessage,
      evidencePack,
      recentSessions,
    });
    if (witnessResult) {
      const topic = getActiveDoctrineTopic(userId) || evidencePack.doctrineStrict?.strictTopic;
      if (witnessResult.exhausted) {
        setWitnessExhausted(userId, true);
      } else if (witnessResult.witness) {
        setActiveDoctrineConversation({
          userId,
          topic,
          contract: BASE_CONTRACTS[topic],
          userMessage: effectiveMessage,
          answerSummary: witnessResult.reply,
          lastWitness: witnessResult.witness,
        });
      }
      const structured = buildWitnessContinuationStructured({
        witnessResult: {
          ...witnessResult,
          reply: witnessResult.exhausted ? USER_FACING_EXHAUSTION_MESSAGE : witnessResult.reply,
        },
        message,
        safety,
        runtimeContext,
        topic,
        userId,
      });
      return { handled: true, structured };
    }
  }

  return { handled: false };
}

module.exports = {
  isDoctrineMemoryRecallRequest,
  isDoctrineCorrectionChallenge,
  isDoctrineContinuationRequest,
  containsMemoryDenial,
  buildDoctrineMemoryRecallReply,
  handleDoctrineCorrectionChallenge,
  tryDoctrineLivePathHandlers,
  buildCorrectionPromptAppendix,
};
