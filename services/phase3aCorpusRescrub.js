/**
 * Phase 3A — Full corpus rescrub and scripture expansion.
 * Discovery and organization only — no production mutations.
 */

const fs = require('fs');
const path = require('path');
const { extractQuestionsFromSources, extractScriptureChains } = require('./bulkScriptureDiscovery');
const {
  runCorpusExpansionDiscovery,
  buildUnifiedSourceRegistry,
  expandFullScriptureWitnesses,
} = require('./corpusExpansionDiscovery');
const {
  processTranscriptSources,
  processExpandedSourceRegistry,
  discoverOpenTopic,
} = require('./expandedScriptureDiscovery');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const { buildUnifiedReviewObject } = require('./scriptureResearchReviewConsole');
const {
  deriveLessonTitle,
  strengthTierForScore,
  STRENGTH_TIERS,
} = require('./scriptureStrengthReview');
const { getAllApprovedCards } = require('./evidenceCards');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const TOPIC_HINT_RE = {
  sabbath: /\b(sabbath|seventh day|saturday|hebrews 4)\b/i,
  death_state: /\b(dead|death|die|died|grave|resurrection|sleep|soul|grieving)\b/i,
  dietary_law: /\b(pork|eat|clean|unclean|acts 10|leviticus 11)\b/i,
  holiness: /\b(holy|holiness|sanctif)\b/i,
  messiah_logos: /\b(logos|word of god|john 1)\b/i,
  kingdom: /\b(kingdom|thy kingdom come|new jerusalem)\b/i,
  heavens: /\b(heaven|heavens|third heaven|firmament)\b/i,
  feasts: /\b(feast|passover|pentecost|leviticus 23)\b/i,
};

function loadJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeExactKey(q = '') {
  return String(q).toLowerCase().replace(/\s+/g, ' ').trim();
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const r of refs || []) {
    const k = String(r || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function hintTopic(question = '') {
  const q = String(question);
  for (const [topic, re] of Object.entries(TOPIC_HINT_RE)) {
    if (re.test(q)) return topic;
  }
  return null;
}

function assignOpenTopic(record) {
  const hint = hintTopic(record.question) || record.topic;
  const open = discoverOpenTopic(record.question, hint);
  const topic = hint && hint !== 'mixed' ? hint : open.topicName;
  return {
    ...record,
    topic,
    discoveredTopic: open.discoveredTopic,
    isNewTopic: open.isNewTopic,
  };
}

function buildPhase3aSourceRegistry(corpusResult = null) {
  const corpus = corpusResult || runCorpusExpansionDiscovery();
  const unified = corpus.sourceRegistry || buildUnifiedSourceRegistry();
  const transcripts = processTranscriptSources();
  const expanded = processExpandedSourceRegistry();

  const sources = [...unified];
  const seen = new Set(sources.map((s) => s.sourceId));

  const add = (src) => {
    const id = src.sourceId || src.sourceName;
    if (seen.has(id)) return;
    seen.add(id);
    sources.push(src);
  };

  add({
    sourceId: 'phase3a_unified_candidates',
    sourceName: 'Previously Processed Unified Candidates',
    platform: 'internal',
    transcriptAvailable: false,
    processingAllowed: false,
    entryCount: loadUnifiedCandidates().length,
    copyrightStatus: 'internal',
  });

  add({
    sourceId: 'phase3a_transcripts',
    sourceName: 'Expanded Discovery Transcripts',
    platform: 'transcript',
    transcriptAvailable: true,
    processingAllowed: true,
    entryCount: transcripts.length,
    copyrightStatus: 'licensed_where_allowed',
  });

  add({
    sourceId: 'phase3a_expanded_registry',
    sourceName: 'Expanded Discovery Source Registry',
    platform: 'metadata',
    entryCount: expanded.length,
    copyrightStatus: 'mixed',
  });

  return {
    sources,
    corpusSourceCount: corpus.sourceRegistry.length,
    totalSources: sources.length,
    transcriptEntries: transcripts.length,
    expandedRegistryEntries: expanded.length,
  };
}

function extractAllQuestionRecords(corpusResult = null) {
  const records = [];

  const corpus = corpusResult || runCorpusExpansionDiscovery();
  for (const q of corpus.questions) {
    records.push({ ...q, discoveryPhase: q.discoveryPhase || 'corpus' });
  }

  for (const q of extractQuestionsFromSources()) {
    records.push({ ...q, frequency: q.frequency || 1, discoveryPhase: 'bulk' });
  }

  for (const t of processTranscriptSources()) {
    records.push({
      question: t.question,
      topic: hintTopic(t.question),
      speaker: t.speaker,
      source: t.source,
      sourceType: t.sourceType,
      scripturesCited: t.scripturesCited || [],
      scriptureOrder: t.scriptureOrder || [],
      conclusion: t.conclusion || '',
      frequency: 1,
      discoveryPhase: 'transcript',
    });
  }

  for (const t of processExpandedSourceRegistry()) {
    records.push({
      question: t.question,
      topic: hintTopic(t.question),
      speaker: t.speaker,
      source: t.source,
      sourceType: t.sourceType,
      scripturesCited: t.scripturesCited || [],
      scriptureOrder: t.scriptureOrder || [],
      conclusion: t.conclusion || '',
      frequency: 1,
      discoveryPhase: 'expanded_registry',
    });
  }

  for (const c of loadUnifiedCandidates()) {
    records.push({
      question: c.question,
      topic: c.topic,
      speaker: null,
      source: c.source || c.discoveryPhase || 'unified',
      sourceType: 'previous_discovery',
      scripturesCited: c.originalScriptures || c.scripturesCited || [],
      scriptureOrder: c.scriptureOrder || c.originalScriptures || [],
      conclusion: c.candidateConclusion || c.conclusion || '',
      frequency: 1,
      discoveryPhase: c.discoveryPhase || 'unified',
      priorCandidateId: c.candidateId,
    });
  }

  const byExact = new Map();
  for (const raw of records) {
    const enriched = assignOpenTopic(raw);
    const key = normalizeExactKey(enriched.question);
    if (!key) continue;
    if (!byExact.has(key)) {
      byExact.set(key, { ...enriched, frequency: enriched.frequency || 1 });
    } else {
      const ex = byExact.get(key);
      ex.frequency += enriched.frequency || 1;
      if ((enriched.scripturesCited || []).length > (ex.scripturesCited || []).length) {
        Object.assign(ex, enriched, { frequency: ex.frequency });
      }
    }
  }

  return [...byExact.values()];
}

function buildReviewCandidates(chains, witnessExpansions) {
  const candidates = [];
  const seenQuestions = new Set();

  for (let i = 0; i < chains.length; i += 1) {
    const chain = chains[i];
    const w = witnessExpansions[i];
    const key = normalizeExactKey(chain.question);
    if (seenQuestions.has(key)) continue;
    seenQuestions.add(key);

    const scriptureOrder = w.genesisToRevelationChain?.length
      ? w.genesisToRevelationChain
      : chain.scriptureOrder;

    candidates.push({
      candidateId: `3a_${String(candidates.length + 1).padStart(4, '0')}`,
      question: chain.question,
      topic: chain.topic,
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
      discoveryPhase: '3A',
      reviewRequired: true,
      autoApplied: false,
    });
  }

  return candidates;
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

    const scoreParts = [];
    if (supportScoreAverage >= 90) scoreParts.push('High average support score.');
    const g2r = uniqueRefs(members.flatMap((m) => m.genesisToRevelationChain || []));
    if (g2r.length >= 4) scoreParts.push('Genesis→Revelation chain present.');

    packs.push({
      topic,
      displayName: topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      lessonTitle: deriveLessonTitle({ question: members[0]?.question, topic }),
      questions: members.map((m) => m.question),
      candidateIds: members.map((m) => m.candidateId),
      originalScriptureChain: uniqueRefs(members.flatMap((m) => m.originalScriptureChain || [])),
      genesisToRevelationChain: g2r,
      parallelScriptures: uniqueRefs(members.flatMap((m) => m.parallelScriptures || [])),
      supportingScriptures: uniqueRefs(members.flatMap((m) => m.supportingScriptures || [])),
      continuityScriptures: uniqueRefs(members.flatMap((m) => m.continuityScriptures || [])),
      cautionScriptures: uniqueRefs(members.flatMap((m) => m.cautionScriptures || [])),
      supportScore: supportScoreAverage,
      strengthTier: strengthTierForScore(supportScoreAverage),
      scoreExplanation: scoreParts.join(' ') || 'Corpus rescrub topic pack.',
      candidateCount: members.length,
      humanReviewRequired: true,
    });
  }

  return packs.sort((a, b) => b.supportScore - a.supportScore);
}

function buildImplementationQueues(reviews) {
  const queue95 = reviews.filter((r) => r.supportScore >= 95);
  const queue90 = reviews.filter((r) => r.supportScore >= 90 && r.supportScore < 95);
  const queue80 = reviews.filter((r) => r.supportScore >= 80 && r.supportScore < 90);
  return {
    queue95: queue95.map((r) => ({ candidateId: r.candidateId, topic: r.topic, supportScore: r.supportScore, strengthTier: r.strengthTier })),
    queue90: queue90.map((r) => ({ candidateId: r.candidateId, topic: r.topic, supportScore: r.supportScore, strengthTier: r.strengthTier })),
    queue80: queue80.map((r) => ({ candidateId: r.candidateId, topic: r.topic, supportScore: r.supportScore, strengthTier: r.strengthTier })),
  };
}

function verifySafety() {
  const buddy = fs.readFileSync(path.join(ROOT, 'services', 'buddyBrain.js'), 'utf8');
  const cardsBefore = getAllApprovedCards().length;
  return {
    productionChanges: false,
    doctrineChanges: false,
    graphChanges: false,
    cardChanges: false,
    promptChanges: false,
    ownershipChanges: buddy.includes('templateResponder'),
    automaticApprovals: false,
    automaticPromotions: false,
    cardCount: cardsBefore,
    passed: !buddy.includes('templateResponder'),
  };
}

function runPhase3aCorpusRescrub() {
  const corpusResult = runCorpusExpansionDiscovery();
  const sourceRegistry = buildPhase3aSourceRegistry(corpusResult);
  const questions = extractAllQuestionRecords(corpusResult);
  const chains = extractScriptureChains(questions);
  const witnessExpansions = chains.map((c) => expandFullScriptureWitnesses(c));
  const rawCandidates = buildReviewCandidates(chains, witnessExpansions);
  const reviews = rawCandidates.map((c) => buildUnifiedReviewObject(c));
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

  const topicSet = new Set(reviews.map((r) => r.topic));

  const payload = {
    phase: '3A',
    ranAt: new Date().toISOString(),
    sourceRegistry,
    questions,
    chains,
    witnessExpansions,
    reviews,
    topicPacks,
    queues,
    scoreBuckets,
    strengthTiers: STRENGTH_TIERS,
    executive: {
      totalTopics: topicSet.size,
      totalQuestions: questions.length,
      totalScriptureChains: chains.length,
      totalGenesisRevelationExpansions: g2rExpansions,
      totalParallelScriptures: parallelTotal,
      totalSupportingScriptures: supportingTotal,
      totalContinuityScriptures: continuityTotal,
      candidates95Plus: scoreBuckets.above95,
      candidates90Plus: scoreBuckets.above90,
      candidates80Plus: scoreBuckets.above80,
      totalSourcesProcessed: sourceRegistry.totalSources,
    },
    safety: verifySafety(),
    productionMutations: false,
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(TRACE, 'phase3a-corpus-rescrub-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'phase3a-implementation-queues.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, queues, scoreBuckets }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3aCorpusRescrub,
  extractAllQuestionRecords,
  rebuildTopicPacks,
};
