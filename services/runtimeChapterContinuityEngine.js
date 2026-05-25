const CHAPTER_CONTINUITIES = {
  genesis_foundation: {
    chapters: ['Genesis 1', 'Genesis 2', 'Genesis 3'],
    focus: 'Creation, mankind, fall, restoration foundation'
  },
  exodus_deliverance: {
    chapters: ['Exodus 12', 'Exodus 19', 'Exodus 20'],
    focus: 'Deliverance, covenant, commandments'
  },
  leviticus_appointed_times: {
    chapters: ['Leviticus 11', 'Leviticus 23'],
    focus: 'Dietary instructions and appointed times'
  },
  kingdom_prophecy: {
    chapters: ['Daniel 2', 'Daniel 7', 'Revelation 11'],
    focus: 'Kingdom progression and prophecy continuity'
  },
  restoration_flow: {
    chapters: ['Isaiah 65', 'Ezekiel 37', 'Revelation 21'],
    focus: 'Restoration and future kingdom continuity'
  }
};

const CONTINUITY_GUIDANCE = {
  scriptureFirst: true,
  preserveChapterFlow: true,
  preserveNarrativeContinuity: true,
  preserveGenesisToRevelationStructure: true,
  preserveLineUponLineStructure: true,
  avoidIsolatedVerseUsage: true,
};

function buildChapterContinuity(topic = '') {
  const normalized = String(topic || '').toLowerCase();

  const continuity = Object.entries(CHAPTER_CONTINUITIES).find(([key]) => {
    return normalized.includes(key.replace(/_/g, ' ')) || key.includes(normalized);
  });

  return {
    topic,
    continuity: continuity ? continuity[1] : null,
    guidance: CONTINUITY_GUIDANCE,
    recommendations: {
      readEntireChapter: true,
      preserveContextBeforeAfter: true,
      preserveHistoricalNarrative: true,
      preserveScriptureConnections: true,
    },
  };
}

module.exports = {
  buildChapterContinuity,
  CHAPTER_CONTINUITIES,
  CONTINUITY_GUIDANCE,
};
