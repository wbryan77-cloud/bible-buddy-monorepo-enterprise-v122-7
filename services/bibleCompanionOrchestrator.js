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
} = require('./reflectionMemoryEngine');
const { classifyCompanionState, buildCompanionSupportReply } = require('./companionStateEngine');
const { resolvePendingQuestion, isPendingQuestionChallenge } = require('./pendingQuestionResolver');
const { formatDirectDoctrineReply, DENIAL_RE } = require('./directAnswerFormatter');
const { recordUserTurn } = require('./doctrineConversationState');

function buildClarificationReply(message = '') {
  return {
    reply:
      'I want to answer from Scripture directly. Could you tell me a little more — which book, topic, or passage you mean? I’ll stay with the Bible text line upon line.',
    scripture: [],
    masterRoute: 'bible_companion_clarification',
    admin_flags: ['clarification_request', 'learning_candidate'],
  };
}

function verifyOrchestratorOutput(structured = {}) {
  const reply = String(structured.reply || '');
  const scripture = structured.scripture || [];
  const hasRefs =
    scripture.length > 0 ||
    /\b(?:Genesis|Exodus|Leviticus|Matthew|Revelation|Corinthians|Hebrews|Psalm|Daniel)\s+\d+/i.test(reply);
  if (hasRefs && DENIAL_RE.test(reply)) {
    structured.reply = formatDirectDoctrineReply(reply, '', { scripture });
  }
  return structured;
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
  ingestUserMessage(userId, message);

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

  if (reasoningPlan.answerLane === 'clarification') {
    recordRoutingFailure(userId, message, 'unknown_bible_phrase');
    const clar = buildClarificationReply(message);
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

  if (companionState.mode === 'listener' && !reasoningPlan.strictTopic && !reasoningPlan.concept) {
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
