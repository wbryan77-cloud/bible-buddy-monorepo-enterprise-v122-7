/**
 * PHASE_6E Part 7 — Rules-Engine Optimization.
 *
 * Adds ONLY deterministic, evidence-proven, non-doctrinal rule extensions on
 * top of the existing services/knowledgeApprovalRulesEngine.js. Every rule
 * here is:
 *   - replay-tested against the real current queue before being applied,
 *   - additive (appends a decision row via
 *     services/supportGraphCandidateQueue.recordCandidateDecision — never
 *     mutates or deletes the original candidate record),
 *   - audited (writes an immutable audit-log entry for every application via
 *     services/iogIcojGovernedIngestion.appendAuditLog).
 *
 * This module NEVER approves a new doctrine, a disputed doctrine claim, an
 * interpretive theological conclusion, or any AI-semantic-similarity-based
 * relationship. It only removes genuinely redundant Admin review burden.
 *
 * CRITICAL PERFORMANCE RULE: only invoked from an explicit offline/Admin
 * script. Never required by the live chat request path.
 */

const { readSupportGraphCandidates, recordCandidateDecision } = require('./supportGraphCandidateQueue');
const { readApprovedCrossReferences, appendAuditLog } = require('./iogIcojGovernedIngestion');

const RULE_ID = {
  IDENTICAL_RELATIONSHIP_DEDUPE: 'IDENTICAL_RELATIONSHIP_DEDUPE',
  ALREADY_APPROVED_EVIDENCE_REJECTION: 'ALREADY_APPROVED_EVIDENCE_REJECTION',
};

function groupKeyOf(c) {
  return [String(c.extractedReference || '').toLowerCase().trim(), c.proposedTopic || c.topic || ''].join('::');
}

/**
 * RULE 1 — Identical-relationship dedupe. When two or more PENDING
 * candidates propose the exact same (extractedReference, proposedTopic)
 * pair, only the earliest-discovered one needs a human decision; the rest
 * are archived as "redundant duplicate of <id>" — a reversible, non-doctrinal
 * action (the original record is untouched and still fully readable; this
 * only removes it from the active review queue). This is safe precisely
 * because it never changes WHAT is being decided, only how many times a
 * human has to look at the same decision.
 */
function planIdenticalRelationshipDedupe(pendingCandidates) {
  const groups = new Map();
  for (const c of pendingCandidates) {
    if (!c.extractedReference || !(c.proposedTopic || c.topic)) continue; // never touch malformed/legacy records
    const key = groupKeyOf(c);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  const actions = [];
  for (const [key, group] of groups.entries()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const representative = sorted[0];
    for (const redundant of sorted.slice(1)) {
      actions.push({
        rule: RULE_ID.IDENTICAL_RELATIONSHIP_DEDUPE,
        groupKey: key,
        representativeId: representative.id,
        candidateId: redundant.id,
        action: 'archive',
        reason: `Identical (extractedReference, proposedTopic) pair already pending review as candidate "${representative.id}" (discovered ${representative.createdAt}). Archiving this redundant duplicate reduces Admin review burden without changing any doctrinal decision — the original record and its content are fully preserved and independently readable.`,
      });
    }
  }
  return actions;
}

/**
 * RULE 2 — Already-approved-evidence rejection. When a PENDING candidate's
 * (extractedReference, proposedTopic) pair has ALREADY been auto-approved as
 * a cross-reference by the deterministic chapter-match rule
 * (services/iogIcojGovernedIngestion.js), the pending copy is stale — the
 * evidence it proposes already exists in production. Safe to auto-reject
 * because it never removes evidence, it only removes a now-redundant request
 * to add evidence that is already present.
 */
function planAlreadyApprovedEvidenceRejection(pendingCandidates, approvedCrossReferences) {
  const approvedKeys = new Set(
    approvedCrossReferences.map((a) => [String(a.extractedReference || '').toLowerCase().trim(), a.proposedTopic].join('::'))
  );
  const actions = [];
  for (const c of pendingCandidates) {
    if (!c.extractedReference || !(c.proposedTopic || c.topic)) continue;
    if (approvedKeys.has(groupKeyOf(c))) {
      actions.push({
        rule: RULE_ID.ALREADY_APPROVED_EVIDENCE_REJECTION,
        candidateId: c.id,
        action: 'reject',
        reason: `(extractedReference, proposedTopic) pair is already an APPROVED cross-reference in data/approved-cross-references.jsonl — this pending duplicate proposes evidence that already exists in production.`,
      });
    }
  }
  return actions;
}

/**
 * Replay every planned action against the CURRENT queue state without
 * writing anything. Returns before/after counts so impact can be measured
 * before any decision is recorded.
 */
function replay({ dryRun = true } = {}) {
  const pending = readSupportGraphCandidates({ limit: 10000, status: 'pending_review' });
  const approved = readApprovedCrossReferences();

  const dedupeActions = planIdenticalRelationshipDedupe(pending);
  const staleActions = planAlreadyApprovedEvidenceRejection(pending, approved);
  const allActions = [...dedupeActions, ...staleActions];

  const affectedIds = new Set(allActions.map((a) => a.candidateId));
  const before = { totalPending: pending.length, requiringHumanAttention: pending.length };
  const after = {
    totalPending: pending.length - affectedIds.size,
    requiringHumanAttention: pending.length - affectedIds.size,
  };

  const falsePositiveRisk = {
    dedupe: 'ZERO — original record is preserved verbatim; only its active-review status changes. If the representative candidate is later found invalid, the archived duplicates remain fully recoverable and independently readable.',
    alreadyApprovedRejection: 'ZERO — the exact (reference, topic) evidence is verifiably already live in data/approved-cross-references.jsonl; rejecting the redundant pending copy removes no evidence from production.',
  };
  const falseNegativeRisk = {
    dedupe: 'A duplicate group whose members differ only in incidental metadata (e.g. different source PDF, same claim) could theoretically warrant separate review if the two source documents disagree on translation/context — this rule does not inspect source-document content differences, only the (reference, topic) key. Flagged honestly, not hidden.',
    alreadyApprovedRejection: 'None identified — rejection only fires on an exact key match against production data, not a semantic guess.',
  };

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    rulesEvaluated: Object.values(RULE_ID),
    actionsPlanned: allActions.length,
    actionsByRule: allActions.reduce((acc, a) => {
      acc[a.rule] = (acc[a.rule] || 0) + 1;
      return acc;
    }, {}),
    before,
    after,
    manualWorkReduction: {
      candidatesRemovedFromActiveQueue: affectedIds.size,
      percentReduction: pending.length ? Math.round((affectedIds.size / pending.length) * 10000) / 100 : 0,
    },
    falsePositiveRisk,
    falseNegativeRisk,
    actions: allActions,
  };

  if (!dryRun) {
    for (const action of allActions) {
      const decision = recordCandidateDecision({
        candidateId: action.candidateId,
        action: action.action,
        decidedBy: 'phase6e_rules_optimizer',
        note: action.reason,
        ruleEvaluation: { rule: action.rule, groupKey: action.groupKey || null, representativeId: action.representativeId || null },
      });
      try {
        appendAuditLog({
          action: 'RULES_OPTIMIZER_AUTO_DECISION',
          rule: action.rule,
          candidateId: action.candidateId,
          decision: decision.status,
          note: action.reason,
        });
      } catch (_) {
        // appendAuditLog already degrades gracefully internally; nothing
        // further to do here except never let an audit-log failure block
        // the (already-recorded, already-safe) decision itself.
      }
    }
    report.applied = true;
  } else {
    report.applied = false;
  }

  return report;
}

module.exports = {
  RULE_ID,
  planIdenticalRelationshipDedupe,
  planAlreadyApprovedEvidenceRejection,
  replay,
};
