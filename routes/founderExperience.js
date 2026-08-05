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

module.exports = router;
