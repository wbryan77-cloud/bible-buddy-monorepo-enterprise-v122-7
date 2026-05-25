const SCRIPTURE_WISDOM_ENGINE = {
  wisdom_foundation: {
    wisdomNodes: [
      'creation-anchor',
      'covenant-anchor',
      'wisdom-anchor',
      'kingdom-anchor'
    ],
    wisdomReferences: [
      'Genesis 1-3',
      'Proverbs 1',
      'Ecclesiastes 12',
      'Daniel 2',
      'James 1:5'
    ],
    wisdomMode: 'foundational-wisdom'
  },
  witness_wisdom: {
    wisdomNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor'
    ],
    wisdomReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ],
    wisdomMode: 'cross-book-context'
  },
  restoration_wisdom: {
    wisdomNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    wisdomReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    wisdomMode: 'restoration-continuity'
  },
  light_wisdom: {
    wisdomNodes: [
      'light-anchor',
      'word-anchor',
      'wisdom-anchor'
    ],
    wisdomReferences: [
      'Genesis 1:3-4',
      'Psalm 119:105',
      'John 1:4-9',
      'James 1:5'
    ],
    wisdomMode: 'narrative-sequence'
  }
};

function getScriptureWisdom(key = '') {
  return SCRIPTURE_WISDOM_ENGINE[String(key || '').trim()] || null;
}

function listScriptureWisdomEngines() {
  return SCRIPTURE_WISDOM_ENGINE;
}

module.exports = {
  getScriptureWisdom,
  listScriptureWisdomEngines,
  SCRIPTURE_WISDOM_ENGINE
};
