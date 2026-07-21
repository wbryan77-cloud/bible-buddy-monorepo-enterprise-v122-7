/**
 * Phase 3E — Full open-source IOG / ICOJ corpus scrub orchestrator.
 * Discovery ingestion only — no production mutations.
 */

const fs = require('fs');
const path = require('path');
const { scrubRegistrySource } = require('./openSourceScrubber');
const { extractAllCorpusRecords } = require('./phase3dCorpusExpansion');
const { assignRecordTopic, buildTopicMap, SEED_CATEGORIES } = require('./bibleWideTopicDiscovery');
const { extractScriptureChains } = require('./bulkScriptureDiscovery');
const { expandFullScriptureWitnesses } = require('./corpusExpansionDiscovery');
const { buildUnifiedReviewObject } = require('./scriptureResearchReviewConsole');
const { discoverGenesisToRevelation } = require('./scriptureDiscoveryGenesisRevelation');
const { correctedClassifyScriptureBuckets } = require('./phase3bDiscoveryAudit');
const {
  deriveLessonTitle,
  strengthTierForScore,
  STRENGTH_TIERS,
} = require('./scriptureStrengthReview');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const REGISTRY_PATH = path.join(ROOT, 'data', 'full-corpus-source-registry.json');
const SCRUB_CACHE = path.join(ROOT, 'data', 'phase3e-scrubbed-corpus.json');

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function normalizeExactKey(q = '') {
  return String(q).toLowerCase().replace(/\s+/g, ' ').trim();
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

function legacyRecordToExtraction(r) {
  return {
    sourceName: r.sourceName || r.source,
    camp: r.camp || 'Internal',
    organization: r.organization || 'Internal',
    lessonTitle: r.lessonTitle || deriveLessonTitle({ question: r.question, topic: r.topic }),
    question: r.question,
    answerSummary: r.answerSummary || r.conclusion || '',
    scripturesCited: r.scripturesCited || [],
    scriptureOrder: r.scriptureOrder || r.scripturesCited || [],
    sourceUrl: r.sourceUrl || r.source,
    sourceType: r.sourceType || r.discoveryPath || 'legacy',
    contentKind: 'legacy_merge',
    discoveryPhase: r.discoveryPhase || '3D',
    frequency: r.frequency || 1,
  };
}

function mergeExtractions(scrubbedItems, legacyRecords) {
  const records = [];
  for (const item of [...scrubbedItems, ...legacyRecords.map(legacyRecordToExtraction)]) {
    records.push(assignRecordTopic({
      ...item,
      topic: item.topicCandidate,
      frequency: 1,
    }));
  }

  const byExact = new Map();
  for (const record of records) {
    const key = normalizeExactKey(record.question);
    if (!key) continue;
    if (!byExact.has(key)) {
      byExact.set(key, { ...record, frequency: record.frequency || 1 });
    } else {
      const ex = byExact.get(key);
      ex.frequency += record.frequency || 1;
      if ((record.scripturesCited || []).length > (ex.scripturesCited || []).length) {
        Object.assign(ex, record, { frequency: ex.frequency });
      }
    }
  }

  return [...byExact.values()];
}

function buildReviewPipeline(questions) {
  const chains = extractScriptureChains(questions).map((c) => {
    const q = questions.find((x) => normalizeExactKey(x.question) === normalizeExactKey(c.question));
    return {
      ...c,
      topic: q?.topic || c.topic,
      lessonTitle: q?.lessonTitle,
      camp: q?.camp,
      sourceName: q?.sourceName,
    };
  });

  const witnessExpansions = chains.map((c) => expandFullScriptureWitnesses(c));
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
      candidateId: `3e_${String(candidates.length + 1).padStart(4, '0')}`,
      question: chain.question,
      topic: chain.topic,
      lessonTitle: chain.lessonTitle,
      camp: chain.camp,
      sourceName: chain.sourceName,
      sourceUrl: chain.source,
      originalScriptures: chain.scripturesCited,
      scriptureOrder,
      candidateConclusion: w.strengthenedConclusion || chain.conclusion || '',
      discoveryPhase: '3E',
      reviewRequired: true,
      autoApplied: false,
    });
  }

  const reviews = candidates.map((c, i) => {
    const base = buildUnifiedReviewObject({
      ...c,
      scripturesCited: c.originalScriptures,
      source: c.sourceName,
      sourceType: '3E-scrub',
    });
    const g2r = discoverGenesisToRevelation({
      scripturesCited: c.scriptureOrder,
      scriptureOrder: c.scriptureOrder,
      topic: c.topic,
    });
    const buckets = correctedClassifyScriptureBuckets(c.scriptureOrder, witnessExpansions[i], g2r);
    return {
      ...base,
      lessonTitle: c.lessonTitle,
      camp: c.camp,
      sourceName: c.sourceName,
      sourceUrl: c.sourceUrl,
      parallelScriptures: buckets.parallelScriptures,
      supportingScriptures: buckets.supportingScriptures,
      continuityScriptures: buckets.continuityScriptures,
    };
  });

  return { chains, witnessExpansions, candidates, reviews };
}

function rebuildTopicPacks(reviews) {
  const byTopic = {};
  for (const r of reviews) {
    if (!byTopic[r.topic]) byTopic[r.topic] = [];
    byTopic[r.topic].push(r);
  }

  return Object.entries(byTopic).map(([topic, members]) => {
    const scores = members.map((m) => m.supportScore);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      topic,
      displayName: topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      lessonTitle: members[0]?.lessonTitle,
      supportScore: avg,
      strengthTier: strengthTierForScore(avg),
      candidateCount: members.length,
      questions: members.map((m) => m.question),
      parallelScriptures: uniqueRefs(members.flatMap((m) => m.parallelScriptures || [])),
      supportingScriptures: uniqueRefs(members.flatMap((m) => m.supportingScriptures || [])),
      continuityScriptures: uniqueRefs(members.flatMap((m) => m.continuityScriptures || [])),
      camps: uniqueRefs(members.map((m) => m.camp).filter(Boolean)),
    };
  }).sort((a, b) => b.supportScore - a.supportScore);
}

function buildQueues(reviews) {
  const bucket = (min, max) => reviews
    .filter((r) => r.supportScore >= min && r.supportScore <= max)
    .map((r) => ({
      candidateId: r.candidateId,
      topic: r.topic,
      supportScore: r.supportScore,
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

function buildGapAnalysis(topicMap, phase3d) {
  const watchlist = new Set();
  for (const cat of Object.values(SEED_CATEGORIES)) {
    for (const t of cat) watchlist.add(t);
  }
  const discovered = new Set(topicMap.map((t) => t.topic));
  return {
    foundTopics: [...watchlist].filter((t) => discovered.has(t)),
    missingTopics: [...watchlist].filter((t) => !discovered.has(t)),
    collapsedTopics: topicMap.filter((t) => t.topic === 'unclassified').map((t) => t.topic),
    phase3dQuestions: phase3d?.executive?.totalQuestions || 167,
    phase3eQuestions: topicMap.reduce((s, t) => s + t.questionCount, 0),
  };
}

function buildFailureAudit(sourceReports) {
  return sourceReports
    .filter((r) => !r.questionsExtracted)
    .map((r) => ({
      sourceName: r.sourceName,
      url: r.url,
      reasonNoQuestions: r.failureReason || 'zero extractable questions',
      reasonNoTranscript: /facebook|instagram/i.test(r.failureReason || '') ? r.failureReason : 'N/A or captions unavailable',
      reasonNoScriptures: 'Scriptures extracted only when present in public HTML/description/PDF text',
      nextActionNeeded: r.failureReason?.includes('Facebook')
        ? 'Use Meta Graph API with page token or manual transcript upload'
        : r.failureReason?.includes('Camp registered')
          ? 'Add camp-specific lesson URL or licensed playlist to registry'
          : r.failureReason?.includes('YouTube')
            ? 'Configure YOUTUBE_API_KEY for deeper playlist pagination'
            : 'License transcript processing or add admin-attested JSON entries',
    }));
}

async function runPhase3eOpenSourceScrub({ scrubAllSources = true } = {}) {
  const registry = loadJson(REGISTRY_PATH);
  if (!registry?.sources) {
    throw new Error('full-corpus-source-registry.json missing — run Phase 3D first');
  }

  const phase3d = loadJson(path.join(TRACE, 'phase3d-corpus-expansion-results.json'), {});
  const legacyQuestions = extractAllCorpusRecords();

  const sourceReports = [];
  const scrubbedItems = [];
  const processedChannelUrls = new Set();

  const priorityIds = new Set([
    'iog_hq_website', 'iog_hq_lessons', 'iog_youtube_handle', 'iog_youtube_main',
    'iog_wednesday_qa', 'icoj_hq_lessons', 'icoj_lesson_handouts', 'icoj_youtube',
    'iog_hq_publications', 'iog_research_committee', 'icoj_hq_website',
  ]);

  const sourcesToProcess = scrubAllSources
    ? registry.sources
    : registry.sources.filter((s) => priorityIds.has(s.sourceId));

  for (const source of sourcesToProcess) {
    if (source.youtubeChannelUrl) {
      const chKey = source.youtubeChannelUrl.split('?')[0];
      if (processedChannelUrls.has(chKey)) {
        sourceReports.push({
          sourceName: source.sourceName,
          sourceId: source.sourceId,
          camp: source.camp,
          url: source.youtubeChannelUrl,
          processed: true,
          questionsExtracted: 0,
          failureReason: 'Duplicate channel URL — processed under primary YouTube source entry',
          items: [],
        });
        continue;
      }
      processedChannelUrls.add(chKey);
    }

    const report = await scrubRegistrySource(source);
    sourceReports.push(report);
    scrubbedItems.push(...(report.items || []));
  }

  const questions = mergeExtractions(scrubbedItems, legacyQuestions);
  const topicMap = buildTopicMap(questions);
  const { chains, witnessExpansions, reviews } = buildReviewPipeline(questions);
  const topicPacks = rebuildTopicPacks(reviews);
  const queues = buildQueues(reviews);

  const parallelTotal = uniqueRefs(reviews.flatMap((r) => r.parallelScriptures || [])).length;
  const supportingTotal = uniqueRefs(reviews.flatMap((r) => r.supportingScriptures || [])).length;
  const continuityTotal = uniqueRefs(reviews.flatMap((r) => r.continuityScriptures || [])).length;
  const g2rCount = witnessExpansions.filter((w) => w.genesisToRevelationSpan).length;

  const scoreBuckets = {
    above95: reviews.filter((r) => r.supportScore >= 95).length,
    above90: reviews.filter((r) => r.supportScore >= 90).length,
    above80: reviews.filter((r) => r.supportScore >= 80).length,
    above70: reviews.filter((r) => r.supportScore >= 70).length,
    below70: reviews.filter((r) => r.supportScore < 70).length,
  };

  const scrubOnlyNew = scrubbedItems.length;
  const phase3dCount = phase3d.executive?.totalQuestions || 167;

  const youtubeStats = sourceReports.reduce((acc, r) => ({
    videos: acc.videos + (r.videosFound || 0),
    playlists: acc.playlists + (r.playlistsFound || 0),
    transcripts: acc.transcripts + (r.transcriptsFound || 0),
    qna: acc.qna + (r.qnaItemsFound || 0),
  }), { videos: 0, playlists: 0, transcripts: 0, qna: 0 });

  const executive = {
    sourcesProcessed: sourceReports.filter((r) => r.processed).length,
    sourcesFailed: sourceReports.filter((r) => !r.processed && !r.failureReason?.includes('Duplicate')).length,
    sourcesTotal: sourceReports.length,
    youtubeVideosFound: youtubeStats.videos,
    playlistsFound: youtubeStats.playlists,
    transcriptsFound: youtubeStats.transcripts,
    lessonPagesProcessed: sourceReports.filter((r) => r.lessonsFound > 0).length,
    handoutsProcessed: sourceReports.reduce((s, r) => s + (r.handouts || 0), 0),
    qnaItemsProcessed: youtubeStats.qna,
    totalQuestions: questions.length,
    scrubbedNewExtractions: scrubOnlyNew,
    totalTopics: topicMap.length,
    totalScriptureChains: chains.length,
    totalGenesisRevelationExpansions: g2rCount,
    totalParallelScriptures: parallelTotal,
    totalSupportingScriptures: supportingTotal,
    totalContinuityScriptures: continuityTotal,
    candidates95Plus: scoreBuckets.above95,
    candidates90Plus: scoreBuckets.above90,
    candidates80Plus: scoreBuckets.above80,
    strongestTopicPacks: topicPacks.slice(0, 15),
    sourceCoveragePct: registry.totals?.estimatedQuestions
      ? Math.round((questions.length / registry.totals.estimatedQuestions) * 1000) / 10
      : 0,
    corpusGrowthVsPhase3d: {
      questions: questions.length - phase3dCount,
      topics: topicMap.length - (phase3d.executive?.totalTopics || 0),
      chains: chains.length - (phase3d.executive?.totalScriptureChains || 0),
    },
    questionCountIncreased: questions.length > phase3dCount,
  };

  const failureAudit = buildFailureAudit(sourceReports);
  const gapAnalysis = buildGapAnalysis(topicMap, phase3d);

  const payload = {
    phase: '3E',
    ranAt: new Date().toISOString(),
    sourceReports,
    scrubbedItems,
    questions,
    chains,
    witnessExpansions,
    reviews,
    topicMap,
    topicPacks,
    queues,
    scoreBuckets,
    gapAnalysis,
    failureAudit,
    executive,
    safety: {
      productionChanges: false,
      implementation: false,
      approvals: false,
      passed: true,
    },
    productionMutations: false,
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(SCRUB_CACHE, `${JSON.stringify({ ranAt: payload.ranAt, scrubbedItems, sourceReports }, null, 2)}\n`);
  fs.writeFileSync(
    path.join(TRACE, 'phase3e-open-source-scrub-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'phase3e-implementation-queues.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, queues, scoreBuckets, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3eOpenSourceScrub,
  mergeExtractions,
};
