/**
 * Sprint 2.FINAL — Route Ownership Table
 * Every intent has exactly one owner with explicit memory/study/history permissions.
 */

const ROUTE_OWNERS = {
  crisis: {
    intent: 'crisis',
    owner: 'crisisHandler',
    module: 'buddyBrain',
    allowedMemory: false,
    allowedStudyPrompt: false,
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  sabbath_definition: {
    intent: 'sabbath_definition',
    owner: 'sourceGroundedResponder',
    presenter: 'companionDoctrinePresenter',
    module: 'doctrineRuntimePipeline',
    allowedMemory: false,
    allowedStudyPrompt: 'after_answer_only',
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  sabbath_history: {
    intent: 'sabbath_history',
    owner: 'sabbathHistoryDeepResponder',
    module: 'sabbathHistoryCompanion',
    allowedMemory: false,
    allowedStudyPrompt: false,
    allowedHistory: true,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  historical_evidence: {
    intent: 'historical_evidence',
    owner: 'sabbathHistoryDeepResponder',
    module: 'sabbathHistoryCompanion',
    allowedMemory: false,
    allowedStudyPrompt: false,
    allowedHistory: true,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  historical_follow_up: {
    intent: 'historical_follow_up',
    owner: 'sabbathHistoryDeepResponder',
    module: 'sabbathHistoryCompanion',
    allowedMemory: false,
    allowedStudyPrompt: false,
    allowedHistory: true,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  health_support: {
    intent: 'health_support',
    owner: 'healthCompanionResponse',
    module: 'healthCompanionResponse',
    allowedMemory: 'same_topic_only',
    allowedStudyPrompt: false,
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  grief_support: {
    intent: 'grief_support',
    owner: 'griefCompanionResponse',
    module: 'griefCompanionResponse',
    allowedMemory: 'same_topic_only',
    allowedStudyPrompt: false,
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  rest_support: {
    intent: 'rest_support',
    owner: 'griefCompanionResponse',
    module: 'griefCompanionResponse',
    allowedMemory: 'same_topic_only',
    allowedStudyPrompt: false,
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  prayer: {
    intent: 'prayer',
    owner: 'prayerCompanionResponse',
    module: 'prayerCompanionResponse',
    allowedMemory: 'prayer_topic_only',
    allowedStudyPrompt: false,
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  continue_study: {
    intent: 'continue_study',
    owner: 'continueStudyEngine',
    module: 'continueStudyIntent',
    allowedMemory: 'study_memory_only',
    allowedStudyPrompt: true,
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  study_connection: {
    intent: 'study_connection',
    owner: 'studyConnectionIntent',
    module: 'studyConnectionIntent',
    allowedMemory: 'study_memory_only',
    allowedStudyPrompt: true,
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  memory_recall: {
    intent: 'memory_recall',
    owner: 'relationshipRecallEngine',
    module: 'relationshipRecallEngine',
    allowedMemory: true,
    allowedStudyPrompt: false,
    allowedHistory: false,
    requiresScripture: false,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  job_discernment: {
    intent: 'discernment',
    owner: 'companionDiscernmentResponder',
    module: 'companionDiscernmentResponder',
    allowedMemory: 'relevant_only',
    allowedStudyPrompt: false,
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  doctrine_general: {
    intent: 'doctrine_general',
    owner: 'sourceGroundedResponder',
    presenter: 'companionDoctrinePresenter',
    module: 'doctrineRuntimePipeline',
    allowedMemory: false,
    allowedStudyPrompt: 'after_answer_only',
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  registry_study: {
    intent: 'registry_study',
    owner: 'registryStudyPresenter',
    module: 'registryStudyPresenter',
    allowedMemory: false,
    allowedStudyPrompt: 'after_answer_only',
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  open_general: {
    intent: 'open_general',
    owner: 'personalizedFallback',
    module: 'masterBuddyRuntime',
    allowedMemory: 'relevant_only',
    allowedStudyPrompt: 'only_if_user_asks',
    allowedHistory: false,
    requiresScripture: true,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
  meta_about_previous_answer: {
    intent: 'meta_about_previous_answer',
    owner: 'metaAnswerResponder',
    module: 'metaAnswerResponder',
    allowedMemory: false,
    allowedStudyPrompt: false,
    allowedHistory: 'minimal',
    requiresScripture: false,
    requiresCompanionTone: true,
    bypassForbidden: true,
  },
};

const TOPIC_TO_ROUTE = {
  sabbath: 'sabbath_history',
  sabbath_history: 'sabbath_history',
  health: 'health_support',
  grief: 'grief_support',
  rest: 'rest_support',
  prayer: 'prayer',
  discernment: 'job_discernment',
};

function resolveRouteKey({ questionIntent = {}, followUp = {}, activeConversation = null, safety = {} } = {}) {
  if (safety.level === 'crisis') return 'crisis';

  if (questionIntent.questionType === 'meta_about_previous_answer' || followUp.questionType === 'meta_about_previous_answer') {
    return 'meta_about_previous_answer';
  }

  const qType = followUp.correction && questionIntent.questionType !== 'meta_about_previous_answer'
    ? 'correction'
    : followUp.isFollowUp && followUp.inheritedTopic
      ? followUp.questionType || 'historical_follow_up'
      : questionIntent.questionType;

  const topic = followUp.inheritedTopic || questionIntent.topic || activeConversation?.topic;

  if (qType === 'study_continuation' || qType === 'study_continue') return 'continue_study';
  if (qType === 'meta_about_previous_answer') return 'meta_about_previous_answer';
  if (
    (questionIntent.strictAnswerMode || questionIntent.correctionEscalated) &&
    (qType === 'correction' || followUp.correction) &&
    (questionIntent.questionType === 'meta_about_previous_answer' ||
      questionIntent.isMetaQuestion ||
      questionIntent.subtopic === 'wording')
  ) {
    return 'meta_about_previous_answer';
  }
  if (qType === 'correction' && !topic) return 'meta_about_previous_answer';
  if (qType === 'correction' && topic && questionIntent.questionType !== 'meta_about_previous_answer') {
    return TOPIC_TO_ROUTE[topic] || (topic === 'sabbath' ? 'sabbath_history' : `${topic}_support`);
  }

  if (followUp.isFollowUp && followUp.inheritedTopic && followUp.questionType !== 'meta_about_previous_answer') {
    const inherited = followUp.inheritedTopic;
    if (inherited === 'sabbath') return 'historical_follow_up';
    if (inherited === 'grief') return 'grief_support';
    if (inherited === 'health') return 'health_support';
    if (inherited === 'prayer') return 'prayer';
    if (inherited === 'discernment') return 'job_discernment';
  }

  if (qType === 'evidence_request') return topic === 'sabbath' ? 'historical_evidence' : 'open_general';
  if (['historical_causation', 'historical_confirmation', 'historical_follow_up', 'history'].includes(qType)) {
    return topic === 'sabbath' ? 'sabbath_history' : 'open_general';
  }
  if (questionIntent.isSabbathHistory) return 'sabbath_history';
  if (questionIntent.isSabbathDefinition) return 'sabbath_definition';

  if (qType === 'prayer') return 'prayer';
  if (qType === 'grief' || qType === 'personal_help') return 'grief_support';
  if (qType === 'health') return 'health_support';
  if (qType === 'discernment') return 'job_discernment';
  if (qType === 'open_question') return 'open_general';

  if (topic && TOPIC_TO_ROUTE[topic]) return TOPIC_TO_ROUTE[topic];

  return null;
}

function getRouteOwner(routeKey) {
  if (!routeKey) return ROUTE_OWNERS.open_general;
  return ROUTE_OWNERS[routeKey] || ROUTE_OWNERS.open_general;
}

function getRoutePermissions(routeKey, { questionIntent = {}, followUp = {}, activeConversation = null } = {}) {
  const owner = getRouteOwner(routeKey);
  const isCorrection = followUp.correction || questionIntent.isCorrection || questionIntent.questionType === 'correction';
  const isMeta = questionIntent.questionType === 'meta_about_previous_answer' || questionIntent.isMetaQuestion;
  const isFrustrated = questionIntent.isFrustrated || questionIntent.emotionalTone === 'frustrated';
  const isHistorical = questionIntent.isHistoryRequest || questionIntent.isHistoricalQuestion;
  const strictAnswerMode = questionIntent.strictAnswerMode || activeConversation?.strictAnswerMode;

  let allowMemory = owner.allowedMemory;
  if (allowMemory === 'same_topic_only' || allowMemory === 'relevant_only' || allowMemory === 'prayer_topic_only' || allowMemory === 'study_memory_only') {
    allowMemory = true; // filtered downstream by topic relevance >= 80
  }
  if (isMeta || strictAnswerMode || isCorrection || isFrustrated || isHistorical) allowMemory = false;
  if (activeConversation?.lockUntilResolved) allowMemory = false;
  if (activeConversation?.allowMemorySurfacing === false) allowMemory = false;
  if (owner.allowedMemory === false) allowMemory = false;

  let allowStudy = owner.allowedStudyPrompt;
  if (allowStudy === 'after_answer_only' || allowStudy === 'only_if_user_asks') allowStudy = !isMeta && !strictAnswerMode && !isCorrection && !isFrustrated && !followUp.isFollowUp;
  if (allowStudy === true) allowStudy = !isMeta && !strictAnswerMode && !isCorrection && !isFrustrated;
  if (isMeta || strictAnswerMode || isHistorical || isCorrection || isFrustrated) allowStudy = false;
  if (activeConversation?.allowStudyPrompt === false) allowStudy = false;
  if (owner.allowedStudyPrompt === false) allowStudy = false;

  return {
    owner,
    allowMemory,
    allowStudy,
    allowHistory: !!owner.allowedHistory,
    requiresScripture: !!owner.requiresScripture,
    requiresCompanionTone: !!owner.requiresCompanionTone,
    activeLock: followUp.isFollowUp || isCorrection || isMeta || strictAnswerMode || activeConversation?.lockUntilResolved ||
      ['sabbath_history', 'historical_evidence', 'historical_follow_up', 'meta_about_previous_answer'].includes(routeKey),
  };
}

function shouldSuppressMemory(routeKey, questionIntent = {}, followUp = {}, activeConversation = null) {
  return !getRoutePermissions(routeKey, { questionIntent, followUp, activeConversation }).allowMemory;
}

function shouldSuppressStudyPrompts(routeKey, questionIntent = {}, followUp = {}, activeConversation = null) {
  return !getRoutePermissions(routeKey, { questionIntent, followUp, activeConversation }).allowStudy;
}

module.exports = {
  ROUTE_OWNERS,
  TOPIC_TO_ROUTE,
  resolveRouteKey,
  getRouteOwner,
  getRoutePermissions,
  shouldSuppressMemory,
  shouldSuppressStudyPrompts,
};
