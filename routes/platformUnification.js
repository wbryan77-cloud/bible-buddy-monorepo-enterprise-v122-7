// routes/platformUnification.js

const express = require('express');
const router = express.Router();

const {
  getPlatformUnificationStatus,
  orchestratePlatformSignal,
} = require('../services/platformUnification/orchestrator');

// GET /api/platform-unification
router.get('/', (req, res) => {
  try {
    return res.json(getPlatformUnificationStatus());
  } catch (error) {
    console.error('Platform unification status error:', error);
    return res.status(500).json({ ok: false, error: 'platform_unification_status_failed' });
  }
});

// POST /api/platform-unification/orchestrate
router.post('/orchestrate', (req, res) => {
  try {
    const result = orchestratePlatformSignal(req.body || {});
    return res.json(result);
  } catch (error) {
    console.error('Platform orchestration error:', error);
    return res.status(500).json({ ok: false, error: 'platform_orchestration_failed' });
  }
});

module.exports = router;
