// services/platformUnification/knowledgeGraph/graphContinuityScoring.js
// Platform Unification Phase — Graph Continuity Scoring
//
// Goals:
// - improve continuity-aware orchestration
// - improve canonical graph visibility
// - centralize continuity scoring
// - support orchestration maturity evaluation
// - support safe runtime graph expansion
//
// This module does NOT replace continuity systems.
// It provides graph-aware continuity scoring infrastructure.

const GRAPH_CONTINUITY_SCORING_VERSION = 'graph-continuity-scoring.v1';

function calculateNodeDensity(knowledgeGraph = {}) {
  const nodeCount = Array.isArray(knowledgeGraph.nodes)
    ? knowledgeGraph.nodes.length
    : 0;

  if (nodeCount >= 50) {
    return 'high';
  }

  if (nodeCount >= 15) {
    return 'moderate';
  }

  return 'developing';
}

function calculateEdgeConnectivity(knowledgeGraph = {}) {
  const edgeCount = Array.isArray(knowledgeGraph.edges)
    ? knowledgeGraph.edges.length
    : 0;

  if (edgeCount >= 75) {
    return 'strong';
  }

  if (edgeCount >= 20) {
    return 'stable';
  }

  return 'developing';
}

function calculateAnchorStrength(knowledgeGraph = {}) {
  const anchorCount = Array.isArray(
    knowledgeGraph.continuityAnchors
  )
    ? knowledgeGraph.continuityAnchors.length
    : 0;

  return Math.min(anchorCount * 5, 100);
}

function calculateContinuityAlignment({
  continuityState = {},
  doctrineIntegrity = {},
} = {}) {
  let score = continuityState.continuityScore || 0;

  if (doctrineIntegrity.requiresReview) {
    score -= 15;
  }

  return Math.max(Math.min(score, 100), 0);
}

function generateGraphContinuityScoring({
  knowledgeGraph = {},
  continuityState = {},
  doctrineIntegrity = {},
} = {}) {
  return {
    version: GRAPH_CONTINUITY_SCORING_VERSION,
    generatedAt: new Date().toISOString(),

    graphContinuity: {
      nodeDensity:
        calculateNodeDensity(knowledgeGraph),

      edgeConnectivity:
        calculateEdgeConnectivity(knowledgeGraph),

      anchorStrength:
        calculateAnchorStrength(knowledgeGraph),

      continuityAlignment:
        calculateContinuityAlignment({
          continuityState,
          doctrineIntegrity,
        }),
    },

    orchestrationReadiness: {
      graphReady:
        Array.isArray(knowledgeGraph.nodes) &&
        knowledgeGraph.nodes.length > 0,

      continuityReady:
        (continuityState.continuityScore || 0) >= 25,

      doctrineReady:
        !doctrineIntegrity.requiresReview,
    },
  };
}

module.exports = {
  GRAPH_CONTINUITY_SCORING_VERSION,
  calculateNodeDensity,
  calculateEdgeConnectivity,
  calculateAnchorStrength,
  calculateContinuityAlignment,
  generateGraphContinuityScoring,
};