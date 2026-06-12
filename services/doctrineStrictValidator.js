/**
 * Phase 4C.1 — Post-OpenAI doctrine strict validator.
 */

const { isYesNoDoctrineQuestion } = require('./doctrineAuthorityContract');
const { FINALITY_FORBIDDEN_PHRASES } = require('./doctrineFinalityMode');
const { ACTS10_FORBIDDEN, containsDriftVerses } = require('./doctrineFinalAuthorityEngine');

const SCRIPTURE_REF_PATTERN =
  /\b(?:1|2|3)?\s?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+(?::\d+(?:-\d+)?)?/gi;

const OBSERVED_DOCTRINE_PHRASES = [
  'observed relationship',
  'candidate relationship',
  'relationship graph',
  'vine network proves',
  'traceability index proves',
];

function normalizeRef(ref = '') {
  return String(ref)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/first\s+/i, '1 ')
    .replace(/second\s+/i, '2 ')
    .replace(/third\s+/i, '3 ')
    .trim();
}

function refMatchesWitness(citedRef, witnessList = []) {
  const cited = normalizeRef(citedRef);
  for (const w of witnessList) {
    const witness = normalizeRef(w);
    if (cited.includes(witness) || witness.includes(cited)) return true;
    const citedBook = cited.split(/\s+/).slice(0, 2).join(' ');
    const witnessBook = witness.split(/\s+/).slice(0, 2).join(' ');
    if (citedBook && witnessBook && citedBook === witnessBook) return true;
  }
  return false;
}

function extractScriptureRefs(text = '') {
  const matches = String(text).match(SCRIPTURE_REF_PATTERN) || [];
  return [...new Set(matches.map((m) => m.trim()))];
}

function countApprovedWitnessesInText(text, approvedWitnesses = [], supportingWitnesses = []) {
  const all = [...approvedWitnesses, ...supportingWitnesses];
  let count = 0;
  const cited = extractScriptureRefs(text);
  for (const ref of cited) {
    if (refMatchesWitness(ref, all)) count += 1;
  }
  if (count === 0) {
    for (const w of all) {
      const book = normalizeRef(w).split(':')[0];
      if (book && String(text).toLowerCase().includes(book)) count += 1;
    }
  }
  return count;
}

function usesCautionAsPrimaryProof(text = '', cautionWitnesses = [], topic = '') {
  const lower = String(text).toLowerCase();
  for (const caution of cautionWitnesses) {
    const c = normalizeRef(caution);
    if (!lower.includes(c.split(':')[0])) continue;

    const proofPatterns = [
      /\bprove(s|d)?\b/i,
      /\bshows?\b/i,
      /\bproof\b/i,
      /\bdemonstrates?\b/i,
      /\bconfirms?\b/i,
      /\baware\b/i,
      /\bmemory\b/i,
      /\bconscious\b/i,
    ];

    if (topic === 'death_state' && /luke\s*16/.test(lower)) {
      if (
        /\b(memory|aware|conscious|know|remember|torment|rich man)\b/i.test(lower) &&
        !/\b(parable|caution|not proof|does not prove|not primary)\b/i.test(lower)
      ) {
        return { failed: true, reason: 'Luke 16 used as primary proof of conscious memory after death' };
      }
    }

    if (proofPatterns.some((p) => p.test(lower)) && !/\bnot proof|caution|parable only|does not prove\b/i.test(lower)) {
      return { failed: true, reason: `Caution witness ${caution} used as primary doctrine proof` };
    }
  }
  return { failed: false };
}

function citesOutsideApproved(text = '', approved = [], supporting = [], caution = []) {
  const cited = extractScriptureRefs(text);
  const allowed = [...approved, ...supporting, ...caution];
  const outside = [];
  for (const ref of cited) {
    if (!refMatchesWitness(ref, allowed)) outside.push(ref);
  }
  return outside;
}

function containsForbiddenPhrase(text = '', forbiddenPhrases = []) {
  const lower = String(text).toLowerCase();
  for (const phrase of forbiddenPhrases) {
    if (lower.includes(String(phrase).toLowerCase())) {
      return { failed: true, phrase };
    }
  }
  return { failed: false };
}

function containsProhibitedClaim(text = '', prohibitedClaims = []) {
  const lower = String(text).toLowerCase();
  for (const claim of prohibitedClaims) {
    if (lower.includes(String(claim).toLowerCase())) {
      return { failed: true, claim };
    }
  }
  return { failed: false };
}

function checkYesNoDirectness(text = '', message = '', required = false) {
  if (!required && !isYesNoDoctrineQuestion(message)) return { failed: false };
  const trimmed = String(text).trim();
  if (/^yes[,.!:\s]/i.test(trimmed)) return { failed: false };
  if (/^no[,.!:\s]/i.test(trimmed)) return { failed: false };
  return { failed: true, reason: 'Yes/no doctrine question must begin with Yes, or No,' };
}

const DEATH_STATE_DRIFT_PATTERNS = [
  /\bsoul continues\b/i,
  /\bconscious existence after death\b/i,
  /\bcontinued existence after death\b/i,
  /\babsent from the body\b/i,
  /\bmemory after death\b/i,
  /\b2\s*corinthians\s*5:?\s*8\b/i,
  /\b2\s*cor\s*5:?\s*8\b/i,
  /\bphilippians\s*1:?\s*21\b/i,
  /\bphil\s*1:?\s*21\b/i,
];

const ACTS10_HEDGE_PATTERNS = [
  /\bprimarily\b/i,
  /\bmainly\b/i,
  /\blargely\b/i,
  /\bbroader point\b/i,
  /\bnot just about dietary\b/i,
  /\bnot solely about dietary\b/i,
  /\bwhile the vision involves food\b/i,
  /\bdietary aspects are part of\b/i,
  /\bit could also refer to food\b/i,
  /\bdietary laws are part of the conversation\b/i,
  /\bsignificant\b/i,
];

function checkDeathStateDrift(text = '') {
  const lower = String(text).toLowerCase();
  for (const re of DEATH_STATE_DRIFT_PATTERNS) {
    if (re.test(lower)) return { failed: true, reason: `death_state drift: ${re.source}` };
  }
  if (/\bluke\s*16\b/.test(lower) && /\b(prove|proof|memory|conscious|aware)\b/i.test(lower)) {
    return { failed: true, reason: 'Luke 16 as primary death_state proof' };
  }
  return { failed: false };
}

function checkActs10Hedging(text = '', topic = '') {
  if (topic !== 'acts_10' && topic !== 'dietary_law') return { failed: false };
  const lower = String(text).toLowerCase();
  for (const re of ACTS10_HEDGE_PATTERNS) {
    if (re.test(lower)) return { failed: true, reason: `Acts 10 hedge: ${re.source}` };
  }
  return { failed: false };
}

function contradictsRequiredConclusion(text = '', requiredConclusion = '', topic = '') {
  const lower = String(text).toLowerCase();
  if (topic === 'death_state') {
    const drift = checkDeathStateDrift(text);
    if (drift.failed) return drift;
    if (
      /\b(dead (are|people are) (awake|conscious|aware)|immediate (heaven|torment)|know nothing is wrong|dead know everything)\b/i.test(lower)
    ) {
      return { failed: true, reason: 'Contradicts death_state required conclusion' };
    }
  }
  if (topic === 'acts_10' || topic === 'dietary_law') {
    const hedge = checkActs10Hedging(text, topic);
    if (hedge.failed) return hedge;
  }
  if (topic === 'dietary_law') {
    if (
      /\b(we can eat pork|pork is clean|shrimp is clean|acts 10 (allows|permits|means we can eat))\b/i.test(lower) &&
      !/\bnot\b/i.test(lower.slice(0, lower.indexOf('pork') || lower.length))
    ) {
      return { failed: true, reason: 'Contradicts dietary_law required conclusion' };
    }
  }
  if (requiredConclusion && lower.length > 20) {
    const keywords = requiredConclusion
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 4)
      .slice(0, 6);
    const hits = keywords.filter((k) => lower.includes(k));
    if (hits.length < 2 && topic !== 'death_state') {
      return { failed: true, reason: 'Answer does not align with required conclusion keywords' };
    }
  }
  return { failed: false };
}

function treatsRelationshipAsDoctrine(text = '') {
  const lower = String(text).toLowerCase();
  for (const phrase of OBSERVED_DOCTRINE_PHRASES) {
    if (lower.includes(phrase)) {
      return { failed: true, reason: `Treats relationship graph as doctrine: ${phrase}` };
    }
  }
  return { failed: false };
}

function validateDoctrineStrictReply({
  reply = '',
  message = '',
  evidencePack = {},
  structured = {},
  attempt = 1,
} = {}) {
  const ds = evidencePack.doctrineStrict;
  if (!ds?.enabled) {
    return { passed: true, skipped: true, violations: [] };
  }

  const contract = ds.contract || ds;
  const text =
    structured?.finalAnswer ||
    structured?.directAnswer ||
    structured?.reply ||
    reply ||
  '';
  const violations = [];

  const forbiddenList = [
    ...new Set([
      ...(contract.forbiddenPhrases || ds.forbiddenPhrases || []),
      ...FINALITY_FORBIDDEN_PHRASES,
    ]),
  ];
  const forbidden = containsForbiddenPhrase(text, forbiddenList);
  if (forbidden.failed) violations.push({ code: 'forbidden_phrase', detail: forbidden.phrase });

  const caution = usesCautionAsPrimaryProof(text, contract.cautionWitnesses || ds.cautionWitnesses, contract.topic);
  if (caution.failed) violations.push({ code: 'caution_as_proof', detail: caution.reason });

  const prohibited = containsProhibitedClaim(text, contract.prohibitedClaims || []);
  if (prohibited.failed) violations.push({ code: 'prohibited_claim', detail: prohibited.claim });

  const outside = citesOutsideApproved(
    text,
    contract.approvedWitnesses || ds.approvedWitnesses,
    contract.supportingWitnesses || [],
    contract.cautionWitnesses || ds.cautionWitnesses,
  );
  const strictInventory = contract.primaryWitnessesOnly || contract.topic === 'acts_10';
  const outsideLimit = strictInventory ? 0 : 2;
  if (outside.length > outsideLimit) {
    violations.push({ code: 'outside_scripture', detail: outside.join(', ') });
  }

  const deathDrift = contract.topic === 'death_state' ? checkDeathStateDrift(text) : { failed: false };
  if (deathDrift.failed) violations.push({ code: 'death_state_drift', detail: deathDrift.reason });

  const actsHedge = checkActs10Hedging(text, contract.topic);
  if (actsHedge.failed) violations.push({ code: 'acts10_hedge', detail: actsHedge.reason });

  if (contract.topic === 'acts_10' || contract.topic === 'dietary_law') {
    for (const phrase of ACTS10_FORBIDDEN) {
      if (text.toLowerCase().includes(phrase)) {
        violations.push({ code: 'acts10_forbidden_phrase', detail: phrase });
        break;
      }
    }
  }

  const drift = containsDriftVerses(text, [
    ...(contract.approvedWitnesses || ds.approvedWitnesses || []),
    ...(contract.supportingWitnesses || []),
  ]);
  if (drift.blocked) violations.push({ code: 'drift_verse', detail: drift.verse });

  const witnessCount = countApprovedWitnessesInText(
    text,
    contract.approvedWitnesses || ds.approvedWitnesses,
    contract.supportingWitnesses || [],
  );
  const min = contract.minimumWitnessCount || ds.minimumWitnessCount || 2;
  if (witnessCount < min && !contract.singleWitnessAllowed) {
    violations.push({
      code: 'insufficient_witnesses',
      detail: `Found ${witnessCount}, required ${min}`,
    });
  }

  const yesNo = checkYesNoDirectness(
    text,
    message,
    contract.yesNoDirectnessRequired || ds.yesNoDirectnessRequired,
  );
  if (yesNo.failed) violations.push({ code: 'yes_no_directness', detail: yesNo.reason });

  const contradict = contradictsRequiredConclusion(text, contract.requiredConclusion, contract.topic);
  if (contradict.failed) violations.push({ code: 'contradicts_conclusion', detail: contradict.reason });

  const relDoctrine = treatsRelationshipAsDoctrine(text);
  if (relDoctrine.failed) violations.push({ code: 'relationship_as_doctrine', detail: relDoctrine.reason });

  if (contract.topic === 'death_state' && /\bluke\s*16\b/i.test(text) && witnessCount < min) {
    violations.push({ code: 'luke16_without_witnesses', detail: 'Luke 16 cited without sufficient approved witnesses' });
  }

  return {
    passed: violations.length === 0,
    violations,
    witnessCount,
    attempt,
    strictTopic: contract.topic,
    textSample: text.slice(0, 200),
  };
}

module.exports = {
  extractScriptureRefs,
  countApprovedWitnessesInText,
  validateDoctrineStrictReply,
  containsForbiddenPhrase,
  usesCautionAsPrimaryProof,
};
