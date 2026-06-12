/**
 * Claim Extractor v1 — BibleBuddy-owned doctrine metadata from reply + scripture[].
 * Maps only; does not create doctrine content.
 */

const { buildApprovedEvidenceGraph } = require('./approvedEvidenceGraph');

const SAFE_DENIAL_RE = /\bscripture does not state that directly\b/i;

function normalizeRef(ref = '') {
  return String(ref || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/–/g, '-')
    .trim();
}

const REF_PATTERN =
  /\b(?:(?:[1-3]\s+)?[A-Z][A-Za-z]+(?:\s+(?:of|the)\s+[A-Z][A-Za-z]+)?)\s+\d{1,3}:\d{1,3}(?:\s*[-–]\s*\d{1,3})?/g;

const MIN_CLAIM_LEN = 12;

function segmentSentences(text = '') {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_CLAIM_LEN);
}

function extractRefsFromText(text = '') {
  const found = new Set();
  const str = String(text || '');
  let match;
  const re = new RegExp(REF_PATTERN.source, 'g');
  while ((match = re.exec(str)) !== null) {
    const ref = match[0].trim().replace(/\s+/g, ' ');
    if (ref.length > 4) found.add(ref);
  }
  return [...found];
}

function refsOverlap(a = '', b = '') {
  const na = normalizeRef(a).replace(/\./g, '');
  const nb = normalizeRef(b).replace(/\./g, '');
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const va = na.match(/(\d+:\d+(?:-\d+)?)/);
  const vb = nb.match(/(\d+:\d+(?:-\d+)?)/);
  if (!va || !vb || va[1] !== vb[1]) return false;
  const ba = na.replace(/\d+:\d+.*/, '').trim();
  const bb = nb.replace(/\d+:\d+.*/, '').trim();
  if (!ba || !bb) return false;
  return ba.includes(bb) || bb.includes(ba) || ba.split(' ')[0] === bb.split(' ')[0];
}

function buildRefCatalog(evidencePack = {}, scripture = []) {
  const graph = buildApprovedEvidenceGraph(evidencePack || {});
  const approved = [...(graph.refs || [])];
  const retrieval = (evidencePack?.scripture?.references || [])
    .map((r) => (typeof r === 'string' ? r : r.reference || r.ref || ''))
    .filter(Boolean);
  const witness = (scripture || [])
    .map((s) => s?.reference || s?.ref || '')
    .filter(Boolean);

  const catalog = [...new Set([...approved, ...retrieval, ...witness])];
  return { catalog, approved, graph };
}

function mapToCatalogRefs(extractedRefs = [], catalog = []) {
  const mapped = [];
  for (const raw of extractedRefs) {
    const hit = catalog.find((c) => refsOverlap(raw, c));
    mapped.push(hit || raw);
  }
  return [...new Set(mapped)];
}

function sentenceMentionsRef(sentence = '', ref = '') {
  if (!sentence || !ref) return false;
  if (sentence.toLowerCase().includes(ref.toLowerCase())) return true;
  return extractRefsFromText(sentence).some((r) => refsOverlap(r, ref));
}

function pickWitnessClaimText(witness = {}, sentences = []) {
  const reason = String(witness.reason || '').trim();
  const ref = String(witness.reference || witness.ref || '').trim();
  if (reason.length >= MIN_CLAIM_LEN) return { text: reason, sourceSentence: reason };
  const hit = sentences.find((s) => sentenceMentionsRef(s, ref));
  if (hit) return { text: hit, sourceSentence: hit };
  const text = String(witness.text || '').trim();
  if (text.length >= MIN_CLAIM_LEN) return { text, sourceSentence: hit || text };
  return null;
}

function claimConfidence(supportingScriptures = [], approved = []) {
  if (!supportingScriptures.length) return 'low';
  const hasApproved = supportingScriptures.some((r) => approved.some((a) => refsOverlap(r, a)));
  return hasApproved ? 'high' : 'medium';
}

function normalizeClaimText(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isDuplicateClaim(candidate = {}, existing = []) {
  const norm = normalizeClaimText(candidate.claim);
  return existing.some((c) => {
    if (normalizeClaimText(c.claim) === norm) return true;
    const overlap = (candidate.supportingScriptures || []).some((r) =>
      (c.supportingScriptures || []).some((cr) => refsOverlap(r, cr))
    );
    return overlap && norm.includes(normalizeClaimText(c.claim).slice(0, 40));
  });
}

/**
 * Extract claims from OpenAI reply + scripture[] witnesses.
 * @param {{ reply?: string, scripture?: Array, evidencePack?: object }} input
 */
function extractClaims({ reply = '', scripture = [], evidencePack = {} } = {}) {
  if (!reply || SAFE_DENIAL_RE.test(reply)) {
    return [];
  }

  const sentences = segmentSentences(reply);
  const { catalog, approved } = buildRefCatalog(evidencePack, scripture);
  const claims = [];
  const usedSentences = new Set();

  for (let i = 0; i < (scripture || []).length; i += 1) {
    const witness = scripture[i] || {};
    const ref = String(witness.reference || witness.ref || '').trim();
    const picked = pickWitnessClaimText(witness, sentences);
    if (!picked) continue;

    const supportingScriptures = ref ? mapToCatalogRefs([ref], catalog) : [];
    const candidate = {
      claimId: `c_witness_${i + 1}`,
      claim: picked.text,
      type: 'doctrine',
      supportingScriptures,
      sourceSentence: picked.sourceSentence,
      confidence: claimConfidence(supportingScriptures, approved),
      derivedFrom: 'scripture_witness',
    };
    if (!isDuplicateClaim(candidate, claims)) {
      claims.push(candidate);
      if (picked.sourceSentence) usedSentences.add(picked.sourceSentence);
    }
  }

  for (let i = 0; i < sentences.length; i += 1) {
    const sentence = sentences[i];
    if (usedSentences.has(sentence)) continue;

    const inlineRefs = extractRefsFromText(sentence);
    if (!inlineRefs.length) continue;

    const supportingScriptures = mapToCatalogRefs(inlineRefs, catalog);
    const candidate = {
      claimId: `c_sent_${claims.length + 1}`,
      claim: sentence,
      type: 'doctrine',
      supportingScriptures,
      sourceSentence: sentence,
      confidence: claimConfidence(supportingScriptures, approved),
      derivedFrom: 'sentence_ref',
    };
    if (!isDuplicateClaim(candidate, claims)) {
      claims.push(candidate);
    }
  }

  return claims.map((c, idx) => ({
    ...c,
    claimId: c.claimId || `c${idx + 1}`,
  }));
}

module.exports = {
  extractClaims,
  segmentSentences,
  extractRefsFromText,
  refsOverlap,
  mapToCatalogRefs,
  buildRefCatalog,
};
