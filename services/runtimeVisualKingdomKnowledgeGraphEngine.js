const { expandCanonicalKnowledgeGraph } = require('./runtimeCanonicalKnowledgeGraphExpansionLayer');
const { buildCanonicalTimeline } = require('./runtimeCanonicalHistoricalTimelineEngine');

function buildVisualKingdomKnowledgeGraph() {
  const canonicalGraph = expandCanonicalKnowledgeGraph();
  const timeline = buildCanonicalTimeline();

  return {
    visualKingdomKnowledgeGraph: {
      canonicalGraph,
      timeline,
      visualStructures: [
        'covenant-maps',
        'discipleship-trees',
        'prophetic-continuity-graphs',
        'kingdom-mission-pathways',
        'genesis-to-revelation-flow'
      ]
    },
    visualObjective:
      'Render Genesis to Revelation canonical continuity visually line upon line and precept upon precept.'
  };
}

module.exports = {
  buildVisualKingdomKnowledgeGraph
};
