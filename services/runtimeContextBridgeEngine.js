const CONTEXT_BRIDGE_ENGINE = {
  creation_bridge: {
    bridgeNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    bridgeReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'John 1:1-14',
      'Revelation 21:23'
    ],
    bridgeMode: 'cross-book-sequence'
  },
  covenant_bridge: {
    bridgeNodes: [
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    bridgeReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Daniel 7'
    ],
    bridgeMode: 'line-upon-line'
  },
  witness_bridge: {
    bridgeNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor'
    ],
    bridgeReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ],
    bridgeMode: 'contextual-reading'
  },
  restoration_bridge: {
    bridgeNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    bridgeReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    bridgeMode: 'restoration-continuity'
  }
};

function getContextBridge(key = '') {
  return CONTEXT_BRIDGE_ENGINE[String(key || '').trim()] || null;
}

function listContextBridges() {
  return CONTEXT_BRIDGE_ENGINE;
}

module.exports = {
  getContextBridge,
  listContextBridges,
  CONTEXT_BRIDGE_ENGINE
};
