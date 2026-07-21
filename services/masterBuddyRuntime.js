/**
 * Sprint 2.FINAL-C — Master Buddy Runtime
 * Reason first, then route. Single decision path for POST /buddy/chat.
 *
 * Order: crisis → message → reasoning snapshot → active conversation →
 * question intent → route owner (from reasoning) → answer →
 * answer match gate → response contract → polish → persist.
 */

const openai = require('./openaiClient');
const { buildRuntimeContext, buildRuntimeInstructions, scoreCompanionQuality } = require('./runtimeOrchestrator');
const { runDoctrineRuntimePipeline } = require('./doctrineRuntimePipeline');
const { orchestrateBuddyRuntime } = require('./retrievalFirstBuddyOrchestrator');
const { presentCompanionDoctrine } = require('./companionDoctrinePresenter');
const { classifyContinueStudyIntent, buildContinueStudyResponse } = require('./continueStudyIntent');
const { classifyEmotionalSupport, buildEmotionalSupportResponse } = require('./griefCompanionResponse');
const { detectRegistryStudyTopic, presentRegistryStudyResponse } = require('./registryStudyPresenter');
const { buildPersonalizedFallback } = require('./personalizedFallback');
const { classifyRelationshipRecallQuery } = require('./relationshipRecallEngine');
const { classifyHealthCompanion, buildHealthSupportResponse } = require('./healthCompanionResponse');
const { classifyPrayerIntent, buildPrayerCompanionResponse } = require('./prayerCompanionResponse');
const { classifyStudyConnectionQuery, buildStudyConnectionResponse } = require('./studyConnectionIntent');
const { polishCompanionReply } = require('./companionReplyPolish');
const { resolveSabbathCompanionIntent } = require('./sabbathIntentRouter');
const { buildSabbathHistoryResponse } = require('./sabbathHistoryCompanion');
const { resolveQuestionIntent, resolveFollowUpQuestion, shouldEscalateCorrection } = require('./questionIntentResolver');
const { buildMetaAnswerResponse } = require('./metaAnswerResponder');
const { buildReasoningSnapshot } = require('./reasoningSnapshot');
const { applyAnswerMatchGate } = require('./answerMatchGate');
const { attachResponseContract, validateResponseContract } = require('./responseContract');
const { detectTopicFromMessage } = require('./doctrineBoundaries');
const { getActiveConversation, updateActiveConversation } = require('./activeConversationManager');
const {
  resolveRouteKey,
  getRouteOwner,
  getRoutePermissions,
  shouldSuppressMemory,
  shouldSuppressStudyPrompts,
} = require('./routeOwnershipTable');
const { classifyDiscernment, buildDiscernmentResponse, buildOpenLifeResponse } = require('./companionDiscernmentResponder');
const { sanitizeDoctrineResponse } = require('./runtimeResponseSanitizer');
const { stripInternalRuntimeLabels } = require('./runtimeLabelStripper');
const { enrichResponseWithRelationshipIntelligence } = require('./companionRelationshipOrchestrator');

let getSnapshot = () => ({ modules: [], phases: [], competitors: [], avatars: [] });
let getRecentInsightsForUser = () => [];
let recordCompanionEvent = () => ({ ok: true, skipped: true });

try {
  ({ getSnapshot } = require('./projectBrain'));
} catch (_) {}
try {
  ({ getRecentInsightsForUser } = require('./contentInsight'));
} catch (_) {}
try {
  ({ recordCompanionEvent } = require('./companionIntelligence'));
} catch (_) {}

function polishFinalReply(reply = '') {
  return polishCompanionReply(sanitizeDoctrineResponse(stripInternalRuntimeLabels(String(reply || ''))));
}

function messageStartsNewTopic(message = '', activeTopic = null) {
  if (!activeTopic) return false;
  const normalize = (t) => (t === 'sabbath_history' ? 'sabbath' : t);

  if (activeTopic !== 'health' && classifyHealthCompanion(message).isHealthSupport) return true;
  const emotional = classifyEmotionalSupport(message);
  if (activeTopic !== 'grief' && emotional.isEmotionalSupport && !emotional.isFollowUp) return true;
  if (activeTopic !== 'prayer' && classifyPrayerIntent(message).isPrayerRequest) return true;
  if (activeTopic !== 'discernment' && classifyDiscernment(message).isDiscernment) return true;

  const explicit = detectTopicFromMessage(message);
  if (explicit && normalize(explicit) !== normalize(activeTopic)) return true;
  return false;
}

function buildPresentationFlags({ routeKey, questionIntent, followUp, activeConversation }) {
  const perms = getRoutePermissions(routeKey, { questionIntent, followUp, activeConversation });
  return {
    suppressMemory: !perms.allowMemory,
    suppressStudy: !perms.allowStudy,
    activeLock: perms.activeLock,
    permissions: perms,
  };
}

const MASTER_OPENAI_RULES = `
You are Bible Buddy. First understand the user's current question. Do not answer the topic; answer the question.
Stay inside Scripture boundaries. Do not teach forbidden doctrine (Sunday replaced Sabbath by command, law abolished, heaven at death as settled doctrine, etc.).
Use Scripture first. Use history only when relevant. Use memory only if relevant to the current question.
Be warm, direct, and human — not a verse machine or study prompt engine.
`.trim();

async function generateAnswer({
  routeKey,
  H,
  userId,
  message,
  recentSessions,
  runtimeContext,
  profile,
  questionIntent,
  followUp,
  flags,
}) {
  const isCorrection = followUp.correction || questionIntent.questionType === 'correction';

  switch (routeKey) {
    case 'crisis':
      return H.fallbackReply({ message, safety: runtimeContext.safety || { level: 'crisis' } });

    case 'continue_study': {
      const reply = buildContinueStudyResponse({ userId, message });
      reply.safety_level = runtimeContext.safety?.level || 'standard';
      return reply;
    }

    case 'study_connection': {
      const conn = classifyStudyConnectionQuery(message);
      if (!conn.isStudyConnection) return null;
      return buildStudyConnectionResponse({ userId, message, runtimeContext, profile });
    }

    case 'memory_recall': {
      const recall = classifyRelationshipRecallQuery(message);
      if (!recall.isRecallQuery) return null;
      return H.buildMemoryRecallStructured({ userId, message, recall, runtimeContext, safety: runtimeContext.safety });
    }

    case 'sabbath_history':
    case 'historical_evidence':
    case 'historical_follow_up': {
      const reasoningSnapshot = runtimeContext.reasoningSnapshot;
      if (
        reasoningSnapshot?.questionType === 'meta_about_previous_answer' ||
        reasoningSnapshot?.requestedAnswerType === 'wording_explanation'
      ) {
        return buildMetaAnswerResponse({
          userId,
          message,
          recentSessions,
          activeConversation: runtimeContext.activeConversation,
          questionIntent,
          strictAnswerMode: true,
          correctionMode: isCorrection,
        });
      }
      const sabbathIntent = resolveSabbathCompanionIntent({ message, recentSessions });
      const reply = buildSabbathHistoryResponse({
        userId,
        message,
        recentSessions,
        correction: isCorrection || sabbathIntent.correction,
        runtimeContext,
        profile,
        questionIntent: { ...questionIntent, questionType: isCorrection ? 'correction' : questionIntent.questionType },
      });
      reply.runtime = {
        ...(reply.runtime || {}),
        activeConversationLock: flags.activeLock,
        followUp: followUp.isFollowUp,
        correction: isCorrection,
        activeTopic: 'sabbath',
        masterRoute: routeKey,
      };
      return reply;
    }

    case 'health_support': {
      const health = classifyHealthCompanion(message);
      const reply = buildHealthSupportResponse({
        userId,
        message,
        runtimeContext,
        profile,
        health: health.health || { issue: 'this' },
        suppressStudyPrompts: flags.suppressStudy,
      });
      reply.runtime = {
        ...(reply.runtime || {}),
        activeConversationLock: flags.activeLock && followUp.isFollowUp,
        followUp: followUp.isFollowUp,
        activeTopic: 'health',
        masterRoute: routeKey,
        companionPresentation: { skipStudyPrompts: flags.suppressStudy },
      };
      return reply;
    }

    case 'grief_support':
    case 'rest_support': {
      const emotional = classifyEmotionalSupport(message, userId);
      const reply = buildEmotionalSupportResponse({
        userId,
        message,
        runtimeContext,
        supportType: emotional.supportType || 'grief',
        profile,
        isFollowUp: followUp.isFollowUp || emotional.isFollowUp,
        suppressStudyPrompts: flags.suppressStudy,
      });
      reply.runtime = {
        ...(reply.runtime || {}),
        activeConversationLock: flags.activeLock && followUp.isFollowUp,
        followUp: followUp.isFollowUp,
        activeTopic: 'grief',
        masterRoute: routeKey,
        companionPresentation: { skipStudyPrompts: flags.suppressStudy },
      };
      return reply;
    }

    case 'prayer': {
      const reply = buildPrayerCompanionResponse({
        userId,
        message,
        runtimeContext,
        profile,
        suppressStudyPrompts: flags.suppressStudy,
      });
      reply.runtime = { ...(reply.runtime || {}), masterRoute: routeKey };
      return reply;
    }

    case 'job_discernment': {
      const reply = buildDiscernmentResponse({
        userId,
        message,
        runtimeContext,
        profile,
        isFollowUp: followUp.isFollowUp,
      });
      reply.runtime = {
        ...(reply.runtime || {}),
        activeConversationLock: flags.activeLock && followUp.isFollowUp,
        followUp: followUp.isFollowUp,
        activeTopic: 'discernment',
        masterRoute: routeKey,
      };
      return reply;
    }

    case 'meta_about_previous_answer': {
      const reply = buildMetaAnswerResponse({
        userId,
        message,
        recentSessions,
        activeConversation: runtimeContext.activeConversation,
        questionIntent,
        strictAnswerMode: questionIntent.strictAnswerMode || flags.permissions?.strictAnswerMode,
        correctionMode: followUp.correction || questionIntent.isCorrection,
      });
      reply.runtime = {
        ...(reply.runtime || {}),
        activeConversationLock: true,
        followUp: followUp.isFollowUp,
        activeTopic: runtimeContext.activeConversation?.topic || questionIntent.topic,
        masterRoute: routeKey,
        companionPresentation: { skipStudyPrompts: true, skipRelationshipEnrichment: true, skipMemory: true },
      };
      return reply;
    }

    case 'sabbath_definition':
    case 'doctrine_general': {
      const doctrineResult = runDoctrineRuntimePipeline({ message, questionIntent });
      if (!doctrineResult?.intercepted) return null;

      let structured = {
        ...doctrineResult.reply,
        safety_level: runtimeContext.safety?.level || 'standard',
        memory_used: false,
        runtime: {
          ...(doctrineResult.reply.runtime || {}),
          emotion: runtimeContext.emotion,
          intent: runtimeContext.intent,
          doctrineTopic: doctrineResult.topic,
          questionIntent,
          masterRoute: routeKey,
        },
      };

      try {
        const refs = (structured.scripture || []).map((s) => s.reference || s);
        const chain = await orchestrateBuddyRuntime({ topic: doctrineResult.topic, scripture: refs, message });
        structured.runtime.scriptureChain = chain;
      } catch (_) {}

      structured = presentCompanionDoctrine({
        structured,
        userId,
        message,
        runtimeContext,
        profile,
        safety: runtimeContext.safety,
        doctrineTopic: doctrineResult.topic,
        answerFirstMode: questionIntent.questionType === 'definition' || questionIntent.questionType === 'comparison',
        suppressStudyPrompts: flags.suppressStudy,
        suppressMemory: flags.suppressMemory,
      });

      structured.reply = polishFinalReply(structured.reply);
      structured._doctrineTopic = doctrineResult.topic;
      structured._skipFinalizeEnrichment = flags.suppressMemory;
      return structured;
    }

    case 'registry_study': {
      const registryKey = detectRegistryStudyTopic(message);
      if (!registryKey) return null;
      const reply = presentRegistryStudyResponse({ userId, message, registryKey, runtimeContext, profile });
      if (reply) reply._doctrineTopic = registryKey;
      return reply;
    }

    default:
      if (questionIntent.questionType === 'open_question') {
        return buildOpenLifeResponse({
          userId,
          message,
          runtimeContext,
          isFollowUp: followUp.isFollowUp,
        });
      }
      return null;
  }
}

async function generateOpenAnswer({ H, userId, mode, personaKey, message, safety, profile, recentSessions, recentInsights, runtimeContext, snapshot, startedAt, flags = {} }) {
  if (runtimeContext.questionIntent?.questionType === 'open_question') {
    const reply = buildOpenLifeResponse({
      userId,
      message,
      runtimeContext,
      isFollowUp: !!runtimeContext.followUp?.isFollowUp,
    });
    reply.reply = polishFinalReply(reply.reply);
    return reply;
  }

  if (!openai) {
    let reply = buildPersonalizedFallback({
      userId,
      message,
      safety,
      recentSessions,
      runtimeContext,
      profile,
      suppressStudyPrompts: flags.suppressStudy,
      suppressMemory: flags.suppressMemory,
    });
    reply = H.applyFallbackLoopGuard({ reply, runtimeContext, recentSessions, message, safety, userId });
    reply.reply = polishFinalReply(reply.reply);
    return reply;
  }

  const runtimeInstructions = buildRuntimeInstructions(runtimeContext);
  const systemPrompt = `${H.buildSystemPrompt({ mode, personaKey, profile, runtimeInstructions })}\n\n${MASTER_OPENAI_RULES}`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.72,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({ message, userId, mode, personaKey, safety, companionProfile: profile, runtimeContext, recentSessions, recentInsights, projectSnapshot: snapshot }, null, 2),
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || '';
    let fallback = H.fallbackReply({ message, safety, userId, recentSessions, runtimeContext, profile });
    fallback = H.applyFallbackLoopGuard({ reply: fallback, runtimeContext, recentSessions, message, safety, userId });
    const parsed = H.safeJsonParse(raw) || fallback;
    const quality = scoreCompanionQuality({ message, reply: parsed.reply || fallback.reply, runtimeContext });
    let structured = H.normalizeStructured(parsed, fallback, safety, runtimeContext, quality);
    structured = H.applyFallbackLoopGuard({ reply: structured, runtimeContext, recentSessions, message, safety, userId });
    structured.reply = polishFinalReply(structured.reply);
    structured.runtime = { ...(structured.runtime || {}), masterRoute: 'open_general' };
    return structured;
  } catch (e) {
    console.error('MasterBuddyRuntime OpenAI error:', e?.message || e);
    let reply = H.fallbackReply({ message, safety, userId, recentSessions, runtimeContext, profile });
    reply = H.applyFallbackLoopGuard({ reply, runtimeContext, recentSessions, message, safety, userId });
    reply.reply = polishFinalReply(reply.reply);
    return reply;
  }
}

function recordConversationState({ userId, message, structured, runtimeContext, doctrineTopic = null }) {
  const intent = structured.runtime?.intent || null;
  const masterRoute = structured.runtime?.masterRoute || null;
  const activeConversation = runtimeContext.activeConversation || null;

  let topic = structured.runtime?.activeTopic || null;
  if (!topic) {
    if (intent === 'sabbath_history' || masterRoute?.includes('historical') || masterRoute === 'sabbath_history') topic = 'sabbath';
    else if (intent === 'emotional_support' || masterRoute === 'grief_support') topic = 'grief';
    else if (intent === 'health_support' || masterRoute === 'health_support') topic = 'health';
    else if (intent === 'prayer' || masterRoute === 'prayer') topic = 'prayer';
    else if (intent === 'discernment' || intent === 'open_life' || masterRoute === 'job_discernment') topic = 'discernment';
    else if (doctrineTopic) topic = doctrineTopic;
  }

  if (!topic || intent === 'memory_recall') return;

  updateActiveConversation({
    userId,
    topic,
    subtopic: runtimeContext.questionIntent?.subtopic || null,
    questionType: runtimeContext.questionIntent?.questionType || structured.runtime?.questionIntent?.questionType,
    depth: runtimeContext.questionIntent?.requestedDepth || 'standard',
    message,
    answerTopic: topic,
    answerSummary: String(structured.reply || '').slice(0, 200),
    lastDirectQuestion: runtimeContext.followUp?.correction
      ? activeConversation?.unansweredQuestion || activeConversation?.lastDirectQuestion
      : String(message || '').slice(0, 400),
    unansweredQuestion: runtimeContext.followUp?.correction ? activeConversation?.lastDirectQuestion : null,
    lockUntilResolved: structured.runtime?.activeConversationLock || false,
    allowMemorySurfacing: !structured.runtime?.activeConversationLock && topic !== 'sabbath',
    allowStudyPrompt: !structured.runtime?.activeConversationLock && masterRoute === 'continue_study',
    correctionMode: !!runtimeContext.followUp?.correction || runtimeContext.questionIntent?.isCorrection || runtimeContext.questionIntent?.strictAnswerMode,
    frustrationMode: !!runtimeContext.questionIntent?.isFrustrated,
    strictAnswerMode: !!runtimeContext.questionIntent?.strictAnswerMode,
    correctionCount: runtimeContext.followUp?.correction || runtimeContext.questionIntent?.isCorrection
      ? (activeConversation?.correctionCount || 0) + 1
      : activeConversation?.correctionCount || 0,
  });
}

/**
 * Master orchestration entry — called exclusively from buddyBrain.runBuddy.
 */
async function runMasterBuddyRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const startedAt = Date.now();
  const { userId, mode, personaKey, message, testerId, sessionId, cohort } = H.normalizeInput(
    inputOrUserId,
    modeArg,
    personaKeyArg,
    messageArg
  );

  if (!message || !String(message).trim()) {
    return H.fallbackReply({ message, safety: { level: 'standard' } });
  }

  const safety = H.classifySafety(message);
  const profile = H.getUserCompanionProfile(userId);
  const recentSessions = H.getRecentSessions(userId, 8);
  const recentInsights = getRecentInsightsForUser(userId, 8);
  const snapshot = getSnapshot();

  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, recentInsights, safety });
  runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  runtimeContext.userId = userId;
  runtimeContext.profile = profile;
  runtimeContext.safety = safety;

  // Step 3–4: active conversation + question intent (before doctrine)
  const activeConversation = getActiveConversation(userId);
  const questionIntent = resolveQuestionIntent({ message, recentSessions, activeConversation });
  let followUp = resolveFollowUpQuestion({ message, activeConversation });

  if (activeConversation?.strictAnswerMode || shouldEscalateCorrection(message, recentSessions, activeConversation)) {
    questionIntent.strictAnswerMode = true;
    questionIntent.shouldSuppressStudyPrompts = true;
    questionIntent.memoryAllowed = false;
    questionIntent.doctrineTemplateAllowed = false;
  }

  // Topic switch clears follow-up inheritance (e.g. "My knees hurt" after grief)
  if (followUp.isFollowUp && followUp.inheritedTopic && messageStartsNewTopic(message, followUp.inheritedTopic)) {
    followUp = { isFollowUp: false, correction: false, inheritedTopic: null, questionType: null, reason: 'topic_switch' };
  }

  // Explicit memory recall always wins over follow-up inheritance
  const recallEarly = classifyRelationshipRecallQuery(message);
  if (recallEarly.isRecallQuery && profile?.memoryEnabled !== false) {
    followUp = { isFollowUp: false, correction: false, inheritedTopic: null, questionType: null, reason: 'memory_recall' };
  }

  if (followUp.isFollowUp && followUp.inheritedTopic) {
    questionIntent.topic = followUp.inheritedTopic === 'sabbath' ? 'sabbath' : followUp.inheritedTopic;
    if (followUp.questionType === 'meta_about_previous_answer') {
      questionIntent.questionType = 'meta_about_previous_answer';
      questionIntent.subtopic = 'wording';
      questionIntent.isMetaQuestion = true;
      questionIntent.isSabbathHistory = false;
      questionIntent.shouldSuppressStudyPrompts = true;
      questionIntent.memoryAllowed = false;
      questionIntent.doctrineTemplateAllowed = false;
    } else if (followUp.correction) {
      questionIntent.questionType = 'correction';
    } else if (followUp.questionType) {
      questionIntent.questionType = followUp.questionType;
    }
    questionIntent.shouldSuppressStudyPrompts = true;
    if (followUp.inheritedTopic === 'sabbath' && followUp.questionType !== 'meta_about_previous_answer') {
      questionIntent.isSabbathHistory = true;
    }
    questionIntent.isFollowUp = true;
  }
  if (followUp.correction) questionIntent.isCorrection = true;

  // Step 5: reasoning snapshot BEFORE routing (reason first, then route)
  const reasoningSnapshot = buildReasoningSnapshot({
    message,
    activeConversation,
    recentSessions,
    questionIntent,
    followUp,
    safety,
  });
  runtimeContext.reasoningSnapshot = reasoningSnapshot;

  if (reasoningSnapshot.strictAnswerMode) {
    questionIntent.strictAnswerMode = true;
    questionIntent.shouldSuppressStudyPrompts = true;
    questionIntent.memoryAllowed = false;
    questionIntent.doctrineTemplateAllowed = false;
    questionIntent.isSabbathHistory = false;
  }
  if (reasoningSnapshot.isMetaQuestion) {
    questionIntent.questionType = 'meta_about_previous_answer';
    questionIntent.isMetaQuestion = true;
    questionIntent.subtopic = 'wording';
    questionIntent.isSabbathHistory = false;
    questionIntent.shouldSuppressStudyPrompts = true;
    questionIntent.memoryAllowed = false;
    questionIntent.doctrineTemplateAllowed = false;
  }
  if (reasoningSnapshot.questionType === 'correction') {
    questionIntent.isCorrection = true;
  }

  runtimeContext.questionIntent = questionIntent;
  runtimeContext.activeConversation = activeConversation;
  runtimeContext.followUp = followUp;

  // Step 1: crisis
  if (safety.level === 'crisis') {
    const crisisReply = H.fallbackReply({ message, safety });
    crisisReply.quality = scoreCompanionQuality({ message, reply: crisisReply.reply, runtimeContext });
    crisisReply.reply = polishFinalReply(crisisReply.reply);
    crisisReply.runtime = { emotion: runtimeContext.emotion, intent: runtimeContext.intent, masterRoute: 'crisis' };
    H.appendSession({ userId, mode, personaKey, message, reply: crisisReply.reply, structured: crisisReply, safety, runtime: runtimeContext, quality: crisisReply.quality });
    H.appendQualityEvent({ userId, mode, issues: crisisReply.quality.issues, score: crisisReply.quality.score, safety });
    H.persistBuddyMemory({ userId, message, structured: crisisReply, runtimeContext, profile });
    return crisisReply;
  }

  // Step 7: route owner selection — reasoning snapshot wins over topic inheritance
  let routeKey = reasoningSnapshot.recommendedRoute || resolveRouteKey({ questionIntent, followUp, activeConversation, safety });

  if (process.env.BUDDY_ROUTE_TRACE === '1') {
    console.log('[SPRINT1A3_ROUTE_TRACE]', JSON.stringify({
      message: String(message || '').slice(0, 160),
      questionType: questionIntent?.questionType || null,
      questionTopic: questionIntent?.topic || null,
      questionIntent: questionIntent?.intent || null,
      followUp: {
        isFollowUp: !!followUp?.isFollowUp,
        inheritedTopic: followUp?.inheritedTopic || null,
        questionType: followUp?.questionType || null,
        correction: !!followUp?.correction,
      },
      activeConversation: activeConversation
        ? {
            topic: activeConversation.topic || null,
            route: activeConversation.route || null,
          }
        : null,
      reasoningSnapshot: {
        questionType: reasoningSnapshot?.questionType || null,
        recommendedRoute: reasoningSnapshot?.recommendedRoute || null,
        routeReason: reasoningSnapshot?.routeReason || null,
      },
      selectedRouteKey: routeKey,
    }));
  }

  // Explicit overrides before route dispatch
  const continueStudy = classifyContinueStudyIntent(message, userId);
  if (continueStudy.isContinueStudy && profile?.memoryEnabled !== false) routeKey = 'continue_study';

  const recall = classifyRelationshipRecallQuery(message);
  if (recall.isRecallQuery && profile?.memoryEnabled !== false) routeKey = 'memory_recall';

  const studyConn = classifyStudyConnectionQuery(message);
  if (studyConn.isStudyConnection && profile?.memoryEnabled !== false && !followUp.isFollowUp) routeKey = 'study_connection';

  // Only route to health/grief/prayer/discernment if NOT an active follow-up on different topic
  if (!followUp.isFollowUp || messageStartsNewTopic(message, followUp.inheritedTopic)) {
    if (routeKey === 'open_general' || !routeKey) {
      if (classifyHealthCompanion(message).isHealthSupport) routeKey = 'health_support';
      else if (classifyEmotionalSupport(message, userId).isEmotionalSupport) routeKey = 'grief_support';
      else if (classifyPrayerIntent(message).isPrayerRequest) routeKey = 'prayer';
      else if (classifyDiscernment(message).isDiscernment) routeKey = 'job_discernment';
    }
  }

  // Sabbath history from intent if not yet resolved (never when reasoning says meta/strict)
  const sabbathIntent = resolveSabbathCompanionIntent({ message, recentSessions });
  if (
    !reasoningSnapshot.isMetaQuestion &&
    !reasoningSnapshot.strictAnswerMode &&
    reasoningSnapshot.recommendedRoute !== 'meta_about_previous_answer' &&
    questionIntent.questionType !== 'meta_about_previous_answer' &&
    !questionIntent.isMetaQuestion &&
    !followUp.isFollowUp &&
    (questionIntent.isSabbathHistory ||
      sabbathIntent.intent === 'history_deep' ||
      sabbathIntent.intent === 'history' ||
      sabbathIntent.intent === 'correction') &&
    questionIntent.questionType !== 'comparison'
  ) {
    routeKey = 'sabbath_history';
  }

  if (reasoningSnapshot.recommendedRoute === 'meta_about_previous_answer' || reasoningSnapshot.isMetaQuestion) {
    routeKey = 'meta_about_previous_answer';
  }

  if (questionIntent.questionType === 'meta_about_previous_answer' || questionIntent.isMetaQuestion) {
    routeKey = 'meta_about_previous_answer';
  }

  if (!routeKey) routeKey = questionIntent.isSabbathDefinition ? 'sabbath_definition' : 'doctrine_general';
  if (questionIntent.questionType === 'open_question') routeKey = 'open_general';

  const routeOwner = getRouteOwner(routeKey);
  const flags = buildPresentationFlags({ routeKey, questionIntent, followUp, activeConversation });

  // Step 8–9: generate answer via route owner
  let structured = await generateAnswer({
    routeKey,
    H,
    userId,
    message,
    recentSessions,
    runtimeContext,
    profile,
    questionIntent,
    followUp,
    flags,
  });

  // Doctrine pipeline fallback if doctrine_general didn't intercept
  if (!structured && routeKey === 'doctrine_general') {
    structured = await generateAnswer({
      routeKey: 'doctrine_general',
      H,
      userId,
      message,
      recentSessions,
      runtimeContext,
      profile,
      questionIntent,
      followUp,
      flags,
    });
  }

  // Registry study fallback
  if (!structured && routeKey !== 'registry_study') {
    const registryKey = detectRegistryStudyTopic(message);
    if (registryKey) {
      structured = await generateAnswer({
        routeKey: 'registry_study',
        H,
        userId,
        message,
        recentSessions,
        runtimeContext,
        profile,
        questionIntent,
        followUp,
        flags,
      });
    }
  }

  // Open / fallback path
  if (!structured) {
    structured = await generateOpenAnswer({
      H,
      userId,
      mode,
      personaKey,
      message,
      safety,
      profile,
      recentSessions,
      recentInsights,
      runtimeContext,
      snapshot,
      startedAt,
      flags,
    });
  }

  if (!structured) {
    structured = H.fallbackReply({ message, safety, userId, recentSessions, runtimeContext, profile });
    structured.reply = polishFinalReply(structured.reply);
  }

  // Step 11: answer match gate + response contract
  const needsAnswerMatchGate =
    reasoningSnapshot.isMetaQuestion ||
    reasoningSnapshot.requestedAnswerType === 'wording_explanation' ||
    (reasoningSnapshot.strictAnswerMode && reasoningSnapshot.requestedAnswerType === 'wording_explanation');

  if (needsAnswerMatchGate) {
    const matched = applyAnswerMatchGate({
      structured,
      reasoningSnapshot,
      questionIntent,
      followUp,
      recentSessions,
      activeConversation,
    });
    structured = matched.structured;

    const contractCheck = validateResponseContract(structured.runtime?.responseContract, reasoningSnapshot);
    if (!contractCheck.valid && reasoningSnapshot.isMetaQuestion) {
      const forced = buildMetaAnswerResponse({
        userId,
        message,
        recentSessions,
        activeConversation,
        questionIntent,
        strictAnswerMode: true,
        correctionMode: reasoningSnapshot.isCorrection,
      });
      structured = { ...structured, ...forced, reply: forced.reply };
    }

    structured.runtime = {
      ...(structured.runtime || {}),
      answerMatch: matched.match,
      answerMatchRegenerated: matched.regenerated,
      answerMatchFallback: matched.usedFallback,
      reasoningSnapshot,
      masterRoute: routeKey,
    };
  }

  structured = attachResponseContract(structured, reasoningSnapshot);
  structured.runtime = {
    ...(structured.runtime || {}),
    reasoningSnapshot,
    masterRoute: routeKey,
  };

  structured.safety_level = structured.safety_level || safety.level;

  // Memory recall path finalizes differently (no enrichment bleed)
  if (routeKey === 'memory_recall' && structured) {
    structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
    structured.reply = polishFinalReply(structured.reply);
    H.appendSession({ userId, mode, personaKey, message, reply: structured.reply, structured, safety, runtime: runtimeContext, quality: structured.quality });
    H.appendQualityEvent({ userId, mode, emotion: runtimeContext.emotion, intent: 'memory_recall', issues: structured.quality.issues || [], score: structured.quality.score });
    H.updateUserMemory({ userId, message, structured, runtimeContext });
    H.persistBuddyMemory({ userId, message, structured, runtimeContext, profile });
    return structured;
  }

  // Doctrine path that skipped finalizeBuddyResponse
  if (structured._skipFinalizeEnrichment !== undefined) {
    const doctrineTopic = structured._doctrineTopic;
    delete structured._skipFinalizeEnrichment;
    delete structured._doctrineTopic;

    const quality = structured.quality || scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
    structured.quality = quality;

    if (!flags.suppressMemory && profile?.memoryEnabled !== false) {
      const enriched = enrichResponseWithRelationshipIntelligence({
        userId,
        reply: structured.reply,
        message,
        runtimeContext,
        includeReflection: false,
        includeLoopRevisit: true,
        includeStudyJourney: false,
        doctrineTopic,
      });
      structured.reply = polishFinalReply(enriched.reply);
      structured.runtime.relationshipIntelligence = enriched.relationshipContext;
    }

    H.appendSession({ userId, mode, personaKey, message, reply: structured.reply, structured, safety, runtime: runtimeContext, quality });
    H.appendQualityEvent({ userId, mode, emotion: runtimeContext.emotion, intent: runtimeContext.intent, issues: quality.issues || [], score: quality.score });
    if (profile?.memoryEnabled !== false) H.updateUserMemory({ userId, message, structured, runtimeContext });
    H.persistBuddyMemory({ userId, message, structured, runtimeContext, profile, doctrineTopic });
    recordConversationState({ userId, message, structured, runtimeContext, doctrineTopic });

    recordCompanionEvent({
      type: 'runtime_orchestration',
      userId,
      mode,
      durationMs: Date.now() - startedAt,
      feature: 'master_buddy_runtime',
      routeKey,
      routeOwner: routeOwner.owner,
    });

    return structured;
  }

  // Standard finalize path (steps 12–15)
  structured.runtime = {
    ...(structured.runtime || {}),
    masterRoute: routeKey,
    routeOwner: routeOwner.owner,
    questionIntent,
    followUp: followUp.isFollowUp,
    correction: followUp.correction,
  };

  if (flags.activeLock) {
    structured.runtime.activeConversationLock = true;
    structured.runtime.companionPresentation = {
      ...(structured.runtime.companionPresentation || {}),
      skipRelationshipEnrichment: true,
      skipStudyPrompts: flags.suppressStudy,
    };
  }

  structured.reply = polishFinalReply(structured.reply);

  const finalized = H.finalizeBuddyResponse({
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

  recordConversationState({ userId, message, structured: finalized, runtimeContext, doctrineTopic: structured._doctrineTopic || null });

  recordCompanionEvent({
    type: 'runtime_orchestration',
    userId,
    mode,
    durationMs: Date.now() - startedAt,
    feature: 'master_buddy_runtime',
    routeKey,
    routeOwner: routeOwner.owner,
  });

  return finalized;
}

module.exports = {
  runMasterBuddyRuntime,
  polishFinalReply,
  messageStartsNewTopic,
  buildPresentationFlags,
  resolveRouteKey,
};
