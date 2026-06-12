/**
 * Normalize claims[] from OpenAI compose output or Claim Extractor v1.
 */

const { extractClaims } = require('./claimExtractor');

const SAFE_DENIAL_RE = /\bscripture does not state that directly\b/i;

function normalizeRef(ref = '') {
  return String(ref || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/–/g, '-')
    .trim();
}

function normalizeClaims(rawClaims = [], { reply = '', scripture = [], evidencePack = {} } = {}) {
  const claims = [];
  const list = Array.isArray(rawClaims) ? rawClaims : [];

  for (let i = 0; i < list.length; i += 1) {
    const item = list[i] || {};
    const claimText = String(item.claim || item.text || '').trim();
    if (!claimText) continue;

    const supportingScriptures = (item.supportingScriptures || item.citations || [])
      .map((r) => String(r || '').trim())
      .filter(Boolean);

    claims.push({
      claimId: String(item.claimId || `c${i + 1}`),
      claim: claimText,
      type: String(item.type || 'doctrine').toLowerCase(),
      supportingScriptures,
      sourceSentence: item.sourceSentence || null,
      confidence: String(item.confidence || 'medium').toLowerCase(),
      derivedFrom: item.derivedFrom || 'openai_claim',
    });
  }

  if (!claims.length && reply) {
    return extractClaims({ reply, scripture, evidencePack });
  }

  return claims;
}

function extractDoctrineConclusion(parsed = {}, claims = []) {
  if (parsed.doctrineConclusion) return String(parsed.doctrineConclusion).trim();
  const doctrineClaims = claims.filter((c) => c.type === 'doctrine');
  if (!doctrineClaims.length) return '';
  return doctrineClaims[doctrineClaims.length - 1].claim;
}

module.exports = {
  normalizeClaims,
  normalizeRef,
  extractDoctrineConclusion,
  SAFE_DENIAL_RE,
};
