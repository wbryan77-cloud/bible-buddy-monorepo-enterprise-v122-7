/**
 * Pre-finalize ownership guard — ensures OpenAI authored the answer to the current question.
 */

const { detectDangerousFallbackSpeaker } = require('./coreResponseGuards');
const {
  isDirectQuestion,
} = require('./answerGuidance');

const WITNESS = /establishes the matter|confirms it alongside Scripture|carries the theme forward|Witness path:/i;
const STUDY = /You've been studying|We can continue that study|continue your study journey|Would you like to continue studying/i;
const HISTORY = /Constantine|Council of Laodicea|Saturday to Sunday/i;
const PSALM46_ONLY = /^God is our refuge and strength, a very present help in trouble\.\s*$/i;

function hasYesNoLead(reply = '', message = '') {
  const lead = String(reply || '').slice(0, 180);
  if (/^\s*(yes|no)\b/i.test(lead) || /\b(yes|no)\b/i.test(lead.slice(0, 120))) return true;
  if (/\b(can i eat|should i eat|eat pork|eat swine|eat shrimp|yes or no)\b/i.test(String(message || ''))) {
    return /\b(not to be eaten|not permitted|is unclean|are unclean|forbidden|prohibited|should not|do not eat)\b/i.test(
      lead
    );
  }
  return false;
}

function scoreQuestionMatch(message = '', reply = '', guidance = {}) {
  const m = String(message || '');
  const r = String(reply || '');
  if (!r.trim()) return 0;
  if (STUDY.test(r)) return 1;
  if (guidance.forbidSabbathHistoryChain && HISTORY.test(r) && !/constantine|rome|sunday|history/i.test(m)) return 2;
  if (guidance.requireYesNoLead && !hasYesNoLead(r, m)) return 3;
  if (/\bcan you search\b/i.test(m) && STUDY.test(r)) return 1;
  if (/\bhow many heaven/i.test(m) && /You've been studying traditions/i.test(r)) return 1;
  if (isDirectQuestion(m) && r.length > 60) return 7;
  return 6;
}

function validateOwnershipReply({
  message = '',
  reply = '',
  evidencePack = {},
  openaiCalled = false,
  fallbackUsed = false,
} = {}) {
  const guidance = evidencePack.answerGuidance || {};
  const danger = detectDangerousFallbackSpeaker(reply);
  const issues = [];

  if (fallbackUsed && openaiCalled) issues.push('fallback_used_with_openai');
  if (!openaiCalled && fallbackUsed) {
    return {
      passed: false,
      issues: ['openai_not_called'],
      currentQuestionMatch: 0,
      studyLoopUsed: danger.studyLoopUsed,
      templateUsed: danger.detected,
      regenInstruction: null,
      allowConnectionFallback: true,
    };
  }

  if (danger.studyLoopUsed) issues.push('study_loop_in_answer');
  if (danger.scriptureWitnessTemplateUsed || WITNESS.test(reply)) issues.push('witness_template_in_answer');
  if (PSALM46_ONLY.test(String(reply).trim())) issues.push('psalm46_fallback_only');
  if (guidance.requireYesNoLead && !hasYesNoLead(reply, message)) {
    issues.push('missing_yes_no_lead');
  }
  if (guidance.requireHowManyLead && !/\b(one|two|three|1|2|3|third|heaven)\b/i.test(String(reply).slice(0, 200))) {
    issues.push('missing_how_many_lead');
  }
  if (guidance.requireSearchCapabilityAnswer && !/\b(search|scripture|bible|evidence|internet|web)\b/i.test(String(reply).slice(0, 200))) {
    issues.push('missing_search_capability_answer');
  }
  if (guidance.forbidSabbathHistoryChain && HISTORY.test(reply) && !guidance.allowHistoryEvidence) {
    issues.push('unsolicited_history');
  }
  if (guidance.forbidStudyContinuation && STUDY.test(reply)) issues.push('study_continuation');

  const currentQuestionMatch = scoreQuestionMatch(message, reply, guidance);
  if (currentQuestionMatch < 5) issues.push('low_question_match');

  const passed = issues.length === 0 && currentQuestionMatch >= 5;

  return {
    passed,
    issues,
    currentQuestionMatch,
    studyLoopUsed: danger.studyLoopUsed,
    templateUsed: danger.detected || WITNESS.test(reply),
    prayerTemplateUsed: danger.prayerTemplateUsed,
    regenInstruction: passed
      ? null
      : 'Answer the latest user question directly first. Do not continue a prior study topic. Do not use witness triplet phrasing or study continuation openers.',
    allowConnectionFallback: false,
  };
}

function isTemplateProseDisabled() {
  return process.env.BUDDY_TEMPLATE_PROSE !== '1';
}

function isStudyFallbackDisabled() {
  return isTemplateProseDisabled() || process.env.BUDDY_DISABLE_STUDY_FALLBACK === '1';
}

module.exports = {
  validateOwnershipReply,
  scoreQuestionMatch,
  hasYesNoLead,
  isTemplateProseDisabled,
  isStudyFallbackDisabled,
};
