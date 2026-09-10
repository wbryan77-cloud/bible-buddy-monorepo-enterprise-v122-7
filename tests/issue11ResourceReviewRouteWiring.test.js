#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const serviceSource = fs.readFileSync(path.join(root, 'services', 'resourceIngestionReview.js'), 'utf8');

// GOAL-BB-ISSUE11 characterization test.
// This intentionally records the current wiring gap before any implementation is added.
// It must be replaced/inverted by an acceptance test when a protected resource-review
// route is actually mounted. Its purpose is to prevent us from falsely claiming that
// the existing policy service is already reachable end-to-end.

assert.ok(
  serviceSource.includes('Require human approval before knowledge ingestion.'),
  'resource review service must preserve the human approval gate'
);

assert.ok(
  serviceSource.includes('Do not auto-publish unreviewed materials.'),
  'resource review service must preserve the no-auto-publish rule'
);

const hasDirectServiceImport = /resourceIngestionReview/.test(serverSource);
const hasNamedResourceReviewRoute = /mountRoute\([^\n]*resource[^\n]*review/i.test(serverSource);
const hasNamedResourceReviewAdminPage = /admin\/resources(?:\.html)?/i.test(serverSource);

assert.strictEqual(
  hasDirectServiceImport || hasNamedResourceReviewRoute || hasNamedResourceReviewAdminPage,
  false,
  'characterization changed: server.js now appears to expose resource review; replace this gap test with end-to-end acceptance coverage'
);

console.log(
  'PASS issue11ResourceReviewRouteWiring characterization: policy service is guarded but no resource-review server/admin wiring is presently declared in server.js'
);
