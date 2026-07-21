/**
 * Doctrine / Sabbath / registry paths only — no health/grief/job template routing.
 * Active conversation is not used to force route ownership.
 */

const { scoreCompanionQuality } = require('./runtimeOrchestrator');
const { runDoctrineRuntimePipeline } = require('./doctrineRuntimePipeline');
const { orchestrateBuddyRuntime } = require('./retrievalFirstBuddyOrchestrator');
const { presentCompanionDoctrine } = require('./companionDoctrinePresenter');
const { resolveQuestionIntent, isMetaAboutPreviousAnswer } = require('./questionIntentResolver');
const { resolveSabbathCompanionIntent } = require('./sabbathIntentRouter');
const { buildSabbathHistoryResponse } = require('./sabbathHistoryCompanion');
const { buildMetaAnswerResponse } = require('./metaAnswerResponder');
const { detectRegistryStudyTopic, presentRegistryStudyResponse } = require('./registryStudyPresenter');
const { getActiveConversation } = require('./activeConversationManager');
const { polishCompanionReply } = require('./companionReplyPolish');

let getRecentInsightsForUser = () => [];
try {
  ({ getRecentInsightsForUser } = require('./contentInsight'));
} catch (_) {}

function shouldUseDoctrineCompanionPath(message = '', recentSessions = []) {
  if (process.env.BUDDY_OPENAI_FIRST === '0') return false;

  const questionIntent = resolveQuestionIntent({
    message,
    recentSessions,
    activeConversation: null,
  });

  if (questionIntent.isSabbathDefinition || questionIntent.isSabbathHistory) return true;
  if (questionIntent.questionType === 'meta_about_previous_answer' && isMetaAboutPreviousAnswer(message)) {
    return true;
  }
  if (
    ['historical_evidence', 'historical_confirmation', 'historical_causation', 'historical_follow_up', 'definition', 'comparison'].includes(
      questionIntent.questionType
    )
  ) {
    return true;
  }

  const doctrineResult = runDoctrineRuntimePipeline({ message, questionIntent });
  if (doctrineResult?.intercepted) return true;

  const sabbathIntent = resolveSabbathCompanionIntent({ message, recentSessions });
  if (['history', 'history_deep', 'correction'].includes(sabbathIntent.intent)) return true;

  if (detectRegistryStudyTopic(message)) return true;

  return false;
}

function resolveDoctrineRouteKey({ message, recentSessions = [] }) {
  const questionIntent = resolveQuestionIntent({
    message,
    recentSessions,
    activeConversation: null,
  });

  if (questionIntent.questionType === 'meta_about_previous_answer' || isMetaAboutPreviousAnswer(message)) {
    return { routeKey: 'meta_about_previous_answer', questionIntent };
  }

  const sabbathIntent = resolveSabbathCompanionIntent({ message, recentSessions });
  if (
    questionIntent.isSabbathHistory ||
    ['history', 'history_deep', 'correction'].includes(sabbathIntent.intent)
  ) {
    return { routeKey: 'sabbath_history', questionIntent, sabbathIntent };
  }

  if (questionIntent.isSabbathDefinition) {
    return { routeKey: 'sabbath_definition', questionIntent };
  }

  const registryKey = detectRegistryStudyTopic(message);
  if (registryKey) return { routeKey: 'registry_study', questionIntent, registryKey };

  const doctrineResult = runDoctrineRuntimePipeline({ message, questionIntent });
  if (doctrineResult?.intercepted) {
    return { routeKey: 'doctrine_general', questionIntent, doctrineResult };
  }

  if (['historical_evidence', 'historical_confirmation', 'historical_causation'].includes(questionIntent.questionType)) {
    return { routeKey: 'sabbath_history', questionIntent };
  }

  return { routeKey: null, questionIntent };
}

async function runDoctrineCompanionPath(H, { userId, mode, personaKey, message, safety, profile, recentSessions, runtimeContext, testerId, sessionId, cohort }) {
  const resolved = resolveDoctrineRouteKey({ message, recentSessions });
  if (!resolved.routeKey) return null;

  const { routeKey, questionIntent, sabbathIntent, registryKey, doctrineResult } = resolved;
  const activeConversation = getActiveConversation(userId);
  runtimeContext.questionIntent = questionIntent;
  runtimeContext.activeConversationHint = activeConversation;

  let structured = null;
  const isCorrection = questionIntent.isCorrection || sabbathIntent?.correction;

  switch (routeKey) {
    case 'meta_about_previous_answer':
      structured = buildMetaAnswerResponse({
        userId,
        message,
        recentSessions,
        activeConversation,
        questionIntent,
        strictAnswerMode: questionIntent.strictAnswerMode,
        correctionMode: isCorrection,
      });
      structured.runtime = {
        ...(structured.runtime || {}),
        masterRoute: routeKey,
        intent: 'meta_about_previous_answer',
        activeTopic: activeConversation?.topic || questionIntent.topic,
      };
      break;

    case 'sabbath_history': {
      structured = buildSabbathHistoryResponse({
        userId,
        message,
        recentSessions,
        correction: isCorrection || sabbathIntent?.correction,
        runtimeContext,
        profile,
        questionIntent: { ...questionIntent, questionType: isCorrection ? 'correction' : questionIntent.questionType },
      });
      structured.runtime = {
        ...(structured.runtime || {}),
        masterRoute: routeKey,
        intent: 'sabbath_history',
        activeTopic: 'sabbath',
      };
      break;
    }

    case 'sabbath_definition':
    case 'doctrine_general': {
      const pipeline = doctrineResult || runDoctrineRuntimePipeline({ message, questionIntent });
      if (!pipeline?.intercepted) return null;
      structured = {
        ...pipeline.reply,
        safety_level: safety.level || 'standard',
        memory_used: false,
        runtime: {
          ...(pipeline.reply.runtime || {}),
          emotion: runtimeContext.emotion,
          intent: runtimeContext.intent,
          doctrineTopic: pipeline.topic,
          questionIntent,
          masterRoute: routeKey,
        },
      };
      try {
        const refs = (structured.scripture || []).map((s) => s.reference || s);
        const chain = await orchestrateBuddyRuntime({ topic: pipeline.topic, scripture: refs, message });
        structured.runtime.scriptureChain = chain;
      } catch (_) {}
      structured = presentCompanionDoctrine({
        structured,
        userId,
        message,
        runtimeContext,
        profile,
        safety,
        doctrineTopic: pipeline.topic,
        answerFirstMode: questionIntent.questionType === 'definition' || questionIntent.questionType === 'comparison',
        suppressStudyPrompts: true,
        suppressMemory: true,
      });
      structured._doctrineTopic = pipeline.topic;
      break;
    }

    case 'registry_study': {
      const key = registryKey || detectRegistryStudyTopic(message);
      if (!key) return null;
      structured = presentRegistryStudyResponse({ userId, message, registryKey: key, runtimeContext, profile });
      if (structured) {
        structured._doctrineTopic = key;
        structured.runtime = { ...(structured.runtime || {}), masterRoute: routeKey };
      }
      break;
    }

    default:
      return null;
  }

  if (!structured) return null;

  structured.reply = polishCompanionReply(structured.reply);
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
    doctrineTopic: structured._doctrineTopic || null,
    testerId,
    sessionId,
    cohort,
  });
}

module.exports = {
  shouldUseDoctrineCompanionPath,
  resolveDoctrineRouteKey,
  runDoctrineCompanionPath,
};
