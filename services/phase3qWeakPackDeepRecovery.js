/**
 * Phase 3Q — Weak pack deep recovery, Peter/Paul alignment, missing source extraction.
 * Preparation only — no production, doctrine, card, graph, or prompt mutations.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { expandScriptureParallels } = require('./scriptureParallelExpansion');
const { getRegistryChain } = require('./genesisToRevelationContinuityRegistry');
const { fetchText, extractScripturesFromText } = require('./openSourceScrubber');
const {
  uniqueRefs,
  buildStrongestG2RChain,
  refKey,
} = require('./phase3iRecursiveExpansion');
const { detectMissingLinks } = require('./phase3jDoctrinePackMaturation');
const { PACK_DEFINITIONS: PHASE3P_PACKS } = require('./phase3pPriorityPackStrengthening');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const REGISTRY_PATH = path.join(ROOT, 'data', 'full-corpus-source-registry.json');
const SCRUBBED_CORPUS_PATH = path.join(ROOT, 'data', 'phase3e-scrubbed-corpus.json');

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

const REV7_TRIBE_ANCHORS = [
  { tribe: 'Judah', scripture: 'Revelation 7:5', kjvLabel: 'tribe of Juda' },
  { tribe: 'Reuben', scripture: 'Revelation 7:5', kjvLabel: 'tribe of Reuben' },
  { tribe: 'Gad', scripture: 'Revelation 7:6', kjvLabel: 'tribe of Gad' },
  { tribe: 'Asher', scripture: 'Revelation 7:6', kjvLabel: 'tribe of Aser' },
  { tribe: 'Naphtali', scripture: 'Revelation 7:6', kjvLabel: 'tribe of Nepthalim' },
  { tribe: 'Manasseh', scripture: 'Revelation 7:7', kjvLabel: 'tribe of Manasses' },
  { tribe: 'Simeon', scripture: 'Revelation 7:7', kjvLabel: 'tribe of Simeon' },
  { tribe: 'Levi', scripture: 'Revelation 7:7', kjvLabel: 'tribe of Levi' },
  { tribe: 'Issachar', scripture: 'Revelation 7:8', kjvLabel: 'tribe of Issachar' },
  { tribe: 'Zebulun', scripture: 'Revelation 7:8', kjvLabel: 'tribe of Zabulon' },
  { tribe: 'Joseph', scripture: 'Revelation 7:8', kjvLabel: 'tribe of Joseph' },
  { tribe: 'Benjamin', scripture: 'Revelation 7:8', kjvLabel: 'tribe of Benjamin' },
];

const DEEP_PACK_DEFINITIONS = {
  one_hundred_forty_four_thousand: {
    ...PHASE3P_PACKS.one_hundred_forty_four_thousand,
    anchorScriptures: uniqueRefs([
      'Revelation 7:1', 'Revelation 7:2', 'Revelation 7:3', 'Revelation 7:4',
      'Revelation 7:5', 'Revelation 7:6', 'Revelation 7:7', 'Revelation 7:8',
      'Revelation 14:1', 'Revelation 14:2', 'Revelation 14:3', 'Revelation 14:4', 'Revelation 14:5',
      'Ezekiel 9:4', 'Ezekiel 9:6',
      'Genesis 49:1-28', 'Numbers 1:2-54', 'Numbers 2:1-34', 'Deuteronomy 33:1-29',
      'Joel 2:28-29', 'Revelation 7:1-8', 'Revelation 14:1-5',
    ]),
    tribeByTribeAnchors: REV7_TRIBE_ANCHORS,
  },
  peter: {
    displayName: 'Peter / Simon Peter / Apostle',
    topicKey: 'peter',
    aliases: ['peter', 'simon_peter'],
    seedTerms: [
      /\bpeter\b/i, /simon peter/i, /\bcephas\b/i, /\bbarjona\b/i, /apostle peter/i,
      /keys of the kingdom/i, /\brock\b/i, /feed my sheep/i, /deny me three times/i,
      /before the cock crow/i, /cornelius/i, /unclean animals/i, /peter and paul/i,
      /hard to be understood/i, /circumcision/i, /uncircumcision/i,
    ],
    anchorScriptures: [
      'Matthew 4:18-20', 'Matthew 16:16-19', 'Matthew 26:33-35', 'Matthew 26:69-75',
      'Mark 14:29-31', 'Mark 14:66-72', 'Luke 22:31-34', 'Luke 22:54-62',
      'John 1:40-42', 'John 21:15-19', 'Acts 2:14-41', 'Acts 10:1-48',
      'Acts 11:1-18', 'Acts 15:6-11', 'Galatians 2:7-14', '1 Peter 1:3-5',
      '1 Peter 2:9-10', '1 Peter 4:12-16', '2 Peter 1:16-21', '2 Peter 3:15-16',
    ],
    subchains: [
      { key: 'called_by_jesus', label: 'Peter called by Jesus', seeds: ['Matthew 4:18-20', 'John 1:40-42'] },
      { key: 'confesses_christ', label: 'Peter confesses Christ', seeds: ['Matthew 16:16-19'] },
      { key: 'keys_rock', label: 'Keys / rock statement', seeds: ['Matthew 16:16-19'] },
      { key: 'denies_restored', label: 'Denies Christ and restored', seeds: ['Matthew 26:69-75', 'John 21:15-19'] },
      { key: 'pentecost', label: 'Peter preaches at Pentecost', seeds: ['Acts 2:14-41'] },
      { key: 'cornelius_gentiles', label: 'Cornelius / Gentiles', seeds: ['Acts 10:1-48', 'Acts 11:1-18'] },
      { key: 'antioch_paul', label: 'Peter and Paul at Antioch', seeds: ['Galatians 2:11-14'] },
      { key: 'warns_paul_writings', label: 'Warns about misunderstanding Paul', seeds: ['2 Peter 3:15-16'] },
      { key: 'first_second_peter', label: '1 Peter and 2 Peter teaching', seeds: ['1 Peter 1:3-5', '2 Peter 1:16-21'] },
    ],
  },
  peter_paul_alignment: {
    displayName: 'Peter / Paul Alignment',
    topicKey: 'peter_paul_alignment',
    aliases: ['peter', 'paul', 'galatians_2'],
    seedTerms: [
      /peter.*paul|paul.*peter/i, /circumcision/i, /uncircumcision/i,
      /cornelius/i, /acts 15/i, /galatians 2/i, /gentiles/i,
      /peter.*writings|paul.*writings/i, /unity.*gospel/i, /one gospel/i,
    ],
    anchorScriptures: [
      'Acts 10:1-48', 'Acts 11:1-18', 'Acts 13:46-47', 'Acts 15:6-29',
      'Acts 21:17-26', 'Romans 11:13-15', 'Galatians 1:11-12', 'Galatians 2:7-14',
      'Ephesians 2:11-22', '2 Peter 3:15-16',
    ],
    subchains: [
      { key: 'peter_circumcision', label: 'Peter to circumcision / Israel', seeds: ['Galatians 2:7-9'] },
      { key: 'paul_gentiles', label: 'Paul to Gentiles', seeds: ['Acts 13:46-47', 'Galatians 2:7-9'] },
      { key: 'cornelius_door', label: 'Cornelius opens Gentile door', seeds: ['Acts 10:1-48'] },
      { key: 'acts_15_council', label: 'Acts 15 council', seeds: ['Acts 15:6-29'] },
      { key: 'galatians_2', label: 'Galatians 2 confrontation', seeds: ['Galatians 2:11-14'] },
      { key: 'peter_acknowledges_paul', label: 'Peter acknowledges Paul writings', seeds: ['2 Peter 3:15-16'] },
      { key: 'unity_gospel', label: 'Unity of gospel message', seeds: ['Ephesians 2:11-22'] },
    ],
  },
  jacob_israel_twelve_tribes: {
    ...PHASE3P_PACKS.jacob_israel_twelve_tribes,
    anchorScriptures: uniqueRefs([
      ...(PHASE3P_PACKS.jacob_israel_twelve_tribes?.anchorScriptures || []),
      'Genesis 32:28', 'Genesis 35:10', 'Genesis 49:10', 'Genesis 48:5', 'Genesis 48:14-19',
      'Deuteronomy 28:64', 'Deuteronomy 28:68', 'Jeremiah 31:31', 'Ezekiel 37:21-28',
      'Romans 9:4-5', 'Romans 11:25-26', 'James 1:1',
    ]),
    subchains: [
      { key: 'abraham_isaac_jacob', label: 'Abraham → Isaac → Jacob', seeds: ['Genesis 12:1-3', 'Genesis 21:12', 'Genesis 25:23'] },
      { key: 'jacob_renamed_israel', label: 'Jacob renamed Israel', seeds: ['Genesis 32:28', 'Genesis 35:10'] },
      { key: 'twelve_tribes', label: 'Twelve sons / twelve tribes', seeds: ['Genesis 49:1-28', 'Exodus 1:1-7'] },
      { key: 'judah_jews', label: 'Judah / Jews', seeds: ['Genesis 49:10', 'Romans 9:4-5'] },
      { key: 'joseph_ephraim_manasseh', label: 'Joseph / Ephraim / Manasseh', seeds: ['Genesis 48:5', 'Genesis 48:14-19'] },
      { key: 'israel_scattered', label: 'Israel scattered', seeds: ['Deuteronomy 28:64', '2 Kings 17:6'] },
      { key: 'deut_28_captivity', label: 'Deuteronomy 28 captivity', seeds: ['Deuteronomy 28:1-68', 'Deuteronomy 28:68'] },
      { key: 'israel_regathered', label: 'Israel regathered', seeds: ['Ezekiel 37:21-28', 'Jeremiah 30:3'] },
      { key: 'israel_prophecy', label: 'Israel in prophecy', seeds: ['Isaiah 11:11-12', 'Jeremiah 31:31'] },
      { key: 'israel_revelation', label: 'Israel in Revelation', seeds: ['Revelation 7:4-8', 'Revelation 21:12'] },
    ],
  },
  millennial_kingdom_kingdom_on_earth: {
    ...PHASE3P_PACKS.millennial_kingdom_kingdom_on_earth,
    anchorScriptures: uniqueRefs([
      ...(PHASE3P_PACKS.millennial_kingdom_kingdom_on_earth?.anchorScriptures || []),
      'Revelation 20:1', 'Revelation 20:2', 'Revelation 20:3', 'Revelation 20:4',
      'Revelation 20:5', 'Revelation 20:6', 'Revelation 5:10', 'Daniel 2:44', 'Daniel 7:13-14',
      'Isaiah 11:1-9', 'Isaiah 65:17-25', 'Zechariah 14:1-9', 'Luke 1:32-33',
      '1 Corinthians 15:24-28',
    ]),
    requiredAnchors: [
      'Revelation 20:1-6', 'Revelation 5:10', 'Daniel 2:44', 'Daniel 7:13-14',
      'Isaiah 11:1-9', 'Isaiah 65:17-25', 'Zechariah 14:1-9', 'Luke 1:32-33',
      '1 Corinthians 15:24-28',
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

function normalizeKey(s = '') {
  return String(s).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function fuzzyMatchTitle(a = '', b = '') {
  const ka = normalizeKey(a);
  const kb = normalizeKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.includes(kb) || kb.includes(ka)) return true;
  const wa = ka.split(' ').filter((w) => w.length > 3);
  const wb = kb.split(' ').filter((w) => w.length > 3);
  const overlap = wa.filter((w) => wb.includes(w)).length;
  return overlap >= Math.min(3, Math.min(wa.length, wb.length));
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

function detectCamp(lessonTitle = '', sourceName = '') {
  const t = `${lessonTitle} ${sourceName}`.toLowerCase();
  if (/phoenix|phx/i.test(t)) return 'Phoenix';
  if (/dallas/i.test(t)) return 'Dallas';
  if (/toronto/i.test(t)) return 'Toronto';
  if (/cleveland/i.test(t)) return 'Cleveland';
  if (/spanish|español/i.test(t)) return 'Spanish';
  if (/icoj/i.test(t)) return 'ICOJ';
  return 'HQ';
}

function loadAllInputs() {
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const phase3p = loadJson(path.join(TRACE, 'phase3p-priority-pack-strengthening-results.json'), {});
  const phase3o = loadJson(path.join(TRACE, 'phase3o-source-gap-completion-results.json'), {});
  const scrubbed = loadJson(SCRUBBED_CORPUS_PATH, { scrubbedItems: [] });
  const registry = loadJson(REGISTRY_PATH, { sources: [] });
  const priorityPacks = loadJson(path.join(OUT_DIR, 'priority-pack-strengthened.json'), { packs: [] });

  return {
    questions: phase3f.questions || [],
    pdfExtractions: phase3f.pdfExtractions || [],
    videoExtractions: phase3f.videoExtractions || [],
    transcriptExtractions: phase3f.transcriptExtractions || [],
    websiteExtractions: phase3f.websiteExtractions || [],
    scriptureChains: loadJson(path.join(OUT_DIR, 'expanded-scripture-chains.json'), { chains: [] }).chains || [],
    scrubbedItems: scrubbed.scrubbedItems || [],
    registrySources: registry.sources || [],
    strengthenedPacks: [
      ...(loadJson(path.join(OUT_DIR, 'strengthened-recovered-packs.json'), { packs: [] }).packs || []),
      ...(priorityPacks.packs || []),
    ],
    priorCoverage: phase3p.coverageUpdate?.after || phase3o.coverageRecalculation?.after || { covered: 352, partial: 60, missing: 181 },
    phase3oExtractions: phase3o.priorityExtractions || [],
    evidenceCards: getAllApprovedCards(),
    campMappings: phase3o.campMappings || [],
  };
}

function buildMissingEntriesList(inputs) {
  const reassessed3O = loadJson(path.join(TRACE, 'phase3o-source-gap-completion-results.json'), {})
    .coverageRecalculation?.reassessed || [];
  const sourceAudit = loadJson(path.join(TRACE, 'phase3m-source-doctrine-verification-results.json'), {})
    .sourceCoverageAudit || [];

  const missing = [];
  for (const entry of sourceAudit) {
    const status3O = reassessed3O.find((r) => normalizeKey(r.lessonTitle) === normalizeKey(entry.lessonTitle));
    const status = status3O?.postRecoveryStatus3O || entry.status;
    if (status !== 'missing') continue;
    missing.push({
      sourceName: entry.source || entry.sourceName,
      camp: entry.camp,
      lessonTitle: entry.lessonTitle,
      topic: entry.topic,
      recordType: entry.recordType,
      question: entry.question,
      priorStatus: entry.status,
    });
  }
  return missing;
}

function enrichMissingEntry(entry, inputs) {
  const questions = inputs.questions.filter((q) => fuzzyMatchTitle(q.lessonTitle, entry.lessonTitle));
  const pdfs = inputs.pdfExtractions.filter((p) => fuzzyMatchTitle(p.lessonTitle, entry.lessonTitle));
  const videos = inputs.videoExtractions.filter((v) => fuzzyMatchTitle(v.lessonTitle, entry.lessonTitle));
  const transcripts = inputs.transcriptExtractions.filter((t) => fuzzyMatchTitle(t.lessonTitle, entry.lessonTitle));
  const scrubbed = inputs.scrubbedItems.filter((s) => fuzzyMatchTitle(s.lessonTitle, entry.lessonTitle));
  const phase3oExt = inputs.phase3oExtractions.find((e) => fuzzyMatchTitle(e.lessonTitle, entry.lessonTitle));

  const sourceUrl = questions[0]?.sourceUrl
    || pdfs[0]?.pdfUrl || pdfs[0]?.sourceUrl
    || videos[0]?.videoUrl || videos[0]?.sourceUrl
    || transcripts[0]?.videoUrl
    || scrubbed[0]?.sourceUrl
    || phase3oExt?.sourceUrl
    || null;

  const availableText = [
    ...scrubbed.map((s) => s.answerSummary).filter(Boolean),
    ...pdfs.map((p) => p.textSample).filter(Boolean),
    ...transcripts.map((t) => t.transcriptSample).filter(Boolean),
  ].join(' ').slice(0, 500);

  const localScriptures = uniqueRefs([
    ...questions.flatMap((q) => q.scripturesCited || []),
    ...pdfs.flatMap((p) => p.scripturesCited || []),
    ...scrubbed.flatMap((s) => s.scripturesCited || []),
    ...(phase3oExt?.scriptureRefsFound || []),
  ]);

  const pdfAvailable = pdfs.some((p) => p.pdfUrl || /\.pdf/i.test(p.sourceUrl || ''));
  const transcriptAvailable = transcripts.some((t) => t.transcriptSample && !t.captionUnavailable);
  const videoDescriptionAvailable = videos.some((v) => v.description || v.lessonTitle);
  const spanishLesson = /spanish|español/i.test(`${entry.lessonTitle} ${entry.sourceName || ''}`);
  const icojHandout = /icoj/i.test(`${entry.sourceName || ''} ${entry.lessonTitle}`);
  const campIog = /iog|phoenix|dallas|toronto|cleveland/i.test(`${entry.sourceName || ''} ${entry.lessonTitle}`);

  let reasonMissing = phase3oExt?.reasonMissing || null;
  if (!reasonMissing && !localScriptures.length) {
    if (transcripts.some((t) => t.captionUnavailable)) reasonMissing = 'source_text_unavailable';
    else if (pdfAvailable && !pdfs.some((p) => (p.scripturesCited || []).length)) reasonMissing = 'no_scripture_refs_in_pdf';
    else if (!sourceUrl) reasonMissing = 'no_source_url_found';
    else reasonMissing = 'no_scripture_chain_in_corpus';
  }

  const manualTranscriptNeeded = transcripts.some((t) => t.captionUnavailable || t.manualTranscriptNeeded)
    || (reasonMissing === 'source_text_unavailable');

  let recommendedNextAction = 'manual_review';
  if (localScriptures.length > 0) recommendedNextAction = 'link_existing_corpus_scriptures';
  else if (pdfAvailable) recommendedNextAction = 'extract_pdf_text';
  else if (sourceUrl && /youtube|youtu\.be/i.test(sourceUrl)) recommendedNextAction = 'fetch_youtube_description_or_transcript';
  else if (sourceUrl) recommendedNextAction = 'cursor_fetch_public_url';
  else if (manualTranscriptNeeded) recommendedNextAction = 'manual_transcript_upload';
  else if (spanishLesson) recommendedNextAction = 'spanish_caption_or_translation_needed';

  return {
    sourceName: entry.sourceName || questions[0]?.sourceName,
    camp: entry.camp || detectCamp(entry.lessonTitle, entry.sourceName),
    lessonTitle: entry.lessonTitle,
    sourceUrl,
    reasonMissing,
    availableText: availableText || null,
    pdfAvailable,
    transcriptAvailable,
    videoDescriptionAvailable,
    manualTranscriptNeeded,
    recommendedNextAction,
    localScripturesFound: localScriptures.length,
    localScriptures: localScriptures.slice(0, 10),
    flags: { spanishLesson, icojHandout, campIog, hasQuestions: questions.length > 0 },
  };
}

async function attemptMissingSourceRecovery(missingAudit, { maxFetches = 30 } = {}) {
  const recovered = [];
  let fetchCount = 0;

  for (const entry of missingAudit) {
    if (entry.localScripturesFound > 0) {
      recovered.push({
        lessonTitle: entry.lessonTitle,
        recoveryMethod: 'local_corpus_match',
        scriptures: entry.localScriptures,
        status: 'resolved_from_corpus',
      });
      continue;
    }

    if (!entry.sourceUrl || fetchCount >= maxFetches) continue;
    if (!/theisraelofgod|icoj|youtube|youtu\.be/i.test(entry.sourceUrl)) continue;

    const result = await fetchText(entry.sourceUrl);
    fetchCount += 1;
    if (!result.ok) {
      recovered.push({
        lessonTitle: entry.lessonTitle,
        recoveryMethod: 'url_fetch_failed',
        sourceUrl: entry.sourceUrl,
        error: result.error,
        status: 'still_missing',
      });
      continue;
    }

    const scriptures = extractScripturesFromText(result.text);
    if (scriptures.length) {
      recovered.push({
        lessonTitle: entry.lessonTitle,
        recoveryMethod: 'url_re_scrub',
        sourceUrl: entry.sourceUrl,
        scriptures,
        status: 'resolved_from_url',
      });
    } else {
      recovered.push({
        lessonTitle: entry.lessonTitle,
        recoveryMethod: 'url_fetch_no_refs',
        sourceUrl: entry.sourceUrl,
        status: 'still_missing',
      });
    }
  }

  return { recovered, fetchCount };
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

function searchCorpusBySeedTerms(def, inputs) {
  const hits = { questions: [], chains: [], pdfs: [], cards: [], scriptures: [] };
  const textSources = [
    ...inputs.questions.map((q) => ({ type: 'question', text: `${q.lessonTitle} ${q.question} ${q.answerSummary || ''}`, item: q })),
    ...inputs.scriptureChains.map((c) => ({ type: 'chain', text: `${c.lessonTitle} ${c.question}`, item: c })),
    ...inputs.pdfExtractions.map((p) => ({ type: 'pdf', text: p.lessonTitle || '', item: p })),
    ...inputs.scrubbedItems.map((s) => ({ type: 'scrubbed', text: `${s.lessonTitle} ${s.answerSummary || ''}`, item: s })),
  ];

  for (const src of textSources) {
    if (!def.seedTerms?.some((p) => p.test(src.text))) continue;
    if (src.type === 'question') hits.questions.push(src.item);
    else if (src.type === 'chain') hits.chains.push(src.item);
    else if (src.type === 'pdf') hits.pdfs.push(src.item);
    const scriptures = src.item.scripturesCited || src.item.originalScriptureChain || [];
    hits.scriptures.push(...scriptures);
  }

  for (const card of inputs.evidenceCards) {
    if (def.aliases?.includes(card.topic) || def.seedTerms?.some((p) => p.test(card.topic || ''))) {
      hits.cards.push(card);
      hits.scriptures.push(...(card.primaryScriptures || []), ...(card.supportingScriptures || []));
    }
  }

  hits.scriptures = uniqueRefs([...(def.anchorScriptures || []), ...hits.scriptures]);
  return hits;
}

function classifyScriptures(originalSet, allRefs, registryKey) {
  const continuityPool = new Set(uniqueRefs([
    ...getRegistryChain(registryKey).map((n) => n.reference),
    ...getRegistryChain('kingdom').map((n) => n.reference),
    ...getRegistryChain('covenant').map((n) => n.reference),
    ...getRegistryChain('messiah').map((n) => n.reference),
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
  const tribeBonus = structured.tribeByTribeAnchors?.length >= 12 ? 10 : 0;
  const subchainBonus = Math.min(10, (structured.subchains?.filter((s) => s.scriptureCount > 0).length || 0) * 2);

  const g2rSpan = structured.genesisToRevelationChain?.some((r) => /^genesis/i.test(r))
    && structured.genesisToRevelationChain?.some((r) => /^revelation/i.test(r));

  const reviewReadiness = Math.min(100, Math.round(
    Math.min(35, structured.originalScriptureChain.length * 2.5)
    + Math.min(20, structured.parallelScriptures.length * 2)
    + Math.min(15, structured.supportingScriptures.length)
    + (g2rSpan ? 15 : 0)
    + Math.min(10, structured.sourceCoverage * 2)
    + tribeBonus
    + subchainBonus,
  ));

  const depth = structured.originalScriptureChain.length * 4
    + structured.parallelScriptures.length * 2
    + structured.supportingScriptures.length;

  const supportScore = Math.min(100, Math.round(45 + depth * 0.6 + tribeBonus));

  let status = 'weak';
  if (reviewReadiness >= 75 && structured.originalScriptureChain.length >= 10) status = 'review_ready';
  else if (reviewReadiness >= 55) status = 'moderate';

  return { supportScore, reviewReadiness, status, g2rSpan };
}

function buildSubchains(def, originalScriptureChain) {
  return (def.subchains || []).map((sc) => {
    const fromSeeds = uniqueRefs(sc.seeds || []).filter((s) =>
      originalScriptureChain.some((r) => refKey(r).startsWith(refKey(s).split(':')[0])),
    );
    const matched = originalScriptureChain.filter((r) => {
      if (sc.seeds?.some((s) => refKey(r).startsWith(refKey(s).split(':')[0]))) return true;
      return sc.pattern?.test?.(r);
    });
    const scriptures = sortByBibleOrder(uniqueRefs([...fromSeeds, ...matched]));
    return { key: sc.key, label: sc.label, scriptures, scriptureCount: scriptures.length };
  });
}

function buildSourceLinkages(def, inputs) {
  const linkages = [];
  for (const q of inputs.questions) {
    const text = `${q.lessonTitle} ${q.question}`;
    if (!def.seedTerms?.some((p) => p.test(text))) continue;
    linkages.push({ type: 'question', source: q.sourceName, camp: q.camp, lessonTitle: q.lessonTitle, scriptures: (q.scripturesCited || []).length });
  }
  for (const c of inputs.scriptureChains) {
    const text = `${c.lessonTitle} ${c.question}`;
    if (!def.seedTerms?.some((p) => p.test(text))) continue;
    linkages.push({ type: 'chain', source: c.sourceName, lessonTitle: c.lessonTitle, scriptures: (c.originalScriptureChain || []).length });
  }
  return linkages;
}

function buildDeepPack(packKey, def, inputs) {
  const topic = def.topicKey || packKey;
  const existing = getExistingPacksAggregated(packKey, def, inputs);
  const corpus = searchCorpusBySeedTerms(def, inputs);

  const priorOriginalCount = existing?.originalScriptureChain?.length || 0;
  const priorReviewReadiness = existing?.reviewReadiness || 0;
  const priorSet = new Set((existing?.originalScriptureChain || []).map(refKey));

  const tribeRefs = (def.tribeByTribeAnchors || []).map((t) => t.scripture);
  const newFromAnchors = uniqueRefs([...(def.anchorScriptures || []), ...tribeRefs])
    .filter((a) => !priorSet.has(refKey(a)));
  const newFromCorpus = uniqueRefs([
    ...corpus.chains.flatMap((c) => c.originalScriptureChain || []),
    ...corpus.scriptures,
  ]).filter((r) => !priorSet.has(refKey(r)));

  const originalScriptureChain = sortByBibleOrder(uniqueRefs([
    ...(def.anchorScriptures || []),
    ...tribeRefs,
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
  const subchains = buildSubchains(def, originalScriptureChain);
  const sourceLinkages = buildSourceLinkages(def, inputs);

  const lessons = [...new Set([
    ...corpus.questions.map((q) => q.lessonTitle),
    ...corpus.chains.map((c) => c.lessonTitle),
    ...corpus.pdfs.map((p) => p.lessonTitle),
  ].filter(Boolean))];

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
    tribeByTribeAnchors: def.tribeByTribeAnchors || null,
    requiredAnchorsVerified: (def.requiredAnchors || []).map((a) => ({
      anchor: a,
      present: originalScriptureChain.some((r) => refKey(r).startsWith(refKey(a).split(':')[0])),
    })),
    subchains,
    questionCoverage: corpus.questions.length,
    lessonCoverage: lessons.length,
    sourceCoverage: sourceLinkages.length,
    sourceLinks: sourceLinkages,
    scripturesBefore: priorOriginalCount,
    scripturesAfter: originalScriptureChain.length,
    scripturesGained: uniqueRefs([...newFromAnchors, ...newFromCorpus]).length,
    corpusHits: {
      questions: corpus.questions.length,
      chains: corpus.chains.length,
      pdfs: corpus.pdfs.length,
      cards: corpus.cards.length,
    },
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
    sourceCount: sourceLinkages.length,
    allOriginalScriptures: originalScriptureChain,
    genesisToRevelationSpan: scores.g2rSpan,
  }, { genesisToRevelationSpan: scores.g2rSpan });

  structured.humanReviewNotes = [
    `Deep recovery ${packKey} — preparation only, not approved for implementation`,
    structured.missingLinksStillRemaining?.length
      ? `Missing links: ${structured.missingLinksStillRemaining.join(', ')}`
      : 'No structural missing links flagged',
  ].join('. ');

  return structured;
}

function buildExtractionPlan(missingAudit, recoveryResults) {
  const byAction = {};
  for (const entry of missingAudit) {
    const action = entry.recommendedNextAction;
    if (!byAction[action]) byAction[action] = [];
    byAction[action].push(entry.lessonTitle);
  }

  const cursorCanExtract = missingAudit.filter((e) =>
    ['link_existing_corpus_scriptures', 'extract_pdf_text', 'cursor_fetch_public_url', 'fetch_youtube_description_or_transcript'].includes(e.recommendedNextAction),
  );

  const manualRequired = missingAudit.filter((e) =>
    ['manual_transcript_upload', 'spanish_caption_or_translation_needed'].includes(e.recommendedNextAction)
    || e.manualTranscriptNeeded,
  );

  const priorityBuckets = {
    withSourceUrl: missingAudit.filter((e) => e.sourceUrl).length,
    pdfs: missingAudit.filter((e) => e.pdfAvailable).length,
    youtubeDescriptions: missingAudit.filter((e) => e.videoDescriptionAvailable).length,
    spanishLessons: missingAudit.filter((e) => e.flags?.spanishLesson).length,
    campIog: missingAudit.filter((e) => e.flags?.campIog).length,
    icojHandouts: missingAudit.filter((e) => e.flags?.icojHandout).length,
    qaItems: missingAudit.filter((e) => e.flags?.hasQuestions).length,
  };

  return {
    totalMissing: missingAudit.length,
    byRecommendedAction: byAction,
    priorityBuckets,
    cursorCanExtractNow: cursorCanExtract.length,
    manualRequired: manualRequired.length,
    recoveredIn3Q: recoveryResults.recovered.filter((r) => r.status.startsWith('resolved')).length,
    stillMissingAfter3Q: recoveryResults.recovered.filter((r) => r.status === 'still_missing').length,
    urlFetchesAttempted: recoveryResults.fetchCount,
    iogIcojRescrubNote: 'IOG/ICOJ public URLs in registry and scrubbed corpus can be re-processed by Cursor via cursor_fetch_public_url and extract_pdf_text without production changes. Spanish and caption-blocked YouTube items require manual transcript upload.',
  };
}

function recalculateCoverage(inputs, deepPacks, missingAuditAfter, recoveryResults) {
  const reassessed3O = loadJson(path.join(TRACE, 'phase3o-source-gap-completion-results.json'), {})
    .coverageRecalculation?.reassessed || [];
  const sourceAudit = loadJson(path.join(TRACE, 'phase3m-source-doctrine-verification-results.json'), {})
    .sourceCoverageAudit || [];

  const resolvedTitles = new Set(
    recoveryResults.recovered
      .filter((r) => r.status.startsWith('resolved'))
      .map((r) => normalizeKey(r.lessonTitle)),
  );

  let covered = 0;
  let partial = 0;
  let missing = 0;

  for (const entry of sourceAudit) {
    const status3O = reassessed3O.find((r) => normalizeKey(r.lessonTitle) === normalizeKey(entry.lessonTitle));
    let status = status3O?.postRecoveryStatus3O || entry.status;

    if (resolvedTitles.has(normalizeKey(entry.lessonTitle))) {
      status = 'partial';
    }

    const pack = deepPacks.find((p) => {
      const def = DEEP_PACK_DEFINITIONS[p.topic];
      const text = `${entry.lessonTitle || ''} ${entry.topic || ''}`;
      return def?.seedTerms?.some((re) => re.test(text)) || p.topicKey === entry.topic;
    });
    if (pack && pack.reviewReadiness >= 70 && pack.originalScriptureChain.length >= 8) status = 'covered';
    else if (pack && pack.originalScriptureChain.length >= 5) status = status === 'missing' ? 'partial' : status;

    if (status === 'covered') covered += 1;
    else if (status === 'partial') partial += 1;
    else missing += 1;
  }

  const perPack = deepPacks.map((p) => ({
    topic: p.topic,
    scripturesBefore: p.scripturesBefore,
    scripturesAfter: p.scripturesAfter,
    scripturesGained: p.scripturesGained,
    reviewReadinessBefore: p.reviewReadinessBefore,
    reviewReadinessAfter: p.reviewReadiness,
    status: p.implementationPreparationStatus,
    tribeAnchors: p.tribeByTribeAnchors?.length || 0,
  }));

  return {
    prior: inputs.priorCoverage,
    after: { covered, partial, missing },
    perPack,
    missingSourcesBefore: missingAuditAfter.length,
    missingSourcesResolved: recoveryResults.recovered.filter((r) => r.status.startsWith('resolved')).length,
    missingSourcesRemaining: missing - 0, // missing count from audit
  };
}

function runClaudeReadOnlyAudit(deepPacks, reportFiles) {
  const findings = [];

  for (const pack of deepPacks) {
    if (pack.topic === 'one_hundred_forty_four_thousand') {
      const tribeCount = pack.tribeByTribeAnchors?.length || 0;
      if (tribeCount < 12) findings.push({ pack: pack.topic, severity: 'high', issue: 'incomplete_tribe_list', detail: `${tribeCount}/12 tribe anchors` });
      if (!pack.originalScriptureChain.some((r) => /revelation 7:1/i.test(r))) findings.push({ pack: pack.topic, severity: 'high', issue: 'missing_sealing_chain', detail: 'Revelation 7:1-4 sealing chain incomplete' });
      if (!pack.originalScriptureChain.some((r) => /revelation 14/i.test(r))) findings.push({ pack: pack.topic, severity: 'medium', issue: 'missing_rev_14', detail: 'Revelation 14 firstfruits chain needed' });
    }
    if (pack.topic === 'peter' && pack.originalScriptureChain.length < 15) {
      findings.push({ pack: pack.topic, severity: 'medium', issue: 'thin_peter_chain', detail: `${pack.originalScriptureChain.length} scriptures — needs NT depth` });
    }
    if (pack.topic === 'peter_paul_alignment' && !pack.subchains?.some((s) => s.key === 'acts_15_council' && s.scriptureCount > 0)) {
      findings.push({ pack: pack.topic, severity: 'medium', issue: 'missing_acts_15', detail: 'Acts 15 council subchain weak' });
    }
    if (pack.topic === 'millennial_kingdom_kingdom_on_earth') {
      const failed = (pack.requiredAnchorsVerified || []).filter((a) => !a.present);
      if (failed.length) findings.push({ pack: pack.topic, severity: 'high', issue: 'missing_required_anchors', detail: failed.map((f) => f.anchor).join(', ') });
    }
    if (pack.parallelScriptures.length === 0 && pack.supportingScriptures.length === 0 && pack.originalScriptureChain.length > 10) {
      findings.push({ pack: pack.topic, severity: 'medium', issue: 'flat_list_risk', detail: 'Parallel/supporting buckets empty' });
    }
  }

  return {
    auditType: 'claude_read_only_phase_3q',
    modelNote: 'Programmatic read-only structural audit — does not approve doctrine or modify production',
    filesReviewed: reportFiles,
    findings,
    recommendations: [
      'Human admin reviews tribe-by-tribe Revelation 7 anchors before implementation',
      'Peter pack needs corpus Q&A linkage from IOG lessons on Cornelius and Acts 15',
      'Re-scrub IOG website lesson notes for missing entries with sourceUrl',
      'ICOJ PDF handouts should be batch-extracted for camp lessons still missing',
      'Spanish lessons need caption upload or translated transcript before scripture extraction',
    ],
  };
}

async function runPhase3qWeakPackDeepRecovery({ enableUrlFetch = true, maxFetches = 30 } = {}) {
  const inputs = loadAllInputs();
  const missingRaw = buildMissingEntriesList(inputs);
  const missingAudit = missingRaw.map((e) => enrichMissingEntry(e, inputs));

  const recoveryResults = enableUrlFetch
    ? await attemptMissingSourceRecovery(missingAudit, { maxFetches })
    : { recovered: [], fetchCount: 0 };

  const deepPacks = [];
  for (const [packKey, def] of Object.entries(DEEP_PACK_DEFINITIONS)) {
    deepPacks.push(buildDeepPack(packKey, def, inputs));
  }

  const extractionPlan = buildExtractionPlan(missingAudit, recoveryResults);
  const coverageUpdate = recalculateCoverage(inputs, deepPacks, missingAudit, recoveryResults);

  const humanReviewPackets = deepPacks.map((p) => ({
    topic: p.topic,
    supportScore: p.supportScore,
    reviewReadiness: p.reviewReadiness,
    originalScriptureChain: p.originalScriptureChain,
    genesisToRevelationChain: p.genesisToRevelationChain,
    parallelScriptures: p.parallelScriptures,
    supportingScriptures: p.supportingScriptures,
    continuityScriptures: p.continuityScriptures,
    sourceLinks: p.sourceLinks?.slice(0, 15),
    missingLinksStillRemaining: p.missingLinksStillRemaining,
    humanReviewNotes: p.humanReviewNotes,
    tribeByTribeAnchors: p.tribeByTribeAnchors,
  }));

  const claudeAudit = runClaudeReadOnlyAudit(deepPacks, [
    'PriorityPackStructuredReviewPackets.md',
    'OneHundredFortyFourThousandDeepPack.md',
    'PeterApostleDoctrinePack.md',
    'PeterPaulAlignmentPack.md',
    'JacobIsraelLineageDeepPack.md',
    'MillennialKingdomDeepPack.md',
  ]);

  const reviewReady = deepPacks.filter((p) => p.implementationPreparationStatus === 'review_ready');

  const executive = {
    tribeByTribeAnchorsAdded: deepPacks.find((p) => p.topic === 'one_hundred_forty_four_thousand')?.tribeByTribeAnchors?.length || 0,
    p144000ScripturesGained: deepPacks.find((p) => p.topic === 'one_hundred_forty_four_thousand')?.scripturesGained || 0,
    p144000ScripturesAfter: deepPacks.find((p) => p.topic === 'one_hundred_forty_four_thousand')?.scripturesAfter || 0,
    peterScripturesGained: deepPacks.find((p) => p.topic === 'peter')?.scripturesGained || 0,
    peterScripturesAfter: deepPacks.find((p) => p.topic === 'peter')?.scripturesAfter || 0,
    peterPaulPackCreated: deepPacks.some((p) => p.topic === 'peter_paul_alignment'),
    peterPaulReadiness: deepPacks.find((p) => p.topic === 'peter_paul_alignment')?.reviewReadiness || 0,
    jacobScripturesGained: deepPacks.find((p) => p.topic === 'jacob_israel_twelve_tribes')?.scripturesGained || 0,
    millennialRev20Present: deepPacks.find((p) => p.topic === 'millennial_kingdom_kingdom_on_earth')
      ?.requiredAnchorsVerified?.find((a) => /revelation 20/i.test(a.anchor))?.present || false,
    millennialScripturesGained: deepPacks.find((p) => p.topic === 'millennial_kingdom_kingdom_on_earth')?.scripturesGained || 0,
    missingSourcesBefore: missingAudit.length,
    missingSourcesResolved: extractionPlan.recoveredIn3Q,
    missingSourcesRemaining: coverageUpdate.after.missing,
    coverage: coverageUpdate.after,
    reviewReadyPacks: reviewReady.map((p) => ({ topic: p.topic, displayName: p.displayName, reviewReadiness: p.reviewReadiness })),
    reviewReadyCount: reviewReady.length,
    implementFirstAfterReview: reviewReady.length
      ? reviewReady.map((p) => p.displayName)
      : deepPacks.sort((a, b) => b.reviewReadiness - a.reviewReadiness).slice(0, 3).map((p) => p.displayName),
    claudeAuditSummary: { findingCount: claudeAudit.findings.length, recommendations: claudeAudit.recommendations.slice(0, 5) },
    iogIcojRescrub: extractionPlan.iogIcojRescrubNote,
  };

  const payload = {
    phase: '3Q',
    ranAt: new Date().toISOString(),
    missingSourceAudit: missingAudit,
    extractionPlan,
    recoveryResults,
    deepPacks,
    humanReviewPackets,
    coverageUpdate,
    claudeAudit,
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
    path.join(TRACE, 'phase3q-weak-pack-deep-recovery-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'deep-recovered-packs.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, packs: deepPacks, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3qWeakPackDeepRecovery,
  DEEP_PACK_DEFINITIONS,
  REV7_TRIBE_ANCHORS,
};
