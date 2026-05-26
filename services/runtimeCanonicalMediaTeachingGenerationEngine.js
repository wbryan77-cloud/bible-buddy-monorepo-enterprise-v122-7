const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');
const { buildVisualKingdomKnowledgeGraph } = require('./runtimeVisualKingdomKnowledgeGraphEngine');

function buildTeachingGeneration({
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
    teachingGeneration: {
      continuityInsights,
      visualKnowledgeGraph,
      teachingStructures: [
        'sermon-outline-generation',
        'discipleship-study-guides',
        'visual-scripture-teaching',
        'kingdom-learning-pathways',
        'continuity-safe-doctrine-teaching'
      ]
    },
    teachingObjective:
      'Generate Genesis to Revelation teaching and media continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildTeachingGeneration
};
