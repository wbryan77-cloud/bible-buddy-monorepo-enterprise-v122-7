const PRIMARY_SOURCE_STRUCTURE = {
  scriptureFirst: true,
  preserveDirectBiblicalLanguage: true,
  preserveGenesisToRevelationFlow: true,
  preserveLineUponLineStructure: true,
  separateHistoryFromScripture: true,
  avoidDoctrinalCompression: true,
};

const SCRIPTURE_CATEGORIES = {
  genealogy: [
    'Genesis 5',
    'Genesis 10',
    'Genesis 25',
    'Genesis 35',
    '1 Chronicles 1',
    'Luke 3'
  ],
  covenant: [
    'Genesis 12',
    'Genesis 17',
    'Exodus 19',
    'Jeremiah 31',
    'Hebrews 8'
  ],
  appointed_times: [
    'Leviticus 23',
    'Deuteronomy 16',
    'Zechariah 14'
  ],
  kingdom_and_prophecy: [
    'Daniel 2',
    'Daniel 7',
    'Matthew 24',
    'Revelation 11'
  ],
  wisdom_and_law: [
    'Ecclesiastes 12:13',
    'Matthew 5:17-19',
    'Romans 3:31',
    '1 John 2:3-4'
  ]
};

function buildPrimarySourceScriptureContext() {
  return {
    structure: PRIMARY_SOURCE_STRUCTURE,
    categories: SCRIPTURE_CATEGORIES,
    guidance: {
      prioritizeDirectScriptureReading: true,
      preserveContextualContinuity: true,
      maintainChapterFlow: true,
      avoidFragmentedProofTexting: true,
      preserveScriptureInterconnection: true,
    },
  };
}

module.exports = {
  buildPrimarySourceScriptureContext,
  PRIMARY_SOURCE_STRUCTURE,
  SCRIPTURE_CATEGORIES,
};
