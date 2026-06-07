/**
 * Doctrine boundary validation for reason-first composer output.
 */

const { violatesDoctrineBoundary, FORBIDDEN_TEACHINGS } = require('./doctrineBoundaries');
const { countHistoryTemplateMarkers } = require('./answerVerifier');
const {
  validateCorrectionHardFailures,
  evaluateListeningRecommendations,
  buildCorrectionRegenHint,
  formatRecommendationsForTrace,
} = require('./listeningSpecificityValidator');
const { validateOwnershipReply } = require('./ownershipAntiOverrideGuard');
const { validateScripturePolicy } = require('./scripturePolicyValidator');

const WITNESS_MARKERS = [
  /establishes the matter/i,
  /confirms it alongside Scripture/i,
  /carries the theme forward/i,
  /Witness path:/i,
];

const STUDY_ANSWER_MARKERS = [
  /You've been studying/i,
  /We can continue that study/i,
];

const STUDY_PROMPT_MARKERS = [
  /\bwould you like to continue studying\b/i,
  /\bcontinue your study journey\b/i,
  /\bgenesis-to-revelation path\b/i,
  ...STUDY_ANSWER_MARKERS,
  ...WITNESS_MARKERS,
];

const TEMPLATE_BLOCK_MARKERS = [
  /Historical chain \(secondary to Scripture\):/i,
  /Sources and references \(historical, secondary\):/i,
  /Scripture identifies the seventh day as the Sabbath and does not record God changing/i,
];

function validateDoctrineBoundaries(reply = '') {
  const text = String(reply || '');
  const violations = violatesDoctrineBoundary(text);
  const templateBlockDetected = TEMPLATE_BLOCK_MARKERS.some((p) => p.test(text));
  const unsolicitedStudyPrompt =
    STUDY_PROMPT_MARKERS.some((p) => p.test(text));

  const issues = [...violations];
  if (templateBlockDetected) issues.push('template_block_pasted');
  if (unsolicitedStudyPrompt) issues.push('unsolicited_study_prompt');

  return {
    passed: issues.length === 0,
    violations,
    issues,
    doctrineValidationResult: issues.length ? 'fail' : 'pass',
  };
}

function validateHistoryTemplateOnMeta({ reply = '', evidencePack = {} } = {}) {
  const understanding = evidencePack.understanding || {};
  const isMeta =
    understanding.isMetaQuestion ||
    understanding.requestedAnswerType === 'wording_explanation' ||
    understanding.strictAnswerMode;

  if (!isMeta) {
    return { passed: true, issues: [], skipped: true };
  }

  const issues = [];
  if (countHistoryTemplateMarkers(reply) >= 2) {
    issues.push('repeated_sabbath_history_template');
  }

  return { passed: issues.length === 0, issues, skipped: false };
}

function validateReasonFirstReply({ reply = '', evidencePack = {}, historyAllowed = false } = {}) {
  const doctrine = validateDoctrineBoundaries(reply);
  const correctionHard = validateCorrectionHardFailures(reply, evidencePack);
  const historyTemplate = validateHistoryTemplateOnMeta({ reply, evidencePack });
  const listening = evaluateListeningRecommendations(reply, evidencePack);
  const ownership = validateOwnershipReply({
    message: evidencePack.userMessage || '',
    reply,
    evidencePack,
    openaiCalled: true,
    fallbackUsed: false,
  });
  const scripturePolicy = validateScripturePolicy({
    reply,
    evidencePack,
    historyAllowed: historyAllowed || !!evidencePack.historyAllowed,
    message: evidencePack.userMessage || '',
  });

  const hardIssues = [
    ...doctrine.issues,
    ...(correctionHard.issues || []),
    ...(historyTemplate.issues || []),
    ...(ownership.passed ? [] : ownership.issues.filter((i) => i !== 'low_question_match')),
    ...scripturePolicy.issues,
  ];
  const passed =
    doctrine.passed &&
    correctionHard.passed &&
    historyTemplate.passed &&
    ownership.passed &&
    scripturePolicy.passed;

  let regenHint = null;
  if (!passed) {
    if (scripturePolicy.regenHint && !scripturePolicy.passed) {
      regenHint = scripturePolicy.regenHint;
    } else if (ownership.regenInstruction && !ownership.passed) {
      regenHint = ownership.regenInstruction;
    } else if (!correctionHard.passed && correctionHard.issues?.length) {
      regenHint = buildCorrectionRegenHint(correctionHard.issues, evidencePack);
    } else {
      regenHint = `Fix these issues without pasting template blocks: ${hardIssues.join('; ')}`;
    }
  }

  const softRecommendations = [...listening.recommendations];

  return {
    passed,
    doctrine,
    correctionHard,
    historyTemplate,
    listening: {
      recommendations: listening.recommendations,
      recommendationMessages: formatRecommendationsForTrace(listening.recommendations),
      detailCandidates: listening.detailCandidates,
      softOnly: true,
    },
    ownership,
    scripturePolicy,
    issues: hardIssues,
    softRecommendations,
    doctrineValidationResult: passed ? 'pass' : 'fail',
    regenHint,
    adminFindings: scripturePolicy.adminFindings,
  };
}

module.exports = {
  FORBIDDEN_TEACHINGS,
  validateDoctrineBoundaries,
  validateHistoryTemplateOnMeta,
  validateReasonFirstReply,
};
