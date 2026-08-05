/**
 * Phase 5A — Single owner of companion turn routing and response planning.
 */

const { runStrictDoctrineGate } = require('./strictDoctrineGate');
const {
  planCompanionDoctrineRouting,
  applyDoctrineRoutingSideEffects,
} = require('./companionDoctrineRouter');
const { buildReasoningPlan } = require('./bibleReasoningEngine');
const { detectConceptFromGraph } = require('./bibleConceptGraph');
const {
  buildBibleWideAnswer,
  buildBibleWideStructured,
  resolveConceptForMessage,
  extractExplicitScriptureReferences,
} = require('./bibleWideReasoningEngine');
const { getConceptById } = require('./bibleConceptConcordance');
const {
  ingestUserMessage,
  recordPendingQuestion,
  recordRoutingFailure,
  getUserAnswerPreferences,
  LEARNING_ACK,
} = require('./reflectionMemoryEngine');
const { classifyCompanionState, buildCompanionSupportReply } = require('./companionStateEngine');
const { resolvePendingQuestion, isPendingQuestionChallenge } = require('./pendingQuestionResolver');
const { resolveFollowUpContext } = require('./followUpContextResolver');
const { formatDirectDoctrineReply, DENIAL_RE } = require('./directAnswerFormatter');
const {
  recordUserTurn,
  getDoctrineConversationState,
  finalizeStopRelease,
  updateDoctrineConversationState,
} = require('./doctrineConversationState');
const {
  classifyTurnContract,
  buildContractSafeReply,
  explainTurnContract,
} = require('./noGlitchTurnContract');
const { detectWordSense } = require('./bibleWordSenseEngine');
const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
const { getGraphNode } = require('./bibleConceptGraph');
const { buildScriptureReasoningPlan, buildScriptureAnchoredResponsePlan } = require('./scriptureReasoningPlanner');
const { recordContractHandled } = require('./runtimeHealthMonitor');
const {
  recordRelationshipSignal,
  getRelationshipContext,
  buildPreferenceAck,
} = require('./relationshipMemoryEngine');
const { classifyCompanionIntent } = require('./companionIntentIntelligence');
const { detectPracticalHelpRequest, buildPracticalGuidance } = require('./practicalGuidanceEngine');
const { applyCompanionStyleGuard } = require('./companionStyleGuard');
const { buildRelationshipContext, buildContextSummary } = require('./relationshipContextModel');
const {
  getMemorySnapshot,
  recordTurnMemory,
  forgetMemory,
  buildMemoryDisclosureReply,
} = require('./companionMemoryManager');
const { buildCompanionResponse } = require('./companionResponseBuilder');
const { buildConversationAnchor, updateAnchorFromTurn } = require('./conversationAnchorEngine');
const { detectHumanNeed } = require('./humanNeedDetector');
const { buildRevisionReply } = require('./responseRevisionOwner');
const {
  isContinuationTurn,
  saveContinuationMemory,
  buildContinuationReply,
} = require('./conversationContinuationMemory');
const { buildCuriosityFollowUp } = require('./companionCuriosityEngine');
const { buildPracticalWisdomResponse } = require('./practicalWisdomEngine');
const { buildPrayerCompanionResponse } = require('./prayerCompanionEngine');
const { buildPresenceResponse } = require('./companionPresenceEngine');
const { isAppIdentityQuestion, buildIdentityReply } = require('./companionIdentityEngine');
const { formatRecallReply } = require('./relationshipSummaryEngine');
const { hasEstablishedTopic } = require('./singleCompanionContract');
const { isOriginalLanguageRequest, formatOriginalLanguageReply } = require('./originalLanguageResponseFormatter');
const { getPassageStudy } = require('./originalLanguageProvider');

const SAFE_COMPANION_CLARIFICATION =
  'I want to make sure I answer the right thing. Are you asking about a Bible passage, a life situation, or something you want prayer for?';

function shouldBlockGenericClarification(message = '', state = {}, humanNeed = null) {
  if (isAppIdentityQuestion(message)) return true;
  if (/\b(pray with me|can you pray|please pray|will you pray)\b/i.test(message)) return true;
  if (humanNeed === 'app_identity' || humanNeed === 'prayer' || humanNeed === 'memory_recall') return true;
  if (
    humanNeed === 'practical_words_to_say' ||
    humanNeed === 'next_steps' ||
    humanNeed === 'anxiety_support' ||
    humanNeed === 'emotional_support'
  ) {
    return true;
  }
  return hasEstablishedTopic(state);
}

function buildClarificationReply(message = '', state = {}) {
  const anchor = buildConversationAnchor({ userId: state.userId, message, state });
  const humanNeed = detectHumanNeed(message, anchor, state);
  if (shouldBlockGenericClarification(message, state, humanNeed)) {
    return null;
  }
  return {
    reply: SAFE_COMPANION_CLARIFICATION,
    scripture: [],
    masterRoute: 'bible_companion_clarification',
    admin_flags: ['clarification_request', 'learning_candidate'],
  };
}

/** Multi-part user turns must not be owned by a single-concept bible_wide short-circuit. */
function isMultiPartUserQuestion(message = '') {
  return require('./semanticUnderstandingSnapshot').isMultiPartUserQuestion(message);
}

function tryContextualDraftBeforeClarification({
  userId,
  message,
  mergedState,
  anchor,
  humanNeed,
  safety,
  runtimeContext,
}) {
  if (humanNeed === 'app_identity' || isAppIdentityQuestion(message)) {
    const identity = buildIdentityReply(message);
    return {
      reply: identity.reply,
      scripture: [],
      masterRoute: identity.masterRoute || 'phase5l_app_identity',
      intentCategory: 'app_identity',
    };
  }
  if (humanNeed === 'prayer' || /\b(pray with me|can you pray|pray for|pray about|pray again)\b/i.test(message)) {
    const prayer = buildPrayerCompanionResponse({ message, anchor, userId });
    if (prayer?.reply) {
      return { ...prayer, intentCategory: 'prayer_request' };
    }
  }
  const stableConcept =
    mergedState.sessionMemory?.activeConcept ||
    mergedState.lastAnsweredConcept ||
    anchor.currentDoctrineConcept;
  const wisdom = buildPracticalWisdomResponse({
    message,
    anchor,
    state: mergedState,
    conceptId: stableConcept,
  });
  if (wisdom?.reply) return { ...wisdom, intentCategory: 'family_explanation' };
  if (humanNeed === 'anxiety_support' || humanNeed === 'next_steps' || /\bnervous\b/i.test(message)) {
    const presence = buildPresenceResponse({ message, anchor, state: mergedState });
    if (presence?.reply) return { ...presence, intentCategory: 'emotional_support' };
  }
  return null;
}

// PHASE_6G — Life Decision Ownership. Ambiguous, non-doctrinal
// "help me decide" prompts were previously falling through every
// companion lane and landing on generic reason-first OpenAI
// composition (no distinct ownership, no consistent safety
// boundaries). This owns that narrow lane deterministically:
// acknowledge, offer only wisdom Scripture genuinely supports
// (never a fabricated "God told me" answer for the user's specific
// choice), name what is left to the user's own judgment, give
// concrete practical factors, and offer — never force — prayer.
const DECISION_DOMAIN_PATTERNS = [
  { id: 'job', re: /\b(job|career|offer|promotion|resign|quit(ting)?|coworker|workplace)\b/i },
  { id: 'relationship', re: /\b(marry|marriage|boyfriend|girlfriend|date|dating|divorce|break ?up|relationship)\b/i },
  { id: 'financial', re: /\b(money|buy|purchase|debt|loan|invest(ing|ment)?|financ|afford)\b/i },
  { id: 'medical', re: /\b(surgery|treatment|diagnos|medication|doctor|health decision)\b/i },
  { id: 'legal', re: /\b(lawyer|attorney|sue|custody|contract|legal)\b/i },
  { id: 'family', re: /\b(family|parent|sibling|brother|sister|forgive|forgiveness)\b/i },
];

function detectDecisionDomain(message = '') {
  const m = String(message || '');
  for (const domain of DECISION_DOMAIN_PATTERNS) {
    if (domain.re.test(m)) return domain.id;
  }
  return null;
}

const DECISION_PRACTICAL_FACTORS = {
  job: 'For a job or career choice like this: what would change for your finances, your family, and your peace of mind either way? Is this a door opening, or fear pushing you?',
  relationship: 'Is this decision honest, respectful, and something you could talk about openly with people who know you well?',
  financial: 'Can you afford this without going back on a commitment you already made to someone else? Is this a need or a want right now?',
  medical: 'This is the kind of decision that genuinely needs a licensed doctor\u2019s guidance alongside your own judgment \u2014 I can\u2019t and shouldn\u2019t make a medical call for you.',
  legal: 'This is the kind of decision that genuinely needs a qualified legal professional \u2014 I can\u2019t and shouldn\u2019t make a legal call for you.',
  family: 'What would honor the relationship long-term, even if the short-term conversation is hard?',
  generic: 'What actually changes depending on which way you go \u2014 for you, and for anyone else this affects?',
};

const DECISION_WISDOM_WITNESSES = [
  { reference: 'Proverbs 3:5-6', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.' },
  { reference: 'James 1:5', text: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.' },
  { reference: 'Proverbs 16:3', text: 'Commit thy works unto the LORD, and thy thoughts shall be established.' },
];

function normalizeDecisionKey(message = '') {
  return String(message || '').trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function buildLifeDecisionReply({ message = '', anchor = {}, state = {} } = {}) {
  const trimmed = String(message || '').trim();
  const domain = detectDecisionDomain(trimmed);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const isHighRisk = domain === 'medical' || domain === 'legal';
  const isVague = wordCount <= 4 && !domain;
  const decisionKey = normalizeDecisionKey(trimmed);
  const askedBefore = state.sessionMemory?.lastDecisionKey === decisionKey;

  const witness = DECISION_WISDOM_WITNESSES[0];
  const parts = [];

  if (askedBefore) {
    parts.push('You\u2019ve brought this decision back up \u2014 that tells me it\u2019s still weighing on you, so let\u2019s go a step further instead of repeating the same ground.');
  } else if (isVague) {
    parts.push('I hear that you\u2019re wrestling with a decision. I want to actually help, not just hand you a generic answer.');
  } else {
    parts.push('That\u2019s a real decision to sit with, and it\u2019s good that you\u2019re thinking it through instead of rushing it.');
  }

  parts.push(
    `Scripture doesn\u2019t name your specific choice, but it is clear about how to approach any decision: ${witness.reference} \u2014 "${witness.text}" That means asking God for wisdom is never wasted, but it also doesn\u2019t remove your responsibility to think clearly and act.`,
  );

  if (isHighRisk) {
    parts.push(DECISION_PRACTICAL_FACTORS[domain]);
  } else {
    parts.push(`A few practical things worth weighing: ${DECISION_PRACTICAL_FACTORS[domain || 'generic']}`);
  }

  if (isVague && !askedBefore) {
    parts.push('If you tell me a bit more about what the decision actually is, I can think through it with you more specifically.');
  } else if (!isHighRisk) {
    parts.push('A concrete next step: name the one thing that\u2019s making this hard to decide, write down what each choice would actually cost or require, and give yourself a real (not indefinite) deadline to choose.');
  }

  parts.push('If it would help, I\u2019m glad to pray with you about this too \u2014 just say so.');

  const reply = parts.join('\n\n');

  return {
    reply,
    scripture: [{ reference: witness.reference, text: witness.text, translation: 'King James Version', source: 'local_kjv_corpus' }],
    domain: domain || 'generic',
    isHighRisk,
    isVague,
    askedBefore,
    decisionKey,
  };
}

function recordAnswerTurnMemory(userId, message, structured = {}) {
  const refs = (structured.scripture || []).map((s) => s.reference || s).filter(Boolean);
  const concept =
    structured.runtime?.bibleConcept ||
    structured.runtime?.bncConcept ||
    structured.runtime?.doctrineTopic ||
    null;
  const mapped =
    concept === 'dietary_law'
      ? 'dietary_pork_unclean'
      : concept === 'acts_10'
        ? 'acts_10_people_not_food'
        : concept === 'kingdom'
          ? 'kingdom_on_earth'
          : concept;
  updateDoctrineConversationState(userId, {
    turnMemory: {
      ...(getDoctrineConversationState(userId).turnMemory || {}),
      lastUserQuestion: message,
      lastAnsweredConcept: mapped,
      lastRefsShown: refs.slice(0, 5),
      lastAnswerSummary: String(structured.reply || '').slice(0, 200),
    },
    lastAnsweredConcept: mapped,
  });
  if (mapped) {
    updateDoctrineConversationState(userId, {
      lastAnsweredConcept: mapped,
      sessionMemory: {
        ...(getDoctrineConversationState(userId).sessionMemory || {}),
        activeConcept: mapped,
      },
    });
  }
}

function buildContractStructured(safeReply, message, safety, runtimeContext, contract) {
  return verifyOrchestratorOutput({
    reply: safeReply.reply,
    scripture: safeReply.scripture || [],
    mode: 'companion',
    confidence: 'high',
    memory_used: safeReply.learningCandidate || contract?.category === 'memory_recall',
    safety_level: safety?.level || 'standard',
    admin_flags: ['no_glitch_contract', `contract_${contract?.category || 'unknown'}`],
    runtime: {
      masterRoute: safeReply.masterRoute || 'no_glitch_contract',
      openAiCalled: false,
      orchestratorLane: 'no_glitch_contract',
      phase5F: true,
      contractCategory: contract?.category,
      contract: explainTurnContract(contract),
    },
  });
}


function clearStopReleaseStateSafely(userId) {
  const prev = getDoctrineConversationState(userId);
  return updateDoctrineConversationState(userId, {
    activeDoctrineTopic: null,
    activeStrictContract: null,
    activeContract: null,
    activeBibleConcept: null,
    lastAnsweredConcept: null,
    lastAnsweredTopic: null,
    lastStrictDoctrineTopic: null,
    usedConceptWitnesses: [],
    releaseRequested: false,
    doctrineSuspended: false,
    sessionMemory: {
      ...(prev.sessionMemory || {}),
      activeConcept: null,
      pendingQuestion: null,
    },
    releaseReason: 'stop_acknowledged',
  });
}

function runNoGlitchPreflight(userId, message, safety, runtimeContext) {
  const state = getDoctrineConversationState(userId);
  const wordSense = detectWordSense(message, state);
  let conceptMatch = detectSemanticConcept(message, state);
  if (wordSense.sense && !conceptMatch) {
    const node = getGraphNode(wordSense.sense);
    if (node) conceptMatch = node;
  }
  const contract = classifyTurnContract({ message, state, conceptMatch });
  const safeReply = buildContractSafeReply({ contract, state });
  if (safeReply) {
    recordContractHandled({ userId, category: contract.category, route: safeReply.masterRoute });
    if (contract.category === 'stop_release' || safeReply.clearState) {
      clearStopReleaseStateSafely(userId);
    }
    return {
      handled: true,
      contract,
      conceptMatch,
      structured: buildContractStructured(safeReply, message, safety, runtimeContext, contract),
      scripturePlan: null,
    };
  }
  const scripturePlan =
    contract.category === 'complete_bible_question' || contract.safeToAnswer
      ? buildScriptureReasoningPlan({
          userQuestion: message,
          conceptId: conceptMatch?.id || contract.conceptId,
          strictTopic: contract.strictTopic,
          conceptNode: conceptMatch,
        })
      : null;
  return { handled: false, contract, conceptMatch, scripturePlan, state };
}

function verifyOrchestratorOutput(structured = {}, styleContext = {}) {
  const reply = String(structured.reply || '');
  const scripture = structured.scripture || [];
  const hasRefs =
    scripture.length > 0 ||
    /\b(?:Genesis|Exodus|Leviticus|Matthew|Revelation|Corinthians|Hebrews|Psalm|Daniel)\s+\d+/i.test(reply);
  if (hasRefs && DENIAL_RE.test(reply)) {
    structured.reply = formatDirectDoctrineReply(reply, '', { scripture });
  }
  return applyCompanionStyleGuard(structured, styleContext);
}

function buildPracticalStructured(guidance, message, safety, runtimeContext, userId) {
  return verifyOrchestratorOutput(
    {
      reply: guidance.reply,
      scripture: guidance.scripture || [],
      mode: 'companion',
      confidence: 'high',
      memory_used: true,
      safety_level: safety?.level || 'standard',
      admin_flags: ['practical_guidance', 'phase5h_orchestrator'],
      runtime: {
        masterRoute: guidance.masterRoute || 'practical_guidance',
        openAiCalled: false,
        orchestratorLane: 'practical_guidance',
        phase5H: true,
        companionIntent: guidance.intentCategory || null,
      },
    },
    {
      message,
      isPracticalGuidance: true,
      isContinuation: true,
      isPrayer: guidance.masterRoute === 'practical_guidance_prayer',
      practicalFallback: guidance.reply,
      prayerFallback: guidance.reply,
    },
  );
}

const PHASE5I_CATEGORIES = [
  'prayer_request',
  'boundary_script',
  'family_explanation',
  'verse_to_remember',
  'emotional_support',
  'memory_preference',
];

function shouldRunPhase5I(companionIntent = {}, relationshipContext = {}) {
  if (relationshipContext.multiIntent?.multiIntent) return true;
  if (PHASE5I_CATEGORIES.includes(companionIntent.category)) return true;
  if (companionIntent.practicalType === 'why_followup' || companionIntent.practicalType === 'nervous_family') {
    return true;
  }
  if (relationshipContext.userGoal && relationshipContext.priorTopic) return true;
  return false;
}

function enrichCompanionReply(built, { message, anchor, humanNeed } = {}) {
  if (!built?.reply) return built;
  let reply = built.reply;
  if (humanNeed === 'correction_repair' && !/right|directly/i.test(reply)) {
    reply = `You're right — let me answer directly. ${reply}`;
  }
  if (
    /\bnervous\b/i.test(message) &&
    anchor.currentRelationshipContext === 'family' &&
    !/family|talking with your family/i.test(reply)
  ) {
    reply = `You sound nervous about talking with your family about what you believe. That makes sense — those conversations can feel heavy. ${reply}`;
  }
  const curiosity = buildCuriosityFollowUp({ message, anchor, humanNeed });
  if (
    curiosity &&
    !reply.includes(curiosity) &&
    (humanNeed === 'emotional_support' || humanNeed === 'anxiety_support' || humanNeed === 'conflict_guidance')
  ) {
    if (!/\?[^?]*$/.test(reply.trim()) || humanNeed === 'emotional_support') {
      reply = `${reply.trim()} ${curiosity}`;
    }
  }
  return { ...built, reply: reply.replace(/\s+/g, ' ').trim() };
}

function runPhase5KDepthLane({
  userId,
  message,
  mergedState,
  anchor,
  humanNeed,
  safety,
  conceptMatch,
}) {
  if (humanNeed === 'app_identity' || isAppIdentityQuestion(message)) {
    const identity = buildIdentityReply(message);
    return verifyOrchestratorOutput(
      {
        reply: identity.reply,
        scripture: [],
        mode: 'companion',
        confidence: 'high',
        memory_used: false,
        safety_level: safety?.level || 'standard',
        admin_flags: ['phase5k_app_identity'],
        runtime: {
          masterRoute: identity.masterRoute,
          openAiCalled: false,
          orchestratorLane: 'app_identity',
          phase5K: true,
        },
      },
      { message },
    );
  }

  if (humanNeed === 'prayer' || /\b(pray with me|can you pray|pray for|pray about|pray again)\b/i.test(message)) {
    const prayer = buildPrayerCompanionResponse({ message, anchor, userId });
    return verifyOrchestratorOutput(
      {
        reply: prayer.reply,
        scripture: prayer.scripture,
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety?.level || 'standard',
        admin_flags: ['phase5k_prayer', prayer.personalized ? 'phase7a_personalized_prayer' : 'phase7a_generic_prayer'],
        runtime: {
          masterRoute: prayer.masterRoute,
          openAiCalled: false,
          orchestratorLane: 'prayer_companion',
          phase5K: true,
          prayerPersonalized: !!prayer.personalized,
          prayerPerson: prayer.prayerPerson || null,
        },
      },
      { message, isPrayer: true, prayerFallback: prayer.reply },
    );
  }

  if (humanNeed === 'practical_words_to_say' || humanNeed === 'conflict_guidance') {
    const stableConcept =
      mergedState.sessionMemory?.activeConcept ||
      mergedState.lastAnsweredConcept ||
      anchor.currentDoctrineConcept ||
      conceptMatch?.id;
    let wisdom = buildPracticalWisdomResponse({
      message,
      anchor,
      state: mergedState,
      conceptId: stableConcept,
    });
    if (!wisdom && /\b(what we were talking|about what we talked)\b/i.test(message)) {
      wisdom = buildPracticalWisdomResponse({
        message: 'How do I explain it to my family?',
        anchor,
        state: mergedState,
        conceptId: stableConcept,
      });
    }
    if (wisdom) {
      const enriched = enrichCompanionReply(wisdom, { message, anchor, humanNeed });
      return verifyOrchestratorOutput(
        {
          reply: enriched.reply,
          scripture: enriched.scripture,
          mode: 'companion',
          confidence: 'high',
          memory_used: true,
          safety_level: safety?.level || 'standard',
          admin_flags: ['phase5k_practical_wisdom'],
          runtime: {
            masterRoute: enriched.masterRoute,
            openAiCalled: false,
            orchestratorLane: 'practical_wisdom',
            phase5K: true,
          },
        },
        { message, isPracticalGuidance: true, practicalFallback: enriched.reply },
      );
    }
  }

  if (humanNeed === 'emotional_support' || humanNeed === 'anxiety_support') {
    const guidance = buildPracticalGuidance({
      concept: anchor.currentDoctrineConcept || conceptMatch?.id,
      message,
      state: mergedState,
      type:
        anchor.currentRelationshipContext === 'family' && /\bnervous\b/i.test(message)
          ? 'nervous_family'
          : null,
      userId,
    });
    if (!guidance && humanNeed === 'anxiety_support' && /\bnervous\b/i.test(message)) {
      const presence = buildPresenceResponse({ message, anchor, state: mergedState });
      if (presence) {
        return verifyOrchestratorOutput(
          {
            reply: presence.reply,
            scripture: presence.scripture,
            mode: 'companion',
            confidence: 'high',
            memory_used: false,
            safety_level: safety?.level || 'standard',
            admin_flags: ['phase5k_anxiety_presence'],
            runtime: {
              masterRoute: presence.masterRoute,
              openAiCalled: false,
              orchestratorLane: 'anxiety_presence',
              phase5K: true,
            },
          },
          { message, isEmotionalSupport: true, practicalFallback: presence.reply },
        );
      }
    }
    if (guidance) {
      const enriched = enrichCompanionReply(guidance, { message, anchor, humanNeed });
      return verifyOrchestratorOutput(
        {
          reply: enriched.reply,
          scripture: enriched.scripture,
          mode: 'companion',
          confidence: 'high',
          memory_used: true,
          safety_level: safety?.level || 'standard',
          admin_flags: ['phase5k_emotional_support'],
          runtime: {
            masterRoute: enriched.masterRoute || guidance.masterRoute,
            openAiCalled: false,
            orchestratorLane: 'emotional_support',
            phase5K: true,
          },
        },
        {
          message,
          isEmotionalSupport: true,
          isContinuation: true,
          practicalFallback: enriched.reply,
        },
      );
    }
  }

  return null;
}

function runPhase5ICompanionPipeline({
  userId,
  message,
  mergedState,
  companionIntent,
  conceptMatch,
  safety,
}) {
  const relationshipContext = buildRelationshipContext({ userId, message, state: mergedState });
  relationshipContext.message = message;
  const memorySnapshot = getMemorySnapshot({ userId });

  const conceptId = companionIntent.conceptId || conceptMatch?.id || relationshipContext.priorTopic;
  const conceptNode = conceptMatch || (conceptId ? getGraphNode(conceptId) : null);

  const plan = buildScriptureAnchoredResponsePlan({
    message,
    concept: conceptNode,
    relationshipContext,
    memorySnapshot,
    companionIntent,
  });

  const built = buildCompanionResponse(plan, {
    userId,
    message,
    relationshipContext,
    memorySnapshot,
  });
  if (!built?.reply) return null;

  const enriched = enrichCompanionReply(built, {
    message,
    anchor: buildConversationAnchor({ userId, message, state: mergedState }),
    humanNeed: detectHumanNeed(message, buildConversationAnchor({ userId, message, state: mergedState }), mergedState),
  });

  const structured = verifyOrchestratorOutput(
    {
      reply: enriched.reply,
      scripture: enriched.scripture || [],
      mode: 'companion',
      confidence: 'high',
      memory_used: true,
      safety_level: safety?.level || 'standard',
      admin_flags: ['phase5i_companion', `answer_${plan.answerType}`],
      runtime: {
        masterRoute: enriched.masterRoute || 'phase5i_companion',
        openAiCalled: false,
        orchestratorLane: 'phase5i_companion',
        phase5I: true,
        answerType: plan.answerType,
        relationshipSummary: buildContextSummary(relationshipContext),
      },
    },
    {
      message,
      isPracticalGuidance: plan.isPracticalGuidance,
      isContinuation: plan.isContinuation,
      isEmotionalSupport: plan.isEmotionalSupport,
      isPrayer: plan.isPrayer,
      polarity: plan.polarity,
      practicalFallback: enriched.reply,
      prayerFallback: enriched.reply,
    },
  );

  recordTurnMemory({ userId, context: relationshipContext, answer: enriched });
  return { structured, route: enriched.masterRoute, plan, relationshipContext };
}

/**
 * @returns {{ handled: boolean, dispatch?: string, ctx?: object, reasoningPlan?: object }}
 */
async function runBibleCompanionOrchestrator({
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
}) {
  const ingested = ingestUserMessage(userId, message);
  // Phase 7C — hydrate durable user memory before care lanes (cross-instance authority)
  try {
    await require('./durableUserMemory').ensureHydrated(userId);
  } catch (e) {
    console.warn('[orchestrator] durable hydrate failed:', e.message);
  }
  // Phase 7A — record relationship signals before any care-lane early return
  try {
    recordRelationshipSignal({ userId, message, state: getDoctrineConversationState(userId) });
  } catch (_) {}
  try {
    await require('./durableUserMemory').flushUser(userId);
  } catch (e) {
    console.warn('[orchestrator] durable flush failed:', e.message);
  }
  const prefAckEarly = buildPreferenceAck(message, userId);
  if (prefAckEarly && /\bremember that i like direct/i.test(message)) {
    const structured = verifyOrchestratorOutput({
      reply: prefAckEarly,
      scripture: [],
      mode: 'companion',
      confidence: 'high',
      memory_used: true,
      safety_level: safety?.level || 'standard',
      admin_flags: ['preference_memory', 'phase5g_orchestrator'],
      runtime: {
        masterRoute: 'relationship_preference_memory',
        openAiCalled: false,
        orchestratorLane: 'preference_memory',
        phase5G: true,
      },
    }, { message });
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan: { answerLane: 'companion' },
      ctx: {
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
        route: 'relationship_preference_memory',
      },
    };
  }

  // Phase 7A Case 2 — personal remember/forget before learning-candidate admin voice.
  {
    const {
      isPersonalRememberRequest,
      isForgetRequest,
      companionRememberAck,
      personalRememberContent,
    } = require('./relationshipContextSelector');
    if (isPersonalRememberRequest(message) || isForgetRequest(message)) {
      const forgetting = isForgetRequest(message);
      if (forgetting) {
        try {
          require('./relationshipMemoryEngine').forgetUserMemory({ userId });
        } catch (_) {}
      } else {
        try {
          const content = personalRememberContent(message) || String(message).slice(0, 240);
          require('./relationshipMemoryEngine').recordRelationshipSignal({
            userId,
            message: content,
            event: 'personal_remember_request',
          });
          require('./explicitRememberPin').maybeCapturePin(userId, message);
        } catch (_) {}
      }
      const masterRoute = forgetting
        ? 'companion_personal_forget'
        : 'companion_personal_remember';
      const structured = verifyOrchestratorOutput({
        reply: companionRememberAck(message),
        scripture: [],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety?.level || 'standard',
        admin_flags: [forgetting ? 'phase7a_personal_forget' : 'phase7a_personal_remember'],
        runtime: {
          masterRoute,
          openAiCalled: false,
          orchestratorLane: forgetting ? 'personal_forget' : 'personal_remember',
        },
      });
      recordUserTurn(userId, message, 'companion');
      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: { answerLane: 'companion' },
        ctx: {
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
          route: masterRoute,
        },
      };
    }
  }

  if (
    ingested.learningCandidate &&
    ingested.learningAck &&
    /\b(remember|database|when others ask|for others)\b/i.test(message) &&
    !/\bremember that i like direct/i.test(message)
  ) {
    // True BNC / admin learning only — personal remember already returned above.
    const structured = verifyOrchestratorOutput({
      reply: ingested.learningAck,
      scripture: [],
      mode: 'companion',
      confidence: 'high',
      memory_used: true,
      safety_level: safety?.level || 'standard',
      admin_flags: ['bnc_learning_candidate', 'pending_review', 'phase5f_orchestrator'],
      runtime: {
        masterRoute: 'no_glitch_learning_candidate',
        openAiCalled: false,
        orchestratorLane: 'learning_candidate',
        phase5F: true,
        contractCategory: 'learning_request',
      },
    });
    recordUserTurn(userId, message, 'companion');
    recordContractHandled({ userId, category: 'learning_request', route: 'no_glitch_learning_candidate' });
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan: { answerLane: 'companion' },
      ctx: {
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
        route: 'no_glitch_learning_candidate',
      },
    };
  }



  // Phase 5Q: Response Revision Owner.
  // If user asks for a better/deeper/more detailed version of the previous answer,
  // revise the prior answer before no-glitch, doctrine, BibleWide, pending question, or OpenAI can steal the turn.
  const revision = buildRevisionReply({ userId, message });
  if (revision?.reply) {
    const structured = verifyOrchestratorOutput({
      reply: revision.reply,
      scripture: revision.scripture || [],
      mode: 'companion',
      confidence: 'high',
      memory_used: true,
      safety_level: safety?.level || 'standard',
      admin_flags: ['response_revision_owner'],
      runtime: {
        masterRoute: revision.route,
        openAiCalled: false,
        orchestratorLane: 'response_revision_owner',
        responseRevisionOwner: true,
        revisionType: revision.revisionType,
      },
    }, { message });

    saveContinuationMemory(userId, {
      message,
      answer: structured,
      humanNeed: revision.revisionType,
      route: revision.route,
    });

    recordUserTurn(userId, message, 'companion');

    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan: {
        answerLane: 'response_revision_owner',
        responseRevisionOwner: true,
        revisionType: revision.revisionType,
      },
      ctx: {
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
        route: revision.route,
      },
    };
  }

  // Conversation Owner: short follow-ups must resolve before no-glitch/doctrine/OpenAI routing.
  if (isContinuationTurn(message)) {
    const continuation = buildContinuationReply({ userId, message });
    if (continuation?.reply) {
      if (continuation.clearState && typeof clearStopReleaseStateSafely === 'function') {
        clearStopReleaseStateSafely(userId);
      }

      const structured = verifyOrchestratorOutput({
        reply: continuation.reply,
        scripture: continuation.scripture || [],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety?.level || 'standard',
        admin_flags: ['conversation_owner'],
        runtime: {
          masterRoute: continuation.masterRoute,
          openAiCalled: false,
          orchestratorLane: 'conversation_owner',
          conversationOwner: true,
        },
      }, { message });

      saveContinuationMemory(userId, {
        message,
        answer: structured,
        humanNeed: 'continuation',
        route: continuation.masterRoute,
      });

      recordUserTurn(userId, message, 'companion');

      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: { answerLane: 'conversation_owner', conversationOwner: true },
        ctx: {
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
          route: continuation.masterRoute,
        },
      };
    }
  }

  const preflight = runNoGlitchPreflight(userId, message, safety, runtimeContext);
  if (preflight.handled) {
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan: { answerLane: 'companion_release', contract: preflight.contract },
      ctx: {
        structured: verifyOrchestratorOutput(preflight.structured, { message }),
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
        route: preflight.structured.runtime?.masterRoute,
        contract: preflight.contract,
      },
    };
  }

  const doctrineState = getDoctrineConversationState(userId);
  recordRelationshipSignal({ userId, message, state: doctrineState });
  const relContext = getRelationshipContext({ userId });
  const mergedState = { ...doctrineState, ...relContext };
  if (/\balpha test|alpha testing|test plan\b/i.test(message)) {
    mergedState.sessionMemory = { ...(mergedState.sessionMemory || {}), alphaTestingContext: true };
    updateDoctrineConversationState(userId, { sessionMemory: mergedState.sessionMemory });
  }
  const conversationAnchor = buildConversationAnchor({ userId, message, state: mergedState });
  const humanNeed = detectHumanNeed(message, conversationAnchor, mergedState);

  if (isContinuationTurn(message)) {
    const continuation = buildContinuationReply({ userId, message });
    if (continuation?.reply) {
      if (continuation.clearState && typeof clearStopReleaseStateSafely === 'function') {
        clearStopReleaseStateSafely(userId);
      }

      const structured = verifyOrchestratorOutput({
        reply: continuation.reply,
        scripture: continuation.scripture || [],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety?.level || 'standard',
        admin_flags: ['phase5o_continuation_memory'],
        runtime: {
          masterRoute: continuation.masterRoute,
          openAiCalled: false,
          orchestratorLane: 'conversation_continuation',
          phase5O: true,
          conversationContinuation: true,
        },
      }, { message });

      saveContinuationMemory(userId, {
        message,
        answer: structured,
        humanNeed: humanNeed || 'continuation',
        route: continuation.masterRoute,
      });

      recordUserTurn(userId, message, 'companion');

      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: { answerLane: 'conversation_continuation', phase5O: true, humanNeed },
        ctx: {
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
          route: continuation.masterRoute,
        },
      };
    }
  }

  const conceptMatchEarly = detectSemanticConcept(message, mergedState);

  const depthStructured = runPhase5KDepthLane({
    userId,
    message,
    mergedState,
    anchor: conversationAnchor,
    humanNeed,
    safety,
    conceptMatch: conceptMatchEarly,
  });
  if (depthStructured) {
    recordAnswerTurnMemory(userId, message, depthStructured);
    recordTurnMemory({
      userId,
      context: { ...conversationAnchor, message },
      answer: { reply: depthStructured.reply, scripture: depthStructured.scripture },
    });
    // CORE_COMPANION_RECOVERY — Phase 5K (app identity, prayer, presence, wisdom)
    // previously never wrote conversationMemory. Short follow-ups then fell
    // through to OpenAI → core_connection_error / "ask again". Persist here so
    // conversationContinuationMemory can own "Tell me more." / "Go deeper."
    const depthNeed =
      humanNeed === 'app_identity' || isAppIdentityQuestion(message)
        ? 'app_identity'
        : humanNeed || depthStructured.runtime?.orchestratorLane || null;
    saveContinuationMemory(userId, {
      message,
      answer: depthStructured,
      humanNeed: depthNeed,
      route: depthStructured.runtime?.masterRoute || null,
    });
    updateDoctrineConversationState(userId, {
      sessionMemory: {
        ...(mergedState.sessionMemory || {}),
        activeConcept: conversationAnchor.currentDoctrineConcept,
        familyContext: conversationAnchor.currentRelationshipContext === 'family',
        currentStruggle: conversationAnchor.currentEmotion || mergedState.sessionMemory?.currentStruggle,
      },
    });
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan: { answerLane: 'companion', phase5K: true, humanNeed },
      ctx: {
        structured: depthStructured,
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
        route: depthStructured.runtime?.masterRoute,
      },
    };
  }

  const companionIntent = classifyCompanionIntent({
    message,
    state: mergedState,
    concept: conceptMatchEarly,
  });

  if (humanNeed === 'correction_repair' && mergedState.lastAnsweredConcept) {
    companionIntent.category = 'doctrine_answer';
    companionIntent.practicalType = 'why_followup';
    companionIntent.conceptId = mergedState.lastAnsweredConcept;
    companionIntent.isContinuation = true;
  }

  if (/\bwhat do you remember\b/i.test(message)) {
    const recallReply = formatRecallReply({ userId, message, state: mergedState });
    const structured = verifyOrchestratorOutput({
      reply: recallReply,
      scripture: [],
      mode: 'companion',
      confidence: 'medium',
      memory_used: true,
      safety_level: safety?.level || 'standard',
      admin_flags: ['memory_recall', 'phase5h_orchestrator'],
      runtime: {
        masterRoute: 'relationship_memory_recall',
        openAiCalled: false,
        orchestratorLane: 'memory_recall',
        phase5H: true,
      },
    }, { message });
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan: { answerLane: 'companion', companionIntent },
      ctx: {
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
        route: 'relationship_memory_recall',
      },
    };
  }

  if (/\bforget\b/i.test(message) && /\b(that|preference|remember|memory)\b/i.test(message)) {
    const forgetResult = forgetMemory({ userId, scope: 'preferences' });
    const structured = verifyOrchestratorOutput({
      reply: forgetResult.reply,
      scripture: [],
      mode: 'companion',
      confidence: 'high',
      memory_used: false,
      safety_level: safety?.level || 'standard',
      admin_flags: ['memory_forget', 'phase5i_orchestrator'],
      runtime: {
        masterRoute: 'companion_memory_forget_preferences',
        openAiCalled: false,
        orchestratorLane: 'memory_forget',
        phase5I: true,
      },
    }, { message });
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan: { answerLane: 'companion', companionIntent },
      ctx: {
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
        route: 'companion_memory_forget_preferences',
      },
    };
  }

  if (/\bforget\b/i.test(message) && /\b(remember|memory|what you know)\b/i.test(message)) {
    const forgetResult = forgetMemory({ userId, scope: 'all' });
    const structured = verifyOrchestratorOutput({
      reply: forgetResult.reply,
      scripture: [],
      mode: 'companion',
      confidence: 'high',
      memory_used: false,
      safety_level: safety?.level || 'standard',
      admin_flags: ['memory_forget', 'phase5i_orchestrator'],
      runtime: {
        masterRoute: 'relationship_memory_forget',
        openAiCalled: false,
        orchestratorLane: 'memory_forget',
        phase5I: true,
      },
    }, { message });
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan: { answerLane: 'companion', companionIntent },
      ctx: {
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
        route: 'relationship_memory_forget',
      },
    };
  }

  const relationshipContext = buildRelationshipContext({ userId, message, state: mergedState });

  if (shouldRunPhase5I(companionIntent, relationshipContext)) {
    const phase5i = runPhase5ICompanionPipeline({
      userId,
      message,
      mergedState,
      companionIntent,
      conceptMatch: conceptMatchEarly,
      safety,
    });
    if (phase5i?.structured) {
      recordAnswerTurnMemory(userId, message, phase5i.structured);
      recordUserTurn(userId, message, 'companion');
      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: {
          answerLane: 'companion',
          phase5I: true,
          companionIntent,
          scripturePlan: phase5i.plan,
        },
        ctx: {
          structured: phase5i.structured,
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
          route: phase5i.route,
          blockClarification: companionIntent.blockClarification,
        },
      };
    }
  }

  const PRACTICAL_INTENT_TYPES = {
    prayer_request: 'prayer',
    boundary_script: 'boundary_script',
    family_explanation: companionIntent.practicalType || 'family_explanation',
    verse_to_remember: 'verse_for_situation',
    emotional_support: companionIntent.practicalType || null,
    doctrine_answer: companionIntent.practicalType || null,
  };

  const practicalType =
    companionIntent.practicalType ||
    PRACTICAL_INTENT_TYPES[companionIntent.category] ||
    detectPracticalHelpRequest(message, mergedState)?.type;

  const practicalCategories = [
    'prayer_request',
    'boundary_script',
    'family_explanation',
    'verse_to_remember',
  ];

  if (
    practicalType ||
    practicalCategories.includes(companionIntent.category) ||
    (companionIntent.category === 'doctrine_answer' && companionIntent.practicalType === 'why_followup') ||
    (companionIntent.category === 'emotional_support' && companionIntent.practicalType === 'nervous_family')
  ) {
    const guidance = buildPracticalGuidance({
      concept: companionIntent.conceptId,
      message,
      state: mergedState,
      type: practicalType,
      userId,
    });
    if (guidance) {
      guidance.intentCategory = companionIntent.category;
      const structured = buildPracticalStructured(guidance, message, safety, runtimeContext, userId);
      recordAnswerTurnMemory(userId, message, structured);
      recordUserTurn(userId, message, 'companion');
      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: { answerLane: 'companion', practicalGuidance: true, companionIntent },
        ctx: {
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
          route: guidance.masterRoute,
          blockClarification: companionIntent.blockClarification,
        },
      };
    }
  }

  const practicalReq = detectPracticalHelpRequest(message, mergedState);
  if (practicalReq) {
    const guidance = buildPracticalGuidance({
      concept: practicalReq.conceptId,
      message,
      state: mergedState,
      type: practicalReq.type,
      userId,
    });
    if (guidance) {
      const structured = buildPracticalStructured(guidance, message, safety, runtimeContext, userId);
      recordAnswerTurnMemory(userId, message, structured);
      recordUserTurn(userId, message, 'companion');
      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: { answerLane: 'companion', practicalGuidance: true, companionIntent },
        ctx: {
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
          route: guidance.masterRoute,
        },
      };
    }
  }

  const companionState = classifyCompanionState({
    message,
    userId,
    recentSessions,
    runtimeContext,
  });

  const reasoningPlan = buildReasoningPlan({
    message,
    userId,
    recentSessions,
    runtimeContext,
    userPreferences: getUserAnswerPreferences(userId),
  });

  const routePlan = reasoningPlan.routePlan;
  applyDoctrineRoutingSideEffects(userId, routePlan, message);

  const followUpActor = resolveFollowUpContext(message, {
    lastAnsweredConcept: reasoningPlan.context?.lastAnsweredConcept,
    activeBibleConcept: reasoningPlan.context?.activeBibleConcept,
    lastAnsweredTopic: reasoningPlan.context?.lastAnsweredTopic,
    lastStrictDoctrineTopic: reasoningPlan.context?.lastStrictDoctrineTopic,
  });
  if (followUpActor?.isActorQuestion && followUpActor.reply) {
    const structured = verifyOrchestratorOutput({
      reply: followUpActor.reply,
      scripture: followUpActor.scripture || [],
      mode: 'companion',
      confidence: 'high',
      memory_used: true,
      safety_level: safety?.level || 'standard',
      admin_flags: ['bnc_followup_actor', 'phase5e_orchestrator'],
      runtime: {
        masterRoute: followUpActor.masterRoute || 'bnc_followup_actor',
        openAiCalled: false,
        orchestratorLane: 'followup_actor',
        phase5A: true,
        bibleConcept: followUpActor.conceptId,
      },
    });
    recordUserTurn(userId, message, 'bible_wide');
    return {
      handled: true,
      dispatch: 'bible_wide',
      reasoningPlan,
      ctx: {
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
        route: followUpActor.masterRoute,
        concept: followUpActor.conceptId,
      },
    };
  }

  if (reasoningPlan.answerLane === 'pending_resolver' || isPendingQuestionChallenge(message)) {
    const pending = await resolvePendingQuestion({ userId, message, runtimeContext, safety });
    if (pending?.handled) {
      const structured = verifyOrchestratorOutput({
        reply: pending.reply,
        scripture: pending.scripture || [],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety?.level || 'standard',
        admin_flags: ['pending_question_resolver', 'phase5a_orchestrator'],
        runtime: {
          masterRoute: pending.masterRoute,
          openAiCalled: false,
          buddyRuntime: 'core_openai_first',
          orchestratorLane: 'pending_resolver',
          bibleConcept: pending.concept || null,
        },
      });
      recordUserTurn(userId, message, 'companion');
      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan,
        ctx: {
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
          route: pending.masterRoute,
          routePlan,
        },
      };
    }
  }

  if (routePlan.immediateCompanionReply && routePlan.companionReleaseReply) {
    const structured = verifyOrchestratorOutput({
      reply: routePlan.companionReleaseReply,
      scripture: [],
      mode: 'companion',
      confidence: 'high',
      memory_used: routePlan.intent === 'memory_recall',
      safety_level: safety?.level || 'standard',
      admin_flags: ['companion_doctrine_release', 'phase5a_orchestrator', `companion_intent_${routePlan.intent}`],
      runtime: {
        emotion: runtimeContext?.emotion,
        intent: routePlan.intent,
        masterRoute: 'companion_doctrine_release',
        openAiCalled: false,
        orchestratorLane: 'companion_release',
      },
    });
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan,
      ctx: {
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
        route: 'companion_doctrine_release',
        routePlan,
      },
    };
  }

  if (reasoningPlan.answerLane === 'clarification' && companionIntent.blockClarification) {
    const fallbackConcept =
      companionIntent.conceptId ||
      conceptMatchEarly?.id ||
      mergedState.lastAnsweredConcept;
    if (fallbackConcept) {
      const guidance = buildPracticalGuidance({
        concept: fallbackConcept,
        message,
        state: mergedState,
        type: companionIntent.practicalType || 'family_explanation',
        userId,
      });
      if (guidance) {
        const structured = buildPracticalStructured(guidance, message, safety, runtimeContext, userId);
        recordAnswerTurnMemory(userId, message, structured);
        recordUserTurn(userId, message, 'companion');
        return {
          handled: true,
          dispatch: 'companion',
          reasoningPlan: { answerLane: 'companion', practicalGuidance: true, companionIntent },
          ctx: {
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
            route: guidance.masterRoute,
          },
        };
      }
    }
  }

  if (reasoningPlan.answerLane === 'clarification') {
    const clarAnchor = buildConversationAnchor({ userId, message, state: mergedState });
    const clarHumanNeed = detectHumanNeed(message, clarAnchor, mergedState);
    const contextual = tryContextualDraftBeforeClarification({
      userId,
      message,
      mergedState,
      anchor: clarAnchor,
      humanNeed: clarHumanNeed,
      safety,
      runtimeContext,
    });
    if (contextual) {
      contextual.intentCategory = contextual.intentCategory || companionIntent.category;
      const structured = buildPracticalStructured(contextual, message, safety, runtimeContext, userId);
      recordAnswerTurnMemory(userId, message, structured);
      recordUserTurn(userId, message, 'companion');
      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: { answerLane: 'companion', practicalGuidance: true, companionIntent },
        ctx: {
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
          route: contextual.masterRoute,
          blockClarification: true,
        },
      };
    }
    const clar = buildClarificationReply(message, { ...mergedState, userId });
    if (!clar) {
      reasoningPlan.answerLane = 'companion';
    } else {
    recordRoutingFailure(userId, message, 'unknown_bible_phrase');
    const structured = verifyOrchestratorOutput({
      reply: clar.reply,
      scripture: clar.scripture,
      mode: 'companion',
      confidence: 'medium',
      memory_used: false,
      safety_level: safety?.level || 'standard',
      admin_flags: clar.admin_flags,
      runtime: {
        masterRoute: clar.masterRoute,
        openAiCalled: false,
        orchestratorLane: 'clarification',
      },
    });
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan,
      ctx: {
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
        route: clar.masterRoute,
        routePlan,
      },
    };
    }
  }

  const companionFirstModes = ['listener', 'prayer_partner'];
  const companionConceptIds = ['prayer_with_user', 'overwhelmed_comfort', 'heartbreak_comfort'];
  if (
    !reasoningPlan.strictTopic &&
    (companionFirstModes.includes(companionState.mode) ||
      companionConceptIds.includes(reasoningPlan.concept))
  ) {
    const support = buildCompanionSupportReply({ message, state: companionState });
    if (support) {
      const structured = verifyOrchestratorOutput({
        reply: support.reply,
        scripture: support.scripture || [],
        mode: 'companion',
        confidence: 'high',
        memory_used: false,
        safety_level: safety?.level || 'standard',
        admin_flags: ['companion_state_support', 'phase5a_orchestrator'],
        runtime: {
          masterRoute: 'companion_state_engine',
          openAiCalled: false,
          orchestratorLane: 'companion_support',
          companionMode: companionState.mode,
        },
      });
      recordUserTurn(userId, message, 'companion');
      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan,
        ctx: {
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
          route: 'companion_state_engine',
          routePlan,
        },
      };
    }
  }

  // PHASE_6B — Original-Language Knowledge System early exit.
  // Phase 7A Case 5 — emotional / celebration presence before verse dump.
  {
    const {
      isEmotionalScriptureResponse,
      isCelebrationOrPresenceMoment,
    } = require('./relationshipContextSelector');
    const askingForInfo = /\b(what (does|do|is|are)|why|how|explain|mean|tell me about)\b/i.test(message);
    if (
      !askingForInfo &&
      (isEmotionalScriptureResponse(message) ||
        (isCelebrationOrPresenceMoment(message) &&
          /\b(cry|tears|hopeful|grateful|answered|scared|afraid|overwhelmed|praise god|hallelujah)\b/i.test(message)))
    ) {
      const scared = /\b(scared|afraid|overwhelmed)\b/i.test(message);
      const joyful = /\b(hopeful|grateful|answered|praise god|hallelujah|cry|tears)\b/i.test(message);
      const reply = scared
        ? 'I’m with you in this. Fear doesn’t mean your faith is gone — take one breath. If you want, we can pray, hold a short verse together, or just sit with it for a moment.'
        : joyful
          ? 'Thank you for sharing that. I’m glad you’re letting this moment land — stay with it. If you want, we can sit with Scripture together, or I can simply keep listening.'
          : 'Thank you for trusting me with that. I’m here with you. We can go slowly — pray, hold a verse, or just keep talking.';
      const structured = verifyOrchestratorOutput({
        reply,
        scripture: [],
        mode: 'companion',
        confidence: 'high',
        memory_used: false,
        safety_level: safety?.level || 'standard',
        admin_flags: ['phase7a_celebration_presence'],
        runtime: {
          masterRoute: 'companion_celebration_presence',
          openAiCalled: false,
          orchestratorLane: 'celebration_presence',
        },
      });
      recordUserTurn(userId, message, 'companion');
      recordAnswerTurnMemory(userId, message, structured);
      saveContinuationMemory(userId, {
        message,
        answer: structured,
        humanNeed: 'emotional_support',
        route: 'companion_celebration_presence',
      });
      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: { answerLane: 'companion' },
        ctx: {
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
          route: 'companion_celebration_presence',
          routePlan,
        },
      };
    }
  }

  // PHASE_6B — Original-Language Knowledge System early exit. Only fires
  // when the user explicitly asks for a Hebrew/Aramaic/Greek word study of a
  // specific, parseable Scripture reference. Placed after every
  // companion/prayer/memory/continuation/practical-guidance lane above so
  // it never intercepts a turn that those lanes would otherwise own; it
  // only ever competes with the plain bible_wide explicit-reference lane
  // immediately below, and only for this one narrow, unambiguous intent.
  if (isOriginalLanguageRequest(message)) {
    const explicitRefs = extractExplicitScriptureReferences(message);
    if (explicitRefs.length) {
      const study = await getPassageStudy({ reference: explicitRefs[0] });
      const reply = formatOriginalLanguageReply(study);
      const structured = verifyOrchestratorOutput({
        reply,
        scripture: study && study.kjvText ? [{
          reference: study.reference,
          text: study.kjvText,
          translation: 'King James Version',
          source: 'local_kjv_corpus_or_provider',
        }] : [],
        mode: 'companion',
        confidence: study && study.ok ? (study.confidence || 'medium') : 'low',
        memory_used: false,
        safety_level: safety?.level || 'standard',
        admin_flags: ['phase6b_original_language_study'],
        runtime: {
          masterRoute: 'original_language_study',
          openAiCalled: false,
          orchestratorLane: 'original_language_study',
          retrievalMode: 'original_language',
          phase6B: true,
          sourceLanguage: study ? study.sourceLanguage : null,
          originalLanguageOk: study ? study.ok : false,
          originalLanguageProvenance: study ? study.provenance : null,
        },
      });
      recordUserTurn(userId, message, 'bible_wide');
      recordAnswerTurnMemory(userId, message, structured);
      return {
        handled: true,
        dispatch: 'bible_wide',
        reasoningPlan,
        ctx: {
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
          route: 'original_language_study',
          routePlan,
        },
      };
    }
  }

  // PHASE_6C — Supplemental Historical Knowledge early exit. Only fires on
  // an explicit historical/background-context request ("historical
  // context", "history of ...", "background on ..."). Scripture is always
  // presented first (from the same live retrieval as every other lane);
  // approved historical context (services/historicalKnowledgeProvider,
  // TIER_1/TIER_2 only, "SUPPLEMENTAL_HISTORICAL_INFORMATION" label) is
  // appended afterward and only when found — this never fabricates a
  // historical claim and never lets history override or replace Scripture.
  // Placed after every companion/prayer/memory/original-language lane above
  // so it never intercepts a turn those lanes would otherwise own.
  if (/\b(historical\s+context|history\s+of|background\s+(on|of|context))\b/i.test(message)) {
    const explicitRefs = extractExplicitScriptureReferences(message);
    const historicalConcept = detectConceptFromGraph(message);
    const topicId = historicalConcept?.strictTopic || historicalConcept?.id || null;

    let referenceForLookup = explicitRefs[0] || historicalConcept?.directWitnesses?.[0] || null;
    if (referenceForLookup) {
      const { getPassage: getKjvPassageForHistory } = require('./bibleTextProvider');
      const {
        getHistoricalContextForReference,
        getHistoricalContextForTopic,
        formatHistoricalContextLine,
      } = require('./historicalKnowledgeProvider');

      const kjvResult = await getKjvPassageForHistory(referenceForLookup);
      const byReference = getHistoricalContextForReference(referenceForLookup);
      const byTopic = topicId ? getHistoricalContextForTopic(topicId) : [];
      const records = byReference.length ? byReference : byTopic;

      if (kjvResult && kjvResult.ok) {
        const historyLines = records.map(formatHistoricalContextLine).filter(Boolean);
        const reply = [
          `${referenceForLookup} — "${kjvResult.text}" (${kjvResult.translation}).`,
          ...(historyLines.length
            ? historyLines
            : ['No approved historical-context record was found for this passage in the governed historical knowledge base — Scripture above is the complete answer.']),
        ].join('\n\n');

        const structured = verifyOrchestratorOutput({
          reply,
          scripture: [{
            reference: referenceForLookup,
            text: kjvResult.text,
            translation: kjvResult.translation,
            source: kjvResult.source || kjvResult.providerName,
          }],
          mode: 'companion',
          confidence: historyLines.length ? 'medium' : 'high',
          memory_used: false,
          safety_level: safety?.level || 'standard',
          admin_flags: ['phase6c_historical_context'],
          runtime: {
            masterRoute: 'historical_context',
            openAiCalled: false,
            orchestratorLane: 'historical_context',
            retrievalMode: 'canonical_reference_plus_supplemental_history',
            phase6C: true,
            historicalSources: records.map((r) => ({ id: r.id, sourceName: r.sourceName, trustTier: r.trustTier })),
          },
        });
        recordUserTurn(userId, message, 'bible_wide');
        recordAnswerTurnMemory(userId, message, structured);
        return {
          handled: true,
          dispatch: 'bible_wide',
          reasoningPlan,
          ctx: {
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
            route: 'historical_context',
            routePlan,
          },
        };
      }
    }
  }

  if (reasoningPlan.answerLane === 'bible_wide' || routePlan.lane === 'bible_wide') {
    // GATE 3 — single-concept bible_wide must not silently drop a second question.
    if (!isMultiPartUserQuestion(message)) {
      const concept =
        reasoningPlan.conceptNode ||
        getConceptById(reasoningPlan.concept) ||
        resolveConceptForMessage(message, userId);
      if (concept) {
        const wideAnswer = await buildBibleWideAnswer({
          message,
          concept,
          userId,
          userPreferences: reasoningPlan.userPreferences,
          isContinuation: reasoningPlan.witnessPlan?.isContinuation,
        });
        if (wideAnswer) {
          recordPendingQuestion(userId, message);
          const structured = verifyOrchestratorOutput(
            buildBibleWideStructured(wideAnswer, runtimeContext, safety),
          );
          structured.runtime = {
            ...(structured.runtime || {}),
            orchestratorLane: 'bible_wide',
            phase5A: true,
          };
          recordAnswerTurnMemory(userId, message, structured);
          return {
            handled: true,
            dispatch: 'bible_wide',
            reasoningPlan,
            ctx: {
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
              route: wideAnswer.masterRoute,
              concept: wideAnswer.concept,
            },
          };
        }
      }
    }
  }

  const strictGate = runStrictDoctrineGate({
    userId,
    message,
    evidencePack,
    recentSessions,
    safety,
    runtimeContext,
    routePlan,
  });

  if (strictGate.handled) {
    recordPendingQuestion(userId, message);
    const structured = verifyOrchestratorOutput(strictGate.structured);
    structured.runtime = {
      ...(structured.runtime || {}),
      orchestratorLane: 'strict_doctrine',
      phase5A: true,
    };
    recordAnswerTurnMemory(userId, message, structured);
    return {
      handled: true,
      dispatch: 'strict',
      reasoningPlan,
      ctx: {
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
        topic: strictGate.topic,
        route: structured.runtime?.masterRoute,
      },
    };
  }

  const postConcept = detectConceptFromGraph(message);
  // GATE 3 — same multi-part rule: do not let fallback bible_wide own a two-part turn.
  if (postConcept && !postConcept.strictTopic && !isMultiPartUserQuestion(message)) {
    const wideAnswer = await buildBibleWideAnswer({
      message,
      concept: postConcept,
      userId,
      userPreferences: reasoningPlan.userPreferences,
      isContinuation: reasoningPlan.witnessPlan?.isContinuation,
    });
    if (wideAnswer) {
      recordPendingQuestion(userId, message);
      const structured = verifyOrchestratorOutput(
        buildBibleWideStructured(wideAnswer, runtimeContext, safety),
      );
      structured.runtime = {
        ...(structured.runtime || {}),
        orchestratorLane: 'bible_wide_fallback',
        phase5A: true,
      };
      return {
        handled: true,
        dispatch: 'bible_wide',
        reasoningPlan,
        ctx: {
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
          route: wideAnswer.masterRoute,
          concept: wideAnswer.concept,
        },
      };
    }
  }

  // PHASE_6G — Life Decision Ownership early exit. Only fires when no
  // strict-doctrine gate and no Bible-concept lane above claimed the
  // turn, and the human-need classifier detected an ambiguous personal
  // decision request ("open_life" / "next_steps") rather than a direct
  // biblical-teaching question. Explicit "what does the Bible say about
  // decisions" style questions never reach here — those match
  // humanNeed === 'doctrine_answer' far earlier in this function and are
  // owned by the clarification/bible_wide lanes instead.
  if (humanNeed === 'open_life' || humanNeed === 'next_steps') {
    const decision = buildLifeDecisionReply({ message, anchor: conversationAnchor, state: mergedState });
    const structured = verifyOrchestratorOutput({
      reply: decision.reply,
      scripture: decision.scripture,
      mode: 'companion',
      confidence: 'medium',
      memory_used: decision.askedBefore,
      safety_level: safety?.level || 'standard',
      admin_flags: ['phase6g_life_decision_ownership', `decision_domain_${decision.domain}`],
      runtime: {
        masterRoute: 'conversation_owner_life_decision',
        openAiCalled: false,
        orchestratorLane: 'life_decision_ownership',
        phase6G: true,
        decisionDomain: decision.domain,
        decisionHighRisk: decision.isHighRisk,
      },
    });
    updateDoctrineConversationState(userId, {
      sessionMemory: { ...(mergedState.sessionMemory || {}), lastDecisionKey: decision.decisionKey },
    });
    recordUserTurn(userId, message, 'companion');
    return {
      handled: true,
      dispatch: 'companion',
      reasoningPlan,
      ctx: {
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
        route: 'conversation_owner_life_decision',
        humanNeed,
        routePlan,
      },
    };
  }

  return {
    handled: false,
    reasoningPlan,
    routePlan,
    companionState,
  };
}

module.exports = {
  runBibleCompanionOrchestrator,
  verifyOrchestratorOutput,
  buildClarificationReply,
};
