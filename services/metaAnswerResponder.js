/**
 * Sprint 2.FINAL-B — Meta-Answer Responder
 * Answers questions about Buddy's wording/answer — not the underlying topic history.
 */

const { findPriorQuestion } = require('./questionIntentResolver');

const META_WORDING_PATTERNS = {
  roman_catholic: [
    /\broman catholic church\b/i,
    /\broman church\b/i,
    /\btechnical name\b/i,
    /\bwording\b.*\b(church|catholic|roman)\b/i,
    /\b(church|catholic|roman)\b.*\bwording\b/i,
    /\busing (the word|the wording|church)\b/i,
    /\bsaying (roman|church|catholic)\b/i,
    /\bcall(ed)? it\b/i,
  ],
  divine_name: [
    /\byahweh\b/i,
    /\byehovah\b/i,
    /\blord\b.*\bname\b/i,
    /\bname\b.*\b(yahweh|lord|god)\b/i,
    /\bdidn'?t you say\b/i,
    /\bwhy didn'?t you say\b/i,
  ],
  general_wording: [
    /\byour wording\b/i,
    /\bhow you worded\b/i,
    /\bworded it that way\b/i,
    /\bwhy you said\b/i,
    /\bwhy you used\b/i,
    /\bwhy are you (saying|using)\b/i,
  ],
};

function detectWordingFocus(message = '') {
  const text = String(message || '');
  for (const [focus, patterns] of Object.entries(META_WORDING_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) return focus;
  }
  return 'general_wording';
}

function extractTermUsed(message = '', recentSessions = []) {
  const text = String(message || '');
  const quoted = text.match(/['"]([^'"]+)['"]/);
  if (quoted) return quoted[1];

  const insteadMatch = text.match(/\binstead of (?:the )?(.+?)(?:\?|$)/i);
  if (insteadMatch) return insteadMatch[1].trim();

  for (const session of recentSessions || []) {
    const reply = String(session?.reply || session?.structured?.reply || '');
    if (/\broman church\b/i.test(reply)) return 'Roman church';
    if (/\bthe church\b/i.test(reply) && !/Roman Catholic/i.test(reply)) return 'the church';
  }
  return null;
}

function buildRomanCatholicWordingAnswer({ message = '', strictAnswerMode = false } = {}) {
  const opener = strictAnswerMode
    ? "You're right — I was not answering your exact question. "
    : "You're right to press that. ";

  return (
    opener +
    "I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. " +
    "I should say 'Roman Catholic Church' when that is what I mean. " +
    "The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly."
  );
}

function buildYahwehWordingAnswer({ message = '', strictAnswerMode = false } = {}) {
  const opener = strictAnswerMode
    ? "You're right — I was not answering your exact question. "
    : "That's a fair question about my wording. ";

  return (
    opener +
    "When I use 'the LORD' or 'Lord,' I am following common English Bible convention (replacing the divine name). " +
    "When precision matters — especially in study about the sacred name — I should say 'Yahweh' (or note that the Hebrew is YHWH) if that is what you are asking about. " +
    "I should match the name you are asking about rather than defaulting to generic English renderings."
  );
}

function buildGeneralWordingAnswer({ message = '', recentSessions = [], strictAnswerMode = false } = {}) {
  const prior = findPriorQuestion(recentSessions);
  const opener = strictAnswerMode
    ? "You're right — I was not answering your exact question. "
    : "You're right to ask about my wording. ";

  let body =
    "I should answer your question about how I worded my answer, not repeat the underlying topic. " +
    "When shorthand could confuse — like 'church' vs a specific institution, or 'Lord' vs a specific divine name — I should use the precise term you are asking about.";

  if (prior?.message) {
    body += ` Your earlier question was about "${prior.message.slice(0, 80)}${prior.message.length > 80 ? '…' : ''}" — I should have stayed on your wording question instead of repeating that answer.`;
  }

  return opener + body;
}

function buildCorrectionRecoveryAnswer({ message = '', recentSessions = [], activeConversation = null, strictAnswerMode = false } = {}) {
  const missed =
    activeConversation?.unansweredQuestion ||
    activeConversation?.lastDirectQuestion ||
    findPriorQuestion(recentSessions)?.message ||
    'your exact question';

  const wordingFocus = detectWordingFocus(message) || detectWordingFocus(missed);

  if (wordingFocus === 'roman_catholic') {
    return buildRomanCatholicWordingAnswer({ message, strictAnswerMode: true });
  }
  if (wordingFocus === 'divine_name') {
    return buildYahwehWordingAnswer({ message, strictAnswerMode: true });
  }

  const opener = strictAnswerMode || /\b(not answering|listen|not my question|wording)\b/i.test(message)
    ? "You're right — I was not answering your exact question. "
    : "I hear you — let me answer what you actually asked. ";

  return (
    opener +
    `The answer is: I should address "${String(missed).slice(0, 120)}" directly instead of repeating a previous template. ` +
    "Tell me if you want me to clarify a specific word or phrase I used."
  );
}

function buildMetaAnswerResponse({
  userId = 'anonymous',
  message = '',
  recentSessions = [],
  activeConversation = null,
  questionIntent = {},
  strictAnswerMode = false,
  correctionMode = false,
} = {}) {
  const isCorrection =
    correctionMode ||
    strictAnswerMode ||
    questionIntent.isCorrection ||
    questionIntent.questionType === 'correction';

  const wordingFocus = detectWordingFocus(message);

  let reply;
  if (isCorrection || /\bnot asking about (history|the shift)\b/i.test(message)) {
    if (wordingFocus === 'roman_catholic' || /\bwording\b/i.test(message)) {
      reply = buildRomanCatholicWordingAnswer({ message, strictAnswerMode: true });
    } else if (wordingFocus === 'divine_name') {
      reply = buildYahwehWordingAnswer({ message, strictAnswerMode: true });
    } else {
      reply = buildCorrectionRecoveryAnswer({
        message,
        recentSessions,
        activeConversation,
        strictAnswerMode: true,
      });
    }
  } else if (wordingFocus === 'roman_catholic') {
    reply = buildRomanCatholicWordingAnswer({ message, strictAnswerMode });
  } else if (wordingFocus === 'divine_name') {
    reply = buildYahwehWordingAnswer({ message, strictAnswerMode });
  } else {
    reply = buildGeneralWordingAnswer({ message, recentSessions, strictAnswerMode });
  }

  if (/\bnot asking about history\b/i.test(message) && !/^You'?re right/i.test(reply)) {
    reply = "You're right — you were asking about my wording, not the history again. " + reply;
  }

  return {
    reply,
    scripture: [],
    mode: 'companion',
    confidence: 'high',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    runtime: {
      intent: 'meta_about_previous_answer',
      masterRoute: 'meta_about_previous_answer',
      activeTopic: activeConversation?.topic || questionIntent.topic || null,
      subtopic: 'wording',
      questionIntent,
      metaWordingFocus: wordingFocus,
      strictAnswerMode: !!strictAnswerMode,
      correctionMode: !!correctionMode,
      companionPresentation: {
        skipStudyPrompts: true,
        skipRelationshipEnrichment: true,
        skipMemory: true,
      },
    },
  };
}

function classifyMetaAnswer(message = '') {
  const { isMetaAboutPreviousAnswer } = require('./questionIntentResolver');
  return { isMetaQuestion: isMetaAboutPreviousAnswer(message) };
}

module.exports = {
  buildMetaAnswerResponse,
  detectWordingFocus,
  buildRomanCatholicWordingAnswer,
  buildYahwehWordingAnswer,
  buildGeneralWordingAnswer,
  buildCorrectionRecoveryAnswer,
  classifyMetaAnswer,
};
