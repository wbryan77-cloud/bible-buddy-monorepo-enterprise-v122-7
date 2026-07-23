const express = require('express');
const { getAdminAnswer } = require('../services/adminBrain');
const { getSnapshot } = require('../services/projectBrain');
// SECURITY STABILIZATION (Phase 1A) — this file previously had NO
// authentication code path at all, on either route, in any configuration.
// Confirmed live: GET /admin/assistant/project-brain (internal product
// roadmap) was reachable anonymously; POST /admin/assistant/assistant (an
// unmetered, unauthenticated path to an OpenAI-billed call) had no auth
// gate in source, though it was not exercised live during review to avoid
// an unnecessary billed call. Both routes now require the same shared admin
// token as every other admin surface. See
// docs/alpha/security-stabilization-*/ for the full validation record.
const { checkAdminAuth } = require('../services/adminAuthMiddleware');

const router = express.Router();

// POST /admin/assistant  -> ask “what next?”
router.post('/assistant', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const question = (req.body && req.body.question) || null;
    const answer = await getAdminAnswer(question);
    res.json({ ok: true, answer });
  } catch (e) {
    console.error('Admin assistant error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /admin/project-brain  -> export the brain (for you to paste into ChatGPT)
router.get('/project-brain', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  res.json(getSnapshot());
});

module.exports = router;
