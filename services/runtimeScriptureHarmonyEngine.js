const SCRIPTURE_HARMONY_ENGINE = {
  creation_harmony: {
    harmonyNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    harmonyReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'John 1:1-14',
      'Hebrews 1:1-3',
      'Revelation 21:23'
    ],
    harmonyMode: 'genesis-to-revelation'
  },
  covenant_harmony: {
    harmonyNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    harmonyReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Acts 2',
      'Revelation 11:15'
    ],
    harmonyMode: 'line-upon-line'
  },
  witness_harmony: {
    harmonyNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor'
    ],
    harmonyReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Micah 5:2',
      'Luke 24:25-27',
      'John 5:39'
    ],
    harmonyMode: 'cross-book-context'
  },
  restoration_harmony: {
    harmonyNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    harmonyReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    harmonyMode: 'restoration-continuity'
  }
};

function getScriptureHarmony(key = '') {
  return SCRIPTURE_HARMONY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureHarmonies() {
  return SCRIPTURE_HARMONY_ENGINE;
}

module.exports = {
  getScriptureHarmony,
  listScriptureHarmonies,
  SCRIPTURE_HARMONY_ENGINE
};
