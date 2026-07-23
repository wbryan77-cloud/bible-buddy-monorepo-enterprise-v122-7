const express = require('express');
const { getActiveTesters, isActiveTester, getTester } = require('../services/betaRegistry');
const { recordCompanionFeedback } = require('../services/companionIntelligence');
const {
  listReviewIndex,
  getReviewBundle,
  listSessionSummaries,
  listFeedback,
} = require('../services/betaSessionReader');

const router = express.Router();

function parseRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n);
}

// SECURITY STABILIZATION (Phase 1A) — this file previously defined its own
// checkReviewAuth() that only recognized BETA_REVIEW_TOKEN (never
// BIBLE_AUTHORITY_ADMIN_TOKEN, which is the only one actually configured in
// production) and granted OPEN access whenever that one variable was unset.
// Confirmed live: /api/beta/review, /review/session/:id, and
// /review/tester/:id were all reachable with zero authentication. Now
// delegates to the shared, fail-closed module (checks
// BIBLE_AUTHORITY_ADMIN_TOKEN first), preserving this file's exact prior
// error-message text. /testers, /testers/:testerId, and /feedback below
// remain intentionally public — they are end-user-facing (tester lookup for
// the beta.html UI dropdown, and feedback submission), not admin surfaces,
// and were never gated by checkReviewAuth even before this change.
const { checkAdminAuth: checkReviewAuth } = require('../services/adminAuthMiddleware');
const REVIEW_AUTH_OPTIONS = { errorMessage: 'Review access requires valid token.' };

// GET /api/beta/testers — active testers for beta.html dropdown
router.get('/testers', (req, res) => {
  try {
    const cohort = req.query.cohort || null;
    res.json({ ok: true, testers: getActiveTesters({ cohort }) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/beta/testers/:testerId — validate tester exists
router.get('/testers/:testerId', (req, res) => {
  try {
    const tester = getTester(req.params.testerId);
    if (!tester || tester.active === false) {
      return res.status(404).json({ ok: false, error: 'Tester not found or inactive.' });
    }
    res.json({ ok: true, tester });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/beta/feedback
router.post('/feedback', (req, res) => {
  try {
    const body = req.body || {};
    const testerId = String(body.testerId || body.userId || '').trim();
    const sessionId = String(body.sessionId || '').trim();

    if (!testerId) {
      return res.status(400).json({ ok: false, error: 'testerId is required.' });
    }
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'sessionId is required.' });
    }
    if (!isActiveTester(testerId)) {
      return res.status(400).json({ ok: false, error: 'Unknown or inactive testerId.' });
    }

    const feltHeard = parseRating(body.feltHeard);
    const usefulness = parseRating(body.usefulness);
    const biblicalFaithfulness = parseRating(body.biblicalFaithfulness);
    const naturalness = parseRating(body.naturalness);
    const wouldUseAgain = parseRating(body.wouldUseAgain);

    const ratings = [feltHeard, usefulness, biblicalFaithfulness, naturalness, wouldUseAgain];
    if (ratings.some((r) => r === null)) {
      return res.status(400).json({
        ok: false,
        error: 'All five ratings (1–5) are required: feltHeard, usefulness, biblicalFaithfulness, naturalness, wouldUseAgain.',
      });
    }

    const result = recordCompanionFeedback({
      testerId,
      userId: testerId,
      sessionId,
      cohort: body.cohort || getTester(testerId)?.cohort || null,
      feltHeard,
      usefulness,
      biblicalFaithfulness,
      naturalness,
      wouldUseAgain,
      comment: body.comment || body.suggestion || '',
      consentForAggregateReview: body.consentForAggregateReview !== false,
      source: 'beta-html',
    });

    res.json({ ok: true, saved: true, feedback: result.feedback });
  } catch (error) {
    console.error('Beta feedback error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/beta/review — session index with feedback snippets
router.get('/review', (req, res) => {
  if (!checkReviewAuth(req, res, REVIEW_AUTH_OPTIONS)) return;
  try {
    const index = listReviewIndex({
      cohort: req.query.cohort || null,
      since: req.query.since || null,
      limit: Number(req.query.limit) || 100,
    });
    res.json({ ok: true, sessions: index });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/beta/review/session/:sessionId — transcript + feedback
router.get('/review/session/:sessionId', (req, res) => {
  if (!checkReviewAuth(req, res, REVIEW_AUTH_OPTIONS)) return;
  try {
    const bundle = getReviewBundle({ sessionId: req.params.sessionId });
    if (!bundle.transcript) {
      return res.status(404).json({ ok: false, error: 'Session not found.' });
    }
    res.json({ ok: true, ...bundle });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/beta/review/tester/:testerId — sessions for one tester
router.get('/review/tester/:testerId', (req, res) => {
  if (!checkReviewAuth(req, res, REVIEW_AUTH_OPTIONS)) return;
  try {
    const sessions = listSessionSummaries({
      testerId: req.params.testerId,
      since: req.query.since || null,
      limit: Number(req.query.limit) || 50,
    });
    const feedback = listFeedback({
      testerId: req.params.testerId,
      limit: 50,
    });
    res.json({ ok: true, testerId: req.params.testerId, sessions, feedback });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
