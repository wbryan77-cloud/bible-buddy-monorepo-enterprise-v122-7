/**
 * Phase 5A — Resolve unanswered or pending user questions.
 */

const { getDoctrineConversationState } = require('./doctrineConversationState');
const { detectConceptFromGraph } = require('./bibleConceptGraph');
const { buildBibleWideAnswer } = require('./bibleWideReasoningEngine');
const { getUserAnswerPreferences } = require('./userCorrectionMemory');

const PENDING_PROMPT_PATTERNS = [
  /\bwhy won'?t you answer\b/i,
  /\bwhy won't you answer\b/i,
  /\bwhy are you not answering\b/i,
  /\bwhy aren'?t you answering\b/i,
];

function isPendingQuestionChallenge(message = '') {
  return PENDING_PROMPT_PATTERNS.some((re) => re.test(String(message || '')));
}

function getPendingQuestion(userId) {
  const state = getDoctrineConversationState(userId);
  return state.lastPendingQuestion || state.lastUserQuestion || null;
}

function resolvePendingQuestion({ userId, message, runtimeContext = {}, safety = {} } = {}) {
  const pending = getPendingQuestion(userId);
  if (!pending || /^(stop|why)/i.test(pending) && message) {
    const current = String(message || '').trim();
    if (!isPendingQuestionChallenge(current)) return null;
    return {
      handled: true,
      reply:
        "You're right to call that out. I'm here and listening. What do you want me to answer directly from Scripture?",
      scripture: [],
      masterRoute: 'pending_question_resolver_empty',
      pendingQuestion: null,
    };
  }

  const concept = detectConceptFromGraph(pending);
  if (concept) {
    const wide = buildBibleWideAnswer({
      message: pending,
      concept,
      userId,
      userPreferences: getUserAnswerPreferences(userId),
      isContinuation: false,
    });
    if (wide) {
      return {
        handled: true,
        reply: `You're right — I should have answered more directly. ${wide.reply}`,
        scripture: wide.scripture || [],
        masterRoute: 'pending_question_resolver',
        concept: wide.concept,
        pendingQuestion: pending,
      };
    }
  }

  return {
    handled: true,
    reply: `You're right — I should have answered more directly. Your question was: "${String(pending).slice(0, 200)}." Let me stay with Scripture on that now.`,
    scripture: [],
    masterRoute: 'pending_question_resolver_ack',
    pendingQuestion: pending,
  };
}

module.exports = {
  isPendingQuestionChallenge,
  getPendingQuestion,
  resolvePendingQuestion,
};
