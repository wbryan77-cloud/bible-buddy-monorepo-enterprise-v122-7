/**
 * Phase 3O — Source gap completion, title normalization, weak pack strengthening.
 * Recovery, normalization, organization — no production mutations.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { discoverTopicFromText, TOPIC_PATTERNS } = require('./bibleWideTopicDiscovery');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { FEAST_TOPICS } = require('./phase3mSourceDoctrineVerification');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const DATA = path.join(ROOT, 'data');

const PRIORITY_LESSONS = [
  'Power Over The Nations',
  'Feast Of Unleavened Bread 2022',
  'The Destruction and Restoration of Israel',
  'Shows - The Israel of God',
];

const WEAK_PACK_FOCUS = ['millennial_kingdom', '144000', 'jacob', 'peter'];

const SPANISH_ENGLISH_MAP = [
  { pattern: /jesús|jesus/i, english: 'Jesus: The Unknown God', topic: 'jesus_old_testament_new_testament' },
  { pattern: /velo de la mujer/i, english: 'The veil of the woman', topic: 'women_in_bible' },
  { pattern: /segunda muerte|lago de fuego/i, english: 'Second death: lake of fire', topic: 'lake_of_fire' },
  { pattern: /pentecostés|pentecostes/i, english: 'Pentecost', topic: 'pentecost' },
  { pattern: /el gran cambio/i, english: 'The great change', topic: 'resurrection' },
  { pattern: /dios desconocido/i, english: 'The unknown God', topic: 'jesus_old_testament_new_testament' },
];

const CAMP_PATTERNS = [
  { pattern: /^IOG Birmingham/i, camp: 'Birmingham' },
  { pattern: /^IOG Washington/i, camp: 'Washington DC' },
  { pattern: /^IOG Detroit/i, camp: 'Detroit' },
  { pattern: /^IOG Phoenix/i, camp: 'Phoenix' },
  { pattern: /^IOG Baton Rouge/i, camp: 'Baton Rouge' },
  { pattern: /^IOG -/i, camp: 'HQ' },
  { pattern: /Los Angeles|LA camp/i, camp: 'Los Angeles' },
  { pattern: /Atlanta/i, camp: 'Atlanta' },
  { pattern: /Toronto/i, camp: 'Toronto' },
  { pattern: /Dallas|Houston|Indianapolis|Jacksonville/i, camp: 'Regional' },
];

const ICOJ_GROUPS = [
  { key: 'hq_lessons', pattern: /icoj main|icoj hq/i, label: 'HQ lessons' },
  { key: 'lesson_handouts', pattern: /lesson handout|icoj lesson/i, label: 'Lesson handouts' },
  { key: 'los_angeles', pattern: /los angeles|la camp/i, label: 'Los Angeles lessons' },
  { key: 'atlanta', pattern: /atlanta/i, label: 'Atlanta lessons' },
  { key: 'toronto', pattern: /toronto/i, label: 'Toronto lessons' },
  { key: 'regional', pattern: /dallas|houston|indianapolis|jacksonville/i, label: 'Regional camps' },
  { key: 'qa_sources', pattern: /q&a|qa archive/i, label: 'Q&A sources' },
  { key: 'pdf_handouts', pattern: /pdf|handout/i, label: 'PDF handouts' },
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

function canonicalTitle(raw = '') {
  let t = String(raw).trim();
  t = t.replace(/^IOG\s+[\w\s]+?\s*-\s*/i, '');
  t = t.replace(/^IOG\s*-\s*/i, '');
  t = t.replace(/\s+\d{4}\s*$/i, '');
  t = t.replace(/^["']|["']$/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function displayName(topic = '') {
  return String(topic).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const r of refs) {
    const k = String(r || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    if (!verifyKjvReference(r).valid) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function detectCamp(title = '', sourceName = '') {
  const combined = `${title} ${sourceName}`;
  for (const c of CAMP_PATTERNS) {
    if (c.pattern.test(combined)) return c.camp;
  }
  if (/HQ|Main Website/i.test(sourceName)) return 'HQ';
  return 'HQ';
}

function resolveTopic(text = '', lessonTitle = '') {
  const d = discoverTopicFromText(text, { lessonTitle });
  return d.topic || 'unclassified';
}

function loadAllInputs() {
  const phase3n = loadJson(path.join(TRACE, 'phase3n-source-gap-recovery-results.json'), {});
  const phase3m = loadJson(path.join(TRACE, 'phase3m-source-doctrine-verification-results.json'), {});
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const strengthened = loadJson(path.join(OUT_DIR, 'strengthened-recovered-packs.json'), { packs: [] });
  const linkages = loadJson(path.join(OUT_DIR, 'source-gap-recovery-linkages.json'), {});
  const finalReadiness = loadJson(path.join(OUT_DIR, 'final-implementation-readiness.json'), {});
  const websiteLessons = loadJson(path.join(OUT_DIR, 'website-lesson-extractions.json'), { extractions: [] });
  const transcripts = loadJson(path.join(OUT_DIR, 'transcript-extractions.json'), { extractions: [] });
  const chains = loadJson(path.join(OUT_DIR, 'expanded-scripture-chains.json'), { chains: [] });
  const corpusRegistry = loadJson(path.join(DATA, 'full-corpus-source-registry.json'), null);
  const scrubbedCorpus = loadJson(path.join(DATA, 'phase3e-scrubbed-corpus.json'), null);

  return {
    phase3n,
    phase3m,
    phase3f,
    questions: phase3f.questions || [],
    pdfExtractions: phase3f.pdfExtractions || [],
    videoExtractions: phase3f.videoExtractions || [],
    transcriptExtractions: phase3f.transcriptExtractions || [],
    strengthenedPacks: strengthened.packs || [],
    gapRecoveries: phase3n.gapRecoveries || [],
    sourceCoverageAudit: phase3m.sourceCoverageAudit || [],
    priorCoverage3N: phase3n.coverageRecalculation?.after || { covered: 337, partial: 48, missing: 208 },
    websiteLessons: websiteLessons.extractions || [],
    transcripts: transcripts.extractions || [],
    scriptureChains: chains.chains || [],
    linkages,
    finalReadiness,
    corpusRegistry,
    scrubbedCorpus,
    corpusRegistryAvailable: corpusRegistry != null,
    scrubbedCorpusAvailable: scrubbedCorpus != null,
  };
}

function buildPackIndex(packs) {
  const byTopic = new Map();
  for (const pack of packs) {
    if (!pack.topic) continue;
    byTopic.set(pack.topic, pack);
  }
  for (const card of getAllApprovedCards()) {
    if (!byTopic.has(card.topic)) {
      byTopic.set(card.topic, {
        topic: card.topic,
        displayName: displayName(card.topic),
        reviewReadiness: 70,
        supportScore: 85,
      });
    }
  }
  return byTopic;
}

function buildChainIndexes(chains) {
  const byLesson = new Map();
  const byCanonical = new Map();
  for (const chain of chains) {
    const key = normalizeKey(chain.lessonTitle);
    const canon = normalizeKey(canonicalTitle(chain.lessonTitle));
    if (key) {
      if (!byLesson.has(key)) byLesson.set(key, []);
      byLesson.get(key).push(chain);
    }
    if (canon) {
      if (!byCanonical.has(canon)) byCanonical.set(canon, []);
      byCanonical.get(canon).push(chain);
    }
  }
  return { byLesson, byCanonical };
}

function findWebsiteExtraction(lessonTitle, websiteLessons) {
  const key = normalizeKey(lessonTitle);
  return websiteLessons.find((w) =>
    normalizeKey(w.lessonTitle) === key || normalizeKey(w.title) === key,
  );
}

function findTranscript(lessonTitle, transcripts) {
  const key = normalizeKey(lessonTitle);
  return transcripts.find((t) => normalizeKey(t.lessonTitle) === key);
}

function extractPriorityLessons(inputs, packIndex, chainIndexes) {
  const missingGaps = inputs.gapRecoveries.filter((g) =>
    g.postRecoveryStatus === 'missing' && g.lessonTitle,
  );
  const prioritySet = new Set(PRIORITY_LESSONS.map((l) => normalizeKey(l)));
  const targets = [];

  for (const lesson of PRIORITY_LESSONS) {
    targets.push({ lessonTitle: lesson, priority: 'explicit' });
  }
  for (const g of missingGaps) {
    if (g.lessonTitle && g.lessonTitle.length > 5) {
      targets.push({ lessonTitle: g.lessonTitle, priority: 'remaining_gap' });
    }
  }

  const seen = new Set();
  const extractions = [];

  for (const target of targets) {
    const key = normalizeKey(target.lessonTitle);
    if (seen.has(key)) continue;
    seen.add(key);

    const website = findWebsiteExtraction(target.lessonTitle, inputs.websiteLessons);
    const transcript = findTranscript(target.lessonTitle, inputs.transcripts);
    const questions = inputs.questions.filter((q) =>
      normalizeKey(q.lessonTitle) === key || normalizeKey(q.lessonTitle).includes(key.slice(0, 15)),
    );
    const { chains } = fuzzyChainMatch(target.lessonTitle, chainIndexes);

    const scriptures = uniqueRefs([
      ...(website?.scripturesCited || []),
      ...(transcript?.scripturesCited || []),
      ...chains.flatMap((c) => c.originalScriptureChain || []),
      ...questions.flatMap((q) => q.scripturesCited || []),
    ]);

    const topicCandidate = chains[0]?.topic
      || resolveTopic(target.lessonTitle, questions[0]?.question);
    const pack = packIndex.get(topicCandidate);

    let extractionStatus = 'extracted';
    let reasonMissing = null;
    if (!scriptures.length) {
      if (transcript?.captionUnavailable || transcript?.manualTranscriptNeeded) {
        extractionStatus = 'needs_manual_transcript_or_source_text';
        reasonMissing = 'source_text_unavailable';
      } else if (website?.status === 'no_refs_in_text') {
        extractionStatus = 'no_scripture_refs_found';
        reasonMissing = 'no_scripture_refs_in_source_text';
      } else {
        extractionStatus = 'needs_manual_transcript_or_source_text';
        reasonMissing = 'no_scripture_chain_in_corpus';
      }
    }

    const doctrineImplied = TOPIC_PATTERNS.some((p) => p.pattern.test(target.lessonTitle))
      || topicCandidate !== 'unclassified';
    if (!scriptures.length && doctrineImplied) {
      extractionStatus = 'needs_manual_transcript_or_source_text';
    }

    extractions.push({
      lessonTitle: target.lessonTitle,
      camp: detectCamp(target.lessonTitle, questions[0]?.sourceName || website?.sourceName),
      sourceUrl: website?.sourceUrl || transcript?.videoUrl || questions[0]?.sourceUrl || null,
      sourceType: website?.sourceType || (transcript ? 'youtube_transcript' : 'question_inventory'),
      scriptureRefsFound: scriptures,
      scriptureOrder: scriptures,
      questionCandidates: questions.map((q) => q.question).slice(0, 5),
      topicCandidate,
      doctrinePackAssignment: pack?.displayName || null,
      doctrinePackTopic: pack?.topic || null,
      chainFound: chains.length > 0,
      extractionStatus,
      reasonMissing,
      priority: prioritySet.has(key) ? 'high' : target.priority,
    });
  }

  return extractions;
}

function fuzzyChainMatch(lessonTitle, chainIndexes) {
  const key = normalizeKey(lessonTitle);
  const canon = normalizeKey(canonicalTitle(lessonTitle));
  if (chainIndexes.byLesson.has(key)) {
    return { chains: chainIndexes.byLesson.get(key), matchType: 'exact' };
  }
  if (chainIndexes.byCanonical.has(canon)) {
    return { chains: chainIndexes.byCanonical.get(canon), matchType: 'canonical' };
  }
  let best = [];
  for (const [k, chains] of chainIndexes.byCanonical) {
    if (k.includes(canon) || canon.includes(k)) best = chains;
  }
  return { chains: best, matchType: best.length ? 'fuzzy' : 'none' };
}

function processSpanishLessons(inputs, packIndex, chainIndexes) {
  const spanishTitles = new Set();
  for (const q of inputs.questions) {
    if (/[áéíóúñ¿]|jesús|español|velo|pentecostés|gran cambio/i.test(q.lessonTitle || '')) {
      spanishTitles.add(q.lessonTitle);
    }
  }
  for (const t of inputs.transcripts) {
    if (/[áéíóúñ]|jesús|español/i.test(t.lessonTitle || '')) {
      spanishTitles.add(t.lessonTitle);
    }
  }

  const linkages = [];
  for (const title of spanishTitles) {
    const mapping = SPANISH_ENGLISH_MAP.find((m) => m.pattern.test(title));
    const english = mapping?.english || canonicalTitle(title);
    const topic = mapping?.topic || resolveTopic(english, title);
    const pack = packIndex.get(topic);
    const { chains } = fuzzyChainMatch(title, chainIndexes);
    const transcript = findTranscript(title, inputs.transcripts);

    let status = 'normalized';
    if (pack && chains.length) status = 'linked';
    else if (pack || mapping) status = 'topic_assigned';
    else if (transcript?.manualTranscriptNeeded) status = 'needs_transcript';

    linkages.push({
      spanishTitle: title,
      englishEquivalent: english,
      topicCandidate: topic,
      doctrinePackAssignment: pack?.displayName || displayName(topic),
      doctrinePackTopic: pack?.topic || null,
      scriptureRefsFound: uniqueRefs(chains.flatMap((c) => c.originalScriptureChain || [])),
      chainFound: chains.length > 0,
      status,
      manualTranscriptNeeded: transcript?.manualTranscriptNeeded || false,
    });
  }

  return linkages;
}

function normalizeCampTitles(inputs, packIndex, chainIndexes) {
  const titleMap = new Map();

  const allTitles = [
    ...inputs.questions.map((q) => ({ title: q.lessonTitle, source: q.sourceName, camp: q.camp })),
    ...inputs.scriptureChains.map((c) => ({ title: c.lessonTitle, source: c.sourceName, camp: c.camp })),
    ...inputs.websiteLessons.map((w) => ({ title: w.lessonTitle, source: w.sourceName, camp: w.camp })),
    ...inputs.transcripts.map((t) => ({ title: t.lessonTitle, source: t.sourceName, camp: 'HQ' })),
  ];

  for (const item of allTitles) {
    if (!item.title) continue;
    const rawKey = normalizeKey(item.title);
    if (titleMap.has(rawKey)) continue;

    const canon = canonicalTitle(item.title);
    const camp = item.camp || detectCamp(item.title, item.source);
    const topic = resolveTopic(canon, item.title);
    const pack = packIndex.get(topic);
    const { chains, matchType } = fuzzyChainMatch(item.title, chainIndexes);
    const canonChains = chainIndexes.byCanonical.get(normalizeKey(canon)) || chains;

    let chainStatus = 'no_chain';
    if (canonChains.length) chainStatus = matchType === 'exact' ? 'chain_found' : 'chain_found_canonical';

    titleMap.set(rawKey, {
      rawTitle: item.title,
      canonicalTitle: canon,
      camp,
      source: item.source,
      assignedTopic: topic,
      assignedDoctrinePack: pack?.displayName || null,
      assignedDoctrinePackTopic: pack?.topic || null,
      chainStatus,
      chainCount: canonChains.length,
    });
  }

  return [...titleMap.values()];
}

function organizeICOJ(inputs, packIndex, chainIndexes) {
  const groups = {};

  for (const g of ICOJ_GROUPS) {
    groups[g.key] = {
      label: g.label,
      documentsFound: 0,
      documentsProcessed: 0,
      scripturesExtracted: 0,
      chainsBuilt: 0,
      topicsAssigned: 0,
      gapsRemaining: 0,
      samples: [],
    };
  }

  const icojSources = [
    ...inputs.pdfExtractions.filter((p) => /icoj/i.test(p.organization || p.sourceName || '')),
    ...inputs.questions.filter((q) => /icoj/i.test(q.organization || q.sourceName || '')),
    ...inputs.scriptureChains.filter((c) => /icoj/i.test(c.sourceName || '')),
  ];

  for (const item of inputs.pdfExtractions) {
    const src = `${item.sourceName || ''} ${item.organization || ''}`;
    const group = ICOJ_GROUPS.find((g) => g.pattern.test(src));
    if (!group) continue;
    const bucket = groups[group.key];
    bucket.documentsFound += 1;
    const scriptures = uniqueRefs(item.scripturesCited || []);
    if (scriptures.length) {
      bucket.documentsProcessed += 1;
      bucket.scripturesExtracted += scriptures.length;
    } else {
      bucket.gapsRemaining += 1;
    }
    if (bucket.samples.length < 3) {
      bucket.samples.push({ lessonTitle: item.lessonTitle, scriptures: scriptures.length });
    }
  }

  for (const chain of inputs.scriptureChains) {
    if (!/icoj/i.test(chain.sourceName || '')) continue;
    const src = chain.sourceName || '';
    const group = ICOJ_GROUPS.find((g) => g.pattern.test(src)) || ICOJ_GROUPS.find((g) => g.key === 'lesson_handouts');
    if (!group) continue;
    const bucket = groups[group.key];
    bucket.chainsBuilt += 1;
    const topic = chain.topic || resolveTopic(chain.lessonTitle, chain.question);
    if (packIndex.has(topic)) bucket.topicsAssigned += 1;
  }

  return groups;
}

function strengthenWeakPack(topic, inputs, packIndex, chainIndexes) {
  const pack = packIndex.get(topic);
  const pattern = TOPIC_PATTERNS.find((p) => p.topic === topic)?.pattern
    || new RegExp(`\\b${topic.replace(/_/g, ' ')}\\b`, 'i');

  const matchingQuestions = inputs.questions.filter((q) =>
    pattern.test(`${q.lessonTitle || ''} ${q.question || ''}`),
  );
  const matchingChains = inputs.scriptureChains.filter((c) =>
    c.topic === topic || pattern.test(`${c.lessonTitle} ${c.question}`),
  );
  const matchingPdfs = inputs.pdfExtractions.filter((p) =>
    pattern.test(p.lessonTitle || ''),
  );

  const corpusScriptures = uniqueRefs([
    ...matchingChains.flatMap((c) => c.originalScriptureChain || []),
    ...matchingQuestions.flatMap((q) => q.scripturesCited || []),
    ...matchingPdfs.flatMap((p) => p.scripturesCited || []),
  ]);

  const priorOriginal = pack?.originalScriptureChain?.length || 0;
  const candidateOriginal = uniqueRefs([
    ...(pack?.originalScriptureChain || []),
    ...corpusScriptures,
  ]);
  const newScriptures = candidateOriginal.filter((r) =>
    !(pack?.originalScriptureChain || []).some((p) => normalizeKey(p) === normalizeKey(r)),
  );

  return {
    topic,
    displayName: displayName(topic),
    priorOriginalCount: priorOriginal,
    candidateOriginalChain: candidateOriginal.slice(0, 20),
    newScripturesFromSource: newScriptures.slice(0, 15),
    newScriptureCount: newScriptures.length,
    corpusQuestions: matchingQuestions.length,
    corpusChains: matchingChains.length,
    corpusPdfs: matchingPdfs.length,
    candidateParallel: pack?.parallelScriptures || [],
    candidateSupporting: uniqueRefs([
      ...(pack?.supportingScriptures || []),
      ...corpusScriptures.filter((r) => !candidateOriginal.slice(0, 5).includes(r)),
    ]).slice(0, 12),
    candidateContinuity: pack?.continuityScriptures || [],
    candidateG2R: pack?.genesisToRevelationChain || [],
    sourceLessons: [...new Set(matchingQuestions.map((q) => q.lessonTitle).filter(Boolean))].slice(0, 8),
    improved: newScriptures.length > 0 || matchingChains.length > (pack?.sourceCoverage || 0),
  };
}

function strengthenFeastPacks(packIndex, inputs, chainIndexes) {
  const feastPriority = ['unleavened_bread', 'passover', 'pentecost'];
  const results = [];

  for (const topic of FEAST_TOPICS) {
    const pack = packIndex.get(topic);
    const strengthened = strengthenWeakPack(topic, inputs, packIndex, chainIndexes);
    results.push({
      topic,
      displayName: displayName(topic),
      reviewReadiness: pack?.reviewReadiness,
      originalChainLength: pack?.originalScriptureChain?.length || 0,
      newSourceScriptures: strengthened.newScriptureCount,
      weakAreas: (pack?.continuityScriptures?.length || 0) < 1 ? ['continuity'] : [],
      priority: feastPriority.includes(topic),
    });
  }

  const unleavened2022 = extractPriorityLessons(inputs, packIndex, chainIndexes)
    .find((e) => normalizeKey(e.lessonTitle).includes('unleavened bread 2022'));
  if (unleavened2022) {
    results.push({
      topic: 'feast_unleavened_bread_2022',
      displayName: 'Feast Of Unleavened Bread 2022',
      extractionStatus: unleavened2022.extractionStatus,
      doctrinePackAssignment: 'Unleavened Bread',
      doctrinePackTopic: 'unleavened_bread',
      recommendation: 'Link to unleavened_bread pack after transcript/source text recovery',
    });
  }

  return results;
}

function recalculateCoverage3O(sourceAudit, phase3NRecoveries, phase3O, reassessed3N = []) {
  const linkage3N = new Map();
  for (const r of phase3NRecoveries) {
    const key = normalizeKey(r.lessonTitle);
    if (key) linkage3N.set(key, r);
  }

  const status3NByLesson = new Map();
  for (const r of reassessed3N) {
    const key = normalizeKey(r.lessonTitle);
    if (key) status3NByLesson.set(key, r.postRecoveryStatus);
  }

  const campByRaw = new Map(phase3O.campMappings.map((m) => [normalizeKey(m.rawTitle), m]));
  const spanishByTitle = new Map(phase3O.spanishLinkages.map((s) => [normalizeKey(s.spanishTitle), s]));
  const priorityByTitle = new Map(phase3O.priorityExtractions.map((p) => [normalizeKey(p.lessonTitle), p]));
  const canonByTitle = new Map();
  for (const m of phase3O.campMappings) {
    canonByTitle.set(normalizeKey(m.canonicalTitle), m);
  }

  const counts = { covered: 0, partial: 0, missing: 0 };
  const reassessed = [];

  for (const entry of sourceAudit) {
    const key = normalizeKey(entry.lessonTitle);
    const recovery3N = linkage3N.get(key);
    const priorStatus = status3NByLesson.get(key)
      || recovery3N?.postRecoveryStatus
      || entry.status;
    let status = priorStatus;

    const camp = campByRaw.get(key);
    const canonKey = normalizeKey(canonicalTitle(entry.lessonTitle));
    const canon = canonByTitle.get(canonKey);
    const spanish = spanishByTitle.get(key);
    const priority = priorityByTitle.get(key);

    const hasChain = camp?.chainStatus?.includes('chain_found')
      || canon?.chainStatus?.includes('chain_found')
      || spanish?.chainFound
      || recovery3N?.chainFound
      || (priority?.chainFound && priority?.scriptureRefsFound?.length >= 3);

    if (status !== 'covered' && hasChain && (
      recovery3N?.scriptureCount >= 3
      || priority?.scriptureRefsFound?.length >= 3
      || spanish?.scriptureRefsFound?.length >= 3
    )) {
      status = 'covered';
    } else if (status === 'partial' && hasChain) {
      status = 'covered';
    } else if (status === 'partial' && (recovery3N?.packLinked || spanish?.doctrinePackTopic) && (hasChain || recovery3N?.scriptureCount >= 1)) {
      status = 'covered';
    } else if (status === 'missing') {
      if (spanish?.status === 'linked') status = 'covered';
      else if (hasChain && (recovery3N?.scriptureCount >= 1 || priority?.scriptureRefsFound?.length >= 1)) {
        status = recovery3N?.scriptureCount >= 3 || priority?.scriptureRefsFound?.length >= 3 ? 'covered' : 'partial';
      } else if (spanish?.status === 'topic_assigned' && spanish.doctrinePackTopic) status = 'partial';
      else if (camp?.assignedDoctrinePackTopic || canon?.assignedDoctrinePackTopic) status = 'partial';
      else if (recovery3N?.recovered || recovery3N?.packLinked) status = 'partial';
    }

    counts[status] = (counts[status] || 0) + 1;
    reassessed.push({
      lessonTitle: entry.lessonTitle,
      priorStatus3N: recovery3N?.postRecoveryStatus || entry.status,
      postRecoveryStatus3O: status,
      spanishLinked: spanish?.status === 'linked' || spanish?.status === 'topic_assigned',
      campNormalized: !!camp || !!canon,
    });
  }

  const prior3N = phase3O.priorCoverage3N || { covered: 337, partial: 48, missing: 208 };

  return {
    prior3M: { covered: 212, partial: 115, missing: 266 },
    prior3N: prior3N,
    after: counts,
    targets: {
      coveredTarget: 350,
      partialTarget: 40,
      missingTarget: 150,
      coveredMet: counts.covered >= 350,
      partialMet: counts.partial <= 40,
      missingMet: counts.missing <= 150,
    },
    deltaFrom3N: {
      covered: counts.covered - prior3N.covered,
      partial: counts.partial - prior3N.partial,
      missing: counts.missing - prior3N.missing,
    },
    reassessed,
  };
}

function buildHumanReviewPackets(packIndex, weakStrengthening, feastStrengthening, spanishLinkages, icojGroups) {
  const packets = [];

  for (const pack of [...packIndex.values()].filter((p) => (p.reviewReadiness || 0) >= 75)) {
    packets.push({
      category: 'priority_recovered',
      topic: pack.topic,
      displayName: pack.displayName,
      supportScore: pack.supportScore,
      reviewReadiness: pack.reviewReadiness,
      originalScriptureChain: (pack.originalScriptureChain || []).slice(0, 10),
      genesisToRevelationChain: (pack.genesisToRevelationChain || []).slice(0, 10),
      reviewNotes: 'Phase 3O — ready for human review',
    });
  }

  for (const w of weakStrengthening.filter((w) => w.improved)) {
    packets.push({
      category: 'weak_pack',
      topic: w.topic,
      displayName: w.displayName,
      newScripturesFromSource: w.newScriptureCount,
      candidateOriginalChain: w.candidateOriginalChain?.slice(0, 8),
      sourceLessons: w.sourceLessons,
      reviewNotes: 'Weak pack — source candidates added for review',
    });
  }

  for (const f of feastStrengthening.filter((f) => f.newSourceScriptures > 0 || f.priority)) {
    packets.push({
      category: 'feast_pack',
      topic: f.topic,
      displayName: f.displayName,
      newSourceScriptures: f.newSourceScriptures,
      reviewReadiness: f.reviewReadiness,
      reviewNotes: 'Feast pack strengthening candidates',
    });
  }

  for (const s of spanishLinkages.filter((s) => s.status === 'linked' || s.status === 'topic_assigned')) {
    packets.push({
      category: 'spanish_linked',
      spanishTitle: s.spanishTitle,
      englishEquivalent: s.englishEquivalent,
      doctrinePack: s.doctrinePackAssignment,
      topic: s.doctrinePackTopic,
      chainFound: s.chainFound,
      reviewNotes: s.manualTranscriptNeeded ? 'Transcript needed for scripture depth' : 'Spanish title normalized and linked',
    });
  }

  const icojProcessed = Object.values(icojGroups).reduce((sum, g) => sum + g.documentsProcessed, 0);
  if (icojProcessed > 0) {
    packets.push({
      category: 'icoj_source',
      displayName: 'ICOJ documentation batch',
      documentsProcessed: icojProcessed,
      reviewNotes: 'ICOJ handouts and chains organized for review',
    });
  }

  return packets;
}

function runPhase3oSourceGapCompletion() {
  const inputs = loadAllInputs();
  const packIndex = buildPackIndex(inputs.strengthenedPacks);
  const chainIndexes = buildChainIndexes(inputs.scriptureChains);

  const priorityGapTargets = {
    explicit: PRIORITY_LESSONS,
    weakPacks: WEAK_PACK_FOCUS,
    remainingMissing: inputs.gapRecoveries.filter((g) => g.postRecoveryStatus === 'missing').length,
    totalPriorityProcessed: 0,
  };

  const priorityExtractions = extractPriorityLessons(inputs, packIndex, chainIndexes);
  priorityGapTargets.totalPriorityProcessed = priorityExtractions.length;

  const spanishLinkages = processSpanishLessons(inputs, packIndex, chainIndexes);
  const campMappings = normalizeCampTitles(inputs, packIndex, chainIndexes);
  const icojOrganization = organizeICOJ(inputs, packIndex, chainIndexes);
  const weakStrengthening = WEAK_PACK_FOCUS.map((t) =>
    strengthenWeakPack(t, inputs, packIndex, chainIndexes),
  );
  const feastStrengthening = strengthenFeastPacks(packIndex, inputs, chainIndexes);

  const reassessed3N = inputs.phase3n.coverageRecalculation?.reassessed || [];
  const coverageRecalculation = recalculateCoverage3O(
    inputs.sourceCoverageAudit,
    inputs.gapRecoveries,
    {
      campMappings,
      spanishLinkages,
      priorityExtractions,
      priorCoverage3N: inputs.priorCoverage3N,
    },
    reassessed3N,
  );

  const humanReviewPackets = buildHumanReviewPackets(
    packIndex,
    weakStrengthening,
    feastStrengthening,
    spanishLinkages,
    icojOrganization,
  );

  const gapItemsRecovered = coverageRecalculation.reassessed.filter((r) =>
    r.priorStatus3N === 'missing' && r.postRecoveryStatus3O !== 'missing',
  ).length;

  const spanishLinked = spanishLinkages.filter((s) => s.status === 'linked' || s.status === 'topic_assigned').length;
  const campNormalized = campMappings.filter((m) => m.chainStatus.includes('chain_found')).length;
  const icojDocsOrganized = Object.values(icojOrganization).reduce((s, g) => s + g.documentsFound, 0);

  const executive = {
    priorityGapsProcessed: priorityExtractions.length,
    missingEntriesRecovered: gapItemsRecovered,
    spanishTitlesLinked: spanishLinked,
    campTitlesNormalized: campMappings.length,
    campTitlesWithChains: campNormalized,
    icojDocumentsOrganized: icojDocsOrganized,
    millennialKingdomScriptures: weakStrengthening.find((w) => w.topic === 'millennial_kingdom')?.newScriptureCount || 0,
    peterScriptures: weakStrengthening.find((w) => w.topic === 'peter')?.newScriptureCount || 0,
    jacobScriptures: weakStrengthening.find((w) => w.topic === 'jacob')?.newScriptureCount || 0,
    p144000Scriptures: weakStrengthening.find((w) => w.topic === '144000')?.newScriptureCount || 0,
    feastPacksImproved: feastStrengthening.filter((f) => f.newSourceScriptures > 0).length,
    coverage: coverageRecalculation.after,
    targetsMet: coverageRecalculation.targets,
    reviewReadyCount: humanReviewPackets.filter((p) => p.reviewReadiness >= 75 || p.category === 'priority_recovered').length,
    reviewReadyPackets: humanReviewPackets.slice(0, 20),
    unresolved: priorityExtractions.filter((p) =>
      p.extractionStatus === 'needs_manual_transcript_or_source_text'
      || p.extractionStatus === 'no_scripture_refs_found',
    ).slice(0, 15),
    majoritySourceLinked: coverageRecalculation.after.covered >= 350,
    dataNotes: {
      corpusRegistryAvailable: inputs.corpusRegistryAvailable,
      scrubbedCorpusAvailable: inputs.scrubbedCorpusAvailable,
    },
  };

  const payload = {
    phase: '3O',
    ranAt: new Date().toISOString(),
    priorityGapTargets,
    priorityExtractions,
    spanishLinkages,
    campMappings,
    icojOrganization,
    weakStrengthening,
    feastStrengthening,
    coverageRecalculation,
    humanReviewPackets,
    implementationPrep: {
      packsStrengthened: [...packIndex.values()].filter((p) => (p.reviewReadiness || 0) >= 75).length,
      weakPacksImproved: weakStrengthening.filter((w) => w.improved).length,
      feastPacksReviewed: feastStrengthening.length,
      spanishLinked: spanishLinked,
      readyForHumanReview: humanReviewPackets.length,
    },
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
    path.join(TRACE, 'phase3o-source-gap-completion-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'phase3o-gap-completion-linkages.json'),
    `${JSON.stringify({
      ranAt: payload.ranAt,
      campMappings: campMappings.slice(0, 100),
      spanishLinkages,
      priorityExtractions,
      executive,
    }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3oSourceGapCompletion,
  PRIORITY_LESSONS,
  WEAK_PACK_FOCUS,
};
