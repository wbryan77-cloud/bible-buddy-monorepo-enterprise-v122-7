/**
 * Phase 4O / 5E — Bible-wide line-upon-line answer builder.
 */

const {
  detectConceptFromContinuation,
  CONTINUATION_PHRASE_RE,
} = require('./bibleConceptConcordance');
const {
  getGraphNode,
  getGraphWitnesses,
} = require('./bibleConceptGraph');
const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
const { resolveFollowUpContext } = require('./followUpContextResolver');
const {
  getDoctrineConversationState,
  updateDoctrineConversationState,
} = require('./doctrineConversationState');
const { formatDirectDoctrineReply } = require('./directAnswerFormatter');
const { applyUserAnswerPreferences, getUserAnswerPreferences } = require('./userCorrectionMemory');
const { validateBncAnswer } = require('./bncSafetyValidator');

function getConceptById(id) {
  return getGraphNode(id);
}

function buildDirectAnswerPolarity(message = '', concept = null) {
  if (!concept) return null;
  return concept.polarity || null;
}

function selectDirectWitnesses(concept, limit = 3, exclude = []) {
  const c = typeof concept === 'string' ? getGraphNode(concept) : concept;
  if (!c) return [];
  const excludeSet = new Set(exclude.map((r) => String(r).toLowerCase()));
  const pool = [...(c.directWitnesses || []), ...(c.supportingWitnesses || [])];
  const selected = [];
  for (const ref of pool) {
    if (excludeSet.has(ref.toLowerCase())) continue;
    selected.push(ref);
    if (selected.length >= limit) break;
  }
  return selected;
}

function buildLineUponLineExplanation(concept, witnesses = []) {
  const c = typeof concept === 'string' ? getGraphNode(concept) : concept;
  if (!c) return '';
  if (c.helperOnly && !c.directAnswer) return '';
  const refs = witnesses.length ? witnesses : selectDirectWitnesses(c, 3);
  if (!refs.length) return c.directAnswer || '';
  const witnessText = refs.slice(0, 3).join(', ');
  if (!c.directAnswer) return '';
  return `${c.directAnswer} Scripture witnesses: ${witnessText}.`;
}

function getConceptState(userId) {
  const state = getDoctrineConversationState(userId);
  return {
    activeBibleConcept: state.activeBibleConcept || null,
    lastAnsweredConcept: state.lastAnsweredConcept || state.activeBibleConcept || null,
    usedConceptWitnesses: state.usedConceptWitnesses || [],
    lastPendingQuestion: state.lastPendingQuestion || null,
  };
}

function setActiveBibleConcept(userId, conceptId, userMessage = '', witnesses = []) {
  return updateDoctrineConversationState(userId, {
    activeBibleConcept: conceptId,
    lastBibleConcept: conceptId,
    lastAnsweredConcept: conceptId,
    activeDoctrineTopic: null,
    activeStrictContract: null,
    activeContract: null,
    usedConceptWitnesses: witnesses || [],
    lastPendingQuestion: userMessage || null,
    lastLane: 'bible_wide',
    doctrineSuspended: false,
    releaseRequested: false,
  });
}

function resolveConceptForMessage(message = '', userId = '') {
  const state = getDoctrineConversationState(userId);
  const context = {
    activeBibleConcept: state.activeBibleConcept,
    lastAnsweredConcept: state.lastAnsweredConcept || state.activeBibleConcept,
    lastBibleConcept: state.lastBibleConcept,
  };

  const followUp = resolveFollowUpContext(message, context);
  if (followUp?.isActorQuestion) {
    return { actorFollowUp: followUp };
  }
  if (followUp?.conceptId) {
    const node = getGraphNode(followUp.conceptId);
    if (node) return node;
  }

  const fromContinuation = detectConceptFromContinuation(message);
  if (fromContinuation) return fromContinuation;

  const semantic = detectSemanticConcept(message, context);
  if (semantic) return semantic;

  if (CONTINUATION_PHRASE_RE.test(message) && state.activeBibleConcept) {
    return getGraphNode(state.activeBibleConcept);
  }

  return null;
}

function buildBibleWideAnswer({
  message,
  concept: conceptInput = null,
  userId = '',
  userPreferences = null,
  conversationState = null,
  isContinuation = false,
} = {}) {
  let concept = conceptInput || resolveConceptForMessage(message, userId);
  if (concept?.actorFollowUp) {
    const af = concept.actorFollowUp;
    return {
      reply: af.reply,
      scripture: af.scripture || [],
      concept: af.conceptId,
      strictTopic: null,
      polarity: null,
      witnesses: (af.scripture || []).map((s) => s.reference),
      masterRoute: af.masterRoute || 'bnc_followup_actor',
    };
  }
  if (!concept) return null;

  if (
    (concept.id === 'prayer_comfort' || concept.helperOnly) &&
    /\b(pray with me|can you pray|please pray|will you pray)\b/i.test(message)
  ) {
    return null;
  }

  const prefs = userPreferences || getUserAnswerPreferences(userId);
  const state = conversationState || getConceptState(userId);
  const used = state.usedConceptWitnesses || [];

  let witnesses;
  if (isContinuation || CONTINUATION_PHRASE_RE.test(message)) {
    witnesses = selectDirectWitnesses(concept, 3, used);
    if (!witnesses.length) witnesses = selectDirectWitnesses(concept, 3, []);
  } else {
    witnesses = selectDirectWitnesses(concept, 3);
  }

  let reply;
  if (isContinuation || CONTINUATION_PHRASE_RE.test(message)) {
    if (witnesses.length) {
      reply = `Here is another Scripture witness on this topic: ${witnesses.join('; ')}.`;
      if (concept.directAnswer) {
        reply = `${reply} ${concept.directAnswer.split('.').slice(0, 2).join('.')}.`;
      }
    } else {
      reply = buildLineUponLineExplanation(concept, selectDirectWitnesses(concept, 3));
    }
  } else {
    reply = buildLineUponLineExplanation(concept, witnesses);
  }

  const polarity = buildDirectAnswerPolarity(message, concept);
  reply = applyUserAnswerPreferences(reply, {
    userId,
    message,
    polarity,
    userPreferences: prefs,
  });
  reply = formatDirectDoctrineReply(reply, message, {
    topic: concept.strictTopic || concept.id,
    scripture: witnesses.map((r) => ({ reference: r, theme: concept.id })),
    userPreferences: prefs,
    polarity,
  });

  const validated = validateBncAnswer({
    reply,
    concept,
    witnesses,
    source: 'bible_wide',
  });
  reply = validated.reply;

  const scripture = witnesses.map((r) => ({ reference: r, theme: concept.id }));
  const allUsed = [...used, ...witnesses];

  if (userId) {
    setActiveBibleConcept(userId, concept.id, message, allUsed);
  }

  return {
    reply,
    scripture,
    concept: concept.id,
    strictTopic: concept.strictTopic,
    polarity,
    witnesses,
    masterRoute: isContinuation ? 'bible_wide_continuation' : 'bible_wide_reasoning',
  };
}

function buildBibleWideStructured(answer, runtimeContext = {}, safety = {}) {
  if (!answer) return null;
  return {
    reply: answer.reply,
    scripture: answer.scripture || [],
    mode: 'companion',
    confidence: 'high',
    memory_used: false,
    safety_level: safety?.level || 'standard',
    admin_flags: ['bible_wide_reasoning', `concept_${answer.concept}`, 'bnc_phase5e'],
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: runtimeContext?.intent || 'study',
      masterRoute: answer.masterRoute,
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      bibleConcept: answer.concept,
      doctrineTopic: answer.strictTopic || null,
      phase5A: true,
      bncConcept: answer.concept,
    },
  };
}

module.exports = {
  buildBibleWideAnswer,
  selectDirectWitnesses,
  buildDirectAnswerPolarity,
  buildLineUponLineExplanation,
  resolveConceptForMessage,
  setActiveBibleConcept,
  getConceptState,
  buildBibleWideStructured,
  getConceptById,
};
