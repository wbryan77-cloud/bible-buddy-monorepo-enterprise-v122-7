/**
 * Phase 2J-H — Question to Scripture Recovery Engine.
 * Recovers candidate scripture chains for questions without extracted refs.
 * Discovery only — no promotion, no production mutation.
 */

const fs = require('fs');
const path = require('path');
const { runExpandedScriptureDiscovery } = require('./expandedScriptureDiscovery');
const { buildApprovedIndex, crossReferenceCandidate, normalizeTopic } = require('./scriptureDiscoveryCrossReference');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { buildApprovedCatalogEvidence, collectApprovedReferences } = require('./approvedCatalogEvidence');
const { getSeedConcordanceIndex } = require('./concordanceFoundation');
const { detectContradictions } = require('./scriptureDiscoveryGenesisRevelation');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');

const TOPIC_KEYWORDS = {
  sabbath: /\b(sabbath|seventh day|saturday|hebrews 4)\b/i,
  death_state: /\b(dead|death|die|died|grave|resurrection|sleep|soul|grieving|grief)\b/i,
  dietary_law: /\b(pork|eat|clean|unclean|acts 10|acts 11|leviticus 11)\b/i,
  holiness: /\b(holy|holiness|sanctif)\b/i,
  messiah_logos: /\b(logos|word of god|john 1)\b/i,
  kingdom: /\b(kingdom|thy kingdom come|new jerusalem)\b/i,
  heavens: /\b(heaven|heavens|third heaven|firmament)\b/i,
  feasts: /\b(feast|passover|pentecost|leviticus 23)\b/i,
  emotional: /\b(grieving|grief|pain|suffering|abandoned|angry|worried|overwhelmed)\b/i,
};

const BOOK_ORDER = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
  '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra',
  'nehemiah', 'esther', 'job', 'psalm', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon',
  'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah',
  'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
  'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1 corinthians', '2 corinthians',
  'galatians', 'ephesians', 'philippians', 'colossians', '1 thessalonians', '2 thessalonians',
  '1 timothy', '2 timothy', 'titus', 'philemon', 'hebrews', 'james', '1 peter', '2 peter',
  '1 john', '2 john', '3 john', 'jude', 'revelation',
];

function inferTopic(question = '') {
  const q = String(question);
  for (const [topic, re] of Object.entries(TOPIC_KEYWORDS)) {
    if (re.test(q)) return topic;
  }
  return 'open_topic';
}

function normalizeKey(q = '') {
  return String(q).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function bookIndex(ref = '') {
  const kjv = verifyKjvReference(ref);
  if (!kjv.valid) return 999;
  const idx = BOOK_ORDER.indexOf(kjv.book);
  return idx >= 0 ? idx : 500;
}

function sortCanonically(refs = []) {
  return [...refs].sort((a, b) => bookIndex(a) - bookIndex(b));
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const r of refs) {
    const k = String(r).toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function searchTopicG2R(scriptures = [], scriptureOrder = [], mappedTopic = null) {
  const continuity = loadContinuityChains().chains || [];
  const topicChain = mappedTopic
    ? continuity.find((c) => c.topic === mappedTopic && c.approved)
    : null;

  if (!topicChain?.nodes?.length) {
    const directGenesis = scriptures.some((r) => /^genesis/i.test(r));
    const directRevelation = scriptures.some((r) => /^revelation/i.test(r));
    return {
      parallelWitnesses: [],
      genesisAnchors: [],
      revelationAnchors: [],
      g2rChainCandidate: scriptureOrder.length ? scriptureOrder : scriptures,
      genesisToRevelationSpan: directGenesis && directRevelation,
    };
  }

  const chainRefs = (topicChain.nodes || []).map((n) => n.reference);
  const cited = new Set(scriptures.map((r) => r.toLowerCase()));
  const parallelWitnesses = chainRefs.filter((r) => !cited.has(r.toLowerCase()));
  const genesisAnchors = chainRefs.filter((r) => /^genesis/i.test(r) && !cited.has(r.toLowerCase())).slice(0, 2);
  const revelationAnchors = chainRefs.filter((r) => /^revelation/i.test(r) && !cited.has(r.toLowerCase())).slice(0, 2);
  const order = scriptureOrder.length ? scriptureOrder : scriptures;
  const g2rChainCandidate = uniqueRefs([...genesisAnchors, ...order, ...revelationAnchors]);
  const genesisToRevelationSpan = g2rChainCandidate.some((r) => /^genesis/i.test(r))
    && g2rChainCandidate.some((r) => /^revelation/i.test(r));

  return {
    parallelWitnesses,
    genesisAnchors,
    revelationAnchors,
    g2rChainCandidate,
    genesisToRevelationSpan,
  };
}

function matchEdgesToQuestion(question = '', topic = null) {
  const norm = normalizeTopic(topic) || topic;
  const q = String(question);
  const edges = getAllApprovedSupportEdges();
  const matched = [];

  for (const edge of edges) {
    if (norm && edge.topic !== norm) continue;
    const patternHit = (edge.claimPatterns || []).some((p) => p.test(q));
    if (patternHit || !norm) {
      matched.push(edge);
    }
  }

  return matched;
}

function buildRecoveryPool(expandedResult) {
  const seen = new Set();
  const pool = [];

  for (const q of expandedResult.questions) {
    if ((q.scripturesCited || []).length > 0) continue;
    const key = normalizeKey(q.question);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    pool.push({
      question: q.question,
      topic: q.topic || inferTopic(q.question),
      discoveredTopic: q.discoveredTopic,
      source: q.source,
      sourceType: q.sourceType,
      frequency: q.frequency || 1,
      answerSummary: q.answerSummary || q.conclusion || '',
      scripturesCited: [],
    });
  }

  return pool;
}

function recoverScripturesForQuestion(item) {
  const question = item.question;
  const topic = inferTopic(question);
  const mappedTopic = normalizeTopic(topic) || (topic !== 'open_topic' ? topic : null);
  const cards = getAllApprovedCards();
  const card = mappedTopic ? cards.find((c) => c.topic === mappedTopic) : null;

  const witnesses = [];
  const witnessSources = [];

  if (card) {
    for (const ref of [...(card.primaryScriptures || []), ...(card.supportingScriptures || [])]) {
      witnesses.push(ref);
      witnessSources.push({ ref, source: 'evidence_card', cardId: card.cardId });
    }
  }

  const catalog = buildApprovedCatalogEvidence({
    topic: mappedTopic,
    message: question,
    cardTopics: card ? [card.cardId] : [],
  });
  for (const ref of collectApprovedReferences(catalog, card ? [card] : [])) {
    witnesses.push(ref);
    witnessSources.push({ ref, source: 'catalog_chain' });
  }

  const continuity = loadContinuityChains().chains || [];
  const topicChain = continuity.find((c) => c.topic === mappedTopic && c.approved);
  if (topicChain) {
    for (const node of topicChain.nodes || []) {
      witnesses.push(node.reference);
      witnessSources.push({ ref: node.reference, source: 'continuity_chain', theme: node.theme });
    }
  }

  for (const edge of matchEdgesToQuestion(question, mappedTopic)) {
    for (const ref of edge.scriptures || []) {
      witnesses.push(ref);
      witnessSources.push({ ref, source: 'support_graph', edgeId: edge.id });
    }
  }

  const concordance = getSeedConcordanceIndex();
  for (const entry of concordance) {
    const topicHit = mappedTopic && (entry.linkedTopics || []).includes(mappedTopic);
    const gloss = String(entry.gloss || '').trim();
    const textHit = gloss.length > 2 && new RegExp(`\\b${gloss.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(question);
    if (topicHit || textHit) {
      for (const ref of entry.occurrences || []) {
        witnesses.push(ref);
        witnessSources.push({ ref, source: 'concordance', strongsId: entry.strongsId });
      }
    }
  }

  const primaryWitnesses = uniqueRefs(witnesses).filter((r) => verifyKjvReference(r).valid);
  let candidateScriptures = primaryWitnesses;
  let candidateOrder = sortCanonically(candidateScriptures);

  if (primaryWitnesses.length > 0) {
    const g2r = searchTopicG2R(candidateScriptures, candidateOrder, mappedTopic);
    for (const ref of g2r.parallelWitnesses || []) {
      if (!verifyKjvReference(ref).valid) continue;
      witnesses.push(ref);
      witnessSources.push({ ref, source: 'g2r_witness' });
    }
    candidateScriptures = uniqueRefs(witnesses).filter((r) => verifyKjvReference(r).valid);
    candidateOrder = sortCanonically(candidateScriptures);
  }

  const g2r = searchTopicG2R(candidateScriptures, candidateOrder, mappedTopic);

  let candidateConclusion = '';
  if (card?.bibleFirstConclusion) {
    candidateConclusion = `[Recovery candidate] ${card.bibleFirstConclusion}`;
  } else if (topicChain?.nodes?.length) {
    const themes = topicChain.nodes.map((n) => n.theme).filter(Boolean).slice(0, 3);
    candidateConclusion = `[Recovery candidate] Scripture witnesses suggest: ${themes.join(', ')} (admin review required)`;
  } else if (candidateScriptures.length) {
    candidateConclusion = `[Recovery candidate] Approved evidence suggests reviewing ${candidateScriptures.slice(0, 3).join(', ')} for this question.`;
  } else {
    candidateConclusion = '[Recovery candidate] No approved scripture witnesses found — future research.';
  }

  const crossRef = crossReferenceCandidate({
    question,
    scriptures: candidateScriptures.slice(0, 8),
    scriptureOrder: candidateOrder.slice(0, 8),
    topic: mappedTopic,
    candidateConclusion,
  });

  const contradictions = detectContradictions(mappedTopic, candidateScriptures, candidateConclusion);
  const g2rSpan = g2r.genesisToRevelationSpan;

  const continuityMatched = topicChain
    ? (topicChain.nodes || []).filter((n) =>
      candidateScriptures.some((r) => r.toLowerCase().includes(n.reference.split(':')[0].toLowerCase())),
    ).length
    : 0;
  const continuityStrength = topicChain?.nodes?.length
    ? continuityMatched / topicChain.nodes.length
    : 0;

  const refsOnGraph = candidateScriptures.filter((ref) =>
    witnessSources.some((w) => w.ref === ref && w.source === 'support_graph'),
  ).length;
  const refsOnCard = candidateScriptures.filter((ref) =>
    witnessSources.some((w) => w.ref === ref && w.source === 'evidence_card'),
  ).length;
  const graphAlignment = candidateScriptures.length
    ? Math.min(1, (refsOnGraph + refsOnCard) / candidateScriptures.length)
    : 0;

  const confidence = computeRecoveryConfidence({
    witnessCount: candidateScriptures.length,
    g2rSpan,
    graphAlignment,
    continuityStrength,
    contradictionCount: contradictions.length,
    crossRefScore: crossRef.supportScore,
    hasPrimaryWitness: primaryWitnesses.length > 0,
  });

  return {
    question,
    topic: mappedTopic || topic,
    discoveredTopic: item.discoveredTopic,
    source: item.source,
    sourceType: item.sourceType,
    frequency: item.frequency,
    candidateScriptures: candidateScriptures.slice(0, 12),
    candidateOrder: candidateOrder.slice(0, 12),
    candidateConclusion,
    witnessSources: witnessSources.slice(0, 20),
    witnessCount: candidateScriptures.length,
    genesisToRevelationSpan: g2rSpan,
    graphAlignment: Math.round(graphAlignment * 100),
    continuityStrength: Math.round(continuityStrength * 100),
    contradictionRisk: contradictions.length > 0 ? 'high' : candidateScriptures.length ? 'low' : 'unknown',
    contradictions,
    crossRefApprovalStatus: crossRef.approvalStatus,
    confidence,
    recovered: candidateScriptures.length > 0,
    reviewRequired: true,
    autoApplied: false,
    humanApprovalRequired: true,
  };
}

function computeRecoveryConfidence({
  witnessCount = 0,
  g2rSpan = false,
  graphAlignment = 0,
  continuityStrength = 0,
  contradictionCount = 0,
  crossRefScore = 0,
  hasPrimaryWitness = false,
} = {}) {
  if (!hasPrimaryWitness || witnessCount === 0) return 0;

  let score = 0;
  score += Math.min(20, witnessCount * 3);
  score += g2rSpan ? 18 : 0;
  score += graphAlignment * 25;
  score += continuityStrength * 22;
  score += Math.min(15, (crossRefScore / 100) * 15);
  score -= contradictionCount * 20;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return score;
}

function runQuestionScriptureRecovery() {
  const expandedResult = runExpandedScriptureDiscovery();
  const pool = buildRecoveryPool(expandedResult);
  const recoveries = pool.map((item, i) => ({
    recoveryId: `rec_${String(i + 1).padStart(4, '0')}`,
    ...recoverScripturesForQuestion(item),
  }));

  const recovered = recoveries.filter((r) => r.recovered);
  const ranked = [...recoveries].sort((a, b) => b.confidence - a.confidence);

  const scoreBuckets = {
    above95: recovered.filter((r) => r.confidence >= 95).length,
    above90: recovered.filter((r) => r.confidence >= 90).length,
    above80: recovered.filter((r) => r.confidence >= 80).length,
  };

  const topicGains = {};
  for (const r of recovered) {
    const t = r.topic || 'open_topic';
    topicGains[t] = (topicGains[t] || 0) + 1;
  }
  const topTopicGains = Object.entries(topicGains).sort((a, b) => b[1] - a[1]);

  const totalQuestions = expandedResult.metrics.questionCount;
  const baselineWithScripture = expandedResult.questions.filter(
    (q) => (q.scripturesCited || []).length > 0,
  ).length;
  const baselineChains = expandedResult.metrics.chainCount;
  const newChains = recovered.filter((r) => r.candidateScriptures.length >= 2).length;
  const postWithScripture = baselineWithScripture + recovered.length;
  const baselineCoveragePct = totalQuestions
    ? Math.round((baselineWithScripture / totalQuestions) * 1000) / 10
    : 0;
  const postRecoveryCoveragePct = totalQuestions
    ? Math.round((postWithScripture / totalQuestions) * 1000) / 10
    : 0;
  const coverageIncreasePct = Math.round((postRecoveryCoveragePct - baselineCoveragePct) * 10) / 10;

  const freqDist = {};
  for (const p of pool) {
    const f = p.frequency || 1;
    freqDist[f] = (freqDist[f] || 0) + 1;
  }

  const topicDist = {};
  for (const p of pool) {
    const t = p.topic || inferTopic(p.question);
    topicDist[t] = (topicDist[t] || 0) + 1;
  }

  return {
    ranAt: new Date().toISOString(),
    phase: '2J-H',
    pool,
    recoveries,
    recovered,
    ranked,
    scoreBuckets,
    topTopicGains,
    metrics: {
      poolSize: pool.length,
      questionsRecovered: recovered.length,
      recoveryRate: pool.length ? Math.round((recovered.length / pool.length) * 1000) / 10 : 0,
      newScriptureChains: newChains,
      baselineChains,
      baselineWithScripture,
      postWithScripture,
      baselineCoveragePct,
      postRecoveryCoveragePct,
      coverageIncreasePct,
      scoreBuckets,
    },
    topicDist,
    freqDist,
    expandedBaseline: expandedResult.metrics,
  };
}

module.exports = {
  buildRecoveryPool,
  recoverScripturesForQuestion,
  computeRecoveryConfidence,
  runQuestionScriptureRecovery,
  inferTopic,
};
