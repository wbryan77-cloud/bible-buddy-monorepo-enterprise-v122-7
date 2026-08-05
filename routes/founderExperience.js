/**
 * BIE v1.1 — Founder Experience Loop HTTP surfaces.
 * Founder feedback is consent-gated / token-gated via admin auth for mutation.
 * Read endpoints for Admin packages are also admin-gated.
 */

const express = require('express');
const { checkAdminAuth } = require('../services/adminAuthMiddleware');
const { recordFounderExperienceFeedback, FOUNDER_MARKS } = require('../services/founderExperienceFeedback');
const { listLearningRecords, transitionLearningRecord } = require('../services/learningRecordStore');
const { readExperienceEvents, reconstructTraceLineage } = require('../services/experienceEventLedger');
const { getEvaluationRegistry, listEvaluators } = require('../services/evaluationRegistry');
const { runRecurringFailureWatcher } = require('../services/experienceWatchers');
const { runRetrievalShadowCompare } = require('../services/retrievalShadowLab');
const { evaluateClaimGrounding } = require('../services/claimGroundingEvaluator');
const { runDiscoveryPass } = require('../services/discoveryEngine');
const { buildRelationshipProjection } = require('../services/relationshipProjection');
const { runHypothesisPass } = require('../services/causalHypothesisEngine');
const { runPredictiveRiskPass } = require('../services/predictiveRiskEngine');
const { buildRankedRecommendations } = require('../services/recommendationIntelligence');
const { runCalibrationSuite } = require('../services/evaluatorCalibration');
const { buildCostBaseline, BUDGET_POLICY } = require('../services/costLedger');
const { getStatus: getDurableStatus } = require('../services/founderExperienceDurableStore');
const { readExperienceEventsDurable } = require('../services/experienceEventLedger');

const router = express.Router();

router.get('/marks', (req, res) => {
  res.json({ ok: true, marks: FOUNDER_MARKS });
});

router.post('/feedback', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const body = req.body || {};
  const result = recordFounderExperienceFeedback(body);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.get('/events', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const eventType = req.query.eventType || null;
  res.json({ ok: true, events: readExperienceEvents({ limit, eventType }) });
});

router.get('/trace/:traceId', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  res.json({ ok: true, lineage: reconstructTraceLineage(req.params.traceId) });
});

router.get('/learning-records', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  res.json({
    ok: true,
    records: listLearningRecords({
      limit: Math.min(Number(req.query.limit || 100), 300),
      status: req.query.status || null,
    }),
  });
});

router.post('/learning-records/:id/:action', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const action = String(req.params.action || '').toLowerCase();
  const map = {
    approve: 'APPROVED',
    reject: 'REJECTED',
    defer: 'DEFERRED',
  };
  const next = map[action];
  if (!next) {
    res.status(400).json({ ok: false, error: 'action must be approve|reject|defer' });
    return;
  }
  const result = transitionLearningRecord(req.params.id, next, {
    actor: req.body?.decidedBy || 'admin',
    note: req.body?.note || null,
  });
  // Approvals never auto-deploy or activate evidence.
  res.json({ ...result, productionMutation: false, evidenceActivated: false });
});

router.get('/evaluation-registry', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  res.json({ ok: true, registry: getEvaluationRegistry(), active: listEvaluators() });
});

router.post('/watchers/run', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  res.json(runRecurringFailureWatcher({ limit: Number(req.body?.limit || 300) }));
});

router.post('/retrieval-shadow', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const body = req.body || {};
  res.json(
    runRetrievalShadowCompare({
      message: body.message || '',
      productionPack: body.productionPack || null,
      requestId: body.requestId || null,
      persist: body.persist !== false,
    }),
  );
});

router.post('/grounding/evaluate', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const body = req.body || {};
  res.json(
    evaluateClaimGrounding({
      replyText: body.replyText || '',
      evidenceRefs: body.evidenceRefs || [],
      historical: !!body.historical,
      requestId: body.requestId || null,
      persist: body.persist !== false,
    }),
  );
});

router.get('/durable/status', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  res.json({ ok: true, status: getDurableStatus() });
});

router.get('/durable/events', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const out = await readExperienceEventsDurable({
      limit: Math.min(Number(req.query.limit || 100), 500),
      eventType: req.query.eventType || null,
      traceId: req.query.traceId || null,
    });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/intelligence/run', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const discoveries = runDiscoveryPass({ persist: true });
    const relationships = buildRelationshipProjection({ persist: true });
    const hypotheses = runHypothesisPass({ persist: true });
    const predictions = runPredictiveRiskPass({ persist: true });
    const recommendations = await buildRankedRecommendations({ persist: true });
    const calibration = runCalibrationSuite({ persist: true });
    const cost = await buildCostBaseline();
    res.json({
      ok: true,
      mode: 'SHADOW',
      productionMutation: false,
      durable: getDurableStatus(),
      discoveries,
      relationships,
      hypotheses,
      predictions,
      recommendations,
      calibration,
      cost,
      budgetPolicy: BUDGET_POLICY,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/mission-control/daily', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { buildFounderMissionControlDaily } = require('../services/founderMissionControl');
    res.json({ ok: true, missionControl: buildFounderMissionControlDaily() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/mission-control/weekly', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { buildFounderMissionControlWeekly } = require('../services/founderMissionControl');
    res.json({ ok: true, missionControl: buildFounderMissionControlWeekly() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/knowledge-aging/shadow', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { runKnowledgeAgingPass } = require('../services/knowledgeAgingShadow');
    res.json({ ok: true, aging: runKnowledgeAgingPass({ limit: Number(req.query.limit) || 200 }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
