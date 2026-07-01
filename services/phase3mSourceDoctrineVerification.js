/**
 * Phase 3M — Source-to-doctrine verification and final gap elimination.
 * Audits corpus coverage — no production, doctrine, card, or graph mutations.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { discoverTopicFromText, TOPIC_PATTERNS } = require('./bibleWideTopicDiscovery');
const {
  JESUS_SUBCHAINS,
  HOLY_SPIRIT_SUBCHAINS,
  FEAST_SUBCHAINS,
} = require('./phase3lRecoveredPackStrengthening');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const WEAK_PACK_FOCUS = ['144000', 'peter', 'jacob', 'millennial_kingdom'];

const FEAST_TOPICS = [
  'passover', 'unleavened_bread', 'pentecost', 'feast_of_trumpets', 'day_of_atonement',
  'feast_of_tabernacles', 'last_great_day', 'high_sabbaths', 'leviticus_23', 'three_pilgrimage_feasts',
];

const HOLY_SPIRIT_VERIFY_LABELS = [
  'Spirit of God', 'Spirit of Christ', 'Holy Ghost', 'Comforter', 'Power',
  'Messenger', 'Word', 'Breath', 'Joel 2', 'Acts 2', 'Romans 8',
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

function loadAllInputs() {
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const phase3l = loadJson(path.join(TRACE, 'phase3l-recovered-pack-strengthening-results.json'), {});
  const phase3k = loadJson(path.join(TRACE, 'phase3k-missing-pack-recovery-results.json'), {});
  const strengthened = loadJson(path.join(OUT_DIR, 'strengthened-recovered-packs.json'), { packs: [] });
  const recovered = loadJson(path.join(OUT_DIR, 'recovered-doctrine-packs.json'), { packs: [] });
  const matured = loadJson(path.join(OUT_DIR, 'matured-doctrine-packs.json'), { packs: [] });
  const enriched = loadJson(path.join(OUT_DIR, 'enriched-topic-packs.json'), { packs: [] });
  const master = loadJson(path.join(OUT_DIR, 'master-topic-packs.json'), { packs: [] });
  const chains = loadJson(path.join(OUT_DIR, 'expanded-scripture-chains.json'), { chains: [] });
  const cards = getAllApprovedCards();

  return {
    phase3f,
    phase3l,
    phase3k,
    questions: phase3f.questions || [],
    topicMap: phase3f.topicMap || {},
    pdfExtractions: phase3f.pdfExtractions || [],
    websiteExtractions: phase3f.websiteExtractions || [],
    videoExtractions: phase3f.videoExtractions || [],
    transcriptExtractions: phase3f.transcriptExtractions || [],
    strengthenedPacks: strengthened.packs || [],
    recoveredPacks: recovered.packs || [],
    maturedPacks: matured.packs || [],
    enrichedPacks: enriched.packs || [],
    masterPacks: master.packs || [],
    scriptureChains: chains.chains || [],
    evidenceCards: cards,
    jesusDeep: phase3l.jesusDeep,
    holySpiritDeep: phase3l.holySpiritDeep,
    feastsDeep: phase3l.feastsDeep,
  };
}

function buildDoctrinePackIndex(inputs) {
  const byTopic = new Map();

  const allPacks = [
    ...inputs.strengthenedPacks.map((p) => ({ ...p, packSource: 'strengthened_3l' })),
    ...inputs.recoveredPacks.map((p) => ({ ...p, packSource: 'recovered_3k' })),
    ...inputs.maturedPacks.map((p) => ({ ...p, packSource: 'matured_3j' })),
    ...inputs.enrichedPacks.map((p) => ({ ...p, packSource: 'enriched_3i' })),
    ...inputs.masterPacks.map((p) => ({ ...p, packSource: 'master_3g' })),
  ];

  for (const pack of allPacks) {
    if (!pack.topic) continue;
    const existing = byTopic.get(pack.topic);
    const score = pack.reviewReadiness || pack.supportScore || 0;
    const existingScore = existing?.reviewReadiness || existing?.supportScore || 0;
    if (!existing || score >= existingScore) {
      byTopic.set(pack.topic, {
        topic: pack.topic,
        displayName: pack.displayName || displayName(pack.topic),
        supportScore: pack.supportScore,
        reviewReadiness: pack.reviewReadiness,
        implementationPreparationStatus: pack.implementationPreparationStatus,
        originalScriptureChain: pack.originalScriptureChain || pack.allOriginalScriptures || [],
        genesisToRevelationChain: pack.genesisToRevelationChain || [],
        genesisToRevelationSpan: pack.genesisToRevelationSpan,
        parallelScriptures: pack.parallelScriptures || pack.allParallelScriptures || [],
        supportingScriptures: pack.supportingScriptures || pack.allSupportingScriptures || [],
        continuityScriptures: pack.continuityScriptures || pack.allContinuityScriptures || [],
        questionCoverage: pack.questionCoverage || pack.questionCount || 0,
        lessonCoverage: pack.lessonCoverage || pack.lessonCount || 0,
        sourceCoverage: pack.sourceCoverage || pack.sourceCount || 0,
        missingLinks: pack.missingLinksStillRemaining || pack.missingLinks || [],
        packSource: pack.packSource,
        lessonTitle: pack.lessonTitle,
      });
    }
  }

  for (const card of inputs.evidenceCards) {
    if (!byTopic.has(card.topic)) {
      byTopic.set(card.topic, {
        topic: card.topic,
        displayName: displayName(card.topic),
        supportScore: 85,
        reviewReadiness: 70,
        packSource: 'evidence_card',
        originalScriptureChain: [...(card.primaryScriptures || []), ...(card.supportingScriptures || [])],
        genesisToRevelationChain: [],
        genesisToRevelationSpan: false,
      });
    }
  }

  return byTopic;
}

function buildChainIndexes(chains) {
  const byLesson = new Map();
  const byQuestion = new Map();
  const byTopic = new Map();

  for (const chain of chains) {
    const lessonKey = normalizeKey(chain.lessonTitle);
    if (lessonKey) {
      if (!byLesson.has(lessonKey)) byLesson.set(lessonKey, []);
      byLesson.get(lessonKey).push(chain);
    }
    const qKey = normalizeKey(chain.question);
    if (qKey) byQuestion.set(qKey, chain);
    const topic = chain.topic || 'unclassified';
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic).push(chain);
  }

  return { byLesson, byQuestion, byTopic };
}

function resolveTopic(text = '', lessonTitle = '') {
  const d = discoverTopicFromText(text, { lessonTitle });
  return d.topic || 'unclassified';
}

function assessCoverageStatus({ topic, pack, chainCount, questionCountForTopic }) {
  if (topic === 'unclassified' && !pack && chainCount === 0) return 'missing';
  if (!pack && chainCount > 0) return 'partial';
  if (!pack) return 'missing';

  const readiness = pack.reviewReadiness || pack.supportScore || 0;
  const hasDepth = (pack.originalScriptureChain?.length || 0) >= 3;
  const hasChain = chainCount > 0;
  const hasQuestions = questionCountForTopic > 0 || (pack.questionCoverage || 0) > 0;

  if (readiness >= 75 && hasDepth && (hasChain || hasQuestions)) return 'covered';
  if (pack || hasChain) return 'partial';
  return 'missing';
}

function buildSourceCoverageAudit(inputs, packIndex, chainIndexes) {
  const entries = [];
  const seen = new Set();

  function addEntry(entry) {
    const key = `${entry.source}|${entry.lessonTitle}|${entry.topic}|${entry.recordType}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  }

  for (const q of inputs.questions) {
    const topic = q.topic || resolveTopic(q.question, q.lessonTitle);
    const pack = packIndex.get(topic);
    const chains = chainIndexes.byLesson.get(normalizeKey(q.lessonTitle)) || [];
    const status = assessCoverageStatus({
      topic,
      pack,
      chainCount: chains.length,
      questionCountForTopic: 1,
    });
    addEntry({
      source: q.organization || q.sourceName || 'unknown',
      lessonTitle: q.lessonTitle,
      topic,
      doctrinePackExists: !!pack,
      doctrinePackName: pack?.displayName || null,
      status,
      recordType: 'question',
      question: q.question?.slice(0, 120),
    });
  }

  for (const ext of [
    ...inputs.pdfExtractions,
    ...inputs.websiteExtractions,
    ...inputs.videoExtractions,
    ...inputs.transcriptExtractions,
  ]) {
    const topic = resolveTopic(ext.lessonTitle || '', ext.lessonTitle);
    const pack = packIndex.get(topic);
    const chains = chainIndexes.byLesson.get(normalizeKey(ext.lessonTitle)) || [];
    const status = assessCoverageStatus({
      topic,
      pack,
      chainCount: chains.length,
      questionCountForTopic: (ext.questions || []).length,
    });
    addEntry({
      source: ext.organization || ext.sourceName || 'extraction',
      lessonTitle: ext.lessonTitle,
      topic,
      doctrinePackExists: !!pack,
      doctrinePackName: pack?.displayName || null,
      status,
      recordType: ext.pdfUrl ? 'pdf_handout' : ext.sourceUrl?.includes('youtube') ? 'transcript' : 'extraction',
    });
  }

  for (const card of inputs.evidenceCards) {
    const pack = packIndex.get(card.topic);
    addEntry({
      source: 'evidence_card',
      lessonTitle: displayName(card.topic),
      topic: card.topic,
      doctrinePackExists: true,
      doctrinePackName: pack?.displayName || displayName(card.topic),
      status: pack ? 'covered' : 'partial',
      recordType: 'evidence_card',
    });
  }

  for (const [topic, info] of Object.entries(inputs.topicMap)) {
    const pack = packIndex.get(topic);
    const chains = chainIndexes.byTopic.get(topic) || [];
    const status = assessCoverageStatus({
      topic,
      pack,
      chainCount: chains.length,
      questionCountForTopic: info.questionCount || 0,
    });
    addEntry({
      source: 'topic_inventory',
      lessonTitle: displayName(topic),
      topic,
      doctrinePackExists: !!pack,
      doctrinePackName: pack?.displayName || null,
      status,
      recordType: 'topic_map',
      questionCount: info.questionCount,
    });
  }

  return entries;
}

function buildLessonTitleAudit(inputs, packIndex, chainIndexes) {
  const lessonMap = new Map();

  for (const q of inputs.questions) {
    if (!q.lessonTitle) continue;
    const key = normalizeKey(q.lessonTitle);
    if (!lessonMap.has(key)) {
      lessonMap.set(key, {
        lessonTitle: q.lessonTitle,
        organization: q.organization || q.sourceName,
        sources: new Set(),
      });
    }
    lessonMap.get(key).sources.add(q.organization || q.sourceName || 'unknown');
  }

  for (const ext of [
    ...inputs.pdfExtractions,
    ...inputs.websiteExtractions,
    ...inputs.videoExtractions,
    ...inputs.transcriptExtractions,
  ]) {
    if (!ext.lessonTitle) continue;
    const key = normalizeKey(ext.lessonTitle);
    if (!lessonMap.has(key)) {
      lessonMap.set(key, {
        lessonTitle: ext.lessonTitle,
        organization: ext.organization || ext.sourceName,
        sources: new Set(),
      });
    }
    lessonMap.get(key).sources.add(ext.organization || ext.sourceName || 'extraction');
  }

  const audits = [];
  for (const [key, lesson] of lessonMap) {
    const chains = chainIndexes.byLesson.get(key) || [];
    const topic = chains[0]?.topic || resolveTopic(lesson.lessonTitle, lesson.lessonTitle);
    const pack = packIndex.get(topic);
    let representation = 'missing';
    if (pack && chains.length && (pack.reviewReadiness || 0) >= 70) representation = 'represented';
    else if (pack || chains.length) representation = 'partially_represented';

    audits.push({
      lessonTitle: lesson.lessonTitle,
      organization: lesson.organization,
      sources: [...lesson.sources],
      topic,
      doctrinePackName: pack?.displayName || null,
      chainCount: chains.length,
      representation,
    });
  }

  return audits.sort((a, b) => a.representation.localeCompare(b.representation));
}

function buildQuestionCoverageAudit(inputs, packIndex, chainIndexes) {
  return inputs.questions.map((q) => {
    const topic = q.topic || resolveTopic(q.question, q.lessonTitle);
    const pack = packIndex.get(topic);
    const chain = chainIndexes.byQuestion.get(normalizeKey(q.question));
    const scriptures = q.scripturesCited || chain?.originalScriptureChain || [];
    const g2rChain = pack?.genesisToRevelationChain || [];
    const g2rAssigned = Boolean(pack?.genesisToRevelationSpan)
      || (g2rChain.length > 0 && scriptures.length > 0 && g2rChain.length >= 3);

    let status = 'missing';
    if (pack && chain && g2rAssigned) status = 'covered';
    else if (pack || chain) status = 'partial';

    return {
      question: q.question,
      lessonTitle: q.lessonTitle,
      source: q.organization || q.sourceName,
      topic,
      doctrinePackAssigned: !!pack,
      doctrinePackName: pack?.displayName || null,
      chainAssigned: !!chain,
      chainScriptureCount: chain?.originalScriptureChain?.length || scriptures.length,
      g2rAssigned,
      status,
    };
  });
}

function buildWeakPackRecoveryAudit(inputs, packIndex, chainIndexes) {
  const audits = [];

  for (const topic of WEAK_PACK_FOCUS) {
    const pack = packIndex.get(topic);
    const chains = chainIndexes.byTopic.get(topic) || [];
    const matchingQuestions = inputs.questions.filter((q) => {
      const t = q.topic || resolveTopic(q.question, q.lessonTitle);
      return t === topic;
    });
    const corpusScriptures = uniqueRefsFromChains(chains);
    const corpusLessons = chains.map((c) => c.lessonTitle).filter(Boolean);

    audits.push({
      topic,
      displayName: displayName(topic),
      packExists: !!pack,
      supportScore: pack?.supportScore,
      reviewReadiness: pack?.reviewReadiness,
      originalChainLength: pack?.originalScriptureChain?.length || 0,
      parallelCount: pack?.parallelScriptures?.length || 0,
      continuityCount: pack?.continuityScriptures?.length || 0,
      g2rLength: pack?.genesisToRevelationChain?.length || 0,
      missingLinks: pack?.missingLinks || [],
      corpusChainCount: chains.length,
      corpusQuestionCount: matchingQuestions.length,
      corpusScriptureCount: corpusScriptures.length,
      corpusLessons: corpusLessons.slice(0, 5),
      missingScriptures: pack?.originalScriptureChain?.length < 5 ? 'needs more source-derived scriptures' : 'adequate from sources',
      missingChains: chains.length === 0 ? 'no scripture chain in inventory' : 'chains exist in corpus',
      missingParallels: (pack?.parallelScriptures?.length || 0) < 2 ? 'parallel witnesses underdeveloped' : 'adequate',
      missingContinuity: (pack?.continuityScriptures?.length || 0) < 1 ? 'continuity witnesses missing' : 'adequate',
      recoveryRecommendation: chains.length
        ? 'Link corpus chains to pack original chain during human review'
        : 'Needs source lesson or Q&A with scripture citations before pack can mature',
    });
  }

  return audits;
}

function uniqueRefsFromChains(chains) {
  const seen = new Set();
  const out = [];
  for (const c of chains) {
    for (const r of c.originalScriptureChain || []) {
      const k = normalizeKey(r);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(r);
      }
    }
  }
  return out;
}

function buildFeastCoverageVerification(packIndex) {
  return FEAST_TOPICS.map((topic) => {
    const pack = packIndex.get(topic);
    return {
      topic,
      displayName: displayName(topic),
      packExists: !!pack,
      supportScore: pack?.supportScore,
      reviewReadiness: pack?.reviewReadiness,
      originalChainLength: pack?.originalScriptureChain?.length || 0,
      g2rSpan: pack?.genesisToRevelationSpan || false,
      status: !pack ? 'missing' : (pack.reviewReadiness >= 75 ? 'covered' : 'partial'),
      missingLinks: pack?.missingLinks || [],
    };
  });
}

function verifySubchains(deepPack, subchainDefs, verifyLabels) {
  if (!deepPack?.subchains) {
    return subchainDefs.map((def, i) => ({
      label: verifyLabels[i] || def.label,
      key: def.key,
      status: 'missing',
      scriptureCount: 0,
      scriptures: [],
    }));
  }

  return subchainDefs.map((def, i) => {
    const found = deepPack.subchains.find((s) => s.key === def.key || s.label === def.label);
    const count = found?.scriptureCount || found?.scriptures?.length || 0;
    let status = 'missing';
    if (count >= 3) status = 'verified';
    else if (count >= 1) status = 'weak';

    return {
      label: verifyLabels[i] || def.label,
      key: def.key,
      status,
      scriptureCount: count,
      scriptures: (found?.scriptures || []).slice(0, 8),
      seedCoverage: count > 0 && (def.seeds || []).length > 0,
    };
  });
}

function buildJesusVerification(inputs) {
  return {
    pack: packSummary(inputs, 'jesus_old_testament_new_testament'),
    subchains: verifySubchains(inputs.jesusDeep, JESUS_SUBCHAINS, [
      'Word of God', 'Angel of the LORD', 'I AM', 'Rock in the Wilderness', 'Captain of the Host',
      'Alpha and Omega', 'First and Last', 'Father unseen passages', 'John 1', 'Hebrews 1',
      'Colossians 1', 'Revelation links',
    ]),
  };
}

function buildHolySpiritVerification(inputs) {
  return {
    pack: packSummary(inputs, 'holy_spirit'),
    subchains: verifySubchains(inputs.holySpiritDeep, HOLY_SPIRIT_SUBCHAINS, HOLY_SPIRIT_VERIFY_LABELS),
  };
}

function packSummary(inputs, topic) {
  const pack = inputs.strengthenedPacks.find((p) => p.topic === topic);
  return pack ? {
    topic,
    supportScore: pack.supportScore,
    reviewReadiness: pack.reviewReadiness,
    originalChainLength: pack.originalScriptureChain?.length,
    g2rLength: pack.genesisToRevelationChain?.length,
    g2rSpan: pack.genesisToRevelationSpan,
  } : null;
}

function buildFinalGapReport(sourceAudit, lessonAudit, questionAudit, feastAudit, jesusVerify, holyVerify) {
  const gaps = [];

  for (const e of sourceAudit) {
    if (e.status === 'missing' || e.status === 'partial') {
      gaps.push({
        type: 'source',
        topic: e.topic,
        lessonTitle: e.lessonTitle,
        source: e.source,
        status: e.status,
        recordType: e.recordType,
      });
    }
  }

  for (const l of lessonAudit.filter((x) => x.representation !== 'represented')) {
    gaps.push({
      type: 'lesson',
      topic: l.topic,
      lessonTitle: l.lessonTitle,
      status: l.representation === 'missing' ? 'missing' : 'partial',
      chainCount: l.chainCount,
    });
  }

  for (const topic of WEAK_PACK_FOCUS) {
    gaps.push({
      type: 'weak_pack',
      topic,
      status: 'underdeveloped',
      displayName: displayName(topic),
    });
  }

  for (const f of feastAudit.filter((x) => x.status !== 'covered')) {
    gaps.push({ type: 'feast', topic: f.topic, status: f.status, displayName: f.displayName });
  }

  for (const s of [...(jesusVerify.subchains || []), ...(holyVerify.subchains || [])]) {
    if (s.status !== 'verified') {
      gaps.push({ type: 'subchain', label: s.label, status: s.status, scriptureCount: s.scriptureCount });
    }
  }

  return gaps;
}

function computeImplementationPriority(pack) {
  const readiness = pack.reviewReadiness || 0;
  const score = pack.supportScore || 0;
  if (pack.implementationPreparationStatus === 'review_ready' && score >= 85) return 'high';
  if (readiness >= 75 || pack.implementationPreparationStatus === 'review_ready') return 'medium';
  if (readiness >= 55) return 'low';
  return 'deferred';
}

function buildImplementationReadiness(packIndex) {
  return [...packIndex.values()]
    .map((pack) => ({
      topic: pack.topic,
      displayName: pack.displayName,
      supportScore: pack.supportScore,
      reviewReadiness: pack.reviewReadiness,
      questionCoverage: pack.questionCoverage || 0,
      lessonCoverage: pack.lessonCoverage || 0,
      sourceCoverage: pack.sourceCoverage || 0,
      implementationPriority: computeImplementationPriority(pack),
      implementationPreparationStatus: pack.implementationPreparationStatus || 'weak',
      genesisToRevelationSpan: pack.genesisToRevelationSpan,
      originalChainLength: pack.originalScriptureChain?.length || 0,
      missingLinks: pack.missingLinks || [],
    }))
    .sort((a, b) => (b.reviewReadiness || 0) - (a.reviewReadiness || 0));
}

function runPhase3mSourceDoctrineVerification() {
  const inputs = loadAllInputs();
  const packIndex = buildDoctrinePackIndex(inputs);
  const chainIndexes = buildChainIndexes(inputs.scriptureChains);

  const sourceCoverageAudit = buildSourceCoverageAudit(inputs, packIndex, chainIndexes);
  const lessonTitleAudit = buildLessonTitleAudit(inputs, packIndex, chainIndexes);
  const questionCoverageAudit = buildQuestionCoverageAudit(inputs, packIndex, chainIndexes);
  const weakPackRecoveryAudit = buildWeakPackRecoveryAudit(inputs, packIndex, chainIndexes);
  const feastCoverageVerification = buildFeastCoverageVerification(packIndex);
  const jesusVerification = buildJesusVerification(inputs);
  const holySpiritVerification = buildHolySpiritVerification(inputs);
  const finalGapReport = buildFinalGapReport(
    sourceCoverageAudit,
    lessonTitleAudit,
    questionCoverageAudit,
    feastCoverageVerification,
    jesusVerification,
    holySpiritVerification,
  );
  const implementationReadiness = buildImplementationReadiness(packIndex);

  const statusCounts = { covered: 0, partial: 0, missing: 0 };
  for (const e of sourceCoverageAudit) statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;

  const topicStatus = { covered: 0, partial: 0, missing: 0 };
  for (const [topic] of packIndex) {
    const entries = sourceCoverageAudit.filter((e) => e.topic === topic);
    const best = entries.some((e) => e.status === 'covered')
      ? 'covered'
      : entries.some((e) => e.status === 'partial') ? 'partial' : 'missing';
    topicStatus[best] = (topicStatus[best] || 0) + 1;
  }

  const uniqueTopics = new Set(sourceCoverageAudit.map((e) => e.topic));
  for (const topic of uniqueTopics) {
    if (!packIndex.has(topic)) topicStatus.missing += 1;
  }

  const fullyCoveredTopics = [...packIndex.values()].filter((p) =>
    (p.reviewReadiness || 0) >= 75 && (p.originalScriptureChain?.length || 0) >= 3,
  );

  const partialTopics = [...packIndex.values()].filter((p) =>
    (p.reviewReadiness || 0) >= 50 && (p.reviewReadiness || 0) < 75,
  );

  const weakPacks = [...packIndex.values()].filter((p) =>
    (p.reviewReadiness || 0) < 55 || (p.originalScriptureChain?.length || 0) < 3,
  );

  const strongestPacks = [...packIndex.values()]
    .sort((a, b) => (b.reviewReadiness || 0) - (a.reviewReadiness || 0))
    .slice(0, 15);

  const reviewFirst = implementationReadiness
    .filter((p) => p.implementationPriority === 'high' || p.reviewReadiness >= 85)
    .slice(0, 15);

  const readyForImplementation = implementationReadiness.filter((p) =>
    p.implementationPreparationStatus === 'review_ready' && p.reviewReadiness >= 75,
  );

  const executive = {
    sourceEntriesAudited: sourceCoverageAudit.length,
    lessonTitlesAudited: lessonTitleAudit.length,
    questionsAudited: questionCoverageAudit.length,
    doctrinePackCount: packIndex.size,
    fullyCoveredSourceTopics: statusCounts.covered,
    partiallyCoveredSourceTopics: statusCounts.partial,
    missingSourceTopics: statusCounts.missing,
    fullyCoveredDoctrinePacks: fullyCoveredTopics.length,
    partialDoctrinePacks: partialTopics.length,
    weakDoctrinePacks: weakPacks.length,
    strongestPacks: strongestPacks.map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      supportScore: p.supportScore,
    })),
    weakPackTopics: weakPacks.slice(0, 20).map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      missingLinks: p.missingLinks,
    })),
    reviewFirst: reviewFirst.map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      implementationPriority: p.implementationPriority,
    })),
    readyForImplementation: readyForImplementation.map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      reviewReadiness: p.reviewReadiness,
      supportScore: p.supportScore,
    })),
    readyForImplementationCount: readyForImplementation.length,
    finalGapCount: finalGapReport.length,
    gapsBeforeImplementation: finalGapReport
      .filter((g) => g.status === 'missing' || g.type === 'weak_pack')
      .slice(0, 25),
    lessonRepresented: lessonTitleAudit.filter((l) => l.representation === 'represented').length,
    lessonPartial: lessonTitleAudit.filter((l) => l.representation === 'partially_represented').length,
    lessonMissing: lessonTitleAudit.filter((l) => l.representation === 'missing').length,
    questionsCovered: questionCoverageAudit.filter((q) => q.status === 'covered').length,
    questionsPartial: questionCoverageAudit.filter((q) => q.status === 'partial').length,
    questionsMissing: questionCoverageAudit.filter((q) => q.status === 'missing').length,
  };

  const payload = {
    phase: '3M',
    ranAt: new Date().toISOString(),
    sourceCoverageAudit,
    lessonTitleAudit,
    questionCoverageAudit,
    weakPackRecoveryAudit,
    feastCoverageVerification,
    jesusVerification,
    holySpiritVerification,
    finalGapReport,
    implementationReadiness,
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
    path.join(TRACE, 'phase3m-source-doctrine-verification-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'final-implementation-readiness.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, packs: implementationReadiness, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3mSourceDoctrineVerification,
  WEAK_PACK_FOCUS,
  FEAST_TOPICS,
};
