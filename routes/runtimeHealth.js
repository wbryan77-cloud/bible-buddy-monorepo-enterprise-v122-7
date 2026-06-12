const express = require('express');
const { getRuntimeHealthSnapshot, handleMemoryPressure } = require('../services/runtimeHealthMonitor');

const router = express.Router();

router.get('/runtime-health', (req, res) => {
  const snap = getRuntimeHealthSnapshot();
  if (snap.memoryPressureLevel !== 'normal') {
    handleMemoryPressure();
  }
  res.json(getRuntimeHealthSnapshot());
});

module.exports = router;
