const PROPHETIC_CONTINUITY_ENGINE = {
  prophetic_foundation: {
    propheticNodes: [
      'promise-anchor',
      'prophet-anchor',
      'witness-anchor',
      'kingdom-anchor'
    ],
    propheticReferences: [
      'Genesis 3:15',
      'Deuteronomy 18:15-19',
      'Isaiah 9:6-7',
      'Daniel 7',
      'Luke 24:25-27'
    ],
    propheticMode: 'line-upon-line'
  },
  messiah_witness: {
    propheticNodes: [
      'witness-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    propheticReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Micah 5:2',
      'John 1:1-14',
      'John 5:39'
    ],
    propheticMode: 'cross-book-context'
  },
  restoration_prophecy: {
    propheticNodes: [
      'kingdom-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    propheticReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    propheticMode: 'genesis-to-revelation'
  },
  light_prophecy: {
    propheticNodes: [
      'light-anchor',
      'word-anchor',
      'wisdom-anchor'
    ],
    propheticReferences: [
      'Genesis 1:3-4',
      'Isaiah 9:2',
      'John 1:4-9',
      'Revelation 21:23'
    ],
    propheticMode: 'narrative-sequence'
  }
};

function getPropheticContinuity(key = '') {
  return PROPHETIC_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listPropheticContinuities() {
  return PROPHETIC_CONTINUITY_ENGINE;
}

module.exports = {
  getPropheticContinuity,
  listPropheticContinuities,
  PROPHETIC_CONTINUITY_ENGINE
};
