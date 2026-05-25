const { buildGenesisToRevelationTraversal } = require('./runtimeGenesisToRevelationTraversalEngine');

function checkScriptureIntegrity({
  category = '',
  references = []
} = {}) {
  const traversal = buildGenesisToRevelationTraversal({
    category,
    references
  });

  const integrityReport = {
    category,
    integrityPassed: true,
    integrityWarnings: [],
    traversalSummary: traversal
  };

  const stages = traversal.traversalStages;

  Object.entries(stages).forEach(([stage, refs]) => {
    if (!Array.isArray(refs) || refs.length === 0) {
      integrityReport.integrityWarnings.push(
        `Missing traversal continuity stage: ${stage}`
      );
    }
  });

  if (integrityReport.integrityWarnings.length > 0) {
    integrityReport.integrityPassed = false;
  }

  integrityReport.integrityObjective =
    'Preserve Genesis to Revelation canonical continuity.';

  return integrityReport;
}

module.exports = {
  checkScriptureIntegrity
};
