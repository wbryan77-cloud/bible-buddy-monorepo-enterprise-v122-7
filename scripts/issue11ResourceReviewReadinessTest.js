'use strict';

/**
 * GitHub Issue #11 — Resource Review Readiness Probe
 *
 * Non-production static acceptance probe. It intentionally does NOT create a
 * second resource-review implementation. Instead it proves which pieces of the
 * current route/UI/review topology are actually wired on this checkout.
 *
 * Exit 0 = the minimum topology required for the Issue #11 resource-review
 * acceptance path is present. Exit 1 = one or more required links remain
 * unproven/missing and Issue #11 must stay open.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
};

const servicePath = 'services/resourceIngestionReview.js';
const routePath = 'routes/resourceReview.js';
const serverPath = 'server.js';
const resourcesUiCandidates = [
  'admin/resources.html',
  'admin/resource-review.html',
  'admin/resourceReview.html',
];

const service = read(servicePath);
const route = read(routePath);
const server = read(serverPath) || '';
const uiPath = resourcesUiCandidates.find((candidate) => read(candidate) !== null) || null;
const ui = uiPath ? read(uiPath) : null;

const checks = [
  {
    id: 'review-service-present',
    ok: !!service,
    evidence: service ? servicePath : 'missing',
  },
  {
    id: 'human-review-gate-declared',
    ok:
      !!service &&
      service.includes('human_review_required') &&
      service.includes('Require human approval before knowledge ingestion.'),
    evidence: servicePath,
  },
  {
    id: 'resource-review-route-present',
    ok: !!route,
    evidence: route ? routePath : 'missing',
  },
  {
    id: 'resource-review-route-mounted',
    ok:
      !!route &&
      (server.includes("'./routes/resourceReview'") ||
        server.includes('"./routes/resourceReview"') ||
        server.includes("require('./routes/resourceReview')") ||
        server.includes('require("./routes/resourceReview")')),
    evidence: serverPath,
  },
  {
    id: 'resource-review-admin-ui-present',
    ok: !!ui,
    evidence: uiPath || `none of: ${resourcesUiCandidates.join(', ')}`,
  },
  {
    id: 'ui-exposes-review-action',
    ok:
      !!ui &&
      /review/i.test(ui) &&
      /(approve|reject|hold|submit)/i.test(ui),
    evidence: uiPath || 'no resource-review UI found',
  },
];

const failed = checks.filter((check) => !check.ok);
const report = {
  goalId: 'GOAL-BB-ISSUE11',
  probe: 'resource-review-readiness',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks,
  failedChecks: failed.map((check) => check.id),
  invariant:
    'This probe never ingests or promotes a resource. Human approval remains mandatory.',
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = failed.length === 0 ? 0 : 1;
