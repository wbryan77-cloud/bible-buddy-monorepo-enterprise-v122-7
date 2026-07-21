/**
 * Phase 2R — Implementation Value orchestration and report payloads.
 */

const fs = require('fs');
const path = require('path');
const { runScriptureResearchReviewConsole } = require('./scriptureResearchReviewConsole');
const { runTopicApprovalPacks } = require('./topicApprovalPacks');
const {
  runImplementationValueAnalysis,
  FACTOR_WEIGHTS,
} = require('./implementationValueScore');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

function runPhase2rAnalysis() {
  const consoleResult = runScriptureResearchReviewConsole();
  const packsPayload = runTopicApprovalPacks();
  packsPayload._reviews = consoleResult.reviews;

  const analysis = runImplementationValueAnalysis(packsPayload);

  const payload = {
    ...analysis,
    reviews: consoleResult.reviews,
    scriptureAuthorityCoverage: packsPayload.scriptureAuthorityCoverage,
    duplicateReduction: packsPayload.duplicateReduction,
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(TRACE, 'phase2r-implementation-value-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'batch4-candidate-pool.json'),
    `${JSON.stringify({
      ranAt: payload.ranAt,
      pool: payload.batch4CandidatePool,
      count: payload.batch4CandidatePool.length,
    }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase2rAnalysis,
  FACTOR_WEIGHTS,
};
