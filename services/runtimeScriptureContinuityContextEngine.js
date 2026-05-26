const { buildGenesisToRevelationTraversal } = require('./runtimeGenesisToRevelationTraversalEngine');

function buildContinuityContext({
  category = '',
  references = [],
  chapterContext = ''
} = {}) {
  const traversal = buildGenesisToRevelationTraversal({
    category,
    references
  });

  return {
    category,
    chapterContext,
    traversalStages: traversal.traversalStages,
    contextObjective:
      'Preserve Genesis to Revelation contextual continuity and chapter flow.'
  };
}

module.exports = {
  buildContinuityContext
};
