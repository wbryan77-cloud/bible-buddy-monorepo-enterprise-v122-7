const express = require('express');
const { getRuntimeHealthSnapshot, handleMemoryPressure } = require('../services/runtimeHealthMonitor');
const { getBuddyRouteTraceSnapshot } = require('../services/buddyLivePathVerifier');

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

module.exports = router;
