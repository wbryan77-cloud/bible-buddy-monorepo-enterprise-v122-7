const express = require('express');
const { getRuntimeHealthSnapshot, handleMemoryPressure } = require('../services/runtimeHealthMonitor');
const { getBuddyRouteTraceSnapshot } = require('../services/buddyLivePathVerifier');
const { getProviderHealth } = require('../services/bibleTextProvider');

const router = express.Router();

router.get('/runtime-health', (req, res) => {
  const snap = getRuntimeHealthSnapshot();
  if (snap.memoryPressureLevel !== 'normal') {
    handleMemoryPressure();
  }

  if (req.query.trace === '1' || req.query.trace === 'true') {
    const trace = getBuddyRouteTraceSnapshot();
    return res.json({
      ...getRuntimeHealthSnapshot(),
      trace,
    });
  }

  res.json(getRuntimeHealthSnapshot());
});

// PHASE_5T Part 3 — honest, live provider health reporting for the
// canonical Scripture text provider (never mixed with the OpenAI/email/SMS
// config-presence checks, since this performs a real network probe).
router.get('/scripture-provider-health', async (req, res) => {
  try {
    const health = await getProviderHealth();
    res.json({ ok: true, ...health });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
});

module.exports = router;
