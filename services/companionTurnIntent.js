/**
 * Companion turn intent — one primary posture per turn (reason-first RACL).
 * Classifies intent only; does not generate prose.
 */

const { isCorrectionMessage, isMetaOrWordingTurn } = require('./correctionLedger');

const POSTURES = {
  DIRECT_ANSWER: 'DIRECT_ANSWER',
  REFLECT_THEN_HELP: 'REFLECT_THEN_HELP',
  CLARIFY_FIRST: 'CLARIFY_FIRST',
  CORRECTION_RECOVERY: 'CORRECTION_RECOVERY',
  WALK_WITH_ME: 'WALK_WITH_ME',
};

const CORRECTION_MSG =
  /\bnot (my|what i) (question|asking|meant)\b|\bnot asking about\b|\bwhy are you not answering\b|\bare you not listening\b|\bno,?\s*i mean\b|\bwhat i'?m asking\b|\byou('re| are) not listening\b/i;

const EMOTIONAL_SHARE =
  /\bi feel\b|\bi'?m (not sure|unsure|afraid|worried|anxious|grieving|sad|lonely|overwhelmed)\b|\blost a\b|\bstill bothering\b|\bdoes that mean\b|\bfaith is failing\b|\bempty\b|\bdistant from god\b|\bdiagnosed\b|\bdoesn'?t remember\b|\bgrieving\b|\bhurt(s|ing)?\b|\bknee/i;

const FACTUAL_QUESTION =
  /^why should we\b|^why do you call\b|^why are you using\b|^what (is|are|was|were)\b|^when did\b|^how did\b|^who (was|is)\b/i;

const WALK_TRIGGERS =
  /\bwhy do you think i feel\b|\bstill bothering me\b|\bjust needed to (talk|share)\b|\bcan'?t stop thinking\b|\bit feels empty\b|\bi pray but it feels\b|\bfeel distant\b/i;

const CLARIFY_TRIGGERS =
  /^(help|i need help|hi|hello|hey)\.?$/i;

function threadCorpus(evidencePack = {}) {
  const parts = [];
  for (const t of evidencePack.conversationHistory || []) {
    parts.push(t.user, t.assistant);
  }
  parts.push(evidencePack.threadLocal?.latestClarifiedIntent || '');
  return parts.filter(Boolean).join(' ');
}

function detectTopic(message = '', evidencePack = {}) {
  const msg = String(message).toLowerCase();
  const corpus = `${msg} ${threadCorpus(evidencePack)}`.toLowerCase();
  const companionTopic = evidencePack.companionThreadContext?.companionTopic;

  if (companionTopic) return companionTopic;
  if (/\balzheimer|mom|caregiv|remember who/i.test(corpus)) return 'caregiver';
  if (/\bjob opportunity|job offer|push or wait|far away from home\b/i.test(corpus)) return 'discernment';
  if (/\bdistant|faith is failing|empty prayer|pray but\b/i.test(corpus)) return 'distant_from_god';
  if (/\blost a friend|grief|bothering me\b/i.test(corpus)) return 'grief';
  if (/\bknee|hurting again\b/i.test(corpus)) return 'health';
  if (/\bsabbath|sunday worship|roman church|roman catholic\b/i.test(corpus)) return 'sabbath_meta';
  return 'general';
}

function isDirectFactualTurn(message = '', evidencePack = {}) {
  const understanding = evidencePack.understanding || {};
  const msg = String(message).trim();

  if (understanding.strictAnswerMode && !understanding.isCorrection) return true;
  if (evidencePack.history?.included && !evidencePack.companionThreadContext?.companionTopic) {
    if (FACTUAL_QUESTION.test(msg) || /^why should we keep sunday/i.test(msg)) return true;
  }
  if (FACTUAL_QUESTION.test(msg) && !EMOTIONAL_SHARE.test(msg)) return true;
  if (/^why should we keep sunday/i.test(msg)) return true;
  return false;
}

function isCorrectionTurn(message = '', evidencePack = {}) {
  const ledger = evidencePack.correctionLedger || {};
  const understanding = evidencePack.understanding || {};
  if (isCorrectionMessage(message) || CORRECTION_MSG.test(message)) return true;
  if (ledger.active && (ledger.correctionCount >= 1 || ledger.userCorrection)) return true;
  if (understanding.isCorrection || understanding.isMetaQuestion) return true;
  if (isMetaOrWordingTurn(message, understanding)) return true;
  if (understanding.requestedAnswerType === 'wording_explanation') return true;
  return false;
}

function isClarifyTurn(message = '', evidencePack = {}) {
  const msg = String(message).trim();
  if (CLARIFY_TRIGGERS.test(msg)) return true;
  if (msg.length < 12 && !/\?/.test(msg) && !EMOTIONAL_SHARE.test(msg)) return true;
  return false;
}

function isWalkWithMeTurn(message = '', evidencePack = {}, topic = '') {
  const msg = String(message).toLowerCase();
  if (WALK_TRIGGERS.test(msg)) return true;
  if (topic === 'distant_from_god' && /\bfeel distant\b|\bfeels empty\b|\bpray but\b/i.test(msg)) return true;
  if (topic === 'grief' && /\bstill bothering\b/i.test(msg) && !/\?/.test(msg)) return true;
  if (/\bwhy do you think\b/i.test(msg)) return true;
  return false;
}

function isReflectThenHelpTurn(message = '', evidencePack = {}, topic = '') {
  const msg = String(message).toLowerCase();
  if (EMOTIONAL_SHARE.test(msg)) return true;
  if (['caregiver', 'discernment', 'grief', 'health', 'distant_from_god'].includes(topic)) {
    if (/\?/.test(msg) || msg.length > 20) return true;
  }
  if (/\bhow (can|do) i\b|\bhow to stay\b|\bnot sure whether\b/i.test(msg)) return true;
  return false;
}

function selectPosture(message = '', evidencePack = {}) {
  const topic = detectTopic(message, evidencePack);

  if (isCorrectionTurn(message, evidencePack) && !/^why should we keep sunday/i.test(String(message).trim())) {
    return { posture: POSTURES.CORRECTION_RECOVERY, topic, reason: 'correction_or_meta_wording' };
  }
  if (isClarifyTurn(message, evidencePack)) {
    return { posture: POSTURES.CLARIFY_FIRST, topic, reason: 'request_unclear' };
  }
  if (isDirectFactualTurn(message, evidencePack)) {
    return { posture: POSTURES.DIRECT_ANSWER, topic, reason: 'factual_or_doctrinal_question' };
  }
  if (isWalkWithMeTurn(message, evidencePack, topic)) {
    return { posture: POSTURES.WALK_WITH_ME, topic, reason: 'emotional_processing_without_needing_immediate_fix' };
  }
  if (isReflectThenHelpTurn(message, evidencePack, topic)) {
    return { posture: POSTURES.REFLECT_THEN_HELP, topic, reason: 'pain_uncertainty_or_practical_help' };
  }
  if (/\?/.test(message)) {
    return { posture: POSTURES.DIRECT_ANSWER, topic, reason: 'unclassified_question' };
  }
  return { posture: POSTURES.REFLECT_THEN_HELP, topic, reason: 'default_companion_share' };
}

function buildMustDoMustAvoid({ posture, topic, message, evidencePack }) {
  const msg = String(message);
  const mustDo = [];
  const mustAvoid = [];

  if (posture === POSTURES.CORRECTION_RECOVERY) {
    mustDo.push('State clearly you understand they are asking about your wording, not Sabbath history');
    mustDo.push('Answer why you used the term vs Roman Catholic Church directly');
    mustDo.push('Separate Roman imperial authority (Constantine era) from later Roman Catholic Church authority');
    mustAvoid.push('repeating Sabbath history chain');
    mustAvoid.push('repeating prior shorthand rationale without new information');
    mustAvoid.push('Would you like to pray before answering');
    return { mustDo, mustAvoid };
  }

  if (posture === POSTURES.DIRECT_ANSWER) {
    mustDo.push('Lead with a direct answer to the question in the first 1–2 sentences');
    if (topic === 'sabbath_meta' || evidencePack.history?.included) {
      mustDo.push('Use history only as needed to answer; keep focused');
    }
    mustAvoid.push('opening with unrelated empathy template');
    mustAvoid.push('Would you like to pray before answering the question');
    return { mustDo, mustAvoid };
  }

  if (posture === POSTURES.CLARIFY_FIRST) {
    mustDo.push('Ask exactly one clear question about what they need');
    mustAvoid.push('giving a full teaching or advice block before they clarify');
    mustAvoid.push('scripture triplet dump');
    return { mustDo, mustAvoid };
  }

  if (posture === POSTURES.WALK_WITH_ME) {
    mustDo.push('Name what they may be carrying using their words from the thread');
    mustDo.push('Keep tone gentle; stay with them briefly');
    if (topic === 'distant_from_god') {
      mustDo.push('Offer possible reasons they feel distant drawn from the thread, not a lecture');
      mustAvoid.push('immediate prayer offer or verse dump');
      mustAvoid.push('turning into a five-step advice checklist');
    }
    if (topic === 'grief') {
      mustDo.push('Acknowledge the loss without rushing to fix');
      if (/wednesday/i.test(msg) || /wednesday/i.test(threadCorpus(evidencePack))) {
        mustDo.push('Reference Wednesday or the friend if mentioned in thread');
      }
    }
    mustAvoid.push('generic trust God paragraph');
    mustAvoid.push('more than one gentle question');
    return { mustDo, mustAvoid };
  }

  // REFLECT_THEN_HELP
  if (topic === 'caregiver' || /\balzheimer|mom\b/i.test(msg)) {
    mustDo.push('Mention mom and/or Alzheimer\'s specifically');
    mustDo.push('Acknowledge caregiver burden');
    mustDo.push('Give up to two practical steps');
    mustAvoid.push('generic "caring for a parent can be difficult" without their details');
  } else if (topic === 'discernment' || /\bjob|offer|push or wait\b/i.test(msg)) {
    mustDo.push('Mention push/wait or job opportunity as they framed it');
    if (/far away|distance/i.test(`${msg} ${threadCorpus(evidencePack)}`)) {
      mustDo.push('Acknowledge distance from home if in thread');
    }
    mustDo.push('Separate active faith from passive waiting');
    mustDo.push('Offer one discernment step (pray, pause, counsel, timeline)');
    mustAvoid.push('generic trust God paragraph without their fork');
    mustAvoid.push('Proverbs/James/Psalm stack without tying to their situation');
  } else if (topic === 'distant_from_god') {
    mustDo.push('Address distant, empty prayer, or faith fear using their wording');
    mustDo.push('Reassure without dismissing their experience');
    mustAvoid.push('just pray more without acknowledging emptiness');
  } else if (topic === 'grief') {
    mustDo.push('Acknowledge their loss specifically');
    if (/wednesday/i.test(msg) || /wednesday/i.test(threadCorpus(evidencePack))) {
      mustDo.push('Name Wednesday or the friend');
    }
    mustAvoid.push('generic grief timeline without their detail');
  } else if (topic === 'health') {
    mustDo.push('Mention knees or pain duration if stated');
    if (/week|again today|again\b/i.test(msg)) {
      mustDo.push('Acknowledge how long or recurrence (e.g. a week, again today)');
    }
    mustDo.push('Recommend safe practical next steps');
    mustDo.push('Include medical caution for worsening or urgent symptoms');
    mustAvoid.push('leading with body-as-temple paragraph before practical care');
  } else {
    mustDo.push('Reflect one concrete detail from the user message');
    mustDo.push('Offer brief helpful guidance tied to that detail');
  }

  mustDo.push('Keep reply focused: about 3–5 sentences unless they asked for teaching');
  mustAvoid.push('complete mini-essay with multiple scripture blocks');
  mustAvoid.push('default opening "It sounds like" without their words');

  return { mustDo, mustAvoid };
}

function buildPostureComposerRules(posture) {
  const rules = {
    [POSTURES.DIRECT_ANSWER]: `Posture DIRECT_ANSWER: Answer clearly first in 1–2 sentences. Then Scripture or brief history only if relevant. Do not open with a long empathy paragraph.`,
    [POSTURES.REFLECT_THEN_HELP]: `Posture REFLECT_THEN_HELP: One sentence reflecting their concrete situation (use their words). Then 2–3 helpful sentences. Optional: one gentle question only if it truly helps — do not default to asking.`,
    [POSTURES.CLARIFY_FIRST]: `Posture CLARIFY_FIRST: Ask one clear question only. Do not give a full answer or teaching yet.`,
    [POSTURES.CORRECTION_RECOVERY]: `Posture CORRECTION_RECOVERY: At most one short sentence acknowledging the miss. Answer the corrected question directly. Do not repeat your prior explanation. No next steps or prayer offers until the answer is complete.`,
    [POSTURES.WALK_WITH_ME]: `Posture WALK_WITH_ME: Do not rush to solve. Name what they may be carrying. One short grounded reflection. One gentle invitation to share more — not a checklist or verse dump.`,
  };
  return rules[posture] || '';
}

/**
 * @returns {{ posture, why, mustDo, mustAvoid, topic, composerRule }}
 */
function buildCompanionTurnIntent(message = '', evidencePack = {}) {
  const { posture, topic, reason } = selectPosture(message, evidencePack);
  const { mustDo, mustAvoid } = buildMustDoMustAvoid({ posture, topic, message, evidencePack });

  return {
    posture,
    why: reason,
    topic,
    mustDo,
    mustAvoid,
    composerRule: buildPostureComposerRules(posture),
  };
}

module.exports = {
  POSTURES,
  buildCompanionTurnIntent,
  buildPostureComposerRules,
  detectTopic,
  selectPosture,
};
