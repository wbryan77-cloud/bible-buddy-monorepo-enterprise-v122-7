/**
 * Generic directness guard — validates answer matches current intent and message.
 */

const { detectForbiddenProse, HISTORY_MARKERS, REGEN_INSTRUCTION } = require('./forbiddenProseGuard');
const { hasYesNoLead } = require('./ownershipAntiOverrideGuard');
const { INTENTS } = require('./currentMessageIntent');

function evaluateDirectness({
  message = '',
  reply = '',
  currentIntent = INTENTS.UNCLEAR,
  evidencePack = {},
  openaiCalled = false,
  historyAllowed = false,
} = {}) {
  const issues = [];
  const forbidden = detectForbiddenProse(reply);
  const r = String(reply || '');
  const m = String(message || '');

  if (!openaiCalled) issues.push('not_openai_authored');
  if (forbidden.detected) issues.push('forbidden_phrase');
  if (!historyAllowed && HISTORY_MARKERS.test(r) && !HISTORY_MARKERS.test(m)) {
    issues.push('unsolicited_history');
  }

  switch (currentIntent) {
    case INTENTS.DIRECT_YES_NO:
      if (!hasYesNoLead(r, m)) issues.push('missing_yes_no_lead');
      break;
    case INTENTS.MEANING_WORD_STUDY:
      if (
        !/\b(mean|means|meaning|refers|word|greek|hebrew|logos|translated)\b/i.test(r.slice(0, 400)) &&
        r.length > 30
      ) {
        issues.push('missing_word_study');
      }
      break;
    case INTENTS.DEFINITION:
    case INTENTS.DOCTRINE_EXPLANATION:
      if (/\bhow many\b/i.test(m) && !/\b(one|two|three|1|2|3|third|heaven|heavens)\b/i.test(r.slice(0, 220))) {
        issues.push('missing_how_many');
      }
      break;
    case INTENTS.HOW_TO_PRACTICE:
      if (
        !/\b(keep|honor|observe|rest|worship|prepare|set apart|cease|delight)\b/i.test(r.slice(0, 450)) &&
        r.length > 40
      ) {
        issues.push('missing_how_to');
      }
      break;
    case INTENTS.CORRECTION_REPAIR: {
      const unresolved =
        evidencePack.threadLocal?.currentUnresolvedQuestion ||
        evidencePack.correctionLedger?.priorUserQuestion ||
        m;
      if (r.length < 35) issues.push('correction_too_short');
      if (forbidden.detected) issues.push('correction_still_template');
      if (unresolved && r.length > 20 && !issues.includes('correction_too_short')) {
        const tokens = String(unresolved)
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 4)
          .slice(0, 4);
        const matched = tokens.filter((t) => r.toLowerCase().includes(t)).length;
        if (tokens.length >= 2 && matched === 0) issues.push('correction_off_topic');
      }
      break;
    }
    default:
      break;
  }

  if (r.trim().length < 8 && openaiCalled) issues.push('reply_too_short');

  const answerMatchesLatestQuestion =
    !issues.some((i) =>
      [
        'missing_yes_no_lead',
        'missing_word_study',
        'missing_how_many',
        'missing_how_to',
        'correction_off_topic',
        'correction_too_short',
        'unsolicited_history',
      ].includes(i)
    );

  const correctionRepair =
    currentIntent !== INTENTS.CORRECTION_REPAIR ||
    !issues.some((i) => ['correction_too_short', 'correction_off_topic', 'correction_still_template'].includes(i));

  return {
    passed: issues.length === 0,
    issues,
    forbiddenPhraseDetected: forbidden.detected,
    forbiddenHits: forbidden.hits,
    answerMatchesLatestQuestion,
    correctionRepair,
    historyAllowed,
    regenInstruction: issues.length ? REGEN_INSTRUCTION : null,
  };
}

module.exports = {
  evaluateDirectness,
  REGEN_INSTRUCTION,
};
