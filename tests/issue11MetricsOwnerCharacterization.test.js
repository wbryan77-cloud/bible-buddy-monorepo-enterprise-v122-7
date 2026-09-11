#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const feedbackSource = fs.readFileSync(path.join(root, 'services', 'alphaFeedbackCapture.js'), 'utf8');
const alphaAdminSource = fs.readFileSync(path.join(root, 'routes', 'alphaAdmin.js'), 'utf8');
const aggregatorSource = fs.readFileSync(path.join(root, 'services', 'adminCommandCenterAggregator.js'), 'utf8');

// GOAL-BB-ISSUE11 targeted test #2.
// Reuse current metric/feedback owners and verify the two genuine Issue #11
// feedback gaps are implemented directly in the canonical feedback owner.

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

assert.match(feedbackSource, /'felt_understood'/, 'Issue #11 must capture felt-understood directly, not only through proxy tags');
assert.match(feedbackSource, /'felt_peaceful'/, 'Issue #11 must capture felt-peaceful directly, not only through proxy tags');
assert.ok(
  !/COMPANION_PUBLIC_TAGS\s*=\s*\[[^\]]*felt_understood/s.test(feedbackSource),
  'new structured alpha signals must not silently expand lightweight public guest feedback permissions'
);
assert.ok(
  !/COMPANION_PUBLIC_TAGS\s*=\s*\[[^\]]*felt_peaceful/s.test(feedbackSource),
  'new structured alpha signals must not silently expand lightweight public guest feedback permissions'
);

console.log(JSON.stringify({
  ok: true,
  goal: 'GOAL-BB-ISSUE11',
  test: 'metrics owner acceptance',
  verifiedPresent: [
    'session_count',
    'latency',
    'error_count',
    'helpfulness',
    'felt_understood',
    'felt_peaceful',
    'admin_recommendations',
  ],
  duplicateQualityMetricsStackRequired: false,
}));
