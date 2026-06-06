/**
 * RACL — correction ledger for reason-first retrieval.
 * Facts only; no user-facing prose.
 */

const CORRECTION_PATTERNS = [
  /\bthat is not what i asked\b/i,
  /\bnot what i meant\b/i,
  /\bi'?m not asking about that\b/i,
  /\bnot asking about the shift\b/i,
  /\bnot asking about history\b/i,
  /\bwhy are you not answering\b/i,
  /\bwhy won'?t you answer\b/i,
  /\bare you (not )?listening\b/i,
  /\banswer my question\b/i,
  /\bjust answer\b/i,
  /\byes or no\b/i,
  /\bno,?\s*i mean\b/i,
  /\bi said\b/i,
  /\bwhat i'?m asking is\b/i,
  /\bthat'?s not what i asked\b/i,
  /\byou('re| are) not answering\b/i,
  /\bi didn'?t ask to pray\b/i,
  /\byou'?re glitching\b/i,
  /\breconnect\b/i,
  /\bhelp me with (my )?homework\b/i,
  /\byou didn'?t answer\b/i,
];

const WORDING_PATTERNS = [
  /\bwording\b/i,
  /\bwhy do you call it\b/i,
  /\bwhy do you say\b/i,
  /\bwhy are you using the term\b/i,
  /\binstead of jesus\b/i,
  /\byahweh\b/i,
  /\broman church\b/i,
  /\broman catholic church\b/i,
];

const FORBIDDEN_REPEAT_TOPICS_DEFAULT = [
  'Sabbath history chain',
  'Constantine Sunday law',
  'Council of Laodicea',
  'Sunday worship shift explanation',
  'Genesis-to-Revelation study path',
];

function normalizeText(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenSet(text = '') {
  return new Set(
    normalizeText(text)
      .split(/\W+/)
      .filter((w) => w.length > 3)
  );
}

function overlapRatio(a = '', b = '') {
  const wa = tokenSet(a);
  const wb = tokenSet(b);
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  return inter / Math.max(wa.size, wb.size);
}

function openingSentence(text = '') {
  const t = String(text || '').trim();
  const m = t.match(/^(.+?[.!?])(?:\s|$)/);
  return (m ? m[1] : t.slice(0, 120)).trim();
}

function isCorrectionMessage(message = '') {
  const text = String(message || '');
  return CORRECTION_PATTERNS.some((p) => p.test(text));
}

function isMetaOrWordingTurn(message = '', understanding = {}) {
  if (understanding?.isMetaQuestion || understanding?.isCorrection) return true;
  if (understanding?.requestedAnswerType === 'wording_explanation') return true;
  const text = String(message || '');
  return WORDING_PATTERNS.some((p) => p.test(text));
}

function extractPriorAssistantQuote(lastReply = '') {
  const reply = String(lastReply || '').trim();
  if (!reply) return null;

  const romanMatch = reply.match(/[^.!?]*\bRoman church\b[^.!?]*[.!?]?/i);
  if (romanMatch) return romanMatch[0].trim();

  const sentences = reply.match(/[^.!?]+[.!?]+/g) || [reply];
  return sentences[0]?.trim() || reply.slice(0, 280);
}

function inferCorrectedIntent(message = '', recentSessions = [], understanding = {}) {
  if (understanding?.exactUserQuestion) return understanding.exactUserQuestion;
  const text = String(message || '').trim();
  if (text) return text;

  for (let i = recentSessions.length - 1; i >= 0; i -= 1) {
    const m = String(recentSessions[i]?.message || '').trim();
    if (m && WORDING_PATTERNS.some((p) => p.test(m))) return m;
  }
  return null;
}

function countPriorCorrections(recentSessions = []) {
  let count = 0;
  for (const s of recentSessions) {
    if (isCorrectionMessage(s.message)) count += 1;
  }
  return count;
}

function lastCorrectionPhrase(recentSessions = [], currentMessage = '') {
  if (isCorrectionMessage(currentMessage)) return String(currentMessage).trim();
  for (let i = recentSessions.length - 1; i >= 0; i -= 1) {
    const m = String(recentSessions[i]?.message || '');
    if (isCorrectionMessage(m)) return m.trim();
  }
  return null;
}

function buildForbiddenRepeatTopics({ message = '', understanding = {}, recentSessions = [] } = {}) {
  const topics = [];
  const text = `${message} ${recentSessions.map((s) => s.message).join(' ')}`.toLowerCase();

  if (
    understanding?.requestedAnswerType === 'wording_explanation' ||
    understanding?.isMetaQuestion ||
    understanding?.isCorrection ||
    /\bwording\b|\broman church\b|\bnot asking about\b/i.test(text)
  ) {
    topics.push(...FORBIDDEN_REPEAT_TOPICS_DEFAULT);
  }

  if (/\bwording\b|\broman catholic\b/i.test(text)) {
    topics.push('repeated shorthand rationale without new information');
  }

  return [...new Set(topics)];
}

/**
 * Build correction ledger from thread + current message.
 */
function buildCorrectionLedger({ message = '', recentSessions = [], understanding = {} } = {}) {
  const priorSession = recentSessions.length ? recentSessions[recentSessions.length - 1] : null;
  const priorUserQuestion = priorSession ? String(priorSession.message || '') : null;
  const priorAssistantAnswer = priorSession
    ? String(priorSession.reply || priorSession.structured?.reply || '')
    : '';
  const priorAssistantQuote = extractPriorAssistantQuote(priorAssistantAnswer);
  const priorAssistantAnswerSummary = priorAssistantAnswer.slice(0, 220);

  const userCorrection = isCorrectionMessage(message) ? String(message).trim() : null;
  const correctedIntent = inferCorrectedIntent(message, recentSessions, understanding);
  const forbiddenRepeatTopics = buildForbiddenRepeatTopics({ message, understanding, recentSessions });
  const correctionCount = countPriorCorrections(recentSessions) + (userCorrection ? 1 : 0);

  const active =
    userCorrection ||
    understanding?.isCorrection ||
    understanding?.requestedAnswerType === 'wording_explanation' ||
    understanding?.isMetaQuestion;

  if (!active) {
    return {
      active: false,
      userCorrection: null,
      priorUserQuestion,
      priorAssistantAnswerSummary: null,
      priorAssistantQuote: null,
      correctedIntent: null,
      forbiddenRepeatTopics: [],
      correctionCount: 0,
      priorAssistantReplies: [],
    };
  }

  const priorAssistantReplies = recentSessions
    .slice(-3)
    .map((s) => String(s.reply || s.structured?.reply || ''))
    .filter(Boolean);

  return {
    active: true,
    userCorrection,
    priorUserQuestion,
    priorAssistantAnswerSummary,
    priorAssistantQuote,
    correctedIntent,
    forbiddenRepeatTopics,
    correctionCount,
    priorAssistantReplies,
    requireDirectAnswerFirst: correctionCount >= 1,
    blockWouldYouLikeUntilAnswered: correctionCount >= 1,
  };
}

function replyViolatesLoopControl(reply = '', ledger = {}) {
  const issues = [];
  const text = String(reply || '');
  if (!ledger?.active && !(ledger?.correctionCount >= 1)) {
    return { passed: true, issues };
  }

  const priors = ledger.priorAssistantReplies || [];
  const openers = priors.map(openingSentence).filter(Boolean);
  const replyOpen = openingSentence(text);

  if (openers.some((o) => normalizeText(o) === normalizeText(replyOpen))) {
    issues.push('reused_opening_sentence');
  }

  for (const prior of priors) {
    const ratio = overlapRatio(text, prior);
    if (ratio >= 0.55) issues.push(`high_overlap_with_prior_reply:${Math.round(ratio * 100)}%`);
  }

  if (ledger.blockWouldYouLikeUntilAnswered && /\bwould you like\b/i.test(text)) {
    const directLen = text.split(/\bwould you like\b/i)[0].trim().length;
    if (directLen < 80) issues.push('premature_would_you_like_offer');
  }

  if (ledger.forbiddenRepeatTopics?.length) {
    const lower = text.toLowerCase();
    if (/constantine|laodicea|historical chain|sabbath definition block/i.test(lower)) {
      if (ledger.forbiddenRepeatTopics.some((t) => /sabbath|constantine|laodicea/i.test(t))) {
        issues.push('forbidden_topic_repeated');
      }
    }
  }

  return { passed: issues.length === 0, issues };
}

module.exports = {
  CORRECTION_PATTERNS,
  isCorrectionMessage,
  isMetaOrWordingTurn,
  buildCorrectionLedger,
  extractPriorAssistantQuote,
  lastCorrectionPhrase,
  overlapRatio,
  openingSentence,
  replyViolatesLoopControl,
};
