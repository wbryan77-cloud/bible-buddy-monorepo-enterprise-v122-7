/**
 * Phase 5E — BNC safety gate: language bridge only, never doctrine authority.
 */

const { getGraphWitnesses } = require('./bibleConceptGraph');
const { DENIAL_RE, suppressValidatorLeak } = require('./directAnswerFormatter');

const FORBIDDEN_SPECULATION = [
  /\binterpretations vary\b/i,
  /\bprimarily\b/i,
  /\bmainly about\b/i,
  /\blargely\b/i,
  /\bsome scholars\b/i,
  /\bprobably\b/i,
  /\bmight mean\b/i,
  /\bcould mean\b/i,
  /\bi think\b/i,
  /\bit seems\b/i,
];

const PARABLE_PRIMARY_RE =
  /\b(parable|story of)\b.*\b(proves?|shows?|means?|teaches?)\b/i;

function requireWitnessMinimum(concept, witnesses = []) {
  const id = concept?.id || concept;
  const graph = getGraphWitnesses(id);
  const available = graph.all || graph.direct || [];
  const min = Math.min(2, available.length);
  const count = (witnesses || []).length;
  return {
    ok: count >= min || available.length === 0,
    required: min,
    actual: count,
    availableCount: available.length,
  };
}

function validateConceptMatch({ message = '', concept = null, witnesses = [], strictTopic = null } = {}) {
  if (!concept) {
    return { ok: false, reason: 'no_concept', confidence: 'low' };
  }
  const forbidden = concept.forbiddenConfusions || [];
  const m = String(message).toLowerCase();
  for (const f of forbidden) {
    if (m.includes(String(f).toLowerCase().replace(/_/g, ' '))) {
      return { ok: false, reason: 'forbidden_confusion', field: f };
    }
  }
  const witnessCheck = requireWitnessMinimum(concept, witnesses);
  if (!witnessCheck.ok && witnessCheck.availableCount >= 2) {
    return { ok: false, reason: 'insufficient_witnesses', ...witnessCheck };
  }
  if (strictTopic && concept.strictTopic && strictTopic !== concept.strictTopic) {
    return { ok: false, reason: 'strict_topic_conflict', strictTopic, conceptTopic: concept.strictTopic };
  }
  return { ok: true, confidence: concept.confidence || 'medium' };
}

function detectForbiddenSpeculation(reply = '') {
  const hits = FORBIDDEN_SPECULATION.filter((re) => re.test(String(reply)));
  return { blocked: hits.length > 0, patterns: hits.map((re) => re.source) };
}

function detectParableAsPrimaryProof(reply = '') {
  return { blocked: PARABLE_PRIMARY_RE.test(String(reply)) };
}

function blockIfUnsupportedDoctrine(reply = '') {
  let text = suppressValidatorLeak(String(reply || ''));
  const spec = detectForbiddenSpeculation(text);
  if (spec.blocked) {
    text = text.replace(new RegExp(spec.patterns.join('|'), 'gi'), '').replace(/\s+/g, ' ').trim();
  }
  return text;
}

function validateBncAnswer({ reply = '', concept = null, witnesses = [], source = 'bnc' } = {}) {
  const scripture = (witnesses || []).map((r) => ({ reference: r }));
  let text = blockIfUnsupportedDoctrine(reply);
  const witnessCheck = requireWitnessMinimum(concept, witnesses);
  const parable = detectParableAsPrimaryProof(text);
  const speculation = detectForbiddenSpeculation(text);
  const hasRefs = scripture.length > 0 || /\b(?:Genesis|Exodus|Matthew|Revelation|Daniel|Corinthians|Hebrews)\s+\d+/i.test(text);
  const ok =
    hasRefs &&
    witnessCheck.ok &&
    !parable.blocked &&
    !speculation.blocked &&
    !DENIAL_RE.test(text);
  return {
    ok,
    reply: text,
    witnessCheck,
    parable,
    speculation,
    source,
    conceptId: concept?.id || null,
  };
}

module.exports = {
  validateConceptMatch,
  validateBncAnswer,
  blockIfUnsupportedDoctrine,
  requireWitnessMinimum,
  detectForbiddenSpeculation,
  detectParableAsPrimaryProof,
  FORBIDDEN_SPECULATION,
};
