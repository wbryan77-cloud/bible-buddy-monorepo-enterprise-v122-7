/**
 * Companion posture validator — reason-first only.
 * Hard regen: doctrine (elsewhere), correction rationale, correction posture mismatch, unsafe health.
 * Soft: missing mustDo, mustAvoid hits, generic warmth, over-answer on WALK_WITH_ME.
 */

const { POSTURES } = require('./companionTurnIntent');
const { overlapRatio, openingSentence } = require('./correctionLedger');
const { countHistoryTemplateMarkers } = require('./answerVerifier');

const GENERIC_WARMTH =
  /\bcaring for a (parent|loved one) can be\b|\bmany people find\b|\blife can be difficult\b|\bit is natural to feel\b/i;

const UNSAFE_HEALTH =
  /\b(no need to see|don'?t need a doctor|skip the doctor|ignore medical|instead of seeing a doctor)\b/i;

const PRAYER_TEMPLATE = /\bwould you like (to )?(pray|a prayer)\b/i;
const VERSE_DUMP = /(proverbs|james|psalm|exodus|isaiah|matthew|john)\s+\d+:\d+/gi;

function sentenceCount(text = '') {
  return (String(text).match(/[^.!?]+[.!?]+/g) || []).filter((s) => s.trim().length > 8).length;
}

function countScriptureRefs(text = '') {
  const m = String(text).match(VERSE_DUMP);
  return m ? m.length : 0;
}

function checkMustDoItem(reply, item = '') {
  const r = String(reply).toLowerCase();
  const itemL = String(item).toLowerCase();

  if (/mom|alzheimer/.test(itemL)) return /\bmom\b|\balzheimer/i.test(r);
  if (/caregiver burden/.test(itemL)) return /\bcaregiv|burden|heavy|hard|difficult|weight/i.test(r);
  if (/push\/wait|push or wait|job opportunity/.test(itemL)) {
    return /\bpush\b|\bwait\b|\boffer\b|\bjob\b|\bopportunity\b/i.test(r);
  }
  if (/distance from home/.test(itemL)) return /\bfar away\b|\bdistance\b|\bfrom home\b/i.test(r);
  if (/discernment step/.test(itemL)) return /\bpray\b|\bpause\b|\bcounsel\b|\bstep\b|\bconsider\b/i.test(r);
  if (/wednesday|friend/.test(itemL)) return /\bwednesday\b|\bfriend\b/i.test(r);
  if (/knee/.test(itemL)) return /\bknee/i.test(r);
  if (/week|again today|recurrence/.test(itemL)) return /\bweek\b|\bagain today\b|\bagain\b|\brecurr/i.test(r);
  if (/medical caution|urgent/.test(itemL)) {
    return /\bdoctor\b|\bhealthcare\b|\bmedical\b|\bprofessional\b|\bworsen/i.test(r);
  }
  if (/wording/.test(itemL)) return /\bwording\b|\bterm\b|\broman catholic\b|\broman church\b/i.test(r);
  if (/roman imperial|constantine/.test(itemL)) {
    return /\broman catholic\b|\bimperial\b|\bconstantine\b|\blater church\b|\bseparate\b/i.test(r);
  }
  if (/direct answer/.test(itemL)) return r.length > 40;
  if (/one clear question/.test(itemL)) return /\?/.test(r) && sentenceCount(r) <= 4;
  if (/reflect one concrete/.test(itemL)) return r.length > 30;

  return true;
}

function checkMustAvoidItem(reply, item = '') {
  const r = String(reply).toLowerCase();
  const itemL = String(item).toLowerCase();

  if (/sabbath history|constantine|laodicea/.test(itemL)) {
    return /constantine|laodicea|historical chain|council of laodicea|sabbath definition block/i.test(r);
  }
  if (/prior shorthand rationale/.test(itemL)) return false;
  if (/would you like.*pray before/.test(itemL)) return PRAYER_TEMPLATE.test(r) && sentenceCount(r) < 5;
  if (/generic.*caring for a parent/.test(itemL)) return GENERIC_WARMTH.test(r);
  if (/generic trust god/.test(itemL)) {
    return /\btrust in the lord with all your heart\b/i.test(r) && !/\bpush\b|\bwait\b|\bknee\b|\bmom\b|\bfriend\b/i.test(r);
  }
  if (/proverbs\/james\/psalm stack/.test(itemL)) return countScriptureRefs(r) >= 3;
  if (/body-as-temple|body temple/.test(itemL)) {
    return /^[^.]{0,120}\btemple of the holy spirit\b/i.test(r);
  }
  if (/verse dump|prayer offer/.test(itemL)) {
    if (/immediate prayer/.test(itemL)) return PRAYER_TEMPLATE.test(r) && countScriptureRefs(r) >= 2;
    if (/verse dump/.test(itemL)) return countScriptureRefs(r) >= 3;
  }
  if (/mini-essay/.test(itemL)) return sentenceCount(r) > 8;
  if (/it sounds like/.test(itemL)) return /^it sounds like\b/i.test(r.trim());
  if (/five-step/.test(itemL)) return (r.match(/\b(you might|consider|try|step)\b/gi) || []).length >= 4;

  return false;
}

function validateCorrectionPostureHard(reply = '', evidencePack = {}) {
  const intent = evidencePack.companionTurnIntent || {};
  if (intent.posture !== POSTURES.CORRECTION_RECOVERY) {
    return { passed: true, issues: [], skipped: true };
  }

  const issues = [];
  const text = String(reply);

  if (countHistoryTemplateMarkers(text) >= 1 || /constantine|laodicea/i.test(text)) {
    if (/wording|roman catholic|not asking/i.test(String(evidencePack.userMessage || ''))) {
      issues.push('correction_posture_sabbath_history_bleed');
    }
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const ackSentences = sentences.filter((s) =>
    /\bi hear\b|\bi understand\b|\bthank you\b|\bappreciate\b|\bfrustrat/i.test(s)
  );
  if (ackSentences.length > 1) {
    issues.push('correction_posture_too_much_acknowledgment');
  }

  if (!/\broman catholic\b|\bwording\b|\bterm\b|\bshorthand\b|\bname\b/i.test(text)) {
    issues.push('correction_posture_missing_wording_answer');
  }

  const ledger = evidencePack.correctionLedger || {};
  if (ledger.priorAssistantQuote && overlapRatio(text, ledger.priorAssistantQuote) > 0.35) {
    issues.push('correction_posture_repeated_rationale');
  }

  return { passed: issues.length === 0, issues, skipped: false };
}

function validateUnsafeHealthHard(reply = '', evidencePack = {}) {
  const intent = evidencePack.companionTurnIntent || {};
  if (intent.topic !== 'health' && intent.posture !== POSTURES.REFLECT_THEN_HELP) {
    return { passed: true, issues: [], skipped: true };
  }
  if (!/\bknee|hurt|pain\b/i.test(String(evidencePack.userMessage || ''))) {
    return { passed: true, issues: [], skipped: true };
  }

  const issues = [];
  if (UNSAFE_HEALTH.test(reply)) issues.push('unsafe_health_advice');

  return { passed: issues.length === 0, issues, skipped: false };
}

function validateCompanionPosture({ reply = '', evidencePack = {} } = {}) {
  const intent = evidencePack.companionTurnIntent || {};
  const posture = intent.posture;
  const softWarnings = [];
  const mustDoMisses = [];
  const mustAvoidHits = [];

  if (!posture) {
    return {
      passed: true,
      posture: null,
      softWarnings: [],
      hardIssues: [],
      skipped: true,
    };
  }

  for (const item of intent.mustDo || []) {
    if (!checkMustDoItem(reply, item)) mustDoMisses.push(item);
  }
  for (const item of intent.mustAvoid || []) {
    if (checkMustAvoidItem(reply, item)) mustAvoidHits.push(item);
  }

  if (mustDoMisses.length) {
    softWarnings.push({
      type: 'missing_must_do',
      message: `Missing: ${mustDoMisses.slice(0, 3).join('; ')}`,
      items: mustDoMisses,
    });
  }
  if (mustAvoidHits.length) {
    softWarnings.push({
      type: 'must_avoid_violation',
      message: `Avoid: ${mustAvoidHits.slice(0, 3).join('; ')}`,
      items: mustAvoidHits,
    });
  }

  if (GENERIC_WARMTH.test(reply) && mustDoMisses.length > 0) {
    softWarnings.push({ type: 'generic_warmth', message: 'Generic warmth without concrete thread detail.' });
  }

  if (posture === POSTURES.WALK_WITH_ME) {
    if (sentenceCount(reply) > 6 || countScriptureRefs(reply) >= 2) {
      softWarnings.push({ type: 'over_answer_walk', message: 'Reply is too long or teach-heavy for WALK_WITH_ME.' });
    }
    if (PRAYER_TEMPLATE.test(reply) && countScriptureRefs(reply) >= 1) {
      softWarnings.push({ type: 'over_answer_walk', message: 'Prayer/verse offer too early for WALK_WITH_ME.' });
    }
  }

  if (posture === POSTURES.CLARIFY_FIRST && sentenceCount(reply) > 4 && !/^\s*[^?]*\?[^?]*$/s.test(reply.trim())) {
    softWarnings.push({ type: 'posture_clarify_over_answer', message: 'CLARIFY_FIRST should not include a full answer yet.' });
  }

  const correctionPosture = validateCorrectionPostureHard(reply, evidencePack);
  const healthHard = validateUnsafeHealthHard(reply, evidencePack);

  const hardIssues = [...(correctionPosture.issues || []), ...(healthHard.issues || [])];

  let postureMatch = true;
  if (posture === POSTURES.CORRECTION_RECOVERY && !correctionPosture.passed) postureMatch = false;
  if (posture === POSTURES.CLARIFY_FIRST && sentenceCount(reply) > 6) postureMatch = false;

  return {
    passed: hardIssues.length === 0,
    posture,
    postureMatch,
    softWarnings,
    hardIssues,
    mustDoMisses,
    mustAvoidHits,
    correctionPosture,
    healthHard,
  };
}

function buildPostureRegenHint(postureResult = {}, evidencePack = {}) {
  const intent = evidencePack.companionTurnIntent || {};
  const parts = [`Follow posture ${intent.posture}: ${intent.composerRule || ''}`];
  if (postureResult.hardIssues?.length) parts.push(`Fix: ${postureResult.hardIssues.join('; ')}`);
  if (intent.mustDo?.length) parts.push(`Must include: ${intent.mustDo.slice(0, 4).join('; ')}`);
  if (intent.mustAvoid?.length) parts.push(`Must avoid: ${intent.mustAvoid.slice(0, 4).join('; ')}`);
  return parts.join(' ');
}

module.exports = {
  validateCompanionPosture,
  validateCorrectionPostureHard,
  validateUnsafeHealthHard,
  buildPostureRegenHint,
};
