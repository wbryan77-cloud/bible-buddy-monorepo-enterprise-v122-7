const CROSS_BOOK_NARRATIVE_GRAPH = {
  creation_graph: {
    nodes: ['Genesis 1', 'Psalm 33:6', 'John 1:1-5', 'Revelation 21:1-5'],
    connections: ['creation-theme', 'light-theme', 'word-theme', 'restoration-theme'],
    graphMode: 'cross-book-context'
  },
  covenant_graph: {
    nodes: ['Genesis 12', 'Exodus 19', 'Jeremiah 31', 'Hebrews 8'],
    connections: ['promise-theme', 'covenant-theme', 'assembly-theme'],
    graphMode: 'line-upon-line'
  },
  kingdom_graph: {
    nodes: ['Daniel 2', 'Daniel 7', 'Isaiah 9:6-7', 'Revelation 11:15'],
    connections: ['kingdom-theme', 'restoration-theme'],
    graphMode: 'narrative-continuity'
  },
  witness_graph: {
    nodes: ['Deuteronomy 18:15-19', 'Psalm 22', 'Isaiah 53', 'Luke 24:25-27', 'John 5:39'],
    connections: ['prophet-theme', 'witness-theme', 'word-theme'],
    graphMode: 'contextual-reading'
  },
  restoration_graph: {
    nodes: ['Isaiah 65', 'Romans 8:18-23', 'Revelation 21-22'],
    connections: ['restoration-theme', 'new-creation-theme'],
    graphMode: 'genesis-to-revelation'
  }
};

function getCrossBookNarrativeGraph(key = '') {
  return CROSS_BOOK_NARRATIVE_GRAPH[String(key || '').trim()] || null;
}

function listCrossBookNarrativeGraphs() {
  return CROSS_BOOK_NARRATIVE_GRAPH;
}

module.exports = {
  getCrossBookNarrativeGraph,
  listCrossBookNarrativeGraphs,
  CROSS_BOOK_NARRATIVE_GRAPH
};
