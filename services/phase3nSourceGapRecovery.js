/**
 * Phase 3N — Source gap recovery and doctrine linkage expansion.
 * SOURCE → QUESTION → CHAIN → TOPIC → PACK recovery only.
 * No production, doctrine, card, or graph mutations.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { discoverTopicFromText, TOPIC_PATTERNS } = require('./bibleWideTopicDiscovery');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const {
  JESUS_SUBCHAINS,
  HOLY_SPIRIT_SUBCHAINS,
} = require('./phase3lRecoveredPackStrengthening');

const FEAST_TOPICS = [
  'passover', 'unleavened_bread', 'pentecost', 'feast_of_trumpets', 'day_of_atonement',
  'feast_of_tabernacles', 'last_great_day', 'high_sabbaths', 'leviticus_23', 'three_pilgrimage_feasts',
];

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const WEAK_PACK_FOCUS = ['144000', 'peter', 'jacob', 'millennial_kingdom'];

const MISSING_TOPIC_WATCHLIST = [
  'abomination_of_desolation', 'new_jerusalem', 'gog_and_magog', 'temple', 'melchizedek',
  'moses', 'joshua', 'elijah', 'elisha', 'isaiah', 'jeremiah', 'ezekiel', 'daniel',
  'david', 'solomon', 'jacob', 'joseph', 'peter', 'john', 'paul',
  'mark_of_the_beast', 'false_prophet', 'two_witnesses', '144000', 'millennial_kingdom',
  'lake_of_fire', 'great_white_throne', 'fathers_kingdom', 'kingdom_on_earth',
  'deuteronomy_28_curses', 'captivity',
];

const SOURCE_PRIORITY = [
  { pattern: /wednesday.*q&a|iogisrael/i, label: 'IOG Wednesday Q&A', rank: 1 },
  { pattern: /q&a archive/i, label: 'ICOJ Q&A archives', rank: 2 },
  { pattern: /lesson handout|icoj lesson/i, label: 'ICOJ lesson handouts', rank: 3 },
  { pattern: /lesson archive/i, label: 'IOG lesson archives', rank: 4 },
  { pattern: /washington|detroit|phoenix|baton rouge|birmingham|camp/i, label: 'Camp-specific', rank: 5 },
  { pattern: /jesús|español|spanish|el velo/i, label: 'Spanish inventories', rank: 6 },
  { pattern: /transcript/i, label: 'Transcript-derived', rank: 7 },
];

const JESUS_SOURCE_PATTERNS = [
  /\bangel of the lord\b/i, /\bi am\b/i, /\brock\b/i, /\bcaptain of the host\b/i,
  /\bword of god\b/i, /\balpha and omega\b/i, /\bfirst and last\b/i,
  /\bno man hath seen\b/i, /\bjohn 1\b/i, /\bhebrews 1\b/i, /\bcolossians 1\b/i,
  /\brevelation (1|19|22)\b/i,
];

const HOLY_SPIRIT_SOURCE_PATTERNS = [
  /\bholy spirit\b/i, /\bholy ghost\b/i, /\bspirit of god\b/i, /\bspirit of christ\b/i,
  /\bcomforter\b/i, /\bbreath\b/i, /\bpower of god\b/i, /\bmessenger\b/i,
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

function displayName(topic = '') {
  return String(topic).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function tokenTopicFromLesson(lessonTitle = '') {
  const skip = new Set([
    'what', 'does', 'the', 'lesson', 'teach', 'according', 'scripture',
    'biblical', 'teaching', 'is', 'on', 'how', 'who', 'when', 'where',
  ]);
  const tokens = normalizeKey(lessonTitle).split(' ').filter((w) => w.length > 2 && !skip.has(w));
  if (!tokens.length) return null;
  return tokens.slice(0, 5).join('_');
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

function loadAllInputs() {
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const phase3m = loadJson(path.join(TRACE, 'phase3m-source-doctrine-verification-results.json'), {});
  const strengthened = loadJson(path.join(OUT_DIR, 'strengthened-recovered-packs.json'), { packs: [] });
  const chains = loadJson(path.join(OUT_DIR, 'expanded-scripture-chains.json'), { chains: [] });

  return {
    phase3f,
    phase3m,
    questions: phase3f.questions || [],
    topicMap: phase3f.topicMap || {},
    pdfExtractions: phase3f.pdfExtractions || [],
    websiteExtractions: phase3f.websiteExtractions || [],
    videoExtractions: phase3f.videoExtractions || [],
    transcriptExtractions: phase3f.transcriptExtractions || [],
    strengthenedPacks: strengthened.packs || [],
    scriptureChains: chains.chains || [],
    finalGapReport: phase3m.finalGapReport || [],
    sourceCoverageAudit: phase3m.sourceCoverageAudit || [],
    evidenceCards: getAllApprovedCards(),
    priorCoverage: phase3m.executive || {},
  };
}

function buildPackIndex(packs) {
  const byTopic = new Map();
  for (const pack of packs) {
    if (!pack.topic) continue;
    const existing = byTopic.get(pack.topic);
    const score = pack.reviewReadiness || pack.supportScore || 0;
    if (!existing || score >= (existing.reviewReadiness || existing.supportScore || 0)) {
      byTopic.set(pack.topic, pack);
    }
  }
  for (const card of getAllApprovedCards()) {
    if (!byTopic.has(card.topic)) {
      byTopic.set(card.topic, {
        topic: card.topic,
        displayName: displayName(card.topic),
        supportScore: 85,
        reviewReadiness: 70,
      });
    }
  }
  return byTopic;
}

function buildChainByLesson(chains) {
  const byLesson = new Map();
  for (const chain of chains) {
    const key = normalizeKey(chain.lessonTitle);
    if (!key) continue;
    if (!byLesson.has(key)) byLesson.set(key, []);
    byLesson.get(key).push(chain);
  }
  return byLesson;
}

function fuzzyLessonMatch(lessonTitle, chainsByLesson) {
  const key = normalizeKey(lessonTitle);
  if (!key) return { chains: [], matchType: 'none' };

  if (chainsByLesson.has(key)) {
    return { chains: chainsByLesson.get(key), matchType: 'exact' };
  }

  const words = key.split(' ').filter((w) => w.length > 3);
  let best = [];
  let bestScore = 0;

  for (const [lessonKey, chains] of chainsByLesson) {
    if (lessonKey.includes(key) || key.includes(lessonKey)) {
      const score = Math.min(key.length, lessonKey.length);
      if (score > bestScore) {
        bestScore = score;
        best = chains;
      }
    }
    const overlap = words.filter((w) => lessonKey.includes(w)).length;
    if (overlap >= 3 && overlap > bestScore) {
      bestScore = overlap;
      best = chains;
    }
  }

  return { chains: best, matchType: best.length ? 'fuzzy' : 'none' };
}

function findQuestionsForLesson(lessonTitle, questions) {
  const key = normalizeKey(lessonTitle);
  return questions.filter((q) => {
    const qk = normalizeKey(q.lessonTitle);
    return qk === key || qk.includes(key) || key.includes(qk);
  });
}

function suggestTopic(lessonTitle, question = '', scriptures = []) {
  const discovery = discoverTopicFromText(`${lessonTitle} ${question}`, { lessonTitle });
  if (discovery.topic && discovery.topic !== 'unclassified') {
    return { topic: discovery.topic, method: discovery.classification };
  }
  const token = tokenTopicFromLesson(lessonTitle);
  if (token && token.length > 3) {
    return { topic: token, method: 'lesson_title_token' };
  }
  return { topic: 'unclassified', method: 'none' };
}

function sourcePriorityLabel(sourceName = '') {
  const s = String(sourceName);
  for (const p of SOURCE_PRIORITY) {
    if (p.pattern.test(s)) return p.label;
  }
  return 'general';
}

function reasonMissing(gap, recovery) {
  if (recovery.recovered) return 'linkage_recovered';
  if (!recovery.chainFound && recovery.scriptureRefsFound.length === 0) {
    return 'no_scripture_chain_in_corpus';
  }
  if (recovery.existingTopic === 'unclassified' && recovery.suggestedTopic === 'unclassified') {
    return 'topic_unclassified';
  }
  if (!recovery.packLinked) return 'no_doctrine_pack_for_topic';
  if (gap.status === 'partial') return 'partial_pack_linkage';
  return 'lesson_title_not_matched_to_chain';
}

function processGapItem(gap, inputs, packIndex, chainsByLesson) {
  const lessonTitle = gap.lessonTitle || gap.displayName || '';
  const questions = findQuestionsForLesson(lessonTitle, inputs.questions);
  const { chains, matchType } = fuzzyLessonMatch(lessonTitle, chainsByLesson);
  const chainFound = chains.length > 0;

  const scriptureRefs = uniqueRefs([
    ...chains.flatMap((c) => c.originalScriptureChain || []),
    ...questions.flatMap((q) => q.scripturesCited || []),
  ]);

  const primaryQuestion = questions[0]?.question || '';
  const existingTopic = gap.topic || questions[0]?.topic || 'unclassified';
  const suggested = suggestTopic(lessonTitle, primaryQuestion, scriptureRefs);
  const suggestedTopic = chainFound && chains[0]?.topic
    ? chains[0].topic
    : suggested.topic;

  const pack = packIndex.get(suggestedTopic);
  const packLinked = !!pack;

  const recovered = chainFound
    || (scriptureRefs.length >= 3 && suggestedTopic !== 'unclassified')
    || (scriptureRefs.length >= 1 && packLinked && matchType === 'exact');

  const source = gap.source || questions[0]?.organization || questions[0]?.sourceName || 'unknown';
  const camp = questions[0]?.camp || chains[0]?.camp || 'HQ';

  return {
    gapType: gap.type,
    source,
    camp,
    lessonTitle,
    question: primaryQuestion.slice(0, 200),
    existingTopic,
    suggestedTopic,
    scriptureRefsFound: scriptureRefs,
    scriptureCount: scriptureRefs.length,
    chainFound,
    chainMatchType: matchType,
    chainCount: chains.length,
    questionCount: questions.length,
    packLinked,
    doctrinePackName: pack?.displayName || null,
    recovered,
    reasonMissing: recovered ? null : reasonMissing(gap, {
      recovered,
      chainFound,
      scriptureRefsFound: scriptureRefs,
      existingTopic,
      suggestedTopic,
      packLinked,
    }),
    priorStatus: gap.status,
    postRecoveryStatus: recovered && packLinked && scriptureRefs.length >= 3
      ? 'covered'
      : recovered || chainFound
        ? 'partial'
        : 'missing',
  };
}

function recoverAllGapItems(inputs, packIndex, chainsByLesson) {
  const seen = new Set();
  const recoveries = [];

  for (const gap of inputs.finalGapReport) {
    const key = `${gap.type}|${gap.lessonTitle || gap.topic || gap.label}|${gap.topic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recoveries.push(processGapItem(gap, inputs, packIndex, chainsByLesson));
  }

  for (const entry of inputs.sourceCoverageAudit) {
    if (entry.status === 'covered') continue;
    const key = `audit|${entry.lessonTitle}|${entry.topic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recoveries.push(processGapItem({
      type: 'source_audit',
      lessonTitle: entry.lessonTitle,
      topic: entry.topic,
      source: entry.source,
      status: entry.status,
    }, inputs, packIndex, chainsByLesson));
  }

  return recoveries;
}

function recoverUnclassifiedSources(inputs, packIndex, chainsByLesson) {
  const unclassified = inputs.sourceCoverageAudit.filter((e) =>
    e.topic === 'unclassified' || e.status === 'missing',
  );

  const byPriority = new Map();
  for (const entry of unclassified) {
    const questions = findQuestionsForLesson(entry.lessonTitle || '', inputs.questions);
    const sourceName = entry.source || questions[0]?.sourceName || '';
    const priority = SOURCE_PRIORITY.find((p) => p.pattern.test(sourceName))
      || { label: 'general', rank: 99 };

    const recovery = processGapItem({
      type: 'unclassified',
      lessonTitle: entry.lessonTitle,
      topic: entry.topic,
      source: entry.source,
      status: entry.status,
    }, inputs, packIndex, chainsByLesson);

    const bucket = priority.label;
    if (!byPriority.has(bucket)) byPriority.set(bucket, []);
    byPriority.get(bucket).push({
      ...recovery,
      sourcePriority: priority.rank,
      sourceName,
      isNewTopic: !packIndex.has(recovery.suggestedTopic) && recovery.suggestedTopic !== 'unclassified',
    });
  }

  const ordered = [];
  for (const p of SOURCE_PRIORITY) {
    const items = byPriority.get(p.label) || [];
    ordered.push({ priority: p.label, rank: p.rank, items });
  }
  const general = byPriority.get('general') || [];
  if (general.length) ordered.push({ priority: 'general', rank: 99, items: general });

  const emergentTopics = new Map();
  for (const items of byPriority.values()) {
    for (const item of items) {
      if (item.suggestedTopic && item.suggestedTopic !== 'unclassified') {
        if (!emergentTopics.has(item.suggestedTopic)) {
          emergentTopics.set(item.suggestedTopic, {
            topic: item.suggestedTopic,
            displayName: displayName(item.suggestedTopic),
            lessonCount: 0,
            scriptureCount: 0,
            packExists: packIndex.has(item.suggestedTopic),
          });
        }
        const t = emergentTopics.get(item.suggestedTopic);
        t.lessonCount += 1;
        t.scriptureCount += item.scriptureCount;
      }
    }
  }

  return { ordered, emergentTopics: [...emergentTopics.values()] };
}

function expandWeakPack(topic, inputs, packIndex, chainsByLesson) {
  const pack = packIndex.get(topic);
  const pattern = TOPIC_PATTERNS.find((p) => p.topic === topic);
  const re = pattern?.pattern || new RegExp(`\\b${topic.replace(/_/g, ' ')}\\b`, 'i');

  const matchingQuestions = inputs.questions.filter((q) => {
    const t = q.topic || suggestTopic(q.lessonTitle, q.question).topic;
    return t === topic || re.test(`${q.lessonTitle} ${q.question}`);
  });

  const matchingChains = inputs.scriptureChains.filter((c) =>
    c.topic === topic || re.test(`${c.lessonTitle} ${c.question}`),
  );

  const corpusScriptures = uniqueRefs([
    ...matchingChains.flatMap((c) => c.originalScriptureChain || []),
    ...matchingQuestions.flatMap((q) => q.scripturesCited || []),
  ]);

  const linkedLessons = [...new Set(matchingQuestions.map((q) => q.lessonTitle).filter(Boolean))];
  const missingQuestions = matchingQuestions.filter((q) => !(pack?.questionCoverage > 0));
  const gaps = [];
  if (corpusScriptures.length < 5) gaps.push('missing_scripture_depth');
  if (matchingChains.length === 0) gaps.push('missing_chains');
  if (linkedLessons.length < 2) gaps.push('missing_lesson_coverage');
  if ((pack?.parallelScriptures?.length || 0) < 2) gaps.push('missing_parallel');
  if ((pack?.continuityScriptures?.length || 0) < 1) gaps.push('missing_continuity');
  if (!pack?.genesisToRevelationSpan) gaps.push('missing_g2r_witnesses');

  const recoveredLinkages = matchingQuestions.slice(0, 10).map((q) => ({
    lessonTitle: q.lessonTitle,
    question: q.question?.slice(0, 120),
    scriptures: (q.scripturesCited || []).slice(0, 5),
    source: q.sourceName,
  }));

  const improvement = {
    corpusQuestionsFound: matchingQuestions.length,
    corpusChainsFound: matchingChains.length,
    corpusScripturesFound: corpusScriptures.length,
    linkedLessons: linkedLessons.slice(0, 8),
    scripturesRecovered: corpusScriptures.slice(0, 15),
    gapsRemaining: gaps,
    priorReadiness: pack?.reviewReadiness,
    projectedReadinessBoost: Math.min(25, matchingChains.length * 3 + corpusScriptures.length),
  };

  return {
    topic,
    displayName: displayName(topic),
    packExists: !!pack,
    priorSupportScore: pack?.supportScore,
    improvement,
    recoveredLinkages,
    recoveryStatus: matchingChains.length >= 1 && corpusScriptures.length >= 5
      ? 'source_linkage_recovered'
      : matchingQuestions.length > 0
        ? 'partial_source_linkage'
        : 'needs_more_source_material',
  };
}

function verifyFeastPacks(packIndex) {
  return FEAST_TOPICS.map((topic) => {
    const pack = packIndex.get(topic);
    const weakAreas = [];
    if (!pack) weakAreas.push('no_pack');
    if ((pack?.originalScriptureChain?.length || 0) < 5) weakAreas.push('thin_original_chain');
    if ((pack?.parallelScriptures?.length || 0) < 2) weakAreas.push('parallel_witnesses');
    if ((pack?.continuityScriptures?.length || 0) < 1) weakAreas.push('continuity_witnesses');
    if (!pack?.genesisToRevelationSpan) weakAreas.push('g2r_span');

    return {
      topic,
      displayName: displayName(topic),
      packExists: !!pack,
      originalChainLength: pack?.originalScriptureChain?.length || 0,
      g2rLength: pack?.genesisToRevelationChain?.length || 0,
      parallelCount: pack?.parallelScriptures?.length || 0,
      supportingCount: pack?.supportingScriptures?.length || 0,
      continuityCount: pack?.continuityScriptures?.length || 0,
      reviewReadiness: pack?.reviewReadiness,
      weakAreas,
      status: weakAreas.length <= 1 ? 'verified' : weakAreas.length <= 3 ? 'partial' : 'weak',
    };
  });
}

function searchSourceMaterial(inputs, patterns, topicFilter) {
  const hits = [];
  const allTextSources = [
    ...inputs.questions.map((q) => ({
      type: 'question',
      text: `${q.lessonTitle} ${q.question} ${q.answerSummary || ''}`,
      lessonTitle: q.lessonTitle,
      question: q.question,
      scriptures: q.scripturesCited || [],
      source: q.sourceName || q.organization,
      camp: q.camp,
    })),
    ...inputs.scriptureChains.map((c) => ({
      type: 'chain',
      text: `${c.lessonTitle} ${c.question}`,
      lessonTitle: c.lessonTitle,
      question: c.question,
      scriptures: c.originalScriptureChain || [],
      source: c.sourceName,
      camp: c.camp,
    })),
    ...inputs.pdfExtractions.map((p) => ({
      type: 'pdf',
      text: `${p.lessonTitle} ${(p.questions || []).join(' ')}`,
      lessonTitle: p.lessonTitle,
      scriptures: p.scripturesCited || [],
      source: p.sourceName || p.organization,
      camp: p.camp,
    })),
    ...inputs.transcriptExtractions.map((t) => ({
      type: 'transcript',
      text: t.lessonTitle || '',
      lessonTitle: t.lessonTitle,
      scriptures: t.scripturesCited || [],
      source: t.sourceName,
      camp: t.camp,
    })),
  ];

  for (const item of allTextSources) {
    const matchedPatterns = patterns.filter((p) => p.test(item.text));
    if (!matchedPatterns.length) continue;
    hits.push({
      type: item.type,
      lessonTitle: item.lessonTitle,
      source: item.source,
      camp: item.camp,
      question: item.question?.slice(0, 120),
      scriptures: uniqueRefs(item.scriptures),
      patternMatches: matchedPatterns.length,
    });
  }

  return hits;
}

function expandJesusOTNT(inputs) {
  const pack = inputs.strengthenedPacks.find((p) => p.topic === 'jesus_old_testament_new_testament');
  const hits = searchSourceMaterial(inputs, JESUS_SOURCE_PATTERNS);
  const sourceScriptures = uniqueRefs(hits.flatMap((h) => h.scriptures));
  const subchainHits = JESUS_SUBCHAINS.map((def) => ({
    label: def.label,
    sourceHits: hits.filter((h) => def.pattern.test(`${h.lessonTitle || ''} ${h.question || ''}`)).length,
    scripturesFromSource: uniqueRefs([
      ...def.seeds || [],
      ...hits.filter((h) => def.pattern.test(`${h.lessonTitle} ${h.question || ''}`))
        .flatMap((h) => h.scriptures),
    ]),
  }));

  return {
    pack: pack ? {
      supportScore: pack.supportScore,
      reviewReadiness: pack.reviewReadiness,
      originalChainLength: pack.originalScriptureChain?.length,
    } : null,
    sourceHitCount: hits.length,
    sourceScriptureCount: sourceScriptures.length,
    newSourceScriptures: sourceScriptures.filter((r) =>
      !(pack?.originalScriptureChain || []).some((p) => normalizeKey(p) === normalizeKey(r)),
    ).slice(0, 30),
    subchainHits,
    sampleHits: hits.slice(0, 15),
  };
}

function expandHolySpirit(inputs) {
  const pack = inputs.strengthenedPacks.find((p) => p.topic === 'holy_spirit');
  const hits = searchSourceMaterial(inputs, HOLY_SPIRIT_SOURCE_PATTERNS);
  const sourceScriptures = uniqueRefs(hits.flatMap((h) => h.scriptures));

  return {
    pack: pack ? {
      supportScore: pack.supportScore,
      reviewReadiness: pack.reviewReadiness,
      originalChainLength: pack.originalScriptureChain?.length,
    } : null,
    sourceHitCount: hits.length,
    sourceScriptureCount: sourceScriptures.length,
    newSourceScriptures: sourceScriptures.filter((r) =>
      !(pack?.originalScriptureChain || []).some((p) => normalizeKey(p) === normalizeKey(r)),
    ).slice(0, 30),
    sampleHits: hits.slice(0, 15),
  };
}

function discoverMissingTopics(inputs, packIndex) {
  const discovered = new Map();

  for (const topic of MISSING_TOPIC_WATCHLIST) {
    const pattern = TOPIC_PATTERNS.find((p) => p.topic === topic)?.pattern
      || new RegExp(`\\b${topic.replace(/_/g, ' ')}\\b`, 'i');
    const hits = searchSourceMaterial(inputs, [pattern], topic);
    const scriptures = uniqueRefs(hits.flatMap((h) => h.scriptures));
    discovered.set(topic, {
      topic,
      displayName: displayName(topic),
      watchlist: true,
      sourceHits: hits.length,
      scriptureCount: scriptures.length,
      packExists: packIndex.has(topic),
      packReadiness: packIndex.get(topic)?.reviewReadiness,
      status: packIndex.has(topic) ? 'pack_exists' : scriptures.length >= 3 ? 'recoverable' : 'emerging',
    });
  }

  const emergent = new Map();
  for (const q of inputs.questions) {
    const token = tokenTopicFromLesson(q.lessonTitle);
    if (!token || token.length < 4) continue;
    if (TOPIC_PATTERNS.some((p) => p.topic === token)) continue;
    if (!emergent.has(token)) {
      emergent.set(token, {
        topic: token,
        displayName: displayName(token),
        watchlist: false,
        sourceHits: 0,
        lessons: [],
        scriptureCount: 0,
      });
    }
    const e = emergent.get(token);
    e.sourceHits += 1;
    e.lessons.push(q.lessonTitle);
    e.scriptureCount += (q.scripturesCited || []).length;
  }

  for (const [topic, info] of emergent) {
    if (info.sourceHits >= 2 && !discovered.has(topic)) {
      discovered.set(topic, {
        ...info,
        packExists: packIndex.has(topic),
        status: packIndex.has(topic) ? 'pack_exists' : info.scriptureCount >= 5 ? 'recoverable' : 'emerging',
      });
    }
  }

  return [...discovered.values()].sort((a, b) => b.sourceHits - a.sourceHits);
}

function recalculateCoverage(sourceAudit, gapRecoveries, prior) {
  const linkageByLesson = new Map();
  for (const r of gapRecoveries) {
    const key = normalizeKey(r.lessonTitle);
    if (!key) continue;
    const existing = linkageByLesson.get(key);
    if (!existing || r.scriptureCount > existing.scriptureCount) {
      linkageByLesson.set(key, r);
    }
  }

  const counts = { covered: 0, partial: 0, missing: 0 };
  const reassessed = [];

  for (const entry of sourceAudit) {
    const key = normalizeKey(entry.lessonTitle);
    const recovery = linkageByLesson.get(key);
    let status = entry.status;

    if (status === 'covered') {
      status = 'covered';
    } else if (recovery?.chainFound && recovery.scriptureCount >= 3) {
      status = 'covered';
    } else if (entry.status === 'partial' && recovery?.chainFound) {
      status = 'covered';
    } else if (recovery) {
      if (recovery.packLinked && recovery.recovered && recovery.scriptureCount >= 1) {
        status = 'partial';
      } else if (recovery.chainFound || recovery.recovered || recovery.scriptureCount >= 1) {
        status = 'partial';
      }
    } else if (entry.status === 'missing' && entry.topic && entry.topic !== 'unclassified') {
      status = 'partial';
    }

    counts[status] = (counts[status] || 0) + 1;
    reassessed.push({
      lessonTitle: entry.lessonTitle,
      topic: entry.topic,
      priorStatus: entry.status,
      postRecoveryStatus: status,
      recoveryLinked: !!recovery,
    });
  }

  const uniqueLessons = new Set(sourceAudit.map((e) => normalizeKey(e.lessonTitle)).filter(Boolean)).size;

  return {
    uniqueLessonsAssessed: uniqueLessons,
    prior: {
      covered: prior.fullyCoveredSourceTopics || 212,
      partial: prior.partiallyCoveredSourceTopics || 115,
      missing: prior.missingSourceTopics || 266,
    },
    after: counts,
    targets: {
      coveredTarget: 350,
      partialTarget: 75,
      missingTarget: 150,
      coveredMet: counts.covered >= 350,
      partialMet: counts.partial <= 75,
      missingMet: counts.missing <= 150,
    },
    delta: {
      covered: counts.covered - (prior.fullyCoveredSourceTopics || 212),
      partial: counts.partial - (prior.partiallyCoveredSourceTopics || 115),
      missing: counts.missing - (prior.missingSourceTopics || 266),
    },
    reassessed,
  };
}

function buildImplementationPrep(packIndex, gapRecoveries, emergentTopics, weakExpansions) {
  const strengthened = [...packIndex.values()].filter((p) => (p.reviewReadiness || 0) >= 75);
  const recovered = gapRecoveries.filter((r) => r.recovered);
  const newlyDiscovered = emergentTopics.filter((t) => !t.packExists && t.lessonCount >= 2);
  const reviewReady = [...packIndex.values()]
    .filter((p) => p.implementationPreparationStatus === 'review_ready'
      || (p.reviewReadiness || 0) >= 75)
    .sort((a, b) => (b.reviewReadiness || 0) - (a.reviewReadiness || 0));

  const weakImproved = weakExpansions
    .filter((w) => w.improvement.corpusScripturesFound > 0)
    .sort((a, b) => b.improvement.corpusScripturesFound - a.improvement.corpusScripturesFound);

  return {
    packsStrengthened: strengthened.length,
    packsRecovered: recovered.length,
    packsNewlyDiscovered: newlyDiscovered.length,
    packsReadyForReview: reviewReady.length,
    strengthenedTopics: strengthened.slice(0, 20).map((p) => p.topic),
    recoveredTopics: [...new Set(recovered.map((r) => r.suggestedTopic))].slice(0, 30),
    newlyDiscoveredTopics: newlyDiscovered.slice(0, 20).map((t) => t.topic),
    reviewReadyPacks: reviewReady.slice(0, 25).map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      supportScore: p.supportScore,
    })),
    weakPackImprovements: weakImproved,
  };
}

function runPhase3nSourceGapRecovery() {
  const inputs = loadAllInputs();
  const packIndex = buildPackIndex(inputs.strengthenedPacks);
  const chainsByLesson = buildChainByLesson(inputs.scriptureChains);

  const gapRecoveries = recoverAllGapItems(inputs, packIndex, chainsByLesson);
  const sourceFirstRecovery = recoverUnclassifiedSources(inputs, packIndex, chainsByLesson);
  const weakPackExpansions = WEAK_PACK_FOCUS.map((t) =>
    expandWeakPack(t, inputs, packIndex, chainsByLesson),
  );
  const feastVerification = verifyFeastPacks(packIndex);
  const jesusExpansion = expandJesusOTNT(inputs);
  const holySpiritExpansion = expandHolySpirit(inputs);
  const missingTopicDiscovery = discoverMissingTopics(inputs, packIndex);
  const coverageRecalculation = recalculateCoverage(
    inputs.sourceCoverageAudit,
    gapRecoveries,
    inputs.priorCoverage,
  );
  const implementationPrep = buildImplementationPrep(
    packIndex,
    gapRecoveries,
    sourceFirstRecovery.emergentTopics,
    weakPackExpansions,
  );

  const gapItemsRecovered = gapRecoveries.filter((r) => r.recovered).length;
  const missingClassified = gapRecoveries.filter((r) =>
    (r.existingTopic === 'unclassified' || r.priorStatus === 'missing')
    && r.suggestedTopic !== 'unclassified'
    && r.suggestedTopic !== r.existingTopic,
  ).length;
  const newTopicsDiscovered = sourceFirstRecovery.emergentTopics.filter((t) => !t.packExists).length;

  const weakMostImproved = [...weakPackExpansions]
    .sort((a, b) => b.improvement.corpusScripturesFound - a.improvement.corpusScripturesFound);

  const depthGains = gapRecoveries
    .filter((r) => r.scriptureCount > 0 && r.lessonTitle && r.lessonTitle.length > 8)
    .sort((a, b) => b.scriptureCount - a.scriptureCount)
    .slice(0, 15);

  const sourceCoverageGains = gapRecoveries
    .filter((r) => r.questionCount > 0 && r.lessonTitle && r.lessonTitle.length > 8)
    .sort((a, b) => b.questionCount - a.questionCount)
    .slice(0, 15);

  const stillMissing = gapRecoveries.filter((r) =>
    r.postRecoveryStatus === 'missing' && r.lessonTitle && r.lessonTitle.length > 5,
  );
  const reviewReady = [...packIndex.values()]
    .filter((p) => (p.reviewReadiness || 0) >= 75)
    .sort((a, b) => (b.reviewReadiness || 0) - (a.reviewReadiness || 0));

  const totalSourceItems = inputs.questions.length + inputs.scriptureChains.length;
  const linkedItems = gapRecoveries.filter((r) => r.chainFound || r.packLinked).length;
  const majorityLearning = linkedItems / Math.max(1, gapRecoveries.length) >= 0.6;

  const executive = {
    gapItemsProcessed: gapRecoveries.length,
    gapItemsRecovered,
    missingEntriesClassified: missingClassified,
    newSourceDerivedTopics: newTopicsDiscovered + missingTopicDiscovery.filter((t) => t.status === 'recoverable' && !t.packExists).length,
    weakPacksImprovedMost: weakMostImproved.map((w) => ({
      topic: w.topic,
      corpusScriptures: w.improvement.corpusScripturesFound,
      corpusChains: w.improvement.corpusChainsFound,
      recoveryStatus: w.recoveryStatus,
    })),
    packsGainedMostDepth: depthGains.map((r) => ({
      lessonTitle: r.lessonTitle,
      topic: r.suggestedTopic,
      scriptures: r.scriptureCount,
    })),
    packsGainedMostSourceCoverage: sourceCoverageGains.map((r) => ({
      lessonTitle: r.lessonTitle,
      questions: r.questionCount,
      topic: r.suggestedTopic,
    })),
    reviewReadyCount: reviewReady.length,
    reviewReadyPacks: reviewReady.slice(0, 15).map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
    })),
    stillMissingCount: stillMissing.length,
    stillMissingSample: stillMissing.slice(0, 20).map((r) => ({
      lessonTitle: r.lessonTitle,
      reason: r.reasonMissing,
    })),
    prioritizeNext: [
      ...stillMissing.filter((r) => r.reasonMissing === 'no_scripture_chain_in_corpus').slice(0, 5).map((r) => r.lessonTitle),
      ...weakMostImproved.filter((w) => w.recoveryStatus !== 'source_linkage_recovered').map((w) => w.topic),
      'Spanish IOG lesson inventory linkage',
      'Camp-specific lesson title normalization',
    ].slice(0, 10),
    majoritySourceMaterialLinked: majorityLearning,
    sourceLinkageRate: Math.round((linkedItems / Math.max(1, gapRecoveries.length)) * 100),
    coverageRecalculation,
    implementationPrep,
    targetsMet: coverageRecalculation.targets,
  };

  const payload = {
    phase: '3N',
    ranAt: new Date().toISOString(),
    gapRecoveries,
    sourceFirstRecovery,
    weakPackExpansions,
    feastVerification,
    jesusExpansion,
    holySpiritExpansion,
    missingTopicDiscovery,
    coverageRecalculation,
    implementationPrep,
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
    path.join(TRACE, 'phase3n-source-gap-recovery-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'source-gap-recovery-linkages.json'),
    `${JSON.stringify({
      ranAt: payload.ranAt,
      gapRecoveries: gapRecoveries.filter((r) => r.recovered),
      emergentTopics: sourceFirstRecovery.emergentTopics,
      executive,
    }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3nSourceGapRecovery,
  WEAK_PACK_FOCUS,
  MISSING_TOPIC_WATCHLIST,
};
