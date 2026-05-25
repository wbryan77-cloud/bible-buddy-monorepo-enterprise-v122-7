const SCRIPTURE_TRUTH_FRAMEWORK = {
  truth_foundation: {
    truthNodes: [
      'word-anchor',
      'wisdom-anchor',
      'understanding-anchor',
      'light-anchor'
    ],
    truthReferences: [
      'Psalm 119:160',
      'Proverbs 1:7',
      'Isaiah 8:20',
      'John 1:1-14',
      'John 17:17'
    ],
    truthMode: 'scripture-foundation'
  },
  prophetic_truth: {
    truthNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor'
    ],
    truthReferences: [
      'Deuteronomy 18:15-22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    truthMode: 'line-upon-line'
  },
  covenant_truth: {
    truthNodes: [
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    truthReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Daniel 7',
      'Hebrews 8'
    ],
    truthMode: 'covenant-continuity'
  },
  restoration_truth: {
    truthNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    truthReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    truthMode: 'restoration-continuity'
  }
};

function getScriptureTruthFramework(key = '') {
  return SCRIPTURE_TRUTH_FRAMEWORK[String(key || '').trim()] || null;
}

function listScriptureTruthFrameworks() {
  return SCRIPTURE_TRUTH_FRAMEWORK;
}

module.exports = {
  getScriptureTruthFramework,
  listScriptureTruthFrameworks,
  SCRIPTURE_TRUTH_FRAMEWORK
};
