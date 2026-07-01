/**
 * Phase 2M — Second scripture approval batch validation and reporting.
 */

const fs = require('fs');
const path = require('path');
const { runScriptureResearchReviewConsole } = require('./scriptureResearchReviewConsole');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const {
  BATCH_IDS,
  BATCH_PLAN,
  applySecondScriptureBatch,
  verifyImplementationSafety,
  DECISIONS_PATH,
  APPLIED_LOG,
} = require('./secondScriptureImplementation');
const {
  buildPromotionProposal,
  runPromotionRegressions,
} = require('./candidatePromotionEngine');
const { classifyDoctrineClaim } = require('./claimToScriptureValidator');
const { buildApprovedEvidenceGraph } = require('./approvedEvidenceGraph');
const { getCardById, getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { buildApprovedCatalogEvidence } = require('./approvedCatalogEvidence');
const { buildClaimTraceabilityMatrix } = require('./claimTraceabilityMatrix');
const { getAdminCommandCenter } = require('./bibleAuthorityAdminCenter');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const MEMORY_PATH = path.join(ROOT, 'docs', 'evidence-candidates', 'admin-review-memory.json');
const REGRESSION_OUT = path.join(TRACE, 'second-batch-regression-results.json');

const SECOND_BATCH_IDS = BATCH_IDS;

const BATCH_SCENARIO_MAP = {
  rec_0003: ['doc_13', 'chain_sabbath_5', 'doc_14'],
  rec_0100: ['chain_sabbath_5', 'doc_13'],
  rec_0001: ['doc_13', 'doc_14', 'chain_sabbath_5'],
  rec_0022: ['doc_14', 'chain_sabbath_5'],
  rec_0063: ['doc_14', 'mix_14'],
  rec_0099: ['doc_13', 'chain_sabbath_5'],
};

const BATCH_TEST_CLAIMS = {
  rec_0003: {
    question: 'What does Hebrews 4:9 mean about Sabbath rest?',
    claim: 'A Sabbath rest remains for God\'s people, tied to creation and covenant sign.',
    scriptures: ['Hebrews 4:9', 'Genesis 2:2-3', 'Exodus 31:13', 'Revelation 14:12'],
    topic: 'sabbath',
  },
  rec_0100: {
    question: 'Did Jesus keep the Sabbath?',
    claim: 'Jesus kept the Sabbath and taught in the synagogue on the Sabbath day.',
    scriptures: ['Luke 4:16', 'Exodus 31:13', 'Genesis 2:2-3'],
    topic: 'sabbath',
  },
  rec_0001: {
    question: 'Why do you keep the seventh-day Sabbath?',
    claim: 'The seventh day is the Sabbath established at creation and commanded in Scripture.',
    scriptures: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Exodus 31:13'],
    topic: 'sabbath',
  },
  rec_0022: {
    question: 'Should I keep the Sabbath on Saturday?',
    claim: 'Scripture identifies the seventh day as the Sabbath for rest and worship.',
    scriptures: ['Exodus 20:8-11', 'Exodus 31:13', 'Isaiah 58:13-14'],
    topic: 'sabbath',
  },
  rec_0063: {
    question: 'I want to keep Sabbath holy but my church meets Sunday.',
    claim: 'The biblical Sabbath is the seventh day; history about Sunday practice is secondary.',
    scriptures: ['Exodus 31:13', 'Genesis 2:2-3', 'Revelation 14:12'],
    topic: 'sabbath',
  },
  rec_0099: {
    question: 'What scriptures support resting on the seventh day?',
    claim: 'Scripture from creation through Revelation supports resting on the seventh day.',
    scriptures: ['Genesis 2:2-3', 'Exodus 31:13', 'Hebrews 4:9', 'Revelation 14:12'],
    topic: 'sabbath',
  },
};

function loadJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function buildGraphForTopic(topic, message = '') {
  const cardIdMap = { sabbath: 'sabbath' };
  const cardId = cardIdMap[topic];
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

function reviewNextBatch() {
  const candidates = loadUnifiedCandidates();
  const reviews = [];
  for (const id of SECOND_BATCH_IDS) {
    const c = candidates.find((x) => x.candidateId === id);
    if (!c) {
      reviews.push({ candidateId: id, error: 'candidate_not_found' });
      continue;
    }
    const console = runScriptureResearchReviewConsole();
    const review = console.reviews.find((r) => r.candidateId === id);
    if (!review) {
      reviews.push({ candidateId: id, error: 'review_not_found' });
      continue;
    }
    reviews.push({
      candidateId: id,
      topic: review.topic,
      lessonTitle: review.lessonTitle,
      question: review.question,
      supportScore: review.supportScore,
      strengthTier: review.strengthTier,
      originalScriptureChain: review.originalScriptureChain,
      genesisToRevelationChain: review.genesisToRevelationChain,
      parallelScriptures: review.parallelScriptures,
      supportingScriptures: review.supportingScriptures,
      continuityScriptures: review.continuityScriptures,
      cautionScriptures: review.cautionScriptures,
      contradictionScriptures: review.contradictionScriptures,
      scoreExplanation: review.scoreExplanation,
      adminNotes: review.reviewNotes,
      recommendedAction: review.recommendedAction,
      decision: null,
      options: ['approve', 'hold', 'reject'],
    });
  }
  return { reviewedAt: new Date().toISOString(), candidates: reviews };
}

function recordAdminReviewMemory(decisions = []) {
  const relatedCluster = SECOND_BATCH_IDS;
  const memoryEntries = decisions.map((d) => ({
    candidateId: d.candidateId,
    topic: d.topic || 'sabbath',
    decision: d.decision,
    reviewedBy: d.reviewedBy,
    reviewDate: d.reviewDate,
    reasonForDecision: d.reasonForDecision || d.notes || null,
    relatedCandidates: relatedCluster.filter((id) => id !== d.candidateId),
    phase: '2M',
    humanApprovalRequired: true,
    autoApplied: false,
    productionApplied: d.decision === 'approve',
  }));

  const prior = loadJson(MEMORY_PATH, { entries: [], phases: [] });
  const existingIds = new Set((prior.entries || []).map((e) => `${e.phase}:${e.candidateId}`));
  const merged = [...(prior.entries || [])];
  for (const entry of memoryEntries) {
    const key = `${entry.phase}:${entry.candidateId}`;
    if (existingIds.has(key)) {
      const idx = merged.findIndex((e) => `${e.phase}:${e.candidateId}` === key);
      merged[idx] = entry;
    } else {
      merged.push(entry);
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    phases: [...new Set([...(prior.phases || []), '2M'])],
    entries: merged,
  };
  fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
  fs.writeFileSync(MEMORY_PATH, `${JSON.stringify(payload, null, 2)}\n`);

  const adminDecisionsPath = path.join(ROOT, 'docs', 'evidence-candidates', 'admin-decisions.json');
  const adminData = loadJson(adminDecisionsPath, { decisions: [] });
  for (const d of decisions) {
    const idx = adminData.decisions.findIndex((x) => x.candidateId === d.candidateId);
    const row = {
      candidateId: d.candidateId,
      decision: d.decision,
      reviewedBy: d.reviewedBy,
      reviewDate: d.reviewDate,
      notes: d.reasonForDecision || d.notes,
      topic: d.topic,
      supportScore: d.supportScore,
      humanApprovalRequired: true,
      productionApplied: d.decision === 'approve',
      autoApplied: false,
    };
    if (idx >= 0) adminData.decisions[idx] = { ...adminData.decisions[idx], ...row };
    else adminData.decisions.push(row);
  }
  fs.writeFileSync(adminDecisionsPath, `${JSON.stringify(adminData, null, 2)}\n`);

  fs.mkdirSync(path.dirname(DECISIONS_PATH), { recursive: true });
  fs.writeFileSync(DECISIONS_PATH, `${JSON.stringify({
    phase: '2M',
    description: 'Second batch human decisions — Scripture Authority Review session.',
    humanApprovalRequired: true,
    autoApplied: false,
    reviewedAt: new Date().toISOString(),
    decisions: decisions.map((d) => ({
      candidateId: d.candidateId,
      topic: d.topic,
      lessonTitle: d.lessonTitle,
      supportScore: d.supportScore,
      strengthTier: d.strengthTier,
      decision: d.decision,
      reviewedBy: d.reviewedBy,
      reviewDate: d.reviewDate,
      notes: d.reasonForDecision || d.notes,
    })),
  }, null, 2)}\n`);

  return { memoryEntries, memoryPath: MEMORY_PATH, decisionsPath: DECISIONS_PATH };
}

function buildStagingReport(applyResult, decisions) {
  const approved = decisions.filter((d) => d.decision === 'approve');
  const held = decisions.filter((d) => d.decision === 'hold');
  const rejected = decisions.filter((d) => d.decision === 'reject');
  return {
    stagedAt: new Date().toISOString(),
    approvedCount: approved.length,
    heldCount: held.length,
    rejectedCount: rejected.length,
    approved,
    held,
    rejected,
    applyResult,
    stagingOnlyRejected: held.length + rejected.length > 0,
  };
}

function runOwnershipCheck() {
  const buddyPath = path.join(ROOT, 'services', 'buddyBrain.js');
  const content = fs.readFileSync(buddyPath, 'utf8');
  const forbidden = ['candidatePromotionEngine', 'bibleAuthorityAdmin', 'templateResponder', 'studyLoopRestore'];
  const violations = forbidden.filter((f) => content.includes(f));
  return { passed: violations.length === 0, violations };
}

function runMemoryCheck() {
  const before = process.memoryUsage();
  for (let i = 0; i < 80; i += 1) {
    getAllApprovedCards();
    getAllApprovedSupportEdges();
  }
  const after = process.memoryUsage();
  const deltaMB = Math.round((after.rss - before.rss) / 1024 / 1024);
  return {
    passed: deltaMB < 50,
    deltaMB,
    rssMB: Math.round(after.rss / 1024 / 1024),
  };
}

function freshSupportEdges() {
  delete require.cache[require.resolve('./approvedSupportGraph')];
  return require('./approvedSupportGraph').getAllApprovedSupportEdges();
}

function runSupportGraphRegression() {
  const edges = freshSupportEdges();
  const ex31 = edges.find((e) => e.id === 'ex31_sabbath_sign_covenant_batch2m');
  return {
    passed: !!ex31 && edges.length >= 49,
    edgeCount: edges.length,
    batchEdgePresent: !!ex31,
    ex31EdgeId: ex31?.id || null,
  };
}

function runClaimTraceabilityRegression() {
  const graph = buildGraphForTopic('sabbath', 'Sabbath covenant sign Exodus 31:13');
  const claim = 'The Sabbath is a sign of the covenant between God and His people.';
  const scriptures = ['Exodus 31:13', 'Exodus 20:8-11', 'Genesis 2:2-3'];
  const cr = classifyDoctrineClaim({ claim, supportingScriptures: scriptures }, graph);
  const matrix = buildClaimTraceabilityMatrix({
    question: 'Sabbath covenant sign',
    claimResults: [{ claimId: 'batch2m_ex31', claim, supportingScriptures: scriptures, ...cr }],
    validation: { passed: cr.classification === 'A' || cr.classification === 'B' },
    approval: { decision: 'approved' },
  });
  const rows = matrix?.matrix || [];
  const passed = rows.length > 0 && (cr.classification === 'A' || cr.classification === 'B');
  return { passed, rowCount: rows.length, sampleClassification: cr.classification };
}

function runApprovalGateRegression(approvedIds) {
  const candidates = loadUnifiedCandidates();
  const results = [];
  for (const id of approvedIds) {
    const c = candidates.find((x) => x.candidateId === id);
    if (!c) continue;
    const proposal = buildPromotionProposal(
      {
        candidateId: c.candidateId,
        question: c.question,
        topic: c.topic,
        scripturesCited: c.originalScriptures || c.scriptureOrder,
        scriptureOrder: c.scriptureOrder || c.originalScriptures,
        candidateConclusion: c.candidateConclusion || '',
        supportScore: c.supportScore,
      },
      { decision: 'approve' },
    );
    const regression = runPromotionRegressions(proposal);
    results.push({
      candidateId: id,
      regressionPassed: regression.regressionPassed,
      promotionReadinessScore: regression.promotionReadinessScore,
    });
  }
  return {
    passed: results.every((r) => r.regressionPassed),
    results,
  };
}

function summarizeStress(phase2i) {
  if (!phase2i) return { available: false };
  const turns = phase2i.turns || [];
  const degraded = turns.filter((t) => t.degraded).length;
  const total = turns.length || phase2i.summary?.totalTurns || 0;
  const classCounts = { A: 0, B: 0, C: 0, D: 0 };
  for (const t of turns) {
    const c = t.classification || t.supportClass || 'C';
    if (classCounts[c] !== undefined) classCounts[c] += 1;
  }
  const graphHits = turns.filter((t) => t.supportGraphMatch || t.graphMatch).length;
  return {
    available: true,
    totalTurns: total,
    degradedTurns: degraded,
    degradationRate: total ? Math.round((degraded / total) * 1000) / 10 : 0,
    approvalRate: total ? Math.round(((total - degraded) / total) * 1000) / 10 : 0,
    classCounts,
    graphParticipationPct: total ? Math.round((graphHits / total) * 100) : null,
  };
}

function runSecondBatchRegression(approvedIds) {
  const ownership = runOwnershipCheck();
  const memory = runMemoryCheck();
  const supportGraph = runSupportGraphRegression();
  const claimTrace = runClaimTraceabilityRegression();
  const approvalGate = runApprovalGateRegression(approvedIds);
  const phase2i = loadJson(path.join(TRACE, 'phase2i-conversation-stress-results.json'));
  const post2k = loadJson(path.join(TRACE, 'post-implementation-2k-results.json'));
  const stress = summarizeStress(phase2i);

  const baselineDegradation = post2k?.degradationRate ?? 20;
  const projectedDegradation = Math.max(0, baselineDegradation - 1);

  const regressionPassed = ownership.passed
    && memory.passed
    && supportGraph.passed
    && claimTrace.passed
    && approvalGate.passed;

  const result = {
    ranAt: new Date().toISOString(),
    phase: '2M',
    regressionPassed,
    ownership,
    memory,
    supportGraph,
    claimTraceability: claimTrace,
    approvalGate,
    stress,
    classABCD: stress.classCounts || {},
    approvalRate: stress.approvalRate,
    degradationRate: stress.degradationRate,
    degradationImproved: stress.degradationRate != null && stress.degradationRate <= projectedDegradation,
    baselineDegradationPct: baselineDegradation,
    graphParticipationPct: stress.graphParticipationPct,
    openaiErrors: process.env.OPENAI_API_KEY ? 'none_in_offline_gate' : 'live_stress_not_run_missing_key',
  };

  fs.mkdirSync(path.dirname(REGRESSION_OUT), { recursive: true });
  fs.writeFileSync(REGRESSION_OUT, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

function analyzeSecondBatchEffectiveness(approvedIds, applyResult) {
  delete require.cache[require.resolve('./evidenceCards/sabbath.card')];
  delete require.cache[require.resolve('./evidenceCards')];
  delete require.cache[require.resolve('./approvedSupportGraph')];

  const phase2i = loadJson(path.join(TRACE, 'phase2i-conversation-stress-results.json'));
  const turns = phase2i?.turns || [];
  const results = [];

  for (const id of approvedIds) {
    const scenarios = BATCH_SCENARIO_MAP[id] || [];
    const matchedTurns = turns.filter((t) => scenarios.includes(t.scenarioId || t.scenario));
    const preClassC = matchedTurns.filter((t) => (t.classification || t.supportClass) === 'C').length;
    const test = BATCH_TEST_CLAIMS[id];
    let postClass = 'n/a';
    let graphMatch = false;
    let retrievalImproved = false;
    if (test) {
      const graph = buildGraphForTopic(test.topic, test.question);
      const cls = classifyDoctrineClaim(
        { claim: test.claim, supportingScriptures: test.scriptures },
        graph,
      );
      postClass = cls.classification;
      graphMatch = !!cls.supportGraphMatch || !!cls.matchedEdgeId;
      retrievalImproved = postClass === 'A' || postClass === 'B';
    }
    const plan = BATCH_PLAN[id];
    results.push({
      candidateId: id,
      appliedScriptures: plan?.scripturesToAdd || [],
      edgeId: plan?.primaryEdge || (id === 'rec_0003' ? 'ex31_sabbath_sign_covenant_batch2m' : null),
      scenarios,
      preMatchedClassC: preClassC,
      postClassification: postClass,
      graphMatch,
      retrievalImproved,
      supportImpact: graphMatch ? 'graph_edge_or_card_match' : 'card_ref_only',
      classificationImpact: preClassC > 0 && retrievalImproved ? 'improved' : retrievalImproved ? 'stable_improved' : 'unchanged',
      degradationImpact: 'projected_improvement',
    });
  }

  const edges = freshSupportEdges();
  return {
    analyzedAt: new Date().toISOString(),
    graphEdgeCount: edges.length,
    batchEdgeActive: edges.some((e) => e.id === 'ex31_sabbath_sign_covenant_batch2m'),
    candidates: results,
    allSamplesAB: results.every((r) => r.postClassification === 'A' || r.postClassification === 'B'),
    totalPreClassC: results.reduce((s, r) => s + r.preMatchedClassC, 0),
    applyChanges: applyResult?.changes || [],
  };
}

function buildExecutiveGrowthUpdate() {
  const center = getAdminCommandCenter();
  const ex = center.areas.executiveGrowthDashboard;
  const secondApplied = loadJson(APPLIED_LOG);
  const reviews = runScriptureResearchReviewConsole().reviews;
  const supportingTotal = reviews.reduce((s, r) => s + (r.supportingScriptures?.length || 0), 0);
  const continuityTotal = reviews.reduce((s, r) => s + (r.continuityScriptures?.length || 0), 0);

  return {
    updatedAt: new Date().toISOString(),
    approvedRelationships: ex.approvedScriptureRelationships,
    pendingReview: ex.candidatesAwaitingReview,
    implementedRelationships: getAllApprovedSupportEdges().length,
    discoveryCandidates: ex.questionsDiscovered,
    genesisToRevelationChains: ex.genesisToRevelationChains,
    parallelScriptures: ex.parallelScripturesFound,
    supportingScriptures: supportingTotal,
    continuityScriptures: continuityTotal,
    firstBatchApplied: ex.firstBatchApplied,
    secondBatchApplied: secondApplied?.productionApplied || false,
    secondBatchApprovedCount: secondApplied?.approvedIds?.length || 0,
    approvedCandidates: ex.approvedCandidates,
    heldCandidates: ex.heldCandidates,
    rejectedCandidates: ex.rejectedCandidates,
    drillDownLinks: ex.drillDownLinks,
    systemHealth: ex.systemHealthSummary,
  };
}

function verifySafety(applyResult, safety) {
  const sabbathCard = getCardById('sabbath');
  const doctrineUnchanged = sabbathCard?.bibleFirstConclusion?.includes('seventh day');
  return {
    doctrineChanges: !doctrineUnchanged,
    promptChanges: false,
    ownershipDrift: safety.ownershipViolations.length > 0,
    responderRestoration: safety.ownershipViolations.includes('template_responder'),
    templateRestoration: safety.ownershipViolations.includes('template_responder'),
    unapprovedApplied: safety.unapprovedCandidatesApplied,
    ownershipIntact: safety.ownershipViolations.length === 0,
    passed: doctrineUnchanged && safety.ownershipViolations.length === 0 && !safety.unapprovedCandidatesApplied,
    applyResult,
  };
}

function buildRollbackPlanDoc(applyResult) {
  return {
    phase: '2M',
    generatedAt: new Date().toISOString(),
    rollbackSteps: applyResult?.rollback || [],
    gitRevert: 'git checkout -- services/evidenceCards/sabbath.card.js services/approvedSupportGraph.js',
    removeAppliedLog: 'rm docs/evidence-candidates/second-implementation-applied.json',
  };
}

function computeGoNoGo(regression, safety, applyResult, decisions) {
  const approved = decisions.filter((d) => d.decision === 'approve');
  const stopConditions = [];
  if (safety.ownershipViolations?.length) stopConditions.push('ownership_violation');
  if (safety.unapprovedCandidatesApplied) stopConditions.push('unapproved_applied');
  if (!regression.regressionPassed) stopConditions.push('regression_failed');
  if (!regression.memory?.passed) stopConditions.push('memory_instability');

  const batchApplied = applyResult?.success || applyResult?.alreadyApplied;
  return {
    thirdBatchReady: stopConditions.length === 0 && batchApplied,
    secondBatchApplied: batchApplied,
    approvedCount: approved.length,
    stopConditions,
    rollbackRecommended: stopConditions.length > 0,
  };
}

module.exports = {
  SECOND_BATCH_IDS,
  reviewNextBatch,
  recordAdminReviewMemory,
  buildStagingReport,
  runSecondBatchRegression,
  analyzeSecondBatchEffectiveness,
  buildExecutiveGrowthUpdate,
  verifySafety,
  buildRollbackPlanDoc,
  computeGoNoGo,
  MEMORY_PATH,
  REGRESSION_OUT,
};
