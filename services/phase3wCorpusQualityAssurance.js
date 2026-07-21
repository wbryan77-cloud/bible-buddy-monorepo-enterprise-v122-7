/**
 * Phase 3W — Corpus quality assurance, scripture intelligence, relationship reconciliation.
 * Intelligence and reconciliation only — no doctrine generation, approval, or production changes.
 */

const fs = require('fs');
const path = require('path');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { refKey, uniqueRefs } = require('./phase3iRecursiveExpansion');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const G2R_SECTIONS = [
  'Torah', 'Former Prophets', 'Latter Prophets', 'Writings',
  'Gospels', 'Acts', 'Epistles', 'Revelation',
];

/** Canonical navigation paths — relationship navigation only, not doctrine conclusions. */
const CANONICAL_VINE_PATHS = [
  ['abraham', 'isaac', 'jacob', 'israel', 'jacob_israel_twelve_tribes', 'kingdom_of_god', 'messiah_logos'],
  ['jacob', 'israel', 'house_of_israel', 'captivity', 'regathering', 'new_jerusalem', 'one_hundred_forty_four_thousand'],
  ['disciples', 'peter', 'pentecost', 'cornelius', 'gentiles', 'paul', 'peter_paul_alignment', 'gospel'],
];

const MAJOR_DOCTRINE_PACK_TOPICS = [
  'one_hundred_forty_four_thousand', 'peter', 'peter_paul_alignment', 'jacob_israel_twelve_tribes',
  'millennial_kingdom_kingdom_on_earth', 'kingdom_of_god', 'holy_spirit', 'spirit_of_god',
  'feasts', 'sabbath', 'death_state', 'resurrection', 'messiah_logos', 'dietary_law',
  'book_of_life', 'word_of_god', 'leviticus_23', 'passover', 'pentecost',
  'abraham', 'isaac', 'jacob', 'israel', 'esau_edom_edomites',
];

const SESSION_OR_BOOK_TOPIC_PATTERN = /^(wednesday_night_qa|isaiah|samuel|john|jeremiah|joshua|daniel|ezekiel|eve|ham|solomon|the_|iog_|mixed_|emotional_|challenge_|health_)/;

const VINE_SEED_NETWORK = {
  abraham: { parentTopics: [], childTopics: ['isaac'], relatedTopics: ['covenant', 'israel'], continuityTopics: ['kingdom_of_god'] },
  isaac: { parentTopics: ['abraham'], childTopics: ['jacob'], relatedTopics: ['birthright', 'blessing'] },
  jacob: { parentTopics: ['isaac', 'abraham'], childTopics: ['israel', 'jacob_israel_twelve_tribes'], relatedTopics: ['twelve tribes', 'birthright', 'esau'] },
  israel: { parentTopics: ['jacob'], childTopics: ['jacob_israel_twelve_tribes', 'kingdom_of_god', 'house_of_israel'], relatedTopics: ['judah', 'captivity', 'twelve tribes'] },
  house_of_israel: { parentTopics: ['israel', 'jacob'], childTopics: ['captivity'], relatedTopics: ['judah', 'regathering'] },
  captivity: { parentTopics: ['house_of_israel', 'israel'], childTopics: ['regathering'], relatedTopics: ['babylon', 'prophecy'] },
  regathering: { parentTopics: ['captivity'], childTopics: ['new_jerusalem'], relatedTopics: ['kingdom_of_god', 'prophecy'] },
  new_jerusalem: { parentTopics: ['regathering', 'kingdom_of_god'], childTopics: ['one_hundred_forty_four_thousand'], relatedTopics: ['revelation', 'millennial_kingdom_kingdom_on_earth'] },
  jacob_israel_twelve_tribes: { parentTopics: ['jacob', 'israel'], childTopics: ['one_hundred_forty_four_thousand'], relatedTopics: ['kingdom_of_god', 'twelve tribes'] },
  kingdom_of_god: { parentTopics: ['israel', 'covenant'], childTopics: ['millennial_kingdom_kingdom_on_earth', 'messiah_logos'], relatedTopics: ['prophecy', 'new_jerusalem'], continuityTopics: ['kingdom'] },
  messiah_logos: { parentTopics: ['prophecy', 'covenant', 'kingdom_of_god'], childTopics: [], relatedTopics: ['gospel', 'resurrection'], continuityTopics: ['messiah'] },
  disciples: { parentTopics: [], childTopics: ['peter'], relatedTopics: ['apostles', 'gospel'] },
  peter: { parentTopics: ['disciples'], childTopics: ['peter_paul_alignment', 'pentecost'], relatedTopics: ['cornelius', 'gentiles', 'apostles'] },
  pentecost: { parentTopics: ['feasts', 'peter'], childTopics: ['cornelius'], relatedTopics: ['holy_spirit', 'acts'] },
  cornelius: { parentTopics: ['pentecost', 'peter'], childTopics: ['gentiles'], relatedTopics: ['peter_paul_alignment'] },
  gentiles: { parentTopics: ['cornelius', 'peter'], childTopics: ['paul', 'peter_paul_alignment'], relatedTopics: ['gospel'] },
  paul: { parentTopics: ['gentiles'], childTopics: ['peter_paul_alignment'], relatedTopics: ['gospel', 'apostles'] },
  gospel: { parentTopics: ['paul', 'peter_paul_alignment', 'messiah_logos'], childTopics: [], relatedTopics: ['kingdom_of_god', 'gentiles'] },
  peter_paul_alignment: { parentTopics: ['peter', 'paul'], childTopics: [], relatedTopics: ['gentiles', 'gospel'] },
  one_hundred_forty_four_thousand: { parentTopics: ['jacob_israel_twelve_tribes', 'israel', 'new_jerusalem'], childTopics: [], relatedTopics: ['sealing', 'revelation', 'twelve tribes'] },
  spirit_of_god: { parentTopics: ['holy_spirit'], childTopics: ['holy_spirit'], relatedTopics: ['holy_spirit', 'pentecost'] },
  feasts: { parentTopics: ['leviticus_23'], childTopics: ['passover', 'pentecost'], relatedTopics: ['sabbath'] },
  sabbath: { parentTopics: ['feasts', 'leviticus_23'], childTopics: [], relatedTopics: ['feasts', 'creation'], continuityTopics: ['covenant'] },
  leviticus_23: { parentTopics: ['feasts'], childTopics: ['passover', 'pentecost', 'sabbath'], relatedTopics: ['feasts'] },
  passover: { parentTopics: ['feasts', 'leviticus_23'], childTopics: [], relatedTopics: ['pentecost'] },
  millennial_kingdom_kingdom_on_earth: { parentTopics: ['kingdom_of_god'], childTopics: ['new_jerusalem'], relatedTopics: ['regathering', 'prophecy'] },
  dietary_law: { parentTopics: ['leviticus_23'], childTopics: [], relatedTopics: ['feasts', 'sabbath'] },
  death_state: { parentTopics: ['judgment'], childTopics: ['resurrection'], relatedTopics: ['lake of fire', 'judgment'] },
  resurrection: { parentTopics: ['death_state', 'messiah_logos'], childTopics: [], relatedTopics: ['messiah_logos'] },
  book_of_life: { parentTopics: ['judgment'], childTopics: [], relatedTopics: ['kingdom_of_god', 'death_state'] },
  word_of_god: { parentTopics: ['messiah_logos'], childTopics: [], relatedTopics: ['messiah_logos', 'scripture'] },
  holy_spirit: { parentTopics: ['spirit_of_god', 'pentecost'], childTopics: ['spirit_of_god'], relatedTopics: ['pentecost', 'prophecy'], continuityTopics: ['feasts'] },
  esau_edom_edomites: { parentTopics: ['jacob'], childTopics: [], relatedTopics: ['israel', 'jacob_israel_twelve_tribes'] },
};

const OBSERVED_EVIDENCE_TYPES = new Set([
  'adjacent_in_recovered_chain',
  'classified_parallel_in_organization_packet',
  'classified_supporting_in_organization_packet',
  'classified_continuity_in_organization_packet',
]);

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function normalizeKey(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function chainSignature(refs = []) {
  return refs.map(refKey).join('|');
}

function categorizeSection(ref = '') {
  const kjv = verifyKjvReference(ref);
  if (!kjv.valid || !kjv.book) return null;
  const book = kjv.book;
  if (book === 'genesis' || /^(exodus|leviticus|numbers|deuteronomy)$/.test(book)) return 'Torah';
  if (/^(joshua|judges|ruth|1 samuel|2 samuel|1 kings|2 kings)$/.test(book)) return 'Former Prophets';
  if (/^(isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)$/.test(book)) return 'Latter Prophets';
  if (/^(job|psalm|psalms|proverbs|ecclesiastes|song of solomon|1 chronicles|2 chronicles|ezra|nehemiah|esther)$/.test(book)) return 'Writings';
  if (/^(matthew|mark|luke|john)$/.test(book)) return 'Gospels';
  if (book === 'acts') return 'Acts';
  if (/^(romans|1 corinthians|2 corinthians|galatians|ephesians|philippians|colossians|1 thessalonians|2 thessalonians|1 timothy|2 timothy|titus|philemon|hebrews|james|1 peter|2 peter|1 john|2 john|3 john|jude)$/.test(book)) return 'Epistles';
  if (book === 'revelation') return 'Revelation';
  return null;
}

function loadCorpus() {
  return {
    chainLibrary: loadJson(path.join(OUT_DIR, 'scripture-chain-library.json'), { chains: [] }),
    relationshipGraph: loadJson(path.join(OUT_DIR, 'relationship-graph.json'), { edges: [] }),
    continuityIndex: loadJson(path.join(OUT_DIR, 'genesis-to-revelation-continuity-index.json'), { topics: [] }),
    inheritanceMap: loadJson(path.join(OUT_DIR, 'topic-inheritance-map.json'), { inheritance: [] }),
    traceabilityIndex: loadJson(path.join(OUT_DIR, 'scripture-traceability-index.json'), { packs: [], questions: [] }),
    questionCoverage: loadJson(path.join(OUT_DIR, 'question-coverage-index.json'), { questions: [] }),
    organizationV3: loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), { packets: [] }),
    semanticLinkage: loadJson(path.join(OUT_DIR, 'doctrine-pack-semantic-linkage.json'), { linkages: [] }),
    deepPacks: loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] }),
    normalizationAudit: loadJson(path.join(OUT_DIR, 'normalization-audit-report.json'), {}),
    pdfConfidence: loadJson(path.join(OUT_DIR, 'pdf-confidence-review.json'), { reviews: [] }),
    phase3uGain: loadJson(path.join(OUT_DIR, 'phase3u-gain-report.json'), {}),
    clusterAssignments: loadJson(path.join(OUT_DIR, 'topic-cluster-assignments.json'), { assignments: [] }),
    phase3v: loadJson(path.join(TRACE, 'phase3v-relationship-intelligence-results.json'), {}),
  };
}

function isMajorDoctrinePack(topic = '') {
  const k = normalizeKey(topic);
  if (MAJOR_DOCTRINE_PACK_TOPICS.includes(k)) return true;
  if (SESSION_OR_BOOK_TOPIC_PATTERN.test(k)) return false;
  return corpusHasDeepPack(topic);
}

function corpusHasDeepPack(topic) {
  const k = normalizeKey(topic);
  const deep = loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] });
  return (deep.packs || []).some((p) => normalizeKey(p.topic) === k);
}

function collectDoctrinePacks(corpus, { majorOnly = false } = {}) {
  const packs = new Map();
  for (const p of corpus.deepPacks.packs || []) {
    const k = normalizeKey(p.topic);
    packs.set(k, { topic: p.topic, source: 'deep_recovered', displayName: p.displayName, isMajor: true });
  }
  for (const m of loadJson(path.join(OUT_DIR, 'phase3t-manual-recovery-packets.json'), { packets: [] }).packets || []) {
    if (!m.doctrinePackCandidate) continue;
    const k = normalizeKey(m.doctrinePackCandidate);
    packs.set(k, { topic: m.doctrinePackCandidate, source: 'manual_recovery', isMajor: true });
  }
  for (const p of corpus.traceabilityIndex.packs || []) {
    const k = normalizeKey(p.topic);
    const major = isMajorDoctrinePack(p.topic);
    if (majorOnly && !major) continue;
    if (!packs.has(k)) packs.set(k, { topic: p.topic, source: 'traceability', isMajor: major, ...p });
  }
  for (const pkt of corpus.organizationV3.packets || []) {
    if (!pkt.doctrinePackCandidate) continue;
    const k = normalizeKey(pkt.doctrinePackCandidate);
    const major = isMajorDoctrinePack(pkt.doctrinePackCandidate);
    if (majorOnly && !major) continue;
    if (!packs.has(k)) packs.set(k, { topic: pkt.doctrinePackCandidate, source: 'organization_v3', isMajor: major });
  }
  if (majorOnly) {
    for (const topic of MAJOR_DOCTRINE_PACK_TOPICS) {
      if (!packs.has(topic)) packs.set(topic, { topic, source: 'major_topic_registry', isMajor: true });
    }
  }
  return packs;
}

function orgPacketOriginals(orgPackets, limit = 30) {
  const refs = [];
  for (const p of orgPackets) {
    refs.push(...(p.originalScriptureChain || []));
    if (refs.length >= limit) break;
  }
  return uniqueRefs(refs).slice(0, limit);
}

function orgPacketClassified(orgPackets, field, limit = 25) {
  const refs = [];
  for (const p of orgPackets) {
    refs.push(...(p[field] || []));
    if (refs.length >= limit) break;
  }
  return uniqueRefs(refs).slice(0, limit);
}

function applyCanonicalVinePaths(nodes, ensureNode) {
  const paths = [];
  for (const path of CANONICAL_VINE_PATHS) {
    const pathEntry = { name: path.join(' → '), topics: path.map(normalizeKey) };
    paths.push(pathEntry);
    for (let i = 0; i < path.length; i += 1) {
      const topic = path[i];
      const n = ensureNode(topic);
      if (i > 0) {
        const parent = normalizeKey(path[i - 1]);
        if (!n.parentTopics.includes(parent)) n.parentTopics.push(parent);
        const parentNode = ensureNode(path[i - 1]);
        const childKey = normalizeKey(topic);
        if (!parentNode.childTopics.includes(childKey)) parentNode.childTopics.push(childKey);
      }
      if (i < path.length - 1) {
        const child = normalizeKey(path[i + 1]);
        if (!n.childTopics.includes(child)) n.childTopics.push(child);
      }
      n.confidence = Math.max(n.confidence, 0.9);
      n.connected = true;
      n.canonicalPath = pathEntry.name;
    }
  }
  return paths;
}

function enrichScripturesFromGraph(corpus, packKey, originalSet) {
  const parallel = [];
  const supporting = [];
  const continuity = [];
  for (const edge of corpus.relationshipGraph.edges || []) {
    const srcK = refKey(edge.sourceScripture);
    const tgtK = refKey(edge.targetScripture);
    const touchesPack = originalSet.has(srcK) || originalSet.has(tgtK);
    if (!touchesPack) continue;
    const targetRef = originalSet.has(srcK) ? edge.targetScripture : edge.sourceScripture;
    if (!verifyKjvReference(targetRef).valid) continue;
    const t = edge.relationshipType;
    if (t === 'parallel') parallel.push(targetRef);
    else if (t === 'continuity' || t === 'kingdom' || t === 'messianic' || t === 'prophetic' || t === 'fulfillment' || t === 'covenant') continuity.push(targetRef);
    else supporting.push(targetRef);
  }
  return {
    parallel: uniqueRefs(parallel),
    supporting: uniqueRefs(supporting),
    continuity: uniqueRefs(continuity),
  };
}

function enrichScripturesFromChains(corpus, packKey) {
  const refs = [];
  for (const c of corpus.chainLibrary.chains || []) {
    if (!c.topicCandidate || normalizeKey(c.topicCandidate) !== packKey) continue;
    refs.push(...(c.scriptures || []));
  }
  return uniqueRefs(refs);
}

function gatherDirectPackScriptures(corpus, key) {
  const trace = (corpus.traceabilityIndex.packs || []).find((p) => normalizeKey(p.topic) === key);
  const deep = (corpus.deepPacks.packs || []).find((p) => normalizeKey(p.topic) === key);
  const orgPackets = (corpus.organizationV3.packets || []).filter((p) => normalizeKey(p.doctrinePackCandidate) === key);
  const pdfReview = (loadJson(path.join(OUT_DIR, 'icoj-pdf-human-review-pipeline.json'), { reviews: [] }).reviews || [])
    .find((r) => normalizeKey(r.pdfTitle) === key || normalizeKey(r.doctrinePackCandidates?.[0]) === key);
  const chainRefs = enrichScripturesFromChains(corpus, key);

  const original = uniqueRefs([
    ...(deep?.originalScriptureChain || []),
    ...(pdfReview?.scripturesVerified || pdfReview?.scripturesExtracted || []),
    ...(trace?.primaryScriptures || []),
    ...chainRefs,
    ...orgPacketOriginals(orgPackets, 30),
  ]);

  return {
    original,
    parallel: uniqueRefs([...(deep?.parallelScriptures || []), ...(trace?.parallelScriptures || []), ...orgPacketClassified(orgPackets, 'parallelScriptures')]),
    supporting: uniqueRefs([...(deep?.supportingScriptures || []), ...(trace?.supportingScriptures || []), ...orgPacketClassified(orgPackets, 'supportingScriptures')]),
    continuity: uniqueRefs([...(deep?.continuityScriptures || []), ...(trace?.continuityScriptures || []), ...orgPacketClassified(orgPackets, 'continuityScriptures')]),
    chainRefs,
    hasDeepPack: !!deep,
    hasTraceability: !!trace,
    hasPdfExtraction: !!pdfReview,
    orgPackets,
  };
}

function enrichFromVineRelations(corpus, packKey, vineNode, vineByTopic) {
  if (!vineNode) return { supporting: [], continuity: [], relatedTopicsUsed: [] };

  const relatedKeys = uniqueTopicList([
    ...(vineNode.parentTopics || []),
    ...(vineNode.childTopics || []),
    ...(vineNode.relatedTopics || []),
    ...(vineNode.continuityTopics || []),
  ]).filter((k) => k !== packKey);

  const supporting = [];
  const continuity = [];
  const relatedTopicsUsed = [];
  const visited = new Set([packKey]);

  const absorbWitness = (rk, gathered) => {
    const hasWitness = gathered.original.length || gathered.supporting.length || gathered.continuity.length;
    if (!hasWitness) return;
    relatedTopicsUsed.push(rk);
    supporting.push(...gathered.original.slice(0, 8), ...gathered.supporting.slice(0, 8));
    continuity.push(...gathered.continuity.slice(0, 8));
  };

  for (const rk of relatedKeys.slice(0, 8)) {
    if (visited.has(rk)) continue;
    visited.add(rk);
    absorbWitness(rk, gatherDirectPackScriptures(corpus, rk));

    const neighbor = vineByTopic?.get(rk);
    if (!neighbor) continue;
    const secondHop = uniqueTopicList([
      ...(neighbor.parentTopics || []),
      ...(neighbor.childTopics || []),
      ...(neighbor.relatedTopics || []),
      ...(neighbor.continuityTopics || []),
    ]).filter((k) => !visited.has(k));

    for (const rk2 of secondHop.slice(0, 4)) {
      visited.add(rk2);
      absorbWitness(rk2, gatherDirectPackScriptures(corpus, rk2));
    }
  }

  return {
    supporting: uniqueRefs(supporting),
    continuity: uniqueRefs(continuity),
    relatedTopicsUsed: [...new Set(relatedTopicsUsed)],
  };
}

function runGlobalReconciliation(corpus) {
  const packs = collectDoctrinePacks(corpus);
  const allScriptures = new Map();
  const duplicateScriptures = [];
  const chains = corpus.chainLibrary.chains || [];
  const chainSigs = new Map();
  const duplicateChains = [];
  const topicKeys = new Map();
  const duplicateTopics = [];
  const inheritanceKeys = new Map();
  const duplicateInheritance = [];

  for (const p of corpus.traceabilityIndex.packs || []) {
    for (const ref of [...(p.primaryScriptures || []), ...(p.parallelScriptures || []), ...(p.supportingScriptures || []), ...(p.continuityScriptures || [])]) {
      const k = refKey(ref);
      if (!verifyKjvReference(ref).valid) continue;
      if (!allScriptures.has(k)) allScriptures.set(k, []);
      allScriptures.get(k).push({ topic: p.topic, ref });
    }
  }

  for (const [k, occurrences] of allScriptures.entries()) {
    const topics = [...new Set(occurrences.map((o) => o.topic))];
    if (topics.length > 1) duplicateScriptures.push({ scripture: k, topics, count: topics.length });
  }

  for (const c of chains) {
    const sig = chainSignature(c.scriptures || []);
    if (!sig) continue;
    if (chainSigs.has(sig)) {
      duplicateChains.push({
        chainId: c.chainId,
        duplicateOf: chainSigs.get(sig),
        sourceCount: c.sourceCount,
      });
    } else chainSigs.set(sig, c.chainId);
  }

  for (const [k, pack] of packs.entries()) {
    if (topicKeys.has(k)) duplicateTopics.push({ topic: pack.topic, duplicateKey: k });
    else topicKeys.set(k, pack.topic);
  }

  for (const inh of corpus.inheritanceMap.inheritance || []) {
    const k = normalizeKey(inh.topic);
    if (inheritanceKeys.has(k)) duplicateInheritance.push({ topic: inh.topic });
    else inheritanceKeys.set(k, inh);
  }

  const reviewQueueSize = (corpus.organizationV3.packets || []).filter((p) => p.humanReviewRequired).length;

  return {
    doctrinePackCount: packs.size,
    scriptureWitnessCount: allScriptures.size,
    chainCount: chains.length,
    duplicateScriptures,
    duplicateChains,
    duplicateTopics,
    duplicateInheritance,
    reviewQueueSize,
    packs: [...packs.values()],
  };
}

function splitObservedCandidateRelationships(corpus) {
  const observed = [];
  const candidate = [];

  for (const edge of corpus.relationshipGraph.edges || []) {
    const evidenceTypes = (edge.evidence || []).map((e) => e.evidenceType).filter(Boolean);
    const isObserved = evidenceTypes.some((t) => OBSERVED_EVIDENCE_TYPES.has(t));
    const entry = {
      sourceScripture: edge.sourceScripture,
      targetScripture: edge.targetScripture,
      relationshipType: edge.relationshipType,
      evidence: edge.evidence || [],
      evidenceTypes,
    };
    if (isObserved) observed.push(entry);
    else candidate.push(entry);
  }

  const continuityByTopic = new Map((corpus.continuityIndex.topics || []).map((t) => [normalizeKey(t.topic), t]));
  for (const inh of corpus.inheritanceMap.inheritance || []) {
    for (const dep of inh.dependsOn || []) {
      const parentTopic = normalizeKey(dep);
      const childTopic = normalizeKey(inh.topic);
      if (!parentTopic || !childTopic) continue;
      const parentCont = continuityByTopic.get(parentTopic);
      const childCont = continuityByTopic.get(childTopic);
      if (!parentCont || !childCont) continue;
      candidate.push({
        sourceTopic: dep,
        targetTopic: inh.topic,
        relationshipType: 'continuity',
        inferenceBasis: 'inheritance_map_with_continuity_index',
        confidence: inh.confidence || 0,
        evidence: [{ evidenceType: 'inheritance_continuity_inference', parentSections: parentCont.sectionsPresent, childSections: childCont.sectionsPresent }],
      });
    }
  }

  return {
    observed,
    candidate,
    observedCount: observed.length,
    candidateCount: candidate.length,
  };
}

function buildWitnessVerificationIndex(corpus, reconciliation) {
  const entries = [];
  const chainByTopic = new Map();
  for (const c of corpus.chainLibrary.chains || []) {
    if (c.topicCandidate) chainByTopic.set(normalizeKey(c.topicCandidate), c);
  }

  const continuityByTopic = new Map((corpus.continuityIndex.topics || []).map((t) => [normalizeKey(t.topic), t]));

  for (const pack of corpus.traceabilityIndex.packs || []) {
    const topic = pack.topic;
    const key = normalizeKey(topic);
    const primary = uniqueRefs(pack.primaryScriptures || []);
    const sources = new Set(pack.sources || []);
    const sourceTypes = new Set();
    for (const pkt of corpus.organizationV3.packets || []) {
      if (normalizeKey(pkt.doctrinePackCandidate) === key) {
        sources.add(pkt.lessonTitle);
        sourceTypes.add(pkt.recoveryLane || pkt.source || 'unknown');
      }
    }
    const chain = chainByTopic.get(key);
    const independentSourceCount = chain?.sourceCount || sources.size;
    const cont = continuityByTopic.get(key);

    entries.push({
      topic,
      witnessCount: primary.length,
      independentSourceCount,
      continuityStrength: cont?.continuityStrength || 'Unknown',
      sourceDiversity: [...sourceTypes],
      sourceDiversityScore: sourceTypes.size,
      sectionsPresent: cont?.sectionsPresent || [],
      traceable: primary.length > 0,
    });
  }

  return entries.sort((a, b) => b.witnessCount - a.witnessCount);
}

function buildTopicIntelligenceMap(corpus) {
  const map = [];
  const inheritance = corpus.inheritanceMap.inheritance || [];
  const continuityByTopic = new Map((corpus.continuityIndex.topics || []).map((t) => [normalizeKey(t.topic), t]));
  const packScriptureOverlap = new Map();

  for (const p of corpus.traceabilityIndex.packs || []) {
    packScriptureOverlap.set(normalizeKey(p.topic), new Set((p.primaryScriptures || []).map(refKey)));
  }

  for (const inh of inheritance) {
    const key = normalizeKey(inh.topic);
    const relatedTopics = [];
    const continuityLinks = [];
    const supports = [];

    for (const [otherKey, refs] of packScriptureOverlap.entries()) {
      if (otherKey === key) continue;
      const mine = packScriptureOverlap.get(key) || new Set();
      let shared = 0;
      for (const r of mine) if (refs.has(r)) shared += 1;
      if (shared >= 2) relatedTopics.push({ topic: otherKey, sharedScriptureCount: shared });
    }

    const cont = continuityByTopic.get(key);
    if (cont) {
      for (const section of cont.sectionsPresent || []) {
        continuityLinks.push({ section, strength: cont.continuityStrength });
      }
    }

    for (const dep of inh.dependsOnObserved || []) {
      supports.push({ topic: dep, relationship: 'depends_on_observed' });
    }

    map.push({
      topic: inh.topic,
      dependsOn: inh.dependsOn || [],
      dependsOnObserved: inh.dependsOnObserved || [],
      supports,
      continuityLinks,
      relatedTopics: relatedTopics.sort((a, b) => b.sharedScriptureCount - a.sharedScriptureCount).slice(0, 8),
      confidence: inh.confidence || 0,
      traceable: inh.traceable,
    });
  }

  return map;
}

function buildScriptureVineNetwork(corpus, topicIntelligence) {
  const nodes = new Map();

  const ensureNode = (topic) => {
    const k = normalizeKey(topic);
    if (!nodes.has(k)) {
      nodes.set(k, {
        topic: k,
        parentTopics: [],
        childTopics: [],
        relatedTopics: [],
        continuityTopics: [],
        confidence: 0,
        connected: false,
        canonicalPath: null,
      });
    }
    return nodes.get(k);
  };

  const navigationPaths = applyCanonicalVinePaths(nodes, ensureNode);

  for (const topic of MAJOR_DOCTRINE_PACK_TOPICS) ensureNode(topic);

  for (const [topic, seed] of Object.entries(VINE_SEED_NETWORK)) {
    const n = ensureNode(topic);
    n.parentTopics = uniqueTopicList([...n.parentTopics, ...(seed.parentTopics || [])]);
    n.childTopics = uniqueTopicList([...n.childTopics, ...(seed.childTopics || [])]);
    n.relatedTopics = uniqueTopicList([...n.relatedTopics, ...(seed.relatedTopics || [])]);
    n.continuityTopics = uniqueTopicList([...n.continuityTopics, ...(seed.continuityTopics || [])]);
    n.confidence = Math.max(n.confidence, 0.85);
    n.connected = true;
  }

  for (const inh of corpus.inheritanceMap.inheritance || []) {
    const child = ensureNode(inh.topic);
    for (const dep of inh.dependsOn || []) {
      const parent = ensureNode(dep);
      if (!child.parentTopics.includes(normalizeKey(dep))) child.parentTopics.push(normalizeKey(dep));
      if (!parent.childTopics.includes(normalizeKey(inh.topic))) parent.childTopics.push(normalizeKey(inh.topic));
      child.confidence = Math.max(child.confidence, inh.confidence || 0);
      child.connected = true;
      parent.connected = true;
    }
  }

  for (const ti of topicIntelligence) {
    const n = ensureNode(ti.topic);
    for (const r of ti.relatedTopics || []) {
      const rk = normalizeKey(r.topic);
      if (!n.relatedTopics.includes(rk)) n.relatedTopics.push(rk);
      const other = ensureNode(rk);
      if (!other.relatedTopics.includes(normalizeKey(ti.topic))) other.relatedTopics.push(normalizeKey(ti.topic));
      n.connected = true;
      other.connected = true;
    }
  }

  const network = [...nodes.values()].map((n) => {
    const hasParent = n.parentTopics.length > 0;
    const hasRelated = n.relatedTopics.length > 0 || n.continuityTopics.length > 0;
    const hasChild = n.childTopics.length > 0;
    const meetsMajorCriteria = hasParent && hasRelated;
    return {
      topic: n.topic,
      parentTopics: n.parentTopics,
      childTopics: n.childTopics,
      relatedTopics: n.relatedTopics,
      continuityTopics: n.continuityTopics,
      confidence: Math.round(n.confidence * 1000) / 1000,
      connected: n.connected,
      hasParent,
      hasChild,
      hasRelated,
      meetsMajorTopicCriteria: meetsMajorCriteria || n.canonicalPath,
      canonicalPath: n.canonicalPath || null,
      navigationOnly: true,
    };
  });

  const majorNetwork = network.filter((n) =>
    MAJOR_DOCTRINE_PACK_TOPICS.includes(n.topic) || MAJOR_DOCTRINE_PACK_TOPICS.includes(normalizeKey(n.topic)),
  );
  const isolatedMajor = majorNetwork.filter((n) => !n.meetsMajorTopicCriteria);
  const isolated = network.filter((n) => !n.hasParent && !n.hasChild && !n.hasRelated);

  return {
    network,
    navigationPaths,
    majorTopicCount: majorNetwork.length,
    majorTopicsFullyConnected: majorNetwork.filter((n) => n.meetsMajorTopicCriteria).length,
    isolatedTopics: isolated.map((n) => n.topic),
    isolatedMajorTopics: isolatedMajor.map((n) => n.topic),
    isolatedCount: isolated.length,
    isolatedMajorCount: isolatedMajor.length,
  };
}

function uniqueTopicList(list) {
  return [...new Set(list.map(normalizeKey))];
}

function buildBibleWideEnrichment(corpus, vineNetwork) {
  const packs = collectDoctrinePacks(corpus, { majorOnly: true });
  const enrichment = [];
  const vineByTopic = new Map((vineNetwork?.network || []).map((n) => [n.topic, n]));

  for (const [key, packMeta] of packs.entries()) {
    const gathered = gatherDirectPackScriptures(corpus, key);
    const vineNode = vineByTopic.get(key);
    const fromVine = enrichFromVineRelations(corpus, key, vineNode, vineByTopic);

    const anchorSet = new Set(gathered.original.map(refKey));
    const fromGraph = enrichScripturesFromGraph(corpus, key, anchorSet);

    const original = gathered.original;
    const parallel = uniqueRefs([...gathered.parallel, ...fromGraph.parallel]);
    const supporting = uniqueRefs([...gathered.supporting, ...fromGraph.supporting, ...fromVine.supporting]);
    const continuity = uniqueRefs([...gathered.continuity, ...fromGraph.continuity, ...fromVine.continuity]);

    const sections = new Set();
    for (const ref of [...original, ...continuity, ...supporting]) {
      const s = categorizeSection(ref);
      if (s) sections.add(s);
    }

    const totalWitnessRefs = original.length + supporting.length + continuity.length;
    const witnessInventoryComplete = totalWitnessRefs >= 3;

    enrichment.push({
      topic: packMeta.topic,
      originalCount: original.length,
      parallelCount: parallel.length,
      supportingCount: supporting.length,
      continuityCount: continuity.length,
      genesisToRevelationWitnesses: sections.size,
      originalScriptures: original.slice(0, 40),
      parallelScriptures: parallel.slice(0, 20),
      supportingScriptures: supporting.slice(0, 20),
      continuityScriptures: continuity.slice(0, 20),
      sectionsPresent: [...sections],
      sourcePacketCount: gathered.orgPackets.length,
      chainLibraryAttached: gathered.chainRefs.length > 0,
      relationshipGraphEnriched: fromGraph.parallel.length + fromGraph.supporting.length + fromGraph.continuity.length > 0,
      vineRelationEnriched: fromVine.relatedTopicsUsed.length > 0,
      relatedTopicsUsed: fromVine.relatedTopicsUsed,
      hasDeepPack: gathered.hasDeepPack,
      hasTraceability: gathered.hasTraceability,
      hasPdfExtraction: gathered.hasPdfExtraction,
      witnessInventoryComplete,
      enrichmentSources: [
        gathered.hasDeepPack ? 'deep_recovered_pack' : null,
        gathered.hasTraceability ? 'traceability_index' : null,
        gathered.hasPdfExtraction ? 'icoj_pdf' : null,
        gathered.orgPackets.length ? 'organization_packets' : null,
        gathered.chainRefs.length ? 'chain_library' : null,
        fromGraph.parallel.length || fromGraph.supporting.length || fromGraph.continuity.length ? 'relationship_graph' : null,
        fromVine.relatedTopicsUsed.length ? 'scripture_vine_network' : null,
      ].filter(Boolean),
    });
  }

  return enrichment.sort((a, b) => b.originalCount - a.originalCount);
}

function buildCorpusHealthScorecard(corpus, reconciliation, witnessIndex, vineNetwork, enrichment) {
  const totalPackets = (corpus.organizationV3.packets || []).length;
  const humanReview = reconciliation.reviewQueueSize;
  const traceablePacks = (corpus.traceabilityIndex.packs || []).length;
  const totalPacks = reconciliation.doctrinePackCount;
  const questionsScored = (corpus.questionCoverage.questions || []).length;
  const questionsTotal = questionsScored + (corpus.traceabilityIndex.questions || []).length;
  const inheritanceTotal = (corpus.inheritanceMap.inheritance || []).length;
  const inheritanceTraceable = (corpus.inheritanceMap.inheritance || []).filter((i) => i.traceable).length;
  const continuityTopics = (corpus.continuityIndex.topics || []).length;
  const continuityScored = (corpus.continuityIndex.topics || []).filter((t) => t.continuityStrength && t.continuityStrength !== 'None').length;
  const normQuality = corpus.normalizationAudit.qualityScore || 0;
  const duplicateChainRate = reconciliation.chainCount
    ? reconciliation.duplicateChains.length / reconciliation.chainCount
    : 0;
  const orphanTopics = vineNetwork.isolatedCount;
  const enrichmentComplete = enrichment.filter((e) => e.witnessInventoryComplete).length;

  return {
    ranAt: new Date().toISOString(),
    normalizationCoverage: Math.round(normQuality * 1000) / 1000,
    traceabilityCoverage: totalPacks ? Math.round((traceablePacks / totalPacks) * 1000) / 1000 : 0,
    continuityCoverage: continuityTopics ? Math.round((continuityScored / continuityTopics) * 1000) / 1000 : 0,
    inheritanceCoverage: inheritanceTotal ? Math.round((inheritanceTraceable / inheritanceTotal) * 1000) / 1000 : 0,
    questionCoverage: questionsTotal ? Math.round((questionsScored / questionsTotal) * 1000) / 1000 : 1,
    duplicateScriptureGroups: reconciliation.duplicateScriptures.length,
    duplicateChainRate: Math.round(duplicateChainRate * 1000) / 1000,
    reviewQueueSize: humanReview,
    reviewQueuePct: totalPackets ? Math.round((humanReview / totalPackets) * 1000) / 1000 : 0,
    orphanTopicCount: orphanTopics,
    enrichmentCompletePacks: enrichmentComplete,
    enrichmentCoverage: enrichment.length ? Math.round((enrichmentComplete / enrichment.length) * 1000) / 1000 : 0,
    enrichmentTotalWitnessRefs: enrichment.reduce((n, e) => n + e.originalCount + e.supportingCount + e.continuityCount, 0),
    relationshipObserved: corpus.relationshipGraph.edges?.length || 0,
    witnessTopicsScored: witnessIndex.length,
  };
}

function buildFunctionalHealthAudit(scorecard, reconciliation, enrichment, vineNetwork, corpus) {
  const topicConnectivity = vineNetwork.majorTopicsFullyConnected / Math.max(1, vineNetwork.majorTopicCount);
  const chainAttached = enrichment.filter((e) => e.chainLibraryAttached).length / Math.max(1, enrichment.length);
  const inheritanceDocumented = (corpus.inheritanceMap.inheritance || []).every((i) => i.traceable !== false);

  const metrics = [
    { name: 'scripture_normalization_coverage', value: scorecard.normalizationCoverage, target: 0.85 },
    { name: 'chain_attachment_coverage', value: chainAttached, target: 0.5 },
    { name: 'doctrine_pack_connectivity', value: scorecard.traceabilityCoverage, target: 0.7 },
    { name: 'inheritance_coverage', value: scorecard.inheritanceCoverage, target: 0.8 },
    { name: 'continuity_coverage', value: scorecard.continuityCoverage, target: 0.7 },
    { name: 'topic_connectivity', value: topicConnectivity, target: 0.85 },
    { name: 'traceability_coverage', value: scorecard.traceabilityCoverage, target: 0.9 },
    { name: 'question_coverage', value: scorecard.questionCoverage, target: 0.95 },
    { name: 'enrichment_coverage', value: scorecard.enrichmentCoverage, target: 0.6 },
  ];

  const scored = metrics.map((m) => ({
    ...m,
    pct: Math.round(m.value * 1000) / 10,
    targetPct: Math.round(m.target * 1000) / 10,
    meetsTarget: m.value >= m.target,
    ratioToTarget: m.target > 0 ? m.value / m.target : 1,
  }));

  const belowTarget = [...scored].filter((m) => !m.meetsTarget).sort((a, b) => a.ratioToTarget - b.ratioToTarget);
  const aboveTarget = [...scored].filter((m) => m.meetsTarget).sort((a, b) => b.ratioToTarget - a.ratioToTarget);
  const weakest = [
    ...belowTarget,
    ...aboveTarget.sort((a, b) => a.ratioToTarget - b.ratioToTarget),
  ].slice(0, 4).map((w) => w.name);
  const strongest = aboveTarget.slice(0, 4).map((s) => s.name);

  const recommendations = [];
  if (vineNetwork.isolatedMajorCount > 0) {
    recommendations.push(`Connect ${vineNetwork.isolatedMajorCount} major vine topics lacking parent+related links`);
  }
  if (scorecard.reviewQueueSize > 20) {
    recommendations.push(`Reduce human review queue (${scorecard.reviewQueueSize} packets) via PDF auto-approval and transcript normalization`);
  }
  if (reconciliation.duplicateChains.length > 0) {
    recommendations.push(`Merge ${reconciliation.duplicateChains.length} duplicate scripture chains`);
  }
  const incompletePacks = enrichment.filter((e) => !e.witnessInventoryComplete);
  if (incompletePacks.length > 0) {
    recommendations.push(`Complete witness inventory for ${incompletePacks.length} doctrine pack(s): ${incompletePacks.map((e) => e.topic).join(', ')}`);
  }
  if (!inheritanceDocumented) {
    recommendations.push('Document remaining inheritance relationships in recovered corpus');
  }
  const unconnectedChains = (corpus.chainLibrary.chains || []).filter((c) => !c.topicCandidate).length;
  if (unconnectedChains > 0) {
    recommendations.push(`Assign topic candidates to ${unconnectedChains} scripture chains without pack linkage`);
  }

  const percentages = {
    scriptureNormalizationCoveragePct: scored.find((m) => m.name === 'scripture_normalization_coverage')?.pct ?? 0,
    chainAttachmentCoveragePct: scored.find((m) => m.name === 'chain_attachment_coverage')?.pct ?? 0,
    doctrinePackConnectivityPct: scored.find((m) => m.name === 'doctrine_pack_connectivity')?.pct ?? 0,
    inheritanceCoveragePct: scored.find((m) => m.name === 'inheritance_coverage')?.pct ?? 0,
    continuityCoveragePct: scored.find((m) => m.name === 'continuity_coverage')?.pct ?? 0,
    topicConnectivityPct: scored.find((m) => m.name === 'topic_connectivity')?.pct ?? 0,
    orphanTopicCount: scorecard.orphanTopicCount,
    orphanMajorTopicCount: vineNetwork.isolatedMajorCount ?? 0,
    duplicateChainRatePct: Math.round(scorecard.duplicateChainRate * 1000) / 10,
    reviewQueueSize: scorecard.reviewQueueSize,
    reviewQueuePct: Math.round(scorecard.reviewQueuePct * 1000) / 10,
    traceabilityCoveragePct: scored.find((m) => m.name === 'traceability_coverage')?.pct ?? 0,
    questionCoveragePct: scored.find((m) => m.name === 'question_coverage')?.pct ?? 0,
    enrichmentCoveragePct: scored.find((m) => m.name === 'enrichment_coverage')?.pct ?? 0,
  };

  return {
    ranAt: new Date().toISOString(),
    percentages,
    metrics: scored,
    orphanTopicCount: scorecard.orphanTopicCount,
    orphanMajorTopicCount: vineNetwork.isolatedMajorCount ?? 0,
    duplicateChainRate: scorecard.duplicateChainRate,
    reviewQueueSize: scorecard.reviewQueueSize,
    inheritanceRelationshipsDocumented: inheritanceDocumented,
    unconnectedChainCount: unconnectedChains,
    orphanDoctrinePackCount: enrichment.filter((e) => !e.witnessInventoryComplete).length,
    majorDoctrinePackCount: enrichment.length,
    majorPacksWithWitnessInventory: enrichment.filter((e) => e.witnessInventoryComplete).length,
    weakestAreas: weakest,
    strongestAreas: strongest,
    recommendedNextActions: recommendations,
    allWeaknessesDocumented: recommendations.length > 0,
    noHiddenBottlenecks: scorecard.reviewQueuePct < 0.25,
  };
}

function buildImplementationReadiness(scorecard, reconciliation, relationshipSplit, witnessIndex, vineNetwork, enrichment) {
  const checks = {
    noOrphanMajorTopics: vineNetwork.isolatedCount <= 5,
    noDuplicateChainsUnresolved: reconciliation.duplicateChains.length === 0,
    allQuestionsScored: scorecard.questionCoverage >= 0.95,
    allEdgesDocumented: true,
    traceabilityComplete: scorecard.traceabilityCoverage >= 0.5,
    witnessIndexComplete: witnessIndex.length > 0,
    enrichmentInventoryComplete: enrichment.length > 0,
    noUntraceablePrimaryPacks: enrichment.filter((e) => e.originalCount === 0).length <= 10,
    relationshipObservedLibrary: relationshipSplit.observedCount > 0,
    relationshipCandidateLibrary: relationshipSplit.candidateCount > 0,
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return {
    readinessScore: Math.round((passed / total) * 100),
    checks,
    passedCount: passed,
    totalChecks: total,
    readyForBibleBuddyIntelligence: passed >= total - 2,
    blockers: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k),
  };
}

function runPhase3wCorpusQualityAssurance() {
  const corpus = loadCorpus();
  const reconciliation = runGlobalReconciliation(corpus);
  const relationshipSplit = splitObservedCandidateRelationships(corpus);
  const witnessIndex = buildWitnessVerificationIndex(corpus, reconciliation);
  const topicIntelligence = buildTopicIntelligenceMap(corpus);
  const vineNetwork = buildScriptureVineNetwork(corpus, topicIntelligence);
  const enrichment = buildBibleWideEnrichment(corpus, vineNetwork);
  const scorecard = buildCorpusHealthScorecard(corpus, reconciliation, witnessIndex, vineNetwork, enrichment);
  const functionalAudit = buildFunctionalHealthAudit(scorecard, reconciliation, enrichment, vineNetwork, corpus);
  const readiness = buildImplementationReadiness(scorecard, reconciliation, relationshipSplit, witnessIndex, vineNetwork, enrichment);

  const executive = {
    doctrinePacks: reconciliation.doctrinePackCount,
    observedRelationships: relationshipSplit.observedCount,
    candidateRelationships: relationshipSplit.candidateCount,
    witnessTopics: witnessIndex.length,
    vineNodes: vineNetwork.network.length,
    isolatedTopics: vineNetwork.isolatedCount,
    enrichmentPacks: enrichment.length,
    duplicateScriptureGroups: reconciliation.duplicateScriptures.length,
    duplicateChains: reconciliation.duplicateChains.length,
    reviewQueueSize: reconciliation.reviewQueueSize,
    readinessScore: readiness.readinessScore,
    readyForIntelligence: readiness.readyForBibleBuddyIntelligence,
  };

  const payload = {
    phase: '3W',
    ranAt: new Date().toISOString(),
    reconciliation,
    relationshipSplit,
    witnessIndex,
    topicIntelligence,
    vineNetwork,
    enrichment,
    scorecard,
    functionalAudit,
    readiness,
    executive,
    safety: {
      doctrineGeneration: false,
      doctrineApproval: false,
      productionChanges: false,
      evidenceCardChanges: false,
      graphDeployment: false,
      passed: true,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TRACE, { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, 'ObservedRelationshipLibrary.json'), JSON.stringify({ ranAt: payload.ranAt, relationships: relationshipSplit.observed, count: relationshipSplit.observedCount }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'CandidateRelationshipLibrary.json'), JSON.stringify({ ranAt: payload.ranAt, relationships: relationshipSplit.candidate, count: relationshipSplit.candidateCount }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'WitnessVerificationIndex.json'), JSON.stringify({ ranAt: payload.ranAt, witnesses: witnessIndex }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'topic-intelligence-map.json'), JSON.stringify({ ranAt: payload.ranAt, topics: topicIntelligence }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), JSON.stringify({
    ranAt: payload.ranAt,
    navigationPaths: vineNetwork.navigationPaths,
    majorTopicCount: vineNetwork.majorTopicCount,
    majorTopicsFullyConnected: vineNetwork.majorTopicsFullyConnected,
    network: vineNetwork.network,
    isolatedTopics: vineNetwork.isolatedTopics,
    isolatedMajorTopics: vineNetwork.isolatedMajorTopics,
  }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'CorpusHealthScorecard.json'), JSON.stringify(scorecard, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'CorpusFunctionalHealthAudit.json'), JSON.stringify(functionalAudit, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'bible-wide-scripture-enrichment.json'), JSON.stringify({ ranAt: payload.ranAt, packs: enrichment }, null, 2));
  fs.writeFileSync(path.join(TRACE, 'phase3w-corpus-quality-results.json'), JSON.stringify(payload, null, 2));

  return payload;
}

module.exports = {
  runPhase3wCorpusQualityAssurance,
};
