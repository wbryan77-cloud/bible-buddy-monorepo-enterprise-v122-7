/**
 * Phase 3L — Recovered pack strengthening and precept chain organization.
 * Organizes flat scripture collections into structured Bible authority chains.
 * No production, doctrine, card, graph, or approval mutations.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { TOPIC_PATTERNS } = require('./bibleWideTopicDiscovery');
const { lookupByTopic, getSeedConcordanceIndex } = require('./concordanceFoundation');
const { getRegistryChain, getRegistryTopic } = require('./genesisToRevelationContinuityRegistry');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { expandScriptureParallels } = require('./scriptureParallelExpansion');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { strengthTierForScore } = require('./scriptureStrengthReview');
const {
  uniqueRefs,
  refKey,
  buildStrongestG2RChain,
} = require('./phase3iRecursiveExpansion');
const {
  loadFullDoctrinePackCorpus,
  categorizeByEra,
  detectMissingLinks,
} = require('./phase3jDoctrinePackMaturation');
const {
  JESUS_OT_NT_SEEDS,
  HOLY_SPIRIT_SEEDS,
} = require('./phase3kMissingPackRecovery');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const KJV_BOOK_ORDER = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
  '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra',
  'nehemiah', 'esther', 'job', 'psalm', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon',
  'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah',
  'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
  'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1 corinthians', '2 corinthians',
  'galatians', 'ephesians', 'philippians', 'colossians', '1 thessalonians', '2 thessalonians',
  '1 timothy', '2 timothy', 'titus', 'philemon', 'hebrews', 'james', '1 peter', '2 peter',
  '1 john', '2 john', '3 john', 'jude', 'revelation',
];

const PACK_TO_REGISTRY = {
  sabbath: 'sabbath',
  dietary_law: 'dietary_law',
  death_state: 'death_resurrection',
  resurrection: 'resurrection',
  messiah_logos: 'messiah',
  jesus_old_testament_new_testament: 'messiah',
  kingdom_of_god: 'kingdom',
  kingdom: 'kingdom',
  feasts: 'feast_days',
  passover: 'feast_days',
  pentecost: 'feast_days',
  leviticus_23: 'feast_days',
  high_sabbaths: 'feast_days',
  heavens: 'heaven_heavens',
  holiness: 'holiness',
  daniel: 'daniel',
  revelation: 'revelation',
  mark_of_the_beast: 'revelation',
  two_witnesses: 'revelation',
  abomination_of_desolation: 'daniel',
  new_jerusalem: 'kingdom',
  gog_and_magog: 'revelation',
  lake_of_fire: 'revelation',
  baptism: 'baptism',
  covenant: 'covenant',
  covenants: 'covenant',
  melchizedek: 'messiah',
  holy_spirit: 'messiah',
};

const FEAST_SABBATH_TOPICS = new Set([
  'sabbath', 'feasts', 'passover', 'unleavened_bread', 'pentecost', 'feast_of_trumpets',
  'day_of_atonement', 'feast_of_tabernacles', 'last_great_day', 'high_sabbaths',
  'leviticus_23', 'three_pilgrimage_feasts',
]);

const DIETARY_TOPICS = new Set(['dietary_law', 'clean_unclean']);

const GENERIC_BLEED_REFS = [
  'genesis 2:2-3', 'exodus 20:8-11', 'exodus 31:13', 'isaiah 58:13-14', 'luke 4:16',
  'acts 17:2', 'hebrews 4:9', 'revelation 14:12', 'leviticus 11', 'deuteronomy 14',
  'acts 10:28', 'isaiah 66:17', 'daniel 1:8',
];

const HIGH_PRIORITY_TOPICS = [
  'jesus_old_testament_new_testament', 'holy_spirit', 'passover', 'unleavened_bread',
  'pentecost', 'feast_of_trumpets', 'day_of_atonement', 'feast_of_tabernacles', 'last_great_day',
  'high_sabbaths', 'leviticus_23', 'new_jerusalem', 'abomination_of_desolation', 'gog_and_magog',
  'melchizedek', 'temple', 'moses', 'elijah', 'david', 'daniel', 'deuteronomy_28_curses',
  'captivity', 'women_in_bible', 'the_church', 'israel', 'gentiles', 'ham', 'edom',
];

const ERA_KEYS = [
  'genesis', 'torah', 'formerProphets', 'latterProphets', 'psalmsWritings',
  'gospels', 'acts', 'epistles', 'revelation',
];

const JESUS_SUBCHAINS = [
  { key: 'word_of_god', label: 'Word of God', pattern: /\b(word of god|logos)\b/i, seeds: ['John 1:1-14', 'Hebrews 1:1-3', '1 Peter 1:23-25'] },
  { key: 'angel_of_lord', label: 'Angel of the LORD', pattern: /\bangel of the lord\b/i, seeds: ['Exodus 3:2', 'Exodus 23:20-21', 'Judges 6:12', 'Acts 7:30-32'] },
  { key: 'i_am', label: 'I AM', pattern: /\bi am\b/i, seeds: ['Exodus 3:14', 'John 8:58', 'Isaiah 43:10-11'] },
  { key: 'rock_wilderness', label: 'Rock in the Wilderness', pattern: /\brock\b/i, seeds: ['Deuteronomy 32:4', '1 Corinthians 10:4', 'Psalm 18:2'] },
  { key: 'captain_host', label: 'Captain of the Host', pattern: /\bcaptain of the host\b/i, seeds: ['Joshua 5:14'] },
  { key: 'alpha_omega', label: 'Alpha and Omega', pattern: /\balpha and omega\b/i, seeds: ['Revelation 1:8', 'Revelation 22:13'] },
  { key: 'first_last', label: 'First and Last', pattern: /\bfirst and last\b/i, seeds: ['Isaiah 44:6', 'Isaiah 48:12', 'Revelation 1:17-18'] },
  { key: 'father_unseen', label: 'Father unseen passages', pattern: /\b(no man hath seen|father.*unseen|seen the father)\b/i, seeds: ['John 5:37', 'John 14:9', 'Exodus 33:20'] },
  { key: 'john_1', label: 'John 1', pattern: /\bjohn 1\b/i, seeds: ['John 1:1-14'] },
  { key: 'hebrews_1', label: 'Hebrews 1', pattern: /\bhebrews 1\b/i, seeds: ['Hebrews 1:1-3', 'Hebrews 1:8-9'] },
  { key: 'colossians_1', label: 'Colossians 1', pattern: /\bcolossians 1\b/i, seeds: ['Colossians 1:15-17'] },
  { key: 'revelation_links', label: 'Revelation 1 / 19 / 22', pattern: /\brevelation (1|19|22)\b/i, seeds: ['Revelation 1:8', 'Revelation 1:17-18', 'Revelation 19:11-16', 'Revelation 22:13'] },
];

const HOLY_SPIRIT_SUBCHAINS = [
  { key: 'spirit_of_god', label: 'Spirit of God', pattern: /\bspirit of god\b/i, seeds: ['Genesis 1:2', 'Matthew 3:16'] },
  { key: 'spirit_of_christ', label: 'Spirit of Christ', pattern: /\bspirit of christ\b/i, seeds: ['Romans 8:9', '1 Peter 1:11'] },
  { key: 'holy_ghost', label: 'Holy Ghost', pattern: /\bholy ghost\b/i, seeds: ['Acts 2:1-4', 'Luke 11:13'] },
  { key: 'comforter', label: 'Comforter', pattern: /\bcomforter\b/i, seeds: ['John 14:16-17', 'John 14:26'] },
  { key: 'power_of_god', label: 'Power of God', pattern: /\bpower of god\b/i, seeds: ['Acts 1:8', 'Romans 15:13'] },
  { key: 'word_spirit_life', label: 'Word as Spirit / Life', pattern: /\b(word.*spirit|spirit.*word|spirit is life)\b/i, seeds: ['John 6:63', '2 Corinthians 3:6'] },
  { key: 'messenger_word', label: 'Messenger delivery of Word', pattern: /\b(messenger|sent.*word)\b/i, seeds: ['Hebrews 1:7', 'Malachi 3:1'] },
  { key: 'breath_spirit_life', label: 'Breath / spirit / life', pattern: /\b(breath|spirit.*life)\b/i, seeds: ['Genesis 2:7', 'Ezekiel 37:9-10', 'Job 33:4'] },
  { key: 'joel_acts', label: 'Joel 2 / Acts 2', pattern: /\b(joel 2|acts 2)\b/i, seeds: ['Joel 2:28-29', 'Acts 2:1-4'] },
  { key: 'romans_8', label: 'Romans 8', pattern: /\bromans 8\b/i, seeds: ['Romans 8:9', 'Romans 8:14', 'Romans 8:26-27'] },
];

const FEAST_SUBCHAINS = [
  { key: 'leviticus_23', label: 'Leviticus 23', pattern: /\bleviticus 23\b/i, seeds: ['Leviticus 23'] },
  { key: 'passover', label: 'Passover', pattern: /\bpassover\b/i, seeds: ['Exodus 12', 'Leviticus 23:5', '1 Corinthians 5:7-8'] },
  { key: 'unleavened_bread', label: 'Unleavened Bread', pattern: /\bunleavened bread\b/i, seeds: ['Exodus 12:15-20', 'Leviticus 23:6'] },
  { key: 'pentecost', label: 'Pentecost', pattern: /\bpentecost\b/i, seeds: ['Leviticus 23:15-16', 'Acts 2:1-4'] },
  { key: 'trumpets', label: 'Trumpets', pattern: /\b(feast of trumpets|day of trumpets)\b/i, seeds: ['Leviticus 23:24'] },
  { key: 'atonement', label: 'Atonement', pattern: /\bday of atonement\b/i, seeds: ['Leviticus 16', 'Leviticus 23:27-32'] },
  { key: 'tabernacles', label: 'Tabernacles', pattern: /\b(feast of tabernacles|tabernacles)\b/i, seeds: ['Leviticus 23:34', 'Zechariah 14:16-19'] },
  { key: 'last_great_day', label: 'Last Great Day / Eighth Day', pattern: /\b(last great day|eighth day)\b/i, seeds: ['Leviticus 23:36', 'John 7:37-38'] },
  { key: 'pilgrimage_feasts', label: 'Three pilgrimage feasts', pattern: /\b(pilgrimage feast|three feast)\b/i, seeds: ['Exodus 23:14-17', 'Deuteronomy 16:16'] },
  { key: 'jesus_apostles_feasts', label: 'Jesus / apostles keeping feasts', pattern: /\b(luke 22|acts 2|passover.*christ)\b/i, seeds: ['Luke 22:14-20', 'Acts 2:1-4', 'John 2:13'] },
  { key: 'prophetic_feasts', label: 'Prophetic meaning of feasts', pattern: /\b(prophecy.*feast|feast.*prophecy)\b/i, seeds: ['1 Corinthians 5:7-8', 'Zechariah 14:16-19'] },
];

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function bookOrderIndex(ref = '') {
  const kjv = verifyKjvReference(ref);
  if (!kjv.valid || !kjv.book) return 999;
  const idx = KJV_BOOK_ORDER.indexOf(kjv.book);
  return idx >= 0 ? idx : 999;
}

function sortByBibleOrder(refs = []) {
  return [...refs].sort((a, b) => bookOrderIndex(a) - bookOrderIndex(b));
}

function registryKeyForPack(topic = '') {
  return PACK_TO_REGISTRY[topic] || topic;
}

function topicPattern(topic = '') {
  const pat = TOPIC_PATTERNS.find((p) => p.topic === topic);
  if (pat) return pat.pattern;
  const label = topic.replace(/_/g, ' ');
  return new RegExp(`\\b${label.replace(/\s+/g, '|')}\\b`, 'i');
}

function isBleedRef(ref, topic) {
  if (FEAST_SABBATH_TOPICS.has(topic)) return false;
  if (DIETARY_TOPICS.has(topic)) return false;
  const k = refKey(ref);
  return GENERIC_BLEED_REFS.some((b) => k.startsWith(b) || k === b);
}

function loadAllInputs() {
  const recovered = loadJson(path.join(OUT_DIR, 'recovered-doctrine-packs.json'), { packs: [] });
  const phase3k = loadJson(path.join(TRACE, 'phase3k-missing-pack-recovery-results.json'), {});
  const matured = loadJson(path.join(OUT_DIR, 'matured-doctrine-packs.json'), { packs: [] });
  const enriched = loadJson(path.join(OUT_DIR, 'enriched-topic-packs.json'), { packs: [] });
  const master = loadJson(path.join(OUT_DIR, 'master-topic-packs.json'), { packs: [] });
  const corpus = loadFullDoctrinePackCorpus();
  const cards = getAllApprovedCards();
  const edges = getAllApprovedSupportEdges();

  return {
    recoveredPacks: recovered.packs || [],
    recoveredAt: recovered.ranAt,
    phase3k,
    maturedPacks: matured.packs || [],
    enrichedPacks: enriched.packs || [],
    masterPacks: master.packs || [],
    corpus,
    cards,
    edges,
    chains: corpus.chains || [],
    questions: corpus.questions || [],
  };
}

function collectSourceOriginalChain(topic, inputs) {
  const pattern = topicPattern(topic);
  const matchingChains = inputs.chains.filter((c) =>
    c.topic === topic || pattern.test(`${c.lessonTitle || ''} ${c.question || ''}`),
  );
  const cards = inputs.cards.filter((c) => c.topic === topic);
  const edges = inputs.edges.filter((e) => e.topic === topic);

  const refs = uniqueRefs([
    ...matchingChains.flatMap((c) => c.originalScriptureChain || []),
    ...cards.flatMap((c) => [...(c.primaryScriptures || []), ...(c.supportingScriptures || [])]),
    ...edges.flatMap((e) => e.scriptures || []),
    ...lookupByTopic(topic).flatMap((e) => e.occurrences || []),
  ]);

  const longestChain = matchingChains.sort(
    (a, b) => (b.originalScriptureChain || []).length - (a.originalScriptureChain || []).length,
  )[0];

  return {
    refs: sortByBibleOrder(filterBleedRefs(refs, topic)),
    chainCount: matchingChains.length,
    lessonTitle: longestChain?.lessonTitle || null,
    question: longestChain?.question || `What does Scripture teach about ${topic.replace(/_/g, ' ')}?`,
    sourceNames: [
      ...new Set([
        ...matchingChains.map((c) => c.sourceName),
        ...cards.map(() => 'evidence_card'),
        ...edges.map(() => 'support_graph'),
      ].filter(Boolean)),
    ],
  };
}

function filterBleedRefs(refs, topic) {
  return refs.filter((r) => !isBleedRef(r, topic));
}

function wasFlatList(pack) {
  const all = uniqueRefs(pack.allOriginalScriptures || []);
  const parallel = (pack.allParallelScriptures || []).length;
  const supporting = (pack.allSupportingScriptures || []).length;
  const continuity = (pack.allContinuityScriptures || []).length;
  const combined = all.length + parallel + supporting + continuity;
  if (combined === 0) return true;
  const overlap = parallel + supporting;
  return overlap === 0 || (all.length > 10 && overlap > 0 && parallel >= all.length * 0.3);
}

function classifyExpandedRefs(topic, originalSet, candidateRefs) {
  const regKey = registryKeyForPack(topic);
  const continuityPool = new Set(uniqueRefs([
    ...getRegistryChain(regKey).map((n) => n.reference),
    ...(loadContinuityChains().chains || [])
      .filter((c) => c.topic === topic || c.topic === regKey)
      .flatMap((c) => (c.nodes || []).map((n) => n.reference)),
  ]).map(refKey));

  const parallelPool = new Set(uniqueRefs([
    ...expandScriptureParallels({ scriptureChain: [...originalSet] }),
  ]).map(refKey));

  const parallel = [];
  const supporting = [];
  const continuity = [];

  for (const r of candidateRefs) {
    const k = refKey(r);
    if (originalSet.has(k)) continue;
    if (continuityPool.has(k)) continuity.push(r);
    else if (parallelPool.has(k)) parallel.push(r);
    else supporting.push(r);
  }

  return {
    parallelScriptures: uniqueRefs(parallel),
    supportingScriptures: uniqueRefs(supporting),
    continuityScriptures: uniqueRefs(continuity),
  };
}

function buildGenesisToRevelationChain(topic, original, parallel, supporting, continuity) {
  const pool = uniqueRefs([...original, ...parallel, ...supporting, ...continuity]);
  const seeds = pool.slice(0, 20);
  return buildStrongestG2RChain(seeds, pool);
}

function identifyMissingEras(eraStructure) {
  return ERA_KEYS.filter((k) => !(eraStructure[k]?.length));
}

function fillMissingLinksForPack(topic, organized, missingEras, inputs) {
  const regKey = registryKeyForPack(topic);
  const registry = getRegistryTopic(regKey);
  const filled = { parallel: [], supporting: [], continuity: [] };
  const existing = new Set(uniqueRefs([
    ...organized.originalScriptureChain,
    ...organized.parallelScriptures,
    ...organized.supportingScriptures,
    ...organized.continuityScriptures,
  ]).map(refKey));

  const candidates = uniqueRefs([
    ...getRegistryChain(regKey).map((n) => n.reference),
    ...(registry?.sisThemes || []).flatMap((t) => lookupByTopic(t).flatMap((e) => e.occurrences || [])),
    ...lookupByTopic(topic).flatMap((e) => e.occurrences || []),
    ...(loadContinuityChains().chains || [])
      .filter((c) => c.topic === topic || c.topic === regKey)
      .flatMap((c) => (c.nodes || []).map((n) => n.reference)),
    ...getSeedConcordanceIndex()
      .filter((e) => (e.linkedTopics || []).includes(topic) || (e.doctrinalThemes || []).includes(topic))
      .flatMap((e) => e.occurrences || []),
  ]);

  for (const ref of filterBleedRefs(candidates, topic)) {
    const k = refKey(ref);
    if (existing.has(k)) continue;
    const eras = categorizeByEra([ref]);
    const fillsMissingEra = missingEras.some((era) => eras[era]?.length);
    if (!fillsMissingEra && missingEras.length) continue;

    const classified = classifyExpandedRefs(topic, existing, [ref]);
    if (classified.continuityScriptures.length) {
      filled.continuity.push(ref);
      existing.add(k);
    } else if (classified.parallelScriptures.length) {
      filled.parallel.push(ref);
      existing.add(k);
    } else {
      filled.supporting.push(ref);
      existing.add(k);
    }
  }

  return filled;
}

function buildSubchains(subchainDefs, allRefs, corpusTexts = []) {
  const refSet = new Set(allRefs.map(refKey));
  const subchains = [];

  for (const def of subchainDefs) {
    const matched = uniqueRefs([
      ...def.seeds || [],
      ...allRefs.filter((r) => def.pattern.test(r)),
      ...corpusTexts.filter((t) => def.pattern.test(t)).flatMap(() => []),
    ]).filter((r) => refSet.has(refKey(r)) || def.seeds?.some((s) => refKey(r).startsWith(refKey(s).split(':')[0])));

    const fromSeeds = uniqueRefs([
      ...def.seeds || [],
      ...allRefs.filter((r) => {
        const k = refKey(r);
        return (def.seeds || []).some((s) => k.startsWith(refKey(s).split(':')[0]) || refKey(s).startsWith(k.split(':')[0]));
      }),
    ]);

    subchains.push({
      key: def.key,
      label: def.label,
      scriptures: sortByBibleOrder(fromSeeds.length ? fromSeeds : matched),
      scriptureCount: (fromSeeds.length ? fromSeeds : matched).length,
    });
  }

  return subchains;
}

function scoreChainOrganization(organized) {
  let score = 0;
  if (organized.originalScriptureChain.length >= 3) score += 20;
  if (organized.originalScriptureChain.length >= 8) score += 10;
  if (organized.parallelScriptures.length >= 2) score += 15;
  if (organized.supportingScriptures.length >= 3) score += 15;
  if (organized.continuityScriptures.length >= 1) score += 15;
  if (organized.genesisToRevelationChain.length >= 5) score += 10;
  const hasGenesis = organized.genesisToRevelationChain.some((r) => /^genesis/i.test(r));
  const hasRevelation = organized.genesisToRevelationChain.some((r) => /^revelation/i.test(r));
  if (hasGenesis && hasRevelation) score += 15;
  if (!organized.wasFlatList) score += 10;
  return Math.min(100, score);
}

function scoreG2rCompleteness(eraStructure) {
  const filled = ERA_KEYS.filter((k) => eraStructure[k]?.length).length;
  return Math.round((filled / ERA_KEYS.length) * 100);
}

function computeReviewReadinessScores(organized, eraStructure, priorPack, missingLinks) {
  const scriptureDepth = Math.min(100, Math.round(
    organized.originalScriptureChain.length * 6
    + organized.parallelScriptures.length * 2
    + organized.supportingScriptures.length * 1.5
    + organized.continuityScriptures.length * 3,
  ));

  const chainOrganizationScore = scoreChainOrganization(organized);
  const g2rCompleteness = scoreG2rCompleteness(eraStructure);
  const reviewReadiness = Math.min(100, Math.round(
    scriptureDepth * 0.35
    + chainOrganizationScore * 0.30
    + g2rCompleteness * 0.25
    + (organized.missingLinkFillCount > 0 ? 5 : 0)
    + (missingLinks.length <= 2 ? 5 : 0),
  ));

  const priorScore = priorPack?.supportScore || 50;
  const supportScore = Math.min(100, Math.round(priorScore * 0.35 + reviewReadiness * 0.65));

  let implementationPreparationStatus = 'weak';
  if (reviewReadiness >= 75 && organized.originalScriptureChain.length >= 5) {
    implementationPreparationStatus = 'review_ready';
  } else if (reviewReadiness >= 55) {
    implementationPreparationStatus = 'moderate';
  }

  return {
    supportScore,
    strengthTier: strengthTierForScore(supportScore),
    scriptureDepth,
    chainOrganizationScore,
    g2rCompleteness,
    reviewReadiness,
    implementationPreparationStatus,
    priorSupportScore: priorScore,
    scoreDelta: supportScore - priorScore,
  };
}

function organizeRecoveredPack(pack, inputs) {
  const topic = pack.topic;
  const source = collectSourceOriginalChain(topic, inputs);
  const wasFlat = wasFlatList(pack);

  let originalChain = source.refs.length
    ? source.refs
    : sortByBibleOrder(filterBleedRefs(
      uniqueRefs(pack.originalChain || pack.strongestChain?.originalScriptureChain || []),
      topic,
    ));

  if (!originalChain.length) {
    originalChain = sortByBibleOrder(filterBleedRefs(pack.allOriginalScriptures || [], topic)).slice(0, 15);
  }

  const originalSet = new Set(originalChain.map(refKey));
  const expandedPool = filterBleedRefs(uniqueRefs([
    ...(pack.allOriginalScriptures || []),
    ...(pack.allParallelScriptures || []),
    ...(pack.allSupportingScriptures || []),
    ...(pack.allContinuityScriptures || []),
    ...(pack.genesisToRevelationChain || []),
  ]), topic);

  const candidates = expandedPool.filter((r) => !originalSet.has(refKey(r)));
  const classified = classifyExpandedRefs(topic, originalSet, candidates);

  let parallelScriptures = classified.parallelScriptures;
  let supportingScriptures = classified.supportingScriptures;
  let continuityScriptures = classified.continuityScriptures;

  const eraStructure = categorizeByEra(uniqueRefs([
    ...originalChain, ...parallelScriptures, ...supportingScriptures, ...continuityScriptures,
  ]));
  const missingEras = identifyMissingEras(eraStructure);
  const filled = fillMissingLinksForPack(topic, {
    originalScriptureChain: originalChain,
    parallelScriptures,
    supportingScriptures,
    continuityScriptures,
  }, missingEras, inputs);

  parallelScriptures = uniqueRefs([...parallelScriptures, ...filled.parallel]);
  supportingScriptures = uniqueRefs([...supportingScriptures, ...filled.supporting]);
  continuityScriptures = uniqueRefs([...continuityScriptures, ...filled.continuity]);

  const genesisToRevelationChain = buildGenesisToRevelationChain(
    topic, originalChain, parallelScriptures, supportingScriptures, continuityScriptures,
  );

  const finalEraStructure = categorizeByEra(uniqueRefs([
    ...originalChain, ...parallelScriptures, ...supportingScriptures, ...continuityScriptures,
  ]));
  const finalMissingEras = identifyMissingEras(finalEraStructure);
  const strongEras = ERA_KEYS.filter((k) => finalEraStructure[k]?.length);

  const organized = {
    topic,
    displayName: pack.displayName || topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    lessonTitle: source.lessonTitle || pack.sourceLessons?.[0]?.lessonTitle || null,
    originalScriptureChain: originalChain,
    genesisToRevelationChain,
    parallelScriptures,
    supportingScriptures,
    continuityScriptures,
    eraStructure: finalEraStructure,
    strongEras,
    missingEras: finalMissingEras,
    wasFlatList: wasFlat,
    convertedFromFlat: wasFlat && originalChain.length >= 3,
    missingLinkFillCount: filled.parallel.length + filled.supporting.length + filled.continuity.length,
    missingLinkFill: filled,
    sourceChainCount: source.chainCount,
    sourceNames: source.sourceNames,
    question: source.question,
    isHighPriority: HIGH_PRIORITY_TOPICS.includes(topic),
  };

  const missingLinks = detectMissingLinks({
    scriptureCount: originalChain.length,
    parallelScriptureCount: parallelScriptures.length,
    supportingScriptureCount: supportingScriptures.length,
    continuityScriptureCount: continuityScriptures.length,
    questionCount: pack.questionCount || 0,
    lessonCount: pack.lessonCount || 0,
    sourceCount: pack.sourceCount || 0,
    allOriginalScriptures: originalChain,
    genesisToRevelationSpan: genesisToRevelationChain.some((r) => /^genesis/i.test(r))
      && genesisToRevelationChain.some((r) => /^revelation/i.test(r)),
  }, { genesisToRevelationSpan: organized.genesisToRevelationChain.length > 3 });

  const scores = computeReviewReadinessScores(organized, finalEraStructure, pack, missingLinks);

  return {
    ...organized,
    ...scores,
    missingLinksStillRemaining: missingLinks,
    genesisToRevelationSpan: organized.genesisToRevelationChain.some((r) => /^genesis/i.test(r))
      && organized.genesisToRevelationChain.some((r) => /^revelation/i.test(r)),
    g2rCompletenessFull: finalMissingEras.length === 0,
    scriptureCount: uniqueRefs([
      ...originalChain, ...parallelScriptures, ...supportingScriptures, ...continuityScriptures,
    ]).length,
    parallelScriptureCount: parallelScriptures.length,
    supportingScriptureCount: supportingScriptures.length,
    continuityScriptureCount: continuityScriptures.length,
    g2rLinkCount: genesisToRevelationChain.length,
    questionCoverage: pack.questionCount || (pack.sourceQuestions || []).length,
    lessonCoverage: pack.lessonCount || (pack.sourceLessons || []).length,
    sourceCoverage: pack.sourceCount || (pack.sources || []).length,
    implementationImpact: pack.learningGainScore || pack.implementationImpact || 0,
    priorStatus: pack.priorStatus,
  };
}

function buildDeepPack(topic, subchainDefs, organized, inputs) {
  const allRefs = uniqueRefs([
    ...organized.originalScriptureChain,
    ...organized.parallelScriptures,
    ...organized.supportingScriptures,
    ...organized.continuityScriptures,
    ...organized.genesisToRevelationChain,
  ]);
  const corpusTexts = inputs.chains
    .filter((c) => c.topic === topic)
    .map((c) => `${c.lessonTitle} ${c.question}`);

  return {
    topic,
    displayName: organized.displayName,
    supportScore: organized.supportScore,
    reviewReadiness: organized.reviewReadiness,
    priorSupportScore: organized.priorSupportScore,
    scoreDelta: organized.scoreDelta,
    subchains: buildSubchains(subchainDefs, allRefs, corpusTexts),
    originalScriptureChain: organized.originalScriptureChain,
    genesisToRevelationChain: organized.genesisToRevelationChain,
    totalScriptures: allRefs.length,
  };
}

function runPhase3lRecoveredPackStrengthening() {
  const inputs = loadAllInputs();
  const recoveredPacks = inputs.recoveredPacks;

  if (!recoveredPacks.length) {
    throw new Error('recovered-doctrine-packs.json missing or empty — run Phase 3K first');
  }

  const inputAudit = {
    recoveredPackCount: recoveredPacks.length,
    recoveredAt: inputs.recoveredAt,
    maturedPackCount: inputs.maturedPacks.length,
    enrichedPackCount: inputs.enrichedPacks.length,
    masterPackCount: inputs.masterPacks.length,
    evidenceCardCount: inputs.cards.length,
    supportEdgeCount: inputs.edges.length,
    scriptureChainCount: inputs.chains.length,
    questionCount: inputs.questions.length,
    phase3kTargets: inputs.phase3k?.executive?.targetsProcessed || 0,
  };

  const strengthenedPacks = [];
  const highPriorityReports = [];

  for (const pack of recoveredPacks) {
    const organized = organizeRecoveredPack(pack, inputs);
    strengthenedPacks.push(organized);
    if (organized.isHighPriority) highPriorityReports.push(organized);
  }

  strengthenedPacks.sort((a, b) => b.reviewReadiness - a.reviewReadiness);
  highPriorityReports.sort((a, b) => b.reviewReadiness - a.reviewReadiness);

  const jesusOrganized = strengthenedPacks.find((p) => p.topic === 'jesus_old_testament_new_testament');
  const holySpiritOrganized = strengthenedPacks.find((p) => p.topic === 'holy_spirit');
  const feastTopics = new Set([
    'passover', 'unleavened_bread', 'pentecost', 'feast_of_trumpets', 'day_of_atonement',
    'feast_of_tabernacles', 'last_great_day', 'high_sabbaths', 'leviticus_23', 'three_pilgrimage_feasts',
  ]);
  const feastOrganized = strengthenedPacks.filter((p) => feastTopics.has(p.topic));

  const jesusDeep = jesusOrganized
    ? buildDeepPack('jesus_old_testament_new_testament', JESUS_SUBCHAINS, jesusOrganized, inputs)
    : null;
  const holySpiritDeep = holySpiritOrganized
    ? buildDeepPack('holy_spirit', HOLY_SPIRIT_SUBCHAINS, holySpiritOrganized, inputs)
    : null;
  const feastsDeep = {
    packs: feastOrganized.map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      supportScore: p.supportScore,
    })),
    subchains: buildSubchains(
      FEAST_SUBCHAINS,
      uniqueRefs(feastOrganized.flatMap((p) => [
        ...p.originalScriptureChain,
        ...p.parallelScriptures,
        ...p.supportingScriptures,
        ...p.continuityScriptures,
      ])),
      inputs.chains.map((c) => `${c.lessonTitle} ${c.question}`),
    ),
    feastPackSummaries: feastOrganized,
  };

  const phase3kJesus = recoveredPacks.find((p) => p.topic === 'jesus_old_testament_new_testament');
  const phase3kHoly = recoveredPacks.find((p) => p.topic === 'holy_spirit');
  const phase3kFeastAvg = feastOrganized.length
    ? feastOrganized.reduce((s, p) => {
      const prior = recoveredPacks.find((r) => r.topic === p.topic);
      return s + ((p.supportScore - (prior?.supportScore || 0)));
    }, 0) / feastOrganized.length
    : 0;

  const convertedFlat = strengthenedPacks.filter((p) => p.convertedFromFlat);
  const g2rComplete = strengthenedPacks.filter((p) => p.g2rCompletenessFull);
  const topMissingLinkFill = [...strengthenedPacks]
    .sort((a, b) => b.missingLinkFillCount - a.missingLinkFillCount)
    .slice(0, 15);

  const reviewReady = strengthenedPacks.filter((p) => p.implementationPreparationStatus === 'review_ready');
  const weakRemaining = strengthenedPacks.filter((p) => p.implementationPreparationStatus === 'weak');

  const humanReviewPackets = strengthenedPacks.map((p, idx) => ({
    topic: p.topic,
    lessonTitle: p.lessonTitle,
    supportScore: p.supportScore,
    reviewReadiness: p.reviewReadiness,
    originalScriptureChain: p.originalScriptureChain,
    genesisToRevelationChain: p.genesisToRevelationChain,
    parallelScriptures: p.parallelScriptures,
    supportingScriptures: p.supportingScriptures,
    continuityScriptures: p.continuityScriptures,
    missingLinksStillRemaining: p.missingLinksStillRemaining,
    recommendedReviewOrder: idx + 1,
    implementationPreparationStatus: p.implementationPreparationStatus,
    chainOrganizationScore: p.chainOrganizationScore,
    g2rCompleteness: p.g2rCompleteness,
    scriptureDepth: p.scriptureDepth,
  }));

  const executive = {
    packsReorganized: strengthenedPacks.length,
    flatListsConverted: convertedFlat.length,
    g2rStructureComplete: g2rComplete.length,
    reviewReadyCount: reviewReady.length,
    weakRemainingCount: weakRemaining.length,
    topMissingLinkFill: topMissingLinkFill.map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      fillCount: p.missingLinkFillCount,
      reviewReadiness: p.reviewReadiness,
    })),
    strongestForReview: strengthenedPacks.slice(0, 12).map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      supportScore: p.supportScore,
    })),
    weakPacks: weakRemaining.slice(0, 15).map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      reasons: p.missingLinksStillRemaining,
    })),
    reviewFirst: strengthenedPacks
      .filter((p) => p.reviewReadiness >= 60 || p.isHighPriority)
      .slice(0, 15)
      .map((p) => ({
        topic: p.topic,
        displayName: p.displayName,
        reviewReadiness: p.reviewReadiness,
        supportScore: p.supportScore,
      })),
    implementAfterReview: reviewReady.slice(0, 10).map((p, i) => ({
      rank: i + 1,
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      supportScore: p.supportScore,
    })),
    jesusImprovement: jesusOrganized ? {
      priorSupportScore: phase3kJesus?.supportScore,
      newSupportScore: jesusOrganized.supportScore,
      priorReviewReadiness: null,
      reviewReadiness: jesusOrganized.reviewReadiness,
      scoreDelta: jesusOrganized.scoreDelta,
      originalChainLength: jesusOrganized.originalScriptureChain.length,
      g2rLength: jesusOrganized.genesisToRevelationChain.length,
      subchainCount: jesusDeep?.subchains?.filter((s) => s.scriptureCount > 0).length,
    } : null,
    holySpiritImprovement: holySpiritOrganized ? {
      priorSupportScore: phase3kHoly?.supportScore,
      newSupportScore: holySpiritOrganized.supportScore,
      reviewReadiness: holySpiritOrganized.reviewReadiness,
      scoreDelta: holySpiritOrganized.scoreDelta,
      originalChainLength: holySpiritOrganized.originalScriptureChain.length,
      g2rLength: holySpiritOrganized.genesisToRevelationChain.length,
      subchainCount: holySpiritDeep?.subchains?.filter((s) => s.scriptureCount > 0).length,
    } : null,
    feastsImprovement: {
      packCount: feastOrganized.length,
      avgScoreDelta: Math.round(phase3kFeastAvg),
      avgReviewReadiness: Math.round(
        feastOrganized.reduce((s, p) => s + p.reviewReadiness, 0) / (feastOrganized.length || 1),
      ),
      subchainsPopulated: feastsDeep.subchains.filter((s) => s.scriptureCount > 0).length,
    },
    projectedReviewReadinessGain: strengthenedPacks.reduce((s, p) => s + p.scoreDelta, 0),
  };

  const payload = {
    phase: '3L',
    ranAt: new Date().toISOString(),
    inputAudit,
    strengthenedPacks,
    highPriorityReports,
    jesusDeep,
    holySpiritDeep,
    feastsDeep,
    humanReviewPackets,
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
    path.join(TRACE, 'phase3l-recovered-pack-strengthening-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'strengthened-recovered-packs.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, packs: strengthenedPacks, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3lRecoveredPackStrengthening,
  HIGH_PRIORITY_TOPICS,
  JESUS_SUBCHAINS,
  HOLY_SPIRIT_SUBCHAINS,
  FEAST_SUBCHAINS,
};
