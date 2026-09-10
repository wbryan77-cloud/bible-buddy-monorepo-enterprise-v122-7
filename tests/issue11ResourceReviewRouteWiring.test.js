#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const servicePath = path.join(root, 'services', 'resourceIngestionReview.js');
const serviceSource = fs.readFileSync(servicePath, 'utf8');

// GOAL-BB-ISSUE11 characterization test.
// This records the current wiring gap before implementation is added. It must be
// inverted/replaced by an end-to-end acceptance test once a protected resource-review
// intake route + Admin review surface is actually mounted.
//
// IMPORTANT: GitHub symbol search produced false negatives during Issue #11 recovery,
// so this test scans the checked-out source tree directly rather than treating search
// index results as architecture evidence.

assert.ok(
  serviceSource.includes('Require human approval before knowledge ingestion.'),
  'resource review service must preserve the human approval gate'
);

assert.ok(
  serviceSource.includes('Do not auto-publish unreviewed materials.'),
  'resource review service must preserve the no-auto-publish rule'
);

assert.ok(
  serviceSource.includes("approvalRecommendation: 'human_review_required'"),
  'AI review must remain advisory and require human review'
);

function collectTextFiles(startPath) {
  if (!fs.existsSync(startPath)) return [];
  const stat = fs.statSync(startPath);
  if (stat.isFile()) return [startPath];

  const files = [];
  for (const entry of fs.readdirSync(startPath, { withFileTypes: true })) {
    const fullPath = path.join(startPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTextFiles(fullPath));
    } else if (/\.(?:js|cjs|mjs|html|json)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// Scan only executable/navigation surfaces that could make the policy service
// reachable: the app entry point, route modules, and Admin UI. A policy/service file
// existing by itself does NOT establish an end-to-end intake/review path.
const surfaceFiles = [
  path.join(root, 'server.js'),
  ...collectTextFiles(path.join(root, 'routes')),
  ...collectTextFiles(path.join(root, 'admin')),
];

const evidence = surfaceFiles.map((filePath) => ({
  filePath,
  relative: path.relative(root, filePath).replace(/\\/g, '/'),
  source: fs.readFileSync(filePath, 'utf8'),
}));

const serviceReferences = evidence
  .filter(({ source }) => /resourceIngestionReview/.test(source))
  .map(({ relative }) => relative);

const namedReviewSurfaces = evidence
  .filter(({ source }) =>
    /(?:resource[-_ ]?(?:ingestion[-_ ]?)?review|admin\/resources(?:\.html)?|\/resources(?:\/|['"`]))/i.test(source)
  )
  .map(({ relative }) => relative);

assert.deepStrictEqual(
  serviceReferences,
  [],
  `characterization changed: resourceIngestionReview is now referenced by executable/Admin surface(s): ${serviceReferences.join(', ')}. Replace this gap test with protected end-to-end acceptance coverage.`
);

assert.deepStrictEqual(
  namedReviewSurfaces,
  [],
  `characterization changed: a named resource-review surface now exists in: ${namedReviewSurfaces.join(', ')}. Verify it end-to-end and replace this gap test.`
);

console.log(
  `PASS issue11ResourceReviewRouteWiring characterization: reviewed ${surfaceFiles.length} server/route/Admin files; guarded policy service remains unreferenced by those executable surfaces`
);
