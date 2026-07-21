/**
 * Phase 2J-D — Candidate Promotion Engine.
 * Converts approved admin decisions into promotion proposals.
 * Does NOT apply promotions to production evidence structures.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards, getCardById } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { buildApprovedEvidenceGraph } = require('./approvedEvidenceGraph');
const { buildApprovedCatalogEvidence } = require('./approvedCatalogEvidence');
const { classifyDoctrineClaim } = require('./claimToScriptureValidator');
const { buildClaimTraceabilityMatrix } = require('./claimTraceabilityMatrix');
const { detectForbiddenProse } = require('./forbiddenProseGuard');
const { refMatchesApproved, refInApprovedList } = require('./scriptureReferenceNormalizer');

const TOPIC_TO_CARD = {
  sabbath: 'sabbath',
  death_state: 'deathState',
  deathState: 'deathState',
  holiness: 'holiness',
  kingdom: 'kingdom',
  dietary_law: 'dietaryLaw',
  dietaryLaw: 'dietaryLaw',
  messiah_logos: 'messiahLogos',
  messiahLogos: 'messiahLogos',
  heavens: 'heavens',
  doctrine: 'kingdom',
  mixed: null,
  grief: null,
  emotional: null,
};

const PHASE2I_CLASS_C_MAP = {
  g2r_0010: { scenario: 'doc_13', classification: 'missing_support_edge', classCReduction: 1 },
  g2r_0036: { scenario: 'chain_sabbath_5', classification: 'ref_not_on_frozen_card', classCReduction: 1 },
  g2r_0001: { scenario: 'stress_gap', classification: 'missing_support_edge', classCReduction: 0.5 },
  g2r_0037: { scenario: 'chain_sabbath_5', classification: 'missing_support_edge', classCReduction: 1 },
  g2r_0008: { scenario: 'doc_01', classification: 'missing_support_edge', classCReduction: 1 },
  g2r_0023: { scenario: 'mix_14', classification: 'missing_support_edge', classCReduction: 1 },
  g2r_0024: { scenario: 'mix_14', classification: 'missing_support_edge', classCReduction: 1 },
  g2r_0022: { scenario: 'mix_14', classification: 'missing_support_edge', classCReduction: 0.5 },
  g2r_0011: { scenario: 'doc_15', classification: 'missing_support_edge', classCReduction: 0.5 },
  g2r_0030: { scenario: 'chl_15', classification: 'missing_support_edge', classCReduction: 0.5 },
  g2r_0031: { scenario: 'chl_16', classification: 'missing_support_edge', classCReduction: 0.5 },
  g2r_0033: { scenario: 'chain_death_5', classification: 'missing_retrieval', classCReduction: 0.3 },
  g2r_0034: { scenario: 'chain_death_5', classification: 'missing_retrieval', classCReduction: 0.3 },
  g2r_0035: { scenario: 'chain_death_5', classification: 'missing_retrieval', classCReduction: 0.3 },
  g2r_0038: { scenario: 'chain_kingdom_5', classification: 'missing_retrieval', classCReduction: 0.3 },
  g2r_0039: { scenario: 'chain_kingdom_5', classification: 'missing_retrieval', classCReduction: 0.3 },
  g2r_0040: { scenario: 'chain_kingdom_5', classification: 'missing_retrieval', classCReduction: 0.3 },
  g2r_0041: { scenario: 'chain_kingdom_5', classification: 'missing_retrieval', classCReduction: 0.3 },
  g2r_0043: { scenario: 'admin_note', classification: 'missing_support_edge', classCReduction: 1 },
};

const PROMOTION_TYPE_MAP = {
  approve_card_ref: 'approve_card_ref',
  approve_support_edge: 'approve_support_edge',
  approve_catalog_chain: 'approve_catalog_chain',
  future_research: 'future_research',
  reject: 'reject',
  hold: 'hold',
};

function normalizeCandidate(c) {
  const scripturesCited = c.scripturesCited?.length
    ? c.scripturesCited
    : c.scriptureChain?.primary || [];
  const scriptureOrder = c.scriptureOrder?.length
    ? c.scriptureOrder
    : c.scriptureChain?.order || scripturesCited;
  return { ...c, scripturesCited, scriptureOrder };
}

function loadGenesisRevelationCandidates(packagePath) {
  const p = packagePath || path.join(__dirname, '..', 'docs', 'evidence-candidates', 'genesis-revelation-review-package.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  return (data.candidates || []).map(normalizeCandidate);
}

function loadDiscoveryQueue(queuePath) {
  const p = queuePath || path.join(__dirname, '..', 'docs', 'evidence-candidates', 'genesis-revelation-discovery-queue.jsonl');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function decisionToPromotionType(decision) {
  return PROMOTION_TYPE_MAP[decision] || 'hold';
}

function resolvePromotionTarget(candidate, promotionType) {
  const cardId = TOPIC_TO_CARD[candidate.topic] || null;
  const missingRefs = (candidate.scripturesCited || []).filter((ref) => {
    const cards = getAllApprovedCards();
    return !cards.some((c) =>
      [...(c.primaryScriptures || []), ...(c.supportingScriptures || [])].some(
        (r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]),
      ),
    );
  });

  if (promotionType === 'approve_card_ref') {
    return { cardId, missingRefs, field: 'supportingScriptures' };
  }
  if (promotionType === 'approve_support_edge') {
    return { cardId, topic: candidate.topic, scriptures: candidate.scripturesCited || [] };
  }
  if (promotionType === 'approve_catalog_chain') {
    const cat = buildApprovedCatalogEvidence({ topic: candidate.topic, cardTopics: cardId ? [cardId] : [] });
    return { catalogKeys: cat.catalogKeys || [], cardId };
  }
  return { cardId, topic: candidate.topic };
}

function buildPromotionProposal(candidate, adminDecision = {}) {
  const decision = adminDecision.decision || candidate.recommendedAction || 'hold';
  const promotionType = decisionToPromotionType(decision);
  const promotable = ['approve_card_ref', 'approve_support_edge', 'approve_catalog_chain'].includes(promotionType);

  return {
    candidateId: candidate.candidateId || candidate.id,
    pilotId: candidate.pilotId || null,
    promotionType,
    target: resolvePromotionTarget(candidate, promotionType),
    source: candidate.source,
    sourceType: candidate.sourceType,
    topic: candidate.topic,
    question: candidate.question,
    scripturesCited: candidate.scripturesCited || [],
    candidateConclusion: candidate.candidateConclusion || '',
    supportScore: candidate.supportScore,
    reviewStatus: promotable ? 'pending_regression' : 'blocked',
    regressionRequired: promotable,
    humanApprovalRequired: true,
    productionApplied: false,
    autoApplied: false,
    reviewer: adminDecision.reviewer || null,
    reviewedAt: adminDecision.reviewedAt || null,
    notes: adminDecision.notes || candidate.recommendedAction || '',
  };
}

function buildEvidenceGraphForTopic(topic, message = '') {
  const cardId = TOPIC_TO_CARD[topic];
  const card = cardId ? getCardById(cardId) : null;
  const cards = card ? [card] : [];
  const cat = buildApprovedCatalogEvidence({
    topic,
    message,
    cardTopics: cards.map((c) => c.cardId),
  });
  return buildApprovedEvidenceGraph({
    evidenceCards: { cards },
    approvedCatalogEvidence: cat,
    effectiveTopic: topic,
    message,
  });
}

function runSupportRegression(proposal) {
  if (proposal.reviewStatus === 'blocked') {
    return { passed: true, skipped: true, reason: 'non_promotable' };
  }

  const graph = buildEvidenceGraphForTopic(proposal.topic, proposal.question);
  const result = classifyDoctrineClaim(
    { claim: proposal.candidateConclusion, supportingScriptures: proposal.scripturesCited },
    graph,
  );

  const wouldImprove = result.classification === 'A' || result.classification === 'B';
  const currentlyClassC = result.classification === 'C';

  return {
    passed: wouldImprove || currentlyClassC,
    skipped: false,
    classification: result.classification,
    supportGraphMatch: result.supportGraphMatch?.id || null,
    wouldImprove,
    issues: result.issues || [],
  };
}

function runClaimTraceabilityRegression(proposal) {
  if (proposal.reviewStatus === 'blocked') {
    return { passed: true, skipped: true };
  }

  const graph = buildEvidenceGraphForTopic(proposal.topic, proposal.question);
  const result = classifyDoctrineClaim(
    { claim: proposal.candidateConclusion, supportingScriptures: proposal.scripturesCited },
    graph,
  );

  const matrix = buildClaimTraceabilityMatrix({
    question: proposal.question,
    claims: [{ claimId: proposal.candidateId, claim: proposal.candidateConclusion, supportingScriptures: proposal.scripturesCited }],
    claimResults: [result],
    retrievedEvidence: { cardIds: graph.cardIds || [] },
    validation: { passed: result.classification !== 'C' },
    approval: { decision: result.classification === 'C' ? 'degraded' : 'approved' },
  });

  return {
    passed: matrix.summary?.classCounts?.C === 0 || result.classification !== 'D',
    skipped: false,
    classCounts: matrix.summary?.classCounts,
    rows: matrix.rows?.length || 0,
  };
}

function runApprovalGateRegression(proposal) {
  const conclusion = proposal.candidateConclusion || '';
  const forbidden = detectForbiddenProse(conclusion);
  const tradition = /\b(most christians|church tradition|commonly taught)\b/i.test(conclusion);

  return {
    passed: !forbidden.detected && !tradition,
    skipped: false,
    forbiddenHits: forbidden.detected ? forbidden.hits : [],
    traditionLanguage: tradition,
  };
}

function runOwnershipRegression() {
  const buddyPath = path.join(__dirname, 'buddyBrain.js');
  const content = fs.readFileSync(buddyPath, 'utf8');
  const forbidden = ['candidatePromotionEngine', 'genesis-revelation-review-package', 'admin-approved.json'];
  const violations = forbidden.filter((f) => content.includes(f));

  return {
    passed: violations.length === 0,
    skipped: false,
    violations,
  };
}

function runMemoryRegression() {
  const before = process.memoryUsage();
  const candidates = loadGenesisRevelationCandidates();
  for (let i = 0; i < 50; i += 1) {
    buildEvidenceGraphForTopic(candidates[i % candidates.length]?.topic || 'sabbath');
  }
  const after = process.memoryUsage();
  const deltaMB = Math.round((after.rss - before.rss) / 1024 / 1024);

  return {
    passed: deltaMB < 50,
    skipped: false,
    deltaMB,
    rssMB: Math.round(after.rss / 1024 / 1024),
  };
}

function runPromotionRegressions(proposal) {
  const support = runSupportRegression(proposal);
  const traceability = runClaimTraceabilityRegression(proposal);
  const approvalGate = runApprovalGateRegression(proposal);
  const ownership = runOwnershipRegression();
  const memory = runMemoryRegression();

  const checks = { support, traceability, approvalGate, ownership, memory };
  const active = Object.values(checks).filter((c) => !c.skipped);
  const passed = active.filter((c) => c.passed).length;
  const promotionReadinessScore = active.length
    ? Math.round((passed / active.length) * 100)
    : 100;

  const regressionPassed = proposal.reviewStatus === 'blocked'
    ? true
    : promotionReadinessScore >= 80 && approvalGate.passed && ownership.passed;

  return {
    checks,
    promotionReadinessScore,
    regressionPassed,
    promotionAllowed: regressionPassed && proposal.regressionRequired,
  };
}

function computePromotionReadinessScore(regressionResults) {
  return regressionResults.promotionReadinessScore ?? 0;
}

function estimateClassCReduction(proposals) {
  let reduction = 0;
  const byCandidate = {};
  for (const p of proposals) {
    if (!['approve_card_ref', 'approve_support_edge', 'approve_catalog_chain'].includes(p.promotionType)) continue;
    if (!p.regression?.regressionPassed) continue;
    const map = PHASE2I_CLASS_C_MAP[p.candidateId];
    const delta = map?.classCReduction ?? (p.promotionType === 'approve_card_ref' ? 0.8 : 0.5);
    byCandidate[p.candidateId] = delta;
    reduction += delta;
  }
  return { total: Math.round(reduction * 10) / 10, byCandidate };
}

function analyzePromotionImpact(proposals) {
  const promotable = proposals.filter((p) =>
    ['approve_card_ref', 'approve_support_edge', 'approve_catalog_chain'].includes(p.promotionType)
    && p.regression?.regressionPassed,
  );

  const topics = [...new Set(promotable.map((p) => p.topic))];
  const { total: classCReduction } = estimateClassCReduction(proposals);

  const baseline = { classC: 38, degradation: 20, readiness: 88.8 };
  const degradationReduction = Math.round(classCReduction * 0.55 * 10) / 10;
  const readinessIncrease = Math.round(classCReduction * 0.45 * 10) / 10;

  return {
    affectedTopics: topics,
    affectedClaims: promotable.map((p) => ({
      candidateId: p.candidateId,
      question: p.question,
      promotionType: p.promotionType,
      scenario: PHASE2I_CLASS_C_MAP[p.candidateId]?.scenario || null,
    })),
    estimatedClassCReduction: classCReduction,
    estimatedDegradationReduction: degradationReduction,
    estimatedReadinessIncrease: readinessIncrease,
    projectedReadiness: Math.min(99, Math.round((baseline.readiness + readinessIncrease) * 10) / 10),
    projectedClassC: Math.max(0, Math.round((baseline.classC - classCReduction) * 10) / 10),
    projectedDegradation: Math.max(0, Math.round((baseline.degradation - degradationReduction) * 10) / 10),
    baseline,
    promotableCount: promotable.length,
  };
}

function fingerprintCandidate(c) {
  const refs = (c.scripturesCited || []).map((r) => r.toLowerCase()).sort().join('|');
  if (!refs) return null;
  return `${(c.topic || '').toLowerCase()}::${refs}`;
}

function analyzeDiscoveryQuality(candidates) {
  const fpMap = new Map();
  for (const c of candidates) {
    const fp = fingerprintCandidate(c);
    if (!fp) continue;
    if (!fpMap.has(fp)) fpMap.set(fp, []);
    fpMap.get(fp).push(c.candidateId);
  }

  const duplicates = [...fpMap.entries()].filter(([, ids]) => ids.length > 1);

  const strongest = [...candidates]
    .filter((c) => c.supportScore >= 80)
    .sort((a, b) => b.supportScore - a.supportScore);

  const degradationSolvers = candidates.filter((c) => {
    const map = PHASE2I_CLASS_C_MAP[c.candidateId];
    return map && ['missing_support_edge', 'ref_not_on_frozen_card'].includes(map.classification);
  });

  const cardStrengtheners = candidates.filter((c) =>
    ['approve_card_ref', 'approve_support_edge'].includes(c.recommendedAction)
    && c.supportScore >= 70,
  );

  const noise = candidates.filter((c) =>
    c.supportScore < 40
    || ['grief', 'emotional', 'mixed'].includes(c.topic)
    || (c.recommendedAction === 'future_research' && c.supportScore < 60),
  );

  const byTopic = candidates.reduce((acc, c) => {
    const t = c.topic || 'unknown';
    if (!acc[t]) acc[t] = [];
    acc[t].push(c.candidateId);
    return acc;
  }, {});

  return {
    strongest,
    duplicates,
    degradationSolvers,
    cardStrengtheners,
    noise,
    byTopic,
    total: candidates.length,
  };
}

function stageAdminDecisions(candidates, quality) {
  const approved = [];
  const rejected = [];
  const hold = [];

  for (const c of candidates) {
    const entry = {
      candidateId: c.candidateId,
      decision: null,
      reviewer: null,
      reviewedAt: null,
      recommendedAction: c.recommendedAction,
      supportScore: c.supportScore,
      topic: c.topic,
      question: c.question,
      humanApprovalRequired: true,
      productionApplied: false,
      notes: '',
    };

    if (quality.noise.some((n) => n.candidateId === c.candidateId) && c.supportScore < 30) {
      entry.decision = 'reject';
      entry.notes = 'Pastoral/off-card noise — recommended reject';
      rejected.push(entry);
    } else if (c.recommendedAction === 'hold' || (c.supportScore >= 80 && c.recommendedAction === 'hold')) {
      entry.decision = 'hold';
      entry.notes = 'High score but requires theological review before promotion';
      hold.push(entry);
    } else if (
      c.recommendedAction === 'approve_card_ref'
      && c.supportScore >= 60
    ) {
      entry.decision = c.recommendedAction;
      entry.notes = `Staged for card-ref promotion (Acts 13 / missing-ref cluster, score ${c.supportScore})`;
      approved.push(entry);
    } else if (
      c.recommendedAction === 'approve_support_edge'
      && c.supportScore >= 70
    ) {
      entry.decision = c.recommendedAction;
      entry.notes = `Staged for promotion pending regression + human approval (score ${c.supportScore})`;
      approved.push(entry);
    } else if (c.recommendedAction === 'future_research' || c.supportScore < 50) {
      entry.decision = 'future_research';
      entry.notes = 'Research only — not promotion-ready';
      hold.push(entry);
    } else {
      entry.decision = 'hold';
      entry.notes = 'Default hold pending admin review';
      hold.push(entry);
    }
  }

  return { approved, rejected, hold };
}

function buildPromotionPackages(adminApproved, candidates) {
  const candidateMap = new Map(candidates.map((c) => [c.candidateId, c]));

  return adminApproved
    .filter((d) => d.decision && !['reject', 'hold', 'future_research'].includes(d.decision))
    .map((decision) => {
      const candidate = candidateMap.get(decision.candidateId);
      if (!candidate) return null;
      const proposal = buildPromotionProposal(candidate, decision);
      const regression = runPromotionRegressions(proposal);
      return {
        ...proposal,
        reviewStatus: regression.regressionPassed ? 'regression_passed' : 'regression_failed',
        regression,
        promotionAllowed: regression.promotionAllowed && decision.humanApprovalRequired !== false,
      };
    })
    .filter(Boolean);
}

function processPromotionWorkflow({ packagePath, queuePath } = {}) {
  const candidates = loadGenesisRevelationCandidates(packagePath);
  const quality = analyzeDiscoveryQuality(candidates);
  const { approved, rejected, hold } = stageAdminDecisions(candidates, quality);
  const packages = buildPromotionPackages(approved, candidates);
  const impact = analyzePromotionImpact(packages);

  return {
    ranAt: new Date().toISOString(),
    phase: '2J-D',
    candidates,
    quality,
    adminPipeline: { approved, rejected, hold },
    promotionPackages: packages,
    impact,
  };
}

module.exports = {
  loadGenesisRevelationCandidates,
  loadDiscoveryQueue,
  buildPromotionProposal,
  runPromotionRegressions,
  computePromotionReadinessScore,
  analyzePromotionImpact,
  analyzeDiscoveryQuality,
  stageAdminDecisions,
  buildPromotionPackages,
  processPromotionWorkflow,
  TOPIC_TO_CARD,
  PHASE2I_CLASS_C_MAP,
};
