const { detectTopicFromMessage, detectTopicFromSessions } = require('./doctrineBoundaries');

const CORRECTION_PATTERNS = [
  /\bthat was not my question\b/i,
  /\bnot my question\b/i,
  /\bnot what i asked\b/i,
  /\byou repeated\b/i,
  /\bwrong answer\b/i,
  /\bthat'?s not what i\b/i,
  /\bthat is not what i\b/i,
  /\byou didn'?t answer\b/i,
  /\bthat wasn'?t my question\b/i,
];

const STUDY_CONTINUATION_PATTERNS = [
  /\bcontinue (our|the|my)?\s*(sabbath|study|feast|passover|reading)\b/i,
  /\bcontinue studying\b/i,
  /\bpick up where we left off\b/i,
  /\blet'?s continue\b/i,
  /\bkeep studying\b/i,
];

const DEFINITION_PATTERNS = [
  /^what is (the )?\b/i,
  /\bwhat (is|does|are)\b/i,
  /\bdefine\b/i,
  /\bexplain (the )?\b/i,
];

const HISTORICAL_CAUSATION_PATTERNS = [
  /\bwho changed\b/i,
  /\bwhy (do|does|did)\b.*\b(sunday|sabbath|people|christians)\b/i,
  /\bwhy sunday\b/i,
  /\bwhen did\b.*\bchange\b/i,
  /\bhow did\b.*\b(change|become|happen)\b/i,
];

const HISTORICAL_CONFIRMATION_PATTERNS = [
  /\bdid (rome|the roman|constantine|the catholic|the church)\b/i,
  /\bso did\b/i,
  /\bwas it (rome|the church|catholic)\b/i,
  /\bperform the change\b/i,
];

const EVIDENCE_PATTERNS = [
  /\bhistorical evidence\b/i,
  /\bgive me (the )?(historical|evidence|references)\b/i,
  /\bwhat is the evidence\b/i,
  /\bshow me (the )?history\b/i,
];

const COMPARISON_PATTERNS = [
  /\bdifference between\b/i,
  /\bcompare\b/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\bbiblical sabbath and sunday\b/i,
];

const PRAYER_PATTERNS = [
  /\bpray for me\b/i,
  /\bneed (help|prayer) from (the )?(lord|god)\b/i,
  /\bhelp from the lord\b/i,
  /\bplease pray\b/i,
  /\bi need prayer\b/i,
];

const HEALTH_PATTERNS = [
  /\bmy knees hurt\b/i,
  /\bknee(s)? (hurt|pain|ache)\b/i,
  /\b(hurt|pain|ache|sore)\b/i,
  /\bhealth concern\b/i,
  /\bnot feeling well\b/i,
  /\bcan'?t sleep\b/i,
];

const DISCERNMENT_PATTERNS = [
  /\bjob opportunity\b/i,
  /\bnew job\b/i,
  /\bshould i (take|accept|apply)\b/i,
  /\bdon'?t know if i should\b/i,
  /\bpush or wait\b/i,
];

const GRIEF_PATTERNS = [
  /\blost a friend\b/i,
  /\blost my (friend|loved one|parent|child|spouse)\b/i,
  /\bsomeone (died|passed away)\b/i,
  /\bi'?m grieving\b/i,
  /\bheartbroken\b/i,
];

const FRUSTRATION_PATTERNS = [
  /\bnot my question\b/i,
  /\bwrong answer\b/i,
  /\bstop repeating\b/i,
  /\byou didn'?t answer\b/i,
  /\bthat wasn'?t\b/i,
  /\bagain\b/i,
];

const META_QUESTION_PATTERNS = [
  /\bwhy are you saying\b/i,
  /\bwhy are you using the word\b/i,
  /\bwhy are you using (the )?wording\b/i,
  /\bwhy did you call it\b/i,
  /\bwhy do you call it\b/i,
  /\bwhy do you call\b/i,
  /\bwhy didn'?t you say\b/i,
  /\byour wording\b/i,
  /\bthe technical name\b/i,
  /\bi'?m asking about your wording\b/i,
  /\bi am asking about your wording\b/i,
  /\bi'?m not asking about history\b/i,
  /\bi am not asking about history\b/i,
  /\bi'?m not asking about the shift\b/i,
  /\bi am not asking about the shift\b/i,
  /\bi'?m asking why you worded it that way\b/i,
  /\bi am asking why you worded it that way\b/i,
  /\bwhy you worded it that way\b/i,
  /\basking about (your )?wording\b/i,
  /\bwhy are you using (the word|church|roman)\b/i,
  /\bwhy are you saying (roman|church|catholic)\b/i,
  /\bnot asking about (history|the shift|sabbath history)\b/i,
  /\bi'?m asking about wording\b/i,
];

const CORRECTION_ESCALATION_PATTERNS = [
  /\byou'?re not answering\b/i,
  /\byou are not answering\b/i,
  /\blisten\b/i,
  /\bthat'?s not my question\b/i,
  /\bthat is not my question\b/i,
  /\bi'?m asking about wording\b/i,
  /\bi am asking about wording\b/i,
  /\bwhy are you not answering my question\b/i,
  /\bare you not listening\b/i,
  /\byou are not listening\b/i,
];

function isMetaAboutPreviousAnswer(message = '') {
  return META_QUESTION_PATTERNS.some((p) => p.test(String(message || '')));
}

function countRecentCorrections(recentSessions = [], activeConversation = null) {
  let count = activeConversation?.correctionCount || 0;
  for (const session of recentSessions || []) {
    const msg = String(session?.message || '');
    if (CORRECTION_ESCALATION_PATTERNS.some((p) => p.test(msg))) count += 1;
    else if (CORRECTION_PATTERNS.some((p) => p.test(msg))) count += 1;
  }
  return count;
}

function shouldEscalateCorrection(message = '', recentSessions = [], activeConversation = null) {
  const isEscalationPhrase = CORRECTION_ESCALATION_PATTERNS.some((p) => p.test(String(message || '')));
  const priorCorrections = countRecentCorrections(recentSessions, activeConversation);
  return isEscalationPhrase && priorCorrections >= 1;
}

function detectEmotionalTone(message = '', recentSessions = []) {
  const text = String(message || '');
  if (GRIEF_PATTERNS.some((p) => p.test(text))) return 'grief';
  if (PRAYER_PATTERNS.some((p) => p.test(text))) return 'seeking_help';
  if (FRUSTRATION_PATTERNS.some((p) => p.test(text))) return 'frustrated';
  if (CORRECTION_PATTERNS.some((p) => p.test(text))) return 'correcting';
  if (/\b(thank|grateful|blessed)\b/i.test(text)) return 'grateful';
  if (/\b(confused|unsure|don'?t understand)\b/i.test(text)) return 'uncertain';
  return 'neutral';
}

function detectQuestionType(message = '', topic = null, recentSessions = []) {
  const text = String(message || '');

  if (isMetaAboutPreviousAnswer(text)) return 'meta_about_previous_answer';
  if (CORRECTION_PATTERNS.some((p) => p.test(text))) return 'correction';
  if (STUDY_CONTINUATION_PATTERNS.some((p) => p.test(text))) return 'study_continuation';
  if (PRAYER_PATTERNS.some((p) => p.test(text))) return 'prayer';
  if (GRIEF_PATTERNS.some((p) => p.test(text))) return 'grief';
  if (HEALTH_PATTERNS.some((p) => p.test(text))) return 'health';
  if (DISCERNMENT_PATTERNS.some((p) => p.test(text))) return 'discernment';

  if (EVIDENCE_PATTERNS.some((p) => p.test(text))) {
    return 'evidence_request';
  }

  if (HISTORICAL_CONFIRMATION_PATTERNS.some((p) => p.test(text))) {
    return 'historical_confirmation';
  }

  if (HISTORICAL_CAUSATION_PATTERNS.some((p) => p.test(text))) {
    return 'historical_causation';
  }

  if (COMPARISON_PATTERNS.some((p) => p.test(text))) {
    return 'comparison';
  }

  if (DEFINITION_PATTERNS.some((p) => p.test(text))) {
    return 'definition';
  }

  if (/\b(feel lost|don'?t know what god wants|help me think|what should i do with my life)\b/i.test(text)) {
    return 'open_question';
  }

  // Follow-up evidence/history without explicit keywords
  const priorTopic = detectTopicFromSessions(recentSessions);
  if (priorTopic && !topic) {
    if (EVIDENCE_PATTERNS.some((p) => p.test(text))) return 'evidence_request';
    if (/\b(history|historically|why|who)\b/i.test(text)) return 'historical_causation';
  }

  return 'general';
}

function detectRequestedDepth(message = '', questionType = 'general') {
  const text = String(message || '');
  if (['historical_causation', 'historical_confirmation', 'evidence_request', 'comparison'].includes(questionType)) {
    return 'deep';
  }
  if (/\b(line upon line|genesis to revelation|deep dive|in detail|full study)\b/i.test(text)) {
    return 'deep';
  }
  if (/\b(briefly|quick|short answer|simply)\b/i.test(text)) {
    return 'brief';
  }
  return 'standard';
}

function findPriorQuestion(recentSessions = []) {
  for (const session of recentSessions || []) {
    const msg = String(session?.message || '').trim();
    if (!msg) continue;
    if (CORRECTION_PATTERNS.some((p) => p.test(msg))) continue;
    const type = session?.runtime?.questionIntent?.questionType;
    if (type && type !== 'correction' && type !== 'general') {
      return { message: msg, questionType: type, topic: session.runtime.questionIntent.topic };
    }
    if (/\b(who changed|historical|rome|roman catholic|why sunday|evidence)\b/i.test(msg)) {
      return { message: msg, questionType: 'historical_causation', topic: 'sabbath' };
    }
    if (/\bwhat is the sabbath\b/i.test(msg)) {
      return { message: msg, questionType: 'definition', topic: 'sabbath' };
    }
  }
  return null;
}

function resolveQuestionIntent({ message = '', recentSessions = [], activeConversation = null } = {}) {
  const text = String(message || '').trim();
  let topic = detectTopicFromMessage(text);
  const previousTopic = detectTopicFromSessions(recentSessions);
  const activeTopic = activeConversation?.topic || null;

  if (!topic && previousTopic) {
    topic = previousTopic;
  }

  if (
    !topic &&
    /\b(sunday|saturday)\b/i.test(text) &&
    /\b(why|who|changed|observance|worship|rome|roman|catholic|evidence|history)\b/i.test(text)
  ) {
    topic = 'sabbath';
  }

  let questionType = detectQuestionType(text, topic, recentSessions);
  if (questionType === 'general' && isCorrectionMode(text)) {
    questionType = 'correction';
  }
  const emotionalTone = detectEmotionalTone(text, recentSessions);
  const requestedDepth = detectRequestedDepth(text, questionType);

  const isMetaQuestion = questionType === 'meta_about_previous_answer';
  const correctionEscalated = shouldEscalateCorrection(text, recentSessions, activeConversation);
  const strictAnswerMode = correctionEscalated || (activeConversation?.strictAnswerMode && isMetaQuestion);

  if (isMetaQuestion) {
    topic = activeTopic || topic || previousTopic;
  }

  let reanswerPrior = null;
  if (questionType === 'correction' && !isMetaQuestion) {
    reanswerPrior = findPriorQuestion(recentSessions);
    if (reanswerPrior) {
      topic = reanswerPrior.topic || topic;
      questionType =
        reanswerPrior.questionType === 'definition' && topic === 'sabbath'
          ? 'historical_causation'
          : reanswerPrior.questionType;
    }
  }

  const isHistoricalQuestion = [
    'historical_causation',
    'historical_confirmation',
    'evidence_request',
    'historical_follow_up',
    'history',
  ].includes(questionType);

  const isCorrection = questionType === 'correction' || isCorrectionMode(text);
  const isFrustrated = emotionalTone === 'frustrated' || emotionalTone === 'correcting';

  const shouldSkipDoctrineIntercept =
    isMetaQuestion ||
    isCorrection ||
    questionType === 'prayer' ||
    questionType === 'grief' ||
    questionType === 'health' ||
    questionType === 'personal_help' ||
    questionType === 'study_continuation' ||
    questionType === 'discernment' ||
    questionType === 'open_question' ||
    isHistoricalQuestion ||
    (topic === 'sabbath' && isHistoricalQuestion);

  const shouldOfferStudyContinuation =
    questionType === 'study_continuation' ||
    (questionType === 'definition' && emotionalTone === 'neutral' && !isHistoricalQuestion);

  const shouldSuppressStudyPrompts =
    isMetaQuestion ||
    strictAnswerMode ||
    isCorrection ||
    isFrustrated ||
    isHistoricalQuestion ||
    questionType === 'evidence_request' ||
    ['grief', 'health', 'discernment', 'open_question'].includes(questionType);

  const subtopic = isMetaQuestion
    ? 'wording'
    : topic === 'sabbath' && (isHistoricalQuestion || questionType === 'historical_follow_up')
      ? 'sabbath_history'
      : null;

  const memoryAllowed = !isMetaQuestion && !strictAnswerMode && !isCorrection && !isFrustrated;
  const studyPromptAllowed = !shouldSuppressStudyPrompts;
  const historyAllowed = isMetaQuestion ? 'only_if_needed' : isHistoricalQuestion;
  const doctrineTemplateAllowed = !isMetaQuestion && !strictAnswerMode;

  return {
    topic,
    subtopic,
    previousTopic,
    questionType,
    emotionalTone,
    requestedDepth,
    reanswerPrior,
    currentMessageWins: true,
    shouldSkipDoctrineIntercept,
    shouldOfferStudyContinuation,
    shouldSuppressStudyPrompts,
    isHistoricalQuestion: isMetaQuestion ? false : isHistoricalQuestion,
    isFollowUp: false,
    isCorrection,
    isFrustrated,
    isMetaQuestion,
    strictAnswerMode,
    correctionEscalated,
    memoryAllowed,
    studyPromptAllowed,
    historyAllowed,
    doctrineTemplateAllowed,
    isHistoryRequest: isMetaQuestion ? false : isHistoricalQuestion,
    isEvidenceRequest: questionType === 'evidence_request',
    isPersonalSupport: ['grief', 'health', 'personal_help'].includes(questionType),
    isPrayer: questionType === 'prayer',
    isStudyRequest: questionType === 'study_continuation',
    isNewTopic: false,
    isSabbathHistory:
      !isMetaQuestion &&
      topic === 'sabbath' &&
      (isHistoricalQuestion || questionType === 'comparison' || questionType === 'correction'),
    isSabbathDefinition:
      topic === 'sabbath' &&
      questionType === 'definition' &&
      !isHistoricalQuestion &&
      !isMetaQuestion,
  };
}

// Follow-up phrases that continue the active thread rather than starting a new topic.
const FOLLOW_UP_PATTERNS = [
  /^\s*(yes|yeah|no)\b.*\bbut\b/i,
  /^\s*but\b/i,
  /^\s*(and|so|then)\b/i,
  /^\s*why\b/i,
  /^\s*how\b/i,
  /^\s*who\b/i,
  /^\s*when\b/i,
  /^\s*where\b/i,
  /^\s*what about\b/i,
  /\bwhat evidence\b/i,
  /\bwhat about (the )?(pope|rome|constantine|laodicea|council|history)\b/i,
  /\b(was|were|did|does|is|do)\b.*\b(pope|rome|roman|catholic|church|constantine|laodicea|they|it|that|involved)\b/i,
  /\bexplain (that|this|it|more)\b/i,
  /\btell me more\b/i,
  /\bmore (detail|about that|on that|evidence)\b/i,
  /\bgo on\b/i,
  /\bcontinue\b/i,
  /\bwhat do you mean\b/i,
  /\bhelp (me|her|him|them)\b/i,
  /\bshould i\b/i,
  /\bwhat (should|can|do) i\b/i,
];

const CORRECTION_MODE_PATTERNS = [
  /\banswer my question\b/i,
  /\bthat'?s not my question\b/i,
  /\bthat is not my question\b/i,
  /\bthat was not my question\b/i,
  /\bthat wasn'?t my question\b/i,
  /\blisten\b/i,
  /\byou'?re not answering\b/i,
  /\byou are not answering\b/i,
  /\bthat isn'?t what i asked\b/i,
  /\bthat is not what i asked\b/i,
  /\bnot what i asked\b/i,
  /\byou didn'?t answer\b/i,
  /\bwhy are you not answering my question\b/i,
  /\bwhy won'?t you answer my question\b/i,
  /\bare you not listening\b/i,
  /\byou are not listening\b/i,
  /\byou are not listening\b/i,
  /\byou'?re not listening\b/i,
  /\bi'?m not asking about my knee\b/i,
];

function isCorrectionMode(message = '') {
  return CORRECTION_MODE_PATTERNS.some((p) => p.test(String(message || '')));
}

/**
 * Resolve whether the current message is a follow-up to the active conversation.
 * When it is, the active topic is inherited rather than starting a new topic.
 */
function resolveFollowUpQuestion({ message = '', activeConversation = null } = {}) {
  const text = String(message || '').trim();
  const correction = isCorrectionMode(text);
  const metaQuestion = isMetaAboutPreviousAnswer(text);

  // Meta-questions inherit active topic for context but must NOT route as history.
  if (metaQuestion && activeConversation?.topic) {
    return {
      isFollowUp: true,
      correction: false,
      questionType: 'meta_about_previous_answer',
      inheritedTopic: activeConversation.topic,
      reason: 'meta_wording',
    };
  }

  // A new explicit topic in the message wins over inheritance.
  const explicitTopic = detectTopicFromMessage(text);

  const matchesFollowUp = FOLLOW_UP_PATTERNS.some((p) => p.test(text));
  const isShort = text.split(/\s+/).filter(Boolean).length <= 8;
  const hasActiveTopic = !!(activeConversation && activeConversation.isActive && activeConversation.topic);

  // Correction always inherits the active topic.
  if (correction && hasActiveTopic) {
    return {
      isFollowUp: true,
      correction: true,
      questionType: 'correction',
      inheritedTopic: activeConversation.topic,
      reason: 'correction',
    };
  }

  if (hasActiveTopic && !explicitTopic && (matchesFollowUp || isShort)) {
    const inherited = activeConversation.topic;
    let followType = 'follow_up';
    if (inherited === 'sabbath') followType = 'historical_follow_up';
    else if (inherited === 'grief') followType = 'grief';
    else if (inherited === 'health') followType = 'health';
    else if (inherited === 'discernment') followType = 'discernment';

    return {
      isFollowUp: true,
      correction: false,
      questionType: followType,
      inheritedTopic: inherited,
      reason: matchesFollowUp ? 'follow_up_phrase' : 'short_continuation',
    };
  }

  return {
    isFollowUp: false,
    correction,
    questionType: correction ? 'correction' : null,
    inheritedTopic: null,
    reason: null,
  };
}

module.exports = {
  resolveQuestionIntent,
  resolveFollowUpQuestion,
  isCorrectionMode,
  isMetaAboutPreviousAnswer,
  shouldEscalateCorrection,
  countRecentCorrections,
  detectQuestionType,
  detectEmotionalTone,
  detectRequestedDepth,
  findPriorQuestion,
  FOLLOW_UP_PATTERNS,
  CORRECTION_MODE_PATTERNS,
  CORRECTION_PATTERNS,
  META_QUESTION_PATTERNS,
  CORRECTION_ESCALATION_PATTERNS,
  STUDY_CONTINUATION_PATTERNS,
};
