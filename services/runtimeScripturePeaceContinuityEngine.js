const SCRIPTURE_PEACE_CONTINUITY_ENGINE = {
  peace_foundation_continuity: {
    peaceNodes: [
      'truth-anchor',
      'wisdom-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    peaceReferences: [
      'Numbers 6:24-26',
      'Psalm 29:11',
      'Isaiah 9:6',
      'Isaiah 26:3',
      'John 14:27',
      'Philippians 4:6-7'
    ],
    peaceMode: 'genesis-to-revelation'
  },
  messiah_peace_continuity: {
    peaceNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    peaceReferences: [
      'Micah 5:2-5',
      'Luke 2:13-14',
      'John 16:33',
      'Ephesians 2:13-18',
      'Colossians 1:19-20'
    ],
    peaceMode: 'precept-upon-precept'
  },
  covenant_peace_continuity: {
    peaceNodes: [
      'assembly-anchor',
      'covenant-anchor',
      'truth-anchor'
    ],
    peaceReferences: [
      'Psalm 119:165',
      'Isaiah 54:10',
      'Romans 5:1',
      'Hebrews 12:14',
      'James 3:17-18'
    ],
    peaceMode: 'covenant-continuity'
  },
  eternal_peace_continuity: {
    peaceNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    peaceReferences: [
      'Isaiah 11:6-9',
      'Isaiah 65:17-25',
      'Revelation 21:1-4',
      'Revelation 22:1-5',
      '2 Peter 3:13'
    ],
    peaceMode: 'eternal-peace'
  }
};

function getScripturePeaceContinuity(key = '') {
  return SCRIPTURE_PEACE_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScripturePeaceContinuities() {
  return SCRIPTURE_PEACE_CONTINUITY_ENGINE;
}

module.exports = {
  getScripturePeaceContinuity,
  listScripturePeaceContinuities,
  SCRIPTURE_PEACE_CONTINUITY_ENGINE
};
