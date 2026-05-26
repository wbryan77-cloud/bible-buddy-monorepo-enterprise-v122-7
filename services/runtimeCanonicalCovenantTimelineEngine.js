const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');
const { buildVisualKingdomKnowledgeGraph } = require('./runtimeVisualKingdomKnowledgeGraphEngine');

function buildCovenantTimeline({
  category = '',
  verses = [],
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const continuityInsights = generateContinuityInsights({
    category,
    verses,
    completionKey,
    prophecyKey
  });

  const visualKnowledgeGraph = buildVisualKingdomKnowledgeGraph();

  return {
    category,
    covenantTimeline: {
      continuityInsights,
      visualKnowledgeGraph,
      covenantStructures: [
        'creation-covenant-foundations',
        'abrahamic-covenant-progression',
        'mosaic-and-prophetic-continuity',
        'messiah-fulfillment-pathways',
        'revelation-kingdom-completion'
      ]
    },
    covenantObjective:
      'Guide Genesis to Revelation covenant timeline continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildCovenantTimeline
};
