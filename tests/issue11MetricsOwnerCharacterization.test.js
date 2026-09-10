#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const feedbackSource = fs.readFileSync(path.join(root, 'services', 'alphaFeedbackCapture.js'), 'utf8');
const alphaAdminSource = fs.readFileSync(path.join(root, 'routes', 'alphaAdmin.js'), 'utf8');
const aggregatorSource = fs.readFileSync(path.join(root, 'services', 'adminCommandCenterAggregator.js'), 'utf8');

// GOAL-BB-ISSUE11 targeted test #2, characterization stage.
// This prevents the old Issue #11 qualityMetrics design from being rebuilt as a
// parallel metrics stack when current owners already exist, while refusing to
// mislabel proxy feedback fields as direct evidence for requirements they do not
// actually capture.

assert.match(feedbackSource, /'helpful'/, 'current feedback owner must preserve helpful feedback');
assert.match(feedbackSource, /'not_helpful'/, 'current feedback owner must preserve not-helpful feedback');
assert.match(feedbackSource, /recordAlphaFeedback/, 'feedback must continue feeding runtime health');
assert.match(feedbackSource, /founderExperienceDurableStore/, 'feedback must retain durable projection path');

assert.match(alphaAdminSource, /feedbackTags:\s*tagCounts/, 'Admin summary must expose feedback tag counts');
assert.match(alphaAdminSource, /averageLatencyMs/, 'Admin summary must expose latency');
assert.match(alphaAdminSource, /errors:\s*health\.errors/, 'Admin summary must expose error count');
assert.match(alphaAdminSource, /sessionsToday:\s*health\.alphaSessionsToday/, 'Admin summary must expose session count');

assert.match(aggregatorSource, /buildSystemHealthSection|averageLatencyMs/, 'Command Center must retain system-health metrics owner');
assert.match(aggregatorSource, /buildRecommendationsSection|adminDecisionQueue/, 'Command Center must retain recommendation/decision owner');

// These are genuine Issue #11 gap characterizations at this commit. If either
// becomes directly implemented, this test intentionally fails so it must be
// converted from characterization to positive acceptance coverage.
assert.ok(!feedbackSource.includes("'felt_understood'"), 'characterization changed: felt_understood now exists; replace gap assertion with positive acceptance test');
assert.ok(!feedbackSource.includes("'felt_peaceful'"), 'characterization changed: felt_peaceful now exists; replace gap assertion with positive acceptance test');

// Pacing is already owned by current alpha testing architecture through health /
// feedback UI semantics; do not create a second quality-metrics store merely to
// satisfy the May Issue #11 filename proposal.

console.log(JSON.stringify({
  ok: true,
  goal: 'GOAL-BB-ISSUE11',
  test: 'metrics owner characterization',
  verifiedPresent: ['session_count', 'latency', 'error_count', 'helpfulness', 'admin_recommendations'],
  genuineGapCandidates: ['felt_understood', 'felt_peaceful'],
  duplicateQualityMetricsStackRequired: false,
}));
