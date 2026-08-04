/**
 * Sprint 2.FINAL-C — Reasoning Snapshot
 * Reason about the user's exact question BEFORE routing to any responder.
 */

const {
  isMetaAboutPreviousAnswer,
  isCorrectionMode,
  shouldEscalateCorrection,
} = require('./questionIntentResolver');
const { classifyHealthCompanion } = require('./healthCompanionResponse');
const { classifyEmotionalSupport } = require('./griefCompanionResponse');
const { classifyPrayerIntent } = require('./prayerCompanionResponse');
const { classifyDiscernment } = require('./companionDiscernmentResponder');
const { classifyRelationshipRecallQuery } = require('./relationshipRecallEngine');
const { classifyContinueStudyIntent } = require('./continueStudyIntent');

const WORDING_PATTERNS = [
  /\broman catholic church\b/i,
  /\broman church\b/i,
  /\btechnical name\b/i,
  /\bwording\b/i,
  /\bwhy (are you|did you) (say|call|use)\b/i,
  /\bnot asking about (history|the shift)\b/i,
  /\basking about your wording\b/i,
];

const HISTORICAL_EVIDENCE_PATTERNS = [
  /\bhistorical evidence\b/i,
  /\bhistorical (background|context|parallel)\b/i,
  /\bhistory behind\b/i,
  /\bconstantine\b/i,
  /\blaodicea\b/i,
  /\bwho changed\b/i,
  /\bdid rome\b/i,
  /\bwhy (do|does|did) (people|christians|we)\b.*\b(sunday|sabbath)\b/i,
  /\bcelebrate sunday\b/i,
  /\bwhy should we keep sunday\b/i,
  /\bday of worship\b/i,
  /\btransatlantic\b/i,
  /\bslave (ships?|trade)\b/i,
  /\bassyrian captivity\b/i,
  /\bbabylonian captivity\b/i,
  /\bjerusalem under rome\b/i,
  /\bdispersion\b/i,
  /\bholocaust\b/i,
];

function inferQuestionType(message = '', questionIntent = {}, followUp = {}, activeConversation = null) {
  const text = String(message || '').trim();

  if (isMetaAboutPreviousAnswer(text)) {
    return 'meta_about_previous_answer';
  }
  if (isCorrectionMode(text) || followUp.correction || questionIntent.isCorrection) {
    return 'correction';
  }
  if (classifyPrayerIntent(text).isPrayerRequest) return 'prayer';
  if (classifyHealthCompanion(text).isHealthSupport) return 'health';
  if (classifyEmotionalSupport(text).isEmotionalSupport) return 'grief';
  if (classifyDiscernment(text).isDiscernment) return 'discernment';
  if (classifyContinueStudyIntent(text).isContinueStudy) return 'study_continuation';
  if (classifyRelationshipRecallQuery(text).isRecallQuery) return 'memory_recall';
  if (HISTORICAL_EVIDENCE_PATTERNS.some((p) => p.test(text))) return 'historical_evidence';
  if (/\b(did|so did|was|does)\b.*\b(rome|roman catholic|catholic church|change|sabbath|sunday)\b/i.test(text)) {
    return 'historical_confirmation';
  }
  if (followUp.isFollowUp && followUp.inheritedTopic) return followUp.questionType || 'follow_up';
  if (questionIntent.questionType && questionIntent.questionType !== 'general') {
    return questionIntent.questionType;
  }
  return 'direct_question';
}

function inferRequestedAnswerType(questionType, message = '') {
  const text = String(message || '');
  switch (questionType) {
    case 'meta_about_previous_answer':
      return 'wording_explanation';
    case 'correction':
      if (/\bnot asking about my knee\b/i.test(text)) return 'historical_answer';
      if (WORDING_PATTERNS.some((p) => p.test(text))) return 'wording_explanation';
      return 'direct_reanswer';
    case 'historical_evidence':
    case 'historical_causation':
    case 'historical_confirmation':
    case 'historical_follow_up':
      return 'historical_answer';
    case 'health':
    case 'grief':
    case 'prayer':
      return 'companion_support';
    case 'discernment':
      return 'discernment_conversation';
    case 'study_continuation':
      return 'study_continuation';
    case 'memory_recall':
      return 'memory_recall';
    case 'definition':
      return 'doctrine_definition';
    default:
      return 'direct_answer';
  }
}

function buildPlainEnglishRestatement({
  message = '',
  questionType = 'direct_question',
  activeTopic = null,
  requestedAnswerType = 'direct_answer',
} = {}) {
  const text = String(message || '').trim();

  if (questionType === 'meta_about_previous_answer') {
    const topicNote = activeTopic ? `, not ${activeTopic} history or a repeated template` : ', not a repeated topic template';
    if (/\broman catholic\b/i.test(text)) {
      return `The user is asking why I used informal church language instead of the precise name Roman Catholic Church${topicNote}.`;
    }
    if (/\byahweh\b/i.test(text)) {
      return 'The user is asking about my wording for the divine name, not doctrine or history.';
    }
    return `The user is asking about my wording or phrasing${topicNote}.`;
  }

  if (questionType === 'correction') {
    if (/\bnot asking about my knee\b/i.test(text)) {
      return 'The user is correcting a topic bleed — they want the Sabbath/history answer, not knee/health content.';
    }
    if (/\bwording\b/i.test(text) || /\bnot asking about history\b/i.test(text)) {
      return 'The user is correcting me because I answered the wrong thing — they want a wording explanation, not history.';
    }
    if (/\bnot answering\b/i.test(text) || /\blisten\b/i.test(text)) {
      return 'The user is frustrated because I did not answer their exact question.';
    }
    return 'The user is correcting my previous answer and wants the exact question answered.';
  }

  if (questionType === 'health') {
    return 'The user is sharing a personal health concern and wants empathy and a helpful next step, not a study lecture.';
  }
  if (questionType === 'grief') {
    return 'The user is grieving and wants companionship first, not a verse dump.';
  }
  if (questionType === 'discernment') {
    return 'The user is facing a life decision and wants thoughtful conversation, not a template answer.';
  }
  if (requestedAnswerType === 'historical_answer') {
    return 'The user wants a direct historical answer to their specific question, not a full repeated Sabbath definition block.';
  }

  return `The user asked: "${text.slice(0, 120)}${text.length > 120 ? '…' : ''}" and wants that exact question answered first.`;
}

function buildForbiddenDistractions({
  questionType = 'direct_question',
  requestedAnswerType = 'direct_answer',
  activeTopic = null,
  strictAnswerMode = false,
} = {}) {
  const base = [];

  if (questionType === 'meta_about_previous_answer' || requestedAnswerType === 'wording_explanation') {
    base.push(
      'Sabbath definition block',
      'Constantine chain repeat',
      'Laodicea template repeat',
      'knee pain memory',
      'grief memory',
      'study prompts',
      'Feast Days invitation',
      'generic fallback template'
    );
  }

  if (questionType === 'correction' || strictAnswerMode) {
    base.push('full history template', 'scripture chain dump', 'unrelated memory', 'study prompts');
  }

  if (questionType === 'health' || questionType === 'grief' || questionType === 'discernment') {
    base.push('Sabbath history', 'Feast Days', 'doctrine intercept', 'study prompts');
  }

  if (activeTopic === 'sabbath' && (questionType === 'meta_about_previous_answer' || strictAnswerMode)) {
    base.push('Sunday worship justification repeat', 'Genesis-to-Revelation path');
  }

  return [...new Set(base)];
}

function isWordingThread(activeConversation = null, recentSessions = []) {
  if (activeConversation?.subtopic === 'wording') return true;
  if (activeConversation?.questionType === 'meta_about_previous_answer') return true;
  for (const session of (recentSessions || []).slice(0, 4)) {
    const rt = session?.runtime || session?.structured?.runtime || {};
    if (rt.reasoningSnapshot?.questionType === 'meta_about_previous_answer') return true;
    if (rt.masterRoute === 'meta_about_previous_answer') return true;
    if (rt.intent === 'meta_about_previous_answer') return true;
  }
  return false;
}

function isWordingCorrection(message = '', requestedAnswerType = '') {
  if (requestedAnswerType === 'wording_explanation') return true;
  if (isMetaAboutPreviousAnswer(message)) return true;
  return WORDING_PATTERNS.some((p) => p.test(String(message || '')));
}

function deriveRecommendedRoute({
  questionType,
  requestedAnswerType,
  activeTopic,
  followUp = {},
  strictAnswerMode = false,
  message = '',
  activeConversation = null,
  recentSessions = [],
} = {}) {
  if (questionType === 'meta_about_previous_answer' || requestedAnswerType === 'wording_explanation') {
    return 'meta_about_previous_answer';
  }
  if (isWordingThread(activeConversation, recentSessions) && (questionType === 'correction' || isCorrectionMode(message))) {
    return 'meta_about_previous_answer';
  }
  if (strictAnswerMode && isWordingCorrection(message, requestedAnswerType)) {
    return 'meta_about_previous_answer';
  }
  if (questionType === 'correction' && activeTopic === 'sabbath' && !isWordingCorrection(message, requestedAnswerType)) {
    return 'sabbath_history';
  }
  if (questionType === 'memory_recall') return 'memory_recall';
  if (questionType === 'study_continuation') return 'continue_study';
  if (questionType === 'health') return 'health_support';
  if (questionType === 'grief') return 'grief_support';
  if (questionType === 'prayer') return 'prayer';
  if (questionType === 'discernment') return 'job_discernment';
  if (
    ['historical_evidence', 'historical_causation', 'historical_confirmation', 'historical_follow_up'].includes(
      questionType
    ) &&
    (activeTopic === 'sabbath' || !activeTopic)
  ) {
    return 'sabbath_history';
  }
  return null;
}

/**
 * Build reasoning snapshot — must run before route dispatch.
 */
function buildReasoningSnapshot({
  message = '',
  activeConversation = null,
  recentSessions = [],
  questionIntent = {},
  followUp = {},
  safety = {},
} = {}) {
  const exactUserQuestion = String(message || '').trim();
  const activeTopic = activeConversation?.topic || questionIntent.topic || null;
  const strictAnswerMode =
    !!questionIntent.strictAnswerMode ||
    !!activeConversation?.strictAnswerMode ||
    shouldEscalateCorrection(exactUserQuestion, recentSessions, activeConversation) ||
    (activeConversation?.correctionCount || 0) >= 2;

  const questionTypeRaw = inferQuestionType(exactUserQuestion, questionIntent, followUp, activeConversation);
  let questionType = questionTypeRaw;
  const wordingThread = isWordingThread(activeConversation, recentSessions);

  if (wordingThread && (questionType === 'correction' || isCorrectionMode(exactUserQuestion))) {
    questionType = 'meta_about_previous_answer';
  }

  let requestedAnswerType = inferRequestedAnswerType(questionType, exactUserQuestion);
  if (wordingThread && questionType === 'meta_about_previous_answer') {
    requestedAnswerType = 'wording_explanation';
  }
  const plainEnglishRestatement = buildPlainEnglishRestatement({
    message: exactUserQuestion,
    questionType,
    activeTopic,
    requestedAnswerType,
  });

  const isMeta = questionType === 'meta_about_previous_answer';
  const isHistorical = requestedAnswerType === 'historical_answer';
  const isPersonal = ['health', 'grief', 'prayer', 'discernment'].includes(questionType);
  const isCorrection = questionType === 'correction' || followUp.correction;

  const shouldUseScripture =
    !isMeta &&
    !strictAnswerMode &&
    (isHistorical || questionType === 'definition' || isPersonal || questionType === 'direct_question');
  const shouldUseHistory = isHistorical && !isMeta && !strictAnswerMode ? 'targeted' : isMeta ? 'minimal' : false;
  const shouldUseMemory =
    !isMeta && !strictAnswerMode && !isCorrection && questionType === 'memory_recall';
  const shouldAskClarifyingQuestion = isPersonal && !followUp.isFollowUp;
  const shouldOfferStudy =
    !isMeta &&
    !strictAnswerMode &&
    !isCorrection &&
    !isHistorical &&
    questionType === 'study_continuation';

  const forbiddenDistractions = buildForbiddenDistractions({
    questionType,
    requestedAnswerType,
    activeTopic,
    strictAnswerMode,
  });

  const recommendedRoute = deriveRecommendedRoute({
    questionType,
    requestedAnswerType,
    activeTopic,
    followUp,
    strictAnswerMode,
    message: exactUserQuestion,
    activeConversation,
    recentSessions,
  });

  return {
    exactUserQuestion,
    plainEnglishRestatement,
    questionType,
    activeTopic,
    requestedAnswerType,
    shouldUseScripture,
    shouldUseHistory,
    shouldUseMemory,
    shouldAskClarifyingQuestion,
    shouldOfferStudy,
    forbiddenDistractions,
    strictAnswerMode,
    recommendedRoute,
    isMetaQuestion: isMeta,
    isCorrection,
    reasoningFirst: true,
  };
}

module.exports = {
  buildReasoningSnapshot,
  inferQuestionType,
  inferRequestedAnswerType,
  buildPlainEnglishRestatement,
  buildForbiddenDistractions,
  deriveRecommendedRoute,
  isWordingCorrection,
  isWordingThread,
};
