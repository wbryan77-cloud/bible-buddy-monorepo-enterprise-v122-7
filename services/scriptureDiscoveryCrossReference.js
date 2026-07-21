/**
 * Scripture Discovery Cross-Reference — read-only against approved evidence.
 * Does not modify cards, support graph, or answers.
 */

const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { buildApprovedCatalogEvidence, collectApprovedReferences } = require('./approvedCatalogEvidence');
const { getSeedConcordanceIndex } = require('./concordanceFoundation');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { refInApprovedList, refMatchesApproved } = require('./scriptureReferenceNormalizer');

const TOPIC_ALIASES = {
  sabbath: 'sabbath',
  dietary_law: 'dietary_law',
  dietaryLaw: 'dietary_law',
  death_state: 'death_state',
  deathState: 'death_state',
  kingdom: 'kingdom',
  heavens: 'heavens',
  holiness: 'holiness',
  messiah_logos: 'messiah_logos',
  messiahLogos: 'messiah_logos',
};

function normalizeTopic(topic = '') {
  return TOPIC_ALIASES[topic] || topic || null;
}

function buildApprovedIndex() {
  const cards = getAllApprovedCards();
  const edges = getAllApprovedSupportEdges();
  const continuity = loadContinuityChains().chains || [];
  const concordance = getSeedConcordanceIndex();

  const cardRefsByTopic = {};
  const allCardRefs = new Set();
  for (const card of cards) {
    const refs = [...(card.primaryScriptures || []), ...(card.supportingScriptures || [])];
    cardRefsByTopic[card.topic] = refs;
    refs.forEach((r) => allCardRefs.add(r));
  }

  const edgeRefs = new Set();
  const edgeByRef = {};
  for (const edge of edges) {
    for (const ref of edge.scriptures || []) {
      edgeRefs.add(ref);
      if (!edgeByRef[ref]) edgeByRef[ref] = [];
      edgeByRef[ref].push(edge.id);
    }
  }

  const continuityByTopic = {};
  for (const chain of continuity) {
    if (!chain.approved) continue;
    continuityByTopic[chain.topic] = (chain.nodes || []).map((n) => n.reference);
  }

  return { cards, edges, continuity, concordance, cardRefsByTopic, allCardRefs, edgeRefs, edgeByRef, continuityByTopic };
}

/**
 * Cross-reference a discovery candidate against frozen approved evidence.
 */
function crossReferenceCandidate({
  question = '',
  scriptures = [],
  scriptureOrder = [],
  topic = null,
  candidateConclusion = '',
} = {}) {
  const idx = buildApprovedIndex();
  const normTopic = normalizeTopic(topic);
  const ordered = scriptureOrder.length ? scriptureOrder : scriptures;
  const crossReferences = [];
  const concordanceLinks = [];

  let refsOnCard = 0;
  let refsOnEdge = 0;
  let refsOnContinuity = 0;
  let refsOnCatalog = 0;

  const topicCardRefs = normTopic ? idx.cardRefsByTopic[normTopic] || [] : [];
  const topicContinuityRefs = normTopic ? idx.continuityByTopic[normTopic] || [] : [];

  const catalog = normTopic
    ? buildApprovedCatalogEvidence({ topic: normTopic, cardTopics: [normTopic] })
    : { chains: [] };
  const catalogRefs = collectApprovedReferences(catalog, idx.cards.filter((c) => c.topic === normTopic));

  for (const ref of scriptures) {
    const onCard = topicCardRefs.some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));
    const onAnyCard = [...idx.allCardRefs].some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));
    const onEdge = [...idx.edgeRefs].some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));
    const onContinuity = topicContinuityRefs.some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));
    const onCatalog = catalogRefs.some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));

    if (onCard) refsOnCard += 1;
    if (onEdge) refsOnEdge += 1;
    if (onContinuity) refsOnContinuity += 1;
    if (onCatalog) refsOnCatalog += 1;

    const edgeIds = [];
    for (const [edgeRef, ids] of Object.entries(idx.edgeByRef)) {
      if (refMatchesApproved(ref, edgeRef) || refInApprovedList(ref, [edgeRef])) {
        edgeIds.push(...ids);
      }
    }

    crossReferences.push({
      ref,
      onFrozenCard: onCard,
      onAnyFrozenCard: onAnyCard,
      onSupportGraph: onEdge,
      supportGraphEdgeIds: [...new Set(edgeIds)],
      onContinuityChain: onContinuity,
      onCatalogChain: onCatalog,
    });
  }

  for (const entry of idx.concordance) {
    const topicHit = normTopic && (entry.linkedTopics || []).includes(normTopic);
    const refHit = scriptures.some((ref) =>
      (entry.occurrences || []).some((o) => refMatchesApproved(ref, o) || refInApprovedList(ref, [o]))
    );
    if (topicHit || refHit) {
      concordanceLinks.push({
        strongsId: entry.strongsId,
        lemma: entry.lemma,
        gloss: entry.gloss,
        linkedTopics: entry.linkedTopics,
      });
    }
  }

  const total = scriptures.length || 1;
  const supportScore = Math.round(
    ((refsOnCard / total) * 40 +
      (refsOnEdge / total) * 35 +
      (refsOnContinuity / total) * 15 +
      (refsOnCatalog / total) * 10) *
      10
  ) / 10;

  let approvalStatus = 'unsupported';
  if (refsOnCard === total && refsOnEdge >= total * 0.5) {
    approvalStatus = 'already_approved';
  } else if (refsOnCard > 0 || refsOnEdge > 0) {
    approvalStatus = 'partially_approved';
  } else if (refsOnContinuity > 0 || refsOnCatalog > 0) {
    approvalStatus = 'new_relationship';
  } else if (scriptures.length === 0) {
    approvalStatus = 'unsupported';
  }

  return {
    approvalStatus,
    crossReferences,
    concordanceLinks,
    supportScore,
    metrics: {
      refsOnCard,
      refsOnEdge,
      refsOnContinuity,
      refsOnCatalog,
      totalRefs: scriptures.length,
    },
    question,
    scripturesCited: scriptures,
    scriptureOrder: ordered,
    topic: normTopic,
    candidateConclusion,
  };
}

module.exports = {
  buildApprovedIndex,
  crossReferenceCandidate,
  normalizeTopic,
};
