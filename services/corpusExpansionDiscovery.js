/**
 * Phase 2J-J — Corpus Expansion Discovery.
 * Large-scale question, scripture chain, and full witness expansion.
 * Discovery only — no promotion, no production mutation.
 */

const fs = require('fs');
const path = require('path');
const { extractQuestionsFromSources, clusterQuestions } = require('./bulkScriptureDiscovery');
const { inferTopic } = require('./questionScriptureRecovery');
const { runExpandedScriptureDiscovery, discoverOpenTopic } = require('./expandedScriptureDiscovery');
const {
  buildDiscoveryCandidate,
  analyzeScriptureChain,
  discoverGenesisToRevelation,
  detectContradictions,
  computeCoverageScore,
  computeBibleSupportScore,
} = require('./scriptureDiscoveryGenesisRevelation');
const { crossReferenceCandidate, buildApprovedIndex, normalizeTopic } = require('./scriptureDiscoveryCrossReference');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { getSeedConcordanceIndex } = require('./concordanceFoundation');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { refMatchesApproved, refInApprovedList } = require('./scriptureReferenceNormalizer');

const PATHS = {
  corpusExpansion: path.join(__dirname, '..', 'data', 'corpus-expansion-sources.json'),
  bulk: path.join(__dirname, '..', 'data', 'bulk-discovery-sources.json'),
  phase2i: path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2i-conversation-stress-results.json'),
};

const REF_EXTRACT_RE = /\b(?:(?:\d\s)?[1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?/g;

const BASELINE_COVERAGE_PCT = 71.7;
const BASELINE_CEILING_PCT = 83.0;
const BASELINE_QUESTIONS = 159;

function loadJson(p, fallback = {}) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeKey(s = '') {
  return String(s).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const ref of refs) {
    const k = String(ref || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(ref);
  }
  return out;
}

function extractRefsFromText(text = '') {
  const matches = String(text).match(REF_EXTRACT_RE) || [];
  const valid = [];
  const seen = new Set();
  for (const m of matches) {
    const ref = m.replace(/\s+/g, ' ').trim();
    if (!verifyKjvReference(ref).valid) continue;
    const key = ref.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(ref);
  }
  return valid;
}

function mapSupportBand(score) {
  if (score >= 95) return 'strong';
  if (score >= 90) return 'very_strong';
  if (score >= 80) return 'strong_candidate';
  if (score >= 70) return 'review';
  if (score >= 60) return 'research';
  return 'hold';
}

function mapRecommendedAction(score, contradictions = []) {
  if (contradictions.length) return 'hold';
  if (score >= 95) return 'priority_admin_review';
  if (score >= 90) return 'admin_review';
  if (score >= 80) return 'candidate_review';
  if (score >= 70) return 'research_review';
  if (score >= 60) return 'future_research';
  return 'hold';
}

function buildUnifiedSourceRegistry() {
  const expanded = runExpandedScriptureDiscovery();
  const bulk = loadJson(PATHS.bulk);
  const corpus = loadJson(PATHS.corpusExpansion);
  const registry = [];
  const seen = new Set();

  const addSource = (src) => {
    const key = src.sourceId || src.sourceName;
    if (seen.has(key)) return;
    seen.add(key);
    registry.push({
      sourceId: src.sourceId || key,
      sourceName: src.sourceName,
      sourceUrl: src.sourceUrl || null,
      title: src.title || src.sourceName,
      speaker: src.speaker || null,
      date: src.date || null,
      platform: src.platform || src.sourceType,
      transcriptAvailable: src.transcriptAvailable ?? src.transcriptProcessingAllowed ?? false,
      processingAllowed: src.processingAllowed ?? src.transcriptProcessingAllowed ?? false,
      reviewRequired: true,
      copyrightStatus: src.copyrightStatus || 'unknown',
      entryCount: (src.entries || src.questions || []).length,
    });
  };

  for (const s of expanded.sourceInventory || []) {
    addSource({ ...s, sourceId: s.sourceName });
  }
  for (const s of bulk.sources || []) addSource(s);
  for (const s of corpus.sources || []) addSource(s);

  addSource({
    sourceId: 'phase2i_stress',
    sourceName: 'Phase 2I Conversation Stress Test',
    sourceUrl: null,
    title: 'Internal stress-test turns',
    speaker: 'BibleBuddy QA',
    date: '2026-06-08',
    platform: 'internal',
    transcriptAvailable: true,
    processingAllowed: true,
    copyrightStatus: 'internal',
    entryCount: loadJson(PATHS.phase2i).turns?.length || 0,
  });

  return registry.sort((a, b) => (b.entryCount || 0) - (a.entryCount || 0));
}

function extractCorpusExpansionRecords() {
  const records = [];
  const expanded = runExpandedScriptureDiscovery();
  const bulkQs = extractQuestionsFromSources();
  const corpus = loadJson(PATHS.corpusExpansion);
  const phase2i = loadJson(PATHS.phase2i);

  for (const q of expanded.questions) {
    records.push({ ...q, discoveryPhase: '2J-F' });
  }

  for (const q of bulkQs) {
    records.push({ ...q, frequency: 1, discoveryPhase: '2J-E' });
  }

  for (const source of corpus.sources || []) {
    for (const entry of source.entries || []) {
      const fromText = extractRefsFromText(`${entry.answerSummary || ''} ${entry.conclusion || ''}`);
      const scripturesCited = uniqueRefs([...(entry.scripturesCited || []), ...fromText]);
      records.push({
        question: entry.question,
        topic: entry.topic || inferTopic(entry.question),
        speaker: entry.speaker || source.speaker,
        source: source.sourceId,
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        scripturesCited,
        scriptureOrder: entry.scriptureOrder?.length ? entry.scriptureOrder : scripturesCited,
        conclusion: entry.conclusion || entry.answerSummary || '',
        answerSummary: entry.answerSummary || '',
        frequency: 1,
        discoveryPhase: '2J-J',
      });
    }
  }

  for (const t of phase2i.turns || []) {
    records.push({
      question: t.message,
      topic: inferTopic(t.message),
      speaker: 'BibleBuddy QA',
      source: `phase2i_stress:${t.id || 'turn'}`,
      sourceType: 'stress_test',
      scripturesCited: [],
      scriptureOrder: [],
      conclusion: '',
      frequency: 1,
      discoveryPhase: '2J-I-stress',
    });
  }

  const byKey = new Map();
  for (const r of records) {
    const key = normalizeKey(r.question);
    const openTopic = discoverOpenTopic(r.question, r.topic);
    const enriched = {
      ...r,
      topicCandidate: openTopic.discoveredTopic,
      discoveredTopic: openTopic.discoveredTopic,
      isNewTopic: openTopic.isNewTopic,
      topic: r.topic || openTopic.topicName,
    };

    if (!byKey.has(key)) {
      byKey.set(key, enriched);
    } else {
      const ex = byKey.get(key);
      ex.frequency = (ex.frequency || 1) + 1;
      if ((r.scripturesCited || []).length > (ex.scripturesCited || []).length) {
        Object.assign(ex, enriched);
      }
    }
  }

  return [...byKey.values()];
}

function extractScriptureChains(questions) {
  return questions
    .filter((q) => (q.scripturesCited || []).length > 0)
    .map((q) => ({
      question: q.question,
      scripturesCited: q.scripturesCited,
      scriptureOrder: q.scriptureOrder?.length ? q.scriptureOrder : q.scripturesCited,
      conclusion: q.conclusion || q.answerSummary || '',
      source: q.source,
      sourceType: q.sourceType,
      topic: q.topic,
      topicCandidate: q.topicCandidate,
      speaker: q.speaker,
    }));
}

function refIsCited(ref, cited = []) {
  return cited.some((c) => refMatchesApproved(ref, c) || refInApprovedList(ref, [c]));
}

function expandFullScriptureWitnesses(chain) {
  const originalScriptures = chain.scripturesCited || [];
  const originalConclusion = chain.conclusion || '';
  const topic = normalizeTopic(chain.topic) || chain.topic;
  const scriptureOrder = chain.scriptureOrder?.length ? chain.scriptureOrder : originalScriptures;

  const crossRefBefore = crossReferenceCandidate({
    question: chain.question,
    scriptures: originalScriptures,
    scriptureOrder,
    topic,
    candidateConclusion: originalConclusion,
  });

  const chainBefore = analyzeScriptureChain({
    scripturesCited: originalScriptures,
    scriptureOrder,
    topic,
    candidateConclusion: originalConclusion,
  });

  const g2rBefore = discoverGenesisToRevelation({
    scripturesCited: originalScriptures,
    scriptureOrder,
    topic,
  });

  const coverageBefore = computeCoverageScore({
    scripturesCited: originalScriptures,
    scriptureOrder,
    chainAnalysis: chainBefore,
    g2r: g2rBefore,
    crossRef: crossRefBefore,
  });

  const bibleBefore = computeBibleSupportScore({
    coverageScore: coverageBefore,
    chainStrength: chainBefore.chainStrength,
    crossRef: crossRefBefore,
    kjvValid: originalScriptures.every((r) => verifyKjvReference(r).valid),
  });

  const idx = buildApprovedIndex();
  const continuity = loadContinuityChains().chains || [];
  const concordance = getSeedConcordanceIndex();
  const cards = getAllApprovedCards();
  const card = cards.find((c) => c.topic === topic);

  const supportingWitnesses = uniqueRefs([
    ...(card?.supportingScriptures || []),
    ...(card?.primaryScriptures || []),
    ...g2rBefore.supportingScriptures,
    ...g2rBefore.parallelScriptures,
  ]).filter((r) => !refIsCited(r, originalScriptures));

  const confirmingWitnesses = uniqueRefs(
    getAllApprovedSupportEdges()
      .filter((e) => e.topic === topic && ['supports', 'confirms', 'establishes'].includes(e.supportType))
      .flatMap((e) => e.scriptures || []),
  ).filter((r) => !refIsCited(r, originalScriptures));

  const continuityWitnesses = uniqueRefs(
    continuity
      .filter((c) => c.approved && (!topic || c.topic === topic))
      .flatMap((c) => (c.nodes || []).map((n) => n.reference)),
  ).filter((r) => !refIsCited(r, originalScriptures));

  const cautionWitnesses = uniqueRefs([
    ...(card?.cautionPassages || []).map((p) => (typeof p === 'string' ? p : p.reference || p.passage)).filter(Boolean),
    ...g2rBefore.cautionScriptures,
    ...getAllApprovedSupportEdges()
      .filter((e) => e.topic === topic && e.supportType === 'cautions_against')
      .flatMap((e) => e.scriptures || []),
  ]);

  const limitingWitnesses = uniqueRefs([
    ...g2rBefore.limitingScriptures,
    ...getAllApprovedSupportEdges()
      .filter((e) => e.topic === topic && ['limits_claim', 'scripture_silent'].includes(e.supportType))
      .flatMap((e) => e.scriptures || []),
  ]);

  const contradictionWitnesses = uniqueRefs(
    getAllApprovedSupportEdges()
      .filter((e) => e.topic === topic && e.supportType === 'contradicts')
      .flatMap((e) => e.scriptures || []),
  );

  const concordanceWitnesses = uniqueRefs(
    concordance
      .filter((e) => topic && (e.linkedTopics || []).includes(topic))
      .flatMap((e) => e.occurrences || []),
  ).filter((r) => !refIsCited(r, originalScriptures));

  const catalogWitnesses = uniqueRefs([...idx.allCardRefs].filter((r) => {
    if (refIsCited(r, originalScriptures)) return false;
    return topic ? (idx.cardRefsByTopic[topic] || []).some((cr) => refMatchesApproved(r, cr)) : false;
  }));

  const allExpanded = uniqueRefs([
    ...originalScriptures,
    ...supportingWitnesses,
    ...confirmingWitnesses,
    ...continuityWitnesses,
    ...concordanceWitnesses,
    ...catalogWitnesses,
  ]);

  const genesisToRevelationChain = uniqueRefs([
    ...allExpanded.filter((r) => /^genesis/i.test(r)).slice(0, 2),
    ...scriptureOrder,
    ...allExpanded.filter((r) => /^revelation/i.test(r)).slice(0, 2),
  ]);

  const hasG2R = genesisToRevelationChain.some((r) => /^genesis/i.test(r))
    && genesisToRevelationChain.some((r) => /^revelation/i.test(r));

  const strengthenedConclusion = originalConclusion
    ? `[Witness expansion] ${originalConclusion} — ${allExpanded.length} total witnesses (${supportingWitnesses.length} supporting, ${confirmingWitnesses.length} confirming${cautionWitnesses.length ? `, ${cautionWitnesses.length} caution` : ''}).`
    : `[Witness expansion] ${allExpanded.length} scripture witnesses discovered for admin review.`;

  const crossRefAfter = crossReferenceCandidate({
    question: chain.question,
    scriptures: allExpanded.slice(0, 12),
    scriptureOrder: genesisToRevelationChain.slice(0, 12),
    topic,
    candidateConclusion: strengthenedConclusion,
  });

  const chainAfter = analyzeScriptureChain({
    scripturesCited: allExpanded.slice(0, 12),
    scriptureOrder: genesisToRevelationChain.slice(0, 12),
    topic,
    candidateConclusion: strengthenedConclusion,
  });

  const g2rAfter = discoverGenesisToRevelation({
    scripturesCited: allExpanded.slice(0, 12),
    scriptureOrder: genesisToRevelationChain.slice(0, 12),
    topic,
  });

  const coverageAfter = computeCoverageScore({
    scripturesCited: allExpanded.slice(0, 12),
    scriptureOrder: genesisToRevelationChain.slice(0, 12),
    chainAnalysis: chainAfter,
    g2r: { ...g2rAfter, genesisToRevelationSpan: hasG2R },
    crossRef: crossRefAfter,
  });

  const bibleAfter = computeBibleSupportScore({
    coverageScore: coverageAfter,
    chainStrength: chainAfter.chainStrength,
    crossRef: crossRefAfter,
    kjvValid: allExpanded.every((r) => verifyKjvReference(r).valid),
  });

  const contradictions = detectContradictions(topic, allExpanded, strengthenedConclusion);

  return {
    question: chain.question,
    topic,
    source: chain.source,
    originalScriptures,
    originalConclusion,
    supportingWitnesses: supportingWitnesses.slice(0, 12),
    confirmingWitnesses: confirmingWitnesses.slice(0, 8),
    continuityWitnesses: continuityWitnesses.slice(0, 10),
    cautionWitnesses: cautionWitnesses.slice(0, 6),
    limitingWitnesses: limitingWitnesses.slice(0, 6),
    contradictionWitnesses: contradictionWitnesses.slice(0, 6),
    concordanceWitnesses: concordanceWitnesses.slice(0, 8),
    parallelRefs: uniqueRefs([...supportingWitnesses, ...continuityWitnesses, ...concordanceWitnesses]).slice(0, 15),
    genesisToRevelationChain: genesisToRevelationChain.slice(0, 15),
    genesisToRevelationSpan: hasG2R,
    strengthenedConclusion,
    supportDelta: bibleAfter.score - bibleBefore.score,
    confidenceBefore: bibleBefore.score,
    confidenceAfter: bibleAfter.score,
    newWitnessCount: allExpanded.length - originalScriptures.length,
    contradictions,
    reviewRequired: true,
    autoApplied: false,
  };
}

function buildExpansionCandidate(chain, index, witnessExpansion) {
  const base = buildDiscoveryCandidate({
    question: chain.question,
    scripturesCited: chain.scripturesCited,
    scriptureOrder: chain.scriptureOrder,
    topic: chain.topic,
    candidateConclusion: chain.conclusion,
    source: chain.source,
    sourceType: chain.sourceType,
  }, index);

  const supportScore = Math.max(base.supportScore, witnessExpansion.confidenceAfter);
  const band = mapSupportBand(supportScore);

  return {
    candidateId: `exp_${String(index + 1).padStart(4, '0')}`,
    question: chain.question,
    topic: chain.topic,
    topicCandidate: chain.topicCandidate,
    source: chain.source,
    sourceType: chain.sourceType,
    speaker: chain.speaker,
    scriptures: uniqueRefs([
      ...chain.scripturesCited,
      ...witnessExpansion.supportingWitnesses,
      ...witnessExpansion.confirmingWitnesses,
    ]).slice(0, 15),
    scriptureOrder: witnessExpansion.genesisToRevelationChain.length
      ? witnessExpansion.genesisToRevelationChain
      : chain.scriptureOrder,
    conclusion: witnessExpansion.strengthenedConclusion || chain.conclusion,
    originalScriptures: chain.scripturesCited,
    originalConclusion: chain.conclusion,
    parallelRefs: witnessExpansion.parallelRefs,
    genesisToRevelationChain: witnessExpansion.genesisToRevelationChain,
    genesisToRevelationSpan: witnessExpansion.genesisToRevelationSpan,
    witnessExpansion,
    supportScore,
    supportBand: band,
    supportDelta: witnessExpansion.supportDelta,
    confidenceBefore: witnessExpansion.confidenceBefore,
    confidenceAfter: witnessExpansion.confidenceAfter,
    recommendedAction: mapRecommendedAction(supportScore, witnessExpansion.contradictions),
    reviewRequired: true,
    autoApplied: false,
    humanApprovalRequired: true,
    discoveryPhase: '2J-J',
  };
}

function computeCorpusImpact(questions, chains, candidates, witnessExpansions) {
  const approvedTopics = new Set(getAllApprovedCards().map((c) => c.topic));
  const newTopics = new Set(
    questions.filter((q) => q.isNewTopic).map((q) => q.discoveredTopic || q.topicCandidate),
  );
  const newTopicCount = [...newTopics].filter((t) => t && !approvedTopics.has(t)).length;

  const g2rExpansions = witnessExpansions.filter((w) => w.genesisToRevelationSpan).length;
  const newWitnessTotal = witnessExpansions.reduce((s, w) => s + w.newWitnessCount, 0);

  const PRIOR_CHAIN_COUNT = 41;
  const PRIOR_WITH_SCRIPTURE = 114;
  const newChainsBeyondPrior = Math.max(0, chains.length - PRIOR_CHAIN_COUNT);
  const doctrinalQuestions = questions.filter((q) => q.discoveryPhase !== '2J-I-stress');
  const projectedWithScripture = PRIOR_WITH_SCRIPTURE + newChainsBeyondPrior;
  const postCoveragePct = Math.round((projectedWithScripture / doctrinalQuestions.length) * 1000) / 10;
  const coverageIncreasePct = Math.round((postCoveragePct - BASELINE_COVERAGE_PCT) * 10) / 10;

  const highConfidence = candidates.filter((c) => c.supportScore >= 80).length;
  const degradationReductionPct = Math.round((highConfidence / Math.max(candidates.length, 1)) * 12 * 10) / 10;

  return {
    baselineCoveragePct: BASELINE_COVERAGE_PCT,
    baselineCeilingPct: BASELINE_CEILING_PCT,
    postExpansionCoveragePct: postCoveragePct,
    coverageIncreasePct,
    newChainsBeyondPrior,
    priorChainCount: PRIOR_CHAIN_COUNT,
    newTopicCount,
    newTopics: [...newTopics].slice(0, 20),
    newScriptureChains: chains.length,
    genesisToRevelationExpansions: g2rExpansions,
    newSupportingWitnesses: newWitnessTotal,
    degradationReductionPotentialPct: degradationReductionPct,
    totalQuestions: questions.length,
    doctrinalQuestionCount: doctrinalQuestions.length,
  };
}

function runCorpusExpansionDiscovery() {
  const sourceRegistry = buildUnifiedSourceRegistry();
  const questions = extractCorpusExpansionRecords();
  const clusters = clusterQuestions(questions);
  const chains = extractScriptureChains(questions);
  const witnessExpansions = chains.map((c) => expandFullScriptureWitnesses(c));
  const candidates = chains.map((chain, i) => buildExpansionCandidate(chain, i, witnessExpansions[i]));
  const ranked = [...candidates].sort((a, b) => b.supportScore - a.supportScore);

  const scoreBuckets = {
    above95: candidates.filter((c) => c.supportScore >= 95).length,
    above90: candidates.filter((c) => c.supportScore >= 90).length,
    above80: candidates.filter((c) => c.supportScore >= 80).length,
    above70: candidates.filter((c) => c.supportScore >= 70).length,
    below60: candidates.filter((c) => c.supportScore < 60).length,
  };

  const approvedTopics = new Set(getAllApprovedCards().map((c) => c.topic));
  const newTopicsDiscovered = [...new Set(
    questions.map((q) => q.discoveredTopic).filter((t) => t && !approvedTopics.has(t)),
  )];

  const impact = computeCorpusImpact(questions, chains, candidates, witnessExpansions);

  const strengthened = witnessExpansions
    .filter((w) => w.supportDelta > 0)
    .sort((a, b) => b.supportDelta - a.supportDelta);
  const weakened = witnessExpansions.filter((w) => w.supportDelta < 0);
  const cautionIntroduced = witnessExpansions.filter(
    (w) => w.cautionWitnesses.length > 0 || w.contradictionWitnesses.length > 0,
  );

  return {
    ranAt: new Date().toISOString(),
    discoveryPhase: '2J-J',
    sourceRegistry,
    questions,
    clusters,
    chains,
    witnessExpansions,
    candidates,
    ranked,
    scoreBuckets,
    newTopicsDiscovered,
    impact,
    witnessSummary: {
      totalNewSupportingWitnesses: impact.newSupportingWitnesses,
      g2rChainsBuilt: impact.genesisToRevelationExpansions,
      mostStrengthened: strengthened.slice(0, 5),
      weakened: weakened.slice(0, 5),
      cautionOrContradiction: cautionIntroduced.slice(0, 8),
      largestConfidenceGains: [...witnessExpansions].sort((a, b) => b.supportDelta - a.supportDelta).slice(0, 5),
      priorityReview: ranked.slice(0, 10),
    },
    metrics: {
      sourceCount: sourceRegistry.length,
      questionCount: questions.length,
      chainCount: chains.length,
      candidateCount: candidates.length,
      g2rExpansionCount: impact.genesisToRevelationExpansions,
      newTopicCount: impact.newTopicCount,
      scoreBuckets,
    },
  };
}

module.exports = {
  runCorpusExpansionDiscovery,
  buildUnifiedSourceRegistry,
  extractCorpusExpansionRecords,
  extractScriptureChains,
  expandFullScriptureWitnesses,
  mapSupportBand,
};
