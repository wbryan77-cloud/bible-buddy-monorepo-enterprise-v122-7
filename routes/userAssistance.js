/**
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — User Assistance Platform.
 * Mounted at /api/support (see server.js).
 *
 * Public surface (no admin token — this is the end-user-facing Founder
 * Application support experience, same trust boundary as /buddy and
 * /api/alpha):
 *   GET  /api/support/articles         — Help Center / FAQ read
 *   GET  /api/support/articles/:id     — single article read
 *   POST /api/support/ask              — AI-2 (User Assistance AI)
 *
 * Admin-only surface (shared checkAdminAuth, same fail-closed module used
 * by every other Admin route since Phase 1A):
 *   POST   /api/support/articles           — author a new article
 *   PUT    /api/support/articles/:id       — edit an article
 *   DELETE /api/support/articles/:id       — remove an article
 *   GET    /api/support/escalations        — list escalations (default: pending)
 *   POST   /api/support/escalations/:id/resolve — reply + resolve/dismiss
 */

const express = require('express');
const { checkAdminAuth } = require('../services/adminAuthMiddleware');
const { listArticles, getArticle, createArticle, updateArticle, deleteArticle } = require('../services/helpCenterContentStore');
const { askUserAssistance } = require('../services/userAssistanceAssistant');
const { readEscalations, listPendingEscalations, resolveEscalation } = require('../services/userAssistanceEscalationStore');
const { recordAdminAuditEvent } = require('../services/adminAuditTrail');

const router = express.Router();

router.get('/articles', (req, res) => {
  try {
    const { tag, category, q, limit } = req.query;
    const articles = listArticles({ tag: tag || null, category: category || null, query: q || null, limit: Number(limit) || 100 });
    res.json({ ok: true, total: articles.length, articles });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/articles/:id', (req, res) => {
  try {
    const article = getArticle(req.params.id);
    if (!article) return res.status(404).json({ ok: false, error: 'Article not found.' });
    res.json({ ok: true, article });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/ask', express.json({ limit: '16kb' }), (req, res) => {
  try {
    const { question, testerId } = req.body || {};
    if (!question || !String(question).trim()) return res.status(400).json({ ok: false, error: 'question is required.' });
    const answer = askUserAssistance({ question, testerId: testerId || null });
    res.json(answer);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/articles', express.json({ limit: '64kb' }), (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = createArticle(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    recordAdminAuditEvent({
      action: 'HELP_CENTER_ARTICLE_CREATE',
      actionType: 'NOTE',
      target: result.article.id,
      sourceSystem: 'helpCenterContentStore',
      category: 'USER_ASSISTANCE',
      status: 'COMPLETED',
      resultingState: { title: result.article.title },
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/articles/:id', express.json({ limit: '64kb' }), (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = updateArticle(req.params.id, req.body || {});
    if (!result.ok) return res.status(404).json(result);
    recordAdminAuditEvent({
      action: 'HELP_CENTER_ARTICLE_UPDATE',
      actionType: 'NOTE',
      target: result.article.id,
      sourceSystem: 'helpCenterContentStore',
      category: 'USER_ASSISTANCE',
      status: 'COMPLETED',
      resultingState: { version: result.article.version },
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/articles/:id', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = deleteArticle(req.params.id);
    if (!result.ok) return res.status(404).json(result);
    recordAdminAuditEvent({
      action: 'HELP_CENTER_ARTICLE_DELETE',
      actionType: 'NOTE',
      target: req.params.id,
      sourceSystem: 'helpCenterContentStore',
      category: 'USER_ASSISTANCE',
      status: 'COMPLETED',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/escalations', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { status, limit } = req.query;
    const escalations = status === 'all'
      ? readEscalations({ limit: Number(limit) || 500 })
      : listPendingEscalations({ limit: Number(limit) || 200 });
    res.json({ ok: true, total: escalations.length, escalations });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/escalations/:id/resolve', express.json({ limit: '16kb' }), async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { reply, action, decidedBy } = req.body || {};
    const result = resolveEscalation({ id: req.params.id, reply, resolvedBy: decidedBy || 'admin', action: action || 'resolve' });
    if (!result.ok) return res.status(404).json(result);

    // Notification Framework integration (Deliverable 8's "Support
    // replies" category) — best-effort, never blocks the resolution
    // itself if the tester cannot be notified.
    if (result.escalation.testerId && reply) {
      try {
        const { dispatchCategoryNotification, NOTIFICATION_CATEGORIES } = require('../services/alphaNotificationScheduler');
        await dispatchCategoryNotification({
          category: NOTIFICATION_CATEGORIES.SUPPORT_REPLIES,
          body: reply,
          onlyTesterId: result.escalation.testerId,
        });
      } catch (notifyErr) {
        console.warn('[userAssistance] support-reply notification failed (non-fatal):', notifyErr.message);
      }
    }

    recordAdminAuditEvent({
      action: 'USER_ASSISTANCE_ESCALATION_RESOLVE',
      actionType: action === 'dismiss' ? 'REJECT' : 'RESOLVE',
      target: req.params.id,
      sourceSystem: 'userAssistanceEscalationStore',
      category: 'USER_ASSISTANCE',
      status: 'COMPLETED',
      approvalReasonOrNote: reply || null,
      actorId: decidedBy || 'admin',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
