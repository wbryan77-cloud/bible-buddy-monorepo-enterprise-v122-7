/**
 * Phase 2J-G — Discovery Coverage Audit.
 * Analysis only — no promotion, no production mutation.
 */

const fs = require('fs');
const path = require('path');
const { runExpandedScriptureDiscovery } = require('./expandedScriptureDiscovery');
const {
  runBulkScriptureDiscovery,
  clusterQuestions,
  extractQuestionsFromSources,
} = require('./bulkScriptureDiscovery');
const { runScriptureDiscoveryPilot } = require('./scriptureDiscoveryPilot');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');

const PATHS = {
  bulkSources: path.join(__dirname, '..', 'data', 'bulk-discovery-sources.json'),
  expandedSources: path.join(__dirname, '..', 'data', 'expanded-discovery-sources.json'),
  expandedTranscripts: path.join(__dirname, '..', 'data', 'expanded-discovery-transcripts.json'),
  pilotSources: path.join(__dirname, '..', 'data', 'scripture-discovery-pilot-sources.json'),
  phase2i: path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2i-conversation-stress-results.json'),
  pilotJsonl: path.join(__dirname, '..', 'docs', 'evidence-candidates', 'scripture-discovery-pilot.jsonl'),
  expandedQueue: path.join(__dirname, '..', 'docs', 'evidence-candidates', 'expanded-discovery-queue.jsonl'),
};

function loadJson(p, fb = {}) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}

function normalizeKey(s = '') {
  return String(s).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function countRegistryEntries() {
  const bulk = loadJson(PATHS.bulkSources, { sources: [] });
  const expanded = loadJson(PATHS.expandedSources, { sources: [] });
  const transcripts = loadJson(PATHS.expandedTranscripts, { transcripts: [] });
  const pilot = loadJson(PATHS.pilotSources, { sources: [] });
  const phase2i = loadJson(PATHS.phase2i, { turns: [] });

  const sourcesAvailable = [];
  let registryQuestions = 0;
  let lessonsAvailable = 0;
  let qaSessionsAvailable = 0;
  let transcriptEntriesAvailable = 0;
  let transcriptHoursEstimated = 0;

  for (const s of bulk.sources || []) {
    const qCount = (s.questions || []).length;
    registryQuestions += qCount;
    sourcesAvailable.push({
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      platform: s.platform,
      transcriptAvailable: s.transcriptAvailable,
      transcriptProcessed: s.transcriptAvailable && qCount > 0,
      entryCount: qCount,
      status: qCount > 0 ? 'registered_with_entries' : 'registered_empty',
    });
    if (s.sourceType === 'iog_lesson_archive') lessonsAvailable += qCount;
    if (s.sourceType === 'iog_qa_archive') qaSessionsAvailable += qCount;
  }

  for (const s of expanded.sources || []) {
    const qCount = (s.entries || s.questions || []).length;
    registryQuestions += qCount;
    sourcesAvailable.push({
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      platform: s.platform,
      transcriptAvailable: s.transcriptProcessingAllowed,
      transcriptProcessed: s.transcriptProcessingAllowed,
      entryCount: qCount,
      status: 'expanded_registry',
    });
  }

  for (const t of transcripts.transcripts || []) {
    const eCount = (t.entries || []).length;
    transcriptEntriesAvailable += eCount;
    registryQuestions += eCount;
    transcriptHoursEstimated += eCount * 0.25;
    sourcesAvailable.push({
      sourceId: t.sourceId,
      sourceName: t.sourceName,
      platform: t.platform,
      transcriptAvailable: true,
      transcriptProcessed: !!t.transcriptProcessingAllowed,
      entryCount: eCount,
      status: t.transcriptProcessingAllowed ? 'transcript_processed' : 'transcript_blocked',
    });
    if (t.platform === 'iog_lesson_archive') lessonsAvailable += eCount;
    if (t.platform === 'iog_qa_archive') qaSessionsAvailable += eCount;
  }

  for (const s of pilot.sources || []) {
    registryQuestions += 1;
    sourcesAvailable.push({
      sourceId: `pilot_${s.sourceName}`,
      sourceName: s.sourceName,
      platform: s.sourceType,
      transcriptAvailable: s.copyrightStatus !== 'metadata_only',
      transcriptProcessed: true,
      entryCount: 1,
      status: 'pilot_manual',
    });
  }

  const phase2iTurns = phase2i.turns?.length || 0;
  const phase2iUnique = new Set((phase2i.turns || []).map((t) => normalizeKey(t.message))).size;

  sourcesAvailable.push({
    sourceId: 'phase2i_stress',
    sourceName: 'Phase 2I Conversation Stress Test',
    platform: 'internal',
    transcriptAvailable: true,
    transcriptProcessed: true,
    entryCount: phase2iTurns,
    uniqueQuestions: phase2iUnique,
    status: 'internal_stress',
  });

  const pilotRun = runScriptureDiscoveryPilot();
  sourcesAvailable.push({
    sourceId: 'pilot_class_c_extraction',
    sourceName: 'Phase 2J-A Class C extraction',
    platform: 'internal',
    transcriptAvailable: true,
    transcriptProcessed: true,
    entryCount: pilotRun.candidateCount,
    status: 'derived_stress',
  });

  const iogMetadataOnly = (bulk.sources || []).filter(
    (s) => s.copyrightStatus?.includes('metadata') && !(s.questions || []).length,
  ).length;

  const emptyRegistries = sourcesAvailable.filter((s) => s.entryCount === 0 && s.status.includes('empty')).length;
  const unlicensedBacklog = (bulk.sources || []).filter(
    (s) => s.copyrightStatus?.includes('pending') || s.copyrightStatus?.includes('metadata_only'),
  ).length;

  return {
    sourcesAvailable,
    totalSourcesAvailable: sourcesAvailable.length,
    totalSourcesProcessed: sourcesAvailable.filter((s) => s.transcriptProcessed || s.entryCount > 0).length,
    registryQuestions,
    phase2iTurns,
    phase2iUnique,
    pilotClassCCount: pilotRun.candidateCount,
    lessonsAvailable,
    qaSessionsAvailable,
    transcriptEntriesAvailable,
    transcriptHoursEstimated: Math.round(transcriptHoursEstimated * 10) / 10,
    iogMetadataOnlyBacklog: iogMetadataOnly,
    emptyRegistrySlots: emptyRegistries,
    unlicensedSourceBacklog: unlicensedBacklog,
    totalRawQuestionsEncountered:
      registryQuestions + phase2iTurns + pilotRun.candidateCount,
  };
}

function auditExtraction(expandedResult) {
  const rawBulk = extractQuestionsFromSources();
  const pilot = runScriptureDiscoveryPilot();
  const rawPilotQuestions = pilot.candidates.length;

  const allRaw = [];
  const bulk = loadJson(PATHS.bulkSources);
  const expanded = loadJson(PATHS.expandedSources);
  const transcripts = loadJson(PATHS.expandedTranscripts);
  const phase2i = loadJson(PATHS.phase2i);

  for (const s of bulk.sources || []) {
    for (const q of s.questions || []) {
      allRaw.push({ question: q.question, scripturesCited: q.scripturesCited || [], source: s.sourceId });
    }
  }
  for (const s of expanded.sources || []) {
    for (const q of s.entries || s.questions || []) {
      allRaw.push({ question: q.question, scripturesCited: q.scripturesCited || [], source: s.sourceId });
    }
  }
  for (const t of transcripts.transcripts || []) {
    for (const e of t.entries || []) {
      allRaw.push({
        question: e.question,
        scripturesCited: e.scripturesCited || [],
        conclusion: e.conclusion,
        source: t.sourceId,
      });
    }
  }
  for (const t of phase2i.turns || []) {
    allRaw.push({ question: t.message, scripturesCited: [], source: 'phase2i' });
  }
  for (const c of pilot.candidates) {
    allRaw.push({
      question: c.question,
      scripturesCited: c.scripturesCited || [],
      conclusion: c.candidateConclusion,
      source: c.source,
    });
  }

  const rawQuestionCount = allRaw.length;
  const dedupedCount = expandedResult.questions.length;

  const withScriptures = allRaw.filter((q) => (q.scripturesCited || []).length > 0);
  const withoutScriptures = allRaw.filter((q) => !(q.scripturesCited || []).length);

  const chainsExtracted = expandedResult.chains.length;
  const chainsSkipped = withScriptures.length - chainsExtracted;

  let discardedCitations = 0;
  const invalidRefs = [];
  for (const q of withScriptures) {
    for (const ref of q.scripturesCited || []) {
      const kjv = verifyKjvReference(ref);
      if (!kjv.valid) {
        discardedCitations += 1;
        invalidRefs.push({ ref, question: q.question?.slice(0, 50) });
      }
    }
  }

  const answersDiscarded = withoutScriptures.filter((q) => !q.conclusion).length;
  const answersWithoutScripture = withoutScriptures.length;

  return {
    rawQuestionCount,
    dedupedQuestionCount: dedupedCount,
    questionsExtracted: dedupedCount,
    questionsSkipped: rawQuestionCount - dedupedCount,
    questionsWithoutScripture: answersWithoutScripture,
    scriptureChainsExtracted: chainsExtracted,
    scriptureChainsSkipped: chainsSkipped,
    questionsWithScriptureRaw: withScriptures.length,
    discardedCitations,
    invalidRefs: invalidRefs.slice(0, 10),
    answersDiscarded,
    chainExtractionRate: withScriptures.length
      ? Math.round((chainsExtracted / withScriptures.length) * 1000) / 10
      : 0,
    questionReachRate: rawQuestionCount
      ? Math.round((dedupedCount / rawQuestionCount) * 1000) / 10
      : 0,
  };
}

function auditClustering(expandedResult) {
  const rawBeforeDedup = expandedResult.questions.reduce((s, q) => s + (q.frequency || 1), 0);
  const clustered = expandedResult.clusters.length;
  const mergedClusters = expandedResult.clusters.filter((c) => c.questions.length > 1);
  const largest = [...expandedResult.clusters].sort((a, b) => b.frequency - a.frequency).slice(0, 10);

  const rawUnique = expandedResult.questions.length;
  const mergedCount = mergedClusters.reduce((s, c) => s + c.questions.length - 1, 0);
  const lostUniquenessPct = rawBeforeDedup
    ? Math.round((mergedCount / rawBeforeDedup) * 1000) / 10
    : 0;

  return {
    rawQuestionsBeforeDedup: rawBeforeDedup,
    rawUniqueQuestions: rawUnique,
    clusteredQuestions: clustered,
    mergedClusters: mergedClusters.length,
    questionsMergedAway: mergedCount,
    lostUniquenessPct,
    largestClusters: largest.map((c) => ({
      clusterId: c.clusterId,
      topic: c.topic,
      frequency: c.frequency,
      variantCount: c.questions.length,
      representative: c.representative?.slice(0, 70),
    })),
  };
}

function auditG2R(expandedResult) {
  const expanded = expandedResult.candidates.filter((c) => c.genesisToRevelationSpan);
  const notExpanded = expandedResult.candidates.filter((c) => !c.genesisToRevelationSpan);

  const witnessCounts = expandedResult.candidates.map((c) => (c.parallelRefs || []).length);
  const avgWitnesses = witnessCounts.length
    ? Math.round((witnessCounts.reduce((a, b) => a + b, 0) / witnessCounts.length) * 10) / 10
    : 0;

  const parallelCounts = expandedResult.g2rResults.map((g) => (g.parallelWitnesses || []).length);
  const avgParallel = parallelCounts.length
    ? Math.round((parallelCounts.reduce((a, b) => a + b, 0) / parallelCounts.length) * 10) / 10
    : 0;

  return {
    totalChains: expandedResult.chains.length,
    chainsExpanded: expanded.length,
    chainsNotExpanded: notExpanded.length,
    expansionRate: expandedResult.chains.length
      ? Math.round((expanded.length / expandedResult.chains.length) * 1000) / 10
      : 0,
    avgWitnessesDiscovered: avgWitnesses,
    avgParallelScriptures: avgParallel,
    notExpandedReasons: {
      noGenesisAnchor: notExpanded.filter((c) => !c.g2rChainCandidate?.some((r) => /^genesis/i.test(r))).length,
      noRevelationAnchor: notExpanded.filter((c) => !c.g2rChainCandidate?.some((r) => /^revelation/i.test(r))).length,
      singleRefChains: notExpanded.filter((c) => (c.scriptures || []).length <= 1).length,
    },
  };
}

function assessReadiness(sourceAudit, extractionAudit, clusteringAudit, g2rAudit, expandedResult) {
  const registeredReach = sourceAudit.totalSourcesAvailable
    ? Math.round((sourceAudit.totalSourcesProcessed / sourceAudit.totalSourcesAvailable) * 1000) / 10
    : 0;

  const materialReach = sourceAudit.totalRawQuestionsEncountered
    ? Math.round((extractionAudit.dedupedQuestionCount / sourceAudit.totalRawQuestionsEncountered) * 1000) / 10
    : 0;

  const chainReach = extractionAudit.questionsWithScriptureRaw
    ? Math.round((extractionAudit.scriptureChainsExtracted / extractionAudit.questionsWithScriptureRaw) * 1000) / 10
    : 0;

  const corpusComplete = registeredReach >= 95
    && sourceAudit.emptyRegistrySlots === 0
    && sourceAudit.unlicensedSourceBacklog === 0;

  const bottlenecks = [];
  if (sourceAudit.unlicensedSourceBacklog > 0) {
    bottlenecks.push({ id: 'iog_license', severity: 'critical', note: `${sourceAudit.unlicensedSourceBacklog} IOG/metadata sources awaiting license for transcript processing` });
  }
  if (sourceAudit.emptyRegistrySlots > 0) {
    bottlenecks.push({ id: 'empty_registries', severity: 'high', note: `${sourceAudit.emptyRegistrySlots} registered source slots have zero entries` });
  }
  if (extractionAudit.questionsWithoutScripture > 50) {
    bottlenecks.push({ id: 'no_scripture', severity: 'high', note: `${extractionAudit.questionsWithoutScripture} questions lack scripture citations — cannot form chains` });
  }
  if (extractionAudit.discardedCitations > 0) {
    bottlenecks.push({ id: 'invalid_kjv', severity: 'medium', note: `${extractionAudit.discardedCitations} invalid KJV citations discarded` });
  }
  if (clusteringAudit.lostUniquenessPct > 15) {
    bottlenecks.push({ id: 'clustering', severity: 'medium', note: `${clusteringAudit.lostUniquenessPct}% uniqueness lost to dedup/clustering` });
  }
  if (g2rAudit.expansionRate < 50) {
    bottlenecks.push({ id: 'g2r_span', severity: 'medium', note: `Only ${g2rAudit.expansionRate}% of chains achieve G2R span` });
  }

  const largestBottleneck = bottlenecks.sort((a, b) => {
    const rank = { critical: 3, high: 2, medium: 1 };
    return (rank[b.severity] || 0) - (rank[a.severity] || 0);
  })[0];

  const hiddenCandidatesEstimate = Math.round(
    extractionAudit.questionsWithoutScripture * 0.15
    + sourceAudit.emptyRegistrySlots * 5
    + sourceAudit.unlicensedSourceBacklog * 20
    + extractionAudit.questionsSkipped * 0.3,
  );

  const promotionReviewReady = expandedResult.candidates.filter((c) => c.supportScore >= 80).length >= 8
    && bottlenecks.every((b) => b.severity !== 'critical')
    && extractionAudit.chainExtractionRate >= 90;

  return {
    registeredSourceReachPct: registeredReach,
    materialReachPct: materialReach,
    chainReachPct: chainReach,
    corpusComplete: false,
    partialCoverage: true,
    largestBottleneck: largestBottleneck || { id: 'none', note: 'No critical bottleneck identified' },
    bottlenecks,
    hiddenCandidatesEstimate,
    promotionReviewReady,
    promotionReviewVerdict: promotionReviewReady
      ? 'Conditionally ready — licensed IOG backlog remains before corpus-complete promotion review'
      : 'Not ready — resolve IOG licensing and scripture extraction gaps first',
  };
}

function runDiscoveryCoverageAudit() {
  const expandedResult = runExpandedScriptureDiscovery();
  const bulkResult = runBulkScriptureDiscovery();
  const sourceAudit = countRegistryEntries();
  const extractionAudit = auditExtraction(expandedResult);
  const clusteringAudit = auditClustering(expandedResult);
  const g2rAudit = auditG2R(expandedResult);
  const readiness = assessReadiness(sourceAudit, extractionAudit, clusteringAudit, g2rAudit, expandedResult);

  return {
    ranAt: new Date().toISOString(),
    phase: '2J-G',
    sourceAudit,
    extractionAudit,
    clusteringAudit,
    g2rAudit,
    readiness,
    expandedMetrics: expandedResult.metrics,
    bulkMetrics: bulkResult.metrics,
    safety: {
      graphEdges: getAllApprovedSupportEdges().length,
      cardCount: getAllApprovedCards().length,
      productionModified: false,
    },
  };
}

module.exports = {
  runDiscoveryCoverageAudit,
  countRegistryEntries,
  auditExtraction,
  auditClustering,
  auditG2R,
  assessReadiness,
};
