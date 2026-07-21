/**
 * Phase 5S — Scripture Authority Engine.
 *
 * "Scripture interprets Scripture." A deterministic authority layer that
 * sits on top of the Phase 5P canonical Scripture provider and the Phase 5Q
 * grounded Scripture engine. It never generates or invents Scripture — it
 * only classifies and orders what was actually retrieved.
 *
 * Priority order for answering a Scripture question:
 *   1. Explicit Scripture      (the passage directly states the answer)
 *   2. Supporting Scripture    (additional passages retrieved alongside it)
 *   3. Related Scripture       (cross-references gathered by a curated
 *                                concept's witness list, e.g. Acts 10)
 *   4. Historical context      (only when Scripture itself is silent)
 *   5. Scripture is silent     (neither affirms nor denies the claim)
 */

const { isClaimSupportedByText } = require('./groundedScriptureEngine');
const {
  fetchCanonicalScriptureForReferences,
} = require('./canonicalScriptureProvider');

const AUTHORITY = {
  EXPLICITLY_SUPPORTED: 'EXPLICITLY_SUPPORTED',
  EXPLICITLY_CONTRADICTED: 'EXPLICITLY_CONTRADICTED',
  SUPPORTED_BY_MULTIPLE_PASSAGES: 'SUPPORTED_BY_MULTIPLE_PASSAGES',
  SCRIPTURE_IS_SILENT: 'SCRIPTURE_IS_SILENT',
  HISTORICAL_INFORMATION: 'HISTORICAL_INFORMATION',
};

// Minimal, explicit antonym pairs used ONLY to detect a genuine direct
// contradiction — Scripture stating the literal opposite of the claim.
// Never inferred beyond literal opposite-term presence in the retrieved
// text; anything less certain falls through to SCRIPTURE_IS_SILENT.
const CONTRADICTION_PAIRS = [
  ['clean', 'unclean'],
  ['lawful', 'unlawful'],
  ['permitted', 'forbidden'],
  ['righteous', 'unrighteous'],
  ['can eat', 'shall not eat'],
  ['may eat', 'shall not eat'],
  ['is saved', 'shall not be saved'],
];

function detectContradiction(claimText = '', retrievedTexts = []) {
  const claim = String(claimText || '').toLowerCase();
  const combined = retrievedTexts.join(' ').toLowerCase();
  for (const [a, b] of CONTRADICTION_PAIRS) {
    if (claim.includes(a) && combined.includes(b)) return true;
    if (claim.includes(b) && combined.includes(a)) return true;
  }
  return false;
}

// PHASE_5T — A claim can be false-as-stated without using a literal
// antonym: "Jesus ... blue eyes and fine straight hair" is contradicted by
// Revelation 1:14-15 because Scripture explicitly describes those SAME
// attributes (hair, eyes) with different, specific content ("white like
// wool", "as a flame of fire") — that is Scripture stating something
// contrary, not Scripture being silent. Detected only when the claim and
// the retrieved text both anchor on the same physical-attribute noun; the
// descriptor words actually used are then compared, never invented.
const ATTRIBUTE_NOUNS = [
  'hair', 'hairs', 'eye', 'eyes', 'foot', 'feet', 'skin', 'face', 'head', 'voice', 'hand', 'hands',
];
const STOP_WORDS = new Set([
  'the', 'that', 'this', 'and', 'with', 'was', 'were', 'his', 'her', 'its',
  'has', 'have', 'had', 'for', 'are', 'you', 'not', 'yes', 'says', 'said',
  'say', 'she', 'they', 'them', 'from', 'about', 'does', 'jesus',
]);

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function descriptorsAround(tokens, idx, radius = 3) {
  const window = [
    ...tokens.slice(Math.max(0, idx - radius), idx),
    ...tokens.slice(idx + 1, idx + 1 + radius),
  ];
  return new Set(
    window.filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !ATTRIBUTE_NOUNS.includes(w))
  );
}

function findDescriptiveAttributeContradiction(claimText = '', retrievedTexts = []) {
  const claimTokens = tokenize(claimText);
  const textTokens = tokenize(retrievedTexts.join(' '));

  for (const noun of ATTRIBUTE_NOUNS) {
    const claimIdx = claimTokens.indexOf(noun);
    const textIdx = textTokens.indexOf(noun);
    if (claimIdx === -1 || textIdx === -1) continue;

    const claimDescriptors = descriptorsAround(claimTokens, claimIdx);
    const textDescriptors = descriptorsAround(textTokens, textIdx);
    if (!claimDescriptors.size || !textDescriptors.size) continue;

    const overlap = [...claimDescriptors].some((w) => textDescriptors.has(w));
    if (!overlap) {
      return { noun, claimDescriptors: [...claimDescriptors], textDescriptors: [...textDescriptors] };
    }
  }
  return null;
}

/**
 * Classifies a claim-bearing explicit-Scripture answer (YES_NO / COMPARE
 * with an extracted claim) using ONLY the literal retrieved text.
 */
function classifyClaim({ claimText, successes = [] }) {
  if (!successes.length) return AUTHORITY.SCRIPTURE_IS_SILENT;
  const texts = successes.map((s) => s.text);
  if (detectContradiction(claimText, texts)) return AUTHORITY.EXPLICITLY_CONTRADICTED;
  if (findDescriptiveAttributeContradiction(claimText, texts)) return AUTHORITY.EXPLICITLY_CONTRADICTED;
  const supported = successes.every((r) => isClaimSupportedByText(claimText, r.text));
  return supported ? AUTHORITY.EXPLICITLY_SUPPORTED : AUTHORITY.SCRIPTURE_IS_SILENT;
}

/**
 * Classifies a plain-lookup (no claim to verify) explicit-Scripture answer
 * by how many independent passages were actually gathered.
 */
function classifyGathering({ successes = [] }) {
  if (!successes.length) return AUTHORITY.SCRIPTURE_IS_SILENT;
  return successes.length >= 2
    ? AUTHORITY.SUPPORTED_BY_MULTIPLE_PASSAGES
    : AUTHORITY.EXPLICITLY_SUPPORTED;
}

function quoteOne(s) {
  return `${s.reference} — "${s.text}" (${s.translation}).`;
}

function buildDirectAnswer({ classification, claimText, isJuxtaposition }) {
  switch (classification) {
    case AUTHORITY.EXPLICITLY_SUPPORTED:
      return claimText
        ? 'Yes — Scripture explicitly states that.'
        : 'Scripture speaks directly to this.';
    case AUTHORITY.EXPLICITLY_CONTRADICTED:
      return 'No — Scripture explicitly states the opposite of that.';
    case AUTHORITY.SUPPORTED_BY_MULTIPLE_PASSAGES:
      return isJuxtaposition
        ? 'Here are both passages, in Scripture’s own words, for comparison:'
        : 'Scripture answers this when the passages below are taken together.';
    case AUTHORITY.SCRIPTURE_IS_SILENT:
      return claimText
        ? 'No — Scripture does not explicitly state that.'
        : 'Scripture does not directly address this.';
    case AUTHORITY.HISTORICAL_INFORMATION:
      return 'Scripture is silent here; the following is documented history, not Scripture.';
    default:
      return '';
  }
}

function buildExplanation({ classification, successes = [], isJuxtaposition }) {
  if (classification === AUTHORITY.SUPPORTED_BY_MULTIPLE_PASSAGES && !isJuxtaposition && successes.length >= 2) {
    const refs = successes.map((s) => s.reference);
    const list =
      refs.length > 1
        ? `${refs.slice(0, -1).join(', ')} and ${refs[refs.length - 1]}`
        : refs[0];
    return `Taken together, ${list} give this answer; no single verse alone was treated as the full picture.`;
  }
  return null;
}

function toWitnessShape(s) {
  return {
    reference: s.reference,
    text: s.text,
    translation: s.translation,
    source: s.source,
  };
}

/**
 * PHASE_5T — Cross-references are gathered from a concept's own
 * `relatedConcepts` list (already curated by a concept author in
 * services/bibleConceptGraph.js) — never invented, and never counted as a
 * supporting witness for the claim, since a related concept addresses a
 * distinct proposition, not the same one. Each cross-reference's verse
 * text is retrieved live (never reference-only) and labeled with why it
 * is relevant.
 */
async function buildCrossReferencesForConcept(concept, usedWitnesses = []) {
  const relatedIds = Array.isArray(concept?.relatedConcepts) ? concept.relatedConcepts : [];
  const usedRefs = new Set(usedWitnesses.map((w) => w.reference));
  const candidates = [];

  if (relatedIds.length) {
    const { getGraphNode } = require('./bibleConceptGraph');
    for (const relatedId of relatedIds) {
      const node = getGraphNode(relatedId);
      const ref = node?.directWitnesses?.[0];
      if (!ref || usedRefs.has(ref) || candidates.some((c) => c.reference === ref)) continue;
      candidates.push({
        reference: ref,
        relatedConceptId: relatedId,
        relation: 'related_precept',
        reason: `Related precept (${String(relatedId).replace(/_/g, ' ')}) — provides parallel context, not counted as a supporting witness for this specific claim.`,
      });
    }
  }

  // PHASE_6D — governed IOG/ICOJ cross-references (services/iogIcojGovernedIngestion.js).
  // Additive only: these entered production evidence exclusively via the
  // deterministic, rules-engine AUTO_APPROVED path (same book+chapter as an
  // already-approved PRIMARY witness — never an AI judgment, never a raw
  // IOG/ICOJ claim). They are always labeled with their discovery source
  // and are never counted as a supporting witness for the claim, exactly
  // like the related-precept cross-references above.
  const topicId = concept?.strictTopic || concept?.id;
  if (topicId) {
    try {
      const { readApprovedCrossReferences } = require('./iogIcojGovernedIngestion');
      const governed = readApprovedCrossReferences({ topic: topicId });
      for (const g of governed) {
        if (!g.normalizedReference || usedRefs.has(g.extractedReference) || candidates.some((c) => c.reference === g.extractedReference)) continue;
        candidates.push({
          reference: g.extractedReference,
          relatedConceptId: null,
          relation: 'iog_icoj_cross_reference',
          discoverySource: g.discoverySource,
          sourceDocument: g.sourceDocument,
          reason: `Cross-reference discovered via ${g.discoverySource} source "${g.sourceDocument}"; ${g.supportingReason}`,
        });
      }
    } catch (_) {
      // Governed cross-reference store not available — never blocks the
      // base answer path, honest omission only.
    }
  }

  if (!candidates.length) return [];

  const fetched = await fetchCanonicalScriptureForReferences(candidates.map((c) => c.reference));
  return fetched
    .map((r, i) => ({ result: r, candidate: candidates[i] }))
    .filter(({ result }) => result.ok)
    .map(({ result, candidate }) => ({
      reference: result.reference,
      text: result.text,
      translation: result.translation,
      source: result.source,
      relation: candidate.relation,
      relatedConceptId: candidate.relatedConceptId,
      discoverySource: candidate.discoverySource || null,
      sourceDocument: candidate.sourceDocument || null,
      reason: candidate.reason,
    }));
}

/**
 * PHASE_5T — Stable witness result contract (Part 2). Never fabricates or
 * pads: if fewer than `requestedMinimum` independent witnesses were
 * actually retrieved, reports SINGLE_DIRECT_WITNESS / NO_VALID_WITNESS with
 * an honest `selectionReason` instead of inventing a second witness.
 */
async function buildWitnessResult({
  successes = [],
  failures = [],
  concept = null,
  requestedMinimum = 2,
} = {}) {
  if (!successes.length) {
    return {
      primaryWitness: null,
      supportingWitnesses: [],
      crossReferences: [],
      witnessStatus: 'NO_VALID_WITNESS',
      requestedMinimum,
      availableWitnessCount: 0,
      selectionReason: failures.length
        ? `No retrievable witness text for ${failures.map((f) => f.reference).join(', ')}.`
        : 'No Scripture reference was identified for this request.',
    };
  }

  const [primary, ...rest] = successes;
  const supporting = rest.filter(
    (s) => s.reference !== primary.reference && s.text !== primary.text
  );

  const witnessStatus = supporting.length >= 1 ? 'MULTIPLE_WITNESSES' : 'SINGLE_DIRECT_WITNESS';
  const selectionReason =
    supporting.length >= 1
      ? `Primary witness ${primary.reference} plus ${supporting.length} independent supporting witness(es) retrieved from live canonical text.`
      : `Only one direct witness (${primary.reference}) was validated; no additional independent witness was retrieved, so none was added.`;

  const crossReferences = await buildCrossReferencesForConcept(concept, [primary, ...supporting]);

  return {
    primaryWitness: toWitnessShape(primary),
    supportingWitnesses: supporting.map(toWitnessShape),
    crossReferences,
    witnessStatus,
    requestedMinimum,
    availableWitnessCount: 1 + supporting.length,
    selectionReason,
  };
}

function buildConclusion({ classification, isJuxtaposition }) {
  switch (classification) {
    case AUTHORITY.EXPLICITLY_CONTRADICTED:
      return 'Scripture stands as the final word on this.';
    case AUTHORITY.SUPPORTED_BY_MULTIPLE_PASSAGES:
      return isJuxtaposition
        ? null
        : 'These passages together, not any single verse in isolation, establish this answer.';
    case AUTHORITY.SCRIPTURE_IS_SILENT:
      return 'Scripture is silent on this specific detail.';
    default:
      return null;
  }
}

/**
 * PHASE_6 — Production Answer Lineage.
 *
 * Every Scripture-grounded production answer must expose internal lineage
 * so a reviewer (or a future audit) can trace exactly how the answer was
 * assembled — never a black box. This is purely additive: it is computed
 * FROM the same data already returned alongside it (classification,
 * witnessResult, concept), never a second, independent source of truth.
 * IOG/ICOJ can only ever appear here inside `discoverySources` — never as
 * `primaryWitness`/`supportingWitnesses`, which always trace back to
 * doctrine-authority/concept-graph provenance or direct canonical retrieval.
 */
function buildProductionAnswerLineage({
  classification,
  directAnswer,
  witnessResult,
  concept = null,
  retrievalMode = null,
  masterRoute = null,
  scriptureProvider = null,
} = {}) {
  const crossReferences = witnessResult?.crossReferences || [];
  const relationshipTypes = [
    ...new Set([
      witnessResult?.primaryWitness ? 'PRIMARY_WITNESS' : null,
      witnessResult?.supportingWitnesses?.length ? 'SUPPORTING_WITNESS' : null,
      ...crossReferences.map((c) => (c.discoverySource ? 'CROSS_REFERENCE' : c.relation === 'related_precept' ? 'RELATED_DOCTRINE' : 'CROSS_REFERENCE')),
    ].filter(Boolean)),
  ];

  const discoverySources = [
    ...new Set(crossReferences.map((c) => c.discoverySource).filter(Boolean)),
  ];

  const approvalDecisions = [
    ...new Set(
      crossReferences
        .filter((c) => c.discoverySource)
        .map(() => 'AUTO_APPROVED_CROSS_REFERENCE_RULES_ENGINE')
    ),
  ];

  const doctrineTopicIds = [
    ...new Set([
      concept?.strictTopic || concept?.id || null,
      concept?.authorityConceptId || null,
    ].filter(Boolean)),
  ];

  const evidenceIds = crossReferences
    .filter((c) => c.discoverySource)
    .map((c) => `xref::${c.reference}::${c.sourceDocument || 'unknown'}`);

  return {
    authorityClassification: classification || null,
    directAnswer: directAnswer || null,
    primaryWitness: witnessResult?.primaryWitness || null,
    supportingWitnesses: witnessResult?.supportingWitnesses || [],
    crossReferences,
    relationshipTypes,
    scriptureProvider:
      scriptureProvider || witnessResult?.primaryWitness?.source || null,
    originalLanguageSources: [],
    historicalSources: [],
    evidenceIds,
    doctrineTopicIds,
    discoverySources,
    approvalDecisions,
    retrievalMode: retrievalMode || null,
    masterRoute: masterRoute || null,
  };
}

/**
 * Builds the full authority-classified, ordered response for an explicit
 * Scripture request: classification -> direct answer -> primary Scripture
 * -> supporting Scripture -> brief explanation (derived only from what was
 * cited) -> conclusion. Never invents supporting passages; if only one
 * passage exists, only that passage is returned.
 */
async function buildAuthorityAnswer({
  intent,
  claimText,
  successes = [],
  failures = [],
  concept = null,
  requestedMinimum = 2,
  retrievalMode = null,
  masterRoute = null,
} = {}) {
  const witnessResult = await buildWitnessResult({ successes, failures, concept, requestedMinimum });

  if (!successes.length) {
    const missing = failures.map((f) => f.reference).join(', ') || 'that reference';
    return {
      classification: null,
      reply: `I could not find ${missing} in Scripture. Please double-check the reference — it does not appear to exist.`,
      primaryScripture: null,
      supportingScripture: [],
      ...witnessResult,
      lineage: buildProductionAnswerLineage({
        classification: null,
        directAnswer: null,
        witnessResult,
        concept,
        retrievalMode,
        masterRoute,
      }),
    };
  }

  const isJuxtaposition = intent === 'COMPARE' && !claimText;

  const classification = claimText
    ? classifyClaim({ claimText, successes })
    : classifyGathering({ successes });

  const [primary, ...rest] = successes;
  // Never duplicate Scripture: drop any supporting passage that repeats the
  // primary passage's reference or text.
  const supporting = rest.filter(
    (s) => s.reference !== primary.reference && s.text !== primary.text
  );

  const directAnswer = buildDirectAnswer({ classification, claimText, isJuxtaposition });
  const primaryLine = quoteOne(primary);
  const supportingLines = supporting.map(quoteOne);
  const explanation = buildExplanation({
    classification,
    successes: [primary, ...supporting],
    isJuxtaposition,
  });
  const conclusion = buildConclusion({ classification, isJuxtaposition });

  const failureNote = failures.length
    ? ` I could not find ${failures.map((f) => f.reference).join(', ')} in Scripture — please double-check that reference.`
    : '';

  const replyParts = [directAnswer, primaryLine, ...supportingLines, explanation, conclusion].filter(
    Boolean
  );

  return {
    classification,
    reply: (replyParts.join(' ') + failureNote).trim(),
    primaryScripture: {
      reference: primary.reference,
      text: primary.text,
      translation: primary.translation,
      source: primary.source,
    },
    supportingScripture: supporting.map((s) => ({
      reference: s.reference,
      text: s.text,
      translation: s.translation,
      source: s.source,
    })),
    ...witnessResult,
    lineage: buildProductionAnswerLineage({
      classification,
      directAnswer,
      witnessResult,
      concept,
      retrievalMode,
      masterRoute,
      scriptureProvider: primary.source || null,
    }),
  };
}

module.exports = {
  AUTHORITY,
  classifyClaim,
  classifyGathering,
  findDescriptiveAttributeContradiction,
  buildWitnessResult,
  buildAuthorityAnswer,
  buildProductionAnswerLineage,
};
