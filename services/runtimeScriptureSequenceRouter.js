const SCRIPTURE_SEQUENCE_ROUTER = {
  genesis_to_covenant_sequence: {
    route: [
      'Genesis 1-3',
      'Genesis 12',
      'Genesis 17',
      'Exodus 19-20'
    ],
    themes: ['creation-theme', 'promise-theme', 'covenant-theme']
  },
  kingdom_sequence: {
    route: [
      '2 Samuel 7',
      'Psalm 89',
      'Isaiah 9',
      'Daniel 7',
      'Revelation 11:15'
    ],
    themes: ['kingdom-theme', 'restoration-theme']
  },
  witness_sequence: {
    route: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ],
    themes: ['witness-theme', 'word-theme']
  },
  restoration_sequence: {
    route: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    themes: ['restoration-theme', 'new-creation-theme']
  }
};

function getScriptureSequenceRoute(key = '') {
  return SCRIPTURE_SEQUENCE_ROUTER[String(key || '').trim()] || null;
}

function listScriptureSequenceRoutes() {
  return SCRIPTURE_SEQUENCE_ROUTER;
}

module.exports = {
  getScriptureSequenceRoute,
  listScriptureSequenceRoutes,
  SCRIPTURE_SEQUENCE_ROUTER
};
