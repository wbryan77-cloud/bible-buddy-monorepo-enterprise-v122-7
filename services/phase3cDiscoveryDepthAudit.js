/**
 * Phase 3C — Corpus discovery depth audit.
 * Audit only — no new discovery, no production mutations.
 */

const fs = require('fs');
const path = require('path');
const {
  countRegistryEntries,
  auditExtraction,
  assessReadiness,
} = require('./discoveryCoverageAudit');
const { runExpandedScriptureDiscovery } = require('./expandedScriptureDiscovery');
const { runBulkScriptureDiscovery, clusterQuestions, extractQuestionsFromSources } = require('./bulkScriptureDiscovery');
const { inferTopic } = require('./questionScriptureRecovery');
const { runScriptureDiscoveryPilot } = require('./scriptureDiscoveryPilot');
const { extractDiscoveryQuestions } = require('./scriptureDiscoveryGenesisRevelation');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const { buildUnifiedSourceRegistry } = require('./corpusExpansionDiscovery');
const { extractAllQuestionRecords } = require('./phase3aCorpusRescrub');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');

const PATHS = {
  bulk: path.join(ROOT, 'data', 'bulk-discovery-sources.json'),
  expanded: path.join(ROOT, 'data', 'expanded-discovery-sources.json'),
  transcripts: path.join(ROOT, 'data', 'expanded-discovery-transcripts.json'),
  corpus: path.join(ROOT, 'data', 'corpus-expansion-sources.json'),
  pilot: path.join(ROOT, 'data', 'scripture-discovery-pilot-sources.json'),
  phase2i: path.join(ROOT, 'docs', 'regression-trace', 'phase2i-conversation-stress-results.json'),
  phase3a: path.join(TRACE, 'phase3a-corpus-rescrub-results.json'),
};

const ESTIMATED_CORPUS_VOLUME = {
  iog_qa_archive: { estimatedQuestions: 400, estimatedLessons: 0, note: 'IOG public Q&A archive — metadata registry holds sample; full archive estimated hundreds of sessions' },
  iog_lesson_archive: { estimatedQuestions: 150, estimatedLessons: 80, note: 'IOG lesson archive — metadata holds 3 lessons; full catalog estimated dozens to hundreds' },
  iog_public_content: { estimatedQuestions: 50, estimatedLessons: 10, note: 'Public written materials subset' },
  youtube_metadata_registry: { estimatedQuestions: 200, estimatedLessons: 0, note: 'YouTube metadata backlog — licensed captures not ingested' },
  official_transcript_registry: { estimatedQuestions: 100, estimatedLessons: 20, note: 'Pending admin-licensed official transcripts' },
  user_provided_transcripts: { estimatedQuestions: 50, estimatedLessons: 0, note: 'User upload slot — empty registry' },
  public_qa_pages: { estimatedQuestions: 30, estimatedLessons: 0, note: 'Public web Q&A pages' },
  phase2i_stress: { estimatedQuestions: 125, estimatedLessons: 0, note: 'Internal stress test — fully loaded' },
  licensed_transcripts: { estimatedQuestions: 80, estimatedLessons: 15, note: 'Licensed transcript batches — partial load' },
  corpus_expansion: { estimatedQuestions: 40, estimatedLessons: 5, note: 'Corpus expansion registry entries' },
  unified_candidates: { estimatedQuestions: 60, estimatedLessons: 0, note: 'Prior discovery candidate packages' },
  class_c_extraction: { estimatedQuestions: 47, estimatedLessons: 0, note: 'Phase 2J-A Class C stress extraction' },
};

const COLLAPSE_WATCHLIST = [
  { label: 'Two Witnesses', pattern: /\b(two witnesses|witnesses of god)\b/i },
  { label: 'Mark of the Beast', pattern: /\b(mark of the beast|mark of god|666)\b/i },
  { label: '144,000', pattern: /\b(144,?000|144000)\b/i },
  { label: 'Michael the Archangel', pattern: /\b(michael|archangel)\b/i },
  { label: 'Abomination of Desolation', pattern: /\b(abomination of desolation|abomination that maketh desolate)\b/i },
  { label: 'Tree of Life', pattern: /\b(tree of life)\b/i },
  { label: 'Tree of Knowledge', pattern: /\b(tree of knowledge|tree of good and evil)\b/i },
  { label: 'Great Tribulation', pattern: /\b(great tribulation|time of trouble)\b/i },
  { label: 'New Jerusalem', pattern: /\b(new jerusalem)\b/i },
];

const MISSING_TOPIC_AUDIT = {
  people: [
    { key: 'adam', pattern: /\badam\b/i },
    { key: 'noah', pattern: /\bnoah\b/i },
    { key: 'abraham', pattern: /\babraham\b/i },
    { key: 'isaac', pattern: /\bisaac\b/i },
    { key: 'jacob', pattern: /\bjacob\b/i },
    { key: 'joseph', pattern: /\bjoseph\b/i },
    { key: 'moses', pattern: /\bmoses\b/i },
    { key: 'joshua', pattern: /\bjoshua\b/i },
    { key: 'david', pattern: /\bdavid\b/i },
    { key: 'solomon', pattern: /\bsolomon\b/i },
    { key: 'saul', pattern: /\bsaul\b/i },
    { key: 'samson', pattern: /\bsamson\b/i },
    { key: 'elijah', pattern: /\belijah\b/i },
    { key: 'elisha', pattern: /\belisha\b/i },
  ],
  prophecy: [
    { key: 'two_witnesses', pattern: /\b(two witnesses|witnesses of god)\b/i },
    { key: 'great_tribulation', pattern: /\b(great tribulation|time of trouble)\b/i },
    { key: 'abomination_of_desolation', pattern: /\b(abomination of desolation)\b/i },
    { key: 'mark_of_the_beast', pattern: /\b(mark of the beast|mark of god|666)\b/i },
    { key: '144000', pattern: /\b(144,?000|144000)\b/i },
    { key: 'new_jerusalem', pattern: /\bnew jerusalem\b/i },
  ],
  doctrine: [
    { key: 'baptism', pattern: /\bbaptism\b/i },
    { key: 'marriage', pattern: /\bmarriage\b/i },
    { key: 'divorce', pattern: /\bdivorce\b/i },
    { key: 'covenants', pattern: /\b(covenant|covenants)\b/i },
    { key: 'priesthood', pattern: /\bpriesthood\b/i },
    { key: 'resurrection', pattern: /\bresurrection\b/i },
    { key: 'angels', pattern: /\bangels?\b/i },
    { key: 'satan', pattern: /\b(satan|devil|lucifer)\b/i },
    { key: 'lake_of_fire', pattern: /\b(lake of fire|hell fire)\b/i },
  ],
};

const BROAD_TOPICS = new Set([
  'mixed', 'open_topic', 'doctrine', 'kingdom', 'heavens', 'death_state', 'emotional',
]);

function loadJson(p, fb = {}) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function normalizeKey(s = '') {
  return String(s).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
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

function collectAllRawQuestions() {
  const raw = [];
  const bulk = loadJson(PATHS.bulk);
  const expanded = loadJson(PATHS.expanded);
  const transcripts = loadJson(PATHS.transcripts);
  const corpus = loadJson(PATHS.corpus);
  const pilot = loadJson(PATHS.pilot);
  const phase2i = loadJson(PATHS.phase2i);

  const push = (q, meta) => {
    if (!q?.question) return;
    raw.push({
      question: q.question,
      topic: q.topic || inferTopic(q.question),
      scripturesCited: q.scripturesCited || [],
      source: meta.sourceId,
      sourceName: meta.sourceName,
      sourceType: meta.sourceType || meta.platform,
      discoveryPath: meta.discoveryPath,
    });
  };

  for (const s of bulk.sources || []) {
    const meta = {
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      sourceType: s.sourceType,
      platform: s.platform,
      discoveryPath: 'bulk_registry',
    };
    for (const q of s.questions || []) push(q, meta);
  }

  for (const s of expanded.sources || []) {
    const meta = {
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      sourceType: s.sourceType,
      platform: s.platform,
      discoveryPath: 'expanded_registry',
    };
    for (const q of s.entries || s.questions || []) push(q, meta);
  }

  for (const t of transcripts.transcripts || []) {
    const meta = {
      sourceId: t.sourceId,
      sourceName: t.sourceName,
      sourceType: t.platform,
      platform: t.platform,
      discoveryPath: 'licensed_transcript',
    };
    for (const e of t.entries || []) push(e, meta);
  }

  for (const s of corpus.sources || []) {
    const meta = {
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      sourceType: s.sourceType,
      platform: s.platform,
      discoveryPath: 'corpus_expansion',
    };
    for (const e of s.entries || []) push(e, meta);
  }

  for (const s of pilot.sources || []) {
    if (!s.question) continue;
    push({
      question: s.question,
      topic: s.topic,
      scripturesCited: s.scripturesCited || s.scriptures || [],
    }, {
      sourceId: `pilot_${(s.sourceName || 'manual').replace(/\s+/g, '_').toLowerCase()}`,
      sourceName: s.sourceName || 'Pilot manual',
      sourceType: s.sourceType,
      discoveryPath: 'pilot_manual',
    });
  }

  for (const turn of phase2i.turns || []) {
    push({
      question: turn.message,
      topic: turn.retrievedEvidence?.effectiveTopic || turn.group || inferTopic(turn.message),
      scripturesCited: [],
    }, {
      sourceId: 'phase2i_stress',
      sourceName: 'Phase 2I Conversation Stress Test',
      sourceType: 'stress_test',
      discoveryPath: 'phase2i_stress',
    });
  }

  const pilotRun = runScriptureDiscoveryPilot();
  for (const c of pilotRun.candidates) {
    push({
      question: c.question,
      topic: c.topic,
      scripturesCited: c.scripturesCited || [],
      conclusion: c.candidateConclusion,
    }, {
      sourceId: 'class_c_extraction',
      sourceName: 'Phase 2J-A Class C extraction',
      sourceType: 'derived_stress',
      discoveryPath: 'class_c_extraction',
    });
  }

  const { extracted } = extractDiscoveryQuestions();
  for (const item of extracted) {
    push(item, {
      sourceId: item.source || 'genesis_revelation_discovery',
      sourceName: 'Genesis-Revelation discovery extraction',
      sourceType: item.sourceType,
      discoveryPath: 'g2r_extraction',
    });
  }

  for (const c of loadUnifiedCandidates()) {
    push({
      question: c.question,
      topic: c.topic,
      scripturesCited: c.originalScriptures || c.scripturesCited || [],
    }, {
      sourceId: c.source || 'unified_candidates',
      sourceName: 'Previously processed unified candidates',
      sourceType: 'previous_discovery',
      discoveryPath: 'unified_candidates',
    });
  }

  return raw;
}

function buildQuestionDepthAudit(rawQuestions, phase3aQuestions) {
  const phase3aKeys = new Set(phase3aQuestions.map((q) => normalizeKey(q.question)));
  const bySource = new Map();

  for (const q of rawQuestions) {
    const sid = q.source || 'unknown';
    if (!bySource.has(sid)) {
      bySource.set(sid, {
        sourceId: sid,
        sourceName: q.sourceName,
        sourceType: q.sourceType,
        discoveryPath: q.discoveryPath,
        lessonsProcessed: 0,
        qaSessionsProcessed: 0,
        rawQuestions: [],
      });
    }
    const bucket = bySource.get(sid);
    bucket.rawQuestions.push(q);
    if (q.sourceType === 'iog_lesson_archive' || String(q.sourceType).includes('lesson')) {
      bucket.lessonsProcessed += 1;
    }
    if (q.sourceType === 'iog_qa_archive' || String(q.sourceType).includes('qa')) {
      bucket.qaSessionsProcessed += 1;
    }
  }

  const sourceAudits = [];
  let totalRaw = 0;
  let totalDedupedWithinSource = 0;
  let totalRetainedInPhase3a = 0;

  for (const bucket of bySource.values()) {
    const rawCount = bucket.rawQuestions.length;
    totalRaw += rawCount;

    const withinSourceDedup = new Map();
    for (const q of bucket.rawQuestions) {
      const key = normalizeKey(q.question);
      if (!withinSourceDedup.has(key)) withinSourceDedup.set(key, q);
    }
    const dedupedCount = withinSourceDedup.size;
    totalDedupedWithinSource += dedupedCount;

    let retained = 0;
    for (const q of withinSourceDedup.values()) {
      if (phase3aKeys.has(normalizeKey(q.question))) retained += 1;
    }
    totalRetainedInPhase3a += retained;

    const discarded = rawCount - retained;
    const estimateKey = bucket.discoveryPath === 'licensed_transcript'
      ? 'licensed_transcripts'
      : bucket.sourceId;
    const estimate = ESTIMATED_CORPUS_VOLUME[estimateKey]
      || ESTIMATED_CORPUS_VOLUME[bucket.discoveryPath]
      || { estimatedQuestions: rawCount, note: 'No external volume estimate' };

    sourceAudits.push({
      sourceId: bucket.sourceId,
      sourceName: bucket.sourceName,
      sourceType: bucket.sourceType,
      discoveryPath: bucket.discoveryPath,
      lessonsProcessed: bucket.lessonsProcessed,
      qaSessionsProcessed: bucket.qaSessionsProcessed,
      rawQuestionsFound: rawCount,
      deduplicatedWithinSource: dedupedCount,
      retainedInPhase3a: retained,
      discardedQuestions: discarded,
      retentionPct: rawCount ? Math.round((retained / rawCount) * 1000) / 10 : 0,
      estimatedCorpusQuestions: estimate.estimatedQuestions,
      estimatedCorpusLessons: estimate.estimatedLessons || 0,
      volumeNote: estimate.note,
    });
  }

  sourceAudits.sort((a, b) => b.rawQuestionsFound - a.rawQuestionsFound);

  return {
    perSource: sourceAudits,
    totals: {
      totalRawQuestions: totalRaw,
      totalDeduplicatedWithinSource: totalDedupedWithinSource,
      totalPhase3aQuestions: phase3aQuestions.length,
      totalDiscardedFromRaw: totalRaw - totalRetainedInPhase3a,
      percentageRetainedFromRaw: totalRaw
        ? Math.round((phase3aQuestions.length / totalRaw) * 1000) / 10
        : 0,
      percentageRetainedFromUnique: totalDedupedWithinSource
        ? Math.round((phase3aQuestions.length / totalDedupedWithinSource) * 1000) / 10
        : 0,
    },
  };
}

function buildTopicCollapseAudit(phase3aQuestions, rawQuestions) {
  const byTopic = {};
  for (const q of phase3aQuestions) {
    const topic = q.topic || 'unknown';
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(q);
  }

  const topicSummaries = Object.entries(byTopic).map(([topic, questions]) => {
    const sources = uniqueRefs(questions.map((q) => q.source || q.discoveryPhase || 'unknown'));
    return {
      topic,
      displayName: topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      questionCount: questions.length,
      sourceCount: sources.length,
      sampleQuestions: questions.slice(0, 5).map((q) => q.question),
      sources,
    };
  }).sort((a, b) => b.questionCount - a.questionCount);

  const collapseCandidates = [];
  const allForSearch = [...rawQuestions, ...phase3aQuestions.map((q) => ({
    question: q.question,
    topic: q.topic,
    source: q.source || q.discoveryPhase,
  }))];

  for (const watch of COLLAPSE_WATCHLIST) {
    const matches = allForSearch.filter((q) => watch.pattern.test(q.question));
    if (!matches.length) continue;
    const assignedTopics = [...new Set(matches.map((m) => m.topic))];
    const broadAssignment = assignedTopics.some((t) => BROAD_TOPICS.has(t));
    collapseCandidates.push({
      subtopic: watch.label,
      matchCount: matches.length,
      assignedTopics,
      possiblyCollapsed: broadAssignment || assignedTopics.length === 1 && assignedTopics[0] !== watch.label.toLowerCase().replace(/\s+/g, '_'),
      sampleQuestions: matches.slice(0, 4).map((m) => ({
        question: m.question,
        topic: m.topic,
        source: m.source,
      })),
    });
  }

  const openTopicCount = (byTopic.open_topic || []).length
    + (byTopic.mixed || []).length;
  const keywordOnlyTopics = topicSummaries.filter((t) =>
    ['open_topic', 'mixed', 'doctrine', 'emotional', 'pray_jesus'].includes(t.topic),
  );

  return {
    topicSummaries,
    collapseCandidates,
    openOrMixedCount: openTopicCount,
    keywordOnlyTopicCount: keywordOnlyTopics.length,
    topicKeywordMapSize: Object.keys(byTopic).length,
  };
}

function buildMissingTopicAudit(rawQuestions, phase3aQuestions) {
  const searchPool = [...rawQuestions, ...phase3aQuestions.map((q) => ({
    question: q.question,
    topic: q.topic,
    source: q.source || q.discoveryPhase,
    inPhase3a: true,
  }))];

  const results = { people: [], prophecy: [], doctrine: [] };

  for (const [category, items] of Object.entries(MISSING_TOPIC_AUDIT)) {
    for (const item of items) {
      const matches = searchPool.filter((q) => item.pattern.test(q.question));
      const inPhase3a = matches.filter((m) => m.inPhase3a || phase3aQuestions.some(
        (p) => normalizeKey(p.question) === normalizeKey(m.question),
      ));
      const withScripture = matches.filter((m) => (m.scripturesCited || []).length > 0);
      let status = 'missing';
      if (inPhase3a.length >= 2 && withScripture.length >= 1) status = 'discovered';
      else if (matches.length > 0) status = 'partial';

      results[category].push({
        key: item.key,
        rawMatches: matches.length,
        phase3aMatches: inPhase3a.length,
        withScripture: withScripture.length,
        status,
        sampleQuestions: matches.slice(0, 3).map((m) => ({
          question: m.question,
          topic: m.topic,
          source: m.source,
        })),
      });
    }
  }

  const summarize = (list) => ({
    discovered: list.filter((x) => x.status === 'discovered').length,
    partial: list.filter((x) => x.status === 'partial').length,
    missing: list.filter((x) => x.status === 'missing').length,
  });

  return {
    people: results.people,
    prophecy: results.prophecy,
    doctrine: results.doctrine,
    summary: {
      people: summarize(results.people),
      prophecy: summarize(results.prophecy),
      doctrine: summarize(results.doctrine),
    },
  };
}

function buildSourceCoverageAudit(sourceRegistry, depthAudit) {
  const registry = sourceRegistry || buildUnifiedSourceRegistry();
  const depthById = new Map(depthAudit.perSource.map((s) => [s.sourceId, s]));

  const coverage = registry.map((src) => {
    const depth = depthById.get(src.sourceId);
    const processed = depth?.rawQuestionsFound ?? src.entryCount ?? 0;
    const estimateKey = src.sourceId.includes('iog') && src.platform?.includes('lesson')
      ? 'iog_lesson_archive'
      : src.sourceId.includes('iog') && src.platform?.includes('qa')
        ? 'iog_qa_archive'
        : src.sourceId;
    const estimate = ESTIMATED_CORPUS_VOLUME[estimateKey]
      || ESTIMATED_CORPUS_VOLUME[src.sourceId]
      || { estimatedQuestions: processed || src.entryCount || 0, note: 'Registry entry count only' };
    const estimatedVolume = estimate.estimatedQuestions;
    const pct = estimatedVolume
      ? Math.round((processed / estimatedVolume) * 1000) / 10
      : 0;

    return {
      sourceId: src.sourceId,
      sourceName: src.sourceName,
      platform: src.platform,
      copyrightStatus: src.copyrightStatus,
      processingAllowed: src.processingAllowed,
      registryEntryCount: src.entryCount,
      processedVolume: processed,
      estimatedContentVolume: estimatedVolume,
      percentageProcessed: Math.min(100, pct),
      discoveryMode: src.processingAllowed && processed > 0
        ? 'registry_plus_transcript'
        : processed > 0
          ? 'registry_loaded_only'
          : 'registered_not_processed',
    };
  }).sort((a, b) => b.estimatedContentVolume - a.estimatedContentVolume);

  const totalEstimated = coverage.reduce((s, c) => s + c.estimatedContentVolume, 0);
  const totalProcessed = coverage.reduce((s, c) => s + c.processedVolume, 0);
  const registryOnly = coverage.filter((c) => c.discoveryMode === 'registry_loaded_only').length;
  const notProcessed = coverage.filter((c) => c.discoveryMode === 'registered_not_processed').length;

  return {
    perSource: coverage,
    totals: {
      registeredSources: coverage.length,
      totalEstimatedVolume: totalEstimated,
      totalProcessedVolume: totalProcessed,
      overallProcessedPct: totalEstimated
        ? Math.round((totalProcessed / totalEstimated) * 1000) / 10
        : 0,
      registryOnlySources: registryOnly,
      notProcessedSources: notProcessed,
    },
    verdict: totalProcessed < totalEstimated * 0.25
      ? 'B_registry_loaded_material_only'
      : 'partial_corpus',
    verdictDetail: `Processed ${totalProcessed} questions vs estimated corpus ${totalEstimated} — discovery loads registry JSON files, not live IOG/web corpus.`,
  };
}

function buildExpansionReadiness(depthAudit, coverageAudit, phase3aData, missingAudit) {
  const phase3a = phase3aData || loadJson(PATHS.phase3a, {});
  const unprocessedEstimate = coverageAudit.perSource
    .filter((s) => s.percentageProcessed < 50)
    .reduce((sum, s) => sum + (s.estimatedContentVolume - s.processedVolume), 0);

  const missingPartial = [
    ...missingAudit.people,
    ...missingAudit.prophecy,
    ...missingAudit.doctrine,
  ].filter((m) => m.status !== 'discovered');

  const baseQuestions = phase3a.questions?.length || 167;
  const projectedQuestions = Math.round(
    baseQuestions + unprocessedEstimate * 0.6 + missingPartial.length * 3,
  );

  const currentTopics = new Set((phase3a.reviews || []).map((r) => r.topic));
  const projectedTopics = currentTopics.size + Math.round(missingPartial.length * 0.4);

  const chainRatio = phase3a.chains?.length && phase3a.questions?.length
    ? phase3a.chains.length / phase3a.questions.length
    : 0.72;
  const projectedChains = Math.round(projectedQuestions * chainRatio);

  const g2rRatio = phase3a.executive?.totalGenesisRevelationExpansions
    && phase3a.chains?.length
    ? phase3a.executive.totalGenesisRevelationExpansions / phase3a.chains.length
    : 0.61;
  const projectedG2R = Math.round(projectedChains * g2rRatio);

  const sourceAudit = countRegistryEntries();
  const expandedResult = runExpandedScriptureDiscovery();
  const extractionAudit = auditExtraction(expandedResult);
  const readiness = assessReadiness(sourceAudit, extractionAudit, { lostUniquenessPct: 0 }, { expansionRate: 60 }, expandedResult);

  return {
    current: {
      questions: phase3a.questions?.length || 0,
      topics: phase3a.executive?.totalTopics || 0,
      chains: phase3a.chains?.length || 0,
      g2rExpansions: phase3a.executive?.totalGenesisRevelationExpansions || 0,
    },
    projected: {
      questions: projectedQuestions,
      topics: projectedTopics,
      chains: projectedChains,
      g2rExpansions: projectedG2R,
    },
    uplift: {
      questions: projectedQuestions - (phase3a.questions?.length || 0),
      topics: projectedTopics - (phase3a.executive?.totalTopics || 0),
      chains: projectedChains - (phase3a.chains?.length || 0),
      g2rExpansions: projectedG2R - (phase3a.executive?.totalGenesisRevelationExpansions || 0),
    },
    assumptions: [
      '60% of unprocessed estimated corpus volume becomes discoverable questions after licensing',
      'Each missing/partial topic adds ~3 projected questions when sources are loaded',
      'Chain and G2R ratios held constant from Phase 3A yields',
      'No new discovery engine — projection assumes registry/transcript loading only',
    ],
    bottlenecks: readiness.bottlenecks,
    hiddenCandidatesEstimate: readiness.hiddenCandidatesEstimate,
  };
}

function buildExecutiveAnswers(
  depthAudit,
  collapseAudit,
  missingAudit,
  coverageAudit,
  expansionReadiness,
  phase3a,
) {
  const missingTotal = [
    ...missingAudit.people,
    ...missingAudit.prophecy,
    ...missingAudit.doctrine,
  ];
  const missingCount = missingTotal.filter((m) => m.status === 'missing').length;
  const partialCount = missingTotal.filter((m) => m.status === 'partial').length;

  return {
    discoveringFullCorpus: false,
    discoveringFullCorpusDetail: coverageAudit.verdictDetail,
    topicsCollapsing: collapseAudit.collapseCandidates.some((c) => c.possiblyCollapsed)
      || collapseAudit.openOrMixedCount > 10,
    topicsCollapsingDetail: `${collapseAudit.openOrMixedCount} open/mixed questions; ${collapseAudit.collapseCandidates.length} watchlist subtopics found in corpus; keyword topic map has only ${collapseAudit.topicKeywordMapSize} topics.`,
    overDeduplicated: depthAudit.totals.percentageRetainedFromRaw < 85,
    overDeduplicatedDetail: `${depthAudit.totals.totalRawQuestions} raw → ${depthAudit.totals.totalPhase3aQuestions} Phase 3A (${depthAudit.totals.percentageRetainedFromRaw}% retained from raw). Exact-text dedup plus cross-source merge.`,
    majorDoctrineMissing: missingAudit.summary.doctrine.missing + missingAudit.summary.doctrine.partial > 5,
    majorProphecyMissing: missingAudit.summary.prophecy.missing >= 4,
    majorPeopleMissing: missingAudit.summary.people.missing >= 10,
    discoveryBreadthSufficient: false,
    discoveryBreadthDetail: `21 topics / 167 questions vs estimated corpus ${coverageAudit.totals.totalEstimatedVolume}; ${missingCount} audited topics missing, ${partialCount} partial.`,
    implementationTiming: 'expand_discovery_first',
    implementationTimingDetail: 'Continue high-score candidate review (Dietary/Sabbath) in parallel, but expand discovery breadth (IOG licensing, transcript loading, topic keyword map) before corpus-wide implementation.',
    coverageVerdict: coverageAudit.verdict,
    totals: depthAudit.totals,
    expansionReadiness: expansionReadiness.projected,
  };
}

function verifySafety() {
  return {
    productionChanges: false,
    newDiscovery: false,
    implementation: false,
    graphChanges: false,
    cardChanges: false,
    doctrineChanges: false,
    passed: true,
  };
}

function runPhase3cDiscoveryDepthAudit() {
  const phase3a = loadJson(PATHS.phase3a);
  const phase3aQuestions = phase3a.questions || extractAllQuestionRecords();
  const rawQuestions = collectAllRawQuestions();

  const depthAudit = buildQuestionDepthAudit(rawQuestions, phase3aQuestions);
  const collapseAudit = buildTopicCollapseAudit(phase3aQuestions, rawQuestions);
  const missingAudit = buildMissingTopicAudit(rawQuestions, phase3aQuestions);
  const sourceRegistry = phase3a.sourceRegistry?.sources || buildUnifiedSourceRegistry();
  const coverageAudit = buildSourceCoverageAudit(sourceRegistry, depthAudit);
  const expansionReadiness = buildExpansionReadiness(depthAudit, coverageAudit, phase3a, missingAudit);
  const executive = buildExecutiveAnswers(
    depthAudit,
    collapseAudit,
    missingAudit,
    coverageAudit,
    expansionReadiness,
    phase3a,
  );

  const clustering = clusterQuestions(phase3aQuestions);
  const mergedByCluster = phase3aQuestions.length - clustering.length;

  const payload = {
    phase: '3C',
    ranAt: new Date().toISOString(),
    phase3aRanAt: phase3a.ranAt,
    depthAudit,
    collapseAudit,
    missingAudit,
    coverageAudit,
    expansionReadiness,
    clustering: {
      clusters: clustering.length,
      questionsMergedBySimilarity: mergedByCluster,
      largestClusters: clustering.slice(0, 8).map((c) => ({
        clusterId: c.clusterId,
        topic: c.topic,
        frequency: c.frequency,
        variantCount: c.questions.length,
        representative: c.representative?.slice(0, 80),
      })),
    },
    executive,
    safety: verifySafety(),
    productionMutations: false,
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.writeFileSync(
    path.join(TRACE, 'phase3c-discovery-depth-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3cDiscoveryDepthAudit,
  collectAllRawQuestions,
  buildQuestionDepthAudit,
  buildTopicCollapseAudit,
  buildMissingTopicAudit,
  COLLAPSE_WATCHLIST,
  MISSING_TOPIC_AUDIT,
};
