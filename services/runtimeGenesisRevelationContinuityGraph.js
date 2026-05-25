const GENESIS_REVELATION_CONTINUITY_GRAPH = {
  creation_to_restoration_graph: {
    graphNodes: [
      'creation-anchor',
      'garden-anchor',
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    graphReferences: [
      'Genesis 1-3',
      'Genesis 12',
      'Exodus 19-20',
      'Isaiah 9:6-7',
      'Daniel 7',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    graphMode: 'genesis-to-revelation'
  },
  messiah_continuity_graph: {
    graphNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    graphReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Micah 5:2',
      'John 1:1-14',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:13'
    ],
    graphMode: 'messiah-continuity'
  },
  wisdom_continuity_graph: {
    graphNodes: [
      'wisdom-anchor',
      'light-anchor',
      'word-anchor'
    ],
    graphReferences: [
      'Proverbs 1',
      'Psalm 119:105',
      'John 1:4-9',
      'James 1:5'
    ],
    graphMode: 'wisdom-continuity'
  },
  restoration_continuity_graph: {
    graphNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    graphReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    graphMode: 'restoration-continuity'
  }
};

function getGenesisRevelationContinuityGraph(key = '') {
  return GENESIS_REVELATION_CONTINUITY_GRAPH[String(key || '').trim()] || null;
}

function listGenesisRevelationContinuityGraphs() {
  return GENESIS_REVELATION_CONTINUITY_GRAPH;
}

module.exports = {
  getGenesisRevelationContinuityGraph,
  listGenesisRevelationContinuityGraphs,
  GENESIS_REVELATION_CONTINUITY_GRAPH
};
