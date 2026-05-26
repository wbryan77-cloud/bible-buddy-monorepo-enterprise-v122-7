const { checkScriptureIntegrity } = require('./runtimeScriptureIntegrityChecker');

function reinforceCanonicalContinuity({
  category = '',
  references = []
} = {}) {
  const integrity = checkScriptureIntegrity({
    category,
    references
  });

  const reinforcementActions = [];

  integrity.integrityWarnings.forEach(warning => {
    if (warning.includes('foundation')) {
      reinforcementActions.push('Add stronger Torah and Genesis foundations.');
    }

    if (warning.includes('prophetic')) {
      reinforcementActions.push('Add stronger prophetic continuity references.');
    }

    if (warning.includes('messiah')) {
      reinforcementActions.push('Add Messiah fulfillment continuity references.');
    }

    if (warning.includes('apostolic')) {
      reinforcementActions.push('Add apostolic witness continuity references.');
    }

    if (warning.includes('revelation')) {
      reinforcementActions.push('Add Revelation completion continuity references.');
    }
  });

  return {
    category,
    integrityWarnings: integrity.integrityWarnings,
    reinforcementActions,
    reinforcementObjective:
      'Strengthen Genesis to Revelation canonical continuity.'
  };
}

module.exports = {
  reinforceCanonicalContinuity
};
