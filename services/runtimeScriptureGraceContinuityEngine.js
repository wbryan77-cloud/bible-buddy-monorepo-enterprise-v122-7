const SCRIPTURE_GRACE_CONTINUITY_ENGINE = {
  grace_foundation_continuity: {
    graceNodes: [
      'truth-anchor',
      'wisdom-anchor',
      'covenant-anchor',
      'restoration-anchor'
    ],
    graceReferences: [
      'Genesis 6:8',
      'Exodus 33:12-19',
      'Psalm 84:11',
      'Isaiah 30:18',
      'John 1:14-17',
      'Ephesians 2:8-10'
    ],
    graceMode: 'genesis-to-revelation'
  },
  messiah_grace_continuity: {
    graceNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    graceReferences: [
      'Isaiah 55:1-3',
      'Luke 4:18-19',
      'John 1:16-17',
      'Romans 3:23-24',
      'Titus 2:11-14'
    ],
    graceMode: 'precept-upon-precept'
  },
  covenant_grace_continuity: {
    graceNodes: [
      'assembly-anchor',
      'covenant-anchor',
      'truth-anchor'
    ],
    graceReferences: [
      'Jeremiah 31:31-34',
      'Acts 15:11',
      'Romans 5:1-5',
      'Hebrews 4:14-16',
      '1 Peter 5:10'
    ],
    graceMode: 'covenant-continuity'
  },
  eternal_grace_continuity: {
    graceNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    graceReferences: [
      'Isaiah 60:1-3',
      'Romans 6:23',
      '2 Timothy 1:9-10',
      'Revelation 21:3-7',
      'Revelation 22:1-5'
    ],
    graceMode: 'eternal-grace'
  }
};

function getScriptureGraceContinuity(key = '') {
  return SCRIPTURE_GRACE_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureGraceContinuities() {
  return SCRIPTURE_GRACE_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureGraceContinuity,
  listScriptureGraceContinuities,
  SCRIPTURE_GRACE_CONTINUITY_ENGINE
};
