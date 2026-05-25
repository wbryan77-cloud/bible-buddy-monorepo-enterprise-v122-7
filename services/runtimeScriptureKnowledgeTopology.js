const SCRIPTURE_KNOWLEDGE_TOPOLOGY = {
  foundational_topology: {
    topologyNodes: [
      'creation-anchor',
      'garden-anchor',
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    topologyReferences: [
      'Genesis 1-3',
      'Genesis 12',
      'Genesis 17',
      'Exodus 19-20',
      'Daniel 7'
    ],
    topologyMode: 'foundational-continuity'
  },
  witness_topology: {
    topologyNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor',
      'assembly-anchor'
    ],
    topologyReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'John 1:1-14',
      'Acts 2'
    ],
    topologyMode: 'cross-book-context'
  },
  restoration_topology: {
    topologyNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    topologyReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    topologyMode: 'restoration-continuity'
  },
  light_topology: {
    topologyNodes: [
      'light-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    topologyReferences: [
      'Genesis 1:3-4',
      'Isaiah 9:2',
      'John 1:4-9',
      'Revelation 21:23'
    ],
    topologyMode: 'narrative-sequence'
  }
};

function getScriptureKnowledgeTopology(key = '') {
  return SCRIPTURE_KNOWLEDGE_TOPOLOGY[String(key || '').trim()] || null;
}

function listScriptureKnowledgeTopologies() {
  return SCRIPTURE_KNOWLEDGE_TOPOLOGY;
}

module.exports = {
  getScriptureKnowledgeTopology,
  listScriptureKnowledgeTopologies,
  SCRIPTURE_KNOWLEDGE_TOPOLOGY
};
