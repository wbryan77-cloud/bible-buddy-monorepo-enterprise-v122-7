const SCRIPTURE_JUDGMENT_CONTINUITY_ENGINE = {
  righteous_judgment_continuity: {
    judgmentNodes: [
      'truth-anchor',
      'wisdom-anchor',
      'kingdom-anchor',
      'restoration-anchor'
    ],
    judgmentReferences: [
      'Genesis 18:25',
      'Deuteronomy 16:18-20',
      'Psalm 96:10-13',
      'Isaiah 11:1-5',
      'John 5:22-27',
      'Revelation 20:11-15'
    ],
    judgmentMode: 'genesis-to-revelation'
  },
  messiah_judgment_continuity: {
    judgmentNodes: [
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    judgmentReferences: [
      'Isaiah 42:1-4',
      'Daniel 7:13-14',
      'Matthew 25:31-46',
      'John 12:47-48',
      'Acts 17:30-31'
    ],
    judgmentMode: 'precept-upon-precept'
  },
  covenant_judgment_continuity: {
    judgmentNodes: [
      'covenant-anchor',
      'assembly-anchor',
      'truth-anchor'
    ],
    judgmentReferences: [
      'Leviticus 19:15',
      'Ecclesiastes 12:13-14',
      'Micah 6:8',
      'Romans 2:5-11',
      '1 Peter 4:17'
    ],
    judgmentMode: 'covenant-continuity'
  },
  eternal_judgment_continuity: {
    judgmentNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    judgmentReferences: [
      'Isaiah 66:22-24',
      'Malachi 4:1-2',
      'Matthew 13:40-43',
      'Revelation 14:6-7',
      'Revelation 21:1-8'
    ],
    judgmentMode: 'eternal-judgment'
  }
};

function getScriptureJudgmentContinuity(key = '') {
  return SCRIPTURE_JUDGMENT_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureJudgmentContinuities() {
  return SCRIPTURE_JUDGMENT_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureJudgmentContinuity,
  listScriptureJudgmentContinuities,
  SCRIPTURE_JUDGMENT_CONTINUITY_ENGINE
};
