const SCRIPTURE_FLOW_TOPOLOGY = {
  genesis_to_revelation_flow: {
    nodes: [
      'creation-theme',
      'garden-theme',
      'promise-theme',
      'covenant-theme',
      'kingdom-theme',
      'witness-theme',
      'assembly-theme',
      'restoration-theme',
      'new-creation-theme'
    ],
    references: [
      'Genesis 1-3',
      'Genesis 12',
      'Exodus 19',
      'Daniel 7',
      'Luke 24:25-27',
      'Acts 2',
      'Revelation 21-22'
    ]
  },
  light_to_restoration_flow: {
    nodes: [
      'light-theme',
      'word-theme',
      'witness-theme',
      'restoration-theme'
    ],
    references: [
      'Genesis 1:3-4',
      'Isaiah 9:2',
      'John 1:1-14',
      'Revelation 21:23'
    ]
  },
  covenant_to_kingdom_flow: {
    nodes: [
      'promise-theme',
      'covenant-theme',
      'assembly-theme',
      'kingdom-theme'
    ],
    references: [
      'Genesis 12',
      'Exodus 19',
      'Acts 2',
      'Revelation 11:15'
    ]
  },
  witness_to_restoration_flow: {
    nodes: [
      'prophet-theme',
      'witness-theme',
      'word-theme',
      'restoration-theme',
      'new-creation-theme'
    ],
    references: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:44-47',
      'Revelation 21-22'
    ]
  }
};

function getScriptureFlowTopology(key = '') {
  return SCRIPTURE_FLOW_TOPOLOGY[String(key || '').trim()] || null;
}

function listScriptureFlowTopologies() {
  return SCRIPTURE_FLOW_TOPOLOGY;
}

module.exports = {
  getScriptureFlowTopology,
  listScriptureFlowTopologies,
  SCRIPTURE_FLOW_TOPOLOGY
};
