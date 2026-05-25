const SCRIPTURE_TRAVERSALS = {
  creation_to_restoration: [
    'Genesis 1',
    'Genesis 2',
    'Isaiah 65',
    'Revelation 21',
    'Revelation 22'
  ],
  sabbath_continuity: [
    'Genesis 2:1-3',
    'Exodus 20:8-11',
    'Isaiah 58:13-14',
    'Mark 2:27-28',
    'Hebrews 4:1-11'
  ],
  appointed_times_continuity: [
    'Leviticus 23',
    'Deuteronomy 16',
    'Luke 22',
    'Acts 2',
    'Zechariah 14'
  ],
  covenant_continuity: [
    'Genesis 12',
    'Genesis 17',
    'Exodus 19',
    'Jeremiah 31',
    'Hebrews 8'
  ],
  kingdom_continuity: [
    'Daniel 2',
    'Daniel 7',
    'Isaiah 9',
    'Matthew 24',
    'Revelation 11'
  ]
};

const TRAVERSAL_GUIDANCE = {
  scriptureFirst: true,
  preserveGenesisToRevelationFlow: true,
  preserveLineUponLineStructure: true,
  preserveNarrativeContinuity: true,
  avoidFragmentedProofTexting: true,
  preserveSurroundingContext: true,
};

function buildScriptureTraversal(topic = '') {
  const normalized = String(topic || '').toLowerCase();

  const traversal = Object.entries(SCRIPTURE_TRAVERSALS).find(([key]) => {
    return normalized.includes(key.replace(/_/g, ' ')) || key.includes(normalized);
  });

  return {
    topic,
    traversal: traversal ? traversal[1] : [],
    guidance: TRAVERSAL_GUIDANCE,
    suggestions: {
      readFullChapters: true,
      preserveVerseContext: true,
      preserveHistoricalFlow: true,
      connectScriptureChains: true,
    },
  };
}

module.exports = {
  buildScriptureTraversal,
  SCRIPTURE_TRAVERSALS,
  TRAVERSAL_GUIDANCE,
};
