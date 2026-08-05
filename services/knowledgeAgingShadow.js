/**
 * BIE v1.3 — Knowledge maturity aging (SHADOW only).
 * Prioritizes review. Never silently rewrites Scripture, doctrine, or production.
 */

const { listLearningRecords } = require('./learningRecordStore');

const SCRIPTURE_DOES_NOT_DECAY = true;
const DOCTRINE_CONTRACTS_NO_AUTO_DECAY = true;

function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)));
}

function ageLearningRecord(rec = {}) {
  const ageDays = daysSince(rec.updatedAt || rec.createdAt);
  const verificationCount = Number(rec.verificationCount || 0);
  const successCount = Number(rec.successCount || (rec.adminStatus === 'APPROVED' ? 1 : 0));
  const failureCount = Number(
    rec.failureCount || (rec.adminStatus === 'REJECTED' || /WRONG|REJECT/i.test(String(rec.founderMark || '')) ? 1 : 0),
  );
  let reviewDue = false;
  let confidenceBasis = rec.confidence || 'medium';
  let shadowConfidence = confidenceBasis;

  // Product-behavior learnings may age with release change; Scripture/doctrine do not.
  const isScriptureOrDoctrine =
    /scripture|doctrine|kjv/i.test(String(rec.governanceClassification || '')) ||
    /scripture|doctrine/i.test(String(rec.behaviorFamily || ''));

  if (isScriptureOrDoctrine) {
    shadowConfidence = confidenceBasis;
    reviewDue = false;
  } else if (rec.adminStatus === 'REJECTED') {
    shadowConfidence = 'rejected_frozen';
    reviewDue = false;
  } else if (ageDays != null && ageDays > 30 && verificationCount === 0) {
    shadowConfidence = 'needs_reverify';
    reviewDue = true;
  }

  return {
    learningRecordId: rec.learningRecordId,
    behaviorFamily: rec.behaviorFamily,
    confidence: confidenceBasis,
    confidenceBasis,
    lastVerified: rec.lastVerified || null,
    verificationCount,
    successCount,
    failureCount,
    evidenceAgeDays: ageDays,
    lastProductionUse: rec.updatedAt || rec.createdAt || null,
    supersededBy: rec.supersededBy || null,
    activeStatus: rec.adminStatus || null,
    reviewDue,
    expirationPolicy: isScriptureOrDoctrine ? 'NONE_SCRIPTURE_OR_DOCTRINE' : 'REVIEW_AFTER_30D_UNVERIFIED',
    retirementCondition: rec.adminStatus === 'RETIRED' ? 'already_retired' : 'human_only',
    shadowOnly: true,
    autonomousProductionDecision: false,
    scriptureDecays: false,
    doctrineContractsAutoDecay: false,
  };
}

function runKnowledgeAgingPass({ limit = 200 } = {}) {
  const records = listLearningRecords({ limit });
  const aged = records.map(ageLearningRecord);
  return {
    ok: true,
    mode: 'SHADOW',
    productionMutation: false,
    scriptureDoesNotDecay: SCRIPTURE_DOES_NOT_DECAY,
    doctrineContractsNoAutoDecay: DOCTRINE_CONTRACTS_NO_AUTO_DECAY,
    recordCount: aged.length,
    reviewDueCount: aged.filter((a) => a.reviewDue).length,
    rejectedFrozen: aged.filter((a) => a.shadowConfidence === 'rejected_frozen' || a.activeStatus === 'REJECTED')
      .length,
    items: aged,
  };
}

module.exports = {
  ageLearningRecord,
  runKnowledgeAgingPass,
  SCRIPTURE_DOES_NOT_DECAY,
  DOCTRINE_CONTRACTS_NO_AUTO_DECAY,
};
