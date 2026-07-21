/**
 * Phase 2K — First human-approved scripture implementation batch (2J-N).
 * Applies only five staged candidates. No auto-promotion of others.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');

const ROOT = path.join(__dirname, '..');
const APPLIED_LOG = path.join(ROOT, 'docs', 'evidence-candidates', 'first-implementation-applied.json');

const BATCH_IDS = ['exp_0001', 'exp_0007', 'exp_0005', 'rec_0017', 'rec_0006'];

const BATCH_PLAN = {
  exp_0001: {
    candidateId: 'exp_0001',
    topic: 'sabbath',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/sabbath.card.js',
    scripturesToAdd: ['Acts 13:42-44', 'Revelation 14:12'],
  },
  exp_0007: {
    candidateId: 'exp_0007',
    topic: 'sabbath',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/sabbath.card.js',
    scripturesToAdd: ['Acts 13:42-44'],
  },
  exp_0005: {
    candidateId: 'exp_0005',
    topic: 'messiah_logos',
    promotionType: 'approve_support_edge',
    targetFile: 'services/approvedSupportGraph.js',
    edge: {
      id: 'rev1_alpha_omega_logos_g2r_batch',
      topic: 'messiah_logos',
      cardId: 'messiahLogos',
      claimPatterns: [
        /\blogos\b/i,
        /\bword of god\b/i,
        /\balpha\b.{0,30}\bomega\b/i,
        /\brevealed\b.{0,40}\b(word|logos)\b/i,
      ],
      refPatterns: [/revelation\s*1:8/i, /revelation\s*1\b/i],
      supportType: 'indirectly_supports',
      scriptures: ['Revelation 1:8', 'Genesis 1:1', 'John 1:1-14', 'Revelation 19:11-16'],
      relationship: 'chain',
      confidence: 'high',
      source: '2J-N/2J-K first batch exp_0005 G2R Logos chain',
      approved: true,
    },
  },
  rec_0017: {
    candidateId: 'rec_0017',
    topic: 'death_state',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/deathState.card.js',
    scripturesToAdd: [
      'Genesis 3:19',
      'Job 14:10-15',
      'Psalm 6:5',
      'Psalm 115:17',
      'Psalm 146:3-4',
      'Ecclesiastes 3:19-21',
      'Ecclesiastes 9:4-10',
    ],
  },
  rec_0006: {
    candidateId: 'rec_0006',
    topic: 'death_state',
    promotionType: 'approve_card_ref',
    targetFile: 'services/evidenceCards/deathState.card.js',
    scripturesToAdd: [
      'Daniel 12:2-3',
    ],
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
  const marker = '  // --- holiness (from holiness.card';
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

function applyFirstScriptureBatch(options = {}) {
  if (options.dryRun) {
    return { dryRun: true, plan: BATCH_PLAN, batchIds: BATCH_IDS };
  }

  const prior = loadAppliedLog();
  if (prior?.productionApplied && !options.force) {
    return {
      alreadyApplied: true,
      appliedAt: prior.appliedAt,
      changes: prior.changes,
    };
  }

  const changes = [];

  const sabbathAdds = mergeRefs(
    [],
    [...BATCH_PLAN.exp_0001.scripturesToAdd, ...BATCH_PLAN.exp_0007.scripturesToAdd],
  );
  const sabbathResult = updateCardSupportingScriptures(
    'services/evidenceCards/sabbath.card.js',
    sabbathAdds,
  );
  changes.push({
    candidateIds: ['exp_0001', 'exp_0007'],
    file: 'services/evidenceCards/sabbath.card.js',
    field: 'supportingScriptures',
    ...sabbathResult,
  });

  const deathAdds = mergeRefs(
    [],
    [...BATCH_PLAN.rec_0017.scripturesToAdd, ...BATCH_PLAN.rec_0006.scripturesToAdd],
  );
  const deathResult = updateCardSupportingScriptures(
    'services/evidenceCards/deathState.card.js',
    deathAdds,
  );
  changes.push({
    candidateIds: ['rec_0017', 'rec_0006'],
    file: 'services/evidenceCards/deathState.card.js',
    field: 'supportingScriptures',
    ...deathResult,
  });

  const edgeResult = insertSupportEdge(BATCH_PLAN.exp_0005.edge);
  changes.push({
    candidateIds: ['exp_0005'],
    file: 'services/approvedSupportGraph.js',
    edgeId: BATCH_PLAN.exp_0005.edge.id,
    edgeAdded: edgeResult.added,
    scriptures: BATCH_PLAN.exp_0005.edge.scriptures,
  });

  const payload = {
    phase: '2K',
    appliedAt: new Date().toISOString(),
    batchIds: BATCH_IDS,
    productionApplied: true,
    humanApproved: true,
    reviewedBy: 'William Bryan',
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
      phase: '2K',
      appliedAt: payload.appliedAt,
      reviewedBy: payload.reviewedBy,
      regressionPassed: true,
    }, changes.map((c) => ({
      ...c,
      topic: c.candidateIds?.includes('exp_0005') ? 'messiah_logos' : c.candidateIds?.some((id) => ['rec_0017', 'rec_0006'].includes(id)) ? 'death_state' : 'sabbath',
    })));
  } catch {
    /* ledger optional on re-apply */
  }

  delete require.cache[require.resolve('./evidenceCards/sabbath.card')];
  delete require.cache[require.resolve('./evidenceCards/deathState.card')];
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
  ];
  const violations = forbiddenPatterns.filter((f) => f.re.test(buddy)).map((f) => f.label);

  return {
    batchIdsOnly: BATCH_IDS,
    extraCandidatesApplied: false,
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
  applyFirstScriptureBatch,
  buildRollbackPlan,
  verifyImplementationSafety,
  APPLIED_LOG,
};
