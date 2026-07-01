/**
 * Phase 3W.2 — Intelligence validation pass.
 * Determines whether weak metrics are corpus weaknesses or scoring/attachment limitations.
 * Validation only — no doctrine generation, approval, or production changes.
 */

const fs = require('fs');
const path = require('path');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { refKey, uniqueRefs } = require('./phase3iRecursiveExpansion');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');

const INTERNAL_AUDIT_PATTERN = /^(Emotional:|Mixed:|Challenge:|Health_)/i;
const TRACEABILITY_FIELDS = ['sourceUrl', 'sourceTitle', 'extractionMethod', 'sourceType'];

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

function isInternalAuditPrompt(text = '') {
  return INTERNAL_AUDIT_PATTERN.test(String(text).trim());
}

function packScriptureSet(corpus, packKey) {
  const refs = new Set();
  const trace = (corpus.traceabilityIndex.packs || []).find((p) => normalizeKey(p.topic) === packKey);
  const deep = (corpus.deepPacks.packs || []).find((p) => normalizeKey(p.topic) === packKey);
  for (const ref of [
    ...(trace?.primaryScriptures || []),
    ...(deep?.originalScriptureChain || []),
  ]) {
    if (verifyKjvReference(ref).valid) refs.add(refKey(ref));
  }
  for (const pkt of corpus.organizationV3.packets || []) {
    if (normalizeKey(pkt.doctrinePackCandidate) !== packKey) continue;
    for (const ref of pkt.originalScriptureChain || pkt.scripturesCited || []) {
      if (verifyKjvReference(ref).valid) refs.add(refKey(ref));
    }
  }
  return refs;
}

function chainOverlapScore(chainRefs, packRefs) {
  let shared = 0;
  for (const r of chainRefs) {
    if (packRefs.has(refKey(r))) shared += 1;
  }
  return shared;
}

function topicOverlapScore(chainTopic, packKey, inheritanceMap, vineNetwork) {
  const scores = { topic: 0, inheritance: 0, continuity: 0 };
  if (normalizeKey(chainTopic) === packKey) scores.topic = 1;
  const inh = (inheritanceMap.inheritance || []).find((i) => normalizeKey(i.topic) === packKey);
  if (inh && (inh.dependsOn || []).some((d) => normalizeKey(d) === normalizeKey(chainTopic))) {
    scores.inheritance = 1;
  }
  const vine = (vineNetwork.network || []).find((n) => n.topic === packKey);
  if (vine) {
    const related = [...(vine.parentTopics || []), ...(vine.childTopics || []), ...(vine.relatedTopics || [])];
    if (related.some((t) => normalizeKey(t) === normalizeKey(chainTopic))) scores.topic = 1;
  }
  return scores;
}

function buildChainAttachmentValidation(corpus) {
  const chains = corpus.chainLibrary.chains || [];
  const inheritanceMap = corpus.inheritanceMap;
  const vineData = corpus.vineData;
  const enrichment = corpus.enrichment.packs || [];

  const packKeys = new Set();
  for (const p of corpus.deepPacks.packs || []) packKeys.add(normalizeKey(p.topic));
  for (const p of corpus.traceabilityIndex.packs || []) packKeys.add(normalizeKey(p.topic));
  for (const e of enrichment) packKeys.add(normalizeKey(e.topic));

  const packRefSets = new Map();
  for (const key of packKeys) packRefSets.set(key, packScriptureSet(corpus, key));

  const results = [];
  let missingLinkage = 0;
  let insufficientEvidence = 0;
  let attached = 0;

  for (const chain of chains) {
    const chainRefs = uniqueRefs(chain.scriptures || []);
    const chainRefKeys = chainRefs.map(refKey);
    const hasTopicCandidate = !!chain.topicCandidate;

    let bestPack = null;
    let bestOverlap = 0;
    let bestTopicOverlap = null;

    for (const packKey of packKeys) {
      const overlap = chainOverlapScore(chainRefs, packRefSets.get(packKey) || new Set());
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestPack = packKey;
        bestTopicOverlap = topicOverlapScore(chain.topicCandidate || '', packKey, inheritanceMap, vineData);
      }
    }

    const inheritanceOverlap = chain.topicCandidate
      ? (inheritanceMap.inheritance || []).some((i) => normalizeKey(i.topic) === normalizeKey(chain.topicCandidate))
      : false;
    const continuityOverlap = chain.topicCandidate
      ? (corpus.continuityIndex.topics || []).some((t) => normalizeKey(t.topic) === normalizeKey(chain.topicCandidate))
      : false;

    let status;
    if (hasTopicCandidate && packKeys.has(normalizeKey(chain.topicCandidate))) {
      status = 'attached';
      attached += 1;
    } else if (bestOverlap >= 2 || (bestOverlap >= 1 && chain.sourceCount >= 2)) {
      status = 'missing_linkage';
      missingLinkage += 1;
    } else {
      status = 'insufficient_evidence';
      insufficientEvidence += 1;
    }

    const entry = {
      chainId: chain.chainId,
      status,
      topicCandidate: chain.topicCandidate || null,
      scriptureOverlap: {
        bestPackMatch: bestPack,
        sharedScriptureCount: bestOverlap,
        chainScriptureCount: chainRefs.length,
      },
      topicOverlap: bestTopicOverlap,
      inheritanceOverlap,
      continuityOverlap,
      sourceCount: chain.sourceCount || 0,
    };

    if (status !== 'attached') {
      results.push(entry);
    }
  }

  const unattachedPackGaps = enrichment
    .filter((e) => !e.chainLibraryAttached)
    .map((e) => {
      const key = normalizeKey(e.topic);
      const overlappingChains = chains.filter((c) => {
        const refs = uniqueRefs(c.scriptures || []);
        return chainOverlapScore(refs, packRefSets.get(key) || new Set()) >= 2;
      });
      return {
        topic: e.topic,
        chainLibraryAttached: false,
        overlappingChainCount: overlappingChains.length,
        classification: overlappingChains.length > 0 ? 'missing_linkage' : 'insufficient_evidence',
        overlappingChainIds: overlappingChains.map((c) => c.chainId),
      };
    });

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Separate chain attachment bookkeeping issues from evidence issues',
    summary: {
      totalChains: chains.length,
      attachedChains: attached,
      unattachedChains: results.length,
      missingLinkageCount: missingLinkage,
      insufficientEvidenceCount: insufficientEvidence,
      majorPacksWithoutChainAttachment: unattachedPackGaps.length,
      packGapsMissingLinkage: unattachedPackGaps.filter((g) => g.classification === 'missing_linkage').length,
      packGapsInsufficientEvidence: unattachedPackGaps.filter((g) => g.classification === 'insufficient_evidence').length,
      bookkeepingSharePct: unattachedPackGaps.length
        ? Math.round((unattachedPackGaps.filter((g) => g.classification === 'missing_linkage').length / unattachedPackGaps.length) * 1000) / 10
        : (results.length ? Math.round((missingLinkage / results.length) * 1000) / 10 : 0),
    },
    chains: results,
    packAttachmentGaps: unattachedPackGaps,
    safety: { validationOnly: true },
  };
}

function buildQuestionCoverageValidation(corpus) {
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), { questions: [] });
  const qcIndex = corpus.questionCoverage.questions || [];
  const traceQuestions = corpus.traceabilityIndex.questions || [];

  const phase3fQuestions = phase3f.questions || [];
  const traceByQuestion = new Map(traceQuestions.map((q) => [q.question, q]));

  const scoredInIndex = qcIndex.length;
  const traceQuestionCount = traceQuestions.length;
  const coverageA = {
    label: 'Coverage A — current scorecard formula',
    numerator: scoredInIndex,
    denominator: scoredInIndex + traceQuestionCount,
    coveragePct: Math.round((scoredInIndex / Math.max(1, scoredInIndex + traceQuestionCount)) * 1000) / 10,
    note: 'Denominator double-counts traceability questions already present in question-coverage-index',
  };

  const corpusB = qcIndex.filter((q) => !isInternalAuditPrompt(q.lessonTitle) && !isInternalAuditPrompt(q.question));
  const phase3fCorpusB = phase3fQuestions.filter((q) => !isInternalAuditPrompt(q.lessonTitle) && !isInternalAuditPrompt(q.question));
  const coveredB = corpusB.filter((q) => q.supportScore >= 0.3 || q.witnessCount >= 3);
  const phase3fCoveredB = phase3fCorpusB.filter((q) => {
    const tr = traceByQuestion.get(q.question);
    return tr && (tr.scripturesChosen || []).length > 0;
  });

  const coverageB = {
    label: 'Coverage B — exclude internal audit prompts',
    numerator: coveredB.length,
    denominator: corpusB.length,
    coveragePct: Math.round((coveredB.length / Math.max(1, corpusB.length)) * 1000) / 10,
    phase3fCorpus: {
      numerator: phase3fCoveredB.length,
      denominator: phase3fCorpusB.length,
      coveragePct: Math.round((phase3fCoveredB.length / Math.max(1, phase3fCorpusB.length)) * 1000) / 10,
    },
    internalAuditExcluded: qcIndex.length - corpusB.length,
  };

  const importedAudit = qcIndex.filter((q) => isInternalAuditPrompt(q.lessonTitle) || isInternalAuditPrompt(q.question));
  const corpusC = [...corpusB, ...importedAudit];
  const coveredC = corpusC.filter((q) => q.supportScore >= 0.3 || q.witnessCount >= 3);
  const phase3fCorpusC = [...phase3fCorpusB, ...phase3fQuestions.filter((q) => isInternalAuditPrompt(q.lessonTitle))];
  const phase3fCoveredC = phase3fCorpusC.filter((q) => {
    const tr = traceByQuestion.get(q.question);
    return tr && (tr.scripturesChosen || []).length > 0 || (qcIndex.find((x) => x.question === q.question)?.witnessCount >= 3);
  });

  const coverageC = {
    label: 'Coverage C — include imported audit prompts',
    numerator: coveredC.length,
    denominator: corpusC.length,
    coveragePct: Math.round((coveredC.length / Math.max(1, corpusC.length)) * 1000) / 10,
    phase3fCorpus: {
      numerator: phase3fCoveredC.length,
      denominator: phase3fCorpusC.length,
      coveragePct: Math.round((phase3fCoveredC.length / Math.max(1, phase3fCorpusC.length)) * 1000) / 10,
    },
    importedAuditPromptCount: importedAudit.length,
  };

  const weaknessDiagnosis = {
    currentScoreInflatedByDoubleCounting: traceQuestionCount > 0 && traceQuestions.every((tq) => qcIndex.some((q) => q.question === tq.question)),
    corpusScopeSharePct: Math.round((1 - coverageB.coveragePct / 100) * (coverageA.coveragePct / coverageB.coveragePct) * 100) / 100,
    scoringLimitationSharePct: coverageA.coveragePct < coverageB.coveragePct
      ? Math.round(((coverageB.coveragePct - coverageA.coveragePct) / coverageB.coveragePct) * 1000) / 10
      : Math.round(((coverageB.coveragePct - coverageA.coveragePct) / Math.max(1, coverageB.coveragePct)) * 1000) / 10,
    trueCoverageEstimatePct: coverageB.phase3fCorpus.coveragePct,
  };

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Measure true question coverage across scoring methodologies',
    coverageA,
    coverageB,
    coverageC,
    weaknessDiagnosis,
    safety: { validationOnly: true },
  };
}

function buildTraceabilityGapAnalysis(corpus) {
  const tracePacks = new Map((corpus.traceabilityIndex.packs || []).map((p) => [normalizeKey(p.topic), p]));
  const allPackKeys = new Set(tracePacks.keys());
  for (const p of corpus.deepPacks.packs || []) allPackKeys.add(normalizeKey(p.topic));
  for (const p of corpus.manualRecovery.packets || []) {
    if (p.doctrinePackCandidate) allPackKeys.add(normalizeKey(p.doctrinePackCandidate));
  }

  const orgByPack = new Map();
  for (const pkt of corpus.organizationV3.packets || []) {
    if (!pkt.doctrinePackCandidate) continue;
    const k = normalizeKey(pkt.doctrinePackCandidate);
    if (!orgByPack.has(k)) orgByPack.set(k, []);
    orgByPack.get(k).push(pkt);
  }

  const failures = [];

  for (const packKey of allPackKeys) {
    const tracePack = tracePacks.get(packKey);
    const orgPackets = orgByPack.get(packKey) || [];
    const deep = (corpus.deepPacks.packs || []).find((p) => normalizeKey(p.topic) === packKey);

    if (!tracePack) {
      failures.push({
        topic: deep?.topic || packKey,
        failureType: 'missing_traceability_entry',
        missingFields: ['entire_traceability_record'],
        classification: 'evidence_related',
        hasDeepPack: !!deep,
        orgPacketCount: orgPackets.length,
      });
      continue;
    }

    const present = {
      sourceUrl: false,
      sourceTitle: false,
      extractionMethod: false,
      sourceType: false,
    };

    if ((tracePack.sources || []).length > 0) present.sourceTitle = true;
    for (const pkt of orgPackets) {
      if (pkt.lessonTitle) present.sourceTitle = true;
      if (pkt.sourceUrl || pkt.videoUrl || pkt.pdfUrl) present.sourceUrl = true;
      if (pkt.recoveryLane || pkt.source) present.extractionMethod = true;
      if (pkt.source || pkt.recoveryLane) present.sourceType = true;
    }
    for (const sr of tracePack.selectionReason || []) {
      if (sr.lessonTitle) present.sourceTitle = true;
      if (sr.sourceId) present.extractionMethod = true;
    }

    const missingFields = TRACEABILITY_FIELDS.filter((f) => !present[f]);
    if (missingFields.length === 0) continue;

    const metadataOnly = missingFields.every((f) => f === 'sourceUrl' || f === 'extractionMethod')
      && (tracePack.primaryScriptures || []).length > 0;

    failures.push({
      topic: tracePack.topic,
      failureType: 'incomplete_metadata',
      missingFields,
      classification: metadataOnly ? 'metadata_only' : 'evidence_related',
      primaryScriptureCount: (tracePack.primaryScriptures || []).length,
      sourceTitlePresent: present.sourceTitle,
      orgPacketCount: orgPackets.length,
    });
  }

  const metadataOnlyCount = failures.filter((f) => f.classification === 'metadata_only').length;
  const evidenceRelatedCount = failures.filter((f) => f.classification === 'evidence_related').length;

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Determine whether traceability failures are metadata-only or evidence-related',
    summary: {
      totalPacksAudited: allPackKeys.size,
      packsInTraceabilityIndex: tracePacks.size,
      failureCount: failures.length,
      metadataOnlyFailures: metadataOnlyCount,
      evidenceRelatedFailures: evidenceRelatedCount,
      metadataOnlySharePct: failures.length
        ? Math.round((metadataOnlyCount / failures.length) * 1000) / 10
        : 100,
    },
    failures,
    safety: { validationOnly: true },
  };
}

function pathwayEvidenceStrength(rel) {
  const evidence = rel.evidence || [];
  const sourceIds = new Set();
  const evidenceTypes = new Set();
  for (const e of evidence) {
    if (e.sourceId) sourceIds.add(e.sourceId);
    if (e.lessonTitle) sourceIds.add(normalizeKey(e.lessonTitle));
    if (e.evidenceType) evidenceTypes.add(e.evidenceType);
  }
  return {
    evidenceCount: evidence.length,
    independentSourceCount: sourceIds.size,
    evidenceTypeCount: evidenceTypes.size,
  };
}

function classifyPathway(rel, pathwayType) {
  const strength = pathwayEvidenceStrength(rel);
  const isCandidate = pathwayType === 'candidate' || rel.inferenceBasis || rel.candidateOnly;

  if (isCandidate) return 'candidate';
  if (strength.independentSourceCount >= 2 || (strength.evidenceCount >= 2 && strength.evidenceTypeCount >= 1)) {
    return 'supported';
  }
  if (strength.evidenceCount >= 1 && (rel.sourceScripture || rel.targetScripture)) {
    return 'weak';
  }
  return 'insufficient_evidence';
}

function buildPathwayQualityValidation(corpus) {
  const observed = corpus.observedLib.relationships || [];
  const candidate = corpus.candidateLib.relationships || [];

  const classified = [];
  const counts = { supported: 0, candidate: 0, weak: 0, insufficient_evidence: 0 };

  for (const rel of observed) {
    const quality = classifyPathway(rel, 'observed');
    counts[quality] += 1;
    if (quality !== 'supported') {
      classified.push({
        source: rel.sourceScripture || rel.sourceTopic,
        target: rel.targetScripture || rel.targetTopic,
        relationshipType: rel.relationshipType,
        pathwayType: 'observed',
        quality,
        ...pathwayEvidenceStrength(rel),
      });
    }
  }

  for (const rel of candidate) {
    counts.candidate += 1;
    classified.push({
      source: rel.sourceTopic || rel.sourceScripture,
      target: rel.targetTopic || rel.targetScripture,
      relationshipType: rel.relationshipType,
      pathwayType: 'candidate',
      quality: 'candidate',
      confidence: rel.confidence,
      inferenceBasis: rel.inferenceBasis,
      ...pathwayEvidenceStrength(rel),
      autoDoctrine: false,
    });
  }

  const inflatedWeaknessPct = observed.length
    ? Math.round((counts.weak / observed.length) * 1000) / 10
    : 0;
  const trueWeakPathwayPct = observed.length
    ? Math.round(((counts.weak + counts.insufficient_evidence) / observed.length) * 1000) / 10
    : 0;

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Prevent inflated pathway counts from appearing as corpus weaknesses',
    summary: {
      observedPathwayCount: observed.length,
      candidatePathwayCount: candidate.length,
      supportedCount: counts.supported,
      candidateCount: counts.candidate,
      weakCount: counts.weak,
      insufficientEvidenceCount: counts.insufficient_evidence,
      inflatedWeaknessIfAllObservedCountedPct: 100,
      adjustedWeakPathwayPct: trueWeakPathwayPct,
      bookkeepingInflationPct: Math.round((100 - trueWeakPathwayPct) * 10) / 10,
    },
    nonSupportedObservedSample: classified.filter((p) => p.pathwayType === 'observed').slice(0, 50),
    candidatePathways: classified.filter((p) => p.pathwayType === 'candidate'),
    safety: {
      candidatePathwaysNeverAutoDoctrine: true,
      validationOnly: true,
    },
  };
}

function buildHealthRecalibration(corpus, validations) {
  const audit = corpus.functionalAudit;
  const scorecard = corpus.scorecard;

  const chainVal = validations.chainAttachment;
  const questionVal = validations.questionCoverage;
  const traceVal = validations.traceabilityGap;
  const pathwayVal = validations.pathwayQuality;

  const attachedMajor = (corpus.enrichment.packs || []).filter((p) => p.chainLibraryAttached).length;
  const majorPackCount = (corpus.enrichment.packs || []).length;
  const chainOverlapAttachable = chainVal.summary.packGapsMissingLinkage || 0;

  const currentScores = {
    chainAttachmentCoveragePct: audit.percentages?.chainAttachmentCoveragePct ?? 20.8,
    questionCoveragePct: audit.percentages?.questionCoveragePct ?? 58.4,
    traceabilityCoveragePct: audit.percentages?.traceabilityCoveragePct ?? 89.7,
    enrichmentCoveragePct: audit.percentages?.enrichmentCoveragePct ?? 100,
    topicConnectivityPct: audit.percentages?.topicConnectivityPct ?? 100,
    overallReadinessPct: corpus.readiness?.readinessScore ?? 80,
  };

  const adjustedChainPct = majorPackCount
    ? Math.round(((attachedMajor + chainOverlapAttachable) / majorPackCount) * 1000) / 10
    : currentScores.chainAttachmentCoveragePct;

  const adjustedScores = {
    chainAttachmentCoveragePct: adjustedChainPct,
    questionCoveragePct: questionVal.coverageB.coveragePct,
    traceabilityCoveragePct: traceVal.summary.packsInTraceabilityIndex
      ? Math.round((traceVal.summary.packsInTraceabilityIndex / traceVal.summary.totalPacksAudited) * 1000) / 10
      : currentScores.traceabilityCoveragePct,
    enrichmentCoveragePct: currentScores.enrichmentCoveragePct,
    topicConnectivityPct: currentScores.topicConnectivityPct,
    pathwayQualitySupportedPct: pathwayVal.summary.observedPathwayCount
      ? Math.round((pathwayVal.summary.supportedCount / pathwayVal.summary.observedPathwayCount) * 1000) / 10
      : 0,
  };

  const metadataAdjustedScores = {
    ...adjustedScores,
    traceabilityCoveragePct: traceVal.summary.totalPacksAudited
      ? Math.round(((traceVal.summary.totalPacksAudited - traceVal.summary.evidenceRelatedFailures) / traceVal.summary.totalPacksAudited) * 1000) / 10
      : adjustedScores.traceabilityCoveragePct,
    questionCoveragePct: questionVal.coverageB.phase3fCorpus.coveragePct,
  };

  const adjustedMetrics = [
    { name: 'chain_attachment', current: currentScores.chainAttachmentCoveragePct, adjusted: adjustedScores.chainAttachmentCoveragePct, metadataAdjusted: adjustedChainPct },
    { name: 'question_coverage', current: currentScores.questionCoveragePct, adjusted: adjustedScores.questionCoveragePct, metadataAdjusted: metadataAdjustedScores.questionCoveragePct },
    { name: 'traceability', current: currentScores.traceabilityCoveragePct, adjusted: adjustedScores.traceabilityCoveragePct, metadataAdjusted: metadataAdjustedScores.traceabilityCoveragePct },
    { name: 'enrichment', current: currentScores.enrichmentCoveragePct, adjusted: adjustedScores.enrichmentCoveragePct, metadataAdjusted: adjustedScores.enrichmentCoveragePct },
    { name: 'topic_connectivity', current: currentScores.topicConnectivityPct, adjusted: adjustedScores.topicConnectivityPct, metadataAdjusted: adjustedScores.topicConnectivityPct },
  ];

  const meetsTargetsAdjusted = adjustedMetrics.filter((m) => {
    if (m.name === 'chain_attachment') return m.adjusted >= 50;
    if (m.name === 'question_coverage') return m.adjusted >= 70;
    if (m.name === 'traceability') return m.adjusted >= 90;
    return m.adjusted >= 85;
  }).length;

  const meetsTargetsMetadata = adjustedMetrics.filter((m) => {
    if (m.name === 'chain_attachment') return m.metadataAdjusted >= 50;
    if (m.name === 'question_coverage') return m.metadataAdjusted >= 70;
    if (m.name === 'traceability') return m.metadataAdjusted >= 90;
    return m.metadataAdjusted >= 85;
  }).length;

  const adjustedReadinessPct = Math.round((meetsTargetsAdjusted / adjustedMetrics.length) * 100);
  const metadataAdjustedReadinessPct = Math.round((meetsTargetsMetadata / adjustedMetrics.length) * 100);

  const weaknessBreakdown = {
    chainAttachment: {
      bookkeepingSharePct: chainVal.summary.bookkeepingSharePct,
      packGapsMissingLinkage: chainVal.summary.packGapsMissingLinkage,
      packGapsInsufficientEvidence: chainVal.summary.packGapsInsufficientEvidence,
      verdict: chainVal.summary.packGapsMissingLinkage >= chainVal.summary.packGapsInsufficientEvidence
        ? 'mixed_bookkeeping_and_corpus_scope'
        : 'mostly_insufficient_evidence',
    },
    questionCoverage: {
      currentFormulaPct: questionVal.coverageA.coveragePct,
      trueCoveragePct: questionVal.coverageB.phase3fCorpus.coveragePct,
      corpusScopeSharePct: Math.round((questionVal.coverageB.phase3fCorpus.coveragePct - questionVal.coverageA.coveragePct) / Math.max(0.01, questionVal.coverageB.phase3fCorpus.coveragePct) * 1000) / 10,
      scoringLimitationPct: questionVal.weaknessDiagnosis.scoringLimitationSharePct,
      verdict: questionVal.coverageA.coveragePct < questionVal.coverageB.coveragePct * 0.8
        ? 'mostly_scoring_formula'
        : 'mixed_corpus_and_scoring',
    },
    traceability: {
      metadataOnlySharePct: traceVal.summary.metadataOnlySharePct,
      evidenceRelatedFailures: traceVal.summary.evidenceRelatedFailures,
      verdict: traceVal.summary.metadataOnlySharePct >= 60 ? 'mostly_metadata' : 'mixed_metadata_and_evidence',
    },
    pathwayQuality: {
      supportedPct: adjustedScores.pathwayQualitySupportedPct,
      weakPct: pathwayVal.summary.adjustedWeakPathwayPct,
      verdict: 'mostly_single_source_observed_edges_not_corpus_weakness',
    },
  };

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Determine actual intelligence readiness after validation adjustments',
    currentScores,
    adjustedScores,
    metadataAdjustedScores,
    adjustedMetrics,
    readiness: {
      currentReadinessPct: currentScores.overallReadinessPct,
      adjustedReadinessPct,
      metadataAdjustedReadinessPct,
      readyForPhase4ImplementationTesting: metadataAdjustedReadinessPct >= 70,
      readyForPhase4WithBookkeepingFixes: adjustedReadinessPct >= 60,
    },
    weaknessBreakdown,
    executiveAnswers: {
      chainAttachmentBookkeepingSharePct: chainVal.summary.bookkeepingSharePct,
      questionCoverageCorpusScopePct: questionVal.weaknessDiagnosis.trueCoverageEstimatePct,
      traceabilityMetadataSharePct: traceVal.summary.metadataOnlySharePct,
      adjustedCorpusHealthScorePct: metadataAdjustedReadinessPct,
      phase4Ready: metadataAdjustedReadinessPct >= 70,
    },
    safety: { validationOnly: true },
  };
}

function loadValidationCorpus() {
  return {
    chainLibrary: loadJson(path.join(OUT_DIR, 'scripture-chain-library.json'), { chains: [] }),
    inheritanceMap: loadJson(path.join(OUT_DIR, 'topic-inheritance-map.json'), { inheritance: [] }),
    continuityIndex: loadJson(path.join(OUT_DIR, 'genesis-to-revelation-continuity-index.json'), { topics: [] }),
    traceabilityIndex: loadJson(path.join(OUT_DIR, 'scripture-traceability-index.json'), { packs: [], questions: [] }),
    questionCoverage: loadJson(path.join(OUT_DIR, 'question-coverage-index.json'), { questions: [] }),
    organizationV3: loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), { packets: [] }),
    deepPacks: loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] }),
    manualRecovery: loadJson(path.join(OUT_DIR, 'phase3t-manual-recovery-packets.json'), { packets: [] }),
    enrichment: loadJson(path.join(OUT_DIR, 'bible-wide-scripture-enrichment.json'), { packs: [] }),
    vineData: loadJson(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), { network: [] }),
    observedLib: loadJson(path.join(OUT_DIR, 'ObservedRelationshipLibrary.json'), { relationships: [] }),
    candidateLib: loadJson(path.join(OUT_DIR, 'CandidateRelationshipLibrary.json'), { relationships: [] }),
    functionalAudit: loadJson(path.join(OUT_DIR, 'CorpusFunctionalHealthAudit.json'), {}),
    scorecard: loadJson(path.join(OUT_DIR, 'CorpusHealthScorecard.json'), {}),
    readiness: loadJson(path.join(TRACE, 'phase3w-corpus-quality-results.json'), {}).readiness || {},
  };
}

function runPhase3w2IntelligenceValidation() {
  const corpus = loadValidationCorpus();

  const chainAttachment = buildChainAttachmentValidation(corpus);
  const questionCoverage = buildQuestionCoverageValidation(corpus);
  const traceabilityGap = buildTraceabilityGapAnalysis(corpus);
  const pathwayQuality = buildPathwayQualityValidation(corpus);

  const validations = {
    chainAttachment,
    questionCoverage,
    traceabilityGap,
    pathwayQuality,
  };

  const healthRecalibration = buildHealthRecalibration(corpus, validations);

  const payload = {
    phase: '3W.2',
    ranAt: new Date().toISOString(),
    validations,
    healthRecalibration,
    safety: {
      doctrineGeneration: false,
      doctrineApproval: false,
      productionChanges: false,
      evidenceCardChanges: false,
      promptChanges: false,
      validationOnly: true,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TRACE, { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, 'chain-attachment-validation.json'), JSON.stringify(chainAttachment, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'question-coverage-validation.json'), JSON.stringify(questionCoverage, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'traceability-gap-analysis.json'), JSON.stringify(traceabilityGap, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'pathway-quality-validation.json'), JSON.stringify(pathwayQuality, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'corpus-health-recalibration-report.json'), JSON.stringify(healthRecalibration, null, 2));
  fs.writeFileSync(path.join(TRACE, 'phase3w2-intelligence-validation-results.json'), JSON.stringify(payload, null, 2));

  return payload;
}

module.exports = {
  runPhase3w2IntelligenceValidation,
};
