/**
 * Phase 2J-C — Scripture Discovery + Genesis-to-Revelation expansion.
 * Discovery and admin-review candidates only — no promotion, no production mutation.
 */

const fs = require('fs');
const path = require('path');
const { runScriptureDiscoveryPilot } = require('./scriptureDiscoveryPilot');
const { buildApprovedIndex, crossReferenceCandidate, normalizeTopic } = require('./scriptureDiscoveryCrossReference');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { buildApprovedCatalogEvidence, collectApprovedReferences } = require('./approvedCatalogEvidence');
const { getSeedConcordanceIndex } = require('./concordanceFoundation');
const { verifyKjvReference, detectTraditionLanguage } = require('./teachingCandidateCrossCheck');
const { refMatchesApproved, refInApprovedList } = require('./scriptureReferenceNormalizer');

const OT_BOOKS = new Set([
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
  '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra',
  'nehemiah', 'esther', 'job', 'psalm', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon',
  'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah',
  'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
]);

const CANON_ERA_ORDER = ['Genesis', 'Exodus', 'Prophets', 'Wisdom', 'Gospels', 'Acts', 'Epistles', 'Revelation'];

function parseBook(ref = '') {
  const kjv = verifyKjvReference(ref);
  return kjv.valid ? kjv.book : null;
}

function isOldTestament(ref) {
  const book = parseBook(ref);
  return book ? OT_BOOKS.has(book) : false;
}

function isNewTestament(ref) {
  const book = parseBook(ref);
  return book ? !OT_BOOKS.has(book) : false;
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const ref of refs) {
    const key = String(ref || '').toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function refMatchesAny(ref, list = []) {
  const items = Array.isArray(list) ? list : [list];
  return items.some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));
}

function refsOverlap(a, b) {
  return refMatchesApproved(a, b) || refInApprovedList(a, [b]);
}

function extractDiscoveryQuestions({ phase2iResultsPath } = {}) {
  const pilot = runScriptureDiscoveryPilot({ phase2iResultsPath });
  const extracted = pilot.candidates.map((c) => ({
    question: c.question,
    scripturesCited: c.scripturesCited || [],
    scriptureOrder: c.scriptureOrder || c.scripturesCited || [],
    candidateConclusion: c.candidateConclusion || '',
    source: c.source,
    sourceType: c.sourceType,
    topic: c.topic,
    pilotId: c.id,
  }));

  const byKey = new Map();
  for (const item of extracted) {
    const key = `${item.question}::${(item.scripturesCited || []).join('|')}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }

  return {
    extracted: [...byKey.values()],
    pilotSummary: pilot.summary,
    pilotRanAt: pilot.ranAt,
  };
}

function getTopicCard(topic) {
  const norm = normalizeTopic(topic);
  return getAllApprovedCards().find((c) => c.topic === norm) || null;
}

function getContinuityForTopic(topic) {
  const norm = normalizeTopic(topic);
  const chains = loadContinuityChains().chains || [];
  return chains.find((c) => c.topic === norm && c.approved) || null;
}

function analyzeScriptureChain({ scripturesCited = [], scriptureOrder = [], topic = null, candidateConclusion = '' } = {}) {
  const card = getTopicCard(topic);
  const ordered = scriptureOrder.length ? scriptureOrder : scripturesCited;
  const citedSet = new Set(scripturesCited.map((r) => r.toLowerCase()));

  const primaryScriptures = [...scripturesCited];
  const supportingScriptures = uniqueRefs([
    ...(card?.supportingScriptures || []),
    ...(card?.primaryScriptures || []).filter((r) => !citedSet.has(r.toLowerCase())),
  ]).filter((r) => !refMatchesAny(r, scripturesCited));

  const cautionScriptures = uniqueRefs([
    ...(card?.cautionPassages || []).map((p) => (typeof p === 'string' ? p : p.reference || p.passage)).filter(Boolean),
  ]);

  const edges = getAllApprovedSupportEdges().filter((e) => e.topic === normalizeTopic(topic));
  const limitingScriptures = uniqueRefs(
    edges
      .filter((e) => ['limits_claim', 'cautions_against', 'scripture_silent'].includes(e.supportType))
      .flatMap((e) => e.scriptures || []),
  );

  const continuity = getContinuityForTopic(topic);
  const continuityScriptures = uniqueRefs((continuity?.nodes || []).map((n) => n.reference));

  const continuityMatched = continuityScriptures.filter((r) =>
    ordered.some((o) => refsOverlap(o, r)) || scripturesCited.some((c) => refsOverlap(c, r)),
  );
  const chainCompleteness = continuityScriptures.length
    ? Math.round((continuityMatched.length / continuityScriptures.length) * 100)
    : ordered.length >= 2 ? 50 : 25;

  let chainConsistency = 100;
  const eras = ordered.map((r) => {
    const node = (continuity?.nodes || []).find((n) => refsOverlap(r, n.reference));
    return node?.era || null;
  }).filter(Boolean);

  for (let i = 1; i < eras.length; i += 1) {
    const prevIdx = CANON_ERA_ORDER.indexOf(eras[i - 1]);
    const currIdx = CANON_ERA_ORDER.indexOf(eras[i]);
    if (prevIdx >= 0 && currIdx >= 0 && currIdx < prevIdx) chainConsistency -= 15;
  }

  const traditionHits = detectTraditionLanguage(candidateConclusion);
  if (traditionHits.length) chainConsistency -= traditionHits.length * 10;
  chainConsistency = Math.max(0, Math.min(100, chainConsistency));

  const chainStrength = Math.round((chainCompleteness * 0.55 + chainConsistency * 0.45));

  return {
    primaryScriptures,
    supportingScriptures,
    cautionScriptures,
    limitingScriptures,
    continuityScriptures,
    chainCompleteness,
    chainConsistency,
    chainStrength,
    continuityChainId: continuity?.chainId || null,
  };
}

function discoverGenesisToRevelation({ scripturesCited = [], scriptureOrder = [], topic = null } = {}) {
  const norm = normalizeTopic(topic);
  const idx = buildApprovedIndex();
  const card = getTopicCard(topic);
  const continuity = getContinuityForTopic(topic);
  const catalog = buildApprovedCatalogEvidence({ topic: norm, cardTopics: norm ? [norm] : [] });
  const catalogRefs = collectApprovedReferences(catalog, card ? [card] : []);
  const concordance = getSeedConcordanceIndex().filter(
    (e) => norm && (e.linkedTopics || []).includes(norm),
  );

  const citedLower = new Set(scripturesCited.map((r) => r.toLowerCase()));
  const isCited = (ref) => scripturesCited.some((c) => refMatchesAny(c, ref)) || citedLower.has(ref.toLowerCase());

  const continuityScriptures = uniqueRefs((continuity?.nodes || []).map((n) => n.reference));
  const parallelScriptures = continuityScriptures.filter((r) => !isCited(r));

  const supportingScriptures = uniqueRefs([
    ...(card?.supportingScriptures || []),
    ...catalogRefs,
    ...concordance.flatMap((e) => e.occurrences || []),
    ...continuityScriptures,
  ]).filter((r) => !isCited(r) && refMatchesAny(r, [...idx.allCardRefs]));

  const cautionScriptures = uniqueRefs([
    ...(card?.cautionPassages || []).map((p) => (typeof p === 'string' ? p : p.reference)).filter(Boolean),
    ...getAllApprovedSupportEdges()
      .filter((e) => e.topic === norm && e.supportType === 'cautions_against')
      .flatMap((e) => e.scriptures || []),
  ]);

  const limitingScriptures = uniqueRefs(
    getAllApprovedSupportEdges()
      .filter((e) => e.topic === norm && ['limits_claim', 'scripture_silent'].includes(e.supportType))
      .flatMap((e) => e.scriptures || []),
  );

  const ordered = scriptureOrder.length ? scriptureOrder : scripturesCited;
  const hasGenesis = ordered.some((r) => /^genesis/i.test(r)) || continuityScriptures.some((r) => /^genesis/i.test(r));
  const hasRevelation = ordered.some((r) => /^revelation/i.test(r)) || continuityScriptures.some((r) => /^revelation/i.test(r));
  const genesisToRevelationSpan = hasGenesis && hasRevelation;

  const expansionCount = parallelScriptures.length + supportingScriptures.length;

  return {
    parallelScriptures,
    supportingScriptures,
    cautionScriptures,
    limitingScriptures,
    continuityScriptures,
    genesisToRevelationSpan,
    expansionCount,
    catalogKeys: catalog.catalogKeys || [],
    concordanceEntryCount: concordance.length,
  };
}

function detectContradictions(topic, scripturesCited = [], candidateConclusion = '') {
  const norm = normalizeTopic(topic);
  const conclusion = String(candidateConclusion || '');
  const contradictEdges = getAllApprovedSupportEdges().filter(
    (e) => e.topic === norm && e.supportType === 'contradicts',
  );
  const hits = [];
  for (const edge of contradictEdges) {
    const claimMatch = (edge.claimPatterns || []).some((p) => p.test(conclusion));
    if (!claimMatch) continue;
    const overlap = (edge.scriptures || []).filter((s) => refMatchesAny(s, scripturesCited));
    if (overlap.length) hits.push({ edgeId: edge.id, scriptures: overlap });
  }
  return hits;
}

function computeCoverageScore({
  scripturesCited = [],
  scriptureOrder = [],
  chainAnalysis = {},
  g2r = {},
  crossRef = {},
} = {}) {
  const ordered = scriptureOrder.length ? scriptureOrder : scripturesCited;
  const allRefs = uniqueRefs([...ordered, ...g2r.continuityScriptures, ...g2r.supportingScriptures]);

  const otRefs = allRefs.filter(isOldTestament);
  const ntRefs = allRefs.filter(isNewTestament);
  const otCoverage = allRefs.length ? (otRefs.length / allRefs.length) * 100 : 0;
  const ntCoverage = allRefs.length ? (ntRefs.length / allRefs.length) * 100 : 0;

  const continuityStrength = chainAnalysis.chainCompleteness ?? 0;
  const m = crossRef.metrics || {};
  const total = m.totalRefs || scripturesCited.length || 1;
  const supportConsistency = Math.round(((m.refsOnCard || 0) + (m.refsOnEdge || 0)) / (total * 2) * 100);

  const continuityWitnessBonus = chainAnalysis.cautionScriptures?.length > 0 ? 85 : 70;

  const g2rBonus = g2r.genesisToRevelationSpan ? 10 : 0;

  const raw =
    otCoverage * 0.15
    + ntCoverage * 0.15
    + continuityStrength * 0.25
    + supportConsistency * 0.25
    + continuityWitnessBonus * 0.1
    + g2rBonus;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

function computeBibleSupportScore({ coverageScore = 0, chainStrength = 0, crossRef = {}, kjvValid = true } = {}) {
  const evidenceScore = crossRef.supportScore ?? 0;
  let score = coverageScore * 0.35 + chainStrength * 0.25 + evidenceScore * 0.4;

  if (crossRef.approvalStatus === 'already_approved') {
    score = Math.max(score, Math.min(98, evidenceScore * 0.92 + chainStrength * 0.08));
  } else if (crossRef.approvalStatus === 'partially_approved' && evidenceScore >= 50) {
    score = Math.max(score, evidenceScore * 0.75 + chainStrength * 0.15);
  }

  if (!kjvValid) score -= 25;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let band = 'research_only';
  if (score >= 95) band = 'strong';
  else if (score >= 90) band = 'very_strong';
  else if (score >= 80) band = 'good';
  else if (score >= 70) band = 'needs_review';
  else if (score >= 60) band = 'weak';

  return { score, band };
}

function recommendAction({
  bibleSupportScore = 0,
  crossRef = {},
  chainAnalysis = {},
  g2r = {},
  kjvValid = true,
  contradictions = [],
} = {}) {
  if (!kjvValid) return 'reject';
  if (bibleSupportScore < 60) return 'future_research';

  const m = crossRef.metrics || {};
  const cited = crossRef.scripturesCited || [];
  const missingCard = cited.some((ref) => {
    const cr = (crossRef.crossReferences || []).find((x) => x.ref === ref);
    return cr && !cr.onAnyFrozenCard;
  });
  const missingEdge = cited.some((ref) => {
    const cr = (crossRef.crossReferences || []).find((x) => x.ref === ref);
    return cr && cr.onAnyFrozenCard && !cr.onSupportGraph;
  });

  if (missingCard) return 'approve_card_ref';
  if (missingEdge) return 'approve_support_edge';
  if (bibleSupportScore >= 80 && g2r.genesisToRevelationSpan) return 'approve_support_edge';
  if (bibleSupportScore >= 70) return 'hold';
  return 'future_research';
}

function buildDiscoveryCandidate(input, index) {
  const crossRef = crossReferenceCandidate({
    question: input.question,
    scriptures: input.scripturesCited,
    scriptureOrder: input.scriptureOrder,
    topic: input.topic,
    candidateConclusion: input.candidateConclusion,
  });

  const chainAnalysis = analyzeScriptureChain({
    scripturesCited: input.scripturesCited,
    scriptureOrder: input.scriptureOrder,
    topic: input.topic,
    candidateConclusion: input.candidateConclusion,
  });

  const g2r = discoverGenesisToRevelation({
    scripturesCited: input.scripturesCited,
    scriptureOrder: input.scriptureOrder,
    topic: input.topic,
  });

  const kjvResults = (input.scripturesCited || []).map((ref) => ({ ref, ...verifyKjvReference(ref) }));
  const kjvValid = kjvResults.length === 0 || kjvResults.every((r) => r.valid);
  const contradictions = detectContradictions(input.topic, input.scripturesCited, input.candidateConclusion);

  const coverageScore = computeCoverageScore({
    scripturesCited: input.scripturesCited,
    scriptureOrder: input.scriptureOrder,
    chainAnalysis,
    g2r,
    crossRef,
  });

  const bibleSupport = computeBibleSupportScore({
    coverageScore,
    chainStrength: chainAnalysis.chainStrength,
    crossRef,
    kjvValid,
  });

  const scriptureChain = {
    primary: chainAnalysis.primaryScriptures,
    supporting: chainAnalysis.supportingScriptures,
    caution: chainAnalysis.cautionScriptures,
    limiting: chainAnalysis.limitingScriptures,
    continuity: chainAnalysis.continuityScriptures,
    order: input.scriptureOrder || input.scripturesCited || [],
    completeness: chainAnalysis.chainCompleteness,
    consistency: chainAnalysis.chainConsistency,
    strength: chainAnalysis.chainStrength,
  };

  const recommendedAction = recommendAction({
    bibleSupportScore: bibleSupport.score,
    crossRef,
    chainAnalysis,
    g2r,
    kjvValid,
    contradictions,
  });

  return {
    candidateId: `g2r_${String(index + 1).padStart(4, '0')}`,
    pilotId: input.pilotId || null,
    question: input.question,
    topic: crossRef.topic || input.topic,
    source: input.source,
    sourceType: input.sourceType,
    scriptureChain,
    scripturesCited: input.scripturesCited,
    scriptureOrder: input.scriptureOrder,
    candidateConclusion: input.candidateConclusion,
    parallelScriptures: g2r.parallelScriptures,
    supportingScriptures: g2r.supportingScriptures,
    cautionScriptures: g2r.cautionScriptures,
    limitingScriptures: g2r.limitingScriptures,
    continuityScriptures: g2r.continuityScriptures,
    genesisToRevelationSpan: g2r.genesisToRevelationSpan,
    expansionCount: g2r.expansionCount,
    coverageScore,
    supportScore: bibleSupport.score,
    supportBand: bibleSupport.band,
    crossRefApprovalStatus: crossRef.approvalStatus,
    crossRefMetrics: crossRef.metrics,
    kjvValid,
    contradictions,
    recommendedAction,
    reviewRequired: true,
    autoApplied: false,
    discoveryPhase: '2J-C',
    createdAt: new Date().toISOString(),
  };
}

function runGenesisRevelationDiscovery({ phase2iResultsPath } = {}) {
  const { extracted, pilotSummary, pilotRanAt } = extractDiscoveryQuestions({ phase2iResultsPath });

  const candidates = extracted.map((input, i) => buildDiscoveryCandidate(input, i));

  const chainsFound = candidates.filter((c) => (c.scriptureChain?.order?.length || 0) >= 2).length;
  const expansionsFound = candidates.filter((c) => c.expansionCount > 0).length;
  const g2rSpans = candidates.filter((c) => c.genesisToRevelationSpan).length;

  const scoreBuckets = {
    above95: candidates.filter((c) => c.supportScore >= 95).length,
    above90: candidates.filter((c) => c.supportScore >= 90).length,
    above80: candidates.filter((c) => c.supportScore >= 80).length,
    above70: candidates.filter((c) => c.supportScore >= 70).length,
    below60: candidates.filter((c) => c.supportScore < 60).length,
  };

  const ranked = [...candidates].sort((a, b) => b.supportScore - a.supportScore);

  return {
    ranAt: new Date().toISOString(),
    discoveryPhase: '2J-C',
    pilotRanAt,
    pilotSummary,
    questionCount: extracted.length,
    chainCount: chainsFound,
    expansionCount: expansionsFound,
    genesisToRevelationSpans: g2rSpans,
    scoreBuckets,
    candidates,
    ranked,
    summary: {
      total: candidates.length,
      reviewRequired: candidates.filter((c) => c.reviewRequired).length,
      autoApplied: candidates.filter((c) => c.autoApplied).length,
      byRecommendedAction: candidates.reduce((acc, c) => {
        acc[c.recommendedAction] = (acc[c.recommendedAction] || 0) + 1;
        return acc;
      }, {}),
      bySupportBand: candidates.reduce((acc, c) => {
        acc[c.supportBand] = (acc[c.supportBand] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}

module.exports = {
  extractDiscoveryQuestions,
  analyzeScriptureChain,
  discoverGenesisToRevelation,
  detectContradictions,
  computeCoverageScore,
  computeBibleSupportScore,
  buildDiscoveryCandidate,
  runGenesisRevelationDiscovery,
};
