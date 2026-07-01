/**
 * Phase 3K — Missing doctrine pack recovery and maturation.
 * Focus: missing, weak, emerging, underdeveloped topics — not strong mature packs.
 * Scripture-only expansion — no production, doctrine, card, or graph mutations.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { TOPIC_PATTERNS, discoverTopicFromText } = require('./bibleWideTopicDiscovery');
const { lookupByTopic, getSeedConcordanceIndex } = require('./concordanceFoundation');
const {
  expandDoctrinePack,
  scoreEnrichedPack,
  uniqueRefs,
} = require('./phase3iRecursiveExpansion');
const {
  computeImplementationConfidence,
  computeLearningGainScore,
} = require('./phase3gTopicPackConsolidation');
const {
  loadFullDoctrinePackCorpus,
  discoverBibleWideTopics,
  categorizeByEra,
  detectMissingLinks,
} = require('./phase3jDoctrinePackMaturation');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const STRONG_PACK = { score: 85, scriptures: 12 };

const JESUS_OT_NT_SEEDS = [
  'Genesis 1:1', 'Genesis 3:15', 'Genesis 18:1-2', 'Genesis 22:8', 'Genesis 32:30',
  'Exodus 3:2', 'Exodus 3:14', 'Exodus 13:21', 'Exodus 23:20-21', 'Exodus 33:20',
  'Numbers 20:16', 'Deuteronomy 32:4', 'Joshua 5:14', 'Judges 6:12', 'Judges 13:18',
  '1 Samuel 3:10', '2 Samuel 22:47', 'Psalm 18:2', 'Psalm 45:6-7', 'Psalm 110:1',
  'Isaiah 7:14', 'Isaiah 9:6', 'Isaiah 40:3', 'Isaiah 43:10-11', 'Isaiah 44:6',
  'Isaiah 48:12', 'Isaiah 63:9', 'Jeremiah 23:5-6', 'Ezekiel 1:26-28', 'Daniel 7:13-14',
  'Micah 5:2', 'Zechariah 12:10', 'Malachi 3:1', 'Matthew 1:23', 'Matthew 3:3',
  'John 1:1-14', 'John 5:37', 'John 8:58', 'John 10:30', 'John 14:9',
  'Acts 7:30-32', '1 Corinthians 10:4', 'Hebrews 1:1-3', 'Hebrews 1:8-9',
  'Colossians 1:15-17', 'Revelation 1:8', 'Revelation 1:17-18', 'Revelation 22:13',
];

const HOLY_SPIRIT_SEEDS = [
  'Genesis 1:2', 'Genesis 6:3', 'Numbers 11:25-29', '1 Samuel 16:13', 'Psalm 51:11',
  'Isaiah 11:2', 'Isaiah 61:1', 'Ezekiel 36:27', 'Joel 2:28-29', 'Matthew 3:16',
  'Luke 11:13', 'John 14:16-17', 'John 14:26', 'John 15:26', 'John 16:13',
  'Acts 1:8', 'Acts 2:1-4', 'Acts 5:32', 'Romans 8:9', 'Romans 8:14',
  '1 Corinthians 2:10-11', '1 Corinthians 12:4-7', 'Galatians 5:22-23', 'Ephesians 4:30',
  '1 Thessalonians 4:8', '2 Timothy 1:7', 'Titus 3:5', '1 Peter 1:11',
];

const RECOVERY_GROUPS = {
  jesusOtNt: {
    part: 'B',
    topics: [{
      topic: 'jesus_old_testament_new_testament',
      displayName: 'Jesus Old Testament / New Testament',
      pattern: /\b(angel of the lord|word of god|i am|alpha and omega|first and last|captain of the host|rock in the wilderness|logos)\b/i,
      category: 'doctrine',
      seedScriptures: JESUS_OT_NT_SEEDS,
    }],
  },
  holySpirit: {
    part: 'C',
    topics: [{
      topic: 'holy_spirit',
      displayName: 'Holy Spirit',
      pattern: /\b(holy spirit|holy ghost|spirit of god|spirit of christ|comforter|spirit of truth|breath of life)\b/i,
      category: 'doctrine',
      seedScriptures: HOLY_SPIRIT_SEEDS,
    }],
  },
  feasts: {
    part: 'D',
    topics: [
      { topic: 'passover', pattern: /\bpassover\b/i, category: 'feasts', seedScriptures: ['Exodus 12', 'Leviticus 23:5', '1 Corinthians 5:7-8'] },
      { topic: 'unleavened_bread', pattern: /\bunleavened bread\b/i, category: 'feasts', seedScriptures: ['Exodus 12:15-20', 'Leviticus 23:6'] },
      { topic: 'pentecost', pattern: /\bpentecost\b/i, category: 'feasts', seedScriptures: ['Leviticus 23:15-16', 'Acts 2:1-4'] },
      { topic: 'feast_of_trumpets', pattern: /\b(feast of trumpets|day of trumpets)\b/i, category: 'feasts', seedScriptures: ['Leviticus 23:24'] },
      { topic: 'day_of_atonement', pattern: /\bday of atonement\b/i, category: 'feasts', seedScriptures: ['Leviticus 16', 'Leviticus 23:27-32'] },
      { topic: 'feast_of_tabernacles', pattern: /\b(feast of tabernacles|tabernacles)\b/i, category: 'feasts', seedScriptures: ['Leviticus 23:34', 'Zechariah 14:16-19'] },
      { topic: 'last_great_day', pattern: /\b(last great day|eighth day)\b/i, category: 'feasts', seedScriptures: ['Leviticus 23:36', 'John 7:37-38'] },
      { topic: 'high_sabbaths', pattern: /\bhigh sabbath/i, category: 'feasts', seedScriptures: ['Leviticus 23:7', 'John 19:31'] },
      { topic: 'leviticus_23', pattern: /\bleviticus 23\b/i, category: 'feasts', seedScriptures: ['Leviticus 23'] },
      { topic: 'three_pilgrimage_feasts', pattern: /\b(three feast|pilgrimage feast)\b/i, category: 'feasts', seedScriptures: ['Exodus 23:14-17', 'Deuteronomy 16:16'] },
    ],
  },
  prophetic: {
    part: 'E',
    topics: [
      { topic: 'abomination_of_desolation', pattern: /\b(abomination of desolation|abomination that maketh desolate)\b/i, category: 'prophecy' },
      { topic: 'great_tribulation', pattern: /\b(great tribulation|time of trouble|jacob.?s trouble)\b/i, category: 'prophecy' },
      { topic: 'two_witnesses', pattern: /\b(two witnesses|witnesses of god)\b/i, category: 'prophecy' },
      { topic: '144000', pattern: /\b(144,?000|144000)\b/i, category: 'prophecy' },
      { topic: 'mark_of_the_beast', pattern: /\b(mark of the beast|mark of god|666)\b/i, category: 'prophecy' },
      { topic: 'false_prophet', pattern: /\bfalse prophet\b/i, category: 'prophecy' },
      { topic: 'gog_and_magog', pattern: /\b(gog and magog|gog of magog)\b/i, category: 'prophecy' },
      { topic: 'lake_of_fire', pattern: /\b(lake of fire|hell fire|everlasting fire)\b/i, category: 'prophecy' },
      { topic: 'new_jerusalem', pattern: /\bnew jerusalem\b/i, category: 'prophecy' },
      { topic: 'millennial_kingdom', pattern: /\b(millennial kingdom|thousand years|millennium)\b/i, category: 'prophecy', seedScriptures: ['Revelation 20:4-6'] },
      { topic: 'great_white_throne', pattern: /\b(great white throne|white throne judgment)\b/i, category: 'prophecy', seedScriptures: ['Revelation 20:11-15'] },
    ],
  },
  people: {
    part: 'F',
    topics: ['adam', 'noah', 'abraham', 'isaac', 'jacob', 'joseph', 'moses', 'joshua',
      'david', 'solomon', 'elijah', 'elisha', 'isaiah', 'jeremiah', 'ezekiel', 'daniel',
      'peter', 'john', 'paul'].map((topic) => {
      const pat = TOPIC_PATTERNS.find((p) => p.topic === topic);
      return {
        topic,
        displayName: topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        pattern: pat?.pattern || new RegExp(`\\b${topic.replace(/_/g, ' ')}\\b`, 'i'),
        category: 'people',
      };
    }),
  },
  covenantKingdom: {
    part: 'G',
    topics: [
      { topic: 'abrahamic_covenant', pattern: /\b(abrahamic covenant|covenant with abraham)\b/i, category: 'covenant', seedScriptures: ['Genesis 12:1-3', 'Genesis 15:18', 'Genesis 17:7'] },
      { topic: 'davidic_covenant', pattern: /\b(davidic covenant|covenant with david)\b/i, category: 'covenant', seedScriptures: ['2 Samuel 7:12-16', 'Psalm 89:3-4'] },
      { topic: 'new_covenant', pattern: /\bnew covenant\b/i, category: 'covenant', seedScriptures: ['Jeremiah 31:31-34', 'Hebrews 8:8-12'] },
      { topic: 'kingdom_of_god', pattern: /\b(kingdom of god|thy kingdom come|kingdom of heaven)\b/i, category: 'kingdom' },
      { topic: 'kingdom_on_earth', pattern: /\b(kingdom on earth|kingdom of this world)\b/i, category: 'kingdom', seedScriptures: ['Daniel 2:44', 'Revelation 11:15'] },
      { topic: 'millennial_kingdom', pattern: /\b(thousand years|millennium|millennial)\b/i, category: 'kingdom', seedScriptures: ['Revelation 20:4-6'] },
      { topic: 'fathers_kingdom', pattern: /\b(father.?s kingdom|8th day.*father|eighth day.*father)\b/i, category: 'kingdom', seedScriptures: ['Matthew 6:9-10', 'Revelation 21:1-3'] },
    ],
  },
};

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function displayName(topic = '') {
  return String(topic).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isStrongPack(pack) {
  return (pack?.supportScore || 0) >= STRONG_PACK.score
    && (pack?.scriptureCount || 0) >= STRONG_PACK.scriptures;
}

function searchConcordanceByPattern(pattern) {
  const refs = [];
  for (const entry of getSeedConcordanceIndex()) {
    const text = [
      entry.gloss, entry.definition,
      ...(entry.relatedRenderings || []),
      ...(entry.doctrinalThemes || []),
      ...(entry.linkedTopics || []),
    ].join(' ');
    if (pattern.test(text)) {
      refs.push(...(entry.occurrences || []));
    }
  }
  return uniqueRefs(refs);
}

function collectCorpusScriptures(topic, pattern, corpus, seedScriptures = []) {
  const matchingChains = corpus.chains.filter((c) =>
    c.topic === topic
    || pattern.test(`${c.lessonTitle || ''} ${c.question || ''}`),
  );
  const matchingQuestions = corpus.questions.filter((q) =>
    pattern.test(`${q.lessonTitle || ''} ${q.question || ''}`),
  );

  const cards = getAllApprovedCards().filter((c) => c.topic === topic);
  const edges = getAllApprovedSupportEdges().filter((e) => e.topic === topic);

  return uniqueRefs([
    ...seedScriptures,
    ...matchingChains.flatMap((c) => c.originalScriptureChain || []),
    ...cards.flatMap((c) => [...(c.primaryScriptures || []), ...(c.supportingScriptures || [])]),
    ...edges.flatMap((e) => e.scriptures || []),
    ...lookupByTopic(topic).flatMap((e) => e.occurrences || []),
    ...searchConcordanceByPattern(pattern),
  ]);
}

function buildRecoveredPack(config, corpus, existingPack, priorStatus) {
  const topic = config.topic;
  const pattern = config.pattern;
  const display = config.displayName || displayName(topic);
  const corpusScriptures = collectCorpusScriptures(topic, pattern, corpus, config.seedScriptures || []);

  const priorScriptures = uniqueRefs([
    ...(existingPack?.allOriginalScriptures || []),
    ...(existingPack?.strongestChain?.originalScriptureChain || []),
  ]);

  const allOriginal = uniqueRefs([...priorScriptures, ...corpusScriptures]);
  const matchingChains = corpus.chains.filter((c) =>
    c.topic === topic || pattern.test(`${c.lessonTitle || ''} ${c.question || ''}`),
  );
  const matchingQuestions = corpus.questions.filter((q) =>
    pattern.test(`${q.lessonTitle || ''} ${q.question || ''}`),
  );

  const strongestChain = matchingChains.sort(
    (a, b) => (b.originalScriptureChain || []).length - (a.originalScriptureChain || []).length,
  )[0];

  const pack = {
    topic,
    displayName: display,
    category: config.category || 'recovered',
    chainCount: matchingChains.length,
    questionCount: matchingQuestions.length,
    lessonCount: new Set(matchingQuestions.map((q) => q.lessonTitle).filter(Boolean)).size,
    sourceCount: new Set([
      ...matchingChains.map((c) => c.sourceName),
      ...matchingQuestions.map((q) => q.sourceName),
      ...(existingPack?.sources || []),
    ].filter(Boolean)).size,
    allOriginalScriptures: allOriginal,
    allParallelScriptures: existingPack?.allParallelScriptures || [],
    allSupportingScriptures: existingPack?.allSupportingScriptures || [],
    allContinuityScriptures: existingPack?.allContinuityScriptures || [],
    scriptureCount: allOriginal.length,
    parallelScriptureCount: (existingPack?.allParallelScriptures || []).length,
    supportingScriptureCount: (existingPack?.allSupportingScriptures || []).length,
    continuityScriptureCount: (existingPack?.allContinuityScriptures || []).length,
    supportScore: existingPack?.supportScore || (allOriginal.length >= 5 ? 55 : 40),
    strengthTier: existingPack?.strengthTier || 'Emerging',
    strongestChain: strongestChain ? {
      question: strongestChain.question,
      lessonTitle: strongestChain.lessonTitle,
      originalScriptureChain: uniqueRefs([
        ...(strongestChain.originalScriptureChain || []),
        ...allOriginal,
      ]),
    } : {
      question: `What does Scripture teach about ${display}?`,
      originalScriptureChain: allOriginal,
    },
    sourceQuestions: [
      ...(existingPack?.sourceQuestions || []),
      ...matchingQuestions.map((q) => ({ question: q.question, lessonTitle: q.lessonTitle })),
    ],
    sourceLessons: [
      ...(existingPack?.sourceLessons || []),
      ...matchingChains.map((c) => ({ lessonTitle: c.lessonTitle, sourceName: c.sourceName })),
    ],
    sources: [
      ...(existingPack?.sources || []),
      ...matchingChains.map((c) => c.sourceName).filter(Boolean),
    ],
    packOrigin: existingPack ? `recovered+${existingPack.packOrigin || 'corpus'}` : 'recovered',
    priorStatus,
    recoveryGroup: config.recoveryGroup,
    recoveryPart: config.recoveryPart,
    corpusScripturesFound: corpusScriptures.length,
    wasMissing: priorStatus === 'missing' || priorStatus === 'emerging',
    wasWeak: priorStatus === 'weak' || priorStatus === 'underdeveloped',
  };

  return pack;
}

function matureRecoveredPack(pack, { maxDepth = 3 } = {}) {
  const priorScriptureCount = pack.scriptureCount || 0;
  const priorScore = pack.supportScore || 0;
  const expansion = expandDoctrinePack(pack, { maxDepth });
  const enriched = expansion.enrichedPack;
  const scoring = scoreEnrichedPack(enriched, expansion);
  const g2rEras = categorizeByEra(uniqueRefs([
    ...enriched.allOriginalScriptures || [],
    ...expansion.genesisToRevelationChain || [],
  ]));
  const missingLinks = detectMissingLinks(enriched, expansion);

  const impactStub = {
    newScripturesAdded: expansion.expandedRefs.length,
    newChainsAdded: 0,
    newQuestionsCovered: 0,
  };
  const implementationConfidence = computeImplementationConfidence(
    { ...enriched, supportScore: scoring.supportScore },
    expansion.expandedRefs.length,
    enriched.scriptureCount - priorScriptureCount,
  );
  const learningGainScore = computeLearningGainScore(enriched, impactStub)
    + expansion.enrichment.parallelAdded * 2
    + expansion.enrichment.supportingAdded * 2
    + expansion.enrichment.continuityAdded * 3
    + (pack.wasMissing ? 25 : 0);

  const matured = {
    ...enriched,
    supportScore: scoring.supportScore,
    strengthTier: scoring.strengthTier,
    priorSupportScore: priorScore,
    scoreDelta: scoring.supportScore - priorScore,
    scoreExplanation: scoring.scoreExplanation,
    implementationConfidence,
    learningGainScore,
    genesisToRevelationChain: expansion.genesisToRevelationChain,
    genesisToRevelationSpan: expansion.genesisToRevelationSpan,
    g2rEras,
    g2rLinkCount: expansion.genesisToRevelationChain.length,
    missingLinks,
    enrichment: expansion.enrichment,
    newScripturesAdded: expansion.expandedRefs.length,
    newParallelAdded: expansion.newParallelScriptures.length,
    newSupportingAdded: expansion.newSupportingScriptures.length,
    newContinuityAdded: expansion.newContinuityScriptures.length,
    questionCoverage: pack.questionCount || (pack.sourceQuestions || []).length,
    lessonCoverage: pack.lessonCount || (pack.sourceLessons || []).length,
    sourceCoverage: pack.sourceCount || (pack.sources || []).length,
    implementationImpact: learningGainScore,
    implementationReady: scoring.supportScore >= 90 && enriched.scriptureCount >= 8,
    packOrigin: pack.packOrigin,
    priorStatus: pack.priorStatus,
    recoveryGroup: pack.recoveryGroup,
    recoveryPart: pack.recoveryPart,
    wasMissing: pack.wasMissing,
    wasWeak: pack.wasWeak,
    recovered: pack.wasMissing && enriched.scriptureCount >= 3,
    matured: (scoring.supportScore - priorScore) >= 5
      || (enriched.scriptureCount - priorScriptureCount) >= 3,
    scripturesAdded: enriched.scriptureCount - priorScriptureCount,
    originalChain: pack.strongestChain?.originalScriptureChain || pack.allOriginalScriptures || [],
    parallelScriptures: enriched.allParallelScriptures || [],
    supportingScriptures: enriched.allSupportingScriptures || [],
    continuityScriptures: enriched.allContinuityScriptures || [],
  };

  return { expansion, matured };
}

function buildRecoveryTargetList(corpus, bibleWide, existingByTopic) {
  const targets = new Map();

  for (const entry of bibleWide.missingTopics) {
    targets.set(entry.topic, { topic: entry.topic, priorStatus: entry.status, source: 'bible_wide' });
  }
  for (const entry of bibleWide.weakTopics) {
    if (!targets.has(entry.topic)) {
      targets.set(entry.topic, { topic: entry.topic, priorStatus: 'weak', source: 'bible_wide' });
    }
  }

  for (const [groupKey, group] of Object.entries(RECOVERY_GROUPS)) {
    for (const t of group.topics) {
      const topic = t.topic;
      const existing = existingByTopic.get(topic);
      const priorStatus = targets.get(topic)?.priorStatus
        || (existing && (existing.supportScore || 0) < 70 ? 'weak' : 'underdeveloped');
      targets.set(topic, {
        topic,
        priorStatus,
        source: `recovery_group_${groupKey}`,
        config: { ...t, recoveryGroup: groupKey, recoveryPart: group.part },
      });
    }
  }

  const filtered = [];
  for (const [topic, meta] of targets) {
    const existing = existingByTopic.get(topic);
    const inRecoveryGroup = meta.config != null;
    if (existing && isStrongPack(existing) && !inRecoveryGroup) continue;
    filtered.push(meta);
  }
  return filtered;
}

function buildImplementationQueues(recoveredPacks) {
  const bucket = (min, max) => recoveredPacks
    .filter((p) => p.supportScore >= min && p.supportScore <= max)
    .map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      supportScore: p.supportScore,
      learningGainScore: p.learningGainScore,
      scriptureCount: p.scriptureCount,
      implementationReady: p.implementationReady,
    }));

  return {
    queue95: bucket(95, 100),
    queue90: bucket(90, 94),
    queue80: bucket(80, 89),
    queue70: bucket(70, 79),
    queueBelow70: recoveredPacks.filter((p) => p.supportScore < 70).map((p) => ({
      topic: p.topic,
      supportScore: p.supportScore,
    })),
  };
}

function runPhase3kMissingPackRecovery({ maxDepth = 3 } = {}) {
  const corpus = loadFullDoctrinePackCorpus();
  const existingByTopic = new Map(corpus.packs.map((p) => [p.topic, p]));
  const bibleWide = discoverBibleWideTopics(corpus.packs, corpus.chains, corpus.questions);

  const phase3j = loadJson(path.join(TRACE, 'phase3j-doctrine-pack-maturation-results.json'), {});
  if (phase3j.bibleWideDiscovery) {
    for (const t of phase3j.bibleWideDiscovery.missingTopics || []) {
      if (!bibleWide.missingTopics.find((m) => m.topic === t.topic)) {
        bibleWide.missingTopics.push(t);
      }
    }
  }

  const recoveryTargets = buildRecoveryTargetList(corpus, bibleWide, existingByTopic);

  const recoveryReport = [];
  const recoveredPacks = [];
  const maturationResults = [];
  const groupPacks = {
    jesusOtNt: [],
    holySpirit: [],
    feasts: [],
    prophetic: [],
    people: [],
    covenantKingdom: [],
  };

  for (const target of recoveryTargets) {
    const existing = existingByTopic.get(target.topic);
    const config = target.config || {
      topic: target.topic,
      displayName: displayName(target.topic),
      pattern: TOPIC_PATTERNS.find((p) => p.topic === target.topic)?.pattern
        || new RegExp(target.topic.replace(/_/g, '|'), 'i'),
      category: 'recovered',
      recoveryGroup: 'auto',
      recoveryPart: 'A',
    };

    const recoveredPack = buildRecoveredPack(config, corpus, existing, target.priorStatus);
    const { expansion, matured } = matureRecoveredPack(recoveredPack, { maxDepth });

    recoveryReport.push({
      topic: target.topic,
      priorStatus: target.priorStatus,
      source: target.source,
      corpusScripturesFound: recoveredPack.corpusScripturesFound,
      scriptureCountBefore: recoveredPack.scriptureCount,
      scriptureCountAfter: matured.scriptureCount,
      supportScoreBefore: recoveredPack.supportScore,
      supportScoreAfter: matured.supportScore,
      recovered: matured.recovered,
      matured: matured.matured,
      missingLinks: matured.missingLinks,
    });

    maturationResults.push({ topic: target.topic, expansion, matured });
    recoveredPacks.push(matured);

    const gk = config.recoveryGroup;
    if (gk && groupPacks[gk]) groupPacks[gk].push(matured);
  }

  recoveredPacks.sort((a, b) => b.learningGainScore - a.learningGainScore);

  const stillMissing = bibleWide.missingTopics.filter((t) => {
    const p = recoveredPacks.find((r) => r.topic === t.topic);
    return !p || p.scriptureCount < 3;
  });

  const stillWeak = recoveredPacks.filter((p) =>
    p.supportScore < 70 || (p.missingLinks?.length || 0) > 3,
  );

  const totals = {
    targetsProcessed: recoveryTargets.length,
    packsRecovered: recoveredPacks.filter((p) => p.recovered).length,
    packsMatured: recoveredPacks.filter((p) => p.matured).length,
    newScriptures: maturationResults.reduce((s, m) => s + m.expansion.expandedRefs.length, 0),
    newParallel: maturationResults.reduce((s, m) => s + m.expansion.newParallelScriptures.length, 0),
    newSupporting: maturationResults.reduce((s, m) => s + m.expansion.newSupportingScriptures.length, 0),
    newContinuity: maturationResults.reduce((s, m) => s + m.expansion.newContinuityScriptures.length, 0),
  };

  const queues = buildImplementationQueues(recoveredPacks);

  const executive = {
    missingPacksRecovered: totals.packsRecovered,
    weakPacksMatured: totals.packsMatured,
    packsGainedMostDepth: [...recoveredPacks]
      .sort((a, b) => b.scripturesAdded - a.scripturesAdded)
      .slice(0, 12)
      .map((p) => ({
        topic: p.topic,
        displayName: p.displayName,
        scripturesAdded: p.scripturesAdded,
        supportScore: p.supportScore,
      })),
    exceeds95: recoveredPacks.filter((p) => p.supportScore >= 95).map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      supportScore: p.supportScore,
    })),
    exceeds90: recoveredPacks.filter((p) => p.supportScore >= 90).map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      supportScore: p.supportScore,
    })),
    implementationReady: recoveredPacks.filter((p) => p.implementationReady).map((p) => p.topic),
    implementationReadyCount: recoveredPacks.filter((p) => p.implementationReady).length,
    reviewFirst: recoveredPacks
      .filter((p) => p.supportScore >= 75 || p.learningGainScore >= 80)
      .slice(0, 15)
      .map((p) => ({
        topic: p.topic,
        displayName: p.displayName,
        supportScore: p.supportScore,
        learningGainScore: p.learningGainScore,
        implementationConfidence: p.implementationConfidence,
      })),
    largestLearningGain: recoveredPacks.slice(0, 10).map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      learningGainScore: p.learningGainScore,
    })),
    remainingGaps: stillMissing.map((t) => t.topic),
    remainingGapCount: stillMissing.length,
    remainingWeakGaps: stillWeak.map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      supportScore: p.supportScore,
      scriptureCount: p.scriptureCount,
      missingLinks: p.missingLinks,
    })),
    remainingWeakGapCount: stillWeak.length,
    implementFirstAfterReview: recoveredPacks
      .filter((p) => p.implementationReady || p.implementationConfidence === 'High')
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        topic: p.topic,
        displayName: p.displayName,
        supportScore: p.supportScore,
        learningGainScore: p.learningGainScore,
      })),
    projectedLearningGain: recoveredPacks.reduce((s, p) => s + p.learningGainScore, 0),
    expansionTotals: totals,
    targetsProcessed: totals.targetsProcessed,
  };

  const humanReviewPackets = recoveredPacks.map((p) => ({
    topic: p.topic,
    displayName: p.displayName,
    supportScore: p.supportScore,
    strengthTier: p.strengthTier,
    scriptureCount: p.scriptureCount,
    parallelScriptureCount: p.parallelScriptureCount,
    supportingScriptureCount: p.supportingScriptureCount,
    continuityScriptureCount: p.continuityScriptureCount,
    g2rLinkCount: p.g2rLinkCount,
    questionCoverage: p.questionCoverage,
    lessonCoverage: p.lessonCoverage,
    sourceCoverage: p.sourceCoverage,
    implementationImpact: p.implementationImpact,
    implementationConfidence: p.implementationConfidence,
    newScripturesAdded: p.newScripturesAdded,
    newChainsAdded: p.chainCount,
    priorStatus: p.priorStatus,
    recovered: p.recovered,
    matured: p.matured,
    missingLinks: p.missingLinks,
    implementationReady: p.implementationReady,
    reviewNotes: [
      p.implementationReady ? 'Implementation-ready after human review' : 'Needs review before implementation',
      p.missingLinks?.length ? `Gaps: ${p.missingLinks.join(', ')}` : 'No critical missing-link flags',
    ],
  }));

  const payload = {
    phase: '3K',
    ranAt: new Date().toISOString(),
    recoveryReport,
    recoveredPacks,
    maturationResults,
    groupPacks,
    bibleWideDiscovery: bibleWide,
    humanReviewPackets,
    queues,
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
    path.join(TRACE, 'phase3k-missing-pack-recovery-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'recovered-doctrine-packs.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, packs: recoveredPacks, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3kMissingPackRecovery,
  RECOVERY_GROUPS,
  JESUS_OT_NT_SEEDS,
  HOLY_SPIRIT_SEEDS,
};
