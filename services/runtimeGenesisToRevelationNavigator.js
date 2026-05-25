const GENESIS_TO_REVELATION_NAVIGATOR = {
  foundation_navigation: {
    navigationNodes: [
      'creation-anchor',
      'garden-anchor',
      'promise-anchor',
      'covenant-anchor'
    ],
    navigationReferences: [
      'Genesis 1-3',
      'Genesis 12',
      'Genesis 17',
      'Exodus 19-20'
    ],
    navigationMode: 'foundational-continuity'
  },
  kingdom_navigation: {
    navigationNodes: [
      'kingdom-anchor',
      'witness-anchor',
      'restoration-anchor'
    ],
    navigationReferences: [
      'Daniel 2',
      'Daniel 7',
      'Isaiah 9:6-7',
      'Revelation 11:15'
    ],
    navigationMode: 'kingdom-continuity'
  },
  witness_navigation: {
    navigationNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor'
    ],
    navigationReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ],
    navigationMode: 'witness-continuity'
  },
  restoration_navigation: {
    navigationNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    navigationReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    navigationMode: 'restoration-continuity'
  }
};

function getGenesisToRevelationNavigation(key = '') {
  return GENESIS_TO_REVELATION_NAVIGATOR[String(key || '').trim()] || null;
}

function listGenesisToRevelationNavigations() {
  return GENESIS_TO_REVELATION_NAVIGATOR;
}

module.exports = {
  getGenesisToRevelationNavigation,
  listGenesisToRevelationNavigations,
  GENESIS_TO_REVELATION_NAVIGATOR
};
