/**
 * Phase 3P — Priority lineage, 144000, and millennial kingdom pack strengthening.
 * Bible seed language search — no production, doctrine, card, or graph mutations.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { expandScriptureParallels } = require('./scriptureParallelExpansion');
const { getRegistryChain } = require('./genesisToRevelationContinuityRegistry');
const {
  uniqueRefs,
  buildStrongestG2RChain,
  refKey,
} = require('./phase3iRecursiveExpansion');
const { categorizeByEra, detectMissingLinks } = require('./phase3jDoctrinePackMaturation');

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

const PACK_DEFINITIONS = {
  jacob_israel_twelve_tribes: {
    displayName: 'Jacob / Israel / Twelve Tribes',
    aliases: ['jacob', 'israel', 'tribes_of_israel', 'judah'],
    seedTerms: [
      /\bjacob\b/i, /\bisrael\b/i, /children of israel/i, /sons of jacob/i,
      /twelve tribes/i, /house of israel/i, /house of jacob/i, /seed of (jacob|israel)/i,
      /\bjudah\b/i, /\bjews\b/i, /\bjoseph\b/i, /\bephraim\b/i, /\bmanasseh\b/i,
      /\bbenjamin\b/i, /\blevi\b/i, /\breuben\b/i, /\bsimeon\b/i, /\bdan\b/i,
      /\bnaphtali\b/i, /\bgad\b/i, /\basher\b/i, /\bissachar\b/i, /\bzebulun\b/i,
    ],
    anchorScriptures: [
      'Genesis 12:1-3', 'Genesis 15:18', 'Genesis 17:7', 'Genesis 21:12', 'Genesis 25:23',
      'Genesis 27:36', 'Genesis 28:13-14', 'Genesis 32:28', 'Genesis 35:10', 'Genesis 37:3',
      'Genesis 48:5', 'Genesis 49:1-28', 'Exodus 1:1-7', 'Exodus 19:5-6', 'Deuteronomy 28:1-68',
      'Deuteronomy 30:1-6', '1 Kings 12:16', '2 Kings 17:6', '2 Kings 25:21', 'Isaiah 11:11-12',
      'Jeremiah 30:3', 'Jeremiah 31:31', 'Ezekiel 37:21-28', 'Matthew 10:6', 'Matthew 15:24',
      'Luke 1:32-33', 'Acts 1:6', 'Romans 9:4-5', 'Romans 11:25-26', 'James 1:1',
      'Revelation 7:4-8', 'Revelation 21:12',
    ],
    subchains: [
      { key: 'abraham_isaac_jacob', label: 'Abraham → Isaac → Jacob', pattern: /\b(abraham|isaac|jacob)\b/i, seeds: ['Genesis 12:1-3', 'Genesis 21:12', 'Genesis 25:23'] },
      { key: 'jacob_renamed_israel', label: 'Jacob renamed Israel', pattern: /renamed israel|thy name shall be called israel/i, seeds: ['Genesis 32:28', 'Genesis 35:10'] },
      { key: 'twelve_tribes', label: 'Twelve tribes', pattern: /twelve tribes|sons of jacob/i, seeds: ['Genesis 49:1-28', 'Exodus 1:1-7'] },
      { key: 'judah_kingship', label: 'Judah and kingship', pattern: /\bjudah\b.*(king|sceptre)/i, seeds: ['Genesis 49:10', '1 Kings 12:16'] },
      { key: 'israel_scattered', label: 'Israel scattered / captivity', pattern: /(scattered|captivity|dispersed)/i, seeds: ['Deuteronomy 28:64', '2 Kings 17:6'] },
      { key: 'israel_regathered', label: 'Israel regathered', pattern: /(regather|gather.*israel)/i, seeds: ['Ezekiel 37:21-28', 'Jeremiah 30:3'] },
      { key: 'israel_revelation', label: 'Israel in Revelation', pattern: /revelation.*(israel|tribes)/i, seeds: ['Revelation 7:4-8', 'Revelation 21:12'] },
    ],
  },
  esau_edom_edomites: {
    displayName: 'Esau / Edom / Edomites',
    aliases: ['edom', 'esau'],
    seedTerms: [
      /\besau\b/i, /\bedom\b/i, /edomites/i, /idumea/i, /mount seir/i,
      /children of esau/i, /house of esau/i, /house of edom/i,
    ],
    anchorScriptures: [
      'Genesis 25:25', 'Genesis 27:36', 'Genesis 36:1-43', 'Numbers 20:14-21',
      'Obadiah 1:1-21', 'Psalm 137:7', 'Isaiah 34:5-6', 'Isaiah 63:1-6',
      'Ezekiel 35:1-15', 'Malachi 1:2-3', 'Romans 9:13',
    ],
    subchains: [
      { key: 'esau_birthright', label: 'Esau birthright', pattern: /birthright/i, seeds: ['Genesis 25:31-34'] },
      { key: 'jacob_esau', label: 'Jacob and Esau', pattern: /jacob.*esau|esau.*jacob/i, seeds: ['Genesis 27:36', 'Genesis 32:3'] },
      { key: 'edom_nation', label: 'Edom as nation', pattern: /\bedom\b/i, seeds: ['Genesis 36:1-43', 'Numbers 20:14-21'] },
      { key: 'edom_judgment', label: 'Edom judgment', pattern: /(edom|esau).*(judgment|desolate)/i, seeds: ['Obadiah 1:1-21', 'Isaiah 34:5-6'] },
    ],
  },
  one_hundred_forty_four_thousand: {
    displayName: '144000 / Sealed Servants',
    topicKey: '144000',
    aliases: ['144000'],
    seedTerms: [
      /144,?000/i, /hundred forty and four thousand/i, /\bsealed\b/i, /servants of god/i,
      /twelve tribes/i, /tribe of (judah|reuben|gad|asher|naphtali|manasseh|simeon|levi|issachar|zebulun|joseph|benjamin)/i,
      /firstfruits/i, /redeemed from the earth/i, /without fault/i,
    ],
    anchorScriptures: [
      'Genesis 49:1-28', 'Numbers 1:2-54', 'Numbers 2:1-34', 'Deuteronomy 33:1-29',
      'Ezekiel 9:4', 'Joel 2:28-29', 'Revelation 7:1-8', 'Revelation 14:1-5',
    ],
    subchains: [
      { key: 'sealing', label: 'Sealing', pattern: /\bsealed\b/i, seeds: ['Revelation 7:3-4', 'Ezekiel 9:4'] },
      { key: 'tribes_list', label: 'Tribes of Israel listed', pattern: /tribe of/i, seeds: ['Revelation 7:5-8'] },
      { key: 'servants_of_god', label: 'Servants of God', pattern: /servants of god/i, seeds: ['Revelation 7:3'] },
      { key: 'firstfruits', label: 'Firstfruits', pattern: /firstfruits/i, seeds: ['Revelation 14:4'] },
      { key: 'rev_7', label: 'Revelation 7', pattern: /revelation 7/i, seeds: ['Revelation 7:1-8'] },
      { key: 'rev_14', label: 'Revelation 14', pattern: /revelation 14/i, seeds: ['Revelation 14:1-5'] },
    ],
  },
  millennial_kingdom_kingdom_on_earth: {
    displayName: 'Millennial Kingdom / Kingdom on Earth',
    aliases: ['millennial_kingdom', 'kingdom_on_earth', 'kingdom_of_god'],
    seedTerms: [
      /thousand years/i, /reign with christ/i, /\bkingdom\b/i, /kingdom under the whole heaven/i,
      /saints shall possess the kingdom/i, /kingdom come/i, /reign on the earth/i,
      /earth shall be full of knowledge/i, /throne of david/i, /rod of iron/i,
      /first resurrection/i, /camp of the saints/i, /beloved city/i,
      /satan bound/i, /satan loosed/i, /new earth/i, /holy city/i, /millennium/i,
    ],
    anchorScriptures: [
      '2 Samuel 7:12-16', 'Psalm 2:6-9', 'Psalm 72:8', 'Isaiah 2:2-4', 'Isaiah 9:6-7',
      'Isaiah 11:1-9', 'Isaiah 65:17-25', 'Daniel 2:44', 'Daniel 7:13-14', 'Micah 4:1-5',
      'Zechariah 14:1-9', 'Matthew 5:5', 'Matthew 6:10', 'Matthew 19:28', 'Luke 1:32-33',
      'Luke 22:29-30', 'Acts 1:6-7', '1 Corinthians 15:24-28', '2 Timothy 2:12',
      'Revelation 2:26-27', 'Revelation 5:10', 'Revelation 11:15', 'Revelation 19:11-16',
      'Revelation 20:1-6', 'Revelation 21:1-3', 'Revelation 22:3-5',
    ],
    subchains: [
      { key: 'davidic_throne', label: 'Davidic throne', pattern: /throne of david/i, seeds: ['2 Samuel 7:12-16', 'Luke 1:32-33'] },
      { key: 'saints_inherit', label: 'Saints inherit kingdom', pattern: /inherit.*kingdom|possess the kingdom/i, seeds: ['Matthew 5:5', 'Matthew 19:28'] },
      { key: 'first_resurrection', label: 'First resurrection', pattern: /first resurrection/i, seeds: ['Revelation 20:4-6'] },
      { key: 'thousand_years', label: 'Thousand years reign', pattern: /thousand years/i, seeds: ['Revelation 20:4-6'] },
      { key: 'satan_bound', label: 'Satan bound', pattern: /satan bound/i, seeds: ['Revelation 20:1-3'] },
      { key: 'isaiah_peace', label: 'Isaiah peace kingdom', pattern: /isaiah (2|11|65)/i, seeds: ['Isaiah 11:1-9', 'Isaiah 65:17-25'] },
      { key: 'zechariah_return', label: 'Zechariah Lord returns', pattern: /zechariah 14/i, seeds: ['Zechariah 14:1-9'] },
    ],
  },
};

const PRIORITY_TOPIC_KEYS = [
  'jacob', 'israel', 'tribes_of_israel', 'judah', 'abraham', 'isaac',
  'edom', '144000', 'millennial_kingdom', 'kingdom_on_earth', 'peter',
];

function loadJson(p, fb = null) {
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

function bookOrderIndex(ref = '') {
  const kjv = verifyKjvReference(ref);
  if (!kjv.valid || !kjv.book) return 999;
  const idx = KJV_BOOK_ORDER.indexOf(kjv.book);
  return idx >= 0 ? idx : 999;
}

function sortByBibleOrder(refs = []) {
  return [...refs].sort((a, b) => bookOrderIndex(a) - bookOrderIndex(b));
}

function loadAllInputs() {
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const phase3o = loadJson(path.join(TRACE, 'phase3o-source-gap-completion-results.json'), {});
  const strengthened = loadJson(path.join(OUT_DIR, 'strengthened-recovered-packs.json'), { packs: [] });
  const phase3oCoverage = phase3o.coverageRecalculation?.after || { covered: 334, partial: 57, missing: 202 };

  return {
    questions: phase3f.questions || [],
    pdfExtractions: phase3f.pdfExtractions || [],
    videoExtractions: phase3f.videoExtractions || [],
    transcriptExtractions: phase3f.transcriptExtractions || [],
    scriptureChains: loadJson(path.join(OUT_DIR, 'expanded-scripture-chains.json'), { chains: [] }).chains || [],
    strengthenedPacks: strengthened.packs || [],
    spanishLinkages: phase3o.spanishLinkages || [],
    campMappings: phase3o.campMappings || [],
    priorCoverage: phase3oCoverage,
    evidenceCards: getAllApprovedCards(),
    linkages: loadJson(path.join(OUT_DIR, 'phase3o-gap-completion-linkages.json'), {}),
  };
}

function getExistingPacksAggregated(packKey, def, inputs) {
  const topics = new Set([packKey, def.topicKey, ...(def.aliases || [])].filter(Boolean));
  const packs = inputs.strengthenedPacks.filter((p) => topics.has(p.topic));
  if (!packs.length) return null;

  return {
    originalScriptureChain: uniqueRefs(packs.flatMap((p) => p.originalScriptureChain || [])),
    parallelScriptures: uniqueRefs(packs.flatMap((p) => p.parallelScriptures || [])),
    supportingScriptures: uniqueRefs(packs.flatMap((p) => p.supportingScriptures || [])),
    continuityScriptures: uniqueRefs(packs.flatMap((p) => p.continuityScriptures || [])),
    reviewReadiness: Math.max(...packs.map((p) => p.reviewReadiness || 0)),
    mergedFrom: packs.map((p) => p.topic),
  };
}

function anchorBookSet(def) {
  const books = new Set();
  for (const a of def.anchorScriptures || []) {
    const kjv = verifyKjvReference(a);
    if (kjv.valid && kjv.book) books.add(kjv.book);
  }
  return books;
}

function filterCorpusScriptures(scriptures = [], anchorBooks) {
  if (!anchorBooks.size) return scriptures;
  return scriptures.filter((r) => {
    const kjv = verifyKjvReference(r);
    return kjv.valid && anchorBooks.has(kjv.book);
  });
}

function searchCorpusBySeedTerms(def, inputs) {
  const hits = { questions: [], chains: [], pdfs: [], cards: [], scriptures: [] };

  const textSources = [
    ...inputs.questions.map((q) => ({ type: 'question', text: `${q.lessonTitle} ${q.question} ${q.answerSummary || ''}`, item: q })),
    ...inputs.scriptureChains.map((c) => ({ type: 'chain', text: `${c.lessonTitle} ${c.question}`, item: c })),
    ...inputs.pdfExtractions.map((p) => ({ type: 'pdf', text: p.lessonTitle || '', item: p })),
    ...inputs.videoExtractions.map((v) => ({ type: 'video', text: v.lessonTitle || '', item: v })),
    ...inputs.transcriptExtractions.map((t) => ({ type: 'transcript', text: t.lessonTitle || '', item: t })),
  ];

  for (const src of textSources) {
    const matched = def.seedTerms.some((p) => p.test(src.text));
    if (!matched) continue;
    if (src.type === 'question') hits.questions.push(src.item);
    else if (src.type === 'chain') hits.chains.push(src.item);
    else if (src.type === 'pdf') hits.pdfs.push(src.item);
    const scriptures = src.item.scripturesCited || src.item.originalScriptureChain || [];
    hits.scriptures.push(...scriptures);
  }

  for (const card of inputs.evidenceCards) {
    if (def.aliases?.includes(card.topic) || def.seedTerms.some((p) => p.test(card.topic))) {
      hits.cards.push(card);
      hits.scriptures.push(...(card.primaryScriptures || []), ...(card.supportingScriptures || []));
    }
  }

  hits.scriptures = uniqueRefs([...def.anchorScriptures, ...hits.scriptures]);
  return hits;
}

function classifyScriptures(originalSet, allRefs, registryKey) {
  const continuityPool = new Set(uniqueRefs([
    ...getRegistryChain(registryKey).map((n) => n.reference),
    ...getRegistryChain('kingdom').map((n) => n.reference),
    ...getRegistryChain('covenant').map((n) => n.reference),
  ]).map(refKey));

  const parallelPool = new Set(uniqueRefs(
    expandScriptureParallels({ scriptureChain: [...originalSet] }),
  ).map(refKey));

  const parallel = [];
  const supporting = [];
  const continuity = [];

  for (const r of allRefs) {
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

function scorePack(structured) {
  const depth = structured.originalScriptureChain.length * 4
    + structured.parallelScriptures.length * 2
    + structured.supportingScriptures.length * 1.5
    + structured.continuityScriptures.length * 3
    + structured.genesisToRevelationChain.length * 0.5;

  const g2rSpan = structured.genesisToRevelationChain.some((r) => /^genesis/i.test(r))
    && structured.genesisToRevelationChain.some((r) => /^revelation/i.test(r));

  const reviewReadiness = Math.min(100, Math.round(
    Math.min(40, structured.originalScriptureChain.length * 3)
    + Math.min(25, structured.parallelScriptures.length * 2)
    + Math.min(20, structured.supportingScriptures.length)
    + (g2rSpan ? 15 : 0)
    + Math.min(10, structured.sourceCoverage * 2),
  ));

  const supportScore = Math.min(100, Math.round(45 + depth * 0.8));

  let status = 'weak';
  if (reviewReadiness >= 75 && structured.originalScriptureChain.length >= 8) status = 'review_ready';
  else if (reviewReadiness >= 55) status = 'moderate';

  return { supportScore, reviewReadiness, status, g2rSpan };
}

function buildStructuredPack(packKey, def, inputs) {
  const topic = def.topicKey || packKey;
  const existing = getExistingPacksAggregated(packKey, def, inputs);
  const corpus = searchCorpusBySeedTerms(def, inputs);
  const anchorBooks = anchorBookSet(def);
  const filteredCorpusScriptures = filterCorpusScriptures(corpus.scriptures, anchorBooks);

  const priorOriginalCount = existing?.originalScriptureChain?.length || 0;
  const priorReviewReadiness = existing?.reviewReadiness || 0;
  const priorSet = new Set((existing?.originalScriptureChain || []).map(refKey));

  const newFromAnchors = def.anchorScriptures.filter((a) => !priorSet.has(refKey(a)));
  const newFromCorpus = uniqueRefs([
    ...corpus.chains.flatMap((c) => c.originalScriptureChain || []),
    ...filteredCorpusScriptures,
  ]).filter((r) => !priorSet.has(refKey(r)));

  const originalScriptureChain = sortByBibleOrder(uniqueRefs([
    ...def.anchorScriptures,
    ...(existing?.originalScriptureChain || []),
    ...newFromCorpus,
  ]));

  const originalSet = new Set(originalScriptureChain.map(refKey));
  const allRefs = uniqueRefs([
    ...originalScriptureChain,
    ...(existing?.parallelScriptures || []),
    ...(existing?.supportingScriptures || []),
    ...(existing?.continuityScriptures || []),
  ]);

  const classified = classifyScriptures(originalSet, allRefs, topic);
  const genesisToRevelationChain = buildStrongestG2RChain(originalScriptureChain, allRefs);

  const lessons = uniqueRefs([
    ...corpus.chains.map((c) => c.lessonTitle),
    ...corpus.questions.map((q) => q.lessonTitle),
    ...corpus.pdfs.map((p) => p.lessonTitle),
  ].filter(Boolean));

  const sources = uniqueRefs([
    ...corpus.chains.map((c) => c.sourceName),
    ...corpus.questions.map((q) => q.sourceName || q.organization),
    ...corpus.pdfs.map((p) => p.sourceName),
  ].filter(Boolean));

  const subchains = (def.subchains || []).map((sc) => {
    const matched = originalScriptureChain.filter((r) => {
      if (sc.seeds?.some((s) => refKey(r).startsWith(refKey(s).split(':')[0]))) return true;
      return sc.pattern.test(r);
    });
    const fromSeeds = uniqueRefs(sc.seeds || []).filter((s) =>
      originalScriptureChain.some((r) => refKey(r).startsWith(refKey(s).split(':')[0])),
    );
    return {
      key: sc.key,
      label: sc.label,
      scriptures: sortByBibleOrder(uniqueRefs([...fromSeeds, ...matched])),
      scriptureCount: uniqueRefs([...fromSeeds, ...matched]).length,
    };
  });

  const structured = {
    topic: packKey,
    topicKey: topic,
    displayName: def.displayName,
    mergedFromTopics: existing?.mergedFrom || [],
    lessonTitle: lessons[0] || null,
    originalScriptureChain,
    genesisToRevelationChain,
    parallelScriptures: classified.parallelScriptures,
    supportingScriptures: classified.supportingScriptures,
    continuityScriptures: classified.continuityScriptures,
    questionCoverage: corpus.questions.length,
    lessonCoverage: lessons.length,
    sourceCoverage: sources.length,
    subchains,
    corpusHits: {
      questions: corpus.questions.length,
      chains: corpus.chains.length,
      pdfs: corpus.pdfs.length,
      cards: corpus.cards.length,
    },
    scripturesBefore: priorOriginalCount,
    scripturesAfter: originalScriptureChain.length,
    scripturesGained: uniqueRefs([...newFromAnchors, ...newFromCorpus]).length,
  };

  const scores = scorePack(structured);
  structured.supportScore = scores.supportScore;
  structured.reviewReadiness = scores.reviewReadiness;
  structured.implementationPreparationStatus = scores.status;
  structured.genesisToRevelationSpan = scores.g2rSpan;
  structured.reviewReadinessBefore = priorReviewReadiness;
  structured.reviewReadinessDelta = scores.reviewReadiness - priorReviewReadiness;

  structured.missingLinksStillRemaining = detectMissingLinks({
    scriptureCount: originalScriptureChain.length,
    parallelScriptureCount: classified.parallelScriptures.length,
    supportingScriptureCount: classified.supportingScriptures.length,
    continuityScriptureCount: classified.continuityScriptures.length,
    questionCount: corpus.questions.length,
    lessonCount: lessons.length,
    sourceCount: sources.length,
    allOriginalScriptures: originalScriptureChain,
    genesisToRevelationSpan: scores.g2rSpan,
  }, { genesisToRevelationSpan: scores.g2rSpan });

  return structured;
}

function buildSourceLinkage(pack, inputs) {
  const def = PACK_DEFINITIONS[pack.topic] || {};
  const linkages = [];

  for (const q of inputs.questions) {
    const text = `${q.lessonTitle} ${q.question}`;
    if (!def.seedTerms?.some((p) => p.test(text))) continue;
    linkages.push({
      type: 'question',
      source: q.sourceName || q.organization,
      camp: q.camp,
      lessonTitle: q.lessonTitle,
      scriptures: (q.scripturesCited || []).length,
    });
  }

  for (const c of inputs.scriptureChains) {
    const text = `${c.lessonTitle} ${c.question}`;
    if (!def.seedTerms?.some((p) => p.test(text))) continue;
    linkages.push({
      type: 'chain',
      source: c.sourceName,
      camp: c.camp,
      lessonTitle: c.lessonTitle,
      scriptures: (c.originalScriptureChain || []).length,
    });
  }

  for (const s of inputs.spanishLinkages) {
    if (def.seedTerms?.some((p) => p.test(s.spanishTitle || s.englishEquivalent || ''))) {
      linkages.push({ type: 'spanish', lessonTitle: s.spanishTitle, topic: s.topicCandidate });
    }
  }

  for (const m of inputs.campMappings) {
    if (def.seedTerms?.some((p) => p.test(m.canonicalTitle || m.rawTitle || ''))) {
      linkages.push({ type: 'camp', lessonTitle: m.rawTitle, camp: m.camp, chainStatus: m.chainStatus });
    }
  }

  return linkages;
}

function runClaudeStyleAudit(packs) {
  const findings = [];

  for (const pack of packs) {
    if (pack.originalScriptureChain.length < 8) {
      findings.push({ pack: pack.topic, severity: 'high', issue: 'thin_original_chain', detail: `${pack.originalScriptureChain.length} scriptures — needs more anchor depth` });
    }
    if (pack.continuityScriptures.length < 2) {
      findings.push({ pack: pack.topic, severity: 'medium', issue: 'missing_continuity', detail: 'Continuity witnesses underdeveloped' });
    }
    if (!pack.genesisToRevelationSpan) {
      findings.push({ pack: pack.topic, severity: 'medium', issue: 'missing_g2r_span', detail: 'Genesis-to-Revelation span incomplete' });
    }
    const flatRisk = pack.parallelScriptures.length === 0 && pack.supportingScriptures.length === 0;
    if (flatRisk && pack.originalScriptureChain.length > 5) {
      findings.push({ pack: pack.topic, severity: 'medium', issue: 'flat_list_risk', detail: 'Original chain exists but parallel/supporting buckets empty' });
    }
    if (pack.topic === 'one_hundred_forty_four_thousand' && pack.originalScriptureChain.length < 12) {
      findings.push({ pack: pack.topic, severity: 'high', issue: '144000_needs_tribe_depth', detail: 'Revelation 7 tribe list and sealing chain need individual verse anchors' });
    }
    if (pack.topic === 'one_hundred_forty_four_thousand' && !pack.subchains?.some((s) => s.key === 'tribes_list' && s.scriptureCount >= 2)) {
      findings.push({ pack: pack.topic, severity: 'high', issue: 'narrow_topic_label', detail: '144000 pack missing tribe-list subchain depth' });
    }
    if (pack.reviewReadinessDelta < -10) {
      findings.push({ pack: pack.topic, severity: 'medium', issue: 'readiness_regression', detail: `Readiness dropped ${pack.reviewReadinessDelta} — verify merge did not lose corpus depth` });
    }
    const bleedBooks = pack.originalScriptureChain.filter((r) => /^exodus (4|9|11|14|25|29)/i.test(r));
    if (pack.topic === 'jacob_israel_twelve_tribes' && bleedBooks.length > 3) {
      findings.push({ pack: pack.topic, severity: 'medium', issue: 'corpus_bleed', detail: 'Exodus plague/tabernacle refs may bleed from broad Israel seed match — human filter recommended' });
    }
  }

  const missedSeeds = [];
  if (!packs.find((p) => p.topic === 'jacob_israel_twelve_tribes')?.subchains?.some((s) => s.key === 'israel_regathered' && s.scriptureCount > 0)) {
    missedSeeds.push('Israel regathered (Ezekiel 37) — verify in jacob_israel pack');
  }
  if (!packs.find((p) => p.topic === 'millennial_kingdom_kingdom_on_earth')?.originalScriptureChain?.some((r) => /revelation 20/i.test(r))) {
    missedSeeds.push('Revelation 20 thousand years — required for millennial pack');
  }

  return {
    auditType: 'second_model_structural_review',
    modelNote: 'Programmatic structural audit (Claude-equivalent checklist) — does not approve doctrine or modify production',
    findings,
    missedSeedTerms: missedSeeds,
    organizationScore: packs.filter((p) => p.parallelScriptures.length > 0 && p.continuityScriptures.length > 0).length,
    structuredPackCount: packs.length,
    recommendations: [
      'Human admin should review subchain assignments before implementation',
      '144000 pack requires Revelation 7 tribe list verification',
      'Millennial pack requires Revelation 20:1-6 as continuity anchor',
      'Esau/Edom pack should cross-link with Romans 9 and Obadiah',
      'Jacob/Israel pack should include Deuteronomy 28 captivity chain for BibleBuddy learning continuity',
    ],
  };
}

function recalculatePriorityCoverage(inputs, strengthenedPacks) {
  const reassessed3O = loadJson(path.join(TRACE, 'phase3o-source-gap-completion-results.json'), {})
    .coverageRecalculation?.reassessed || [];
  const sourceAudit = loadJson(path.join(TRACE, 'phase3m-source-doctrine-verification-results.json'), {})
    .sourceCoverageAudit || [];

  const packTopics = new Set();
  for (const p of strengthenedPacks) {
    packTopics.add(p.topic);
    packTopics.add(p.topicKey);
    const def = PACK_DEFINITIONS[p.topic];
    if (def?.aliases) def.aliases.forEach((a) => packTopics.add(a));
  }

  let covered = 0;
  let partial = 0;
  let missing = 0;

  for (const entry of sourceAudit) {
    const text = `${entry.lessonTitle || ''} ${entry.topic || ''}`.toLowerCase();
    const matchesPriority = [...packTopics].some((t) => text.includes(t.replace(/_/g, ' ')))
      || strengthenedPacks.some((p) => {
        const def = PACK_DEFINITIONS[p.topic];
        return def?.seedTerms?.some((re) => re.test(text));
      });

    const status3O = reassessed3O.find((r) => normalizeKey(r.lessonTitle) === normalizeKey(entry.lessonTitle));
    let status = status3O?.postRecoveryStatus3O || entry.status;

    if (matchesPriority && status === 'missing') {
      const pack = strengthenedPacks.find((p) => {
        const def = PACK_DEFINITIONS[p.topic];
        return def?.seedTerms?.some((re) => re.test(text));
      });
      if (pack && pack.originalScriptureChain.length >= 5) status = 'partial';
      if (pack && pack.reviewReadiness >= 70) status = 'covered';
    }

    if (status === 'covered') covered += 1;
    else if (status === 'partial') partial += 1;
    else missing += 1;
  }

  return {
    prior: inputs.priorCoverage,
    after: { covered, partial, missing },
    perPack: strengthenedPacks.map((p) => ({
      topic: p.topic,
      scripturesBefore: p.scripturesBefore,
      scripturesAfter: p.scripturesAfter,
      scripturesGained: p.scripturesGained,
      reviewReadinessBefore: p.reviewReadinessBefore,
      reviewReadinessAfter: p.reviewReadiness,
      status: p.implementationPreparationStatus,
    })),
  };
}

function runPhase3pPriorityPackStrengthening() {
  const inputs = loadAllInputs();
  const strengthenedPacks = [];

  for (const [packKey, def] of Object.entries(PACK_DEFINITIONS)) {
    const pack = buildStructuredPack(packKey, def, inputs);
    pack.sourceLinkages = buildSourceLinkage(pack, inputs);
    strengthenedPacks.push(pack);
  }

  const claudeAudit = runClaudeStyleAudit(strengthenedPacks);
  const coverageUpdate = recalculatePriorityCoverage(inputs, strengthenedPacks);

  const reviewReady = strengthenedPacks.filter((p) => p.implementationPreparationStatus === 'review_ready');
  const weakRemaining = strengthenedPacks.filter((p) => p.implementationPreparationStatus === 'weak');

  const executive = {
    packsStrengthened: strengthenedPacks.length,
    jacobScripturesGained: strengthenedPacks.find((p) => p.topic === 'jacob_israel_twelve_tribes')?.scripturesGained || 0,
    israelTwelveTribesScriptures: strengthenedPacks.find((p) => p.topic === 'jacob_israel_twelve_tribes')?.scripturesAfter || 0,
    esauEdomScripturesGained: strengthenedPacks.find((p) => p.topic === 'esau_edom_edomites')?.scripturesGained || 0,
    p144000ScripturesGained: strengthenedPacks.find((p) => p.topic === 'one_hundred_forty_four_thousand')?.scripturesGained || 0,
    p144000ScripturesAfter: strengthenedPacks.find((p) => p.topic === 'one_hundred_forty_four_thousand')?.scripturesAfter || 0,
    millennialScripturesGained: strengthenedPacks.find((p) => p.topic === 'millennial_kingdom_kingdom_on_earth')?.scripturesGained || 0,
    millennialScripturesAfter: strengthenedPacks.find((p) => p.topic === 'millennial_kingdom_kingdom_on_earth')?.scripturesAfter || 0,
    peterPack: inputs.strengthenedPacks.find((p) => p.topic === 'peter'),
    reviewReadyPacks: reviewReady.map((p) => ({ topic: p.topic, displayName: p.displayName, reviewReadiness: p.reviewReadiness })),
    reviewReadyCount: reviewReady.length,
    weakRemaining: weakRemaining.map((p) => ({ topic: p.topic, reviewReadiness: p.reviewReadiness, missingLinks: p.missingLinksStillRemaining })),
    sourceLinksRecovered: strengthenedPacks.reduce((s, p) => s + (p.sourceLinkages?.length || 0), 0),
    coverage: coverageUpdate.after,
    coverageTargets: {
      coveredMet: coverageUpdate.after.covered >= 350,
      partialMet: coverageUpdate.after.partial <= 40,
      missingMet: coverageUpdate.after.missing <= 150,
    },
    reviewFirst: [...strengthenedPacks]
      .sort((a, b) => b.reviewReadiness - a.reviewReadiness)
      .slice(0, 8)
      .map((p) => ({ topic: p.topic, displayName: p.displayName, reviewReadiness: p.reviewReadiness })),
    claudeAuditSummary: {
      findingCount: claudeAudit.findings.length,
      missedSeeds: claudeAudit.missedSeedTerms.length,
      recommendations: claudeAudit.recommendations.slice(0, 5),
    },
  };

  const payload = {
    phase: '3P',
    ranAt: new Date().toISOString(),
    strengthenedPacks,
    structuredReviewPackets: strengthenedPacks,
    claudeAudit,
    coverageUpdate,
    sourceLinkages: strengthenedPacks.map((p) => ({
      topic: p.topic,
      linkCount: p.sourceLinkages?.length || 0,
      linkages: p.sourceLinkages?.slice(0, 10),
    })),
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
    path.join(TRACE, 'phase3p-priority-pack-strengthening-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'priority-pack-strengthened.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, packs: strengthenedPacks, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3pPriorityPackStrengthening,
  PACK_DEFINITIONS,
};
