/**
 * Phase 3I — Scripture recursive expansion from doctrine pack seeds.
 * Bible-internal expansion only — no internet discovery, no production mutations.
 */

const fs = require('fs');
const path = require('path');
const { expandFullScriptureWitnesses } = require('./corpusExpansionDiscovery');
const { discoverGenesisToRevelation } = require('./scriptureDiscoveryGenesisRevelation');
const { searchCorpusForG2R } = require('./expandedScriptureDiscovery');
const { correctedClassifyScriptureBuckets } = require('./phase3bDiscoveryAudit');
const { lookupByTopic } = require('./concordanceFoundation');
const { getRegistryChain, getRegistryTopic } = require('./genesisToRevelationContinuityRegistry');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { expandScriptureParallels } = require('./scriptureParallelExpansion');
const { buildUnifiedReviewObject } = require('./scriptureResearchReviewConsole');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { strengthTierForScore } = require('./scriptureStrengthReview');
const {
  buildImplementationImpactAnalysis,
  buildMissingTopicWatchlist,
  computeImplementationConfidence,
  computeLearningGainScore,
} = require('./phase3gTopicPackConsolidation');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const PACK_TO_REGISTRY = {
  sabbath: 'sabbath',
  dietary_law: 'dietary_law',
  death_state: 'death_resurrection',
  resurrection: 'resurrection',
  messiah_logos: 'messiah',
  kingdom_of_god: 'kingdom',
  feasts: 'feast_days',
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
};

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

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
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

function refKey(ref = '') {
  return String(ref || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function refInSet(ref, set) {
  const k = refKey(ref);
  return set.has(k) || [...set].some((s) => k.startsWith(s.split(':')[0]) || s.startsWith(k.split(':')[0]));
}

function bookOrderIndex(ref = '') {
  const kjv = verifyKjvReference(ref);
  if (!kjv.valid || !kjv.book) return 999;
  const idx = KJV_BOOK_ORDER.indexOf(kjv.book);
  return idx >= 0 ? idx : 999;
}

function registryKeyForPack(topic = '') {
  return PACK_TO_REGISTRY[topic] || topic;
}

function collectSeedReferences(pack) {
  return uniqueRefs([
    ...(pack.allOriginalScriptures || []),
    ...(pack.allParallelScriptures || []),
    ...(pack.allSupportingScriptures || []),
    ...(pack.allContinuityScriptures || []),
    ...(pack.strongestChain?.originalScriptureChain || []),
  ]);
}

function recursiveBibleSearch(seeds, topic, { maxDepth = 2 } = {}) {
  const seen = new Set(seeds.map(refKey));
  const discovered = [];

  function pass(currentSeeds, depth) {
    if (depth > maxDepth) return;
    const batch = [];

    for (const entry of lookupByTopic(topic)) {
      for (const r of entry.occurrences || []) {
        if (!refInSet(r, seen)) batch.push(r);
      }
    }

    const regKey = registryKeyForPack(topic);
    const registry = getRegistryTopic(regKey);
    if (registry?.canonicalChain) {
      for (const node of registry.canonicalChain) {
        const r = node.reference;
        if (!refInSet(r, seen)) batch.push(r);
      }
    }
    if (registry?.sisThemes) {
      for (const theme of registry.sisThemes) {
        for (const entry of lookupByTopic(theme)) {
          for (const r of entry.occurrences || []) {
            if (!refInSet(r, seen)) batch.push(r);
          }
        }
      }
    }

    for (const chain of loadContinuityChains().chains || []) {
      if (chain.topic === topic || (chain.approved && chain.topic === regKey)) {
        for (const n of chain.nodes || []) {
          const r = n.reference;
          if (!refInSet(r, seen)) batch.push(r);
        }
      }
    }

    const expansion = expandFullScriptureWitnesses({
      topic,
      question: `Bible recursive expansion: ${topic}`,
      scripturesCited: currentSeeds,
      scriptureOrder: currentSeeds,
    });
    for (const r of [
      ...(expansion.continuityWitnesses || []),
      ...(expansion.supportingWitnesses || []),
      ...(expansion.confirmingWitnesses || []),
      ...(expansion.concordanceWitnesses || []),
      ...(expansion.parallelRefs || []),
    ]) {
      if (!refInSet(r, seen)) batch.push(r);
    }

    const g2r = discoverGenesisToRevelation({
      scripturesCited: currentSeeds,
      scriptureOrder: currentSeeds,
      topic,
    });
    for (const r of [
      ...(g2r.supportingScriptures || []),
      ...(g2r.parallelScriptures || []),
      ...(g2r.continuityScriptures || []),
    ]) {
      if (!refInSet(r, seen)) batch.push(r);
    }

    const corpus = searchCorpusForG2R(currentSeeds, currentSeeds);
    for (const r of [
      ...(corpus.parallelWitnesses || []),
      ...(corpus.genesisAnchors || []),
      ...(corpus.revelationAnchors || []),
    ]) {
      if (!refInSet(r, seen)) batch.push(r);
    }

    for (const r of expandScriptureParallels({ scriptureChain: currentSeeds })) {
      if (!refInSet(r, seen)) batch.push(r);
    }

    for (const edge of getAllApprovedSupportEdges().filter((e) => e.topic === topic || e.topic === regKey)) {
      for (const r of edge.scriptures || []) {
        if (!refInSet(r, seen)) batch.push(r);
      }
    }

    const valid = uniqueRefs(batch);
    for (const r of valid) {
      seen.add(refKey(r));
      discovered.push(r);
    }

    if (valid.length && depth < maxDepth) {
      pass(uniqueRefs([...currentSeeds, ...valid]), depth + 1);
    }
  }

  pass(seeds, 0);
  return uniqueRefs(discovered);
}

function buildStrongestG2RChain(seeds, expandedRefs) {
  const all = uniqueRefs([...seeds, ...expandedRefs]);
  const genesis = all.filter((r) => /^genesis/i.test(r)).sort((a, b) => bookOrderIndex(a) - bookOrderIndex(b));
  const revelation = all.filter((r) => /^revelation/i.test(r)).sort((a, b) => bookOrderIndex(a) - bookOrderIndex(b));
  const middle = all
    .filter((r) => !/^genesis/i.test(r) && !/^revelation/i.test(r))
    .sort((a, b) => bookOrderIndex(a) - bookOrderIndex(b));

  const chain = uniqueRefs([
    ...genesis.slice(0, 3),
    ...middle,
    ...revelation.slice(0, 3),
  ]);

  const corpus = searchCorpusForG2R(seeds, chain);
  if (corpus.g2rChainCandidate?.length) {
    return uniqueRefs(corpus.g2rChainCandidate);
  }
  return chain;
}

function classifyNewRefs(newRefs, pack, seeds, expansion, g2r, corpus) {
  const regKey = registryKeyForPack(pack.topic);
  const priorParallel = new Set((pack.allParallelScriptures || []).map(refKey));
  const priorSupporting = new Set((pack.allSupportingScriptures || []).map(refKey));
  const priorContinuity = new Set((pack.allContinuityScriptures || []).map(refKey));
  const seedSet = new Set(seeds.map(refKey));

  const continuityPool = new Set(uniqueRefs([
    ...(expansion.continuityWitnesses || []),
    ...(g2r.continuityScriptures || []),
    ...getRegistryChain(regKey).map((n) => n.reference),
    ...(loadContinuityChains().chains || [])
      .filter((c) => c.topic === pack.topic || c.topic === regKey)
      .flatMap((c) => (c.nodes || []).map((n) => n.reference)),
  ]).map(refKey));

  const supportingPool = new Set(uniqueRefs([
    ...(expansion.supportingWitnesses || []),
    ...(expansion.confirmingWitnesses || []),
    ...(g2r.supportingScriptures || []),
    ...getAllApprovedSupportEdges()
      .filter((e) => (e.topic === pack.topic || e.topic === regKey)
        && ['supports', 'confirms', 'establishes'].includes(e.supportType))
      .flatMap((e) => e.scriptures || []),
  ]).map(refKey));

  const parallelPool = new Set(uniqueRefs([
    ...(expansion.concordanceWitnesses || []),
    ...(g2r.parallelScriptures || []),
    ...(corpus.parallelWitnesses || []),
    ...expandScriptureParallels({ scriptureChain: seeds }),
  ]).map(refKey));

  const newParallel = [];
  const newSupporting = [];
  const newContinuity = [];

  for (const r of newRefs) {
    const k = refKey(r);
    if (priorParallel.has(k) || priorContinuity.has(k) || priorSupporting.has(k) || seedSet.has(k)) continue;
    if (continuityPool.has(k)) {
      newContinuity.push(r);
    } else if (parallelPool.has(k)) {
      newParallel.push(r);
    } else if (supportingPool.has(k)) {
      newSupporting.push(r);
    } else {
      newSupporting.push(r);
    }
  }

  return {
    newParallel: uniqueRefs(newParallel),
    newSupporting: uniqueRefs(newSupporting),
    newContinuity: uniqueRefs(newContinuity),
  };
}

function expandDoctrinePack(pack, { maxDepth = 2 } = {}) {
  const seeds = collectSeedReferences(pack);
  const originalOnly = uniqueRefs(pack.allOriginalScriptures || pack.strongestChain?.originalScriptureChain || []);
  const seedSet = new Set(seeds.map(refKey));

  const before = {
    scriptureCount: originalOnly.length || pack.scriptureCount || seeds.length,
    parallelCount: (pack.allParallelScriptures || []).length,
    supportingCount: (pack.allSupportingScriptures || []).length,
    continuityCount: (pack.allContinuityScriptures || []).length,
    g2rLinks: (pack.allGenesisToRevelationChains || []).flat().length,
  };

  const expandedRefs = recursiveBibleSearch(seeds, pack.topic, { maxDepth });
  const newRefs = expandedRefs.filter((r) => !seedSet.has(refKey(r)));

  const expansion = expandFullScriptureWitnesses({
    topic: pack.topic,
    question: pack.strongestChain?.question || pack.displayName,
    scripturesCited: uniqueRefs([...originalOnly, ...newRefs]),
    scriptureOrder: uniqueRefs([...originalOnly, ...newRefs]),
  });

  const g2r = discoverGenesisToRevelation({
    scripturesCited: uniqueRefs([...originalOnly, ...newRefs]),
    scriptureOrder: uniqueRefs([...originalOnly, ...newRefs]),
    topic: pack.topic,
  });

  const corpus = searchCorpusForG2R(originalOnly, uniqueRefs([...originalOnly, ...newRefs]));

  const classified = classifyNewRefs(newRefs, pack, seeds, expansion, g2r, corpus);
  const newParallel = classified.newParallel;
  const newSupporting = classified.newSupporting;
  const newContinuity = classified.newContinuity;

  const g2rChain = buildStrongestG2RChain(seeds, newRefs);
  const priorG2rFlat = uniqueRefs((pack.allGenesisToRevelationChains || []).flat());
  const priorG2rSet = new Set(priorG2rFlat.map(refKey));
  const g2rLinksAdded = g2rChain.filter((r) => !priorG2rSet.has(refKey(r))).length;

  const allOriginalAfter = uniqueRefs([...originalOnly, ...newRefs]);
  const allParallelAfter = uniqueRefs([...(pack.allParallelScriptures || []), ...newParallel]);
  const allSupportingAfter = uniqueRefs([...(pack.allSupportingScriptures || []), ...newSupporting]);
  const allContinuityAfter = uniqueRefs([...(pack.allContinuityScriptures || []), ...newContinuity]);

  return {
    topic: pack.topic,
    displayName: pack.displayName,
    seedCount: seeds.length,
    seeds,
    expandedRefs: newRefs,
    newParallelScriptures: newParallel,
    newSupportingScriptures: newSupporting,
    newContinuityScriptures: newContinuity,
    genesisToRevelationChain: g2rChain,
    genesisToRevelationSpan: g2rChain.some((r) => /^genesis/i.test(r))
      && g2rChain.some((r) => /^revelation/i.test(r)),
    enrichment: {
      scriptureCountBefore: before.scriptureCount,
      scriptureCountAfter: allOriginalAfter.length,
      parallelBefore: before.parallelCount,
      parallelAfter: allParallelAfter.length,
      parallelAdded: allParallelAfter.length - before.parallelCount,
      supportingBefore: before.supportingCount,
      supportingAfter: allSupportingAfter.length,
      supportingAdded: allSupportingAfter.length - before.supportingCount,
      continuityBefore: before.continuityCount,
      continuityAfter: allContinuityAfter.length,
      continuityAdded: allContinuityAfter.length - before.continuityCount,
      genesisToRevelationLinksAdded: g2rLinksAdded,
    },
    enrichedPack: {
      ...pack,
      allOriginalScriptures: allOriginalAfter,
      allParallelScriptures: allParallelAfter,
      allSupportingScriptures: allSupportingAfter,
      allContinuityScriptures: allContinuityAfter,
      allGenesisToRevelationChains: [g2rChain],
      scriptureCount: allOriginalAfter.length,
      parallelScriptureCount: allParallelAfter.length,
      supportingScriptureCount: allSupportingAfter.length,
      continuityScriptureCount: allContinuityAfter.length,
    },
    expansionMeta: {
      recursiveDepth: maxDepth,
      sourcesUsed: ['concordance', 'continuity_chains', 'g2r_registry', 'witness_expansion', 'support_graph', 'parallel_heuristics'],
    },
  };
}

function scoreEnrichedPack(enrichedPack, expansionResult) {
  const priorScore = enrichedPack.supportScore || 0;
  const strongestChain = enrichedPack.strongestChain?.originalScriptureChain
    || enrichedPack.allOriginalScriptures?.slice(0, 15)
    || [];

  const review = buildUnifiedReviewObject({
    candidateId: `3i_${enrichedPack.topic}`,
    question: enrichedPack.strongestChain?.question || enrichedPack.displayName,
    topic: enrichedPack.topic,
    scripturesCited: strongestChain,
    scriptureOrder: expansionResult.genesisToRevelationChain.slice(0, 15),
    source: 'phase3i_recursive',
    sourceType: 'bible_expansion',
  });

  const depthBonus = Math.min(
    28,
    expansionResult.enrichment.parallelAdded * 1.5
    + expansionResult.enrichment.supportingAdded * 0.8
    + expansionResult.enrichment.continuityAdded * 2.5
    + Math.min(8, expansionResult.enrichment.genesisToRevelationLinksAdded * 0.25)
    + Math.min(6, expansionResult.expandedRefs.length * 0.1),
  );

  const blendedBase = Math.round((priorScore * 0.55) + (review.supportScore * 0.45));
  const supportScore = Math.min(100, blendedBase + depthBonus);
  const strengthTier = strengthTierForScore(supportScore);

  return {
    supportScore,
    strengthTier,
    priorSupportScore: priorScore,
    scoreDelta: supportScore - priorScore,
    scoreExplanation: `Prior ${priorScore}; chain review ${review.supportScore}; recursive depth +${Math.round(depthBonus)}. Informational only — does not override human review.`,
  };
}

function buildTopicExpansionCandidates(missingWatchlist, chains, packExpansions) {
  const targets = [
    ...missingWatchlist.missingTopics.map((m) => m.topic),
    ...missingWatchlist.weakTopics.map((w) => w.topic),
    ...missingWatchlist.majorTopicsMissing,
    ...missingWatchlist.majorTopicsWeak,
  ];
  const uniqueTargets = [...new Set(targets)];

  return uniqueTargets.map((topic) => {
    const label = topic.replace(/_/g, ' ');
    const re = new RegExp(label.replace(/\s+/g, '|'), 'i');

    const matchingChains = chains.filter((c) =>
      c.topic === topic
      || re.test(c.lessonTitle || '')
      || re.test(c.question || ''),
    );

    const matchingPacks = packExpansions.filter((e) =>
      e.topic === topic
      || re.test(e.displayName || ''),
    );

    const scriptureRefs = uniqueRefs(matchingChains.flatMap((c) => c.originalScriptureChain || []));
    const expandedRefs = uniqueRefs(matchingPacks.flatMap((e) => e.expandedRefs || []));

    const chainCount = matchingChains.length;
    const scriptureCount = uniqueRefs([...scriptureRefs, ...expandedRefs]).length;
    const packCandidate = scriptureCount >= 5 && chainCount >= 1;

    return {
      topic,
      displayName: label.replace(/\b\w/g, (c) => c.toUpperCase()),
      status: missingWatchlist.missingTopics.some((m) => m.topic === topic) ? 'missing' : 'weak',
      matchingChainCount: chainCount,
      scriptureRefsFound: scriptureCount,
      sampleChains: matchingChains.slice(0, 3).map((c) => ({
        question: c.question,
        lessonTitle: c.lessonTitle,
        scriptureCount: (c.originalScriptureChain || []).length,
      })),
      expandedScriptureCandidates: expandedRefs.slice(0, 15),
      canBecomeDoctrinePack: packCandidate,
      recommendation: packCandidate
        ? 'Sufficient extracted + expanded scripture to form doctrine pack after human review'
        : 'Needs more scripture depth or chain consolidation before pack promotion',
    };
  }).sort((a, b) => b.scriptureRefsFound - a.scriptureRefsFound);
}

function buildImplementationQueues(rankedPacks) {
  const bucket = (min, max) => rankedPacks
    .filter((p) => p.supportScore >= min && p.supportScore <= max)
    .map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      supportScore: p.supportScore,
      strengthTier: p.strengthTier,
      implementationConfidence: p.implementationConfidence,
      learningGainScore: p.learningGainScore,
      scriptureCount: p.scriptureCount,
    }));

  return {
    queue95: bucket(95, 100),
    queue90: bucket(90, 94),
    queue80: bucket(80, 89),
    queueBelow80: rankedPacks.filter((p) => p.supportScore < 80).map((p) => ({
      topic: p.topic,
      supportScore: p.supportScore,
    })),
  };
}

function loadPhase3gPacks() {
  const trace = loadJson(path.join(TRACE, 'phase3g-topic-pack-consolidation-results.json'));
  if (trace?.packs?.length) return trace;
  throw new Error('phase3g-topic-pack-consolidation-results.json missing — run Phase 3G first');
}

function runPhase3iRecursiveExpansion() {
  const phase3g = loadPhase3gPacks();
  const chains = loadJson(path.join(OUT_DIR, 'expanded-scripture-chains.json'), {}).chains || [];
  const packs = phase3g.packs;

  const packExpansions = packs.map((pack) => expandDoctrinePack(pack));
  const enrichedPacks = packExpansions.map((e) => e.enrichedPack);

  const scored = packExpansions.map((exp) => {
    const scoring = scoreEnrichedPack(exp.enrichedPack, exp);
    const enriched = {
      ...exp.enrichedPack,
      supportScore: scoring.supportScore,
      strengthTier: scoring.strengthTier,
      priorSupportScore: scoring.priorSupportScore,
      scoreDelta: scoring.scoreDelta,
      scoreExplanation: scoring.scoreExplanation,
    };

    const impactStub = {
      newScripturesAdded: exp.expandedRefs.length,
      newChainsAdded: 0,
      newQuestionsCovered: 0,
    };
    const implementationConfidence = computeImplementationConfidence(
      enriched,
      exp.expandedRefs.length,
      exp.enrichment.scriptureCountAfter - exp.enrichment.scriptureCountBefore,
    );
    const learningGainScore = computeLearningGainScore(enriched, impactStub)
      + exp.enrichment.parallelAdded * 3
      + exp.enrichment.supportingAdded * 3
      + exp.enrichment.continuityAdded * 4
      + exp.enrichment.genesisToRevelationLinksAdded * 5;

    return {
      ...enriched,
      implementationConfidence,
      learningGainScore,
      enrichment: exp.enrichment,
      genesisToRevelationChain: exp.genesisToRevelationChain,
      newParallelScriptures: exp.newParallelScriptures,
      newSupportingScriptures: exp.newSupportingScriptures,
      newContinuityScriptures: exp.newContinuityScriptures,
      exceedsImplementationThreshold: (
        scoring.supportScore >= 90 && enriched.scriptureCount >= 8
      ) || (
        scoring.priorSupportScore >= 85 && exp.enrichment.scriptureCountAfter >= 15
      ),
    };
  }).sort((a, b) => b.learningGainScore - a.learningGainScore);

  const missingWatchlist = phase3g.missingTopicWatchlist || buildMissingTopicWatchlist(packs);
  const topicCandidates = buildTopicExpansionCandidates(missingWatchlist, chains, packExpansions);

  const totals = {
    newParallelScriptures: packExpansions.reduce((s, e) => s + e.newParallelScriptures.length, 0),
    newSupportingScriptures: packExpansions.reduce((s, e) => s + e.newSupportingScriptures.length, 0),
    newContinuityScriptures: packExpansions.reduce((s, e) => s + e.newContinuityScriptures.length, 0),
    newScriptureRefs: packExpansions.reduce((s, e) => s + e.expandedRefs.length, 0),
    g2rLinksAdded: packExpansions.reduce((s, e) => s + e.enrichment.genesisToRevelationLinksAdded, 0),
  };

  const packsGainedMostDepth = [...scored]
    .sort((a, b) => (
      (b.enrichment.scriptureCountAfter - b.enrichment.scriptureCountBefore)
      - (a.enrichment.scriptureCountAfter - a.enrichment.scriptureCountBefore)
    ))
    .slice(0, 15)
    .map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      scripturesAdded: p.enrichment.scriptureCountAfter - p.enrichment.scriptureCountBefore,
      parallelAdded: p.enrichment.parallelAdded,
      supportingAdded: p.enrichment.supportingAdded,
      continuityAdded: p.enrichment.continuityAdded,
    }));

  const exceedsThreshold = scored.filter((p) => p.exceedsImplementationThreshold);
  const newPackCandidates = topicCandidates.filter((t) => t.canBecomeDoctrinePack);

  const implementationImpact = buildImplementationImpactAnalysis(enrichedPacks);
  const queues = buildImplementationQueues(scored);

  const projectedLearningGain = scored
    .filter((p) => p.implementationConfidence === 'High' || p.implementationConfidence === 'Medium')
    .reduce((s, p) => s + p.learningGainScore, 0);

  const executive = {
    packsExpanded: packExpansions.length,
    newParallelScriptures: totals.newParallelScriptures,
    newSupportingScriptures: totals.newSupportingScriptures,
    newContinuityScriptures: totals.newContinuityScriptures,
    newScriptureRefs: totals.newScriptureRefs,
    g2rLinksAdded: totals.g2rLinksAdded,
    packsGainedMostDepth,
    exceedsImplementationThreshold: exceedsThreshold.map((p) => p.topic),
    exceedsImplementationThresholdCount: exceedsThreshold.length,
    newDoctrinePackCandidates: newPackCandidates.map((t) => t.topic),
    newDoctrinePackCandidateCount: newPackCandidates.length,
    reviewFirst: scored
      .filter((p) => p.supportScore >= 85 || p.learningGainScore >= 100)
      .slice(0, 15)
      .map((p) => ({
        topic: p.topic,
        displayName: p.displayName,
        supportScore: p.supportScore,
        learningGainScore: p.learningGainScore,
        implementationConfidence: p.implementationConfidence,
      })),
    projectedLearningGain,
    highConfidencePacks: scored.filter((p) => p.implementationConfidence === 'High').map((p) => p.topic),
    implementFirstForLearning: scored.slice(0, 10).map((p, i) => ({
      rank: i + 1,
      topic: p.topic,
      displayName: p.displayName,
      learningGainScore: p.learningGainScore,
      supportScore: p.supportScore,
    })),
    weakMajorTopics: missingWatchlist.majorTopicsWeak,
    missingMajorTopics: missingWatchlist.majorTopicsMissing,
  };

  const payload = {
    phase: '3I',
    ranAt: new Date().toISOString(),
    inputPhase3gAt: phase3g.ranAt,
    packExpansions,
    enrichedPacks: scored,
    topicExpansionCandidates: topicCandidates,
    implementationImpact,
    queues,
    totals,
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
    path.join(TRACE, 'phase3i-recursive-expansion-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'enriched-topic-packs.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, packs: scored, totals }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'expanded-implementation-queues.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, queues, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3iRecursiveExpansion,
  expandDoctrinePack,
  recursiveBibleSearch,
  buildStrongestG2RChain,
  scoreEnrichedPack,
  collectSeedReferences,
  uniqueRefs,
  refKey,
};
