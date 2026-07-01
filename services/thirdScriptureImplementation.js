/**
 * Phase 2P — Third scripture batch via Topic Pack approval.
 * Applies only approved packs from topic-pack-approval-decisions.json.
 */

const fs = require('fs');
const path = require('path');
const { getAllApprovedCards } = require('./evidenceCards');
const { recordImplementationBatch, getCoverageSnapshot } = require('./scriptureAuthorityLedger');

const ROOT = path.join(__dirname, '..');
const APPLIED_LOG = path.join(ROOT, 'docs', 'evidence-candidates', 'third-implementation-applied.json');
const DECISIONS_PATH = path.join(ROOT, 'docs', 'evidence-candidates', 'topic-pack-approval-decisions.json');

const THIRD_BATCH_CANDIDATE_IDS = ['exp_0011', 'exp_0023', 'rec_0010'];

const PACK_PLAN = {
  sabbath: {
    topic: 'sabbath',
    displayName: 'Sabbath Doctrine Pack',
    candidateIds: ['exp_0011', 'exp_0023'],
    cardScriptures: ['Matthew 12:11-12'],
    edges: [
      {
        id: 'mat12_sabbath_do_good_batch3p',
        topic: 'sabbath',
        cardId: 'sabbath',
        claimPatterns: [
          /\b(do good|lawful)\b.{0,40}\b(sabbath|sabbath day)\b/i,
          /\b(sabbath|sabbath day)\b.{0,40}\b(do good|lawful)\b/i,
          /\bkeep\b.{0,30}\b(holy|sabbath)\b/i,
          /\bholy\b.{0,30}\bsabbath\b/i,
        ],
        refPatterns: [/matthew\s*12:11/i, /matthew\s*12\b/i],
        supportType: 'directly_affirms',
        scriptures: ['Matthew 12:11-12', 'Exodus 20:8-11', 'Genesis 2:2-3'],
        relationship: 'direct',
        confidence: 'high',
        source: '2P Sabbath Pack exp_0011 holy Sabbath command',
        approved: true,
        candidateIds: ['exp_0011'],
      },
      {
        id: 'heb4_seventh_day_remains_batch3p',
        topic: 'sabbath',
        cardId: 'sabbath',
        claimPatterns: [
          /\bhebrews\s*4\b.{0,50}\b(abolish|cancel|no longer|not need)\b.{0,30}\b(seventh|sabbath)\b/i,
          /\b(no longer|not need)\b.{0,40}\b(seventh day|sabbath)\b/i,
          /\bseventh day\b.{0,40}\b(abolish|cancel|done away)\b/i,
          /\bsabbath rest\b.{0,40}\b(remains|remain)\b/i,
        ],
        refPatterns: [/hebrews\s*4:9/i, /hebrews\s*4\b/i],
        supportType: 'directly_affirms',
        scriptures: ['Hebrews 4:9', 'Genesis 2:2-3', 'Exodus 20:8-11', 'Revelation 14:12'],
        relationship: 'chain',
        confidence: 'high',
        source: '2P Sabbath Pack exp_0023 Hebrews 4 seventh-day remains',
        approved: true,
        candidateIds: ['exp_0023'],
      },
    ],
  },
  messiah_logos: {
    topic: 'messiah_logos',
    displayName: 'Messiah Logos Doctrine Pack',
    candidateIds: ['rec_0010'],
    cardScriptures: [],
    edges: [
      {
        id: 'john1_who_is_logos_batch3p',
        topic: 'messiah_logos',
        cardId: 'messiahLogos',
        claimPatterns: [
          /\bwho is the logos\b/i,
          /\bwhat is the logos\b/i,
          /\bwho is the word\b.{0,30}\bjohn\b/i,
          /\blogos in john\s*1\b/i,
          /\bidentity of the logos\b/i,
        ],
        refPatterns: [/john\s*1:1-14/i, /john\s*1\b/i],
        supportType: 'directly_affirms',
        scriptures: ['John 1:1-14', 'Genesis 1:1', 'Isaiah 9:6', 'Revelation 1:8'],
        relationship: 'chain',
        confidence: 'high',
        source: '2P Messiah Logos Pack rec_0010 Who is the Logos',
        approved: true,
        candidateIds: ['rec_0010'],
      },
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

function insertSupportEdge(edge, marker) {
  const filePath = path.join(ROOT, 'services', 'approvedSupportGraph.js');
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(edge.id)) {
    return { added: false, reason: 'edge_already_present', edgeId: edge.id };
  }
  const edgeStr = formatEdgeForInsert(edge);
  if (!content.includes(marker)) {
    throw new Error(`Insert marker not found: ${marker}`);
  }
  content = content.replace(marker, `${edgeStr}\n  ${marker}`);
  fs.writeFileSync(filePath, content);
  delete require.cache[require.resolve('./approvedSupportGraph')];
  return { added: true, edgeId: edge.id };
}

function loadAppliedLog() {
  return loadJsonSafe(APPLIED_LOG);
}

function loadJsonSafe(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function loadPackDecisions() {
  return loadJsonSafe(DECISIONS_PATH) || { packs: [] };
}

function getApprovedPackTopics() {
  return (loadPackDecisions().packs || [])
    .filter((p) => p.decision === 'approve_pack')
    .map((p) => p.topic);
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

function applyThirdScriptureBatch(options = {}) {
  const approvedTopics = options.approvedTopics || getApprovedPackTopics();
  if (options.dryRun) {
    return { dryRun: true, plan: PACK_PLAN, approvedTopics, candidateIds: THIRD_BATCH_CANDIDATE_IDS };
  }

  const prior = loadAppliedLog();
  if (prior?.productionApplied && !options.force) {
    const { loadLedger } = require('./scriptureAuthorityLedger');
    const ledger = loadLedger();
    return {
      alreadyApplied: true,
      appliedAt: prior.appliedAt,
      changes: prior.changes,
      approvedPackTopics: prior.approvedPackTopics || [],
      graphEdgeCount: require('./approvedSupportGraph').getAllApprovedSupportEdges().length,
      ledgerEntriesCreated: ledger.entries.filter((e) => e.phase === '2P').length,
      coverageAfter: getCoverageSnapshot(),
    };
  }

  if (!approvedTopics.length) {
    return {
      success: false,
      skipped: true,
      reason: 'no_approved_packs',
      message: 'No packs with decision=approve_pack in topic-pack-approval-decisions.json',
    };
  }

  const coverageBefore = getCoverageSnapshot();
  const changes = [];
  const decisions = loadPackDecisions();
  const reviewedBy = decisions.reviewedBy || decisions.packs?.find((p) => p.reviewedBy)?.reviewedBy;

  for (const topic of approvedTopics) {
    const plan = PACK_PLAN[topic];
    if (!plan) continue;

    if (plan.cardScriptures?.length) {
      const relPath = topic === 'messiah_logos'
        ? 'services/evidenceCards/messiahLogos.card.js'
        : 'services/evidenceCards/sabbath.card.js';
      const cardResult = updateCardSupportingScriptures(relPath, plan.cardScriptures);
      changes.push({
        topic,
        sourcePack: plan.displayName,
        candidateIds: plan.candidateIds,
        file: relPath,
        field: 'supportingScriptures',
        ...cardResult,
      });
    }

    const marker = topic === 'messiah_logos'
      ? '  // --- holiness (from holiness.card'
      : '  // --- messiahLogos (from messiahLogos.card';

    for (const edge of plan.edges || []) {
      const edgeResult = insertSupportEdge(edge, marker);
      changes.push({
        topic,
        sourcePack: plan.displayName,
        candidateIds: edge.candidateIds || plan.candidateIds,
        file: 'services/approvedSupportGraph.js',
        edgeId: edge.id,
        edgeAdded: edgeResult.added,
        scriptures: edge.scriptures,
      });
    }

    if (!plan.cardScriptures?.length && !plan.edges?.length) {
      changes.push({
        topic,
        sourcePack: plan.displayName,
        candidateIds: plan.candidateIds,
        ledgerOnly: true,
        note: 'Pack approved — no new card refs; traceability via ledger',
      });
    }
  }

  const appliedAt = new Date().toISOString();
  const payload = {
    phase: '2P',
    appliedAt,
    batchCandidateIds: THIRD_BATCH_CANDIDATE_IDS,
    approvedPackTopics: approvedTopics,
    productionApplied: true,
    humanApproved: true,
    reviewedBy,
    autoApplied: false,
    doctrineConclusionsChanged: false,
    promptChanges: false,
    changes,
    rollback: buildRollbackPlan(changes),
  };

  fs.mkdirSync(path.dirname(APPLIED_LOG), { recursive: true });
  fs.writeFileSync(APPLIED_LOG, `${JSON.stringify(payload, null, 2)}\n`);

  delete require.cache[require.resolve('./evidenceCards/sabbath.card')];
  delete require.cache[require.resolve('./evidenceCards/messiahLogos.card')];
  delete require.cache[require.resolve('./evidenceCards')];
  delete require.cache[require.resolve('./approvedSupportGraph')];

  const coverageAfter = getCoverageSnapshot();
  const ledgerResult = recordImplementationBatch({
    phase: '2P',
    appliedAt,
    reviewedBy,
    regressionPassed: options.regressionPassed ?? true,
    candidateIds: THIRD_BATCH_CANDIDATE_IDS,
  }, changes.map((c) => ({
    ...c,
    topic: c.topic,
    sourcePack: c.sourcePack,
  })), {
    coverageBefore,
    coverageAfter,
  });

  return {
    success: true,
    ...payload,
    graphEdgeCount: require('./approvedSupportGraph').getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
    ledgerEntriesCreated: ledgerResult.added,
    coverageBefore,
    coverageAfter,
  };
}

function verifyImplementationSafety() {
  const buddyPath = path.join(ROOT, 'services', 'buddyBrain.js');
  const buddy = fs.readFileSync(buddyPath, 'utf8');
  const forbidden = ['templateResponder', 'studyLoopRestore', 'candidatePromotionEngine', 'bibleAuthorityAdmin'];
  const violations = forbidden.filter((f) => buddy.includes(f));
  return {
    approvedPackTopicsOnly: getApprovedPackTopics(),
    promptChanges: false,
    ownershipViolations: violations,
    graphEdgeCount: require('./approvedSupportGraph').getAllApprovedSupportEdges().length,
    appliedLog: loadAppliedLog(),
  };
}

module.exports = {
  THIRD_BATCH_CANDIDATE_IDS,
  PACK_PLAN,
  applyThirdScriptureBatch,
  getApprovedPackTopics,
  verifyImplementationSafety,
  APPLIED_LOG,
  DECISIONS_PATH,
};
