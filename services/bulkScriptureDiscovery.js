/**
 * Phase 2J-E — Bulk Scripture Discovery pipeline.
 * Discovery and admin review only — no promotion, no production mutation.
 *
 * AUTHORITY ORDER (Part K):
 * Scripture → Approved Evidence → Support Graph → BAE → Discovery Candidates → Human Review → Optional Promotion
 */

const fs = require('fs');
const path = require('path');
const {
  buildDiscoveryCandidate,
  extractDiscoveryQuestions,
  analyzeScriptureChain,
  discoverGenesisToRevelation,
  detectContradictions,
} = require('./scriptureDiscoveryGenesisRevelation');
const { crossReferenceCandidate } = require('./scriptureDiscoveryCrossReference');
const { verifyKjvReference, detectTraditionLanguage, flagUnsupportedLeaps } = require('./teachingCandidateCrossCheck');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { PHASE2I_CLASS_C_MAP } = require('./candidatePromotionEngine');

const BULK_SOURCES_PATH = path.join(__dirname, '..', 'data', 'bulk-discovery-sources.json');
const PILOT_SOURCES_PATH = path.join(__dirname, '..', 'data', 'scripture-discovery-pilot-sources.json');
const PHASE2I_PATH = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2i-conversation-stress-results.json');

const TOPIC_KEYWORDS = {
  sabbath: /\b(sabbath|seventh day|saturday|hebrews 4)\b/i,
  death_state: /\b(dead|death|die|died|grave|resurrection|sleep|soul)\b/i,
  dietary_law: /\b(pork|eat|clean|unclean|acts 10|acts 11|leviticus 11)\b/i,
  holiness: /\b(holy|holiness|sanctif)\b/i,
  messiah_logos: /\b(logos|word of god|john 1)\b/i,
  kingdom: /\b(kingdom|thy kingdom come|new jerusalem)\b/i,
  heavens: /\b(heaven|heavens|third heaven|firmament)\b/i,
  feasts: /\b(feast|passover|pentecost|leviticus 23)\b/i,
};

function loadJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function inferTopic(question = '') {
  const q = String(question);
  for (const [topic, re] of Object.entries(TOPIC_KEYWORDS)) {
    if (re.test(q)) return topic;
  }
  return 'mixed';
}

function normalizeQuestionKey(q = '') {
  return String(q).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function tokenSet(text = '') {
  return new Set(normalizeQuestionKey(text).split(' ').filter((w) => w.length > 2));
}

function questionSimilarity(a, b) {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / new Set([...ta, ...tb]).size;
}

function sourceCaptureRecord(source) {
  return {
    sourceId: source.sourceId,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl || null,
    title: source.title,
    speaker: source.speaker || null,
    date: source.date || null,
    platform: source.platform,
    transcriptAvailable: !!source.transcriptAvailable,
    copyrightStatus: source.copyrightStatus,
    reviewRequired: true,
    sourceType: source.sourceType,
  };
}

function discoverBulkSources() {
  const bulk = loadJson(BULK_SOURCES_PATH, { sources: [] });
  const pilot = loadJson(PILOT_SOURCES_PATH, { sources: [] });

  const captures = [];
  for (const s of bulk.sources || []) captures.push(sourceCaptureRecord(s));
  for (const s of pilot.sources || []) {
    captures.push({
      ...sourceCaptureRecord({
        sourceId: `pilot_${s.sourceName?.replace(/\s+/g, '_').toLowerCase()}`,
        sourceName: s.sourceName,
        sourceUrl: s.sourceUrl || null,
        title: s.sourceName,
        speaker: null,
        date: null,
        platform: s.sourceType || 'manual',
        transcriptAvailable: s.copyrightStatus !== 'metadata_only',
        copyrightStatus: s.copyrightStatus || 'admin_attested',
        sourceType: s.sourceType,
      }),
    });
  }

  return captures;
}

function extractStressTestQuestions() {
  if (!fs.existsSync(PHASE2I_PATH)) return [];
  const data = loadJson(PHASE2I_PATH);
  const seen = new Set();
  const out = [];

  for (const turn of data.turns || []) {
    const key = normalizeQuestionKey(turn.message);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      question: turn.message,
      topic: turn.retrievedEvidence?.effectiveTopic || turn.group || inferTopic(turn.message),
      speaker: 'BibleBuddy QA',
      source: `phase2i_stress:${turn.scenarioId}`,
      sourceUrl: null,
      sourceType: 'stress_test_class_c',
    });
  }
  return out;
}

function extractQuestionsFromSources() {
  const bulk = loadJson(BULK_SOURCES_PATH, { sources: [] });
  const pilot = loadJson(PILOT_SOURCES_PATH, { sources: [] });
  const questions = [];

  for (const source of bulk.sources || []) {
    for (const q of source.questions || []) {
      questions.push({
        question: q.question,
        topic: q.topic || inferTopic(q.question),
        speaker: q.speaker || source.speaker || null,
        source: source.sourceId,
        sourceUrl: source.sourceUrl || null,
        sourceType: source.sourceType,
        scripturesCited: q.scripturesCited || [],
        scriptureOrder: q.scriptureOrder || q.scripturesCited || [],
        conclusion: q.conclusion || '',
      });
    }
  }

  for (const s of pilot.sources || []) {
    if (!s.question) continue;
    questions.push({
      question: s.question,
      topic: s.topic || inferTopic(s.question),
      speaker: null,
      source: s.sourceName || 'pilot_manual',
      sourceUrl: s.sourceUrl || null,
      sourceType: s.sourceType || 'manual_notes',
      scripturesCited: s.scripturesCited || s.scriptures || [],
      scriptureOrder: s.scriptureOrder || s.scripturesCited || [],
      conclusion: s.candidateConclusion || s.notes || '',
    });
  }

  questions.push(...extractStressTestQuestions());

  const { extracted } = extractDiscoveryQuestions();
  for (const item of extracted) {
    questions.push({
      question: item.question,
      topic: item.topic || inferTopic(item.question),
      speaker: null,
      source: item.source,
      sourceUrl: null,
      sourceType: item.sourceType,
      scripturesCited: item.scripturesCited || [],
      scriptureOrder: item.scriptureOrder || [],
      conclusion: item.candidateConclusion || '',
      pilotId: item.pilotId,
    });
  }

  const byKey = new Map();
  for (const q of questions) {
    const key = normalizeQuestionKey(q.question);
    if (!byKey.has(key)) {
      byKey.set(key, { ...q, frequency: 1 });
    } else {
      const existing = byKey.get(key);
      existing.frequency += 1;
      if ((q.scripturesCited || []).length > (existing.scripturesCited || []).length) {
        Object.assign(existing, q);
      }
    }
  }

  return [...byKey.values()];
}

function clusterQuestions(questions) {
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < questions.length; i += 1) {
    if (assigned.has(i)) continue;
    const cluster = { clusterId: `qc_${String(clusters.length + 1).padStart(3, '0')}`, questions: [questions[i]], topic: questions[i].topic };
    assigned.add(i);

    for (let j = i + 1; j < questions.length; j += 1) {
      if (assigned.has(j)) continue;
      const sim = questionSimilarity(questions[i].question, questions[j].question);
      const sameTopic = questions[i].topic === questions[j].topic;
      if (sim >= 0.55 || (sim >= 0.4 && sameTopic)) {
        cluster.questions.push(questions[j]);
        assigned.add(j);
      }
    }

    cluster.frequency = cluster.questions.reduce((s, q) => s + (q.frequency || 1), 0);
    cluster.representative = cluster.questions[0].question;
    clusters.push(cluster);
  }

  return clusters.sort((a, b) => b.frequency - a.frequency);
}

function extractScriptureChains(questions) {
  return questions
    .filter((q) => (q.scripturesCited || []).length > 0 || (q.scriptureOrder || []).length > 0)
    .map((q) => ({
      question: q.question,
      topic: q.topic,
      scripturesCited: q.scripturesCited || [],
      scriptureOrder: q.scriptureOrder?.length ? q.scriptureOrder : q.scripturesCited || [],
      conclusion: q.conclusion || '',
      source: q.source,
      sourceType: q.sourceType,
      speaker: q.speaker,
    }));
}

function verifyGenesisToRevelation(chain) {
  const refs = chain.scripturesCited || [];
  const order = chain.scriptureOrder || refs;
  const kjvResults = refs.map((ref) => ({ ref, ...verifyKjvReference(ref) }));
  const kjvValid = refs.length === 0 || kjvResults.every((r) => r.valid);
  const leaps = flagUnsupportedLeaps(order);
  const tradition = detectTraditionLanguage(chain.conclusion || '');
  const contradictions = detectContradictions(chain.topic, refs, chain.conclusion);
  const crossRef = crossReferenceCandidate({
    question: chain.question,
    scriptures: refs,
    scriptureOrder: order,
    topic: chain.topic,
    candidateConclusion: chain.conclusion,
  });
  const chainAnalysis = analyzeScriptureChain({
    scripturesCited: refs,
    scriptureOrder: order,
    topic: chain.topic,
    candidateConclusion: chain.conclusion,
  });
  const g2r = discoverGenesisToRevelation({
    scripturesCited: refs,
    scriptureOrder: order,
    topic: chain.topic,
  });

  const missingSupport = refs.filter((ref) => {
    const cr = (crossRef.crossReferences || []).find((x) => x.ref === ref);
    return cr && (!cr.onAnyFrozenCard || !cr.onSupportGraph);
  });

  const conclusionFollows = missingSupport.length === 0 && leaps.length <= 2 && contradictions.length === 0;

  return {
    question: chain.question,
    topic: chain.topic,
    kjvValid,
    kjvResults,
    orderPreserved: order.length >= refs.length,
    conclusionFollows,
    bindingConflicts: contradictions,
    contradictions,
    missingSupport,
    parallelScriptures: g2r.parallelScriptures,
    supportingScriptures: g2r.supportingScriptures,
    genesisToRevelationSpan: g2r.genesisToRevelationSpan,
    expansionCount: g2r.expansionCount,
    chainStrength: chainAnalysis.chainStrength,
    crossRefApprovalStatus: crossRef.approvalStatus,
  };
}

function discoverParallelScriptures(chain, verification) {
  const originalRefs = chain.scripturesCited || [];
  const parallelRefs = verification.parallelScriptures || [];
  const supporting = verification.supportingScriptures || [];

  const items = [];

  for (const ref of parallelRefs) {
    items.push({
      question: chain.question,
      originalRefs,
      parallelRefs: [ref],
      relationshipType: 'continuity_witness',
      reason: 'Approved continuity chain node not in original citation',
    });
  }

  for (const ref of supporting.slice(0, 5)) {
    items.push({
      question: chain.question,
      originalRefs,
      parallelRefs: [ref],
      relationshipType: 'supporting_witness',
      reason: 'Approved card/catalog/concordance alignment',
    });
  }

  return items;
}

function mapRecommendedAction(candidate) {
  const action = candidate.recommendedAction;
  if (action === 'approve_support_edge') return 'approve_support_edge';
  if (action === 'approve_card_ref') return 'approve_card_ref';
  if (candidate.genesisToRevelationSpan && candidate.supportScore >= 80) return 'approve_chain';
  if (action === 'hold') return 'hold';
  if (action === 'reject') return 'reject';
  return 'future_research';
}

function supportBandLabel(score) {
  if (score >= 95) return 'Strong';
  if (score >= 90) return 'Very Strong';
  if (score >= 80) return 'Strong Candidate';
  if (score >= 70) return 'Review';
  if (score >= 60) return 'Research';
  return 'Hold';
}

function buildBulkCandidate(input, index, verification, parallelItems) {
  const base = buildDiscoveryCandidate({
    question: input.question,
    scripturesCited: input.scripturesCited,
    scriptureOrder: input.scriptureOrder,
    topic: input.topic,
    candidateConclusion: input.conclusion || input.candidateConclusion || '',
    source: input.source,
    sourceType: input.sourceType,
    pilotId: input.pilotId,
  }, index);

  const parallelRefs = uniqueParallel(parallelItems);

  return {
    candidateId: `bulk_${String(index + 1).padStart(4, '0')}`,
    question: input.question,
    topic: base.topic,
    source: input.source,
    sourceType: input.sourceType,
    scriptures: base.scripturesCited,
    scriptureOrder: base.scriptureOrder,
    conclusion: base.candidateConclusion,
    parallelRefs,
    parallelDiscoveries: parallelItems,
    supportScore: base.supportScore,
    supportBand: supportBandLabel(base.supportScore),
    coverageScore: base.coverageScore,
    genesisToRevelationSpan: base.genesisToRevelationSpan,
    expansionCount: base.expansionCount,
    verification,
    recommendedAction: mapRecommendedAction(base),
    pilotId: input.pilotId || base.pilotId || null,
    degradationImpact: PHASE2I_CLASS_C_MAP[input.pilotId] || PHASE2I_CLASS_C_MAP[base.candidateId] || null,
    reviewRequired: true,
    autoApplied: false,
    discoveryPhase: '2J-E',
  };
}

function uniqueParallel(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    for (const ref of item.parallelRefs || []) {
      const key = ref.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ref);
    }
  }
  return out;
}

function topicCoverageGaps(questions) {
  const approvedTopics = new Set(getAllApprovedCards().map((c) => c.topic));
  const discoveredTopics = new Set(questions.map((q) => q.topic));
  const gaps = [...approvedTopics].filter((t) => !discoveredTopics.has(t));
  return gaps;
}

function runBulkScriptureDiscovery() {
  const sources = discoverBulkSources();
  const questions = extractQuestionsFromSources();
  const clusters = clusterQuestions(questions);
  const chains = extractScriptureChains(questions);

  const verifications = chains.map((c) => verifyGenesisToRevelation(c));
  const parallelDiscoveries = chains.flatMap((c, i) => discoverParallelScriptures(c, verifications[i]));

  const candidates = chains.map((chain, i) =>
    buildBulkCandidate(chain, i, verifications[i], discoverParallelScriptures(chain, verifications[i])),
  );

  const ranked = [...candidates].sort((a, b) => b.supportScore - a.supportScore);

  const scoreBuckets = {
    above95: candidates.filter((c) => c.supportScore >= 95).length,
    above90: candidates.filter((c) => c.supportScore >= 90).length,
    above80: candidates.filter((c) => c.supportScore >= 80).length,
    above70: candidates.filter((c) => c.supportScore >= 70).length,
    below60: candidates.filter((c) => c.supportScore < 60).length,
  };

  const topicCounts = questions.reduce((acc, q) => {
    const t = q.topic || 'mixed';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);

  const degradationCandidates = candidates.filter(
    (c) => ['approve_card_ref', 'approve_support_edge', 'approve_chain'].includes(c.recommendedAction)
      && c.supportScore >= 60,
  );

  const theologicalReview = candidates.filter(
    (c) => c.recommendedAction === 'hold' || (c.supportScore >= 80 && c.verification?.bindingConflicts?.length),
  );

  const readyForHumanApproval = candidates.filter(
    (c) => c.supportScore >= 80
      && ['approve_card_ref', 'approve_support_edge', 'approve_chain'].includes(c.recommendedAction)
      && c.verification?.kjvValid
      && !(c.verification?.contradictions?.length),
  );

  const expansions = candidates.filter((c) => c.expansionCount > 0);

  return {
    ranAt: new Date().toISOString(),
    discoveryPhase: '2J-E',
    sources,
    questions,
    clusters,
    chains,
    verifications,
    parallelDiscoveries,
    candidates,
    ranked,
    scoreBuckets,
    topicCounts,
    topTopics,
    coverageGaps: topicCoverageGaps(questions),
    degradationCandidates,
    theologicalReview,
    readyForHumanApproval,
    metrics: {
      sourceCount: sources.length,
      questionCount: questions.length,
      clusterCount: clusters.length,
      chainCount: chains.length,
      candidateCount: candidates.length,
      expansionCount: expansions.length,
      g2rSpans: candidates.filter((c) => c.genesisToRevelationSpan).length,
      scoreBuckets,
    },
  };
}

module.exports = {
  discoverBulkSources,
  extractQuestionsFromSources,
  clusterQuestions,
  extractScriptureChains,
  verifyGenesisToRevelation,
  discoverParallelScriptures,
  runBulkScriptureDiscovery,
  BULK_SOURCES_PATH,
};
