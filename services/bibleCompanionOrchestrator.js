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
  if (humanNeed === 'prayer' || /\b(pray with me|can you pray)\b/i.test(message)) {
    const prayer = buildPrayerCompanionResponse({ message, anchor });
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

  if (humanNeed === 'prayer') {
    const prayer = buildPrayerCompanionResponse({ message, anchor });
    return verifyOrchestratorOutput(
      {
        reply: prayer.reply,
        scripture: prayer.scripture,
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety?.level || 'standard',
        admin_flags: ['phase5k_prayer'],
        runtime: {
          masterRoute: prayer.masterRoute,
          openAiCalled: false,
          orchestratorLane: 'prayer_companion',
          phase5K: true,
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
function runBibleCompanionOrchestrator({
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
  if (
    ingested.learningCandidate &&
    ingested.learningAck &&
    /\b(remember|database|when others ask|for others)\b/i.test(message) &&
    !/\bremember that i like direct/i.test(message)
  ) {
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
    const pending = resolvePendingQuestion({ userId, message, runtimeContext, safety });
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

  if (reasoningPlan.answerLane === 'bible_wide' || routePlan.lane === 'bible_wide') {
    const concept =
      reasoningPlan.conceptNode ||
      getConceptById(reasoningPlan.concept) ||
      resolveConceptForMessage(message, userId);
    if (concept) {
      const wideAnswer = buildBibleWideAnswer({
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
  if (postConcept && !postConcept.strictTopic) {
    const wideAnswer = buildBibleWideAnswer({
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
