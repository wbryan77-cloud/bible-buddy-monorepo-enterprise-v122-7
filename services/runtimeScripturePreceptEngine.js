const SCRIPTURE_PRECEPT_ENGINE = {
  creation_precepts: {
    preceptNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'wisdom-anchor'
    ],
    preceptReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'Proverbs 8:22-31',
      'John 1:1-14',
      'Colossians 1:15-17'
    ],
    preceptMode: 'line-upon-line'
  },
  prophetic_precepts: {
    preceptNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    preceptReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Micah 5:2',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    preceptMode: 'precept-upon-precept'
  },
  covenant_precepts: {
    preceptNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    preceptReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    preceptMode: 'covenant-continuity'
  },
  restoration_precepts: {
    preceptNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    preceptReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    preceptMode: 'restoration-continuity'
  }
};

function getScripturePrecepts(key = '') {
  return SCRIPTURE_PRECEPT_ENGINE[String(key || '').trim()] || null;
}

function listScripturePrecepts() {
  return SCRIPTURE_PRECEPT_ENGINE;
}

module.exports = {
  getScripturePrecepts,
  listScripturePrecepts,
  SCRIPTURE_PRECEPT_ENGINE
};
