/**
 * Phase 4D.1 — Doctrine finality mode: OpenAI may polish tone only, not doctrine conclusions.
 */

const FINALITY_STRICT_TOPICS = [
  'death_state',
  'dietary_law',
  'acts_10',
  'sabbath',
  'kingdom',
  'resurrection',
  'holy_spirit',
  'david',
  'new_jerusalem',
  'heavens',
  'heaven',
];

const FINALITY_FORBIDDEN_PHRASES = [
  'primarily',
  'mainly',
  'largely',
  'some believe',
  'many believe',
  'often understood',
  'interpreted as',
  'different views',
  'theological perspectives',
  'scholars disagree',
  'interpretations vary',
  'different interpretations',
  'differing views',
  'different traditions',
  'complex topic',
  'depends on tradition',
  'denominations differ',
  'many theologians',
];

function isFinalityTopic(topic) {
  if (!topic) return false;
  const key = String(topic).toLowerCase().replace(/\s+/g, '_');
  if (key === 'acts_10') return true;
  return FINALITY_STRICT_TOPICS.includes(key);
}

function containsFinalityViolation(text = '') {
  const lower = String(text).toLowerCase();
  for (const phrase of FINALITY_FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      return { failed: true, phrase };
    }
  }
  return { failed: false };
}

function stripFinalityViolations(text = '') {
  let out = String(text);
  for (const phrase of FINALITY_FORBIDDEN_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, '');
  }
  return out.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim();
}

function buildFinalityComposerInstruction(evidencePack = {}) {
  const topic = evidencePack.doctrineStrict?.strictTopic;
  if (!isFinalityTopic(topic)) return '';

  return [
    'DOCTRINE FINALITY MODE (MANDATORY):',
    'You may improve readability, warmth, and companion tone only.',
    'You may NOT rewrite doctrine conclusions, soften conclusions, add qualifiers, or add reconciliation language.',
    'Do not use: primarily, mainly, largely, often understood as, interpreted as, some believe, many believe.',
    'State approved doctrine conclusions directly from witnesses without hedging.',
    'Witness continuation requests are handled outside OpenAI — do not invent new verses.',
  ].join('\n');
}

function validateFinalityReply(text = '') {
  const violation = containsFinalityViolation(text);
  if (violation.failed) {
    return { passed: false, violations: [{ code: 'finality_forbidden_phrase', detail: violation.phrase }] };
  }
  return { passed: true, violations: [] };
}

module.exports = {
  FINALITY_STRICT_TOPICS,
  FINALITY_FORBIDDEN_PHRASES,
  isFinalityTopic,
  containsFinalityViolation,
  stripFinalityViolations,
  buildFinalityComposerInstruction,
  validateFinalityReply,
};
