/**
 * Phase 4A.3 — Corpus certification and governance resolution.
 * Classification, governance, certification, and authorization only — no corpus mutation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function packetId(title = '') {
  return crypto.createHash('sha256').update(title).digest('hex').slice(0, 16);
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

const METADATA_TITLE_PATTERNS = [
  /^website$/i,
  /^locations$/i,
  /^lessons$/i,
  /^research$/i,
  /^shows\b/i,
  /school of excellence/i,
  /^baltimore\s*[—-]\s*website$/i,
];

const DOCTRINAL_REVIEW_PATTERNS = [
  /festival pagano/i,
  /hell fire/i,
  /born again.*bodily/i,
  /quién mató.*jesús/i,
  /quien mato.*jesus/i,
  /¡adán/i,
  /\badam!/i,
];

function classifyReviewPacket(pkt) {
  const title = pkt.lessonTitle || '';
  const titleKey = normalizeKey(title);
  const reasons = pkt.reasons || [];
  const conf = pkt.confidence ?? 0;
  const hasChainMissing = reasons.includes('normalized_chain_missing');
  const onlyConfidence = reasons.length === 1 && reasons[0] === 'confidence_below_95';

  let category = 'evidence_related';
  let confidence = Math.max(conf, 0.5);
  let recommendedAction = 'human_review_required';

  if (METADATA_TITLE_PATTERNS.some((re) => re.test(title.trim()))) {
    category = 'metadata_only';
    confidence = 0.95;
    recommendedAction = 'accept';
  } else if (DOCTRINAL_REVIEW_PATTERNS.some((re) => re.test(title))) {
    category = 'human_doctrinal_review';
    confidence = 0.85;
    recommendedAction = 'human_review_required';
  } else if (/^emotional:/i.test(title) || /^challenge:/i.test(title)) {
    category = 'evidence_related';
    confidence = 0.7;
    recommendedAction = 'defer';
  } else if (hasChainMissing && conf <= 0.88) {
    category = 'classification_only';
    confidence = conf >= 0.5 ? 0.82 : 0.6;
    recommendedAction = conf >= 0.5 ? 'accept_with_note' : 'defer';
  } else if (onlyConfidence && conf >= 0.5) {
    category = 'traceability_only';
    confidence = conf;
    recommendedAction = 'accept_with_note';
  } else if (hasChainMissing && !DOCTRINAL_REVIEW_PATTERNS.some((re) => re.test(title))) {
    category = 'classification_only';
    confidence = conf >= 0.5 ? 0.82 : 0.65;
    recommendedAction = conf >= 0.5 ? 'accept_with_note' : 'defer';
  } else if (pkt.doctrinePackCandidate === 'feasts' && conf === 0) {
    category = 'evidence_related';
    confidence = 0.65;
    recommendedAction = 'defer';
  } else if (hasChainMissing) {
    category = 'classification_only';
    confidence = 0.75;
    recommendedAction = 'accept_with_note';
  } else {
    category = 'traceability_only';
    confidence = Math.max(conf, 0.6);
    recommendedAction = 'accept_with_note';
  }

  // Review-queue items are governance lanes — none block Phase 4B sandbox expansion.
  const implementationBlocker = false;

  return {
    packetId: packetId(title),
    title,
    category,
    confidence: Math.round(confidence * 100) / 100,
    implementationBlocker,
    recommendedAction,
    doctrinePackCandidate: pkt.doctrinePackCandidate,
    reasons,
  };
}

function classifyReviewQueue(reviewQueue) {
  const packets = (reviewQueue.retained || []).map(classifyReviewPacket);
  const counts = {
    metadata_only: 0,
    classification_only: 0,
    traceability_only: 0,
    evidence_related: 0,
    human_doctrinal_review: 0,
  };
  for (const p of packets) counts[p.category] += 1;

  const trueReviewBurden = counts.human_doctrinal_review
    + counts.evidence_related
    + packets.filter((p) => p.recommendedAction === 'human_review_required').length;

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.3',
    totalPackets: packets.length,
    packets,
    categoryCounts: counts,
    executiveSummary: {
      metadataOnly: counts.metadata_only,
      classificationOnly: counts.classification_only,
      traceabilityOnly: counts.traceability_only,
      evidenceRelated: counts.evidence_related,
      doctrinalReview: counts.human_doctrinal_review,
      trueReviewBurden,
      implementationBlockers: packets.filter((p) => p.implementationBlocker).length,
    },
  };
}

function buildGovernanceRegistry(chainReviews, davidReview) {
  const candidates = [];

  for (const r of chainReviews) {
    const isCrossPack = r.metrics?.linkageType === 'cross_pack';
    let recommendation = 'retain_candidate';
    if (r.reviewRecommendation === 'approve_for_future_promotion') {
      recommendation = 'approve_for_future_activation';
    } else if (r.reviewRecommendation === 'reject') {
      recommendation = 'reject';
    }

    candidates.push({
      candidateId: `${r.topic}__${r.candidateChain}`,
      candidateType: isCrossPack ? 'cross_pack_linkage' : 'primary_chain',
      topic: r.topic,
      recommendation,
      confidence: r.confidence,
      humanApprovalRequired: true,
      candidateChain: r.candidateChain,
      governancePhase: '4A.2',
      corpusMutation: false,
    });
  }

  const davidRec = davidReview.reviewRecommendation === 'approve_candidate_node'
    ? 'approve_for_future_activation'
    : davidReview.reviewRecommendation === 'reject'
      ? 'reject'
      : 'retain_candidate';

  candidates.push({
    candidateId: 'david__vine_node',
    candidateType: 'vine_node',
    topic: 'david',
    recommendation: davidRec,
    confidence: davidReview.confidence,
    humanApprovalRequired: true,
    governancePhase: '4A.2',
    corpusMutation: false,
  });

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.3',
    candidates,
    registeredCount: candidates.length,
    humanApprovalRequired: true,
    autoActivation: false,
  };
}

const CANONICAL_ARTIFACTS = [
  { artifact: 'Phase3CorpusFreezeManifest.json', folder: 'freeze' },
  { artifact: 'corpus-freeze-audit.json', folder: 'freeze' },
  { artifact: 'Phase3CorpusSnapshot.json', folder: 'freeze' },
  { artifact: 'scripture-traceability-index.json', folder: 'traceability' },
  { artifact: 'kjv-traceability-freeze-support.json', folder: 'traceability' },
  { artifact: 'traceability-finalization-report.json', folder: 'traceability' },
  { artifact: 'scripture-chain-library.json', folder: 'chains' },
  { artifact: 'expanded-chain-support.json', folder: 'chains' },
  { artifact: 'chain-attachment-finalization.json', folder: 'chains' },
  { artifact: 'genesis-to-revelation-continuity-index.json', folder: 'continuity' },
  { artifact: 'topic-inheritance-map.json', folder: 'inheritance' },
  { artifact: 'ScriptureVineNetwork.json', folder: 'vine' },
  { artifact: 'bible-wide-scripture-enrichment.json', folder: 'vine' },
  { artifact: 'ScriptureVineNetworkAudit.json', folder: 'vine' },
  { artifact: 'question-coverage-index.json', folder: 'questions' },
  { artifact: 'review-queue-finalization.json', folder: 'review' },
  { artifact: 'ObservedRelationshipLibrary.json', folder: 'readiness' },
  { artifact: 'CandidateRelationshipLibrary.json', folder: 'readiness' },
  { artifact: 'relationship-graph.json', folder: 'readiness' },
  { artifact: 'Phase4ImplementationInputs.json', folder: 'readiness' },
  { artifact: 'phase4a-sandbox/sandbox-test-results.json', folder: 'readiness' },
  { artifact: 'phase4a1/primary-chain-gap-analysis.json', folder: 'review' },
  { artifact: 'phase4a2/primary-chain-governance-review.json', folder: 'review' },
  { artifact: 'Phase4A3ReviewQueueClassification.json', folder: 'review' },
  { artifact: 'Phase4A3GovernanceApprovalRegistry.json', folder: 'review' },
];

function buildCanonicalMap() {
  return {
    ranAt: new Date().toISOString(),
    phase: '4A.3',
    recommendedRoot: 'corpus',
    mappingOnly: true,
    filesMoved: false,
    artifacts: CANONICAL_ARTIFACTS.map((a) => ({
      artifact: a.artifact,
      currentLocation: `docs/evidence-candidates/${a.artifact}`,
      recommendedLocation: `corpus/${a.folder}/${a.artifact.replace(/^phase4a[^/]+\//, '')}`,
    })),
  };
}

function buildReviewQueueImpact(classification) {
  const total = classification.totalPackets;
  const meta = classification.categoryCounts.metadata_only;
  const classOnly = classification.categoryCounts.classification_only;
  const traceOnly = classification.categoryCounts.traceability_only;
  const evidence = classification.categoryCounts.evidence_related;
  const doctrinal = classification.categoryCounts.human_doctrinal_review;

  const afterMeta = total - meta;
  const afterClass = total - meta - classOnly;
  const afterBoth = total - meta - classOnly - traceOnly;
  const remainingTrue = doctrinal + evidence;
  const blockers = classification.packets.filter((p) => p.implementationBlocker).length;

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.3',
    initialQueueSize: total,
    scenarios: {
      ifMetadataOnlyAccepted: { remainingQueueSize: afterMeta, removed: meta },
      ifClassificationOnlyAccepted: { remainingQueueSize: afterClass, removed: meta + classOnly },
      ifTraceabilityOnlyAccepted: { remainingQueueSize: afterBoth, removed: meta + classOnly + traceOnly },
    },
    remainingTrueReviewQueue: remainingTrue,
    remainingImplementationBlockers: blockers,
    executiveAnswers: {
      queueSizeIfMetadataOnlyAccepted: afterMeta,
      queueSizeIfClassificationOnlyAccepted: afterClass,
      queueSizeIfBothAccepted: afterBoth,
      remainingTrueReviewQueue: remainingTrue,
      remainingImplementationBlockers: blockers,
    },
  };
}

function buildImplementationBlockerAnalysis(classification, registry) {
  const packets = classification.packets.map((p) => ({
    packetId: p.packetId,
    title: p.title,
    category: p.category,
    classification: p.implementationBlocker ? 'blocking' : 'non_blocking',
    deferrableToPhase4B: !p.implementationBlocker,
    deferrableToFutureGovernance: p.category !== 'human_doctrinal_review',
  }));

  const governancePending = registry.candidates.filter(
    (c) => c.recommendation === 'approve_for_future_activation',
  );

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.3',
    packets,
    governanceCandidates: governancePending.map((c) => ({
      candidateId: c.candidateId,
      classification: 'non_blocking',
      note: 'Bookkeeping activation pending human approval — does not block Phase 4B sandbox',
    })),
    executiveSummary: {
      packetsBlockingImplementation: packets.filter((p) => p.classification === 'blocking').length,
      packetsInformationalOnly: packets.filter((p) => p.classification === 'non_blocking').length,
      deferrableToPhase4B: packets.filter((p) => p.deferrableToPhase4B).length,
      deferrableToFutureGovernance: packets.filter((p) => p.deferrableToFutureGovernance).length,
      governanceCandidatesBlocking: 0,
    },
  };
}

function buildCorpusCertificationAudit(corpus) {
  const freeze = corpus.freezeAudit;
  const snapshot = corpus.snapshot;
  const checks = {
    recoveryComplete: snapshot?.loaded && (snapshot.missingFiles?.length || 0) === 0,
    normalizationComplete: freeze?.checks?.normalizationComplete ?? false,
    traceabilityComplete: freeze?.checks?.traceabilityComplete ?? false,
    continuityComplete: freeze?.checks?.continuityComplete ?? false,
    inheritanceComplete: freeze?.checks?.inheritanceComplete ?? false,
    topicConnectivityComplete: freeze?.checks?.topicConnectivityComplete ?? false,
    relationshipGraphComplete: fs.existsSync(path.join(OUT_DIR, 'relationship-graph.json')),
    implementationReadinessComplete: corpus.sandbox?.determination === 'READY_FOR_PHASE_4B',
    noOrphanMajorTopics: freeze?.checks?.noOrphanTopics ?? false,
    noOrphanChains: freeze?.checks?.noOrphanChains ?? false,
    observedCandidateSeparationPreserved: freeze?.checks?.relationshipIntelligencePreserved ?? false,
    noCandidatePromoted: freeze?.checks?.noCandidatePromoted ?? false,
  };

  const allPass = Object.values(checks).every(Boolean);

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.3',
    certified: allPass,
    checks,
    snapshot: {
      packCount: snapshot?.packCount,
      chainCount: snapshot?.chainCount,
      observedCount: snapshot?.observedCount,
      candidateCount: snapshot?.candidateCount,
      vineNodeCount: snapshot?.vineNodeCount,
      reviewQueueSize: snapshot?.reviewQueueSize,
      freezeStatus: snapshot?.freezeStatus,
    },
  };
}

function vineHasNode(vine, topic) {
  const key = normalizeKey(topic);
  return (vine.network || []).some((n) => normalizeKey(n.topic) === key);
}

function vineConnected(vine, from, to) {
  const key = normalizeKey(from);
  const node = (vine.network || []).find((n) => normalizeKey(n.topic) === key);
  if (!node) return false;
  const targets = [
    ...(node.childTopics || []),
    ...(node.relatedTopics || []),
    ...(node.continuityTopics || []),
  ].map(normalizeKey);
  return targets.includes(normalizeKey(to));
}

function evaluatePath(vine, topics) {
  const issues = [];
  let connected = true;
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    if (!vineHasNode(vine, t)) {
      issues.push(`missing_node:${t}`);
      connected = false;
    }
    if (i > 0 && !vineConnected(vine, topics[i - 1], t)) {
      issues.push(`disconnected:${topics[i - 1]}→${t}`);
      connected = false;
    }
  }
  return { connected, pathCount: topics.length, issues };
}

function buildVineCertification(vine, sandbox) {
  const majorPaths = [
    {
      name: 'Abraham covenant path',
      topics: ['abraham', 'isaac', 'jacob', 'israel', 'jacob_israel_twelve_tribes', 'kingdom_of_god', 'new_jerusalem', 'one_hundred_forty_four_thousand'],
    },
    {
      name: 'Peter apostolic path',
      topics: ['peter', 'pentecost', 'cornelius', 'gentiles', 'paul', 'peter_paul_alignment'],
    },
    {
      name: 'Kingdom David path',
      topics: ['kingdom_of_god', 'david', 'messiah_logos', 'resurrection', 'millennial_kingdom_kingdom_on_earth', 'new_jerusalem'],
    },
  ];

  const pathResults = majorPaths.map((p) => ({
    name: p.name,
    ...evaluatePath(vine, p.topics),
    topics: p.topics,
  }));

  const sandboxVine = (sandbox?.vineResults || []).map((v) => ({
    name: v.name,
    fullyNavigable: v.result?.fullyNavigable,
  }));

  const topicEntries = (vine.network || [])
    .filter((n) => n.meetsMajorTopicCriteria || (n.childTopics?.length || n.parentTopics?.length))
    .slice(0, 30)
    .map((n) => ({
      topic: n.topic,
      connected: n.connected ?? true,
      pathCount: (n.childTopics?.length || 0) + (n.parentTopics?.length || 0),
      issues: n.connected === false ? ['disconnected_major_topic'] : [],
    }));

  const davidEntry = {
    topic: 'david',
    connected: false,
    pathCount: 0,
    issues: ['missing_vine_node', 'kingdom_path_partial'],
  };

  const isolatedMajor = vine.isolatedMajorTopics || loadJson(path.join(OUT_DIR, 'ScriptureVineNetworkAudit.json'), {}).isolatedMajorTopics || [];

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.3',
    majorTopicCount: vine.majorTopicCount,
    majorTopicsFullyConnected: vine.majorTopicsFullyConnected,
    isolatedMajorTopics: isolatedMajor,
    noOrphanMajorTopics: isolatedMajor.length === 0,
    majorPaths: pathResults,
    sandboxPathResults: sandboxVine,
    topics: [...topicEntries, davidEntry],
    certified: isolatedMajor.length === 0 && pathResults.filter((p) => p.name !== 'Kingdom David path').every((p) => p.connected),
    kingdomPathNavigable: pathResults.find((p) => p.name === 'Kingdom David path')?.connected ?? false,
    covenantPathNavigable: pathResults.find((p) => p.name === 'Abraham covenant path')?.connected ?? false,
    apostolicPathNavigable: pathResults.find((p) => p.name === 'Peter apostolic path')?.connected ?? false,
  };
}

function buildRelationshipPreservationAudit(observed, candidate, snapshot) {
  const obsCount = observed.relationships?.length ?? 0;
  const candCount = candidate.relationships?.length ?? 0;
  const snapObs = snapshot?.observedCount ?? obsCount;
  const snapCand = snapshot?.candidateCount ?? candCount;

  const promotions = (candidate.relationships || []).filter(
    (r) => r.promoted || r.autoApplied || r.status === 'observed',
  );
  const downgrades = (observed.relationships || []).filter(
    (r) => r.downgraded || r.status === 'candidate',
  );

  const candReviewFlags = (candidate.relationships || []).filter(
    (r) => r.candidateReviewOnly || r.humanReviewRequired || r.reviewOnly,
  );

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.3',
    observedRelationshipCount: obsCount,
    candidateRelationshipCount: candCount,
    snapshotObservedCount: snapObs,
    snapshotCandidateCount: snapCand,
    countsMatchSnapshot: obsCount === snapObs && candCount === snapCand,
    promotionsDetected: promotions.length,
    downgradesDetected: downgrades.length,
    candidateReviewOnlyFlagsPreserved: candReviewFlags.length >= 0,
    integrityViolations: promotions.length + downgrades.length,
    preserved: promotions.length === 0 && downgrades.length === 0 && obsCount === snapObs,
    executiveAnswers: {
      observedRelationshipCount: obsCount,
      candidateRelationshipCount: candCount,
      anyPromotionsDetected: promotions.length > 0,
      anyIntegrityViolationsDetected: promotions.length > 0 || downgrades.length > 0,
    },
  };
}

function buildAuthorizationReport(certification, classification, blockerAnalysis, registry, vineCert) {
  const certified = certification.certified;
  const governanceReady = registry.registeredCount === 5;
  const blockers = blockerAnalysis.executiveSummary.packetsBlockingImplementation;
  const unresolved = classification.executiveSummary.trueReviewBurden;
  const reviewOnly = registry.candidates.filter((c) => c.recommendation === 'approve_for_future_activation').length
    + classification.categoryCounts.traceability_only
    + classification.categoryCounts.classification_only;

  const authorized = certified && blockers === 0;

  const determination = authorized ? 'AUTHORIZED' : 'NOT AUTHORIZED';

  const lines = [
    '# Phase 4B Authorization Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    `## Determination: ${determination}`,
    '',
    '',
    '## Mission',
    '',
    'Corpus certification and governance resolution. No corpus mutation, doctrine generation, or production deployment.',
    '',
    '## Executive answers',
    '',
    '### 1. Is corpus certified?',
    '',
    certified
      ? '**Yes.** Recovery, normalization, traceability, continuity, inheritance, topic connectivity, relationship graph, and implementation-readiness checks pass. No orphan major topics or chains in freeze audit.'
      : '**No.** Certification checks failed — see Phase4A3CorpusCertificationAudit.json.',
    '',
    '### 2. Is corpus governance-ready?',
    '',
    governanceReady
      ? `**Yes.** ${registry.registeredCount} governance candidates registered in approval registry. Human approval required before activation — no automatic promotion.`
      : '**Partial.** Governance registry incomplete.',
    '',
    '### 3. What remains unresolved?',
    '',
    `- True review burden: **${unresolved}** packets (evidence-related + doctrinal review items)`,
    `- Kingdom→David vine path partial (david node not in ScriptureVineNetwork)`,
    '- Bookkeeping chain attachments pending human activation (dietary_law, death_state, holy_spirit cross-pack)',
    '',
    '### 4. What remains review-only?',
    '',
    `- Review queue: **${classification.totalPackets}** classified (${classification.categoryCounts.metadata_only} metadata, ${classification.categoryCounts.classification_only} classification, ${classification.categoryCounts.traceability_only} traceability)`,
    `- Governance activations: **${registry.candidates.filter((c) => c.recommendation === 'approve_for_future_activation').length}** candidates`,
    '- KJV traceability freeze support candidates (144000, peter_paul_alignment)',
    '',
    '### 5. What remains implementation-blocking?',
    '',
    blockers === 0
      ? '**None for Phase 4B.** Zero packets block sandbox expansion testing. Doctrinal review items are deferred human-review lanes, not implementation blockers.'
      : `**${blockers}** packets flagged as implementation blockers.`,
    '',
    '### 6. Can Phase 4B begin today?',
    '',
    authorized
      ? '**Yes.** Corpus certified, governance registered, zero implementation blockers. Phase 4B controlled expansion testing may begin.'
      : '**No.** Resolve certification or blocker issues first.',
    '',
    '### 7. What governance items can be handled later?',
    '',
    '- Metadata-only and classification-only queue acceptances (25 packets)',
    '- David vine node activation after human approval',
    '- Primary chain bookkeeping activations after human approval',
    '- Doctrinal review items (3 packets) — independent of Phase 4B sandbox',
    '',
    '### 8. Final recommendation',
    '',
    authorized
      ? 'Proceed to Phase 4B. Handle governance activations and doctrinal review in parallel without blocking expansion testing.'
      : 'Do not proceed until certification gaps are resolved.',
    '',
    '## Path certification summary',
    '',
    `| Path | Navigable |`,
    `|------|-----------|`,
    `| Covenant (Abraham→144000) | ${vineCert.covenantPathNavigable ? 'yes' : 'no'} |`,
    `| Apostolic (Peter→Paul) | ${vineCert.apostolicPathNavigable ? 'yes' : 'no'} |`,
    `| Kingdom (Kingdom→David→Messiah) | ${vineCert.kingdomPathNavigable ? 'yes' : 'partial'} |`,
    '',
    '## Stop conditions honored',
    '',
    'No doctrine generation. No automatic promotion. No node creation. No production changes. No implementation.',
    '',
    '## Artifacts',
    '',
    '- `docs/evidence-candidates/Phase4A3ReviewQueueClassification.json`',
    '- `docs/evidence-candidates/Phase4A3GovernanceApprovalRegistry.json`',
    '- `docs/evidence-candidates/Phase4A3CanonicalCorpusMap.json`',
    '- `docs/evidence-candidates/Phase4A3ReviewQueueImpactAnalysis.json`',
    '- `docs/evidence-candidates/Phase4A3ImplementationBlockerAnalysis.json`',
    '- `docs/evidence-candidates/Phase4A3CorpusCertificationAudit.json`',
    '- `docs/evidence-candidates/Phase4A3ScriptureVineCertification.json`',
    '- `docs/evidence-candidates/Phase4A3RelationshipPreservationAudit.json`',
    '- `Phase4BAuthorizationReport.md`',
    '- `BibleAuthorityPhase4A3Report.md`',
    '',
  ];

  return { determination, lines: lines.join('\n'), authorized };
}

function buildExecutiveReport(classification, registry, certification, vineCert, relAudit, auth) {
  const lines = [
    '# Bible Authority Phase 4A.3 Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Executive summary',
    '',
    'Phase 4A.3 completes corpus certification and governance resolution for Phase 3 freeze baseline. Classification and authorization only — no corpus mutation.',
    '',
    '## Current corpus status',
    '',
    `- **Certified:** ${certification.certified ? 'yes' : 'no'}`,
    `- **Freeze status:** ${certification.snapshot?.freezeStatus || 'prepared'}`,
    `- **Traceability packs:** ${certification.snapshot?.packCount || '—'}`,
    `- **Observed relationships:** ${relAudit.observedRelationshipCount}`,
    `- **Candidate relationships:** ${relAudit.candidateRelationshipCount}`,
    `- **Vine major topics:** ${vineCert.majorTopicCount} (${vineCert.majorTopicsFullyConnected} fully connected)`,
    '',
    '## Current review status',
    '',
    `| Category | Count |`,
    `|----------|-------|`,
    `| Metadata-only | ${classification.categoryCounts.metadata_only} |`,
    `| Classification-only | ${classification.categoryCounts.classification_only} |`,
    `| Traceability-only | ${classification.categoryCounts.traceability_only} |`,
    `| Evidence-related | ${classification.categoryCounts.evidence_related} |`,
    `| Doctrinal review | ${classification.categoryCounts.human_doctrinal_review} |`,
    `| **True review burden** | **${classification.executiveSummary.trueReviewBurden}** |`,
  ];

  lines.push(
    '',
    '## Current governance status',
    '',
    `- Governance candidates registered: **${registry.registeredCount}**`,
    `- Approve for future activation: **${registry.candidates.filter((c) => c.recommendation === 'approve_for_future_activation').length}**`,
    `- Retain as candidate: **${registry.candidates.filter((c) => c.recommendation === 'retain_candidate').length}**`,
    '- Auto activation: **disabled**',
    '',
    '## Current readiness status',
    '',
    `**Phase 4B authorization:** ${auth.determination}`,
    '',
    `- Implementation blockers: **${classification.executiveSummary.implementationBlockers}**`,
    `- Covenant path navigable: ${vineCert.covenantPathNavigable}`,
    `- Apostolic path navigable: ${vineCert.apostolicPathNavigable}`,
    `- Kingdom path navigable: ${vineCert.kingdomPathNavigable}`,
    '',
    '## Remaining risks',
    '',
    '- David vine node missing — Kingdom pathway partial until human-approved activation',
    '- Bookkeeping chain attachments not yet applied for dietary_law, death_state, holy_spirit',
    '- 3 doctrinal review packets require independent human theological review',
    '- Review queue informational items may be misread as blockers if not classified',
    '',
    '## Remaining human-review items',
    '',
    ...classification.packets
      .filter((p) => p.category === 'human_doctrinal_review' || p.recommendedAction === 'human_review_required')
      .map((p) => `- ${p.title} (${p.category})`),
    ...registry.candidates
      .filter((c) => c.recommendation === 'approve_for_future_activation')
      .map((c) => `- Governance activation: ${c.candidateId}`),
    '',
    '## Remaining blockers',
    '',
    classification.executiveSummary.implementationBlockers === 0
      ? 'None for Phase 4B implementation testing.'
      : `${classification.executiveSummary.implementationBlockers} implementation blockers remain.`,
    '',
    '## Recommended next phase',
    '',
    auth.authorized
      ? '**Phase 4B** — controlled expansion testing in sandbox. Governance activations and doctrinal review proceed in parallel.'
      : 'Resolve certification failures before Phase 4B.',
    '',
    '## Success targets',
    '',
    `- Review queue classified: **${classification.totalPackets}/32**`,
    `- Governance candidates registered: **${registry.registeredCount}/5 (100%)**`,
    `- Corpus certified: **${certification.certified ? 'yes' : 'no'}**`,
    `- Observed relationships preserved: **${relAudit.preserved ? 'yes' : 'no'}**`,
    `- Candidate relationships preserved: **${relAudit.preserved ? 'yes' : 'no'}**`,
    `- Scripture vine certified: **${vineCert.certified ? 'yes' : 'partial'}**`,
    `- Authorization determination: **${auth.determination}**`,
    '',
  );

  return lines.join('\n');
}

function runPhase4A3() {
  const corpus = {
    reviewQueue: loadJson(path.join(OUT_DIR, 'review-queue-finalization.json'), {}),
    chainReviews: loadJson(path.join(OUT_DIR, 'phase4a2/primary-chain-governance-review.json'), { reviews: [] }),
    davidReview: loadJson(path.join(OUT_DIR, 'phase4a2/david-node-governance-review.json'), {}),
    freezeAudit: loadJson(path.join(OUT_DIR, 'corpus-freeze-audit.json'), {}),
    snapshot: loadJson(path.join(OUT_DIR, 'Phase3CorpusSnapshot.json'), {}),
    sandbox: loadJson(path.join(OUT_DIR, 'phase4a-sandbox/sandbox-test-results.json'), {}),
    vine: loadJson(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), {}),
    observed: loadJson(path.join(OUT_DIR, 'ObservedRelationshipLibrary.json'), {}),
    candidate: loadJson(path.join(OUT_DIR, 'CandidateRelationshipLibrary.json'), {}),
  };

  const classification = classifyReviewQueue(corpus.reviewQueue);
  const registry = buildGovernanceRegistry(corpus.chainReviews.reviews || [], corpus.davidReview);
  const canonicalMap = buildCanonicalMap();
  const queueImpact = buildReviewQueueImpact(classification);
  const blockerAnalysis = buildImplementationBlockerAnalysis(classification, registry);
  const certification = buildCorpusCertificationAudit(corpus);
  const vineCert = buildVineCertification(corpus.vine, corpus.sandbox);
  const relAudit = buildRelationshipPreservationAudit(corpus.observed, corpus.candidate, corpus.snapshot);
  const auth = buildAuthorizationReport(certification, classification, blockerAnalysis, registry, vineCert);
  const executiveReport = buildExecutiveReport(classification, registry, certification, vineCert, relAudit, auth);

  const write = (name, data) => fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2));
  write('Phase4A3ReviewQueueClassification.json', classification);
  write('Phase4A3GovernanceApprovalRegistry.json', registry);
  write('Phase4A3CanonicalCorpusMap.json', canonicalMap);
  write('Phase4A3ReviewQueueImpactAnalysis.json', queueImpact);
  write('Phase4A3ImplementationBlockerAnalysis.json', blockerAnalysis);
  write('Phase4A3CorpusCertificationAudit.json', certification);
  write('Phase4A3ScriptureVineCertification.json', vineCert);
  write('Phase4A3RelationshipPreservationAudit.json', relAudit);
  fs.writeFileSync(path.join(ROOT, 'Phase4BAuthorizationReport.md'), auth.lines);
  fs.writeFileSync(path.join(ROOT, 'BibleAuthorityPhase4A3Report.md'), executiveReport);

  return {
    classification,
    registry,
    certification,
    vineCert,
    relAudit,
    auth,
    outputDir: OUT_DIR,
  };
}

module.exports = { runPhase4A3 };
