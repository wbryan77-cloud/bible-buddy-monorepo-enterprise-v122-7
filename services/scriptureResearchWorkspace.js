/**
 * Phase 2J-M+ — Scripture Research Workspace.
 * Admin research and review only. No production mutation.
 */

const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const { expandFullScriptureWitnesses } = require('./corpusExpansionDiscovery');
const {
  discoverGenesisToRevelation,
  analyzeScriptureChain,
  computeCoverageScore,
  computeBibleSupportScore,
  detectContradictions,
} = require('./scriptureDiscoveryGenesisRevelation');
const { crossReferenceCandidate, normalizeTopic, buildApprovedIndex } = require('./scriptureDiscoveryCrossReference');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { getSeedConcordanceIndex } = require('./concordanceFoundation');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { refMatchesApproved, refInApprovedList } = require('./scriptureReferenceNormalizer');

const WORKSPACE_PIPELINE = [
  'Discovery',
  'Research Workspace',
  'Review',
  'Approval',
  'Regression',
  'Promotion',
  'Production',
];

const TOPIC_ALIASES = {
  sabbath: 'sabbath',
  kingdom: 'kingdom',
  faith: 'faith_works',
  faith_works: 'faith_works',
  works: 'faith_works',
  resurrection: 'death_state',
  death: 'death_state',
  death_state: 'death_state',
  logos: 'messiah_logos',
  messiah: 'messiah_logos',
  messiah_logos: 'messiah_logos',
  dietary: 'dietary_law',
  dietary_law: 'dietary_law',
  heavens: 'heavens',
  holiness: 'holiness',
  feasts: 'feasts',
};

const ERA_BUCKETS = {
  Genesis: (book) => /^genesis$/i.test(book),
  Torah: (book) => /^(exodus|leviticus|numbers|deuteronomy)$/i.test(book),
  Prophets: (book) => /^(isaiah|jeremiah|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)$/i.test(book),
  Wisdom: (book) => /^(job|psalm|psalms|proverbs|ecclesiastes|song of solomon)$/i.test(book),
  Gospels: (book) => /^(matthew|mark|luke|john)$/i.test(book),
  Acts: (book) => /^acts$/i.test(book),
  Epistles: (book) => /^(romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|john|jude)$/i.test(book),
  Revelation: (book) => /^revelation$/i.test(book),
};

const MERGE_PRESETS = [
  { topicA: 'sabbath', topicB: 'kingdom', label: 'Sabbath + Kingdom' },
  { topicA: 'faith_works', topicB: 'faith_works', label: 'Faith + Works' },
  { topicA: 'death_state', topicB: 'death_state', label: 'Resurrection + Death State' },
  { topicA: 'messiah_logos', topicB: 'messiah_logos', label: 'Logos + Messiah' },
];

const NL_PATTERNS = [
  { re: /find more scriptures supporting (.+)/i, jobType: 'parallel_explorer', extract: (m) => ({ topic: resolveTopic(m[1]) }) },
  { re: /show genesis to revelation witnesses for (.+)/i, jobType: 'g2r_expansion', extract: (m) => ({ topic: resolveTopic(m[1]) }) },
  { re: /expand (.+) from genesis to revelation/i, jobType: 'g2r_expansion', extract: (m) => ({ topic: resolveTopic(m[1]) }) },
  { re: /combine (.+) and (.+)/i, jobType: 'topic_merge', extract: (m) => ({ topicA: resolveTopic(m[1]), topicB: resolveTopic(m[2]) }) },
  { re: /find contradictions (?:to|for) (.+)/i, jobType: 'contradiction_search', extract: (m) => ({ topic: resolveTopic(m[1]) }) },
  { re: /build (?:a )?chain (?:for|about) (.+)/i, jobType: 'chain_builder', extract: (m) => ({ topic: resolveTopic(m[1]) }) },
];

function resolveTopic(text = '') {
  const t = String(text).toLowerCase().replace(/[^\w\s]/g, '').trim();
  for (const [alias, topic] of Object.entries(TOPIC_ALIASES)) {
    if (t.includes(alias.replace(/_/g, ' ')) || t.includes(alias)) return topic;
  }
  return t.replace(/\s+/g, '_') || 'open_topic';
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

function refInChain(ref, chain = []) {
  return chain.some((c) => refMatchesApproved(ref, c) || refInApprovedList(ref, [c]));
}

function witnessRecord(ref, relationshipType, reason, sourceLayer, confidence) {
  return { scripture: ref, relationshipType, reason, sourceLayer, confidence };
}

function getCandidateById(candidates, candidateId) {
  return candidates.find((c) => c.candidateId === candidateId) || null;
}

function gatherTopicRefs(topic) {
  const norm = normalizeTopic(topic) || topic;
  const card = getAllApprovedCards().find((c) => c.topic === norm);
  const continuity = (loadContinuityChains().chains || []).find((c) => c.topic === norm && c.approved);
  const edges = getAllApprovedSupportEdges().filter((e) => e.topic === norm);
  const concordance = getSeedConcordanceIndex().filter((e) => (e.linkedTopics || []).includes(norm));

  const refs = uniqueRefs([
    ...(card?.primaryScriptures || []),
    ...(card?.supportingScriptures || []),
    ...(continuity?.nodes || []).map((n) => n.reference),
    ...edges.flatMap((e) => e.scriptures || []),
    ...concordance.flatMap((e) => e.occurrences || []),
  ]);

  return { norm, card, continuity, edges, concordance, refs };
}

function exploreParallelScriptures({ topic, question, candidateId, scriptureChain = [] } = {}, candidates = []) {
  const candidate = candidateId ? getCandidateById(candidates, candidateId) : null;
  const chain = scriptureChain.length ? scriptureChain : (candidate?.scriptureOrder || candidate?.originalScriptures || []);
  const resolvedTopic = normalizeTopic(topic) || topic || candidate?.topic;
  const resolvedQuestion = question || candidate?.question || '';

  const expansion = expandFullScriptureWitnesses({
    question: resolvedQuestion,
    topic: resolvedTopic,
    scripturesCited: chain,
    scriptureOrder: chain,
    conclusion: candidate?.candidateConclusion || '',
    source: candidate?.source || 'research_workspace',
  });

  const witnesses = [];

  for (const ref of expansion.originalScriptures || []) {
    witnesses.push(witnessRecord(ref, 'direct_support', 'Original chain scripture', 'discovery_chain', 88));
  }
  for (const ref of expansion.supportingWitnesses || []) {
    witnesses.push(witnessRecord(ref, 'supporting_witness', 'Approved card or catalog supporting ref', 'evidence_card', 75));
  }
  for (const ref of expansion.confirmingWitnesses || []) {
    witnesses.push(witnessRecord(ref, 'confirming_witness', 'Support graph confirmation', 'support_graph', 80));
  }
  for (const ref of expansion.continuityWitnesses || []) {
    if (witnesses.some((w) => refMatchesApproved(w.scripture, ref))) continue;
    witnesses.push(witnessRecord(ref, 'continuity_witness', 'Continuity chain node', 'continuity_chain', 78));
  }
  for (const ref of expansion.cautionWitnesses || []) {
    if (!verifyKjvReference(ref).valid) continue;
    witnesses.push(witnessRecord(ref, 'caution_witness', 'Caution passage — admin must review scope', 'evidence_card', 62));
  }
  for (const ref of expansion.limitingWitnesses || []) {
    witnesses.push(witnessRecord(ref, 'limiting_witness', 'Limits claim scope per support graph', 'support_graph', 58));
  }
  for (const ref of expansion.contradictionWitnesses || []) {
    witnesses.push(witnessRecord(ref, 'contradiction_witness', 'Contradiction edge — resolve before promotion', 'support_graph', 52));
  }
  for (const ref of expansion.concordanceWitnesses || []) {
    if (!witnesses.some((w) => w.scripture === ref)) {
      witnesses.push(witnessRecord(ref, 'supporting_witness', 'Concordance linked topic', 'concordance', 70));
    }
  }

  return {
    request: { topic: resolvedTopic, question: resolvedQuestion, candidateId, scriptureChain: chain },
    witnesses,
    genesisToRevelationSpan: expansion.genesisToRevelationSpan,
    reviewRequired: true,
    autoApplied: false,
  };
}

function mergeTopics(topicA, topicB) {
  const a = resolveTopic(topicA);
  const b = resolveTopic(topicB);
  const dataA = gatherTopicRefs(a);
  const dataB = gatherTopicRefs(b);

  const sharedWitnesses = dataA.refs.filter((ref) =>
    dataB.refs.some((r) => refMatchesApproved(ref, r)),
  );

  const sharedChains = [];
  if (dataA.continuity && dataB.continuity) {
    const nodesA = (dataA.continuity.nodes || []).map((n) => n.reference);
    const nodesB = (dataB.continuity.nodes || []).map((n) => n.reference);
    const overlap = nodesA.filter((ref) => nodesB.some((r) => refMatchesApproved(ref, r)));
    if (overlap.length) sharedChains.push({ chainA: dataA.continuity.chainId, chainB: dataB.continuity.chainId, overlap });
  }

  const supportOverlap = dataA.edges
    .filter((ea) => dataB.edges.some((eb) => ea.supportType === eb.supportType))
    .map((e) => ({ edgeId: e.id, supportType: e.supportType, scriptures: e.scriptures }));

  const contradictions = uniqueRefs([
    ...dataA.edges.filter((e) => e.supportType === 'contradicts').flatMap((e) => e.scriptures || []),
    ...dataB.edges.filter((e) => e.supportType === 'contradicts').flatMap((e) => e.scriptures || []),
  ]);

  const continuityConnections = [];
  if (dataA.continuity && dataB.continuity) {
    continuityConnections.push({
      from: dataA.continuity.chainId,
      to: dataB.continuity.chainId,
      sharedThemes: (dataA.continuity.nodes || [])
        .filter((na) => (dataB.continuity.nodes || []).some((nb) => nb.theme === na.theme))
        .map((n) => n.theme),
    });
  }

  return {
    topicA: a,
    topicB: b,
    label: `${a} + ${b}`,
    sharedWitnesses,
    sharedChains,
    supportOverlap,
    contradictions,
    continuityConnections,
    uniqueA: dataA.refs.filter((r) => !sharedWitnesses.some((s) => refMatchesApproved(r, s))),
    uniqueB: dataB.refs.filter((r) => !sharedWitnesses.some((s) => refMatchesApproved(r, s))),
    reviewRequired: true,
    autoApplied: false,
  };
}

function categorizeByEra(refs = []) {
  const buckets = {
    genesisAnchors: [],
    torahWitnesses: [],
    prophetWitnesses: [],
    gospelWitnesses: [],
    epistleWitnesses: [],
    revelationWitnesses: [],
    wisdomWitnesses: [],
    actsWitnesses: [],
  };

  for (const ref of refs) {
    const kjv = verifyKjvReference(ref);
    if (!kjv.valid) continue;
    const book = kjv.book;
    if (ERA_BUCKETS.Genesis(book)) buckets.genesisAnchors.push(ref);
    else if (ERA_BUCKETS.Torah(book)) buckets.torahWitnesses.push(ref);
    else if (ERA_BUCKETS.Prophets(book)) buckets.prophetWitnesses.push(ref);
    else if (ERA_BUCKETS.Wisdom(book)) buckets.wisdomWitnesses.push(ref);
    else if (ERA_BUCKETS.Gospels(book)) buckets.gospelWitnesses.push(ref);
    else if (ERA_BUCKETS.Acts(book)) buckets.actsWitnesses.push(ref);
    else if (ERA_BUCKETS.Epistles(book)) buckets.epistleWitnesses.push(ref);
    else if (ERA_BUCKETS.Revelation(book)) buckets.revelationWitnesses.push(ref);
  }

  return buckets;
}

function expandGenesisToRevelationWorkspace({ candidateId, topic, question } = {}, candidates = []) {
  const candidate = candidateId ? getCandidateById(candidates, candidateId) : null;
  const resolvedTopic = normalizeTopic(topic) || topic || candidate?.topic;
  const chain = candidate?.scriptureOrder || candidate?.originalScriptures || [];
  const resolvedQuestion = question || candidate?.question || '';

  const g2r = discoverGenesisToRevelation({
    scripturesCited: chain,
    scriptureOrder: chain,
    topic: resolvedTopic,
  });

  const allRefs = uniqueRefs([
    ...chain,
    ...g2r.continuityScriptures,
    ...g2r.supportingScriptures,
    ...g2r.parallelScriptures,
  ]);

  const eras = categorizeByEra(allRefs);
  const continuity = (loadContinuityChains().chains || []).find((c) => c.topic === resolvedTopic && c.approved);
  const continuityMatched = continuity
    ? (continuity.nodes || []).filter((n) => allRefs.some((r) => refMatchesApproved(r, n.reference))).length
    : 0;
  const continuityScore = continuity?.nodes?.length
    ? Math.round((continuityMatched / continuity.nodes.length) * 100)
    : allRefs.length >= 3 ? 50 : 25;

  return {
    request: { candidateId, topic: resolvedTopic, question: resolvedQuestion },
    ...eras,
    genesisToRevelationSpan: g2r.genesisToRevelationSpan,
    continuityScore,
    proposedChain: uniqueRefs([
      ...eras.genesisAnchors.slice(0, 2),
      ...eras.torahWitnesses.slice(0, 2),
      ...eras.prophetWitnesses.slice(0, 2),
      ...eras.gospelWitnesses.slice(0, 2),
      ...eras.epistleWitnesses.slice(0, 2),
      ...eras.revelationWitnesses.slice(0, 2),
    ]),
    parallelAvailable: g2r.parallelScriptures,
    reviewRequired: true,
    autoApplied: false,
  };
}

function buildScriptureChain({ scriptures = [], topic, question } = {}) {
  const resolvedTopic = normalizeTopic(topic) || topic;
  const validScriptures = uniqueRefs(scriptures).filter((r) => verifyKjvReference(r).valid);
  const conclusion = `[Research chain] Admin-built chain for ${resolvedTopic} — review required.`;

  const chainAnalysis = analyzeScriptureChain({
    scripturesCited: validScriptures,
    scriptureOrder: validScriptures,
    topic: resolvedTopic,
    candidateConclusion: conclusion,
  });

  const g2r = discoverGenesisToRevelation({
    scripturesCited: validScriptures,
    scriptureOrder: validScriptures,
    topic: resolvedTopic,
  });

  const crossRef = crossReferenceCandidate({
    question: question || '',
    scriptures: validScriptures,
    scriptureOrder: validScriptures,
    topic: resolvedTopic,
    candidateConclusion: conclusion,
  });

  const coverage = computeCoverageScore({
    scripturesCited: validScriptures,
    scriptureOrder: validScriptures,
    chainAnalysis,
    g2r,
    crossRef,
  });

  const bibleSupport = computeBibleSupportScore({
    coverageScore: coverage,
    chainStrength: chainAnalysis.chainStrength,
    crossRef,
    kjvValid: true,
  });

  const contradictions = detectContradictions(resolvedTopic, validScriptures, conclusion);
  const continuity = (loadContinuityChains().chains || []).find((c) => c.topic === resolvedTopic && c.approved);
  const continuityRefs = (continuity?.nodes || []).map((n) => n.reference);
  const gaps = continuityRefs.filter((r) => !validScriptures.some((s) => refMatchesApproved(s, r)));

  const possibleWitnesses = uniqueRefs([
    ...g2r.supportingScriptures,
    ...g2r.parallelScriptures,
    ...chainAnalysis.supportingScriptures,
    ...gaps,
  ]).filter((r) => !refInChain(r, validScriptures));

  return {
    request: { scriptures: validScriptures, topic: resolvedTopic, question },
    supportScore: bibleSupport.score,
    supportBand: bibleSupport.band,
    chainStrength: chainAnalysis.chainStrength,
    chainCompleteness: chainAnalysis.chainCompleteness,
    genesisToRevelationSpan: g2r.genesisToRevelationSpan,
    contradictions,
    gaps,
    possibleAdditionalWitnesses: possibleWitnesses.slice(0, 12),
    cautionScriptures: chainAnalysis.cautionScriptures,
    limitingScriptures: chainAnalysis.limitingScriptures,
    reviewRequired: true,
    autoApplied: false,
  };
}

function parseNaturalLanguageRequest(utterance = '') {
  const text = String(utterance).trim();
  for (const pattern of NL_PATTERNS) {
    const m = text.match(pattern.re);
    if (!m) continue;
    const params = pattern.extract(m);
    return {
      utterance: text,
      jobType: pattern.jobType,
      params,
      status: 'structured',
      reviewRequired: true,
      autoApplied: false,
      productionApplied: false,
    };
  }
  return {
    utterance: text,
    jobType: 'unparsed',
    params: {},
    status: 'needs_manual_mapping',
    reviewRequired: true,
    autoApplied: false,
  };
}

function buildNaturalLanguageJobs() {
  const samples = [
    'Find more scriptures supporting Sabbath.',
    'Show Genesis to Revelation witnesses for death.',
    'Combine faith and works.',
    'Find contradictions to this claim about dietary law.',
    'Expand kingdom from Genesis to Revelation.',
    'Build a chain for messiah logos.',
  ];
  return samples.map(parseNaturalLanguageRequest);
}

function computeResearchImpact(candidates) {
  const impacts = [];

  for (const c of candidates.slice(0, 30)) {
    const chain = c.scriptureOrder || c.originalScriptures || [];
    const expansion = expandFullScriptureWitnesses({
      question: c.question,
      topic: c.topic,
      scripturesCited: chain,
      scriptureOrder: chain,
      conclusion: c.candidateConclusion || '',
      source: c.source,
    });

    const additionalSupporting = (expansion.supportingWitnesses || []).length;
    const additionalContinuity = (expansion.continuityWitnesses || []).length;
    const additionalCaution = (expansion.cautionWitnesses || []).length;

    impacts.push({
      candidateId: c.candidateId,
      question: c.question,
      topic: c.topic,
      currentSupportScore: expansion.confidenceBefore,
      potentialSupportScore: expansion.confidenceAfter,
      supportDelta: expansion.supportDelta,
      additionalWitnessesAvailable: expansion.newWitnessCount,
      additionalSupportingWitnesses: additionalSupporting,
      additionalContinuityWitnesses: additionalContinuity,
      additionalCautionWitnesses: additionalCaution,
      reviewRequired: true,
      autoApplied: false,
    });
  }

  return impacts.sort((a, b) => b.supportDelta - a.supportDelta);
}

function runScriptureResearchWorkspace(options = {}) {
  const candidates = loadUnifiedCandidates();
  const focusCandidate = getCandidateById(candidates, options.candidateId || 'exp_0003')
    || candidates.find((c) => c.supportScore >= 95)
    || candidates[0];

  const parallelExplorer = exploreParallelScriptures({
    topic: focusCandidate.topic,
    question: focusCandidate.question,
    candidateId: focusCandidate.candidateId,
    scriptureChain: focusCandidate.scriptureOrder,
  }, candidates);

  const topicMerges = MERGE_PRESETS.map((p) => mergeTopics(p.topicA, p.topicB));
  const g2rWorkspace = expandGenesisToRevelationWorkspace({
    candidateId: focusCandidate.candidateId,
    topic: focusCandidate.topic,
    question: focusCandidate.question,
  }, candidates);

  const chainBuilder = buildScriptureChain({
    scriptures: focusCandidate.scriptureOrder?.slice(0, 5) || focusCandidate.originalScriptures,
    topic: focusCandidate.topic,
    question: focusCandidate.question,
  });

  const nlJobs = buildNaturalLanguageJobs();
  const researchImpact = computeResearchImpact(candidates);

  return {
    ranAt: new Date().toISOString(),
    phase: '2J-M+',
    focusCandidate: focusCandidate.candidateId,
    parallelExplorer,
    topicMerges,
    g2rWorkspace,
    chainBuilder,
    nlJobs,
    researchImpact,
    pipeline: {
      stages: WORKSPACE_PIPELINE,
      rule: 'Never bypass review — research workspace does not modify production',
      feeds: [
        'IOG discovery', 'Transcript discovery', 'Question recovery',
        'Witness expansion', 'Future approved discovery sources',
      ],
    },
    capabilities: {
      parallelScriptureExplorer: true,
      topicMergeExplorer: true,
      genesisToRevelationExpansion: true,
      scriptureChainBuilder: true,
      naturalLanguageResearchJobs: true,
      productionIsolated: true,
    },
    metrics: {
      candidatePool: candidates.length,
      witnessesExplored: parallelExplorer.witnesses.length,
      topicMergesRun: topicMerges.length,
      nlJobsStructured: nlJobs.filter((j) => j.status === 'structured').length,
      impactCandidatesAnalyzed: researchImpact.length,
    },
  };
}

module.exports = {
  runScriptureResearchWorkspace,
  exploreParallelScriptures,
  mergeTopics,
  expandGenesisToRevelationWorkspace,
  buildScriptureChain,
  parseNaturalLanguageRequest,
  computeResearchImpact,
  WORKSPACE_PIPELINE,
};
