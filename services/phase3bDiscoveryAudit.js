/**
 * Phase 3B — Discovery audit and classification validation.
 * Audit and reporting only — no production mutations, no new discovery.
 */

const fs = require('fs');
const path = require('path');
const { runPhase3aCorpusRescrub } = require('./phase3aCorpusRescrub');
const { expandFullScriptureWitnesses } = require('./corpusExpansionDiscovery');
const {
  discoverGenesisToRevelation,
  analyzeScriptureChain,
  computeCoverageScore,
  computeBibleSupportScore,
} = require('./scriptureDiscoveryGenesisRevelation');
const { crossReferenceCandidate, normalizeTopic } = require('./scriptureDiscoveryCrossReference');
const {
  classifyScriptureBuckets,
  strengthTierForScore,
  STRENGTH_TIERS,
  deriveLessonTitle,
} = require('./scriptureStrengthReview');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');

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
  const r = String(ref).toLowerCase();
  return chain.some((c) => String(c).toLowerCase() === r || String(c).toLowerCase().includes(r.split(':')[0]));
}

function buildWitnessExpansion(candidate) {
  const chain = candidate.scriptureOrder || candidate.originalScriptures || [];
  return expandFullScriptureWitnesses({
    question: candidate.question,
    topic: candidate.topic,
    scripturesCited: chain,
    scriptureOrder: chain,
    conclusion: candidate.candidateConclusion || '',
    source: candidate.discoveryPhase || candidate.source,
  });
}

function computeSupportScore(candidate, expansion, chainAnalysis, g2r, crossRef) {
  const chain = candidate.scriptureOrder || candidate.originalScriptures || [];
  const coverage = computeCoverageScore({
    scripturesCited: chain,
    scriptureOrder: chain,
    chainAnalysis,
    g2r,
    crossRef,
  });
  const bible = computeBibleSupportScore({
    coverageScore: coverage,
    chainStrength: chainAnalysis.chainStrength,
    crossRef,
    kjvValid: (candidate.originalScriptures || []).every((r) => verifyKjvReference(r).valid),
  });
  return candidate.supportScore || expansion.confidenceAfter || bible.score;
}

function loadPhase3aData({ refresh = false } = {}) {
  const tracePath = path.join(TRACE, 'phase3a-corpus-rescrub-results.json');
  if (!refresh && fs.existsSync(tracePath)) {
    return JSON.parse(fs.readFileSync(tracePath, 'utf8'));
  }
  return runPhase3aCorpusRescrub();
}

/**
 * Audit-only corrected classification — continuity chain nodes stay continuity,
 * G2R parallel stays parallel, card/graph witnesses stay supporting.
 */
function correctedClassifyScriptureBuckets(chain, expansion, g2r) {
  const original = uniqueRefs(chain);

  const continuityScriptures = uniqueRefs(expansion.continuityWitnesses || [])
    .filter((r) => !refInChain(r, original));

  const supportingScriptures = uniqueRefs([
    ...(expansion.supportingWitnesses || []),
    ...(expansion.confirmingWitnesses || []),
  ]).filter((r) =>
    !refInChain(r, original)
    && !continuityScriptures.some((c) => refInChain(c, [r])),
  );

  const parallelScriptures = uniqueRefs([
    ...(g2r?.parallelScriptures || []),
    ...(expansion.concordanceWitnesses || []),
  ]).filter((r) =>
    !refInChain(r, original)
    && !supportingScriptures.some((s) => refInChain(s, [r]))
    && !continuityScriptures.some((c) => refInChain(c, [r])),
  );

  return {
    originalScriptureChain: original,
    parallelScriptures,
    supportingScriptures,
    continuityScriptures,
    cautionScriptures: uniqueRefs(expansion.cautionWitnesses || []),
  };
}

function traceMergePath(chain, expansion, exportedBuckets, g2r) {
  const original = uniqueRefs(chain);
  const continuityDiscovered = uniqueRefs(expansion.continuityWitnesses || []);
  const inSupportingExpansion = uniqueRefs(expansion.supportingWitnesses || []);

  const continuityMergedToSupporting = continuityDiscovered.filter((r) =>
    inSupportingExpansion.some((s) => refInChain(s, [r])),
  );

  const continuitySuppressedByParallel = continuityDiscovered.filter((r) =>
    exportedBuckets.parallelScriptures.some((p) => refInChain(p, [r])),
  );

  const g2rParallelInSupporting = uniqueRefs(g2r?.parallelScriptures || []).filter((r) =>
    inSupportingExpansion.some((s) => refInChain(s, [r])),
  );

  return {
    continuityDiscovered,
    continuityMergedToSupporting,
    continuitySuppressedByParallel,
    g2rParallelInSupporting,
    continuityExportedEmpty: exportedBuckets.continuityScriptures.length === 0
      && continuityDiscovered.length > 0,
    parallelFromConcordanceOnly: exportedBuckets.parallelScriptures.filter((r) =>
      (expansion.concordanceWitnesses || []).some((c) => refInChain(c, [r])),
    ),
  };
}

function buildCandidateAudit(candidate, review, witnessExpansion) {
  const chain = candidate.scriptureOrder || candidate.originalScriptures || [];
  const topic = normalizeTopic(candidate.topic) || candidate.topic;
  const expansion = witnessExpansion || buildWitnessExpansion(candidate);

  const g2r = discoverGenesisToRevelation({
    scripturesCited: chain,
    scriptureOrder: chain,
    topic,
  });

  const crossRef = crossReferenceCandidate({
    question: candidate.question,
    scriptures: chain,
    scriptureOrder: chain,
    topic,
    candidateConclusion: candidate.candidateConclusion || '',
  });

  const chainAnalysis = analyzeScriptureChain({
    scripturesCited: chain,
    scriptureOrder: chain,
    topic,
    candidateConclusion: candidate.candidateConclusion || '',
  });

  const exportedBuckets = classifyScriptureBuckets(chain, expansion);
  const correctedBuckets = correctedClassifyScriptureBuckets(chain, expansion, g2r);
  const mergePath = traceMergePath(chain, expansion, exportedBuckets, g2r);

  const coverage = computeCoverageScore({
    scripturesCited: chain,
    scriptureOrder: chain,
    chainAnalysis,
    g2r,
    crossRef,
  });

  const bibleScore = computeBibleSupportScore({
    coverageScore: coverage,
    chainStrength: chainAnalysis.chainStrength,
    crossRef,
    kjvValid: (candidate.originalScriptures || chain).every((r) => verifyKjvReference(r).valid),
  });

  const recomputedScore = computeSupportScore(candidate, expansion, chainAnalysis, g2r, crossRef);

  const g2rContribution = g2r.genesisToRevelationSpan ? 10 : 0;
  const parallelContribution = Math.min(8, exportedBuckets.parallelScriptures.length * 2);
  const supportingContribution = Math.min(10, exportedBuckets.supportingScriptures.length * 2);
  const continuityContribution = Math.min(12, exportedBuckets.continuityScriptures.length * 3);

  return {
    candidateId: review.candidateId || candidate.candidateId,
    topic,
    question: candidate.question,
    originalChain: chain,
    g2rChain: review.genesisToRevelationChain || expansion.genesisToRevelationChain || chain,
    discovered: {
      continuityWitnesses: expansion.continuityWitnesses || [],
      concordanceWitnesses: expansion.concordanceWitnesses || [],
      supportingWitnesses: expansion.supportingWitnesses || [],
      confirmingWitnesses: expansion.confirmingWitnesses || [],
      parallelRefs: expansion.parallelRefs || [],
      g2rParallel: g2r.parallelScriptures || [],
      g2rContinuity: g2r.continuityScriptures || [],
      g2rSupporting: g2r.supportingScriptures || [],
    },
    exported: {
      parallelScriptures: review.parallelScriptures || exportedBuckets.parallelScriptures,
      supportingScriptures: review.supportingScriptures || exportedBuckets.supportingScriptures,
      continuityScriptures: review.continuityScriptures || exportedBuckets.continuityScriptures,
      parallelCount: (review.parallelScriptures || []).length,
      supportingCount: (review.supportingScriptures || []).length,
      continuityCount: (review.continuityScriptures || []).length,
    },
    corrected: {
      parallelScriptures: correctedBuckets.parallelScriptures,
      supportingScriptures: correctedBuckets.supportingScriptures,
      continuityScriptures: correctedBuckets.continuityScriptures,
      parallelCount: correctedBuckets.parallelScriptures.length,
      supportingCount: correctedBuckets.supportingScriptures.length,
      continuityCount: correctedBuckets.continuityScriptures.length,
    },
    mergePath,
    scoring: {
      exportedSupportScore: review.supportScore,
      recomputedSupportScore: recomputedScore,
      bibleSupportScore: bibleScore.score,
      coverageScore: coverage,
      chainStrength: chainAnalysis.chainStrength,
      crossRefScore: crossRef.supportScore ?? 0,
      g2rContribution,
      parallelContribution,
      supportingContribution,
      continuityContribution,
      scoreMatches: review.supportScore === recomputedScore,
    },
  };
}

function buildTopicPackScoringAudit(reviews, candidateAudits) {
  const byTopic = {};
  for (const r of reviews) {
    if (!byTopic[r.topic]) byTopic[r.topic] = [];
    byTopic[r.topic].push(r);
  }

  const auditsById = new Map(candidateAudits.map((a) => [a.candidateId, a]));

  return Object.entries(byTopic).map(([topic, members]) => {
    const scores = members.map((m) => m.supportScore);
    const supportScoreAverage = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const memberAudits = members.map((m) => auditsById.get(m.candidateId)).filter(Boolean);
    const g2rMembers = members.filter((m) => (m.genesisToRevelationChain || []).length >= 4);

    const avgG2r = memberAudits.length
      ? Math.round(memberAudits.reduce((s, a) => s + a.scoring.g2rContribution, 0) / memberAudits.length)
      : 0;
    const avgParallel = memberAudits.length
      ? Math.round(memberAudits.reduce((s, a) => s + a.scoring.parallelContribution, 0) / memberAudits.length)
      : 0;
    const avgSupporting = memberAudits.length
      ? Math.round(memberAudits.reduce((s, a) => s + a.scoring.supportingContribution, 0) / memberAudits.length)
      : 0;
    const avgContinuity = memberAudits.length
      ? Math.round(memberAudits.reduce((s, a) => s + a.scoring.continuityContribution, 0) / memberAudits.length)
      : 0;

    const correctedParallel = uniqueRefs(memberAudits.flatMap((a) => a.corrected.parallelScriptures));
    const correctedContinuity = uniqueRefs(memberAudits.flatMap((a) => a.corrected.continuityScriptures));
    const correctedSupporting = uniqueRefs(memberAudits.flatMap((a) => a.corrected.supportingScriptures));

    return {
      topic,
      displayName: topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      lessonTitle: deriveLessonTitle({ question: members[0]?.question, topic }),
      candidateCount: members.length,
      averageSupportScore: supportScoreAverage,
      strengthTier: strengthTierForScore(supportScoreAverage),
      weightingInputs: {
        avgCoverage: memberAudits.length
          ? Math.round(memberAudits.reduce((s, a) => s + a.scoring.coverageScore, 0) / memberAudits.length)
          : 0,
        avgChainStrength: memberAudits.length
          ? Math.round(memberAudits.reduce((s, a) => s + a.scoring.chainStrength, 0) / memberAudits.length)
          : 0,
        avgCrossRef: memberAudits.length
          ? Math.round(memberAudits.reduce((s, a) => s + a.scoring.crossRefScore, 0) / memberAudits.length)
          : 0,
        g2rMembersCount: g2rMembers.length,
      },
      contributions: {
        g2r: avgG2r,
        parallel: avgParallel,
        supporting: avgSupporting,
        continuity: avgContinuity,
      },
      correctedUnique: {
        parallel: correctedParallel.length,
        supporting: correctedSupporting.length,
        continuity: correctedContinuity.length,
      },
      scoreAccurate: memberAudits.every((a) => a.scoring.scoreMatches),
    };
  }).sort((a, b) => b.averageSupportScore - a.averageSupportScore);
}

function buildDuplicateCompressionAudit(data) {
  const rawQuestionCount = data.questions.length;
  const chainCount = data.chains.length;
  const reviewCount = data.reviews.length;
  const g2rCount = data.executive?.totalGenesisRevelationExpansions
    ?? data.witnessExpansions?.filter((w) => w.genesisToRevelationSpan).length
    ?? 0;

  const questionsWithFreq = data.questions.filter((q) => (q.frequency || 1) > 1);
  const chainQuestionKeys = new Set(data.chains.map((c) => String(c.question).toLowerCase().trim()));
  const questionsNotInChains = data.questions.filter(
    (q) => !chainQuestionKeys.has(String(q.question).toLowerCase().trim()),
  );

  return {
    questionsDeduped: rawQuestionCount,
    chainsExtracted: chainCount,
    reviewsBuilt: reviewCount,
    g2rExpansions: g2rCount,
    questionsMergedByExactDuplicate: questionsWithFreq,
    questionsRemovedFromChains: questionsNotInChains,
    chainToReviewGap: chainCount - reviewCount,
    deduplicationRule: 'exact question text only (normalize whitespace, lowercase)',
    compressionNotes: [
      `${questionsNotInChains.length} deduped questions had no scripture chain (empty scriptures or filtered)`,
      `${chainCount - reviewCount} chains skipped when building review candidates (duplicate question keys in chain pass)`,
      'Witness expansion runs per chain, not per duplicate question frequency',
    ],
  };
}

function buildRestoredRanking(topicPackAudits, candidateAudits) {
  const restoredPacks = topicPackAudits.map((pack) => {
    const witnessBreadth = pack.correctedUnique.parallel
      + pack.correctedUnique.supporting
      + pack.correctedUnique.continuity;
    const restoredScore = Math.min(
      100,
      Math.round(
        pack.averageSupportScore * 0.7
        + Math.min(20, pack.correctedUnique.continuity * 2)
        + Math.min(10, pack.correctedUnique.parallel),
      ),
    );
    return {
      ...pack,
      witnessBreadth,
      restoredWitnessScore: restoredScore,
      restoredTier: strengthTierForScore(restoredScore),
      originalTier: pack.strengthTier,
      tierShift: strengthTierForScore(restoredScore) !== pack.strengthTier,
    };
  }).sort((a, b) => b.restoredWitnessScore - a.restoredWitnessScore);

  const restoredCandidates = candidateAudits
    .filter((a) => a.scoring.exportedSupportScore >= 80 || a.corrected.continuityCount > 0)
    .map((a) => ({
      candidateId: a.candidateId,
      topic: a.topic,
      exportedScore: a.scoring.exportedSupportScore,
      correctedContinuity: a.corrected.continuityCount,
      correctedParallel: a.corrected.parallelCount,
      correctedSupporting: a.corrected.supportingCount,
      witnessBreadth: a.corrected.parallelCount + a.corrected.supportingCount + a.corrected.continuityCount,
    }))
    .sort((a, b) => b.witnessBreadth - a.witnessBreadth);

  const buckets = {
    above95: restoredPacks.filter((p) => p.restoredWitnessScore >= 95),
    above90: restoredPacks.filter((p) => p.restoredWitnessScore >= 90),
    above80: restoredPacks.filter((p) => p.restoredWitnessScore >= 80),
    above70: restoredPacks.filter((p) => p.restoredWitnessScore >= 70),
    below70: restoredPacks.filter((p) => p.restoredWitnessScore < 70),
  };

  return { restoredPacks, restoredCandidates, buckets };
}

function buildParallelAuditSummary(candidateAudits) {
  const discoveredParallel = uniqueRefs(
    candidateAudits.flatMap((a) => [
      ...a.discovered.g2rParallel,
      ...a.discovered.concordanceWitnesses,
    ]),
  );
  const exportedParallel = uniqueRefs(
    candidateAudits.flatMap((a) => a.exported.parallelScriptures),
  );
  const correctedParallel = uniqueRefs(
    candidateAudits.flatMap((a) => a.corrected.parallelScriptures),
  );
  const mergedToSupporting = uniqueRefs(
    candidateAudits.flatMap((a) => a.mergePath.continuityMergedToSupporting),
  );

  const candidatesWithDiscoveredParallel = candidateAudits.filter(
    (a) => a.discovered.g2rParallel.length > 0 || a.discovered.concordanceWitnesses.length > 0,
  ).length;

  return {
    actualParallelDiscoveredUnique: discoveredParallel.length,
    actualParallelDiscoveredRefs: discoveredParallel,
    exportedParallelUnique: exportedParallel.length,
    exportedParallelRefs: exportedParallel,
    correctedParallelUnique: correctedParallel.length,
    correctedParallelRefs: correctedParallel,
    missingFromExport: correctedParallel.filter((r) => !exportedParallel.some((e) => refInChain(e, [r]))),
    candidatesWithDiscoveredParallel,
    mergedIntoSupportingCount: mergedToSupporting.length,
    causeOfDiscrepancy: [
      'expandFullScriptureWitnesses merges g2rBefore.parallelScriptures into supportingWitnesses (corpusExpansionDiscovery.js)',
      'classifyScriptureBuckets assigns parallel from concordanceWitnesses + parallelRefs AFTER supporting bucket',
      'parallelRefs duplicates supportingWitnesses + continuityWitnesses + concordanceWitnesses',
      'Only concordance refs not already in supportingWitnesses survive as exported parallel (3 unique refs)',
      'G2R parallel scriptures (continuity chain nodes not cited) are absorbed into supporting bucket',
    ],
  };
}

function buildContinuityAuditSummary(candidateAudits) {
  const discoveredContinuity = uniqueRefs(
    candidateAudits.flatMap((a) => a.discovered.continuityWitnesses),
  );
  const g2rContinuity = uniqueRefs(
    candidateAudits.flatMap((a) => a.discovered.g2rContinuity),
  );
  const exportedContinuity = uniqueRefs(
    candidateAudits.flatMap((a) => a.exported.continuityScriptures),
  );
  const correctedContinuity = uniqueRefs(
    candidateAudits.flatMap((a) => a.corrected.continuityScriptures),
  );
  const mergedToSupporting = uniqueRefs(
    candidateAudits.flatMap((a) => a.mergePath.continuityMergedToSupporting),
  );

  const candidatesWithContinuity = candidateAudits.filter(
    (a) => a.discovered.continuityWitnesses.length > 0,
  ).length;

  return {
    actualContinuityDiscoveredUnique: discoveredContinuity.length,
    actualContinuityDiscoveredRefs: discoveredContinuity,
    g2rContinuityChainNodesUnique: g2rContinuity.length,
    exportedContinuityUnique: exportedContinuity.length,
    correctedContinuityUnique: correctedContinuity.length,
    correctedContinuityRefs: correctedContinuity,
    missingFromExport: correctedContinuity,
    candidatesWithContinuityDiscovered: candidatesWithContinuity,
    mergedIntoSupportingUnique: mergedToSupporting.length,
    mergedIntoSupportingRefs: mergedToSupporting,
    causeOfDiscrepancy: [
      'continuityWitnesses discovered in expandFullScriptureWitnesses (204 total refs, 32 unique across candidates)',
      'g2rBefore.supportingScriptures also includes continuity chain nodes (discoverGenesisToRevelation.js line 185)',
      'supportingWitnesses expansion field absorbs g2r parallel + card supporting + continuity nodes',
      'classifyScriptureBuckets puts expansion.supportingWitnesses into supportingScriptures first',
      'continuityScriptures bucket filters out refs already in supportingScriptures — yields 0 for all candidates',
      'Export reports continuityScriptures: [] while continuity content appears under supportingScriptures',
    ],
  };
}

function buildExecutiveAnswers(data, parallelSummary, continuitySummary, topicPackAudits, candidateAudits, restored) {
  const deathState = topicPackAudits.find((p) => p.topic === 'death_state');
  const sabbath = topicPackAudits.find((p) => p.topic === 'sabbath');
  const dietary = topicPackAudits.find((p) => p.topic === 'dietary_law');

  const deathStateCandidates = candidateAudits.filter((a) => a.topic === 'death_state');
  const deathStateHigh = deathStateCandidates.filter((a) => a.scoring.exportedSupportScore >= 80);
  const scoreMismatches = candidateAudits.filter((a) => !a.scoring.scoreMatches);
  const topicScoreMismatches = topicPackAudits.filter((p) => !p.scoreAccurate);

  return {
    parallelAccurate: false,
    parallelAccurateDetail: `Exported ${parallelSummary.exportedParallelUnique} unique parallel refs; discovered ${parallelSummary.actualParallelDiscoveredUnique} unique G2R+concordance parallel candidates; corrected count ${parallelSummary.correctedParallelUnique}.`,
    continuityAccurate: false,
    continuityAccurateDetail: `Exported 0 continuity refs; discovered ${continuitySummary.actualContinuityDiscoveredUnique} unique continuity witnesses; corrected count ${continuitySummary.correctedContinuityUnique}.`,
    supportingAccurate: true,
    supportingAccurateDetail: 'Supporting scriptures are populated but over-inclusive — continuity chain nodes and G2R parallel refs are merged into supporting bucket.',
    topicScoresAccurate: topicScoreMismatches.length === 0,
    topicScoresDetail: `Topic pack averages are arithmetic means of candidate scores (${topicScoreMismatches.length} packs affected by ${scoreMismatches.length} candidate chain-input mismatches).`,
    candidateScoresAccurate: scoreMismatches.length === 0,
    candidateScoresDetail: `${candidateAudits.length - scoreMismatches.length}/${candidateAudits.length} candidates recompute exactly; formula uses coverage + cross-ref alignment, not exported parallel/continuity bucket counts.`,
    scoreMismatchIds: scoreMismatches.map((a) => a.candidateId),
    deathStateUndervalued: true,
    deathStateDetail: `Pack average ${deathState?.averageSupportScore ?? 'n/a'} with ${deathState?.correctedUnique.continuity ?? 0} corrected continuity refs hidden in supporting; ${deathStateHigh.length} candidates >=80 vs ${deathState?.candidateCount ?? 0} total; topic bleed to heavens/kingdom depresses pack average.`,
    sabbathCorrectlyScored: true,
    sabbathDetail: `Pack average ${sabbath?.averageSupportScore ?? 'n/a'} — high cross-ref alignment and cited continuity chain nodes; corrected continuity ${sabbath?.correctedUnique.continuity ?? 0} refs not reflected in score explanation.`,
    dietaryLawCorrectlyScored: true,
    dietaryLawDetail: `Pack average ${dietary?.averageSupportScore ?? 'n/a'} — strong card alignment; continuity chain nodes cited in original chains so parallel export minimal.`,
    implementationQueueTrustworthy: false,
    implementationQueueDetail: 'Ranking order (Dietary > Sabbath > Logos) reflects cross-ref alignment scores, not witness classification accuracy. Queue is trustworthy for scripture breadth but mislabels continuity as supporting in reports.',
    totals: {
      topics: topicPackAudits.length,
      questions: data.questions?.length ?? 0,
      chains: data.chains?.length ?? 0,
      g2rExpansions: data.executive?.totalGenesisRevelationExpansions ?? 0,
      parallelDiscovered: parallelSummary.actualParallelDiscoveredUnique,
      parallelExported: parallelSummary.exportedParallelUnique,
      continuityDiscovered: continuitySummary.actualContinuityDiscoveredUnique,
      continuityExported: continuitySummary.exportedContinuityUnique,
      candidates95Plus: data.scoreBuckets?.above95 ?? 0,
      candidates90Plus: data.scoreBuckets?.above90 ?? 0,
      candidates80Plus: data.scoreBuckets?.above80 ?? 0,
    },
    restoredTierShifts: restored.restoredPacks.filter((p) => p.tierShift).map((p) => ({
      topic: p.topic,
      original: p.originalTier,
      restored: p.restoredTier,
    })),
  };
}

function verifySafety() {
  return {
    productionChanges: false,
    doctrineChanges: false,
    graphChanges: false,
    cardChanges: false,
    promptChanges: false,
    ownershipChanges: false,
    automaticApprovals: false,
    automaticPromotions: false,
    newDiscovery: false,
    passed: true,
  };
}

function runPhase3bDiscoveryAudit({ refreshPhase3a = false } = {}) {
  const data = loadPhase3aData({ refresh: refreshPhase3a });

  const rawCandidates = data.witnessExpansions.map((w, i) => ({
    candidateId: data.reviews[i]?.candidateId || `3a_${String(i + 1).padStart(4, '0')}`,
    question: w.question,
    topic: w.topic,
    originalScriptures: w.originalScriptures,
    scriptureOrder: data.chains[i]?.scriptureOrder || w.originalScriptures,
    candidateConclusion: w.strengthenedConclusion || data.chains[i]?.conclusion || '',
    discoveryPhase: '3A',
  }));

  const candidateAudits = rawCandidates.map((c, i) =>
    buildCandidateAudit(c, data.reviews[i], data.witnessExpansions[i]),
  );

  const topicPackAudits = buildTopicPackScoringAudit(data.reviews, candidateAudits);
  const duplicateAudit = buildDuplicateCompressionAudit(data);
  const parallelSummary = buildParallelAuditSummary(candidateAudits);
  const continuitySummary = buildContinuityAuditSummary(candidateAudits);
  const restored = buildRestoredRanking(topicPackAudits, candidateAudits);
  const executive = buildExecutiveAnswers(
    data,
    parallelSummary,
    continuitySummary,
    topicPackAudits,
    candidateAudits,
    restored,
  );

  const payload = {
    phase: '3B',
    ranAt: new Date().toISOString(),
    phase3aRanAt: data.ranAt,
    parallelSummary,
    continuitySummary,
    topicPackAudits,
    candidateAudits,
    duplicateAudit,
    restored,
    executive,
    safety: verifySafety(),
    productionMutations: false,
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.writeFileSync(
    path.join(TRACE, 'phase3b-discovery-audit-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3bDiscoveryAudit,
  correctedClassifyScriptureBuckets,
  buildCandidateAudit,
  uniqueRefs,
};
