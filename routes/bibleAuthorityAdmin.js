/**
 * Phase 2K — Bible Authority Admin API routes.
 */
const express = require('express');
const { getAdminCommandCenter } = require('../services/bibleAuthorityAdminCenter');

const router = express.Router();

router.get('/command-center', (req, res) => {
  try {
    res.json(getAdminCommandCenter());
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/scripture-review', (req, res) => {
  try {
    const data = getAdminCommandCenter();
    res.json(data.areas.scriptureAuthorityReview);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/engineering', (req, res) => {
  try {
    const data = getAdminCommandCenter();
    res.json(data.areas.engineeringIntelligence);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/executive', (req, res) => {
  try {
    const data = getAdminCommandCenter();
    res.json(data.areas.executiveGrowthDashboard);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
