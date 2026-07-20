/**
 * PHASE_6E Part 9 — Knowledge Drift Detection.
 *
 * Offline comparison / release safeguard. Takes two point-in-time knowledge
 * snapshots (never computed on the live chat request path — see
 * scripts/alpha/phase6eBuildAnalyticsSnapshot.js for the only caller) and
 * reports exactly what changed between them, with a deterministic risk
 * level and a SHA-256 checksum of each full snapshot for tamper-evidence.
 *
 * This module NEVER decides whether a change is *doctrinally correct* — it
 * only detects and classifies *that something changed*, then defers to
 * Admin review for HIGH/CRITICAL risk levels.
 */

const crypto = require('crypto');
const { readApprovedCrossReferences } = require('./iogIcojGovernedIngestion');
const { readSupportGraphCandidates } = require('./supportGraphCandidateQueue');
const { getAllHistoricalRecords } = require('./historicalKnowledgeProvider');
const { buildDoctrineTopicCoverageReport } = require('./knowledgeCoverageAnalyticsEngine');

const RISK_LEVEL = {
  LOW_METADATA_ONLY: 'LOW_METADATA_ONLY',
  MEDIUM_RETRIEVAL_CHANGE: 'MEDIUM_RETRIEVAL_CHANGE',
  HIGH_AUTHORITY_CHANGE: 'HIGH_AUTHORITY_CHANGE',
  CRITICAL_SCRIPTURE_OR_DOCTRINE_CHANGE: 'CRITICAL_SCRIPTURE_OR_DOCTRINE_CHANGE',
};

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function checksum(snapshot) {
  return crypto.createHash('sha256').update(stableStringify(snapshot)).digest('hex');
}

/**
 * Build a full knowledge-state snapshot from the current, live production
 * data sources. Every field is read, never computed/inferred beyond a
 * direct passthrough or count.
 */
function buildKnowledgeSnapshot() {
  const approved = readApprovedCrossReferences();
  const doctrineTopics = buildDoctrineTopicCoverageReport().topics.map((t) => ({
    topicId: t.topicId,
    primaryWitnesses: [...t.primaryWitnesses].sort(),
    supportingWitnesses: [...t.supportingWitnesses].sort(),
    crossReferences: [...t.crossReferences].sort(),
  }));
  const historicalRecords = getAllHistoricalRecords({ productionOnly: false }).map((r) => ({
    id: r.id,
    trustTier: r.trustTier,
    approvalStatus: r.approvalStatus,
    relatedScriptures: r.relatedScriptures || [],
    relatedTopics: r.relatedTopics || [],
  }));
  const allQueue = readSupportGraphCandidates({ limit: 10000 });
  const adminQueueCounts = allQueue.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const snapshot = {
    takenAt: new Date().toISOString(),
    approvedCrossReferences: approved.map((a) => ({ id: a.id, extractedReference: a.extractedReference, proposedTopic: a.proposedTopic })).sort((a, b) => a.id.localeCompare(b.id)),
    doctrineTopics: doctrineTopics.sort((a, b) => a.topicId.localeCompare(b.topicId)),
    historicalRecords: historicalRecords.sort((a, b) => a.id.localeCompare(b.id)),
    adminQueueCounts,
  };
  snapshot.checksum = checksum({ approvedCrossReferences: snapshot.approvedCrossReferences, doctrineTopics: snapshot.doctrineTopics, historicalRecords: snapshot.historicalRecords, adminQueueCounts: snapshot.adminQueueCounts });
  return snapshot;
}

function diffArraysById(beforeArr, afterArr, keyFn) {
  const beforeKeys = new Set(beforeArr.map(keyFn));
  const afterKeys = new Set(afterArr.map(keyFn));
  return {
    added: afterArr.filter((x) => !beforeKeys.has(keyFn(x))),
    removed: beforeArr.filter((x) => !afterKeys.has(keyFn(x))),
  };
}

/**
 * Compare two snapshots produced by buildKnowledgeSnapshot(). Returns the
 * full change record required by the batch, including a deterministic risk
 * level. Admin review is required (approvalRequired: true) for any
 * HIGH/CRITICAL change that is not a deterministic rollback to a
 * previously-approved state (isRollback flag, caller-supplied evidence).
 */
function diffSnapshots({ before, after, changeId = null, actorOrRule = 'unknown', isRollback = false }) {
  const xrefDiff = diffArraysById(before.approvedCrossReferences, after.approvedCrossReferences, (x) => x.id);

  const beforeTopics = new Map(before.doctrineTopics.map((t) => [t.topicId, t]));
  const afterTopics = new Map(after.doctrineTopics.map((t) => [t.topicId, t]));
  const affectedTopics = [];
  const topicChanges = [];
  for (const [topicId, afterTopic] of afterTopics.entries()) {
    const beforeTopic = beforeTopics.get(topicId);
    if (!beforeTopic) {
      affectedTopics.push(topicId);
      topicChanges.push({ topicId, changeType: 'NEW_TOPIC', before: null, after: afterTopic });
      continue;
    }
    const primaryChanged = JSON.stringify(beforeTopic.primaryWitnesses) !== JSON.stringify(afterTopic.primaryWitnesses);
    const supportingChanged = JSON.stringify(beforeTopic.supportingWitnesses) !== JSON.stringify(afterTopic.supportingWitnesses);
    const crossRefChanged = JSON.stringify(beforeTopic.crossReferences) !== JSON.stringify(afterTopic.crossReferences);
    if (primaryChanged || supportingChanged || crossRefChanged) {
      affectedTopics.push(topicId);
      topicChanges.push({
        topicId,
        changeType: primaryChanged ? 'PRIMARY_WITNESS_CHANGED' : supportingChanged ? 'SUPPORTING_WITNESS_CHANGED' : 'CROSS_REFERENCE_CHANGED',
        before: beforeTopic,
        after: afterTopic,
      });
    }
  }
  for (const topicId of beforeTopics.keys()) {
    if (!afterTopics.has(topicId)) {
      affectedTopics.push(topicId);
      topicChanges.push({ topicId, changeType: 'TOPIC_REMOVED', before: beforeTopics.get(topicId), after: null });
    }
  }

  const historicalDiff = diffArraysById(before.historicalRecords, after.historicalRecords, (x) => x.id);

  const adminQueueCountsChanged = JSON.stringify(before.adminQueueCounts) !== JSON.stringify(after.adminQueueCounts);

  const affectedReferences = [
    ...xrefDiff.added.map((x) => x.extractedReference),
    ...xrefDiff.removed.map((x) => x.extractedReference),
  ];

  let riskLevel;
  const hasScriptureOrDoctrineChange = topicChanges.some((c) => c.changeType === 'PRIMARY_WITNESS_CHANGED' || c.changeType === 'TOPIC_REMOVED' || c.changeType === 'NEW_TOPIC');
  const hasSupportingOrXrefChange = topicChanges.some((c) => c.changeType === 'SUPPORTING_WITNESS_CHANGED' || c.changeType === 'CROSS_REFERENCE_CHANGED') || xrefDiff.added.length || xrefDiff.removed.length;

  if (hasScriptureOrDoctrineChange) {
    riskLevel = RISK_LEVEL.CRITICAL_SCRIPTURE_OR_DOCTRINE_CHANGE;
  } else if (hasSupportingOrXrefChange) {
    riskLevel = RISK_LEVEL.HIGH_AUTHORITY_CHANGE;
  } else if (historicalDiff.added.length || historicalDiff.removed.length) {
    riskLevel = RISK_LEVEL.MEDIUM_RETRIEVAL_CHANGE;
  } else if (adminQueueCountsChanged) {
    riskLevel = RISK_LEVEL.LOW_METADATA_ONLY;
  } else {
    riskLevel = RISK_LEVEL.LOW_METADATA_ONLY;
  }

  const approvalRequired =
    (riskLevel === RISK_LEVEL.HIGH_AUTHORITY_CHANGE || riskLevel === RISK_LEVEL.CRITICAL_SCRIPTURE_OR_DOCTRINE_CHANGE) && !isRollback;

  return {
    changeId: changeId || `drift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    actorOrRule,
    affectedTopics: [...new Set(affectedTopics)],
    affectedReferences: [...new Set(affectedReferences)],
    before: { checksum: before.checksum, takenAt: before.takenAt },
    after: { checksum: after.checksum, takenAt: after.takenAt },
    riskLevel,
    testsRequired: riskLevel === RISK_LEVEL.LOW_METADATA_ONLY ? [] : ['scriptureFidelitySmoke', 'phase6ProductionAnswerLineageSmoke', 'phase5sAuthorityEngineSmoke'],
    approvalRequired,
    isRollback,
    detail: {
      approvedCrossReferencesAdded: xrefDiff.added,
      approvedCrossReferencesRemoved: xrefDiff.removed,
      topicChanges,
      historicalRecordsAdded: historicalDiff.added,
      historicalRecordsRemoved: historicalDiff.removed,
      adminQueueCountsBefore: before.adminQueueCounts,
      adminQueueCountsAfter: after.adminQueueCounts,
    },
  };
}

module.exports = {
  RISK_LEVEL,
  checksum,
  buildKnowledgeSnapshot,
  diffSnapshots,
};
