const { buildGenesisToRevelationTraversal } = require('./runtimeGenesisToRevelationTraversalEngine');
const { checkScriptureIntegrity } = require('./runtimeScriptureIntegrityChecker');

function generateCanonicalStudy({
  category = '',
  references = []
} = {}) {
  const traversal = buildGenesisToRevelationTraversal({
    category,
    references
  });

  const integrity = checkScriptureIntegrity({
    category,
    references
  });

  return {
    category,
    studyFlow: {
      foundation: traversal.traversalStages.foundation,
      propheticExpansion: traversal.traversalStages.propheticExpansion,
      messiahFulfillment: traversal.traversalStages.messiahFulfillment,
      apostolicWitness: traversal.traversalStages.apostolicWitness,
      revelationCompletion: traversal.traversalStages.revelationCompletion
    },
    studyIntegrity: integrity,
    studyObjective:
      'Generate Genesis to Revelation continuity studies line upon line and precept upon precept.'
  };
}

module.exports = {
  generateCanonicalStudy
};
