/**
 * UNIFIED_ADMIN_COMMAND_CENTER — Part 5: Prioritized Admin Decision Queue.
 *
 * This is a READ/NORMALIZE/OVERLAY layer over three existing, independent
 * stores. It does not create a second copy of any of them and it does not
 * change their own status vocabularies:
 *
 *   - services/founderIntelligenceRecommendationStore.js
 *     (statuses: PENDING / APPROVED / REJECTED)
 *   - services/supportGraphCandidateQueue.js
 *     (statuses: pending_review / approved / rejected / merged / archived /
 *      awaiting_more_evidence)
 *   - services/lessonScriptureAlignmentAnalyzer.js submissions
 *     (no decision workflow today — flagged here as review candidates when
 *      they contain a misquote or unresolved reference)
 *
 * The richer queue-level status vocabulary requested by this batch (New,
 * Investigating, Ready for Decision, Approved, Rejected, Deferred,
 * Resolved) does not exist in any of the three underlying stores. Rather
 * than invent a fourth persisted copy of "the truth", this module keeps a
 * small overlay index (queue-state only: status/note/assignee/history) and
 * always calls through to the real underlying store for any action that
 * store already supports (approve/reject). Actions with no underlying
 * equivalent (investigate/defer/assign/note/resolve) are recorded ONLY in
 * the overlay + the unified audit trail — they never invent a production
 * mutation.
 */

const fs = require('fs');
const path = require('path');
const { listRecommendations, recordAdminDecision } = require('./founderIntelligenceRecommendationStore');
const { readSupportGraphCandidates, recordCandidateDecision, ADMIN_ACTIONS: REVIEW_QUEUE_ACTIONS } = require('./supportGraphCandidateQueue');
const { readLessonAlignmentSubmissions } = require('./lessonScriptureAlignmentAnalyzer');
const { recordAdminAuditEvent, readAdminAuditTrail } = require('./adminAuditTrail');
// ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — two additional sources,
// following the exact same read/normalize/overlay pattern as the three
// sources above. Neither introduces a second queue/store "of truth" — see
// module header.
const { listPendingEscalations, resolveEscalation } = require('./userAssistanceEscalationStore');
const { buildKnowledgeImprovementReport } = require('./knowledgeImprovementAdvisor');
const { listLearningRecords, transitionLearningRecord } = require('./learningRecordStore');

const OVERLAY_DIR = path.join(__dirname, '..', 'data', 'admin-command-center');
const OVERLAY_PATH = path.join(OVERLAY_DIR, 'decision-queue-overlay.json');

const SEVERITY = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const TYPE = {
  RUNTIME_BUG: 'Runtime Bug',
  SECURITY: 'Security',
  UX: 'User Experience',
  RESPONSE_QUALITY: 'Response Quality',
  SCRIPTURE_COVERAGE: 'Scripture Coverage',
  DOCTRINE_COVERAGE: 'Doctrine Coverage',
  ORIGINAL_LANGUAGE: 'Original Language',
  HISTORICAL_CONTEXT: 'Historical Context',
  LESSON_ALIGNMENT: 'Lesson Alignment',
  EVIDENCE_CANDIDATE: 'Evidence Candidate',
  RELATIONSHIP_LINK: 'Relationship Link',
  FEATURE_REQUEST: 'Feature Request',
  GOVERNANCE_REVIEW: 'Governance Review',
  // ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B
  SUPPORT_ESCALATION: 'Support Escalation',
  KNOWLEDGE_IMPROVEMENT: 'Knowledge Improvement',
  // BIE v1.1 Founder Experience Loop
  FOUNDER_EXPERIENCE: 'Founder Experience',
};
const STATUS = {
  NEW: 'New',
  INVESTIGATING: 'Investigating',
  READY_FOR_DECISION: 'Ready for Decision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DEFERRED: 'Deferred',
  RESOLVED: 'Resolved',
};

const RECOMMENDATION_TYPE_TO_QUEUE_TYPE = {
  KNOWLEDGE_GAP: TYPE.SCRIPTURE_COVERAGE,
  KNOWLEDGE_SATISFIED: TYPE.SCRIPTURE_COVERAGE,
  EVIDENCE_CORRELATION: TYPE.EVIDENCE_CANDIDATE,
  DUPLICATE_EVIDENCE: TYPE.EVIDENCE_CANDIDATE,
  RULE_IMPROVEMENT: TYPE.GOVERNANCE_REVIEW,
  RELATIONSHIP_LINK: TYPE.RELATIONSHIP_LINK,
  CROSS_REFERENCE: TYPE.RELATIONSHIP_LINK,
  ORIGINAL_LANGUAGE_EXPANSION: TYPE.ORIGINAL_LANGUAGE,
  HISTORICAL_RESEARCH: TYPE.HISTORICAL_CONTEXT,
  SCRIPTURE_PACK: TYPE.SCRIPTURE_COVERAGE,
  TEST_CASE: TYPE.GOVERNANCE_REVIEW,
};

function ensureOverlayDir() {
  if (!fs.existsSync(OVERLAY_DIR)) fs.mkdirSync(OVERLAY_DIR, { recursive: true });
}

function loadOverlay() {
  try {
    if (!fs.existsSync(OVERLAY_PATH)) return {};
    return JSON.parse(fs.readFileSync(OVERLAY_PATH, 'utf8')) || {};
  } catch (e) {
    console.warn('[adminDecisionQueue] overlay read failed, starting fresh:', e.message);
    return {};
  }
}

function saveOverlay(overlay) {
  try {
    ensureOverlayDir();
    fs.writeFileSync(OVERLAY_PATH, JSON.stringify(overlay, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.warn('[adminDecisionQueue] overlay write failed:', e.message);
    return false;
  }
}

function priorityToSeverity(priority, confidence) {
  const p = String(priority || confidence || 'LOW').toUpperCase();
  if (p === 'HIGH') return SEVERITY.HIGH;
  if (p === 'MEDIUM') return SEVERITY.MEDIUM;
  return SEVERITY.LOW;
}

function baseNativeStatusToQueueStatus(nativeStatus) {
  const s = String(nativeStatus || '').toUpperCase();
  if (s === 'APPROVED' || s === 'APPROVE') return STATUS.APPROVED;
  if (s === 'REJECTED' || s === 'REJECT') return STATUS.REJECTED;
  if (s === 'PENDING_REVIEW' || s === 'PENDING') return STATUS.NEW;
  if (s === 'AWAITING_MORE_EVIDENCE') return STATUS.INVESTIGATING;
  if (s === 'MERGED' || s === 'ARCHIVED') return STATUS.RESOLVED;
  return STATUS.NEW;
}

/**
 * Build the normalized, merged queue. Bounded by `limit` per source
 * (Part 14 scalability — never an unbounded scan of every historical
 * item on every request).
 */
function buildDecisionQueueItems({ perSourceLimit = 200 } = {}) {
  const overlay = loadOverlay();
  const items = [];

  // --- Source 1: Founder Intelligence recommendations ---
  try {
    const recs = listRecommendations({ limit: perSourceLimit });
    for (const rec of recs) {
      const latest = rec.latest || {};
      const id = `founder-intelligence:${rec.id}`;
      const ov = overlay[id] || {};
      items.push({
        id,
        sourceSystem: 'founder-intelligence',
        nativeId: rec.id,
        title: latest.title || 'Founder Intelligence recommendation',
        summary: latest.reasoning || (latest.supportingEvidence || [])[0] || latest.title || '',
        category: RECOMMENDATION_TYPE_TO_QUEUE_TYPE[latest.type] || TYPE.GOVERNANCE_REVIEW,
        severity: priorityToSeverity(latest.priority, latest.confidence),
        confidence: latest.confidence || null,
        supportingEvidence: latest.supportingEvidence || [],
        affectedCount: latest.sourceSessions || null,
        currentProductionCoverage: latest.existingProductionCoverage || null,
        proposedAction: latest.suggestedAction || null,
        potentialImpact: latest.reasoning || null,
        requiredApproval: latest.requiredApproval !== false,
        createdAt: rec.firstSeenAt,
        lastUpdatedAt: ov.updatedAt || rec.lastSeenAt,
        timesSeen: rec.timesSeen || 1,
        status: ov.status || baseNativeStatusToQueueStatus(rec.status),
        note: ov.note || null,
        drillDownTarget: '#intelligence',
      });
    }
  } catch (e) {
    console.warn('[adminDecisionQueue] founder-intelligence source failed:', e.message);
  }

  // --- Source 2: Review Queue (support graph candidates) ---
  try {
    const candidates = readSupportGraphCandidates({ limit: perSourceLimit });
    for (const c of candidates) {
      const id = `review-queue:${c.id}`;
      const ov = overlay[id] || {};
      items.push({
        id,
        sourceSystem: 'review-queue',
        nativeId: c.id,
        title: `Evidence candidate: ${c.proposedTopic || c.topic || c.extractedReference || 'untitled'}`,
        summary: c.proposedClaim || c.reason || '',
        category: TYPE.EVIDENCE_CANDIDATE,
        severity: priorityToSeverity(null, c.confidence),
        confidence: c.confidence || null,
        supportingEvidence: c.scriptures || [],
        affectedCount: null,
        currentProductionCoverage: c.productionStatus || null,
        proposedAction: c.rulesDecision ? `Rules engine: ${c.rulesDecision}` : 'Manual admin review required',
        potentialImpact: c.reason || null,
        requiredApproval: c.adminReviewRequired !== false,
        createdAt: c.createdAt,
        lastUpdatedAt: ov.updatedAt || (c.decision ? c.decision.decidedAt : c.createdAt),
        status: ov.status || baseNativeStatusToQueueStatus(c.status),
        note: ov.note || (c.decision ? c.decision.note : null),
        drillDownTarget: '#scripture-review',
      });
    }
  } catch (e) {
    console.warn('[adminDecisionQueue] review-queue source failed:', e.message);
  }

  // --- Source 3: Lesson Alignment submissions needing review ---
  try {
    const submissions = readLessonAlignmentSubmissions({ limit: Math.min(perSourceLimit, 100) });
    for (const [idx, sub] of submissions.entries()) {
      const summary = sub.summary || {};
      const needsReview = (summary.misquotes || 0) > 0 || (summary.unresolvedReferences || 0) > 0;
      if (!needsReview) continue;
      const nativeId = `${sub.at}:${idx}`;
      const id = `lesson-alignment:${nativeId}`;
      const ov = overlay[id] || {};
      items.push({
        id,
        sourceSystem: 'lesson-alignment',
        nativeId,
        title: `Lesson alignment concern: ${sub.sourceLabel || 'submitted lesson'}`,
        summary: `${summary.misquotes || 0} possible misquote(s), ${summary.unresolvedReferences || 0} unresolved reference(s).`,
        category: TYPE.LESSON_ALIGNMENT,
        severity: (summary.misquotes || 0) > 0 ? SEVERITY.MEDIUM : SEVERITY.LOW,
        confidence: null,
        supportingEvidence: (sub.claims || []).slice(0, 5).map((c) => `${c.reference}: ${c.claimType}`),
        affectedCount: 1,
        currentProductionCoverage: null,
        proposedAction: 'Review flagged claims; correct or confirm before reuse.',
        potentialImpact: 'A Founder/Admin lesson submission may misstate Scripture text or cite an unresolved reference.',
        requiredApproval: true,
        createdAt: sub.at,
        lastUpdatedAt: ov.updatedAt || sub.at,
        status: ov.status || STATUS.NEW,
        note: ov.note || null,
        drillDownTarget: '#founder',
      });
    }
  } catch (e) {
    console.warn('[adminDecisionQueue] lesson-alignment source failed:', e.message);
  }

  // --- Source 4: User Assistance (AI-2) escalations needing review ---
  try {
    const escalations = listPendingEscalations({ limit: Math.min(perSourceLimit, 200) });
    for (const esc of escalations) {
      const id = `user-assistance:${esc.id}`;
      const ov = overlay[id] || {};
      items.push({
        id,
        sourceSystem: 'user-assistance',
        nativeId: esc.id,
        title: `User Assistance escalation: "${esc.question}"`,
        summary: esc.reason || 'AI-2 could not answer this question confidently from the Help Center.',
        category: TYPE.SUPPORT_ESCALATION,
        severity: SEVERITY.LOW,
        confidence: esc.confidence || 'LOW',
        supportingEvidence: esc.bestGuessArticleId ? [`Best-guess article: ${esc.bestGuessArticleId}`] : [],
        affectedCount: 1,
        currentProductionCoverage: esc.bestGuessArticleId || null,
        proposedAction: 'Reply to the user and optionally author/update a Help Center article.',
        potentialImpact: 'A user did not receive an answer to an app-support question.',
        requiredApproval: true,
        createdAt: esc.createdAt,
        lastUpdatedAt: ov.updatedAt || esc.createdAt,
        status: ov.status || STATUS.NEW,
        note: ov.note || null,
        drillDownTarget: '#command-center',
      });
    }
  } catch (e) {
    console.warn('[adminDecisionQueue] user-assistance source failed:', e.message);
  }

  // --- Source 5b: BIE v1.1 Founder Experience learning records ---
  try {
    const records = listLearningRecords({ limit: Math.min(perSourceLimit, 200) });
    for (const rec of records) {
      if (['APPROVED', 'REJECTED', 'RETIRED', 'SUPERSEDED'].includes(rec.adminStatus)) continue;
      const id = `founder-experience:${rec.learningRecordId}`;
      const ov = overlay[id] || {};
      items.push({
        id,
        sourceSystem: 'founder-experience',
        nativeId: rec.learningRecordId,
        title: `Founder Experience: ${rec.behaviorFamily || 'learning candidate'}`,
        summary: rec.expectedBehavior || rec.failureOrSuccessPattern || 'Governed learning candidate',
        category: TYPE.FOUNDER_EXPERIENCE,
        severity: rec.confidence === 'high' ? SEVERITY.MEDIUM : SEVERITY.LOW,
        confidence: rec.confidence || null,
        supportingEvidence: (rec.evidence || []).slice(0, 5).map((e) => (typeof e === 'string' ? e : JSON.stringify(e))),
        affectedCount: rec.recurrenceCount || 1,
        currentProductionCoverage: rec.affectedOwner || null,
        proposedAction: rec.candidateRepair || 'Review learning candidate; do not auto-implement.',
        potentialImpact: 'Improves future governed behavior only after Admin approval + implementation + validation.',
        requiredApproval: true,
        createdAt: rec.createdAt,
        lastUpdatedAt: ov.updatedAt || rec.updatedAt || rec.createdAt,
        status: ov.status || STATUS.READY_FOR_DECISION,
        note: ov.note || null,
        drillDownTarget: '#command-center',
        autoPublishProhibited: true,
        mutationProhibited: true,
      });
    }
  } catch (e) {
    console.warn('[adminDecisionQueue] founder-experience source failed:', e.message);
  }

  // --- Source 5: Knowledge Improvement AI (AI-4) recommendations ---
  try {
    const report = buildKnowledgeImprovementReport();
    for (const rec of report.recommendations.slice(0, perSourceLimit)) {
      const id = `knowledge-improvement:${rec.id}`;
      const ov = overlay[id] || {};
      items.push({
        id,
        sourceSystem: 'knowledge-improvement',
        nativeId: rec.id,
        title: rec.title,
        summary: rec.suggestedAction,
        category: TYPE.KNOWLEDGE_IMPROVEMENT,
        severity: rec.confidence === 'HIGH' ? SEVERITY.MEDIUM : SEVERITY.LOW,
        confidence: rec.confidence,
        supportingEvidence: (rec.evidence || []).slice(0, 5).map((e) => (typeof e === 'string' ? e : JSON.stringify(e))),
        affectedCount: rec.occurrenceCount || null,
        currentProductionCoverage: null,
        proposedAction: rec.suggestedAction,
        potentialImpact: `${rec.type.replace(/_/g, ' ')} — recommendation only, never auto-applied.`,
        requiredApproval: true,
        createdAt: rec.generatedAt,
        lastUpdatedAt: ov.updatedAt || rec.generatedAt,
        status: ov.status || STATUS.NEW,
        note: ov.note || null,
        drillDownTarget: '#command-center',
      });
    }
  } catch (e) {
    console.warn('[adminDecisionQueue] knowledge-improvement source failed:', e.message);
  }

  return items;
}

const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function listDecisionQueue({
  severity = null,
  category = null,
  status = null,
  sourceSystem = null,
  limit = 50,
  offset = 0,
} = {}) {
  let items = buildDecisionQueueItems();

  if (severity) items = items.filter((i) => i.severity === severity);
  if (category) items = items.filter((i) => i.category === category);
  if (status) items = items.filter((i) => i.status === status);
  if (sourceSystem) items = items.filter((i) => i.sourceSystem === sourceSystem);

  items.sort((a, b) => {
    const rankDiff = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.lastUpdatedAt || 0) - new Date(a.lastUpdatedAt || 0);
  });

  const boundedLimit = Math.min(Number(limit) || 50, 200);
  const total = items.length;
  const page = items.slice(offset, offset + boundedLimit);

  return {
    ok: true,
    total,
    offset,
    limit: boundedLimit,
    counts: {
      bySeverity: items.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; }, {}),
      byStatus: items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {}),
      byCategory: items.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {}),
    },
    items: page,
  };
}

const VALID_ACTIONS = new Set(['review', 'approve', 'reject', 'defer', 'assign', 'investigate', 'resolve', 'note']);

/**
 * Apply an Admin action to one queue item. Delegates to the real
 * underlying store for approve/reject when that store supports it;
 * otherwise records the action only in the overlay + unified audit trail.
 * Never triggers any production knowledge mutation itself.
 */
function applyDecisionQueueAction({ id, action, note = '', decidedBy = 'admin' } = {}) {
  if (!id || !VALID_ACTIONS.has(action)) {
    return { ok: false, error: `Unknown or missing action. Expected one of: ${[...VALID_ACTIONS].join(', ')}` };
  }
  const [sourceSystem, ...rest] = String(id).split(':');
  const nativeId = rest.join(':');
  if (!sourceSystem || !nativeId) return { ok: false, error: 'Malformed queue item id.' };

  const overlay = loadOverlay();
  const previous = overlay[id] || null;
  let underlyingResult = null;
  let newStatus;

  try {
    if (action === 'approve' || action === 'reject') {
      if (sourceSystem === 'founder-intelligence') {
        underlyingResult = recordAdminDecision({
          id: nativeId,
          decision: action === 'approve' ? 'APPROVED' : 'REJECTED',
          decidedBy,
          note,
        });
        if (!underlyingResult.ok) return underlyingResult;
      } else if (sourceSystem === 'review-queue') {
        const reviewAction = action === 'approve' ? 'approve' : 'reject';
        if (!REVIEW_QUEUE_ACTIONS.has(reviewAction)) {
          return { ok: false, error: `Review queue does not support action "${reviewAction}".` };
        }
        underlyingResult = recordCandidateDecision({ candidateId: nativeId, action: reviewAction, decidedBy, note });
      } else if (sourceSystem === 'user-assistance') {
        // "Approve" == resolve (reply sent); "reject" == dismiss (no reply warranted).
        underlyingResult = resolveEscalation({ id: nativeId, reply: note, resolvedBy: decidedBy, action: action === 'approve' ? 'resolve' : 'dismiss' });
        if (!underlyingResult.ok) return underlyingResult;
      } else if (sourceSystem === 'founder-experience') {
        // Approval records intent only — never auto-implements or activates evidence.
        underlyingResult = transitionLearningRecord(
          nativeId,
          action === 'approve' ? 'APPROVED' : 'REJECTED',
          { actor: decidedBy, note },
        );
        if (!underlyingResult.ok) return underlyingResult;
        underlyingResult.productionMutation = false;
        underlyingResult.evidenceActivated = false;
      }
      // lesson-alignment and knowledge-improvement have no underlying
      // approve/reject workflow (the former has no decision object; the
      // latter is recompute-only and never auto-applies) — overlay only.
      newStatus = action === 'approve' ? STATUS.APPROVED : STATUS.REJECTED;
    } else if (action === 'resolve' && sourceSystem === 'user-assistance') {
      underlyingResult = resolveEscalation({ id: nativeId, reply: note, resolvedBy: decidedBy, action: 'resolve' });
      if (!underlyingResult.ok) return underlyingResult;
      newStatus = STATUS.RESOLVED;
    } else if (action === 'defer') {
      if (sourceSystem === 'founder-experience') {
        transitionLearningRecord(nativeId, 'DEFERRED', { actor: decidedBy, note });
      }
      newStatus = STATUS.DEFERRED;
    } else if (action === 'investigate') {
      newStatus = STATUS.INVESTIGATING;
    } else if (action === 'resolve') {
      newStatus = STATUS.RESOLVED;
    } else if (action === 'review') {
      newStatus = STATUS.READY_FOR_DECISION;
    } else if (action === 'assign' || action === 'note') {
      newStatus = (previous && previous.status) || STATUS.NEW; // status unchanged
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const updated = {
    status: newStatus,
    note: note || (previous && previous.note) || null,
    decidedBy,
    updatedAt: new Date().toISOString(),
    history: [...((previous && previous.history) || []), { action, note, decidedBy, at: new Date().toISOString() }],
  };
  overlay[id] = updated;
  saveOverlay(overlay);

  const auditRecord = recordAdminAuditEvent({
    action: `DECISION_QUEUE_${action.toUpperCase()}`,
    actionType: action.toUpperCase(),
    target: id,
    sourceSystem,
    category: 'DECISION_QUEUE',
    status: 'COMPLETED',
    previousState: previous ? { status: previous.status } : null,
    resultingState: { status: newStatus },
    approvalReasonOrNote: note || null,
    actorId: decidedBy,
  });

  return { ok: true, id, status: newStatus, underlyingResult, auditRecord };
}

function getDecisionQueueItemAuditHistory(id, { limit = 50 } = {}) {
  return readAdminAuditTrail({ limit, action: null }).entries.filter((e) => e.target === id);
}

module.exports = {
  SEVERITY,
  TYPE,
  STATUS,
  listDecisionQueue,
  applyDecisionQueueAction,
  getDecisionQueueItemAuditHistory,
};
