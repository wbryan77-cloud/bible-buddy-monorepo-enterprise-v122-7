const SCRIPTURE_OBEDIENCE_CONTINUITY_ENGINE = {
  obedience_foundation_continuity: {
    obedienceNodes: [
      'covenant-anchor',
      'truth-anchor',
      'wisdom-anchor',
      'kingdom-anchor'
    ],
    obedienceReferences: [
      'Genesis 22:16-18',
      'Deuteronomy 10:12-13',
      'Psalm 119:1-8',
      'Ecclesiastes 12:13',
      'Matthew 4:4',
      'Revelation 14:12'
    ],
    obedienceMode: 'genesis-to-revelation'
  },
  messiah_obedience_continuity: {
    obedienceNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    obedienceReferences: [
      'Isaiah 50:4-9',
      'John 5:30',
      'John 14:15',
      'Philippians 2:5-8',
      'Hebrews 5:8-9'
    ],
    obedienceMode: 'precept-upon-precept'
  },
  covenant_obedience_continuity: {
    obedienceNodes: [
      'assembly-anchor',
      'covenant-anchor',
      'truth-anchor'
    ],
    obedienceReferences: [
      'Exodus 19:5-6',
      'Jeremiah 7:23',
      'Matthew 7:21-24',
      'Romans 6:16',
      'James 1:22-25'
    ],
    obedienceMode: 'covenant-continuity'
  },
  eternal_obedience_continuity: {
    obedienceNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    obedienceReferences: [
      'Isaiah 2:2-4',
      'Isaiah 66:22-23',
      '1 John 2:3-6',
      'Revelation 21:3-7',
      'Revelation 22:14'
    ],
    obedienceMode: 'eternal-obedience'
  }
};

function getScriptureObedienceContinuity(key = '') {
  return SCRIPTURE_OBEDIENCE_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureObedienceContinuities() {
  return SCRIPTURE_OBEDIENCE_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureObedienceContinuity,
  listScriptureObedienceContinuities,
  SCRIPTURE_OBEDIENCE_CONTINUITY_ENGINE
};
