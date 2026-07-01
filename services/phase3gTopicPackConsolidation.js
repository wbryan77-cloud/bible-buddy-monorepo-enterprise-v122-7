/**
 * Phase 3G — Topic pack consolidation and implementation preparation.
 * Organization only — no production, doctrine, card, graph, or approval mutations.
 */

const fs = require('fs');
const path = require('path');
const { strengthTierForScore } = require('./scriptureStrengthReview');

const TOPIC_DISPLAY_LABELS = {
  sabbath: 'Sabbath',
  death_state: 'Death State',
  resurrection: 'Resurrection',
  messiah_logos: 'Messiah & Logos',
  dietary_law: 'Dietary Law',
  holiness: 'Holiness',
  kingdom_of_god: 'Kingdom of God',
  heavens: 'Heavens',
  feasts: 'Feast Days',
  faith_works: 'Faith & Works',
  two_witnesses: 'Two Witnesses',
  mark_of_the_beast: 'Mark of the Beast',
  great_tribulation: 'Great Tribulation',
  abomination_of_desolation: 'Abomination of Desolation',
  new_jerusalem: 'New Jerusalem',
  lake_of_fire: 'Lake of Fire',
  baptism: 'Baptism',
  marriage: 'Marriage',
  divorce: 'Divorce',
  priesthood: 'Priesthood',
  covenants: 'Covenants',
  angels: 'Angels',
  satan: 'Satan',
  michael_archangel: 'Michael',
};
const { discoverTopicFromText, SEED_CATEGORIES } = require('./bibleWideTopicDiscovery');
const { getAllApprovedCards } = require('./evidenceCards');

const PACK_TO_CARD_TOPIC = {
  sabbath: 'sabbath',
  dietary_law: 'dietary_law',
  death_state: 'death_state',
  resurrection: 'death_state',
  messiah_logos: 'messiah_logos',
  kingdom_of_god: 'kingdom',
  kingdom: 'kingdom',
  heavens: 'heavens',
  holiness: 'holiness',
  feasts: 'feasts',
};

const SEED_TOPIC_ALIASES = {
  messiah: ['messiah_logos', 'messiah'],
  logos: ['messiah_logos', 'logos'],
  kingdom: ['kingdom_of_god', 'kingdom'],
  kingdom_of_god: ['kingdom_of_god', 'kingdom'],
  michael_archangel: ['michael_archangel', 'michael'],
  faith: ['faith', 'faith_works'],
  works: ['faith_works', 'works'],
};

const WATCHLIST_MAJOR_TOPICS = [
  'sabbath', 'dietary_law', 'messiah_logos', 'death_state', 'resurrection', 'kingdom_of_god',
  'heavens', 'feasts', 'two_witnesses', '144000', 'mark_of_the_beast', 'great_tribulation',
  'abomination_of_desolation', 'new_jerusalem', 'gog_and_magog', 'lake_of_fire',
  'noah', 'shem', 'ham', 'japheth', 'abraham', 'isaac', 'jacob', 'joseph', 'judah',
  'moses', 'joshua', 'david', 'solomon', 'saul', 'samson', 'elijah', 'elisha',
  'isaiah', 'jeremiah', 'ezekiel', 'daniel', 'peter', 'paul', 'john',
  'michael_archangel', 'satan', 'angels', 'baptism', 'marriage', 'divorce',
  'priesthood', 'covenants', 'holiness', 'prophecy',
];

const TOPIC_HISTORICAL_GAINS = {
  death_state: { retrievalDelta: 8, classCEliminated: 3 },
  sabbath: { retrievalDelta: 14, classCEliminated: 6 },
  messiah_logos: { retrievalDelta: 2, classCEliminated: 0 },
  dietary_law: { retrievalDelta: 0, classCEliminated: 0 },
  kingdom_of_god: { retrievalDelta: 0, classCEliminated: 0 },
  heavens: { retrievalDelta: 0, classCEliminated: 0 },
  holiness: { retrievalDelta: 0, classCEliminated: 0 },
  feasts: { retrievalDelta: 0, classCEliminated: 0 },
};

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

function refKey(ref = '') {
  return String(ref || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeQuestionKey(q = '') {
  return String(q)
    .replace(/^\([A-Za-z\s]+\)\s+/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function lessonCanonicalKey(lessonTitle = '') {
  return String(lessonTitle)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function chainFingerprint(chain = []) {
  return uniqueRefs(chain)
    .map((r) => r.toLowerCase())
    .sort()
    .join('|');
}

function scriptureOverlap(a = [], b = []) {
  const setA = new Set(a.map((r) => String(r).toLowerCase()));
  const setB = new Set(b.map((r) => String(r).toLowerCase()));
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const r of setA) {
    if (setB.has(r)) inter += 1;
  }
  return inter / Math.min(setA.size, setB.size);
}

function displayName(topic = '') {
  if (TOPIC_DISPLAY_LABELS[topic]) return TOPIC_DISPLAY_LABELS[topic];
  return String(topic).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function loadPhase3fInputs() {
  const chainsPath = path.join(OUT_DIR, 'expanded-scripture-chains.json');
  const supportPath = path.join(OUT_DIR, 'expanded-chain-support.json');
  const rankingPath = path.join(OUT_DIR, 'content-extraction-ranking.json');
  const tracePath = path.join(TRACE, 'phase3f-content-extraction-results.json');

  const chainsDoc = loadJson(chainsPath);
  const supportDoc = loadJson(supportPath);
  const rankingDoc = loadJson(rankingPath);
  const trace = loadJson(tracePath);

  if (!chainsDoc?.chains?.length) {
    throw new Error('expanded-scripture-chains.json missing — run Phase 3F first');
  }

  const supportMap = new Map(
    (supportDoc?.expandedChains || []).map((c) => [normalizeQuestionKey(c.question), c]),
  );
  const rankedMap = new Map(
    (rankingDoc?.ranked || []).map((r) => [normalizeQuestionKey(r.question), r]),
  );

  const merged = chainsDoc.chains.map((chain) => {
    const key = normalizeQuestionKey(chain.question);
    const support = supportMap.get(key) || {};
    const ranked = rankedMap.get(key) || {};
    return {
      ...chain,
      ...support,
      ...ranked,
      questionKey: key,
      originalScriptureChain: chain.originalScriptureChain || ranked.originalScriptureChain || [],
      scriptureOrder: chain.scriptureOrder || ranked.originalScriptureChain || [],
      genesisToRevelationChain: support.genesisToRevelationChain || ranked.genesisToRevelationChain || [],
      parallelScriptures: support.parallelScriptures || ranked.parallelScriptures || [],
      supportingScriptures: support.supportingScriptures || ranked.supportingScriptures || [],
      continuityScriptures: support.continuityScriptures || ranked.continuityScriptures || [],
      supportScore: ranked.supportScore || 0,
      strengthTier: ranked.strengthTier || strengthTierForScore(ranked.supportScore || 0),
    };
  });

  return {
    ranAt: chainsDoc.ranAt,
    chains: merged,
    trace,
    priorChainCount: trace?.executive?.priorChainCount || 127,
    phase3fChainCount: merged.length,
  };
}

function refineTopic(chain) {
  const discovered = discoverTopicFromText(chain.question || '', {
    lessonTitle: chain.lessonTitle,
    answerSummary: chain.answerSummary,
  });
  if (discovered.classification === 'seed_match' && discovered.confidence !== 'low') {
    return discovered.topic;
  }
  if (chain.topic && chain.topic !== 'unclassified') return chain.topic;
  return discovered.topic;
}

function identifyDuplicates(chains) {
  const exactByFingerprint = new Map();
  const exactByQuestion = new Map();
  const duplicateGroups = [];
  const nearDuplicateGroups = [];
  const campVariantGroups = [];
  const lessonTriplets = new Map();

  for (const chain of chains) {
    const fp = chainFingerprint(chain.originalScriptureChain);
    const qKey = normalizeQuestionKey(chain.question);
    const lessonKey = lessonCanonicalKey(chain.lessonTitle);

    if (fp) {
      if (!exactByFingerprint.has(fp)) exactByFingerprint.set(fp, []);
      exactByFingerprint.get(fp).push(chain);
    }

    if (!exactByQuestion.has(qKey)) exactByQuestion.set(qKey, []);
    exactByQuestion.get(qKey).push(chain);

    if (!lessonTriplets.has(lessonKey)) lessonTriplets.set(lessonKey, []);
    lessonTriplets.get(lessonKey).push(chain);
  }

  for (const [fp, members] of exactByFingerprint.entries()) {
    if (members.length < 2) continue;
    duplicateGroups.push({
      type: 'exact_scripture_chain',
      fingerprint: fp,
      chainCount: members.length,
      members: members.map((m) => ({
        question: m.question,
        lessonTitle: m.lessonTitle,
        camp: m.camp,
        sourceName: m.sourceName,
        sourceUrl: m.sourceUrl,
      })),
      canonicalQuestion: members[0].question,
      scriptureCount: (members[0].originalScriptureChain || []).length,
    });
  }

  for (const [lessonKey, members] of lessonTriplets.entries()) {
    if (members.length < 2 || !lessonKey) continue;
    const fps = new Set(members.map((m) => chainFingerprint(m.originalScriptureChain)));
    if (fps.size !== 1) continue;
    campVariantGroups.push({
      type: 'lesson_question_variants',
      lessonKey,
      lessonTitle: members[0].lessonTitle,
      chainCount: members.length,
      members: members.map((m) => ({
        question: m.question,
        camp: m.camp,
        sourceName: m.sourceName,
      })),
      canonicalQuestion: members.find((m) => !/^\(/.test(m.question))?.question || members[0].question,
    });
  }

  const byTopic = {};
  for (const chain of chains) {
    const topic = chain.topic || 'unclassified';
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(chain);
  }

  for (const [topic, members] of Object.entries(byTopic)) {
    const seenPairs = new Set();
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const overlap = scriptureOverlap(
          members[i].originalScriptureChain,
          members[j].originalScriptureChain,
        );
        if (overlap < 0.85) continue;
        const pairKey = `${normalizeQuestionKey(members[i].question)}::${normalizeQuestionKey(members[j].question)}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        if (normalizeQuestionKey(members[i].question) === normalizeQuestionKey(members[j].question)) continue;
        nearDuplicateGroups.push({
          type: 'near_duplicate_same_topic',
          topic,
          overlap: Math.round(overlap * 100),
          chainA: { question: members[i].question, camp: members[i].camp, lessonTitle: members[i].lessonTitle },
          chainB: { question: members[j].question, camp: members[j].camp, lessonTitle: members[j].lessonTitle },
          sharedScriptureCount: members[i].originalScriptureChain?.length || 0,
        });
      }
    }
  }

  const rawReviewUnits = chains.length;
  const uniqueFingerprints = exactByFingerprint.size;
  const uniqueQuestions = exactByQuestion.size;
  const consolidatedReviewUnits = uniqueQuestions;

  return {
    duplicateGroups,
    nearDuplicateGroups,
    campVariantGroups,
    stats: {
      rawChains: chains.length,
      exactDuplicateGroups: duplicateGroups.length,
      nearDuplicatePairs: nearDuplicateGroups.length,
      campVariantGroups: campVariantGroups.length,
      uniqueScriptureFingerprints: uniqueFingerprints,
      uniqueQuestions,
      rawReviewUnits,
      consolidatedReviewUnits,
      reviewEffortEliminated: rawReviewUnits - consolidatedReviewUnits,
      duplicateChainsConsolidated: rawReviewUnits - uniqueFingerprints,
    },
  };
}

function pickStrongestChain(members = []) {
  return [...members].sort((a, b) => {
    const scoreDiff = (b.supportScore || 0) - (a.supportScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.originalScriptureChain?.length || 0) - (a.originalScriptureChain?.length || 0);
  })[0];
}

function buildTopicPacks(chains) {
  const byTopic = {};

  for (const chain of chains) {
    const topic = refineTopic(chain);
    chain.consolidatedTopic = topic;
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(chain);
  }

  const packs = [];

  for (const [topic, members] of Object.entries(byTopic)) {
    const strongest = pickStrongestChain(members);
    const scores = members.map((m) => m.supportScore || 0);
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const allOriginal = uniqueRefs(members.flatMap((m) => m.originalScriptureChain || []));
    const allParallel = uniqueRefs(members.flatMap((m) => m.parallelScriptures || []));
    const allSupporting = uniqueRefs(members.flatMap((m) => m.supportingScriptures || []));
    const allContinuity = uniqueRefs(members.flatMap((m) => m.continuityScriptures || []));
    const g2rChains = members
      .map((m) => m.genesisToRevelationChain || [])
      .filter((c) => c.length);

    const sourceLessons = [...new Map(
      members.map((m) => [
        lessonCanonicalKey(m.lessonTitle),
        {
          lessonTitle: m.lessonTitle,
          sourceName: m.sourceName,
          camp: m.camp,
          sourceUrl: m.sourceUrl,
          chainCount: 0,
        },
      ]),
    ).values()].map((l) => {
      l.chainCount = members.filter((m) => lessonCanonicalKey(m.lessonTitle) === lessonCanonicalKey(l.lessonTitle)).length;
      return l;
    });

    const sourceQuestions = members.map((m) => ({
      question: m.question,
      lessonTitle: m.lessonTitle,
      camp: m.camp,
      sourceName: m.sourceName,
      sourceUrl: m.sourceUrl,
      chainSource: m.chainSource,
      supportScore: m.supportScore,
      scriptureCount: (m.originalScriptureChain || []).length,
    }));

    const camps = uniqueRefs(members.map((m) => m.camp).filter(Boolean));
    const sources = uniqueRefs(members.map((m) => m.sourceName).filter(Boolean));

    const pack = {
      topic,
      displayName: displayName(topic),
      category: members[0]?.topicCategory || 'discovered',
      chainCount: members.length,
      questionCount: members.length,
      lessonCount: sourceLessons.length,
      sourceCount: sources.length,
      uniqueScriptures: allOriginal,
      uniqueParallelScriptures: allParallel,
      uniqueSupportingScriptures: allSupporting,
      uniqueContinuityScriptures: allContinuity,
      scriptureCount: allOriginal.length,
      parallelScriptureCount: allParallel.length,
      supportingScriptureCount: allSupporting.length,
      continuityScriptureCount: allContinuity.length,
      supportScore: avgScore,
      maxSupportScore: Math.max(...scores, 0),
      strengthTier: strengthTierForScore(avgScore),
      strongestChain: {
        question: strongest.question,
        lessonTitle: strongest.lessonTitle,
        supportScore: strongest.supportScore,
        originalScriptureChain: strongest.originalScriptureChain,
        genesisToRevelationChain: strongest.genesisToRevelationChain,
        sourceName: strongest.sourceName,
        camp: strongest.camp,
      },
      allOriginalScriptures: allOriginal,
      allParallelScriptures: allParallel,
      allSupportingScriptures: allSupporting,
      allContinuityScriptures: allContinuity,
      allGenesisToRevelationChains: g2rChains,
      sourceLessons,
      sourceQuestions,
      camps,
      sources,
      chains: members,
    };

    pack.readiness = assessReadiness(pack);
    packs.push(pack);
  }

  return packs.sort((a, b) => b.supportScore - a.supportScore);
}

function assessReadiness(pack) {
  const maxScore = pack.maxSupportScore || pack.supportScore;
  const needsMoreExtraction = maxScore < 75
    && pack.supportScore < 70
    || (pack.scriptureCount < 2 && pack.chainCount < 2);
  const needsMoreSources = pack.sourceCount < 2 && pack.chainCount < 3;
  const needsMoreScriptureSupport = pack.scriptureCount < 5
    && pack.supportingScriptureCount === 0
    && pack.parallelScriptureCount === 0;

  const readyForHumanReview = pack.scriptureCount >= 3
    && !needsMoreExtraction
    && (pack.supportScore >= 75 || maxScore >= 85);
  const readyForImplementationPreparation = pack.scriptureCount >= 5
    && pack.chainCount >= 1
    && !needsMoreExtraction
    && (pack.supportScore >= 85 || maxScore >= 90);

  let reviewNotes = [];
  if (pack.supportScore >= 95) reviewNotes.push('Very strong consolidated pack — prioritize human review');
  if (pack.chainCount > 5) reviewNotes.push(`${pack.chainCount} chains consolidated — verify canonical strongest chain`);
  if (pack.camps?.length > 1) reviewNotes.push(`Multi-camp doctrine (${pack.camps.join(', ')}) — confirm camp consistency`);
  if (needsMoreExtraction) reviewNotes.push('Needs more scripture extraction before implementation');
  if (needsMoreSources) reviewNotes.push('Needs additional source coverage');
  if (needsMoreScriptureSupport) reviewNotes.push('Needs more supporting/parallel witness depth');

  return {
    readyForHumanReview,
    readyForImplementationPreparation,
    needsMoreExtraction,
    needsMoreSources,
    needsMoreScriptureSupport,
    reviewNotes,
  };
}

function buildSourceEffectiveness(chains, packs) {
  const bySource = {};
  const byCamp = {};
  const byLesson = {};
  const byQa = {};

  for (const chain of chains) {
    const src = chain.sourceName || 'unknown';
    const camp = chain.camp || 'unknown';
    if (!bySource[src]) {
      bySource[src] = { sourceName: src, scriptureRefs: 0, chains: 0, avgScore: 0, scores: [] };
    }
    bySource[src].scriptureRefs += (chain.originalScriptureChain || []).length;
    bySource[src].chains += 1;
    bySource[src].scores.push(chain.supportScore || 0);

    if (!byCamp[camp]) byCamp[camp] = { camp, chains: 0, scriptureRefs: 0 };
    byCamp[camp].chains += 1;
    byCamp[camp].scriptureRefs += (chain.originalScriptureChain || []).length;

    const lessonKey = lessonCanonicalKey(chain.lessonTitle);
    if (lessonKey) {
      if (!byLesson[lessonKey]) {
        byLesson[lessonKey] = {
          lessonTitle: chain.lessonTitle,
          chains: 0,
          scriptureRefs: 0,
          avgScore: 0,
          scores: [],
        };
      }
      byLesson[lessonKey].chains += 1;
      byLesson[lessonKey].scriptureRefs += (chain.originalScriptureChain || []).length;
      byLesson[lessonKey].scores.push(chain.supportScore || 0);
    }

    if (/q\s*&\s*a|qna|wednesday night/i.test(chain.question || '') || /qna|q&a/i.test(chain.sourceType || '')) {
      const qaKey = lessonCanonicalKey(chain.lessonTitle);
      if (!byQa[qaKey]) {
        byQa[qaKey] = { lessonTitle: chain.lessonTitle, chains: 0, avgScore: 0, scores: [] };
      }
      byQa[qaKey].chains += 1;
      byQa[qaKey].scores.push(chain.supportScore || 0);
    }
  }

  const sourceRanking = Object.values(bySource).map((s) => ({
    ...s,
    avgScore: s.scores.length ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0,
  })).sort((a, b) => b.scriptureRefs - a.scriptureRefs);

  const campRanking = Object.values(byCamp).sort((a, b) => b.chains - a.chains);

  const lessonRanking = Object.values(byLesson).map((l) => ({
    ...l,
    avgScore: l.scores.length ? Math.round(l.scores.reduce((a, b) => a + b, 0) / l.scores.length) : 0,
  })).sort((a, b) => b.avgScore - a.avgScore || b.scriptureRefs - a.scriptureRefs);

  const qaRanking = Object.values(byQa).map((q) => ({
    ...q,
    avgScore: q.scores.length ? Math.round(q.scores.reduce((a, b) => a + b, 0) / q.scores.length) : 0,
  })).sort((a, b) => b.avgScore - a.avgScore);

  return {
    topSources: sourceRanking.slice(0, 15),
    topCamps: campRanking.slice(0, 15),
    strongestLessons: lessonRanking.slice(0, 20),
    strongestQaSessions: qaRanking.slice(0, 15),
    allSources: sourceRanking,
    allCamps: campRanking,
  };
}

function buildHumanReviewPackets(packs) {
  return packs.map((pack) => ({
    topic: pack.topic,
    displayName: pack.displayName,
    strengthTier: pack.strengthTier,
    supportScore: pack.supportScore,
    questionCount: pack.questionCount,
    scriptureCount: pack.scriptureCount,
    parallelScriptureCount: pack.parallelScriptureCount,
    supportingScriptureCount: pack.supportingScriptureCount,
    continuityScriptureCount: pack.continuityScriptureCount,
    strongestChain: pack.strongestChain,
    readyForHumanReview: pack.readiness.readyForHumanReview,
    readyForImplementationPreparation: pack.readiness.readyForImplementationPreparation,
    reviewNotes: pack.readiness.reviewNotes,
    sampleQuestions: pack.sourceQuestions.slice(0, 5).map((q) => q.question),
    camps: pack.camps,
    sources: pack.sources,
  }));
}

function buildMasterPacksJson(packs) {
  return packs.map((pack) => ({
    topic: pack.topic,
    displayName: pack.displayName,
    strongestChain: pack.strongestChain,
    allOriginalScriptures: pack.allOriginalScriptures,
    allParallelScriptures: pack.allParallelScriptures,
    allSupportingScriptures: pack.allSupportingScriptures,
    allContinuityScriptures: pack.allContinuityScriptures,
    allGenesisToRevelationChains: pack.allGenesisToRevelationChains,
    sourceLessons: pack.sourceLessons,
    sourceQuestions: pack.sourceQuestions,
    supportScore: pack.supportScore,
    strengthTier: pack.strengthTier,
    chainCount: pack.chainCount,
    readiness: pack.readiness,
  }));
}

function loadImplementedScriptureBaseline() {
  const byCardTopic = {};
  for (const card of getAllApprovedCards()) {
    const refs = uniqueRefs([...(card.primaryScriptures || []), ...(card.supportingScriptures || [])]);
    byCardTopic[card.topic] = refs;
  }
  return byCardTopic;
}

function loadPriorTopicBaseline() {
  const phase3e = loadJson(path.join(TRACE, 'phase3e-open-source-scrub-results.json'), {});
  const byTopic = {};
  for (const chain of phase3e.chains || []) {
    const t = chain.topic || 'unclassified';
    if (!byTopic[t]) {
      byTopic[t] = { chains: 0, questions: new Set(), scriptures: new Set() };
    }
    byTopic[t].chains += 1;
    if (chain.question) byTopic[t].questions.add(normalizeQuestionKey(chain.question));
    for (const r of chain.scripturesCited || chain.scriptureOrder || []) {
      byTopic[t].scriptures.add(refKey(r));
    }
  }
  return byTopic;
}

function cardTopicForPack(topic = '') {
  return PACK_TO_CARD_TOPIC[topic] || topic;
}

function computeLearningGainScore(pack, impact) {
  const hist = TOPIC_HISTORICAL_GAINS[pack.topic] || TOPIC_HISTORICAL_GAINS[cardTopicForPack(pack.topic)] || {};
  let score = 0;
  score += impact.newScripturesAdded * 3;
  score += impact.newChainsAdded * 5;
  score += impact.newQuestionsCovered * 4;
  score += (pack.supportingScriptureCount || 0) * 2;
  score += (pack.parallelScriptureCount || 0) * 2;
  score += (pack.continuityScriptureCount || 0) * 1.5;
  score += (pack.supportScore || 0) * 0.5;
  score += (hist.retrievalDelta || 0) * 5;
  score += (hist.classCEliminated || 0) * 8;
  return Math.round(score);
}

function computeImplementationConfidence(pack, newScripturesAdded, newChainsAdded) {
  if (
    pack.readiness?.readyForImplementationPreparation
    && (pack.supportScore >= 85 || pack.maxSupportScore >= 90)
    && newScripturesAdded + newChainsAdded > 0
  ) {
    return 'High';
  }
  if (
    pack.readiness?.readyForHumanReview
    || (pack.supportScore >= 70 && pack.scriptureCount >= 5)
    || newScripturesAdded >= 8
  ) {
    return 'Medium';
  }
  return 'Low';
}

function buildImpactSummary(pack, impact, confidence) {
  const parts = [];
  if (impact.newScripturesAdded > 0) {
    parts.push(`${impact.newScripturesAdded} scriptures not yet on approved evidence cards`);
  }
  if (impact.newChainsAdded > 0) {
    parts.push(`${impact.newChainsAdded} chains beyond Phase 3E baseline`);
  }
  if (impact.newQuestionsCovered > 0) {
    parts.push(`${impact.newQuestionsCovered} newly covered question variants`);
  }
  if (!parts.length) {
    parts.push('Consolidates existing corpus without new scripture surface area');
  }
  parts.push(`Confidence ${confidence} (informational — does not override support score or human review)`);
  if (pack.readiness?.readyForImplementationPreparation) {
    parts.push('Marked ready for implementation preparation after human review');
  }
  return parts.join('. ') + '.';
}

function buildImplementationImpactAnalysis(packs) {
  const implemented = loadImplementedScriptureBaseline();
  const prior = loadPriorTopicBaseline();

  return packs.map((pack) => {
    const cardTopic = cardTopicForPack(pack.topic);
    const implRefSet = new Set(
      (implemented[cardTopic] || []).map(refKey),
    );

    const allRefs = pack.allOriginalScriptures || [];
    const newScriptures = allRefs.filter((r) => !implRefSet.has(refKey(r)));

    const priorTopic = prior[pack.topic] || { chains: 0, questions: new Set(), scriptures: new Set() };
    const newChainsAdded = Math.max(0, pack.chainCount - priorTopic.chains);

    const currentQuestions = new Set(
      (pack.sourceQuestions || []).map((q) => normalizeQuestionKey(q.question)).filter(Boolean),
    );
    let newQuestionsCovered = 0;
    for (const q of currentQuestions) {
      if (!priorTopic.questions.has(q)) newQuestionsCovered += 1;
    }

    const implementationConfidence = computeImplementationConfidence(
      pack,
      newScriptures.length,
      newChainsAdded,
    );

    const impact = {
      topic: pack.topic,
      displayName: pack.displayName,
      newScripturesAdded: newScriptures.length,
      newChainsAdded,
      newQuestionsCovered,
      implementationConfidence,
      learningGainScore: 0,
      implementationImpactSummary: '',
    };

    impact.learningGainScore = computeLearningGainScore(pack, impact);
    impact.implementationImpactSummary = buildImpactSummary(pack, impact, implementationConfidence);

    return impact;
  }).sort((a, b) => b.learningGainScore - a.learningGainScore);
}

function findPackForSeedTopic(seedTopic, packs) {
  const aliases = SEED_TOPIC_ALIASES[seedTopic] || [seedTopic];
  for (const alias of aliases) {
    const hit = packs.find((p) => p.topic === alias);
    if (hit) return hit;
  }
  return packs.find((p) => p.topic.includes(seedTopic) || seedTopic.includes(p.topic));
}

function flattenSeedTopics() {
  const out = new Set();
  for (const list of Object.values(SEED_CATEGORIES)) {
    for (const t of list) out.add(t);
  }
  for (const t of WATCHLIST_MAJOR_TOPICS) out.add(t);
  return [...out].sort();
}

function buildMissingTopicWatchlist(packs) {
  const seeds = flattenSeedTopics();
  const foundTopics = [];
  const weakTopics = [];
  const missingTopics = [];

  for (const seed of seeds) {
    const pack = findPackForSeedTopic(seed, packs);
    if (!pack || pack.chainCount === 0) {
      missingTopics.push({
        topic: seed,
        displayName: displayName(seed),
        reason: 'no_consolidated_pack',
      });
      continue;
    }

    const isWeak = pack.readiness?.needsMoreExtraction
      || pack.supportScore < 70
      || pack.scriptureCount < 5
      || pack.chainCount < 2;

    if (isWeak) {
      weakTopics.push({
        topic: seed,
        packTopic: pack.topic,
        displayName: pack.displayName,
        supportScore: pack.supportScore,
        scriptureCount: pack.scriptureCount,
        chainCount: pack.chainCount,
        reason: pack.readiness?.needsMoreExtraction
          ? 'needs_more_extraction'
          : pack.scriptureCount < 5
            ? 'low_scripture_depth'
            : 'low_support_score',
      });
    } else {
      foundTopics.push({
        topic: seed,
        packTopic: pack.topic,
        displayName: pack.displayName,
        supportScore: pack.supportScore,
        scriptureCount: pack.scriptureCount,
        chainCount: pack.chainCount,
      });
    }
  }

  const doctrineCompletenessScore = seeds.length
    ? Math.round((foundTopics.length / seeds.length) * 1000) / 10
    : 0;

  const majorWeak = WATCHLIST_MAJOR_TOPICS.filter((t) =>
    weakTopics.some((w) => w.topic === t || w.packTopic === t),
  );
  const majorMissing = WATCHLIST_MAJOR_TOPICS.filter((t) =>
    missingTopics.some((m) => m.topic === t),
  );

  return {
    foundTopics,
    weakTopics,
    missingTopics,
    doctrineCompletenessScore,
    doctrineCompletenessNote: 'Informational only — does not block implementation, override support score, strength tier, or human review',
    majorTopicsWeak: majorWeak,
    majorTopicsMissing: majorMissing,
    seedTopicCount: seeds.length,
    foundCount: foundTopics.length,
    weakCount: weakTopics.length,
    missingCount: missingTopics.length,
  };
}

function buildExecutive(packs, duplicates, sourceEffectiveness, input, implementationImpact, watchlist) {
  const topByScore = [...packs].sort((a, b) => b.supportScore - a.supportScore).slice(0, 10);
  const topByScripture = [...packs].sort((a, b) => b.scriptureCount - a.scriptureCount).slice(0, 10);
  const topByParallel = [...packs].sort((a, b) => b.parallelScriptureCount - a.parallelScriptureCount).slice(0, 10);
  const topBySupporting = [...packs].sort((a, b) => b.supportingScriptureCount - a.supportingScriptureCount).slice(0, 10);
  const topByContinuity = [...packs].sort((a, b) => b.continuityScriptureCount - a.continuityScriptureCount).slice(0, 10);
  const readyReview = packs.filter((p) => p.readiness.readyForHumanReview);
  const readyImpl = packs.filter((p) => p.readiness.readyForImplementationPreparation);
  const needsExtraction = packs.filter((p) => p.readiness.needsMoreExtraction);

  return {
    topicPackCount: packs.length,
    rawChainCount: input.phase3fChainCount,
    priorChainCount: input.priorChainCount,
    strongestTopicPacks: topByScore.map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      supportScore: p.supportScore,
      scriptureCount: p.scriptureCount,
    })),
    mostScriptureSupport: topByScripture.map((p) => ({
      topic: p.topic,
      scriptureCount: p.scriptureCount,
      chainCount: p.chainCount,
    })),
    mostParallelScriptures: topByParallel.filter((p) => p.parallelScriptureCount > 0).map((p) => ({
      topic: p.topic,
      parallelScriptureCount: p.parallelScriptureCount,
    })),
    mostSupportingScriptures: topBySupporting.filter((p) => p.supportingScriptureCount > 0).map((p) => ({
      topic: p.topic,
      supportingScriptureCount: p.supportingScriptureCount,
    })),
    mostContinuityScriptures: topByContinuity.filter((p) => p.continuityScriptureCount > 0).map((p) => ({
      topic: p.topic,
      continuityScriptureCount: p.continuityScriptureCount,
    })),
    readyForHumanReview: readyReview.map((p) => p.topic),
    readyForHumanReviewCount: readyReview.length,
    readyForImplementationPreparation: readyImpl.map((p) => p.topic),
    readyForImplementationPreparationCount: readyImpl.length,
    needsMoreExtraction: needsExtraction.map((p) => p.topic),
    needsMoreExtractionCount: needsExtraction.length,
    topSources: sourceEffectiveness.topSources.slice(0, 10),
    topCamps: sourceEffectiveness.topCamps.slice(0, 10),
    duplicateChainsConsolidated: duplicates.stats.duplicateChainsConsolidated,
    reviewEffortEliminated: duplicates.stats.reviewEffortEliminated,
    top25ForLearning: packs.slice(0, 25).map((p, i) => ({
      rank: i + 1,
      topic: p.topic,
      displayName: p.displayName,
      supportScore: p.supportScore,
      scriptureCount: p.scriptureCount,
      chainCount: p.chainCount,
      readyForImplementationPreparation: p.readiness.readyForImplementationPreparation,
    })),
    highImplementationConfidence: implementationImpact
      .filter((i) => i.implementationConfidence === 'High')
      .map((i) => ({
        topic: i.topic,
        displayName: i.displayName,
        newScripturesAdded: i.newScripturesAdded,
        learningGainScore: i.learningGainScore,
      })),
    largestLearningGain: implementationImpact.slice(0, 15).map((i) => ({
      topic: i.topic,
      displayName: i.displayName,
      learningGainScore: i.learningGainScore,
      newScripturesAdded: i.newScripturesAdded,
      newChainsAdded: i.newChainsAdded,
    })),
    majorTopicsWeak: watchlist.majorTopicsWeak,
    majorTopicsMissing: watchlist.majorTopicsMissing,
    implementFirstForMaxLearning: implementationImpact
      .filter((i) => i.implementationConfidence === 'High' || i.implementationConfidence === 'Medium')
      .slice(0, 10)
      .map((i, idx) => ({
        rank: idx + 1,
        topic: i.topic,
        displayName: i.displayName,
        learningGainScore: i.learningGainScore,
        implementationConfidence: i.implementationConfidence,
        supportScore: packs.find((p) => p.topic === i.topic)?.supportScore,
      })),
    doctrineCompletenessScore: watchlist.doctrineCompletenessScore,
    doctrineCompletenessNote: watchlist.doctrineCompletenessNote,
  };
}

function runPhase3gTopicPackConsolidation() {
  const input = loadPhase3fInputs();
  const duplicates = identifyDuplicates(input.chains);
  const packs = buildTopicPacks(input.chains);
  const sourceEffectiveness = buildSourceEffectiveness(input.chains, packs);
  const humanReviewPackets = buildHumanReviewPackets(packs);
  const masterPacks = buildMasterPacksJson(packs);
  const implementationImpact = buildImplementationImpactAnalysis(packs);
  const missingTopicWatchlist = buildMissingTopicWatchlist(packs);
  const executive = buildExecutive(
    packs,
    duplicates,
    sourceEffectiveness,
    input,
    implementationImpact,
    missingTopicWatchlist,
  );

  const payload = {
    phase: '3G',
    ranAt: new Date().toISOString(),
    inputRanAt: input.ranAt,
    packs,
    masterPacks,
    duplicates,
    sourceEffectiveness,
    humanReviewPackets,
    implementationImpact,
    missingTopicWatchlist,
    executive,
    safety: {
      productionChanges: false,
      implementation: false,
      approvals: false,
      doctrineChanges: false,
      graphUpdates: false,
      cardUpdates: false,
      promptChanges: false,
      passed: true,
    },
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(TRACE, 'phase3g-topic-pack-consolidation-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'master-topic-packs.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, packs: masterPacks, executive }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'implementation-impact-analysis.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, impacts: implementationImpact, doctrineCompletenessScore: executive.doctrineCompletenessScore }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'missing-topic-watchlist.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, ...missingTopicWatchlist }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3gTopicPackConsolidation,
  loadPhase3fInputs,
  identifyDuplicates,
  buildTopicPacks,
  buildSourceEffectiveness,
  buildImplementationImpactAnalysis,
  buildMissingTopicWatchlist,
  computeImplementationConfidence,
  computeLearningGainScore,
};
