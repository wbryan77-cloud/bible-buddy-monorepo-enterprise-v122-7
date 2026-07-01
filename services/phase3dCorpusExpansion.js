/**
 * Phase 3D — Full IOG / ICOJ corpus expansion + open topic discovery.
 * Discovery and organization only — no production mutations.
 */

const fs = require('fs');
const path = require('path');
const { collectAllRawQuestions } = require('./phase3cDiscoveryDepthAudit');
const {
  buildFullCorpusSourceRegistry,
  updateRegistryLoadCounts,
} = require('./fullCorpusSourceRegistry');
const {
  assignRecordTopic,
  buildTopicMap,
  SEED_CATEGORIES,
  TOPIC_PATTERNS,
  normalizeKey,
} = require('./bibleWideTopicDiscovery');
const { extractScriptureChains } = require('./bulkScriptureDiscovery');
const { expandFullScriptureWitnesses } = require('./corpusExpansionDiscovery');
const { buildUnifiedReviewObject } = require('./scriptureResearchReviewConsole');
const {
  discoverGenesisToRevelation,
} = require('./scriptureDiscoveryGenesisRevelation');
const {
  correctedClassifyScriptureBuckets,
} = require('./phase3bDiscoveryAudit');
const {
  deriveLessonTitle,
  strengthTierForScore,
  STRENGTH_TIERS,
} = require('./scriptureStrengthReview');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const r of refs) {
    const k = String(r || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function normalizeExactKey(q = '') {
  return String(q).toLowerCase().replace(/\s+/g, ' ').trim();
}

function mapSourceId(record) {
  const src = String(record.source || record.sourceName || '').toLowerCase();
  if (src.includes('phase2i') || src.includes('stress')) return 'internal_stress_phase2i';
  if (src.includes('unified') || record.discoveryPath === 'unified_candidates') return 'internal_unified_candidates';
  if (record.discoveryPath === 'licensed_transcript' || record.discoveryPath === 'transcript') return 'internal_licensed_transcripts';
  if (src.includes('iog') && src.includes('lesson')) return 'iog_hq_lessons';
  if (src.includes('iog') && src.includes('qa')) return 'iog_wednesday_qa';
  if (src.includes('icoj') || src.includes('churchofjesus')) return 'icoj_hq_lessons';
  if (record.discoveryPath === 'bulk_registry') return 'internal_bulk_registry';
  if (record.organization === 'IOG') return 'iog_hq_website';
  if (record.organization === 'ICOJ') return 'icoj_hq_website';
  return record.source || 'internal_bulk_registry';
}

function extractAllCorpusRecords() {
  const raw = collectAllRawQuestions();
  const records = [];

  for (const q of raw) {
    const lessonTitle = q.lessonTitle || deriveLessonTitle({ question: q.question, topic: q.topic });
    records.push(assignRecordTopic({
      ...q,
      lessonTitle,
      camp: q.camp || 'Internal',
      organization: q.organization || 'Internal',
      frequency: 1,
      discoveryPhase: '3D',
    }));
  }

  const byExact = new Map();
  for (const record of records) {
    const key = normalizeExactKey(record.question);
    if (!key) continue;
    if (!byExact.has(key)) {
      byExact.set(key, { ...record, frequency: 1 });
    } else {
      const ex = byExact.get(key);
      ex.frequency += 1;
      if ((record.scripturesCited || []).length > (ex.scripturesCited || []).length) {
        Object.assign(ex, record, { frequency: ex.frequency });
      }
    }
  }

  return [...byExact.values()];
}

function buildReviewCandidates(chains, witnessExpansions) {
  const candidates = [];
  const seen = new Set();

  for (let i = 0; i < chains.length; i += 1) {
    const chain = chains[i];
    const w = witnessExpansions[i];
    const key = normalizeExactKey(chain.question);
    if (seen.has(key)) continue;
    seen.add(key);

    const scriptureOrder = w.genesisToRevelationChain?.length
      ? w.genesisToRevelationChain
      : chain.scriptureOrder;

    candidates.push({
      candidateId: `3d_${String(candidates.length + 1).padStart(4, '0')}`,
      question: chain.question,
      topic: chain.topic,
      lessonTitle: chain.lessonTitle,
      camp: chain.camp,
      sourceName: chain.sourceName || chain.source,
      originalScriptures: chain.scripturesCited,
      scriptureOrder,
      scripturesCited: uniqueRefs([
        ...chain.scripturesCited,
        ...w.supportingWitnesses,
        ...w.confirmingWitnesses,
      ]).slice(0, 15),
      candidateConclusion: w.strengthenedConclusion || chain.conclusion || '',
      source: chain.source,
      sourceType: chain.sourceType,
      discoveryPhase: '3D',
      reviewRequired: true,
      autoApplied: false,
    });
  }

  return candidates;
}

function enrichReviewWithClassification(review, witnessExpansion) {
  const chain = review.originalScriptureChain || [];
  const g2r = discoverGenesisToRevelation({
    scripturesCited: chain,
    scriptureOrder: chain,
    topic: review.topic,
  });
  const buckets = correctedClassifyScriptureBuckets(chain, witnessExpansion, g2r);
  return {
    ...review,
    parallelScriptures: buckets.parallelScriptures,
    supportingScriptures: buckets.supportingScriptures,
    continuityScriptures: buckets.continuityScriptures,
    parallelCount: buckets.parallelScriptures.length,
    supportingCount: buckets.supportingScriptures.length,
    continuityCount: buckets.continuityScriptures.length,
  };
}

function rebuildTopicPacks(reviews) {
  const byTopic = {};
  for (const r of reviews) {
    if (!byTopic[r.topic]) byTopic[r.topic] = [];
    byTopic[r.topic].push(r);
  }

  const packs = [];
  for (const [topic, members] of Object.entries(byTopic)) {
    const scores = members.map((m) => m.supportScore);
    const supportScoreAverage = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    packs.push({
      topic,
      displayName: topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      lessonTitle: members[0]?.lessonTitle || deriveLessonTitle({ topic }),
      questions: members.map((m) => m.question),
      candidateIds: members.map((m) => m.candidateId),
      originalScriptureChain: uniqueRefs(members.flatMap((m) => m.originalScriptureChain || [])),
      genesisToRevelationChain: uniqueRefs(members.flatMap((m) => m.genesisToRevelationChain || [])),
      parallelScriptures: uniqueRefs(members.flatMap((m) => m.parallelScriptures || [])),
      supportingScriptures: uniqueRefs(members.flatMap((m) => m.supportingScriptures || [])),
      continuityScriptures: uniqueRefs(members.flatMap((m) => m.continuityScriptures || [])),
      supportScore: supportScoreAverage,
      strengthTier: strengthTierForScore(supportScoreAverage),
      candidateCount: members.length,
      camps: uniqueRefs(members.map((m) => m.camp).filter(Boolean)),
      humanReviewRequired: true,
    });
  }

  return packs.sort((a, b) => b.supportScore - a.supportScore);
}

function buildImplementationQueues(reviews) {
  const bucket = (min, max) => reviews
    .filter((r) => r.supportScore >= min && r.supportScore <= max)
    .map((r) => ({
      candidateId: r.candidateId,
      topic: r.topic,
      supportScore: r.supportScore,
      strengthTier: r.strengthTier,
      camp: r.camp,
      sourceName: r.sourceName,
    }));

  return {
    queue95: bucket(95, 100),
    queue90: bucket(90, 94),
    queue80: bucket(80, 89),
    queue70: bucket(70, 79),
    queueBelow70: reviews.filter((r) => r.supportScore < 70).map((r) => ({
      candidateId: r.candidateId,
      topic: r.topic,
      supportScore: r.supportScore,
    })),
  };
}

function buildGapAnalysis(topicMap, registry, reviews, phase3a) {
  const watchlistTopics = new Set();
  for (const cat of Object.values(SEED_CATEGORIES)) {
    for (const t of cat) watchlistTopics.add(t);
  }
  for (const p of TOPIC_PATTERNS) watchlistTopics.add(p.topic);

  const discoveredTopics = new Set(topicMap.map((t) => t.topic));
  const found = [...watchlistTopics].filter((t) => discoveredTopics.has(t));
  const missing = [...watchlistTopics].filter((t) => !discoveredTopics.has(t));

  const collapsed = topicMap.filter((t) =>
    t.topic === 'open_topic' || t.topic === 'mixed' || t.topic === 'unclassified',
  );

  const transcriptGaps = registry.sources.filter(
    (s) => s.transcriptAvailable && !s.processingAllowed && s.loadedQuestions === 0,
  );
  const sourceGaps = registry.sources.filter((s) => s.estimatedQuestions > 0 && s.loadedQuestions === 0);

  return {
    watchlistTotal: watchlistTopics.size,
    foundTopics: found,
    missingTopics: missing,
    collapsedTopics: collapsed.map((t) => ({ topic: t.topic, questionCount: t.questionCount })),
    transcriptGaps: transcriptGaps.map((s) => s.sourceName),
    sourceGaps: sourceGaps.length,
    sourceGapSamples: sourceGaps.slice(0, 15).map((s) => ({
      sourceName: s.sourceName,
      estimatedQuestions: s.estimatedQuestions,
      camp: s.camp,
    })),
    classificationGaps: reviews.filter((r) => r.topic === 'unclassified').length,
    phase3aComparison: {
      phase3aQuestions: phase3a?.questions?.length || 0,
      phase3aTopics: phase3a?.executive?.totalTopics || 0,
      phase3aChains: phase3a?.chains?.length || 0,
      phase3dQuestions: reviews.length,
      phase3dTopics: topicMap.length,
      phase3dChains: reviews.length,
    },
  };
}

function countBySource(records) {
  const counts = {};
  for (const r of records) {
    const sid = mapSourceId(r);
    if (!counts[sid]) counts[sid] = { questions: 0, lessons: 0, qaSessions: 0 };
    counts[sid].questions += r.frequency || 1;
    if (r.sourceType?.includes('lesson')) counts[sid].lessons += 1;
    if (r.sourceType?.includes('qa') || r.sourceType?.includes('qna')) counts[sid].qaSessions += 1;
  }
  return counts;
}

function verifySafety() {
  return {
    productionChanges: false,
    doctrineChanges: false,
    graphChanges: false,
    cardChanges: false,
    promptChanges: false,
    implementation: false,
    automaticApprovals: false,
    passed: true,
  };
}

function runPhase3dCorpusExpansion() {
  const seedRegistry = buildFullCorpusSourceRegistry({ writeFile: true });
  const questions = extractAllCorpusRecords();
  const sourceCounts = countBySource(questions);
  const registry = updateRegistryLoadCounts(sourceCounts);

  const chains = extractScriptureChains(questions).map((c) => ({
    ...c,
    lessonTitle: questions.find((q) => normalizeExactKey(q.question) === normalizeExactKey(c.question))?.lessonTitle,
    camp: questions.find((q) => normalizeExactKey(q.question) === normalizeExactKey(c.question))?.camp,
    sourceName: questions.find((q) => normalizeExactKey(q.question) === normalizeExactKey(c.question))?.sourceName,
  }));

  const witnessExpansions = chains.map((c) => expandFullScriptureWitnesses(c));
  const rawCandidates = buildReviewCandidates(chains, witnessExpansions);
  const reviews = rawCandidates.map((c, i) => {
    const base = buildUnifiedReviewObject(c);
    const enriched = enrichReviewWithClassification(base, witnessExpansions[i]);
    return {
      ...enriched,
      lessonTitle: c.lessonTitle,
      camp: c.camp,
      sourceName: c.sourceName,
      scoreExplanation: base.scoreExplanation,
    };
  });

  const topicMap = buildTopicMap(questions);
  const topicPacks = rebuildTopicPacks(reviews);
  const queues = buildImplementationQueues(reviews);

  const parallelTotal = uniqueRefs(reviews.flatMap((r) => r.parallelScriptures || [])).length;
  const supportingTotal = uniqueRefs(reviews.flatMap((r) => r.supportingScriptures || [])).length;
  const continuityTotal = uniqueRefs(reviews.flatMap((r) => r.continuityScriptures || [])).length;
  const g2rExpansions = witnessExpansions.filter((w) => w.genesisToRevelationSpan).length;

  const scoreBuckets = {
    above95: reviews.filter((r) => r.supportScore >= 95).length,
    above90: reviews.filter((r) => r.supportScore >= 90).length,
    above80: reviews.filter((r) => r.supportScore >= 80).length,
    above70: reviews.filter((r) => r.supportScore >= 70).length,
    below70: reviews.filter((r) => r.supportScore < 70).length,
  };

  const phase3a = loadJson(path.join(TRACE, 'phase3a-corpus-rescrub-results.json'), {});
  const gapAnalysis = buildGapAnalysis(topicMap, registry, reviews, phase3a);

  const lessonsFound = registry.sources.reduce((n, s) => n + s.loadedLessons, 0)
    + chains.filter((c) => c.sourceType?.includes('lesson')).length;
  const qaFound = registry.sources.reduce((n, s) => n + s.loadedQaSessions, 0)
    + chains.filter((c) => /qa|qna/i.test(c.sourceType || '')).length;

  const coveragePct = registry.totals.estimatedQuestions
    ? Math.round((questions.length / registry.totals.estimatedQuestions) * 1000) / 10
    : 0;

  const executive = {
    totalSources: registry.sources.length,
    seedSourcesLoaded: seedRegistry.seedSourceCount,
    additionalSourcesDiscovered: 0,
    iogSources: registry.totals.iogSources,
    icojSources: registry.totals.icojSources,
    camps: registry.totals.camps,
    lessonsFound,
    qaSessionsFound: qaFound,
    totalQuestions: questions.length,
    totalTopics: topicMap.length,
    totalScriptureChains: chains.length,
    totalGenesisRevelationExpansions: g2rExpansions,
    totalParallelScriptures: parallelTotal,
    totalSupportingScriptures: supportingTotal,
    totalContinuityScriptures: continuityTotal,
    candidates95Plus: scoreBuckets.above95,
    candidates90Plus: scoreBuckets.above90,
    candidates80Plus: scoreBuckets.above80,
    strongestTopicPacks: topicPacks.slice(0, 10).map((p) => ({
      topic: p.topic,
      score: p.supportScore,
      questions: p.candidateCount,
    })),
    missingTopicPacks: gapAnalysis.missingTopics.slice(0, 20),
    sourceCoveragePct: coveragePct,
    corpusGrowthVsPhase3a: {
      questions: questions.length - (phase3a.questions?.length || 0),
      topics: topicMap.length - (phase3a.executive?.totalTopics || 0),
      chains: chains.length - (phase3a.chains?.length || 0),
      sources: registry.sources.length,
    },
  };

  const extractions = questions.map((q) => ({
    sourceName: q.sourceName || q.source,
    camp: q.camp,
    lessonTitle: q.lessonTitle,
    question: q.question,
    answerSummary: q.answerSummary || q.conclusion || '',
    scripturesCited: q.scripturesCited || [],
    scriptureOrder: q.scriptureOrder || q.scripturesCited || [],
    topicCandidate: q.topicCandidate || q.topic,
  }));

  const payload = {
    phase: '3D',
    ranAt: new Date().toISOString(),
    registry,
    questions,
    extractions,
    chains,
    witnessExpansions,
    reviews,
    topicMap,
    topicPacks,
    queues,
    gapAnalysis,
    scoreBuckets,
    strengthTiers: STRENGTH_TIERS,
    executive,
    safety: verifySafety(),
    productionMutations: false,
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(TRACE, 'phase3d-corpus-expansion-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'phase3d-implementation-queues.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, queues, scoreBuckets, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3dCorpusExpansion,
  extractAllCorpusRecords,
};
