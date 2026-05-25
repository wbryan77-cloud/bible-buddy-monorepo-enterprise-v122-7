const NARRATIVE_BRIDGE_INDEX = {
  creation_to_word_bridge: {
    bridgeThemes: ['creation-theme', 'word-theme', 'light-theme'],
    references: [
      'Genesis 1:1-3',
      'Psalm 33:6',
      'John 1:1-14',
      'Hebrews 1:1-3'
    ]
  },
  covenant_to_kingdom_bridge: {
    bridgeThemes: ['promise-theme', 'covenant-theme', 'kingdom-theme'],
    references: [
      'Genesis 12',
      'Genesis 17',
      'Exodus 19',
      'Daniel 7',
      'Revelation 11:15'
    ]
  },
  witness_to_restoration_bridge: {
    bridgeThemes: ['witness-theme', 'restoration-theme'],
    references: [
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 21-22'
    ]
  },
  light_to_restoration_bridge: {
    bridgeThemes: ['light-theme', 'new-creation-theme'],
    references: [
      'Genesis 1:3-4',
      'Isaiah 9:2',
      'John 1:4-9',
      'Revelation 21:23'
    ]
  },
  assembly_to_restoration_bridge: {
    bridgeThemes: ['assembly-theme', 'restoration-theme'],
    references: [
      'Acts 2',
      'Romans 12',
      '1 Corinthians 12',
      'Revelation 2-3',
      'Revelation 21'
    ]
  }
};

function getNarrativeBridge(key = '') {
  return NARRATIVE_BRIDGE_INDEX[String(key || '').trim()] || null;
}

function listNarrativeBridges() {
  return NARRATIVE_BRIDGE_INDEX;
}

module.exports = {
  getNarrativeBridge,
  listNarrativeBridges,
  NARRATIVE_BRIDGE_INDEX
};
