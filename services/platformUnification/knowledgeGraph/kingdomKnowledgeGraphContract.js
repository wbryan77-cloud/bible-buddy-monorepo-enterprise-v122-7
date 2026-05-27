// services/platformUnification/knowledgeGraph/kingdomKnowledgeGraphContract.js
// Platform Unification Phase — Kingdom Knowledge Graph Contract
//
// Goals:
// - centralize canonical knowledge relationships
// - reduce disconnected spiritual context
// - unify Scripture, doctrine, themes, and discipleship continuity
// - support continuity-aware orchestration
// - support future graph expansion safely
//
// This module does NOT replace existing study systems.
// It provides canonical runtime graph contracts.

const KINGDOM_KNOWLEDGE_GRAPH_VERSION = 'kingdom-knowledge-graph.v1';

const NODE_TYPES = [
  'scripture',
  'doctrine',
  'theme',
  'discipleship-stage',
  'worship-theme',
  'prayer-theme',
  'mission-theme',
  'stewardship-theme',
  'continuity-anchor',
];

const EDGE_TYPES = [
  'supports',
  'connected-to',
  'reinforces',
  'references',
  'anchors',
  'flows-into',
];

function createKnowledgeNode({
  id,
  type,
  label,
  metadata = {},
} = {}) {
  return {
    id: id || `node_${Date.now()}`,
    type: NODE_TYPES.includes(type)
      ? type
      : 'theme',
    label: label || 'Unnamed Node',
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function createKnowledgeEdge({
  from,
  to,
  type,
  metadata = {},
} = {}) {
  return {
    from,
    to,
    type: EDGE_TYPES.includes(type)
      ? type
      : 'connected-to',
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function createKnowledgeGraphState() {
  return {
    version: KINGDOM_KNOWLEDGE_GRAPH_VERSION,
    createdAt: new Date().toISOString(),
    nodes: [],
    edges: [],
    continuityAnchors: [],
  };
}

function buildSignalKnowledgeNodes(signal = {}) {
  const nodes = [];

  if (signal.scriptureRefs?.length) {
    signal.scriptureRefs.forEach((reference) => {
      nodes.push(
        createKnowledgeNode({
          type: 'scripture',
          label: reference,
          metadata: {
            sourceSystem: signal.sourceSystem || 'unknown',
          },
        })
      );
    });
  }

  if (signal.sourceSystem) {
    nodes.push(
      createKnowledgeNode({
        type: 'continuity-anchor',
        label: `${signal.sourceSystem}-continuity`,
        metadata: {
          sourceSystem: signal.sourceSystem,
        },
      })
    );
  }

  return nodes;
}

function integrateSignalIntoKnowledgeGraph(
  graphState = createKnowledgeGraphState(),
  signal = {}
) {
  const nodes = buildSignalKnowledgeNodes(signal);

  const edges = [];

  if (nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i += 1) {
      edges.push(
        createKnowledgeEdge({
          from: nodes[i].id,
          to: nodes[i + 1].id,
          type: 'connected-to',
        })
      );
    }
  }

  return {
    ...graphState,
    nodes: [...graphState.nodes, ...nodes].slice(-100),
    edges: [...graphState.edges, ...edges].slice(-200),
    continuityAnchors: [
      ...graphState.continuityAnchors,
      signal.sourceSystem || 'unknown',
    ].slice(-25),
  };
}

module.exports = {
  KINGDOM_KNOWLEDGE_GRAPH_VERSION,
  NODE_TYPES,
  EDGE_TYPES,
  createKnowledgeNode,
  createKnowledgeEdge,
  createKnowledgeGraphState,
  buildSignalKnowledgeNodes,
  integrateSignalIntoKnowledgeGraph,
};