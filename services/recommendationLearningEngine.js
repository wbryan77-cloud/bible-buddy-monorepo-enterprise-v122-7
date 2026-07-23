/**
 * PHASE_3_AUTONOMOUS_OPERATIONS — Operational Learning (objective 4).
 *
 * Phase 1B already built real outcome-learning for ONE recommendation
 * source: services/founderIntelligenceRecommendationStore.js tracks
 * APPROVED/REJECTED status per recommendation and exposes
 * computeEffectivenessMetrics() with a byType approval-rate breakdown.
 * That is not duplicated here.
 *
 * What was missing: the other four Decision Queue sources
 * (knowledge-improvement, lesson-alignment, review-queue, user-assistance)
 * have no native "status" concept of their own — their approve/reject
 * history only exists in the unified audit trail
 * (services/adminAuditTrail.js, action DECISION_QUEUE_APPROVE/REJECT).
 * This module mines that audit trail so EVERY recommendation source gets
 * an outcome-learning signal, not just the Founder Intelligence one, then
 * combines both into a single cross-source view.
 *
 * "Learning" here means: surfacing a confidence ANNOTATION for a human to
 * read (e.g. "this category is historically approved 85% of the time").
 * It never changes a stored recommendation's priority/confidence field,
 * never reorders the live queue, and never approves/rejects anything
 * itself — it only informs the human who does.
 */

const { readAdminAuditTrail } = require('./adminAuditTrail');

let founderStore = null;
function getFounderStore() {
  if (!founderStore) founderStore = require('./founderIntelligenceRecommendationStore');
  return founderStore;
}

/**
 * Approval/rejection counts per Decision Queue sourceSystem, mined from the
 * unified audit trail. Covers all sources uniformly (including
 * founder-intelligence, so it can be cross-checked against that store's
 * own native counts).
 */
function computeApprovalRatesBySource({ limit = 2000 } = {}) {
  const trail = readAdminAuditTrail({ limit, category: 'DECISION_QUEUE' });
  const bySource = {};
  for (const rec of trail.entries || []) {
    if (rec.actionType !== 'APPROVE' && rec.actionType !== 'REJECT') continue;
    const source = rec.sourceSystem || 'unknown';
    if (!bySource[source]) bySource[source] = { approved: 0, rejected: 0 };
    if (rec.actionType === 'APPROVE') bySource[source].approved += 1;
    else bySource[source].rejected += 1;
  }
  const result = {};
  for (const [source, counts] of Object.entries(bySource)) {
    const total = counts.approved + counts.rejected;
    result[source] = {
      ...counts,
      total,
      approvalRate: total > 0 ? Math.round((counts.approved / total) * 10000) / 100 : null,
    };
  }
  return result;
}

function confidenceAnnotationForRate(approvalRate, total) {
  if (total < 3) return { label: 'INSUFFICIENT_HISTORY', note: `Only ${total} decided item(s) so far — too few to draw a reliable conclusion.` };
  if (approvalRate >= 75) return { label: 'HISTORICALLY_TRUSTED', note: `Historically approved ${approvalRate}% of the time (${total} decided) — future recommendations of this type warrant less scrutiny by default, but still require the same human sign-off.` };
  if (approvalRate <= 25) return { label: 'HISTORICALLY_QUESTIONED', note: `Historically approved only ${approvalRate}% of the time (${total} decided) — future recommendations of this type warrant EXTRA scrutiny; consider whether the underlying detector needs tuning.` };
  return { label: 'MIXED_HISTORY', note: `Approved ${approvalRate}% of the time (${total} decided) — no strong signal either way.` };
}

/**
 * The consolidated cross-source learning summary: Founder Intelligence's
 * own byType breakdown (untouched, reused as-is) plus the newly-mined
 * per-sourceSystem rates for everything else, each with a plain-language
 * confidence annotation. Never mutates any store.
 */
function buildRecommendationLearningSummary() {
  let founderEffectiveness = null;
  try {
    founderEffectiveness = getFounderStore().computeEffectivenessMetrics();
  } catch (e) {
    founderEffectiveness = { error: e.message };
  }

  const bySource = computeApprovalRatesBySource();
  const annotated = Object.entries(bySource).map(([source, stats]) => ({
    sourceSystem: source,
    ...stats,
    confidence: confidenceAnnotationForRate(stats.approvalRate, stats.total),
  }));

  return {
    generatedAt: new Date().toISOString(),
    founderIntelligenceEffectiveness: founderEffectiveness,
    crossSourceApprovalRates: annotated,
    methodology: 'Mined from the unified audit trail (services/adminAuditTrail.js) for every Decision Queue action. This is a read-only annotation layer — it never changes a stored recommendation, reorders the live queue, or approves/rejects anything on its own.',
    requiredApproval: true,
  };
}

module.exports = { computeApprovalRatesBySource, confidenceAnnotationForRate, buildRecommendationLearningSummary };
