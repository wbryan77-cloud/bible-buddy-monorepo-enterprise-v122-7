'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const routePath = path.join(root, 'routes', 'resourceReview.js');
const routeSource = fs.readFileSync(routePath, 'utf8');

// GOAL-BB-ISSUE11 acceptance guardrail:
// Resource intake may record metadata/review notes, but this route must not own or
// invoke any knowledge/retrieval promotion path. Approval/ingestion, if introduced
// later, must be a separately reviewed human-authorized transition with its own test.

assert.ok(
  routeSource.includes("status: 'pending_human_review'"),
  'new resource submissions must enter pending_human_review'
);
assert.ok(
  routeSource.includes('human_review_required: true'),
  'new resource submissions must require human review'
);
assert.ok(
  routeSource.includes('approved_for_knowledge_ingestion: false'),
  'new resource submissions must default to not approved for knowledge ingestion'
);
assert.ok(
  routeSource.includes("ingestion: { allowed: false, reason: 'Human approval required before knowledge ingestion' }"),
  'submission response must explicitly deny ingestion before approval'
);
assert.ok(
  routeSource.includes('changes_approval_state: false'),
  'review notes must not change approval state'
);

// Prevent accidental addition of a hidden approval/ingestion endpoint to the intake
// router. This deliberately scans executable route declarations rather than comments.
const routeDeclarations = [...routeSource.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)]
  .map((match) => `${match[1].toUpperCase()} ${match[2]}`);

assert.deepStrictEqual(
  routeDeclarations.sort(),
  ['GET /review-plan', 'POST /review-note', 'POST /submit'].sort(),
  `resource review route surface changed: ${routeDeclarations.join(', ')}. Any approval/ingestion transition requires explicit Issue #11 acceptance review.`
);

// The intake router must not directly import or call likely knowledge/retrieval owners.
// This is a structural boundary test: it supplements, not replaces, later live acceptance.
const forbiddenRuntimeTokens = [
  'retrievalOrchestrator',
  'knowledgeGraph',
  'vectorMemory',
  'knowledgeIngestion',
  'ingestApproved',
  'promoteToKnowledge',
  'activateKnowledge',
];

for (const token of forbiddenRuntimeTokens) {
  assert.ok(
    !routeSource.includes(token),
    `resource intake route must not directly invoke knowledge/retrieval runtime token: ${token}`
  );
}

console.log(JSON.stringify({
  ok: true,
  goal: 'GOAL-BB-ISSUE11',
  test: 'resource review no-ingestion structural boundary',
  routeDeclarations,
  defaultApproval: false,
  humanReviewRequired: true,
}));
