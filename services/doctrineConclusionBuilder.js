/**
 * Derive doctrineConclusion from BibleBuddy-extracted claims — no OpenAI.
 */

const { SAFE_DENIAL_RE } = require('./claimNormalizer');

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };

function rankConfidence(confidence = 'low') {
  return CONFIDENCE_RANK[String(confidence).toLowerCase()] || 1;
}

/**
 * Build one-sentence doctrine conclusion from extracted claims.
 * @param {Array} claims
 * @param {{ reply?: string }} options
 */
function buildDoctrineConclusion(claims = [], { reply = '' } = {}) {
  const doctrine = (claims || []).filter(
    (c) => (c.type === 'doctrine' || c.type === 'clarification') && String(c.claim || '').trim()
  );
  if (!doctrine.length) return '';

  const ranked = [...doctrine].sort((a, b) => {
    const conf = rankConfidence(b.confidence) - rankConfidence(a.confidence);
    if (conf !== 0) return conf;
    const refs = (b.supportingScriptures || []).length - (a.supportingScriptures || []).length;
    if (refs !== 0) return refs;
    return String(a.claim).length - String(b.claim).length;
  });

  let conclusion = String(ranked[0].claim || '').trim();
  if (conclusion.length > 220) {
    const firstSentence = conclusion.split(/(?<=[.!?])\s+/)[0] || conclusion;
    conclusion = firstSentence.trim();
  }

  if (SAFE_DENIAL_RE.test(reply) && !SAFE_DENIAL_RE.test(conclusion)) {
    conclusion = conclusion.replace(/\s*[.!?]?\s*$/, '.');
  }

  return conclusion;
}

module.exports = {
  buildDoctrineConclusion,
  rankConfidence,
};
