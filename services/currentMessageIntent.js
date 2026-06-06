/**
 * Current-message intent layer — classifies the latest turn only.
 * Prior session topic must not override a new question.
 */

const CORRECTION_RE =
  /\b(not (my|what i) (question|asking|meant)|didn'?t ask|not what i asked|won'?t you answer|you didn'?t answer|that was not my question|that wasn'?t my question|you repeated|wrong answer|you('re| are) not listening|not answering)\b/i;

const HISTORY_RE =
  /\b(who changed|constantine|laodicea|saturday to sunday|historical evidence|how did (the )?sabbath change|why (do|does|did).*\b(sunday|sabbath)\b.*\b(change|worship)\b|when did.*change|roman catholic.*change)\b/i;

function isYesNoQuestion(message = '') {
  const t = String(message || '');
  return (
    /\b(yes or no|so yes or no)\b/i.test(t) ||
    (/^(can|should|may|is|are|do|does|did)\b/i.test(t.trim()) && /\?/.test(t)) ||
    /\bcan i eat\b/i.test(t) ||
    /\bshould i eat\b/i.test(t)
  );
}

const WORD_STUDY_RE =
  /\bwhat does\b.*\bmean\b|\bmeaning of\b|\bdefine\b.*\b(word|term)\b|\blogos\b|\bhebrew\b.*\bmean\b|\bholy\b.*\bmean\b/i;

const HOW_TO_RE =
  /\bhow (do|can|should) (we|i)\b.*\b(keep|honor|observe|sanctify|practice|apply|live out)\b/i;

const DEFINITION_RE =
  /^what is\b|\bwhat are\b|\bwhere does (it|the bible) say\b|\bwhat happens when\b/i;

const EMOTIONAL_RE =
  /\b(rough day|grieving|grief|heartbroken|let go of someone|someone i love|feel (afraid|angry|overwhelmed|empty|distant)|lost a|hurts|faith is failing|pray but it feels)\b/i;

const PRACTICAL_RE =
  /\b(alzheimer|dementia|caregiv|homework|job offer|money|bills|worried about|overwhelm|knee|health concern|practical help)\b/i;

const ANGER_RE = /\b(angry|mad at|furious|rage)\b/i;

const ADMIN_RE = /\b(buddy_debug|admin|trace route|runtime mode)\b/i;

const INTENTS = {
  DIRECT_YES_NO: 'direct_yes_no',
  DEFINITION: 'definition',
  MEANING_WORD_STUDY: 'meaning_word_study',
  HOW_TO_PRACTICE: 'how_to_practice',
  DOCTRINE_EXPLANATION: 'doctrine_explanation',
  HISTORY_QUESTION: 'history_question',
  CORRECTION_REPAIR: 'correction_repair',
  EMOTIONAL_COMPANION: 'emotional_companion',
  PRACTICAL_LIFE_HELP: 'practical_life_help',
  ADMIN_DEBUG: 'admin_debug',
  UNCLEAR: 'unclear',
};

function classifyCurrentMessageIntent(message = '', context = {}) {
  const msg = String(message || '').trim();
  const lower = msg.toLowerCase();

  if (!msg) return { intent: INTENTS.UNCLEAR, reason: 'empty_message' };
  if (ADMIN_RE.test(msg)) return { intent: INTENTS.ADMIN_DEBUG, reason: 'admin_debug' };

  if (CORRECTION_RE.test(msg) || context.understanding?.isCorrection) {
    return { intent: INTENTS.CORRECTION_REPAIR, reason: 'user_correction' };
  }

  if (HISTORY_RE.test(msg)) {
    return { intent: INTENTS.HISTORY_QUESTION, reason: 'explicit_history_ask' };
  }

  if (isYesNoQuestion(msg)) {
    return { intent: INTENTS.DIRECT_YES_NO, reason: 'yes_no_question' };
  }

  if (WORD_STUDY_RE.test(msg) || /\blogos\b/i.test(msg)) {
    return { intent: INTENTS.MEANING_WORD_STUDY, reason: 'word_or_phrase_meaning' };
  }

  if (HOW_TO_RE.test(msg)) {
    return { intent: INTENTS.HOW_TO_PRACTICE, reason: 'practical_how_to' };
  }

  if (/\bhow many\b/i.test(msg)) {
    return { intent: INTENTS.DOCTRINE_EXPLANATION, reason: 'how_many_teaching' };
  }

  if (DEFINITION_RE.test(msg)) {
    return { intent: INTENTS.DEFINITION, reason: 'definition_question' };
  }

  if (/\bexplain\b/i.test(msg)) {
    return { intent: INTENTS.DOCTRINE_EXPLANATION, reason: 'explain_doctrine' };
  }

  if (ANGER_RE.test(msg)) {
    return { intent: INTENTS.EMOTIONAL_COMPANION, reason: 'anger_processing' };
  }

  if (EMOTIONAL_RE.test(msg)) {
    return { intent: INTENTS.EMOTIONAL_COMPANION, reason: 'emotional_share' };
  }

  if (PRACTICAL_RE.test(msg)) {
    return { intent: INTENTS.PRACTICAL_LIFE_HELP, reason: 'practical_life' };
  }

  if (/\?/.test(msg)) {
    return { intent: INTENTS.DOCTRINE_EXPLANATION, reason: 'unclassified_question' };
  }

  return { intent: INTENTS.UNCLEAR, reason: 'default_unclear' };
}

function buildIntentEvidenceConstraints(intent) {
  const historyAllowed = intent === INTENTS.HISTORY_QUESTION;
  const topicFromMessageOnly = [
    INTENTS.DIRECT_YES_NO,
    INTENTS.MEANING_WORD_STUDY,
    INTENTS.HOW_TO_PRACTICE,
    INTENTS.DEFINITION,
    INTENTS.DOCTRINE_EXPLANATION,
    INTENTS.CORRECTION_REPAIR,
  ].includes(intent);

  return {
    historyAllowed,
    topicFromMessageOnly,
    suppressStudyState: intent !== INTENTS.UNCLEAR,
    suppressPriorTopic: intent !== INTENTS.HISTORY_QUESTION && intent !== INTENTS.UNCLEAR,
    prioritizeCurrentMessage: true,
    correctionRepair: intent === INTENTS.CORRECTION_REPAIR,
  };
}

function buildIntentComposerGuidance(intentResult, message = '', evidencePack = {}) {
  const intent = intentResult.intent;
  const lines = [`Current message intent: ${intent} (${intentResult.reason}).`];
  lines.push('The latest user message dominates — do not continue a prior topic unless this turn asks for it.');

  if (intent === INTENTS.CORRECTION_REPAIR) {
    const unresolved =
      evidencePack.threadLocal?.currentUnresolvedQuestion ||
      evidencePack.correctionLedger?.priorUserQuestion ||
      message;
    lines.push(`Re-answer this unresolved question directly: ${String(unresolved).slice(0, 200)}`);
    lines.push('Do not repeat the prior wrong answer or study script.');
  }
  if (intent === INTENTS.DIRECT_YES_NO) {
    lines.push('Lead with yes or no in the first sentence, then brief Scripture support.');
  }
  if (intent === INTENTS.MEANING_WORD_STUDY) {
    lines.push('Define the word or phrase from the current message — not an unrelated prior doctrine topic.');
  }
  if (intent === INTENTS.HOW_TO_PRACTICE) {
    lines.push('Give practical how-to from Scripture. Do not lecture on Sunday-change history unless asked.');
  }
  if (intent === INTENTS.HISTORY_QUESTION) {
    lines.push('History may support the answer because the user asked a history question.');
  } else {
    lines.push('Do not lead with Constantine, Laodicea, or Saturday-to-Sunday history.');
  }
  if (intent === INTENTS.EMOTIONAL_COMPANION) {
    lines.push('Listen and reflect first; Scripture lightly if helpful.');
  }

  return lines.join(' ');
}

module.exports = {
  INTENTS,
  classifyCurrentMessageIntent,
  buildIntentEvidenceConstraints,
  buildIntentComposerGuidance,
  isYesNoQuestion,
};
