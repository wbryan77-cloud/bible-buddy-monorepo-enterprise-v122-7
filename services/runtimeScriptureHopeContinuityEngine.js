const SCRIPTURE_HOPE_CONTINUITY_ENGINE = {
  hope_foundation_continuity: {
    hopeNodes: [
      'promise-anchor',
      'truth-anchor',
      'wisdom-anchor',
      'restoration-anchor'
    ],
    hopeReferences: [
      'Psalm 39:7',
      'Psalm 62:5-6',
      'Isaiah 40:28-31',
      'Jeremiah 29:11',
      'Romans 15:13',
      'Hebrews 6:18-20'
    ],
    hopeMode: 'genesis-to-revelation'
  },
  messiah_hope_continuity: {
    hopeNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'kingdom-anchor'
    ],
    hopeReferences: [
      'Isaiah 9:2-7',
      'Luke 2:25-32',
      'John 11:25-26',
      'Colossians 1:27',
      '1 Timothy 1:1'
    ],
    hopeMode: 'precept-upon-precept'
  },
  covenant_hope_continuity: {
    hopeNodes: [
      'assembly-anchor',
      'covenant-anchor',
      'truth-anchor'
    ],
    hopeReferences: [
      'Psalm 119:114',
      'Lamentations 3:21-26',
      'Romans 5:1-5',
      'Ephesians 1:17-18',
      '1 Peter 1:3-5'
    ],
    hopeMode: 'covenant-continuity'
  },
  eternal_hope_continuity: {
    hopeNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    hopeReferences: [
      'Isaiah 65:17-25',
      'Titus 1:1-2',
      'Revelation 21:1-5',
      'Revelation 22:1-5',
      '2 Peter 3:13'
    ],
    hopeMode: 'eternal-hope'
  }
};

function getScriptureHopeContinuity(key = '') {
  return SCRIPTURE_HOPE_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureHopeContinuities() {
  return SCRIPTURE_HOPE_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureHopeContinuity,
  listScriptureHopeContinuities,
  SCRIPTURE_HOPE_CONTINUITY_ENGINE
};
