const express = require('express');
const {
  validateInviteToken,
  completeOnboarding,
  getTester,
  isActiveAlphaTester,
  startTestSession,
  AGE_RANGES,
  BIBLE_FAMILIARITY,
  TEST_FOCUS,
  NOTIFICATION_PREFS,
} = require('../services/alphaTesterManager');
const { recordFeedback, VALID_TAGS } = require('../services/alphaFeedbackCapture');
const { subscribe, unsubscribe } = require('../services/alphaNotificationScheduler');
const { buildMemoryDisclosureReply } = require('../services/companionMemoryManager');

const router = express.Router();

router.get('/invite/:token', (req, res) => {
  try {
    const result = validateInviteToken(req.params.token);
    if (!result.valid) return res.status(404).json({ ok: false, error: result.error });
    res.json({
      ok: true,
      used: result.used,
      tester: result.tester
        ? {
            testerId: result.tester.testerId,
            name: result.tester.name,
            onboarded: !!result.tester.onboardedAt,
          }
        : null,
      options: {
        ageRanges: AGE_RANGES,
        bibleFamiliarity: BIBLE_FAMILIARITY,
        testFocus: TEST_FOCUS,
        notificationPrefs: NOTIFICATION_PREFS,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/onboard', (req, res) => {
  try {
    const body = req.body || {};
    const result = completeOnboarding({
      inviteToken: body.inviteToken || body.token,
      intake: body,
      consentAccepted: !!body.consentAccepted,
      ndaAccepted: !!body.ndaAccepted,
    });
    if (!result.ok) return res.status(400).json(result);
    res.json({
      ok: true,
      testerId: result.tester.testerId,
      sessionToken: result.sessionToken,
      tester: {
        testerId: result.tester.testerId,
        name: result.tester.name,
        notificationPreference: result.tester.notificationPreference,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/tester/:testerId', (req, res) => {
  try {
    const tester = getTester(req.params.testerId);
    if (!tester) return res.status(404).json({ ok: false, error: 'Tester not found' });
    res.json({
      ok: true,
      tester: {
        testerId: tester.testerId,
        name: tester.name,
        active: tester.active,
        notificationPreference: tester.notificationPreference,
        onboardedAt: tester.onboardedAt,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/session/start', (req, res) => {
  try {
    const testerId = String(req.body?.testerId || '').trim();
    if (!isActiveAlphaTester(testerId)) {
      return res.status(403).json({ ok: false, error: 'Complete onboarding before starting a session.' });
    }
    const sessionId = req.body.sessionId || `sess-${Date.now()}`;
    startTestSession(testerId);
    res.json({ ok: true, testerId, sessionId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/feedback', (req, res) => {
  try {
    const body = req.body || {};
    const result = recordFeedback({
      testerId: body.testerId,
      sessionId: body.sessionId,
      messageId: body.messageId,
      rating: body.rating,
      tag: body.tag,
      optionalComment: body.comment || body.optionalComment,
    });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/feedback/tags', (req, res) => {
  res.json({ ok: true, tags: VALID_TAGS });
});

router.post('/notifications/subscribe', (req, res) => {
  try {
    const testerId = String(req.body?.testerId || '').trim();
    const preference = req.body?.preference || 'once_daily';
    if (!isActiveAlphaTester(testerId)) {
      return res.status(403).json({ ok: false, error: 'Invalid tester' });
    }
    const tester = subscribe(testerId, preference);
    res.json({ ok: true, tester });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/notifications/unsubscribe', (req, res) => {
  try {
    const testerId = String(req.body?.testerId || '').trim();
    if (!testerId) return res.status(400).json({ ok: false, error: 'testerId required' });
    const tester = unsubscribe(testerId);
    res.json({ ok: true, tester });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/memory/disclosure/:testerId', (req, res) => {
  try {
    const reply = buildMemoryDisclosureReply({ userId: req.params.testerId });
    res.json({ ok: true, reply });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
