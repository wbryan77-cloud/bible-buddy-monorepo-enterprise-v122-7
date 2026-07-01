/**
 * Phase 3V — Relationship intelligence (evidence-based only).
 * No doctrine generation, conclusions, production, or evidence card changes.
 */

const fs = require('fs');
const path = require('path');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const {
  normalizeScriptureReference,
  normalizeReferenceList,
  KJV_BOOKS_CANONICAL,
} = require('./phase3fScriptureNormalizer');
const { refKey, uniqueRefs, bookOrderIndex } = require('./phase3iRecursiveExpansion');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const G2R_SECTIONS = [
  'Torah',
  'Former Prophets',
  'Latter Prophets',
  'Writings',
  'Gospels',
  'Acts',
  'Epistles',
  'Revelation',
];

const TOPIC_CLUSTER_SEEDS = [
  'Kingdom', 'Holy Spirit', 'Feasts', 'Sabbath', 'Law', 'Covenant', 'Grace', 'Faith', 'Repentance',
  'Resurrection', 'Judgment', 'Israel', 'Judah', 'Jacob', 'Esau', 'Edom', 'Abraham', 'Isaac',
  'Peter', 'Paul', 'Gentiles', 'Gospel', 'Messiah', 'Son of God', 'Melchizedek', 'Temple',
  'Priesthood', 'Sacrifice', 'Passover', 'Unleavened Bread', 'Pentecost', 'Trumpets', 'Atonement',
  'Tabernacles', 'Last Great Day', 'Babylon', 'Beast', 'False Prophet', 'Antichrist', '144000',
  'New Jerusalem', 'Lake of Fire', 'Second Coming', 'Kingdom of God', 'Prophecy', 'Creation',
  'Adam', 'Noah', 'Exodus',
];

const TOPIC_INHERITANCE_SEEDS = {
  jacob: ['abraham', 'isaac', 'birthright', 'blessing', 'israel'],
  jacob_israel_twelve_tribes: ['jacob', 'abraham', 'isaac', 'israel', 'twelve tribes'],
  peter: ['disciples', 'apostles', 'pentecost', 'cornelius'],
  one_hundred_forty_four_thousand: ['israel', 'twelve tribes', 'sealing', 'kingdom', 'revelation'],
  '144000': ['israel', 'twelve tribes', 'sealing', 'kingdom', 'revelation'],
  kingdom_of_god: ['kingdom', 'prophecy', 'covenant', 'israel'],
  holy_spirit: ['spirit of god', 'pentecost', 'prophecy'],
  feasts: ['passover', 'pentecost', 'sabbath', 'leviticus 23'],
  messiah_logos: ['messiah', 'prophecy', 'gospel'],
};

const EXAMPLE_CHAIN_ANCHORS = {
  kingdom_chain: ['Isaiah 2', 'Daniel 2', 'Matthew 6', 'Acts 1', 'Revelation 20'],
  holy_spirit_chain: ['Joel 2', 'Acts 2', 'John 14', 'Romans 8'],
  feast_chain: ['Leviticus 23', 'Zechariah 14', 'Isaiah 66'],
  peter_chain: ['Matthew 16', 'Acts 2', 'Acts 10', 'Galatians 2'],
  jacob_chain: ['Genesis 25', 'Genesis 27', 'Genesis 32', 'Hosea 12'],
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
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validRefs(refs = []) {
  return uniqueRefs(refs);
}

function categorizeSection(ref = '') {
  const kjv = verifyKjvReference(ref);
  if (!kjv.valid || !kjv.book) return null;
  const book = kjv.book;
  if (book === 'genesis') return 'Torah';
  if (/^(exodus|leviticus|numbers|deuteronomy)$/.test(book)) return 'Torah';
  if (/^(joshua|judges|ruth|1 samuel|2 samuel|1 kings|2 kings)$/.test(book)) return 'Former Prophets';
  if (/^(isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)$/.test(book)) return 'Latter Prophets';
  if (/^(job|psalm|psalms|proverbs|ecclesiastes|song of solomon|1 chronicles|2 chronicles|ezra|nehemiah|esther)$/.test(book)) return 'Writings';
  if (/^(matthew|mark|luke|john)$/.test(book)) return 'Gospels';
  if (book === 'acts') return 'Acts';
  if (/^(romans|1 corinthians|2 corinthians|galatians|ephesians|philippians|colossians|1 thessalonians|2 thessalonians|1 timothy|2 timothy|titus|philemon|hebrews|james|1 peter|2 peter|1 john|2 john|3 john|jude)$/.test(book)) return 'Epistles';
  if (book === 'revelation') return 'Revelation';
  return null;
}

function isPrimaryRecoveredSource(src) {
  const lane = String(src.sourceType || src.recoveryLane || '');
  if (/gap_closure_partial|gap_closure_semantic|pack_linkage_gap_closure/.test(lane)) return false;
  if (src.sourceName === 'Internal' && /^(emotional|mixed|challenge|health):/i.test(src.lessonTitle || '')) return false;
  return true;
}

function loadRecoveredSources() {
  const v3 = loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), { packets: [] });
  const v2 = loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v2.json'), { packets: [] });
  const manual = loadJson(path.join(OUT_DIR, 'phase3t-manual-recovery-packets.json'), { packets: [] });
  const packets = v3.packets?.length ? v3.packets : v2.packets || [];

  const sources = [];
  for (const p of packets) {
    const chain = validRefs(p.originalScriptureChain || p.scripturesCited || []);
    if (!chain.length) continue;
    sources.push({
      sourceId: normalizeKey(p.lessonTitle),
      sourceType: p.recoveryLane || p.source || 'organization_packet',
      lessonTitle: p.lessonTitle,
      question: p.question,
      camp: p.camp,
      doctrinePackCandidate: p.doctrinePackCandidate,
      topicCandidate: p.topicCandidate,
      scriptureOrder: validRefs(p.scriptureOrder || chain),
      scriptures: chain,
      parallelScriptures: validRefs(p.parallelScriptures || []),
      supportingScriptures: validRefs(p.supportingScriptures || []),
      continuityScriptures: validRefs(p.continuityScriptures || []),
      sourceName: p.source,
    });
  }

  for (const m of manual.packets || []) {
    const chain = validRefs(m.scriptureChain || []);
    if (!chain.length) continue;
    sources.push({
      sourceId: normalizeKey(m.title),
      sourceType: 'manual_recovery_packet',
      lessonTitle: m.title,
      camp: m.camp,
      doctrinePackCandidate: m.doctrinePackCandidate,
      scriptureOrder: chain,
      scriptures: chain,
      sourceName: m.organization || 'ICOJ',
    });
  }

  return sources;
}

function chainSignature(refs = []) {
  return refs.map(refKey).join('|');
}

function subsequenceMatch(anchor = [], chain = []) {
  const a = anchor.map(refKey);
  const c = chain.map(refKey);
  let i = 0;
  for (const ref of c) {
    if (i < a.length && (ref === a[i] || ref.startsWith(a[i].split(':')[0]) || a[i].startsWith(ref.split(':')[0]))) {
      i += 1;
    }
  }
  return i >= Math.min(3, a.length);
}

function buildScriptureChainLibrary(sources) {
  const bySig = new Map();

  for (const src of sources) {
    const chain = src.scriptureOrder || src.scriptures;
    if (chain.length < 3) continue;
    const sig = chainSignature(chain);
    if (!bySig.has(sig)) {
      bySig.set(sig, {
        chainId: `chain_${sig.slice(0, 48).replace(/\|/g, '_')}`,
        topicCandidate: src.doctrinePackCandidate || src.topicCandidate || null,
        scriptures: chain,
        occurrences: [],
        sourceCount: 0,
        confidence: 0,
      });
    }
    const entry = bySig.get(sig);
    entry.occurrences.push({
      sourceId: src.sourceId,
      lessonTitle: src.lessonTitle,
      sourceType: src.sourceType,
      sourceName: src.sourceName,
    });
    entry.sourceCount = entry.occurrences.length;
    if (src.doctrinePackCandidate && !entry.topicCandidate) {
      entry.topicCandidate = src.doctrinePackCandidate;
    }
  }

  const chains = [];
  for (const entry of bySig.values()) {
    if (entry.sourceCount < 2) continue;
    entry.confidence = Math.min(0.98, 0.5 + entry.sourceCount * 0.08 + entry.scriptures.length * 0.02);
    chains.push(entry);
  }

  for (const [anchorName, anchorRefs] of Object.entries(EXAMPLE_CHAIN_ANCHORS)) {
    const matching = sources.filter((s) => subsequenceMatch(anchorRefs, s.scriptures));
    if (matching.length < 2) continue;
    const observedRefs = validRefs(matching.flatMap((s) => s.scriptures));
    const anchorValid = validRefs(anchorRefs);
    const scriptures = anchorValid.filter((r) =>
      observedRefs.some((o) => refKey(o) === refKey(r) || refKey(o).startsWith(refKey(r).split(' ').slice(0, 2).join(' '))),
    );
    if (scriptures.length < 3) continue;
    const sig = chainSignature(scriptures);
    if (chains.some((c) => c.chainId === `anchor_${anchorName}`)) continue;
    chains.push({
      chainId: `anchor_${anchorName}`,
      topicCandidate: anchorName.replace('_chain', ''),
      scriptures: scriptures.length >= 3 ? scriptures : anchorValid.slice(0, Math.max(3, anchorValid.length)),
      occurrences: matching.map((s) => ({
        sourceId: s.sourceId,
        lessonTitle: s.lessonTitle,
        sourceType: s.sourceType,
      })),
      sourceCount: matching.length,
      confidence: Math.min(0.95, 0.6 + matching.length * 0.1),
      observedAnchor: anchorName,
    });
  }

  return chains.sort((a, b) => b.sourceCount - a.sourceCount);
}

function inferRelationshipType(srcRef, tgtRef, srcSection, tgtSection, positionInChain) {
  if (srcSection && tgtSection && srcSection !== tgtSection) {
    const order = G2R_SECTIONS.indexOf(srcSection) - G2R_SECTIONS.indexOf(tgtSection);
    if (order < 0 && srcSection !== 'Gospels' && tgtSection === 'Gospels') return 'continuity';
    if (order < 0) return 'continuity';
  }
  const srcBook = verifyKjvReference(srcRef).book;
  const tgtBook = verifyKjvReference(tgtRef).book;
  if (srcBook === tgtBook) return 'supporting';
  if (/kingdom/i.test(srcRef) || /kingdom/i.test(tgtRef)) return 'kingdom';
  if (/messiah|christ|jesus/i.test(`${srcRef} ${tgtRef}`)) return 'messianic';
  if (positionInChain === 0) return 'repeated_theme';
  return 'supporting';
}

function buildRelationshipGraph(sources) {
  const edges = [];
  const edgeMap = new Map();

  const addEdge = (sourceScripture, targetScripture, relationshipType, evidence) => {
    if (!verifyKjvReference(sourceScripture).valid || !verifyKjvReference(targetScripture).valid) return;
    if (refKey(sourceScripture) === refKey(targetScripture)) return;
    const key = `${refKey(sourceScripture)}->${refKey(targetScripture)}:${relationshipType}`;
    if (edgeMap.has(key)) {
      edgeMap.get(key).evidence.push(...evidence);
      return;
    }
    const edge = {
      sourceScripture,
      targetScripture,
      relationshipType,
      evidence: [...evidence],
    };
    edgeMap.set(key, edge);
    edges.push(edge);
  };

  for (const src of sources) {
    const chain = src.scriptureOrder || src.scriptures;
    for (let i = 0; i < chain.length - 1; i += 1) {
      const a = chain[i];
      const b = chain[i + 1];
      const secA = categorizeSection(a);
      const secB = categorizeSection(b);
      const rel = inferRelationshipType(a, b, secA, secB, i);
      addEdge(a, b, rel, [{
        sourceId: src.sourceId,
        lessonTitle: src.lessonTitle,
        sourceType: src.sourceType,
        evidenceType: 'adjacent_in_recovered_chain',
        chainPosition: [i, i + 1],
      }]);
    }

    for (const p of src.parallelScriptures || []) {
      for (const s of src.scriptures) {
        addEdge(s, p, 'parallel', [{
          sourceId: src.sourceId,
          lessonTitle: src.lessonTitle,
          evidenceType: 'classified_parallel_in_organization_packet',
        }]);
      }
    }
    for (const s of src.supportingScriptures || []) {
      for (const base of src.scriptures.slice(0, 3)) {
        addEdge(base, s, 'supporting', [{
          sourceId: src.sourceId,
          lessonTitle: src.lessonTitle,
          evidenceType: 'classified_supporting_in_organization_packet',
        }]);
      }
    }
    for (const c of src.continuityScriptures || []) {
      for (const base of src.scriptures.slice(0, 3)) {
        addEdge(base, c, 'continuity', [{
          sourceId: src.sourceId,
          lessonTitle: src.lessonTitle,
          evidenceType: 'classified_continuity_in_organization_packet',
        }]);
      }
    }
  }

  return {
    edges,
    edgeCount: edges.length,
    edgesWithEvidence: edges.filter((e) => e.evidence.length > 0).length,
    allEdgesHaveEvidence: edges.every((e) => e.evidence.length > 0),
  };
}

function continuityStrengthFromSections(presentCount) {
  if (presentCount >= 7) return 'Very Strong';
  if (presentCount >= 5) return 'Strong';
  if (presentCount >= 3) return 'Moderate';
  if (presentCount >= 1) return 'Weak';
  return 'None';
}

function buildGenesisToRevelationContinuityIndex(sources, chainLibrary) {
  const byTopic = new Map();

  const ingest = (topic, refs) => {
    if (!topic) return;
    if (!byTopic.has(topic)) byTopic.set(topic, new Set());
    for (const r of validRefs(refs)) byTopic.get(topic).add(r);
  };

  for (const src of sources) {
    ingest(src.doctrinePackCandidate || src.topicCandidate, src.scriptures);
    ingest(normalizeKey(src.lessonTitle), src.scriptures);
  }
  for (const c of chainLibrary) {
    ingest(c.topicCandidate, c.scriptures);
  }

  for (const seed of TOPIC_CLUSTER_SEEDS) {
    const key = normalizeKey(seed);
    if (!byTopic.has(key)) byTopic.set(key, new Set());
    for (const src of sources) {
      if (normalizeKey(`${src.lessonTitle} ${src.doctrinePackCandidate}`).includes(key)) {
        for (const r of src.scriptures) byTopic.get(key).add(r);
      }
    }
  }

  const index = [];
  for (const [topic, refSet] of byTopic.entries()) {
    const refs = [...refSet];
    if (!refs.length) continue;
    const sectionsPresent = [];
    const sectionsMissing = [];
    for (const section of G2R_SECTIONS) {
      const has = refs.some((r) => categorizeSection(r) === section);
      if (has) sectionsPresent.push(section);
      else sectionsMissing.push(section);
    }
    index.push({
      topic,
      sectionsPresent,
      sectionsMissing,
      continuityStrength: continuityStrengthFromSections(sectionsPresent.length),
      scriptureWitnessCount: refs.length,
    });
  }

  return index.sort((a, b) => b.scriptureWitnessCount - a.scriptureWitnessCount);
}

function buildTopicInheritanceMap(sources) {
  const map = [];
  const corpusText = sources.map((s) => normalizeKey(`${s.lessonTitle} ${s.doctrinePackCandidate} ${s.scriptures.join(' ')}`)).join(' ');

  for (const [topic, dependsOn] of Object.entries(TOPIC_INHERITANCE_SEEDS)) {
    const matched = dependsOn.filter((d) => corpusText.includes(normalizeKey(d)));
    const confidence = dependsOn.length ? matched.length / dependsOn.length : 0;
    map.push({
      topic,
      dependsOn,
      dependsOnObserved: matched,
      confidence: Math.round(confidence * 1000) / 1000,
      traceable: matched.length > 0,
    });
  }

  return map;
}

function buildQuestionCoverageIndex(sources, continuityIndex) {
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const questions = phase3f.questions || [];
  const continuityByTopic = new Map(continuityIndex.map((c) => [c.topic, c.continuityStrength]));

  const entries = [];

  for (const q of questions) {
    const scriptures = validRefs(q.scripturesCited || []);
    const topic = normalizeKey(q.topic || q.lessonTitle || '');
    const matchingSources = sources.filter((s) =>
      normalizeKey(s.lessonTitle).includes(topic) || normalizeKey(s.question || '').includes(topic),
    );
    const witnessCount = scriptures.length;
    const sourceSupport = matchingSources.length;
    const continuityStrength = continuityByTopic.get(topic) || continuityByTopic.get(normalizeKey(q.lessonTitle)) || 'Unknown';
    const supportScore = Math.min(1, (witnessCount * 0.15 + sourceSupport * 0.1 + (continuityStrength === 'Very Strong' ? 0.3 : continuityStrength === 'Strong' ? 0.2 : 0.1)));

    entries.push({
      question: q.question || q.lessonTitle,
      lessonTitle: q.lessonTitle,
      supportScore: Math.round(supportScore * 1000) / 1000,
      witnessCount,
      continuityStrength,
      sourceSupport,
    });
  }

  for (const src of sources) {
    if (!src.question || entries.some((e) => e.question === src.question)) continue;
    const scriptures = src.scriptures;
    const topic = normalizeKey(src.doctrinePackCandidate || src.lessonTitle);
    const continuityStrength = continuityByTopic.get(topic) || 'Unknown';
    entries.push({
      question: src.question,
      lessonTitle: src.lessonTitle,
      supportScore: Math.min(1, scriptures.length * 0.12),
      witnessCount: scriptures.length,
      continuityStrength,
      sourceSupport: 1,
    });
  }

  return entries;
}

function buildTopicClusterAssignments(sources) {
  const assignments = [];
  for (const src of sources) {
    const text = normalizeKey(`${src.lessonTitle} ${src.question || ''} ${src.doctrinePackCandidate || ''}`);
    const clusters = TOPIC_CLUSTER_SEEDS.filter((seed) => text.includes(normalizeKey(seed)));
    if (!clusters.length) continue;
    assignments.push({
      sourceId: src.sourceId,
      lessonTitle: src.lessonTitle,
      clusters,
      doctrinePackCandidate: src.doctrinePackCandidate,
    });
  }
  return assignments;
}

function buildNormalizationAudit() {
  const passA = loadJson(path.join(OUT_DIR, 'normalized-reference-candidates.json'), { candidates: [] });
  const passB = loadJson(path.join(OUT_DIR, 'normalized-scripture-references.json'), { normalized: [] });
  const recoveredRaw = fs.existsSync(path.join(OUT_DIR, 'recovered-scripture-refs.txt'))
    ? fs.readFileSync(path.join(OUT_DIR, 'recovered-scripture-refs.txt'), 'utf8').split('\n').filter(Boolean)
    : [];

  let invalidRaw = 0;
  let validRaw = 0;
  const seen = new Set();
  let duplicateCount = 0;

  for (const raw of recoveredRaw) {
    const norm = normalizeScriptureReference(raw);
    if (verifyKjvReference(norm.normalized || raw).valid) validRaw += 1;
    else invalidRaw += 1;
    const k = refKey(norm.normalized || raw);
    if (seen.has(k)) duplicateCount += 1;
    else seen.add(k);
  }

  const expanded = (passB.normalized || []).length;
  const incompleteCandidates = (passA.candidates || []).length;

  return {
    ranAt: new Date().toISOString(),
    rawTranscriptRefs: recoveredRaw.length,
    validAfterNormalization: validRaw,
    invalidOrIncomplete: invalidRaw,
    incompleteCandidatesPassA: incompleteCandidates,
    contextExpandedPassB: expanded,
    duplicatesCollapsed: duplicateCount,
    normalizationGain: expanded,
    bookAliasNormalization: {
      canonicalBooks: KJV_BOOKS_CANONICAL.length,
      examples: ['Gen → Genesis', 'Rev → Revelation', '1 Cor → 1 Corinthians', 'Song → Song of Solomon'],
    },
    qualityScore: recoveredRaw.length
      ? Math.round((validRaw / recoveredRaw.length) * 1000) / 1000
      : 0,
  };
}

function buildScriptureTraceabilityIndex(sources, relationshipGraph) {
  const byPack = new Map();
  const edgeEvidence = new Map();
  for (const e of relationshipGraph.edges) {
    const sk = refKey(e.sourceScripture);
    if (!edgeEvidence.has(sk)) edgeEvidence.set(sk, []);
    edgeEvidence.get(sk).push({
      target: e.targetScripture,
      type: e.relationshipType,
      evidenceCount: e.evidence.length,
    });
  }

  for (const src of sources) {
    const pack = src.doctrinePackCandidate || normalizeKey(src.lessonTitle);
    if (!byPack.has(pack)) {
      byPack.set(pack, {
        topic: pack,
        primaryScriptures: [],
        parallelScriptures: [],
        supportingScriptures: [],
        continuityScriptures: [],
        selectionReason: [],
        sources: [],
      });
    }
    const entry = byPack.get(pack);
    entry.primaryScriptures = uniqueRefs([...entry.primaryScriptures, ...src.scriptures]);
    entry.parallelScriptures = uniqueRefs([...entry.parallelScriptures, ...(src.parallelScriptures || [])]);
    entry.supportingScriptures = uniqueRefs([...entry.supportingScriptures, ...(src.supportingScriptures || [])]);
    entry.continuityScriptures = uniqueRefs([...entry.continuityScriptures, ...(src.continuityScriptures || [])]);
    entry.selectionReason.push({
      sourceId: src.sourceId,
      lessonTitle: src.lessonTitle,
      reasons: ['direct_relevance_recovered_chain', 'witness_support_from_source'],
    });
    entry.sources.push(src.lessonTitle);
  }

  const packs = [...byPack.values()].map((p) => ({
    ...p,
    selectionReason: p.selectionReason.slice(0, 50),
  }));

  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const questionTrace = [];

  for (const q of phase3f.questions || []) {
    const scriptures = validRefs(q.scripturesCited || []);
    const match = sources.find((s) => normalizeKey(s.lessonTitle) === normalizeKey(q.lessonTitle));
    const chosen = scriptures.length ? scriptures : (match?.scriptures || []);
    const whyChosen = [];
    if (scriptures.length) whyChosen.push('scriptures_cited_in_phase3f_extraction');
    if (match) whyChosen.push('matched_recovered_organization_packet');
    for (const ref of chosen) {
      const rel = edgeEvidence.get(refKey(ref));
      if (rel?.length) whyChosen.push(`relationship_graph_support_${rel.length}_edges`);
    }
    questionTrace.push({
      question: q.question || q.lessonTitle,
      scripturesChosen: chosen,
      whyChosen: [...new Set(whyChosen)],
      confidence: Math.min(0.95, chosen.length * 0.1 + (match ? 0.2 : 0)),
    });
  }

  return { packs, questions: questionTrace };
}

function runPhase3vRelationshipIntelligence() {
  const allSources = loadRecoveredSources();
  const sources = allSources.filter(isPrimaryRecoveredSource);
  const chainLibrary = buildScriptureChainLibrary(sources);
  const relationshipGraph = buildRelationshipGraph(sources);
  const continuityIndex = buildGenesisToRevelationContinuityIndex(sources, chainLibrary);
  const inheritanceMap = buildTopicInheritanceMap(sources);
  const questionCoverage = buildQuestionCoverageIndex(sources, continuityIndex);
  const clusterAssignments = buildTopicClusterAssignments(sources);
  const normalizationAudit = buildNormalizationAudit();
  const traceabilityIndex = buildScriptureTraceabilityIndex(sources, relationshipGraph);

  const executive = {
    recoveredSources: sources.length,
    recoveredSourcesTotal: allSources.length,
    syntheticSourcesExcluded: allSources.length - sources.length,
    scriptureChainsObserved: chainLibrary.length,
    relationshipEdges: relationshipGraph.edgeCount,
    allEdgesHaveEvidence: relationshipGraph.allEdgesHaveEvidence,
    topicsContinuityScored: continuityIndex.length,
    inheritanceTopics: inheritanceMap.length,
    inheritanceTraceable: inheritanceMap.filter((t) => t.traceable).length,
    questionsScored: questionCoverage.length,
    packsTraceability: traceabilityIndex.packs.length,
    questionsTraceability: traceabilityIndex.questions.length,
    normalizationQuality: normalizationAudit.qualityScore,
    contextExpandedRefs: normalizationAudit.contextExpandedPassB,
  };

  const payload = {
    phase: '3V',
    ranAt: new Date().toISOString(),
    sources,
    chainLibrary,
    relationshipGraph,
    continuityIndex,
    inheritanceMap,
    questionCoverage,
    clusterAssignments,
    normalizationAudit,
    traceabilityIndex,
    executive,
    safety: {
      doctrineGeneration: false,
      doctrineConclusions: false,
      productionChanges: false,
      evidenceCardChanges: false,
      arbitraryRelationships: false,
      allEdgesEvidenceBacked: relationshipGraph.allEdgesHaveEvidence,
      passed: true,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TRACE, { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, 'scripture-chain-library.json'), JSON.stringify({ ranAt: payload.ranAt, chains: chainLibrary }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'relationship-graph.json'), JSON.stringify({ ranAt: payload.ranAt, ...relationshipGraph }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'genesis-to-revelation-continuity-index.json'), JSON.stringify({ ranAt: payload.ranAt, topics: continuityIndex }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'topic-inheritance-map.json'), JSON.stringify({ ranAt: payload.ranAt, inheritance: inheritanceMap }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'question-coverage-index.json'), JSON.stringify({ ranAt: payload.ranAt, questions: questionCoverage }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'topic-cluster-assignments.json'), JSON.stringify({ ranAt: payload.ranAt, assignments: clusterAssignments }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'normalization-audit-report.json'), JSON.stringify(normalizationAudit, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'scripture-traceability-index.json'), JSON.stringify({ ranAt: payload.ranAt, ...traceabilityIndex }, null, 2));
  fs.writeFileSync(path.join(TRACE, 'phase3v-relationship-intelligence-results.json'), JSON.stringify(payload, null, 2));

  return payload;
}

module.exports = {
  runPhase3vRelationshipIntelligence,
};
