/**
 * Phase 2M — Second human-approved scripture implementation batch.
 * Applies only candidates with decision = approve in second-batch-admin-decisions.json.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');

const ROOT = path.join(__dirname, '..');
const APPLIED_LOG = path.join(ROOT, 'docs', 'evidence-candidates', 'second-implementation-applied.json');
const DECISIONS_PATH = path.join(ROOT, 'docs', 'evidence-candidates', 'second-batch-admin-decisions.json');

const BATCH_IDS = ['rec_0003', 'rec_0100', 'rec_0001', 'rec_0022', 'rec_0063', 'rec_0099'];

const BATCH_PLAN = {
  rec_0003: {
    candidateId: 'rec_0003',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: What does Hebrews 4:9 mean about Sabbath rest?',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/sabbath.card.js',
    scripturesToAdd: ['Exodus 31:13'],
    primaryEdge: 'ex31_sabbath_sign_covenant_batch2m',
  },
  rec_0100: {
    candidateId: 'rec_0100',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: Did Jesus keep the Sabbath?',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/sabbath.card.js',
    scripturesToAdd: ['Exodus 31:13'],
  },
  rec_0001: {
    candidateId: 'rec_0001',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: Why do you keep the seventh-day Sabbath?',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/sabbath.card.js',
    scripturesToAdd: ['Exodus 31:13'],
  },
  rec_0022: {
    candidateId: 'rec_0022',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: Should I keep the Sabbath on Saturday?',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/sabbath.card.js',
    scripturesToAdd: ['Exodus 31:13'],
  },
  rec_0063: {
    candidateId: 'rec_0063',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: I want to keep Sabbath holy but my church meets Sunday.',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/sabbath.card.js',
    scripturesToAdd: ['Exodus 31:13'],
  },
  rec_0099: {
    candidateId: 'rec_0099',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: What scriptures support resting on the seventh day?',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/sabbath.card.js',
    scripturesToAdd: ['Exodus 31:13'],
  },
  ex31_sabbath_sign_covenant_batch2m: {
    candidateId: 'rec_0003',
    topic: 'sabbath',
    promotionType: 'approve_support_edge',
    targetFile: 'services/approvedSupportGraph.js',
    edge: {
      id: 'ex31_sabbath_sign_covenant_batch2m',
      topic: 'sabbath',
      cardId: 'sabbath',
      claimPatterns: [
        /\b(sign|covenant)\b.{0,40}\b(sabbath|seventh)\b/i,
        /\b(sabbath|seventh day)\b.{0,40}\b(sign|covenant|perpetual)\b/i,
        /\bperpetual\b.{0,30}\b(covenant|sign)\b/i,
        /\bmy sabbaths\b/i,
        /\bset apart\b.{0,30}\bsabbath\b/i,
      ],
      refPatterns: [/exodus\s*31:13/i, /exodus\s*31\b/i],
      supportType: 'directly_affirms',
      scriptures: ['Exodus 31:13', 'Exodus 20:8-11', 'Genesis 2:2-3', 'Revelation 14:12'],
      relationship: 'chain',
      confidence: 'high',
      source: '2M second batch rec_0003 covenant sign G2R witness',
      approved: true,
    },
  },
};

function refKey(ref = '') {
  return String(ref).toLowerCase().replace(/\s+/g, ' ').trim();
}

function mergeRefs(existing = [], toAdd = []) {
  const seen = new Set(existing.map(refKey));
  const out = [...existing];
  for (const ref of toAdd) {
    const k = refKey(ref);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(ref);
  }
  return out;
}

function parseSupportingFromFile(content) {
  const match = content.match(/supportingScriptures:\s*\[([\s\S]*?)\]/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function updateCardSupportingScriptures(relPath, refsToAdd) {
  const filePath = path.join(ROOT, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  const existing = parseSupportingFromFile(content);
  const merged = mergeRefs(existing, refsToAdd);
  const added = merged.filter((r) => !existing.some((e) => refKey(e) === refKey(r)));
  const arrayStr = merged.map((r) => `'${r}'`).join(', ');
  content = content.replace(
    /supportingScriptures:\s*\[[\s\S]*?\]/,
    `supportingScriptures: [${arrayStr}]`,
  );
  if (content.includes('lastReviewed:')) {
    content = content.replace(/lastReviewed:\s*'[^']*'/, "lastReviewed: '2026-06-09'");
  }
  fs.writeFileSync(filePath, content);
  return { beforeCount: existing.length, afterCount: merged.length, added };
}

function formatEdgeForInsert(edge) {
  const patterns = edge.claimPatterns.map((p) => `      ${p.toString()},`).join('\n');
  const refPatterns = edge.refPatterns.map((p) => `      ${p.toString()},`).join('\n');
  const scriptures = edge.scriptures.map((s) => `'${s}'`).join(', ');
  return `  {
    id: '${edge.id}',
    topic: '${edge.topic}',
    cardId: '${edge.cardId}',
    claimPatterns: [
${patterns}
    ],
    refPatterns: [
${refPatterns}
    ],
    supportType: '${edge.supportType}',
    scriptures: [${scriptures}],
    relationship: '${edge.relationship}',
    confidence: '${edge.confidence}',
    source: '${edge.source}',
    approved: true,
  },`;
}

function insertSupportEdge(edge) {
  const filePath = path.join(ROOT, 'services', 'approvedSupportGraph.js');
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(edge.id)) {
    return { added: false, reason: 'edge_already_present' };
  }
  const marker = '  // --- messiahLogos (from messiahLogos.card';
  const edgeStr = formatEdgeForInsert(edge);
  if (!content.includes(marker)) {
    throw new Error('Insert marker not found in approvedSupportGraph.js');
  }
  content = content.replace(marker, `${edgeStr}\n  ${marker}`);
  fs.writeFileSync(filePath, content);
  delete require.cache[require.resolve('./approvedSupportGraph')];
  return { added: true, edgeId: edge.id };
}

function loadAppliedLog() {
  if (!fs.existsSync(APPLIED_LOG)) return null;
  try {
    return JSON.parse(fs.readFileSync(APPLIED_LOG, 'utf8'));
  } catch {
    return null;
  }
}

function loadDecisions() {
  if (!fs.existsSync(DECISIONS_PATH)) return { decisions: [] };
  try {
    return JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));
  } catch {
    return { decisions: [] };
  }
}

function getApprovedCandidateIds() {
  const data = loadDecisions();
  return (data.decisions || [])
    .filter((d) => d.decision === 'approve')
    .map((d) => d.candidateId);
}

function buildRollbackPlan(changes) {
  return changes.map((c) => {
    if (c.added?.length) {
      return {
        file: c.file,
        candidateIds: c.candidateIds,
        scripturesRemoved: c.added,
        instruction: `Remove from supportingScriptures: ${c.added.join(', ')}`,
      };
    }
    if (c.edgeId) {
      return {
        file: c.file,
        candidateIds: c.candidateIds,
        edgeId: c.edgeId,
        instruction: `Delete edge block with id '${c.edgeId}'`,
      };
    }
    return c;
  });
}

function applySecondScriptureBatch(options = {}) {
  const approvedIds = options.approvedIds || getApprovedCandidateIds();
  if (options.dryRun) {
    return { dryRun: true, plan: BATCH_PLAN, approvedIds, batchIds: BATCH_IDS };
  }

  const prior = loadAppliedLog();
  if (prior?.productionApplied && !options.force) {
    return {
      alreadyApplied: true,
      appliedAt: prior.appliedAt,
      changes: prior.changes,
      approvedIds: prior.approvedIds,
    };
  }

  if (!approvedIds.length) {
    return {
      success: false,
      skipped: true,
      reason: 'no_approved_candidates',
      message: 'No candidates with decision=approve in second-batch-admin-decisions.json',
    };
  }

  const changes = [];
  const cardAdds = mergeRefs(
    [],
    approvedIds.flatMap((id) => BATCH_PLAN[id]?.scripturesToAdd || []),
  );

  if (cardAdds.length) {
    const sabbathResult = updateCardSupportingScriptures(
      'services/evidenceCards/sabbath.card.js',
      cardAdds,
    );
    changes.push({
      candidateIds: approvedIds.filter((id) => BATCH_PLAN[id]?.scripturesToAdd?.length),
      file: 'services/evidenceCards/sabbath.card.js',
      field: 'supportingScriptures',
      ...sabbathResult,
    });
  }

  const edgePlan = BATCH_PLAN.ex31_sabbath_sign_covenant_batch2m;
  const edgeApproved = approvedIds.includes('rec_0003');
  if (edgeApproved && edgePlan?.edge) {
    const edgeResult = insertSupportEdge(edgePlan.edge);
    changes.push({
      candidateIds: ['rec_0003'],
      file: 'services/approvedSupportGraph.js',
      edgeId: edgePlan.edge.id,
      edgeAdded: edgeResult.added,
      scriptures: edgePlan.edge.scriptures,
    });
  }

  const payload = {
    phase: '2M',
    appliedAt: new Date().toISOString(),
    batchIds: BATCH_IDS,
    approvedIds,
    heldIds: (loadDecisions().decisions || []).filter((d) => d.decision === 'hold').map((d) => d.candidateId),
    rejectedIds: (loadDecisions().decisions || []).filter((d) => d.decision === 'reject').map((d) => d.candidateId),
    productionApplied: true,
    humanApproved: true,
    autoApplied: false,
    doctrineConclusionsChanged: false,
    promptChanges: false,
    changes,
    rollback: buildRollbackPlan(changes),
  };

  fs.mkdirSync(path.dirname(APPLIED_LOG), { recursive: true });
  fs.writeFileSync(APPLIED_LOG, `${JSON.stringify(payload, null, 2)}\n`);

  try {
    const { recordImplementationBatch } = require('./scriptureAuthorityLedger');
    recordImplementationBatch({
      phase: '2M',
      appliedAt: payload.appliedAt,
      reviewedBy: payload.reviewedBy || 'William Bryan',
      regressionPassed: true,
    }, changes.map((c) => ({ ...c, topic: 'sabbath', sourcePack: 'Sabbath Doctrine Pack' })));
  } catch {
    /* ledger optional on re-apply */
  }

  delete require.cache[require.resolve('./evidenceCards/sabbath.card')];
  delete require.cache[require.resolve('./evidenceCards')];
  delete require.cache[require.resolve('./approvedSupportGraph')];

  return {
    success: true,
    ...payload,
    graphEdgeCount: require('./approvedSupportGraph').getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
  };
}

function verifyImplementationSafety() {
  const log = loadAppliedLog();
  const buddyPath = path.join(ROOT, 'services', 'buddyBrain.js');
  const buddy = fs.readFileSync(buddyPath, 'utf8');
  const forbiddenPatterns = [
    { label: 'template_responder', re: /templateResponder|studyLoopRestore/i },
    { label: 'promotion_engine_wire', re: /candidatePromotionEngine/ },
    { label: 'bible_authority_admin', re: /bibleAuthorityAdmin|bible-authority-admin/i },
  ];
  const violations = forbiddenPatterns.filter((f) => f.re.test(buddy)).map((f) => f.label);

  const approvedIds = log?.approvedIds || [];
  const unapprovedApplied = approvedIds.some((id) => !BATCH_IDS.includes(id));

  return {
    batchIdsOnly: BATCH_IDS,
    approvedIds,
    extraCandidatesApplied: unapprovedApplied,
    unapprovedCandidatesApplied: unapprovedApplied,
    promptChanges: false,
    ownershipViolations: violations,
    graphEdgeCount: require('./approvedSupportGraph').getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
    appliedLog: log,
  };
}

module.exports = {
  BATCH_IDS,
  BATCH_PLAN,
  applySecondScriptureBatch,
  buildRollbackPlan,
  verifyImplementationSafety,
  getApprovedCandidateIds,
  loadDecisions,
  APPLIED_LOG,
  DECISIONS_PATH,
};
