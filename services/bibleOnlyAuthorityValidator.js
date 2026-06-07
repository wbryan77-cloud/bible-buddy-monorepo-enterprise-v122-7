/**
 * Bible-only authority validator — flags drift from approved evidence; triggers one regen max.
 */

const { validateScripturePolicy } = require('./scripturePolicyValidator');
const { collectApprovedReferences } = require('./approvedCatalogEvidence');

const BIBLE_ONLY_REGEN_HINT =
  'Answer again using only the approved Scripture evidence in the payload. Do not import common Christian tradition or pretrained afterlife assumptions. If Scripture does not directly state a claim, say: "Scripture does not state that directly." Use KJV references. For heavens/kingdom follow bindingRules.';

const AFFIRMATIVE_THIRD_HEAVEN = [
  /\b(yes|indeed|scripture (does )?say|the bible (does )?say|believers?)\b.{0,60}\b(go|ascend|enter)\b.{0,40}\b(third heaven|3rd heaven)\b/i,
  /\b(third heaven|3rd heaven)\b.{0,50}\b(is|are)\b.{0,30}\b(where|the place)\b.{0,30}\b(believers?|we go|you go)\b/i,
  /\bbelievers?\s+go\s+to\s+(the\s+)?third\s+heaven\b/i,
];

const CORINTHIANS_58_STANDALONE = [
  /\b2\s*cor(?:inthians)?\s*5:8\b.{0,120}\b(heaven|present with the lord|absent from the body)\b.{0,80}\b(at death|when we die|immediately|right away|upon death)\b/i,
  /\babsent from the body\b.{0,80}\b(present with the lord|means we go to heaven|go to heaven|in heaven now)\b/i,
  /\babsent from the body.{0,40}present with the lord\b.{0,60}\b(proves?|means?|shows?)\b.{0,40}\b(heaven at death|immediate)\b/i,
];

const TRADITION_AFTERLIFE = [
  /\b(most christians|christian tradition|popular belief|commonly taught)\b.{0,40}\b(heaven|afterlife|third heaven)\b/i,
  /\bwhen (you|we) die\b.{0,40}\b(you |we )?(go|enter|ascend)\b.{0,30}\b(heaven|third heaven|lord's presence)\b/i,
];

const DOCTRINE_INTENTS = new Set([
  'doctrine_explanation',
  'definition',
  'direct_yes_no',
  'meaning_word_study',
  'correction_repair',
]);

function isDoctrineTurn(evidencePack = {}) {
  const intent = evidencePack.currentIntent || '';
  if (DOCTRINE_INTENTS.has(intent)) return true;
  if (evidencePack.bibleOnlyMode) return true;
  return !!(evidencePack.evidenceCards?.cards?.length || evidencePack.approvedCatalogEvidence?.wired);
}

function detectAffirmativeThirdHeavenClaim(reply = '') {
  const text = String(reply || '');
  if (/\bscripture does not state\b/i.test(text) || /\bdoes not (say|teach)\b.{0,40}\b(believers?|third heaven)\b/i.test(text)) {
    return { detected: false, hits: [] };
  }
  const hits = AFFIRMATIVE_THIRD_HEAVEN.filter((p) => p.test(text)).map((p) => p.toString());
  return { detected: hits.length > 0, hits };
}

function detectCorinthians58Standalone(reply = '') {
  const text = String(reply || '');
  if (!/\b2\s*cor(?:inthians)?\s*5:8\b/i.test(text) && !/\babsent from the body\b/i.test(text)) {
    return { detected: false, hits: [] };
  }
  if (/\bnot\b.{0,30}\b(alone|by itself|standalone|only proof)\b/i.test(text)) return { detected: false, hits: [] };
  if (/\bcaution\b|\bwithout\b.{0,30}\bdeath\b|\bsleep in death\b/i.test(text)) return { detected: false, hits: [] };
  const hits = CORINTHIANS_58_STANDALONE.filter((p) => p.test(text)).map((p) => p.toString());
  return { detected: hits.length > 0, hits };
}

function detectTraditionAfterlife(reply = '', { bibleOnlyMode = false } = {}) {
  const text = String(reply || '');
  const hits = TRADITION_AFTERLIFE.filter((p) => p.test(text)).map((p) => p.toString());
  if (bibleOnlyMode && hits.length) return { detected: true, hits };
  return { detected: hits.length > 0, hits };
}

function normalizeRefToken(ref = '') {
  return String(ref || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/–/g, '-')
    .trim();
}

function replyCitesApprovedEvidence(reply = '', evidencePack = {}) {
  const text = String(reply || '').toLowerCase();
  const cards = (evidencePack.evidenceCards?.cards || []).map((c) => ({
    primaryScriptures: c.references?.primary || [],
    supportingScriptures: c.references?.supporting || [],
    cautionScriptures: c.cautionScriptures || [],
  }));
  const refs = collectApprovedReferences(evidencePack.approvedCatalogEvidence || {}, cards);
  if (!refs.length) return { cited: false, required: false, matched: [] };

  const matched = refs.filter((ref) => {
    const norm = normalizeRefToken(ref);
    const book = norm.split(/\s+\d/)[0];
    const chapterVerse = norm.match(/\d+:\d+/);
    if (chapterVerse && text.includes(chapterVerse[0])) return true;
    if (book && book.length > 2 && text.includes(book)) return true;
    return text.includes(norm);
  });

  return {
    cited: matched.length > 0,
    required: true,
    matched,
    totalApproved: refs.length,
  };
}

function detectCardContradiction(reply = '', evidencePack = {}) {
  const text = String(reply || '').toLowerCase();
  const issues = [];
  const cards = evidencePack.evidenceCards?.cards || [];

  for (const card of cards) {
    if (card.topic === 'heavens' || card.topic === 'kingdom') {
      if (/\bbelievers?\s+go\s+to\s+(the\s+)?third\s+heaven\b/i.test(text)) {
        issues.push('contradicts_heavens_card_boundary');
      }
      if (
        /\b(kingdom|new jerusalem)\b.{0,40}\b(only in heaven away from earth|leave earth forever)\b/i.test(text) &&
        !/\b(come down|on earth|with men)\b/i.test(text)
      ) {
        issues.push('contradicts_kingdom_on_earth');
      }
    }
  }

  return { detected: issues.length > 0, issues };
}

function validateBibleOnlyAuthority({
  reply = '',
  evidencePack = {},
  historyAllowed = false,
  message = '',
} = {}) {
  const scripturePolicy = validateScripturePolicy({
    reply,
    evidencePack,
    historyAllowed,
    message: message || evidencePack.userMessage || '',
  });

  const thirdHeavenAffirm = detectAffirmativeThirdHeavenClaim(reply);
  const cor58 = detectCorinthians58Standalone(reply);
  const tradition = detectTraditionAfterlife(reply, { bibleOnlyMode: evidencePack.bibleOnlyMode });
  const cardConflict = detectCardContradiction(reply, evidencePack);
  const evidenceCitation = replyCitesApprovedEvidence(reply, evidencePack);

  const issues = [...scripturePolicy.issues];
  if (thirdHeavenAffirm.detected) issues.push('affirmative_third_heaven_destination');
  if (cor58.detected) issues.push('corinthians_5_8_standalone_proof');
  if (tradition.detected) issues.push('tradition_afterlife_framing');
  if (cardConflict.detected) issues.push(...cardConflict.issues);
  if (isDoctrineTurn(evidencePack) && evidenceCitation.required && !evidenceCitation.cited) {
    issues.push('missing_approved_scripture_citation');
  }

  const adminFindings = {
    ...scripturePolicy.adminFindings,
    thirdHeavenAffirmative: thirdHeavenAffirm.hits,
    corinthians58Standalone: cor58.hits,
    traditionAfterlife: tradition.hits,
    cardContradiction: cardConflict.issues,
    evidenceCitation,
  };

  let regenHint = BIBLE_ONLY_REGEN_HINT;
  if (scripturePolicy.regenHint) regenHint = `${BIBLE_ONLY_REGEN_HINT} ${scripturePolicy.regenHint}`;

  return {
    passed: issues.length === 0,
    issues,
    adminFindings,
    regenHint,
    scripturePolicy,
    evidenceUsed: evidenceCitation.cited,
  };
}

module.exports = {
  BIBLE_ONLY_REGEN_HINT,
  validateBibleOnlyAuthority,
  detectAffirmativeThirdHeavenClaim,
  detectCorinthians58Standalone,
  replyCitesApprovedEvidence,
  isDoctrineTurn,
};
