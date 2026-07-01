/**
 * Sprint 2.FINAL-C — Answer Match Gate
 * Validates response against reasoning snapshot before send.
 */

const { buildMetaAnswerResponse } = require('./metaAnswerResponder');
const {
  verifyAnswer,
  countHistoryTemplateMarkers,
  SABBATH_HISTORY_TEMPLATE_MARKERS,
} = require('./answerVerifier');
const { validateResponseContract, buildResponseContract } = require('./responseContract');

const STRICT_REGEN_INSTRUCTION =
  "Answer only the user's exact question. Do not repeat the previous topic. Do not add memory. Do not add study prompts.";

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

function checkForbiddenDistractions(reply = '', forbiddenDistractions = []) {
  const text = String(reply || '');
  const hits = [];

  for (const item of forbiddenDistractions || []) {
    const key = String(item).toLowerCase();
    const constantineCount = (text.match(/\bconstantine\b/gi) || []).length;
    const laodiceaCount = (text.match(/\blaodicea\b/gi) || []).length;
    if (key.includes('constantine') && constantineCount >= 2) hits.push(item);
    if (key.includes('laodicea') && laodiceaCount >= 1 && !key.includes('repeat')) hits.push(item);
    if (key.includes('laodicea') && key.includes('repeat') && laodiceaCount >= 1) hits.push(item);
    if (key.includes('study prompt') && STUDY_PROMPT_MARKERS.some((p) => p.test(text))) hits.push(item);
    if (key.includes('knee') && /\bknee(s)? (hurt|pain)\b/i.test(text)) hits.push(item);
    if (key.includes('grief') && /\blost (a friend|my friend)\b/i.test(text)) hits.push(item);
    if (key.includes('feast') && /\bfeast days\b/i.test(text)) hits.push(item);
    if (key.includes('generic fallback') && /\btell me a little more\b/i.test(text)) hits.push(item);
    if (key.includes('sabbath definition') && /\bsabbath command itself\b/i.test(text)) hits.push(item);
  }
  return [...new Set(hits)];
}

function matchAnswerToSnapshot({ reply = '', reasoningSnapshot = {}, questionIntent = {}, followUp = {} } = {}) {
  const text = String(reply || '');
  const issues = [];

  const baseVerify = verifyAnswer({
    message: reasoningSnapshot.exactUserQuestion,
    reply: text,
    questionIntent: {
      ...questionIntent,
      questionType: reasoningSnapshot.questionType,
      strictAnswerMode: reasoningSnapshot.strictAnswerMode,
    },
    followUp,
  });
  issues.push(...(baseVerify.issues || []));

  const contract = buildResponseContract({ reply: text }, reasoningSnapshot);
  const contractValidation = validateResponseContract(contract, reasoningSnapshot);
  if (!contractValidation.valid) issues.push(...contractValidation.issues);

  const distractionHits = checkForbiddenDistractions(text, reasoningSnapshot.forbiddenDistractions);
  if (distractionHits.length) issues.push(...distractionHits.map((d) => `distraction:${d}`));

  if (
    (reasoningSnapshot.questionType === 'meta_about_previous_answer' ||
      reasoningSnapshot.requestedAnswerType === 'wording_explanation') &&
    countHistoryTemplateMarkers(text) >= 2
  ) {
    issues.push('repeated_sabbath_history_template');
  }

  if (reasoningSnapshot.plainEnglishRestatement) {
    const restatement = reasoningSnapshot.plainEnglishRestatement.toLowerCase();
    if (restatement.includes('wording') && !/\b(wording|worded|shorthand|precise|roman catholic)\b/i.test(text)) {
      issues.push('plainEnglish_mismatch');
    }
    if (restatement.includes('not answer their exact question') && !/\b(you'?re right|exact question|answer is)\b/i.test(text)) {
      issues.push('correction_ignored');
    }
  }

  const unique = [...new Set(issues)];
  return { passes: unique.length === 0, issues: unique, contract };
}

function buildStrictRegeneration({
  message = '',
  recentSessions = [],
  activeConversation = null,
  reasoningSnapshot = {},
  questionIntent = {},
} = {}) {
  return buildMetaAnswerResponse({
    message,
    recentSessions,
    activeConversation,
    questionIntent: {
      ...questionIntent,
      questionType: reasoningSnapshot.questionType === 'correction' ? 'correction' : 'meta_about_previous_answer',
      subtopic: 'wording',
      strictAnswerMode: true,
    },
    strictAnswerMode: true,
    correctionMode: reasoningSnapshot.isCorrection,
  });
}

function buildConciseCorrectedAnswer({ reasoningSnapshot = {}, recentSessions = [], activeConversation = null, questionIntent = {} } = {}) {
  const meta = buildStrictRegeneration({
    message: reasoningSnapshot.exactUserQuestion,
    recentSessions,
    activeConversation,
    reasoningSnapshot,
    questionIntent,
  });
  const direct = String(meta.reply || '')
    .replace(/^You'?re right[^.]+\.\s*/i, '')
    .trim();
  return {
    ...meta,
    reply: `You're right — I was not answering your exact question. The answer is: ${direct}`,
    runtime: {
      ...(meta.runtime || {}),
      answerMatchGateFallback: true,
      strictRegenInstruction: STRICT_REGEN_INSTRUCTION,
    },
  };
}

/**
 * Apply answer match gate using reasoning snapshot.
 */
function applyAnswerMatchGate({
  structured = {},
  reasoningSnapshot = {},
  questionIntent = {},
  followUp = {},
  recentSessions = [],
  activeConversation = null,
} = {}) {
  const reply = structured?.reply || '';
  let match = matchAnswerToSnapshot({
    reply,
    reasoningSnapshot,
    questionIntent,
    followUp,
  });

  if (match.passes) {
    return {
      structured,
      match,
      regenerated: false,
      usedFallback: false,
      instruction: null,
    };
  }

  const needsRegen =
    reasoningSnapshot.isMetaQuestion ||
    reasoningSnapshot.strictAnswerMode ||
    reasoningSnapshot.isCorrection ||
    match.issues.some((i) =>
      ['repeated_sabbath_history_template', 'plainEnglish_mismatch', 'correction_ignored', 'answeredQuestion_mismatch'].some(
        (k) => i.includes(k)
      )
    );

  if (needsRegen) {
    const regen = buildStrictRegeneration({
      message: reasoningSnapshot.exactUserQuestion,
      recentSessions,
      activeConversation,
      reasoningSnapshot,
      questionIntent,
    });

    match = matchAnswerToSnapshot({
      reply: regen.reply,
      reasoningSnapshot,
      questionIntent,
      followUp,
    });

    if (match.passes) {
      return {
        structured: {
          ...structured,
          ...regen,
          reply: regen.reply,
          runtime: {
            ...(structured.runtime || {}),
            ...(regen.runtime || {}),
            answerMatchGateRegenerated: true,
            strictRegenInstruction: STRICT_REGEN_INSTRUCTION,
          },
        },
        match,
        regenerated: true,
        usedFallback: false,
        instruction: STRICT_REGEN_INSTRUCTION,
      };
    }

    const fallback = buildConciseCorrectedAnswer({
      reasoningSnapshot,
      recentSessions,
      activeConversation,
      questionIntent,
    });
    match = matchAnswerToSnapshot({
      reply: fallback.reply,
      reasoningSnapshot,
      questionIntent,
      followUp,
    });

    return {
      structured: {
        ...structured,
        ...fallback,
        reply: fallback.reply,
        runtime: {
          ...(structured.runtime || {}),
          ...(fallback.runtime || {}),
          answerMatchGateFallback: true,
        },
      },
      match,
      regenerated: true,
      usedFallback: true,
      instruction: STRICT_REGEN_INSTRUCTION,
    };
  }

  return { structured, match, regenerated: false, usedFallback: false, instruction: null };
}

module.exports = {
  applyAnswerMatchGate,
  matchAnswerToSnapshot,
  checkForbiddenDistractions,
  STRICT_REGEN_INSTRUCTION,
  SABBATH_HISTORY_TEMPLATE_MARKERS,
};
