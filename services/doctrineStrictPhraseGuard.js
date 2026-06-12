/**
 * Phase 4E — Global strict doctrine phrase guard (pre-user display).
 */

const { buildFinalAuthorityAnswer } = require('./doctrineFinalAuthorityEngine');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');

const GLOBAL_STRICT_FORBIDDEN = [
  'primarily',
  'mainly',
  'largely',
  'broader point',
  'central message',
  'while it mentions food',
  'while the vision involves food',
  'not just',
  'not solely',
  'dietary aspects',
  'part of the larger picture',
  'could also refer',
  'traditional jewish dietary laws',
  'jewish dietary law',
  'interpretations vary',
  'some believe',
  'many believe',
  'different traditions',
  'theological perspective',
  'theological perspectives',
  'complex topic',
  'soul continues',
  'continued existence after death',
  'memory after death',
  'challenges dietary',
  'challenges traditional',
  'larger picture',
  'inclusivity',
];

const ACTS10_WHILE_PATTERN = /\bwhile\b/i;

function findForbiddenPhrase(text = '', topic = '') {
  const lower = String(text).toLowerCase();
  for (const phrase of GLOBAL_STRICT_FORBIDDEN) {
    if (lower.includes(phrase)) {
      if (/should not use|you are right|do not use/i.test(lower) && phrase === 'primarily') continue;
      if (
        phrase === 'inclusivity' &&
        topic !== 'acts_10' &&
        topic !== 'dietary_law'
      ) {
        continue;
      }
      return phrase;
    }
  }
  if ((topic === 'acts_10' || topic === 'dietary_law') && ACTS10_WHILE_PATTERN.test(text)) {
    if (!/\bwhile i\b/i.test(text)) return 'while';
  }
  return null;
}

function validateStrictPhraseGuard(text = '', topic = '') {
  const phrase = findForbiddenPhrase(text, topic);
  if (phrase) {
    return { passed: false, phrase, violations: [{ code: 'forbidden_phrase', detail: phrase }] };
  }
  return { passed: true, violations: [] };
}

function repairStrictReply(text = '', topic = '', userId = '') {
  const check = validateStrictPhraseGuard(text, topic);
  if (check.passed) return { reply: text, repaired: false };

  const authority = buildFinalAuthorityAnswer({
    topic,
    contract: BASE_CONTRACTS[topic],
    userId,
  });
  if (authority?.reply) {
    return { reply: authority.reply, repaired: true, reason: check.phrase };
  }
  return { reply: text, repaired: false };
}

function enforceStrictPhraseGuard(structured = {}, topic = '', userId = '') {
  const repaired = repairStrictReply(structured.reply || '', topic, userId);
  if (repaired.repaired) {
    structured.reply = repaired.reply;
    structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'strict_phrase_guard_repair'])];
    structured.strictPhraseGuard = { repaired: true, phrase: repaired.reason };
  }
  return structured;
}

module.exports = {
  GLOBAL_STRICT_FORBIDDEN,
  findForbiddenPhrase,
  validateStrictPhraseGuard,
  repairStrictReply,
  enforceStrictPhraseGuard,
};
