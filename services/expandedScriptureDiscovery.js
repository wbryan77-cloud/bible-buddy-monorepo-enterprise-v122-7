/**
 * Phase 2J-F — Full Discovery Source Expansion.
 * Open-topic discovery, transcript processing where licensed, G2R expansion V2.
 * Discovery only — no production mutation.
 */

const fs = require('fs');
const path = require('path');
const {
  runBulkScriptureDiscovery,
  clusterQuestions,
  verifyGenesisToRevelation,
  discoverParallelScriptures,
} = require('./bulkScriptureDiscovery');
const {
  buildDiscoveryCandidate,
  discoverGenesisToRevelation,
  detectContradictions,
} = require('./scriptureDiscoveryGenesisRevelation');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { getSeedConcordanceIndex } = require('./concordanceFoundation');
const { getAllApprovedCards } = require('./evidenceCards');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { crossReferenceCandidate } = require('./scriptureDiscoveryCrossReference');
const { PHASE2I_CLASS_C_MAP } = require('./candidatePromotionEngine');

const EXPANDED_TRANSCRIPTS_PATH = path.join(__dirname, '..', 'data', 'expanded-discovery-transcripts.json');
const EXPANDED_SOURCES_PATH = path.join(__dirname, '..', 'data', 'expanded-discovery-sources.json');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'what', 'does', 'about', 'according',
  'scripture', 'bible', 'say', 'mean', 'would', 'could', 'should', 'when', 'where', 'which',
  'have', 'been', 'they', 'them', 'your', 'you', 'are', 'was', 'were', 'how', 'why', 'can',
]);

const REF_EXTRACT_RE = /\b(?:(?:\d\s)?[1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?/g;

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

function extractRefsFromText(text = '') {
  const matches = String(text).match(REF_EXTRACT_RE) || [];
  const valid = [];
  const seen = new Set();
  for (const m of matches) {
    const ref = m.replace(/\s+/g, ' ').trim();
    const kjv = verifyKjvReference(ref);
    if (!kjv.valid) continue;
    const key = ref.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(ref);
  }
  return valid;
}

function discoverOpenTopic(question = '', mappedTopic = null) {
  const tokens = normalizeKey(question).split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const topicName = tokens.slice(0, 3).join('_') || 'open_topic';
  const approvedTopics = new Set(getAllApprovedCards().map((c) => c.topic));
  const isNewTopic = !mappedTopic || !approvedTopics.has(mappedTopic);

  return {
    topicName: mappedTopic || topicName,
    discoveredTopic: topicName,
    isNewTopic: isNewTopic || !approvedTopics.has(mappedTopic),
    keywords: tokens.slice(0, 8),
  };
}

function processTranscriptSources() {
  const data = loadJson(EXPANDED_TRANSCRIPTS_PATH, { transcripts: [] });
  const records = [];

  for (const transcript of data.transcripts || []) {
    if (!transcript.transcriptProcessingAllowed) continue;

    for (const entry of transcript.entries || []) {
      const fromAnswer = extractRefsFromText(`${entry.answerSummary || ''} ${entry.conclusion || ''}`);
      const scripturesCited = [...new Set([...(entry.scripturesCited || []), ...fromAnswer])];
      const scriptureOrder = entry.scriptureOrder?.length ? entry.scriptureOrder : scripturesCited;

      records.push({
        sourceName: transcript.sourceName,
        sourceUrl: transcript.sourceUrl,
        title: transcript.title,
        speaker: transcript.speaker,
        date: transcript.date,
        platform: transcript.platform,
        question: entry.question,
        answerSummary: entry.answerSummary || '',
        scripturesCited,
        scriptureOrder,
        conclusion: entry.conclusion || entry.answerSummary || '',
        transcriptProcessed: true,
        copyrightStatus: transcript.copyrightStatus,
        reviewRequired: true,
        source: transcript.sourceId,
        sourceType: transcript.platform,
      });
    }
  }

  return records;
}

function processExpandedSourceRegistry() {
  const data = loadJson(EXPANDED_SOURCES_PATH, { sources: [] });
  const records = [];

  for (const source of data.sources || []) {
    const canProcess = source.transcriptProcessingAllowed === true;

    for (const entry of source.entries || source.questions || []) {
      const fromText = canProcess
        ? extractRefsFromText(`${entry.answerSummary || ''} ${entry.conclusion || ''} ${entry.answer || ''}`)
        : [];
      const scripturesCited = [...new Set([...(entry.scripturesCited || []), ...fromText])];

      records.push({
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        title: source.title,
        speaker: entry.speaker || source.speaker,
        date: source.date,
        platform: source.platform,
        question: entry.question,
        answerSummary: entry.answerSummary || entry.answer || '',
        scripturesCited,
        scriptureOrder: entry.scriptureOrder?.length ? entry.scriptureOrder : scripturesCited,
        conclusion: entry.conclusion || entry.answerSummary || '',
        transcriptProcessed: canProcess,
        copyrightStatus: source.copyrightStatus,
        reviewRequired: true,
        source: source.sourceId,
        sourceType: source.sourceType,
      });
    }
  }

  return records;
}

function buildSourceInventory(transcriptRecords, bulkResult) {
  const inventory = [];
  const seen = new Set();

  for (const r of transcriptRecords) {
    const key = r.source;
    if (seen.has(key)) continue;
    seen.add(key);
    inventory.push({
      sourceName: r.sourceName,
      sourceUrl: r.sourceUrl,
      title: r.title,
      speaker: r.speaker,
      date: r.date,
      platform: r.platform,
      transcriptAvailable: true,
      transcriptProcessed: true,
      copyrightStatus: r.copyrightStatus,
      reviewRequired: true,
    });
  }

  for (const s of bulkResult.sources) {
    if (seen.has(s.sourceId)) continue;
    seen.add(s.sourceId);
    inventory.push({
      sourceName: s.sourceName,
      sourceUrl: s.sourceUrl,
      title: s.title,
      speaker: s.speaker,
      date: s.date,
      platform: s.platform,
      transcriptAvailable: s.transcriptAvailable,
      transcriptProcessed: false,
      copyrightStatus: s.copyrightStatus,
      reviewRequired: true,
    });
  }

  return inventory;
}

function mergeQuestions(bulkQuestions, expandedRecords) {
  const all = [...bulkQuestions];

  for (const r of expandedRecords) {
    all.push({
      question: r.question,
      topic: r.topic || null,
      speaker: r.speaker,
      source: r.source,
      sourceUrl: r.sourceUrl,
      sourceType: r.sourceType,
      scripturesCited: r.scripturesCited,
      scriptureOrder: r.scriptureOrder,
      conclusion: r.conclusion,
      answerSummary: r.answerSummary,
      transcriptProcessed: r.transcriptProcessed,
      frequency: 1,
    });
  }

  const byKey = new Map();
  for (const q of all) {
    const key = normalizeKey(q.question);
    const openTopic = discoverOpenTopic(q.question, q.topic);
    const enriched = { ...q, ...openTopic, topic: q.topic || openTopic.topicName };

    if (!byKey.has(key)) {
      byKey.set(key, enriched);
    } else {
      const ex = byKey.get(key);
      ex.frequency = (ex.frequency || 1) + 1;
      if ((q.scripturesCited || []).length > (ex.scripturesCited || []).length) {
        Object.assign(ex, enriched);
      }
    }
  }

  return [...byKey.values()];
}

function discoverOpenTopics(questions, clusters) {
  const topicMap = new Map();

  for (const q of questions) {
    const name = q.discoveredTopic || q.topic || 'open_topic';
    if (!topicMap.has(name)) {
      topicMap.set(name, {
        topicName: name,
        mappedTopic: q.topic,
        isNewTopic: q.isNewTopic,
        questionFrequency: 0,
        questions: [],
        keywords: new Set(),
      });
    }
    const t = topicMap.get(name);
    t.questionFrequency += q.frequency || 1;
    t.questions.push(q.question);
    for (const kw of q.keywords || []) t.keywords.add(kw);
  }

  const topics = [...topicMap.values()].map((t) => ({
    ...t,
    keywords: [...t.keywords],
    questionCluster: clusters.find((c) => c.questions.some((q) => t.questions.includes(q.question)))?.clusterId || null,
    relatedQuestions: t.questions.slice(0, 5),
    isNewTopic: t.isNewTopic || !getAllApprovedCards().some((c) => c.topic === t.mappedTopic),
    reviewRequired: true,
    productionTopic: false,
  }));

  return topics.sort((a, b) => b.questionFrequency - a.questionFrequency);
}

function searchCorpusForG2R(scripturesCited = [], scriptureOrder = []) {
  const continuity = loadContinuityChains().chains || [];
  const concordance = getSeedConcordanceIndex();
  const allContinuityRefs = continuity.flatMap((c) => (c.nodes || []).map((n) => n.reference));
  const genesisAnchors = allContinuityRefs.filter((r) => /^genesis/i.test(r));
  const revelationAnchors = allContinuityRefs.filter((r) => /^revelation/i.test(r));

  const cited = new Set(scripturesCited.map((r) => r.toLowerCase()));
  const parallelWitnesses = allContinuityRefs.filter((r) => !cited.has(r.toLowerCase()));
  const concordanceWitnesses = concordance
    .flatMap((e) => e.occurrences || [])
    .filter((r) => !cited.has(r.toLowerCase()));

  const suggestedGenesis = genesisAnchors.filter((r) => !cited.has(r.toLowerCase())).slice(0, 3);
  const suggestedRevelation = revelationAnchors.filter((r) => !cited.has(r.toLowerCase())).slice(0, 3);

  const directRefs = uniqueRefs([...scripturesCited, ...scriptureOrder]);
  const directGenesis = directRefs.some((r) => /^genesis/i.test(r));
  const directRevelation = directRefs.some((r) => /^revelation/i.test(r));

  const g2rChainCandidate = uniqueRefs([
    ...suggestedGenesis,
    ...scriptureOrder,
    ...suggestedRevelation,
  ]);

  const expandedGenesis = g2rChainCandidate.some((r) => /^genesis/i.test(r));
  const expandedRevelation = g2rChainCandidate.some((r) => /^revelation/i.test(r));
  const genesisToRevelationSpan = (directGenesis && directRevelation)
    || (expandedGenesis && expandedRevelation && directRefs.length >= 2);

  return {
    parallelWitnesses: uniqueRefs([...parallelWitnesses, ...concordanceWitnesses]).slice(0, 12),
    genesisAnchors: suggestedGenesis,
    revelationAnchors: suggestedRevelation,
    g2rChainCandidate,
    genesisToRevelationSpan,
    directGenesis,
    directRevelation,
    continuityChainsSearched: continuity.length,
  };
}

function uniqueRefs(refs) {
  const seen = new Set();
  const out = [];
  for (const r of refs) {
    const k = String(r).toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function computeExpandedSupportScore(base, g2rV2, crossRef) {
  let score = base.supportScore ?? 0;
  const witnessBonus = Math.min(8, (g2rV2.parallelWitnesses?.length || 0) * 0.5);
  const g2rBonus = g2rV2.genesisToRevelationSpan ? 5 : 0;
  const alignment = crossRef.supportScore ?? 0;
  const multiWitness = (base.scripturesCited?.length || 0) >= 3 ? 3 : 0;
  const contradictionPenalty = (base.contradictions?.length || 0) * 15;

  score = Math.round(
    score * 0.7 + alignment * 0.15 + witnessBonus + g2rBonus + multiWitness - contradictionPenalty,
  );
  return Math.max(0, Math.min(100, score));
}

function mapAction(base, g2rV2, score) {
  if (base.recommendedAction === 'reject') return 'reject';
  if (score < 60) return 'future_research';
  if (base.recommendedAction === 'approve_card_ref') return 'approve_card_ref';
  if (base.recommendedAction === 'approve_support_edge') return 'approve_support_edge';
  if (g2rV2.genesisToRevelationSpan && score >= 75) return 'approve_chain';
  if (score >= 70) return 'hold';
  return 'future_research';
}

function buildExpandedCandidate(chain, index, g2rV2) {
  const base = buildDiscoveryCandidate({
    question: chain.question,
    scripturesCited: chain.scripturesCited,
    scriptureOrder: chain.scriptureOrder,
    topic: chain.topic,
    candidateConclusion: chain.conclusion,
    source: chain.source,
    sourceType: chain.sourceType,
    pilotId: chain.pilotId,
  }, index);

  const verification = verifyGenesisToRevelation(chain);
  const parallelItems = discoverParallelScriptures(chain, verification);
  const crossRef = crossReferenceCandidate({
    question: chain.question,
    scriptures: chain.scripturesCited,
    scriptureOrder: chain.scriptureOrder,
    topic: chain.topic,
    candidateConclusion: chain.conclusion,
  });

  const supportScore = computeExpandedSupportScore(
    { ...base, contradictions: base.contradictions },
    g2rV2,
    crossRef,
  );

  const openTopic = discoverOpenTopic(chain.question, chain.topic);

  return {
    candidateId: `exp_${String(index + 1).padStart(4, '0')}`,
    question: chain.question,
    topic: chain.topic,
    discoveredTopic: openTopic.discoveredTopic,
    isNewTopic: openTopic.isNewTopic,
    source: chain.source,
    sourceType: chain.sourceType,
    scriptures: chain.scripturesCited,
    scriptureOrder: chain.scriptureOrder,
    conclusion: chain.conclusion,
    answerSummary: chain.answerSummary || '',
    parallelRefs: uniqueRefs([
      ...g2rV2.parallelWitnesses,
      ...parallelItems.flatMap((p) => p.parallelRefs),
    ]),
    g2rChainCandidate: g2rV2.g2rChainCandidate,
    genesisAnchors: g2rV2.genesisAnchors,
    revelationAnchors: g2rV2.revelationAnchors,
    genesisToRevelationSpan: g2rV2.genesisToRevelationSpan,
    supportScore,
    coverageScore: base.coverageScore,
    recommendedAction: mapAction(base, g2rV2, supportScore),
    degradationImpact: PHASE2I_CLASS_C_MAP[chain.pilotId] || null,
    reviewRequired: true,
    autoApplied: false,
    humanApprovalRequired: true,
    discoveryPhase: '2J-F',
  };
}

function extractAllChains(questions) {
  return questions
    .filter((q) => (q.scripturesCited || []).length > 0)
    .map((q) => ({
      question: q.question,
      topic: q.topic,
      discoveredTopic: q.discoveredTopic,
      scripturesCited: q.scripturesCited,
      scriptureOrder: q.scriptureOrder?.length ? q.scriptureOrder : q.scripturesCited,
      conclusion: q.conclusion || q.answerSummary || '',
      source: q.source,
      sourceType: q.sourceType,
      speaker: q.speaker,
      pilotId: q.pilotId,
      answerSummary: q.answerSummary,
    }));
}

function runExpandedScriptureDiscovery() {
  const bulkResult = runBulkScriptureDiscovery();
  const transcriptRecords = processTranscriptSources();
  const expandedRecords = processExpandedSourceRegistry();
  const allExpanded = [...transcriptRecords, ...expandedRecords];

  const sourceInventory = buildSourceInventory(transcriptRecords, bulkResult);
  const questions = mergeQuestions(bulkResult.questions, allExpanded);
  const clusters = clusterQuestions(questions);
  const openTopics = discoverOpenTopics(questions, clusters);
  const chains = extractAllChains(questions);

  const g2rResults = chains.map((c) => searchCorpusForG2R(c.scripturesCited, c.scriptureOrder));
  const candidates = chains.map((chain, i) => buildExpandedCandidate(chain, i, g2rResults[i]));
  const ranked = [...candidates].sort((a, b) => b.supportScore - a.supportScore);

  const scoreBuckets = {
    above95: candidates.filter((c) => c.supportScore >= 95).length,
    above90: candidates.filter((c) => c.supportScore >= 90).length,
    above80: candidates.filter((c) => c.supportScore >= 80).length,
  };

  const g2rChains = candidates.filter((c) => c.genesisToRevelationSpan);
  const newTopicCount = openTopics.filter((t) => t.isNewTopic).length;

  const degradationCandidates = ranked.filter(
    (c) => ['approve_card_ref', 'approve_support_edge', 'approve_chain'].includes(c.recommendedAction)
      && c.supportScore >= 60,
  );

  return {
    ranAt: new Date().toISOString(),
    discoveryPhase: '2J-F',
    sourceInventory,
    transcriptRecords,
    expandedRecords,
    questions,
    clusters,
    openTopics,
    chains,
    g2rResults,
    candidates,
    ranked,
    scoreBuckets,
    degradationCandidates,
    metrics: {
      sourcesProcessed: sourceInventory.length,
      transcriptSourcesProcessed: transcriptRecords.length,
      questionCount: questions.length,
      topicCount: openTopics.length,
      newTopicCount,
      chainCount: chains.length,
      g2rChainCount: g2rChains.length,
      candidateCount: candidates.length,
      scoreBuckets,
    },
  };
}

module.exports = {
  runExpandedScriptureDiscovery,
  processTranscriptSources,
  processExpandedSourceRegistry,
  discoverOpenTopic,
  searchCorpusForG2R,
  EXPANDED_TRANSCRIPTS_PATH,
};
