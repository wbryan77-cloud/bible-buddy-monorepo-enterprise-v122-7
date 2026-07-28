/**
 * Phase 6X Obj1 — Semantic understanding snapshot.
 *
 * Aggregates EXISTING intent signals into one structured object for the
 * evidence pack / composers. Does not replace orchestrator lane ownership.
 * Latest user message always has highest priority (currentMessageWins).
 */

function isMultiPartUserQuestion(message = '') {
  const m = String(message || '').trim();
  if (!m) return false;
  if (/\btwo questions\b/i.test(m)) return true;
  if (/\bthree questions\b/i.test(m)) return true;
  if ((m.match(/\?/g) || []).length >= 2) return true;
  if (
    /\b(how many|what are|what does|where will|where do)\b/i.test(m) &&
    /\band\b/i.test(m) &&
    /\b(what|where|how|when|why|second coming)\b/i.test(m)
  ) {
    return true;
  }
  return false;
}

function splitQuestionParts(message = '') {
  const m = String(message || '').trim();
  if (!m) return [];
  const byQ = m
    .split(/\?\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (/\?$/.test(p) ? p : `${p}?`));
  if (byQ.length >= 2) return byQ.slice(0, 4);
  const andSplit = m.split(/\band\b/i).map((p) => p.trim()).filter(Boolean);
  if (andSplit.length >= 2 && isMultiPartUserQuestion(m)) {
    return andSplit.slice(0, 4).map((p) => (/\?$/.test(p) ? p : p));
  }
  return m ? [m] : [];
}

function inferRequestedAction(questionIntent = {}, currentIntent = '') {
  if (questionIntent.isPrayer || questionIntent.questionType === 'prayer') return 'pray';
  if (questionIntent.isCorrection || questionIntent.questionType === 'correction') return 'correct';
  if (questionIntent.isEvidenceRequest || questionIntent.questionType === 'evidence_request') {
    return 'provide_evidence';
  }
  if (questionIntent.questionType === 'comparison') return 'compare';
  if (questionIntent.questionType === 'definition') return 'define';
  if (String(currentIntent).includes('continue') || questionIntent.questionType === 'study_continuation') {
    return 'continue';
  }
  return 'answer';
}

function inferRequestedFormat(message = '', questionIntent = {}) {
  const m = String(message || '');
  if (/\byes or no\b|\byes\/no\b/i.test(m)) return 'yes_no';
  if (/\blist\b|\bbullet\b/i.test(m)) return 'list';
  if (/\bshort\b|\bbrief\b|\bin one (sentence|paragraph)\b/i.test(m)) return 'brief';
  if (/\bdeep(er)?\b|\bin depth\b|\bgo deeper\b/i.test(m)) return 'deep';
  if (questionIntent.questionType === 'comparison') return 'comparison';
  return 'prose';
}

function inferRequestedEvidence(message = '', questionIntent = {}) {
  const m = String(message || '').toLowerCase();
  const out = [];
  if (/\bscripture\b|\bbible\b|\bverse\b|\bkjv\b/i.test(m) || questionIntent.isEvidenceRequest) {
    out.push('scripture');
  }
  if (/\bhebrew\b|\bgreek\b|\boriginal (language|word)\b/i.test(m)) out.push('original_language');
  if (/\bhistor(y|ical)\b|\brome\b|\bconstantine\b/i.test(m) || questionIntent.isHistoricalQuestion) {
    out.push('history');
  }
  if (/\biog\b|\bisrael of god\b/i.test(m)) out.push('iog');
  if (/\bicoj\b|\bchurch of jesus\b/i.test(m)) out.push('icoj');
  if (!out.length) out.push('auto');
  return out;
}

/**
 * @returns {object} structured understanding for pack consumers
 */
function buildSemanticUnderstandingSnapshot({
  message = '',
  questionIntent = {},
  currentIntent = '',
  understanding = {},
} = {}) {
  const parts = splitQuestionParts(message);
  const mixed = isMultiPartUserQuestion(message) || parts.length >= 2;
  const primaryQuestion = parts[0] || String(message || '').trim();
  const secondaryQuestions = parts.slice(1);

  return {
    primaryIntent: {
      action: inferRequestedAction(questionIntent, currentIntent),
      questionType: questionIntent.questionType || understanding.questionType || 'general',
      topic: questionIntent.topic || null,
      question: primaryQuestion,
      currentIntent: currentIntent || null,
    },
    secondaryIntents: secondaryQuestions.map((q) => ({
      action: 'answer',
      question: q,
    })),
    mixedIntent: mixed,
    requestedAction: inferRequestedAction(questionIntent, currentIntent),
    requestedFormat: inferRequestedFormat(message, questionIntent),
    requestedEvidence: inferRequestedEvidence(message, questionIntent),
    requestedDepth: questionIntent.requestedDepth || 'standard',
    requestedComparison: questionIntent.questionType === 'comparison',
    outstandingQuestions: secondaryQuestions,
    conversationObjective: understanding.plainEnglishRestatement || primaryQuestion || null,
    emotionalContext: questionIntent.emotionalTone || 'neutral',
    latestMessagePriority: questionIntent.currentMessageWins !== false,
    source: 'aggregated_existing_signals',
  };
}

module.exports = {
  isMultiPartUserQuestion,
  splitQuestionParts,
  buildSemanticUnderstandingSnapshot,
};
