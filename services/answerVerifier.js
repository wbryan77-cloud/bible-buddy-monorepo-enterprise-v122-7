/**
 * Sprint 2.FINAL-B — Answer Verification Gate
 * Ensures the response answers the user's exact question before send.
 */

const { buildMetaAnswerResponse, detectWordingFocus } = require('./metaAnswerResponder');
const { findPriorQuestion } = require('./questionIntentResolver');

const SABBATH_HISTORY_TEMPLATE_MARKERS = [
  /\bconstantine\b/i,
  /\bad 321\b/i,
  /\blaodicea\b/i,
  /\bcouncil of laodicea\b/i,
  /\bcodex justinianus\b/i,
  /\bsunday observance became established\b/i,
  /\bshift toward sunday\b/i,
  /\bshift from sabbath to sunday\b/i,
  /\bperform the change\b/i,
  /\bgenesis-to-revelation path\b/i,
];

const STUDY_PROMPT_MARKERS = [
  /\bwould you like to continue studying\b/i,
  /\bcontinue your study journey\b/i,
  /\bcontinue into feast\b/i,
  /\bline upon line\b/i,
];

const MEMORY_BLEED_MARKERS = [
  /\blast week we\b/i,
  /\bwhen we spoke about\b/i,
  /\byou mentioned last time\b/i,
  /\bremember when you\b/i,
];

function countHistoryTemplateMarkers(reply = '') {
  const text = String(reply || '');
  return SABBATH_HISTORY_TEMPLATE_MARKERS.filter((p) => p.test(text)).length;
}

function hasWordingAnswerSignals(reply = '', message = '') {
  const text = String(reply || '');
  const focus = detectWordingFocus(message);
  if (focus === 'roman_catholic') {
    return /\broman catholic church\b/i.test(text) && /\b(precise|shorthand|wording|institutional|imperial)\b/i.test(text);
  }
  if (focus === 'divine_name') {
    return /\b(yahweh|yhwh|sacred name|divine name|lord)\b/i.test(text);
  }
  return /\b(wording|worded|shorthand|precise|exact question|my answer)\b/i.test(text);
}

function verifyAnswer({ message = '', reply = '', questionIntent = {}, followUp = {}, activeConversation = null } = {}) {
  const qType = questionIntent.questionType || followUp.questionType;
  const text = String(reply || '');
  const issues = [];

  if (!text.trim()) {
    return { passes: false, issues: ['empty_reply'], severity: 'high' };
  }

  const historyMarkerCount = countHistoryTemplateMarkers(text);

  if (qType === 'meta_about_previous_answer') {
    if (historyMarkerCount >= 2) {
      issues.push('repeated_sabbath_history_template');
    }
    if (!hasWordingAnswerSignals(text, message)) {
      issues.push('missing_wording_answer');
    }
    if (STUDY_PROMPT_MARKERS.some((p) => p.test(text))) {
      issues.push('unwanted_study_prompt');
    }
    if (MEMORY_BLEED_MARKERS.some((p) => p.test(text))) {
      issues.push('unwanted_memory');
    }
  }

  if (qType === 'correction' || followUp.correction || questionIntent.strictAnswerMode) {
    if (historyMarkerCount >= 2 && /\b(wording|not asking about history|technical name|roman catholic)\b/i.test(message)) {
      issues.push('correction_ignored_history_repeat');
    }
    if (/\b(not answering|listen|not my question)\b/i.test(message) && !/\b(you'?re right|i hear you|exact question|wording)\b/i.test(text)) {
      issues.push('correction_without_apology');
    }
    if (STUDY_PROMPT_MARKERS.some((p) => p.test(text))) {
      issues.push('unwanted_study_prompt');
    }
    if (MEMORY_BLEED_MARKERS.some((p) => p.test(text)) && questionIntent.memoryAllowed === false) {
      issues.push('unwanted_memory');
    }
  }

  if (questionIntent.shouldSuppressStudyPrompts && STUDY_PROMPT_MARKERS.some((p) => p.test(text))) {
    issues.push('suppressed_study_prompt_leaked');
  }

  const passes = issues.length === 0;
  return { passes, issues, severity: passes ? 'none' : issues.includes('repeated_sabbath_history_template') ? 'high' : 'medium' };
}

function buildStrictRegenerationReply({
  message = '',
  recentSessions = [],
  activeConversation = null,
  questionIntent = {},
  strictAnswerMode = false,
} = {}) {
  return buildMetaAnswerResponse({
    message,
    recentSessions,
    activeConversation,
    questionIntent: { ...questionIntent, questionType: 'meta_about_previous_answer', subtopic: 'wording' },
    strictAnswerMode: true,
    correctionMode: questionIntent.isCorrection || questionIntent.correctionMode,
  });
}

function buildFallbackReply({ message = '', questionIntent = {}, recentSessions = [], activeConversation = null } = {}) {
  const meta = buildMetaAnswerResponse({
    message,
    recentSessions,
    activeConversation,
    questionIntent,
    strictAnswerMode: true,
    correctionMode: true,
  });

  const direct = meta.reply.replace(/^You'?re right[^.]+\.\s*/i, '').trim();
  return {
    ...meta,
    reply: `You're right — I was not answering your exact question. The answer is: ${direct}`,
    runtime: {
      ...(meta.runtime || {}),
      answerVerifierFallback: true,
    },
  };
}

/**
 * Run verification gate. Regenerates once on failure; applies concise fallback if still failing.
 */
function applyAnswerVerification({
  structured = {},
  message = '',
  recentSessions = [],
  activeConversation = null,
  questionIntent = {},
  followUp = {},
} = {}) {
  const reply = structured?.reply || '';
  let verification = verifyAnswer({ message, reply, questionIntent, followUp, activeConversation });

  if (verification.passes) {
    return { structured, verification, regenerated: false, usedFallback: false };
  }

  const needsMetaRegen =
    questionIntent.questionType === 'meta_about_previous_answer' ||
    questionIntent.strictAnswerMode ||
    followUp.correction ||
    verification.issues.includes('repeated_sabbath_history_template');

  if (needsMetaRegen) {
    const regen = buildStrictRegenerationReply({
      message,
      recentSessions,
      activeConversation,
      questionIntent,
      strictAnswerMode: questionIntent.strictAnswerMode || followUp.correction,
    });

    verification = verifyAnswer({
      message,
      reply: regen.reply,
      questionIntent: { ...questionIntent, questionType: 'meta_about_previous_answer' },
      followUp,
      activeConversation,
    });

    if (verification.passes) {
      return {
        structured: {
          ...structured,
          ...regen,
          reply: regen.reply,
          runtime: { ...(structured.runtime || {}), ...(regen.runtime || {}), answerVerifierRegenerated: true },
        },
        verification,
        regenerated: true,
        usedFallback: false,
      };
    }

    const fallback = buildFallbackReply({ message, questionIntent, recentSessions, activeConversation });
    return {
      structured: {
        ...structured,
        ...fallback,
        reply: fallback.reply,
        runtime: { ...(structured.runtime || {}), ...(fallback.runtime || {}), answerVerifierFallback: true },
      },
      verification: verifyAnswer({ message, reply: fallback.reply, questionIntent, followUp, activeConversation }),
      regenerated: true,
      usedFallback: true,
    };
  }

  return { structured, verification, regenerated: false, usedFallback: false };
}

module.exports = {
  verifyAnswer,
  applyAnswerVerification,
  countHistoryTemplateMarkers,
  hasWordingAnswerSignals,
  SABBATH_HISTORY_TEMPLATE_MARKERS,
};
