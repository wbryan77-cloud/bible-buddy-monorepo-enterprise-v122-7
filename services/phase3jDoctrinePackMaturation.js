/**
 * Phase 3J Rev 2 — Full doctrine pack maturation and Bible-wide expansion.
 * Scripture-only expansion — no production, doctrine, card, or graph mutations.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { TOPIC_PATTERNS, SEED_CATEGORIES, discoverTopicFromText } = require('./bibleWideTopicDiscovery');
const { strengthTierForScore } = require('./scriptureStrengthReview');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const {
  expandDoctrinePack,
  scoreEnrichedPack,
  uniqueRefs,
  refKey,
} = require('./phase3iRecursiveExpansion');
const {
  computeImplementationConfidence,
  computeLearningGainScore,
} = require('./phase3gTopicPackConsolidation');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const BIBLE_WIDE_TOPIC_CATALOG = [
  { topic: 'high_sabbaths', pattern: /\bhigh sabbath/i, category: 'feasts' },
  { topic: 'leviticus_23', pattern: /\bleviticus 23\b/i, category: 'feasts' },
  { topic: 'passover', pattern: /\bpassover\b/i, category: 'feasts' },
  { topic: 'unleavened_bread', pattern: /\bunleavened bread\b/i, category: 'feasts' },
  { topic: 'pentecost', pattern: /\bpentecost\b/i, category: 'feasts' },
  { topic: 'feast_of_trumpets', pattern: /\b(feast of trumpets|day of trumpets)\b/i, category: 'feasts' },
  { topic: 'day_of_atonement', pattern: /\bday of atonement\b/i, category: 'feasts' },
  { topic: 'feast_of_tabernacles', pattern: /\b(feast of tabernacles|tabernacles)\b/i, category: 'feasts' },
  { topic: 'last_great_day', pattern: /\b(last great day|eighth day)\b/i, category: 'feasts' },
  { topic: 'melchizedek', pattern: /\bmelchizedek\b/i, category: 'priesthood' },
  { topic: 'temple', pattern: /\b(temple of god|solomon's temple)\b/i, category: 'temple' },
  { topic: 'new_jerusalem', pattern: /\bnew jerusalem\b/i, category: 'prophecy' },
  { topic: 'tree_of_life', pattern: /\btree of life\b/i, category: 'prophecy' },
  { topic: 'tree_of_knowledge', pattern: /\btree of knowledge\b/i, category: 'doctrine' },
  { topic: 'gabriel', pattern: /\bgabriel\b/i, category: 'people' },
  { topic: 'millennial_kingdom', pattern: /\b(thousand years|millennium|millennial)\b/i, category: 'prophecy' },
  { topic: 'eighth_day_father', pattern: /\b8th day\b.*\bfather\b/i, category: 'prophecy' },
  { topic: 'the_beast', pattern: /\bthe beast\b/i, category: 'prophecy' },
  { topic: 'false_prophet', pattern: /\bfalse prophet\b/i, category: 'prophecy' },
  { topic: 'devil_deception', pattern: /\b(devil|serpent).*(light|preacher)/i, category: 'doctrine' },
  { topic: 'female_prophecy', pattern: /\b(woman prophet|female prophet)/i, category: 'doctrine' },
  { topic: 'women_in_bible', pattern: /\bwomen\b.*\b(role|bible)/i, category: 'doctrine' },
  { topic: 'circumcision', pattern: /\bcircumcision\b/i, category: 'doctrine' },
  { topic: 'the_church', pattern: /\b(the church|church of god)\b/i, category: 'doctrine' },
  { topic: 'israel', pattern: /\b(israel|twelve tribes)\b/i, category: 'lineage' },
  { topic: 'gentiles', pattern: /\bgentiles\b/i, category: 'doctrine' },
  { topic: 'hebrews_people', pattern: /\bhebrews\b/i, category: 'lineage' },
  { topic: 'edom', pattern: /\b(edom|edomites|idumea)\b/i, category: 'lineage' },
  { topic: 'deuteronomy_28_curses', pattern: /\bdeuteronomy 28\b/i, category: 'doctrine' },
  { topic: 'captivity', pattern: /\b(captivity|bondage|deuteronomy 28:68)\b/i, category: 'doctrine' },
  ...TOPIC_PATTERNS.map((t) => ({ topic: t.topic, pattern: t.pattern, category: t.category })),
];

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

function packFromEvidenceCard(card) {
  const scriptures = uniqueRefs([...(card.primaryScriptures || []), ...(card.supportingScriptures || [])]);
  return {
    topic: card.topic,
    displayName: displayName(card.topic),
    category: 'evidence_card',
    chainCount: 0,
    questionCount: 0,
    lessonCount: 0,
    sourceCount: 1,
    sourceName: 'evidence_card',
    allOriginalScriptures: scriptures,
    allParallelScriptures: [],
    allSupportingScriptures: card.supportingScriptures || [],
    allContinuityScriptures: [],
    scriptureCount: scriptures.length,
    parallelScriptureCount: 0,
    supportingScriptureCount: (card.supportingScriptures || []).length,
    continuityScriptureCount: 0,
    supportScore: 85,
    strengthTier: 'Good Support',
    strongestChain: {
      question: `What does Scripture teach about ${displayName(card.topic)}?`,
      originalScriptureChain: scriptures,
    },
    sourceQuestions: [],
    sourceLessons: [],
    camps: ['Internal'],
    sources: ['evidence_card'],
    packOrigin: 'evidence_card',
  };
}

function mergePackMetadata(target, source) {
  target.allOriginalScriptures = uniqueRefs([
    ...(target.allOriginalScriptures || []),
    ...(source.allOriginalScriptures || []),
  ]);
  target.allParallelScriptures = uniqueRefs([
    ...(target.allParallelScriptures || []),
    ...(source.allParallelScriptures || source.uniqueParallelScriptures || []),
  ]);
  target.allSupportingScriptures = uniqueRefs([
    ...(target.allSupportingScriptures || []),
    ...(source.allSupportingScriptures || source.uniqueSupportingScriptures || []),
  ]);
  target.allContinuityScriptures = uniqueRefs([
    ...(target.allContinuityScriptures || []),
    ...(source.allContinuityScriptures || source.uniqueContinuityScriptures || []),
  ]);
  target.scriptureCount = target.allOriginalScriptures.length;
  target.parallelScriptureCount = target.allParallelScriptures.length;
  target.supportingScriptureCount = target.allSupportingScriptures.length;
  target.continuityScriptureCount = target.allContinuityScriptures.length;
  target.chainCount = Math.max(target.chainCount || 0, source.chainCount || 0);
  target.questionCount = Math.max(target.questionCount || 0, source.questionCount || 0);
  target.lessonCount = Math.max(target.lessonCount || 0, source.lessonCount || 0);
  target.sourceCount = uniqueRefs([...(target.sources || []), ...(source.sources || [])]).length;
  if ((source.supportScore || 0) > (target.supportScore || 0)) {
    target.supportScore = source.supportScore;
    target.strengthTier = source.strengthTier;
  }
  if (source.strongestChain && (source.strongestChain.originalScriptureChain || []).length
    > (target.strongestChain?.originalScriptureChain || []).length) {
    target.strongestChain = source.strongestChain;
  }
  target.sourceQuestions = [...(target.sourceQuestions || []), ...(source.sourceQuestions || [])];
  target.sourceLessons = [...(target.sourceLessons || []), ...(source.sourceLessons || [])];
}

function loadFullDoctrinePackCorpus() {
  const phase3i = loadJson(path.join(OUT_DIR, 'enriched-topic-packs.json'), {});
  const phase3g = loadJson(path.join(TRACE, 'phase3g-topic-pack-consolidation-results.json'), {});
  const chains = loadJson(path.join(OUT_DIR, 'expanded-scripture-chains.json'), {}).chains || [];
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const questions = phase3f.questions || [];

  const byTopic = new Map();

  for (const p of phase3i.packs || []) {
    byTopic.set(p.topic, { ...p, packOrigin: 'phase3i_enriched' });
  }

  for (const p of phase3g.packs || []) {
    if (!byTopic.has(p.topic)) {
      byTopic.set(p.topic, { ...p, packOrigin: 'phase3g' });
    } else {
      mergePackMetadata(byTopic.get(p.topic), p);
    }
  }

  for (const card of getAllApprovedCards()) {
    if (!byTopic.has(card.topic)) {
      byTopic.set(card.topic, packFromEvidenceCard(card));
    } else {
      const pack = byTopic.get(card.topic);
      mergePackMetadata(pack, packFromEvidenceCard(card));
      pack.packOrigin = `${pack.packOrigin}+evidence_card`;
    }
  }

  for (const chain of chains) {
    const topic = chain.topic || discoverTopicFromText(chain.question || '', {
      lessonTitle: chain.lessonTitle,
    }).topic;
    if (!byTopic.has(topic)) {
      byTopic.set(topic, {
        topic,
        displayName: displayName(topic),
        category: 'discovered',
        chainCount: 1,
        questionCount: 1,
        lessonCount: 1,
        sourceCount: 1,
        allOriginalScriptures: chain.originalScriptureChain || [],
        allParallelScriptures: [],
        allSupportingScriptures: [],
        allContinuityScriptures: [],
        scriptureCount: (chain.originalScriptureChain || []).length,
        supportScore: 50,
        strongestChain: {
          question: chain.question,
          lessonTitle: chain.lessonTitle,
          originalScriptureChain: chain.originalScriptureChain || [],
        },
        sourceQuestions: [{ question: chain.question, lessonTitle: chain.lessonTitle }],
        sourceLessons: [{ lessonTitle: chain.lessonTitle, sourceName: chain.sourceName }],
        sources: [chain.sourceName || 'chain_inventory'],
        packOrigin: 'scripture_chain',
      });
    }
  }

  return { packs: [...byTopic.values()], chains, questions };
}

function categorizeByEra(refs = []) {
  const buckets = {
    genesis: [],
    torah: [],
    formerProphets: [],
    latterProphets: [],
    psalmsWritings: [],
    gospels: [],
    acts: [],
    epistles: [],
    revelation: [],
  };

  const former = /^(joshua|judges|ruth|1 samuel|2 samuel|1 kings|2 kings)$/;
  const latter = /^(isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)$/;
  const writings = /^(job|psalm|psalms|proverbs|ecclesiastes|song of solomon|1 chronicles|2 chronicles|ezra|nehemiah|esther)$/;

  for (const ref of refs) {
    const kjv = verifyKjvReference(ref);
    if (!kjv.valid) continue;
    const book = kjv.book;
    if (book === 'genesis') buckets.genesis.push(ref);
    else if (/^(exodus|leviticus|numbers|deuteronomy)$/.test(book)) buckets.torah.push(ref);
    else if (former.test(book)) buckets.formerProphets.push(ref);
    else if (latter.test(book)) buckets.latterProphets.push(ref);
    else if (writings.test(book)) buckets.psalmsWritings.push(ref);
    else if (/^(matthew|mark|luke|john)$/.test(book)) buckets.gospels.push(ref);
    else if (book === 'acts') buckets.acts.push(ref);
    else if (/^(romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude)$/.test(book)) buckets.epistles.push(ref);
    else if (book === 'revelation') buckets.revelation.push(ref);
    else if (/^john$/.test(book) && /john [12]/.test(ref.toLowerCase())) buckets.epistles.push(ref);
  }

  return buckets;
}

function detectMissingLinks(pack, enrichment) {
  const gaps = [];
  if (pack.scriptureCount < 5) gaps.push('missing_scripture_depth');
  if (pack.parallelScriptureCount < 2) gaps.push('missing_parallel_witnesses');
  if (pack.supportingScriptureCount < 3) gaps.push('missing_supporting_witnesses');
  if (pack.continuityScriptureCount < 2) gaps.push('missing_continuity_witnesses');
  if (!pack.genesisToRevelationSpan && enrichment?.genesisToRevelationSpan !== true) {
    gaps.push('missing_genesis_to_revelation_span');
  }
  if ((pack.questionCount || 0) < 2) gaps.push('missing_question_coverage');
  if ((pack.lessonCount || 0) < 2) gaps.push('missing_lesson_coverage');
  if ((pack.sourceCount || 0) < 2) gaps.push('missing_source_coverage');
  const eras = categorizeByEra(pack.allOriginalScriptures || []);
  if (!eras.genesis.length) gaps.push('missing_genesis_anchor');
  if (!eras.revelation.length) gaps.push('missing_revelation_anchor');
  return gaps;
}

function discoverBibleWideTopics(packs, chains, questions) {
  const existing = new Set(packs.map((p) => p.topic));
  const discovered = [];
  const autoDiscovered = [];

  const texts = [
    ...chains.map((c) => `${c.lessonTitle || ''} ${c.question || ''}`),
    ...questions.map((q) => `${q.lessonTitle || ''} ${q.question || ''}`),
    ...packs.map((p) => p.displayName || p.topic),
  ];

  for (const entry of BIBLE_WIDE_TOPIC_CATALOG) {
    const matches = texts.filter((t) => entry.pattern.test(t));
    const matchingChains = chains.filter((c) =>
      entry.pattern.test(`${c.lessonTitle || ''} ${c.question || ''}`),
    );
    const scriptures = uniqueRefs(matchingChains.flatMap((c) => c.originalScriptureChain || []));
    const status = existing.has(entry.topic)
      ? (packs.find((p) => p.topic === entry.topic)?.supportScore >= 70 ? 'found' : 'weak')
      : scriptures.length >= 3 ? 'emerging' : 'missing';

    discovered.push({
      topic: entry.topic,
      displayName: displayName(entry.topic),
      category: entry.category,
      status,
      matchingChainCount: matchingChains.length,
      scriptureRefsFound: scriptures.length,
      inCorpus: existing.has(entry.topic),
      sampleScriptures: scriptures.slice(0, 8),
    });
  }

  for (const text of texts) {
    const token = discoverTopicFromText(text, {});
    if (token.topic && token.topic !== 'unclassified' && !existing.has(token.topic)) {
      const key = token.topic;
      if (!autoDiscovered.find((a) => a.topic === key)) {
        autoDiscovered.push({
          topic: key,
          displayName: displayName(key),
          status: 'auto_discovered',
          sourceText: text.slice(0, 80),
        });
      }
    }
  }

  return {
    catalogTopics: discovered,
    autoDiscoveredTopics: autoDiscovered.slice(0, 40),
    foundTopics: discovered.filter((d) => d.status === 'found'),
    weakTopics: discovered.filter((d) => d.status === 'weak'),
    missingTopics: discovered.filter((d) => d.status === 'missing' || d.status === 'emerging'),
  };
}

function buildImplementationQueues(maturedPacks) {
  const bucket = (min, max) => maturedPacks
    .filter((p) => p.supportScore >= min && p.supportScore <= max)
    .map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      supportScore: p.supportScore,
      strengthTier: p.strengthTier,
      implementationConfidence: p.implementationConfidence,
      learningGainScore: p.learningGainScore,
      scriptureCount: p.scriptureCount,
      implementationReady: p.implementationReady,
    }));

  return {
    queue95: bucket(95, 100),
    queue90: bucket(90, 94),
    queue80: bucket(80, 89),
    queue70: bucket(70, 79),
    queueBelow70: maturedPacks.filter((p) => p.supportScore < 70).map((p) => ({
      topic: p.topic,
      supportScore: p.supportScore,
    })),
  };
}

function runPhase3jDoctrinePackMaturation({ maxDepth = 3 } = {}) {
  const corpus = loadFullDoctrinePackCorpus();
  const packs = corpus.packs;

  const bibleWide = discoverBibleWideTopics(packs, corpus.chains, corpus.questions);

  const maturationResults = [];
  const maturedPacks = [];

  for (const pack of packs) {
    const priorScriptureCount = pack.scriptureCount || 0;
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
      + expansion.enrichment.continuityAdded * 3;

    const matured = {
      ...enriched,
      supportScore: scoring.supportScore,
      strengthTier: scoring.strengthTier,
      priorSupportScore: scoring.priorSupportScore,
      scoreDelta: scoring.scoreDelta,
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
      implementationReady: scoring.supportScore >= 90 && enriched.scriptureCount >= 8,
      packOrigin: pack.packOrigin,
    };

    maturationResults.push({
      topic: pack.topic,
      displayName: pack.displayName,
      expansion,
      matured,
    });
    maturedPacks.push(matured);
  }

  maturedPacks.sort((a, b) => b.learningGainScore - a.learningGainScore);

  const totals = {
    newParallel: maturationResults.reduce((s, m) => s + m.expansion.newParallelScriptures.length, 0),
    newSupporting: maturationResults.reduce((s, m) => s + m.expansion.newSupportingScriptures.length, 0),
    newContinuity: maturationResults.reduce((s, m) => s + m.expansion.newContinuityScriptures.length, 0),
    newScriptures: maturationResults.reduce((s, m) => s + m.expansion.expandedRefs.length, 0),
  };

  const queues = buildImplementationQueues(maturedPacks);

  const executive = {
    doctrinePackCount: maturedPacks.length,
    packsExpanded: maturationResults.length,
    packsGainedMostDepth: [...maturedPacks]
      .sort((a, b) => (b.enrichment?.scriptureCountAfter - b.enrichment?.scriptureCountBefore)
        - (a.enrichment?.scriptureCountAfter - a.enrichment?.scriptureCountBefore))
      .slice(0, 12)
      .map((p) => ({
        topic: p.topic,
        displayName: p.displayName,
        scripturesAdded: p.enrichment.scriptureCountAfter - p.enrichment.scriptureCountBefore,
        supportScore: p.supportScore,
      })),
    strongestPacks: [...maturedPacks].sort((a, b) => b.supportScore - a.supportScore).slice(0, 12)
      .map((p) => ({ topic: p.topic, displayName: p.displayName, supportScore: p.supportScore })),
    weakPacks: maturedPacks.filter((p) => p.supportScore < 70 || p.missingLinks.length > 3)
      .slice(0, 20)
      .map((p) => ({ topic: p.topic, supportScore: p.supportScore, missingLinks: p.missingLinks })),
    missingPackTopics: bibleWide.missingTopics.map((t) => t.topic),
    weakPackTopics: bibleWide.weakTopics.map((t) => t.topic),
    implementationReady: maturedPacks.filter((p) => p.implementationReady).map((p) => p.topic),
    implementationReadyCount: maturedPacks.filter((p) => p.implementationReady).length,
    reviewFirst: maturedPacks
      .filter((p) => p.supportScore >= 80 || p.learningGainScore >= 400)
      .slice(0, 15)
      .map((p) => ({
        topic: p.topic,
        displayName: p.displayName,
        supportScore: p.supportScore,
        learningGainScore: p.learningGainScore,
        implementationConfidence: p.implementationConfidence,
      })),
    implementFirstAfterReview: maturedPacks
      .filter((p) => p.implementationReady || p.implementationConfidence === 'High')
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        topic: p.topic,
        displayName: p.displayName,
        supportScore: p.supportScore,
        learningGainScore: p.learningGainScore,
      })),
    projectedLearningGain: maturedPacks.reduce((s, p) => s + p.learningGainScore, 0),
    bibleWideDiscovery: {
      catalogTopics: bibleWide.catalogTopics.length,
      found: bibleWide.foundTopics.length,
      weak: bibleWide.weakTopics.length,
      missing: bibleWide.missingTopics.length,
      autoDiscovered: bibleWide.autoDiscoveredTopics.length,
    },
    expansionTotals: totals,
  };

  const humanReviewPackets = maturedPacks.map((p) => ({
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
    implementationImpact: p.learningGainScore,
    implementationConfidence: p.implementationConfidence,
    newScripturesAdded: p.newScripturesAdded,
    newChainsAdded: p.chainCount,
    missingLinks: p.missingLinks,
    implementationReady: p.implementationReady,
    reviewNotes: [
      p.implementationReady ? 'Implementation-ready after human review' : 'Needs review before implementation prep',
      p.missingLinks.length ? `Gaps: ${p.missingLinks.join(', ')}` : 'No critical missing-link flags',
    ],
  }));

  const payload = {
    phase: '3J-rev2',
    ranAt: new Date().toISOString(),
    maturationResults,
    maturedPacks,
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
    path.join(TRACE, 'phase3j-doctrine-pack-maturation-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'matured-doctrine-packs.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, packs: maturedPacks, executive }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'bible-authority-implementation-queues.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, queues, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3jDoctrinePackMaturation,
  loadFullDoctrinePackCorpus,
  discoverBibleWideTopics,
  categorizeByEra,
  detectMissingLinks,
};
