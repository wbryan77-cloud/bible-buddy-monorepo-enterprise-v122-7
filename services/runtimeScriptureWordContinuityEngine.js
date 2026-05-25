const SCRIPTURE_WORD_CONTINUITY_ENGINE = {
  creation_word_continuity: {
    wordNodes: [
      'creation-anchor',
      'word-anchor',
      'light-anchor',
      'wisdom-anchor'
    ],
    wordReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'Proverbs 8:22-31',
      'John 1:1-14',
      'Hebrews 1:1-3',
      'Revelation 19:13'
    ],
    wordMode: 'genesis-to-revelation'
  },
  messiah_word_continuity: {
    wordNodes: [
      'witness-anchor',
      'truth-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    wordReferences: [
      'Isaiah 55:10-11',
      'John 6:63',
      'John 8:31-32',
      'John 17:17',
      'Revelation 19:13'
    ],
    wordMode: 'precept-upon-precept'
  },
  covenant_word_continuity: {
    wordNodes: [
      'promise-anchor',
      'assembly-anchor',
      'word-anchor'
    ],
    wordReferences: [
      'Deuteronomy 8:3',
      'Psalm 119:89',
      'Isaiah 40:8',
      'Matthew 4:4',
      '1 Peter 1:25'
    ],
    wordMode: 'covenant-continuity'
  },
  restoration_word_continuity: {
    wordNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'word-anchor'
    ],
    wordReferences: [
      'Isaiah 65:17',
      'Ezekiel 37:1-14',
      'John 5:24',
      'Revelation 21:1-5',
      'Revelation 22:18-19'
    ],
    wordMode: 'restoration-continuity'
  }
};

function getScriptureWordContinuity(key = '') {
  return SCRIPTURE_WORD_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureWordContinuities() {
  return SCRIPTURE_WORD_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureWordContinuity,
  listScriptureWordContinuities,
  SCRIPTURE_WORD_CONTINUITY_ENGINE
};
