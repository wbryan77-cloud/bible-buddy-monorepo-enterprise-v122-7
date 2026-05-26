const { checkScriptureIntegrity } = require('./runtimeScriptureIntegrityChecker');
const { scoreCanonicalContinuity } = require('./runtimeCanonicalContinuityScoringAI');

function detectCanonicalContradictions({
  category = '',
  references = []
} = {}) {
  const integrity = checkScriptureIntegrity({
    category,
    references
  });

  const scoring = scoreCanonicalContinuity({
    category,
    references
  });

  const contradictionReport = {
    category,
    contradictionsDetected: false,
    contradictionWarnings: [],
    continuityScore: scoring.continuityScore
  };

  integrity.integrityWarnings.forEach(warning => {
    contradictionReport.contradictionWarnings.push({
      warning,
      severity: 'continuity-risk'
    });
  });

  if (contradictionReport.contradictionWarnings.length > 0) {
    contradictionReport.contradictionsDetected = true;
  }

  contradictionReport.detectionObjective =
    'Detect fragmented Genesis to Revelation continuity risks.';

  return contradictionReport;
}

module.exports = {
  detectCanonicalContradictions
};
