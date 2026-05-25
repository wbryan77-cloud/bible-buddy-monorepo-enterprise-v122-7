const SCRIPTURE_HOLINESS_CONTINUITY_ENGINE = {
  holiness_foundation_continuity: {
    holinessNodes: [
      'covenant-anchor',
      'truth-anchor',
      'wisdom-anchor',
      'light-anchor'
    ],
    holinessReferences: [
      'Leviticus 11:44-45',
      'Leviticus 19:2',
      'Psalm 24:3-4',
      'Isaiah 35:8',
      '1 Peter 1:15-16',
      'Revelation 22:11'
    ],
    holinessMode: 'genesis-to-revelation'
  },
  messiah_holiness_continuity: {
    holinessNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    holinessReferences: [
      'Isaiah 53:9',
      'Luke 1:35',
      'John 17:19',
      'Hebrews 4:14-15',
      '1 John 3:5'
    ],
    holinessMode: 'precept-upon-precept'
  },
  covenant_holiness_continuity: {
    holinessNodes: [
      'assembly-anchor',
      'covenant-anchor',
      'truth-anchor'
    ],
    holinessReferences: [
      'Exodus 19:5-6',
      'Psalm 119:9-11',
      'Romans 12:1-2',
      '2 Corinthians 7:1',
      'Hebrews 12:14'
    ],
    holinessMode: 'covenant-continuity'
  },
  eternal_holiness_continuity: {
    holinessNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    holinessReferences: [
      'Isaiah 6:1-3',
      'Isaiah 57:15',
      'Revelation 4:8',
      'Revelation 21:27',
      'Revelation 22:3-5'
    ],
    holinessMode: 'eternal-holiness'
  }
};

function getScriptureHolinessContinuity(key = '') {
  return SCRIPTURE_HOLINESS_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureHolinessContinuities() {
  return SCRIPTURE_HOLINESS_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureHolinessContinuity,
  listScriptureHolinessContinuities,
  SCRIPTURE_HOLINESS_CONTINUITY_ENGINE
};
