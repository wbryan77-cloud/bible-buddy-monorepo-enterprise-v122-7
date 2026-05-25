const NARRATIVE_CONTINUITY_ENGINE = {
  creation_continuity: {
    continuityNodes: [
      'creation-anchor',
      'light-anchor',
      'garden-anchor',
      'restoration-anchor'
    ],
    continuityReferences: [
      'Genesis 1-3',
      'Psalm 33:6',
      'John 1:1-5',
      'Revelation 21-22'
    ],
    continuityMode: 'genesis-to-revelation'
  },
  covenant_continuity: {
    continuityNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    continuityReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    continuityMode: 'line-upon-line'
  },
  witness_continuity: {
    continuityNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor'
    ],
    continuityReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ],
    continuityMode: 'cross-book-context'
  },
  restoration_continuity: {
    continuityNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    continuityReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    continuityMode: 'restoration-sequence'
  }
};

function getNarrativeContinuityEngine(key = '') {
  return NARRATIVE_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listNarrativeContinuityEngines() {
  return NARRATIVE_CONTINUITY_ENGINE;
}

module.exports = {
  getNarrativeContinuityEngine,
  listNarrativeContinuityEngines,
  NARRATIVE_CONTINUITY_ENGINE
};
