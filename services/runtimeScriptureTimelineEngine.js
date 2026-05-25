const SCRIPTURE_TIMELINES = {
  genesis_to_exodus: {
    sequence: [
      'Creation',
      'Adam and Eve',
      'Noah and the Flood',
      'Tower of Babel',
      'Abraham',
      'Isaac',
      'Jacob',
      'Joseph',
      'Exodus from Egypt'
    ],
    scriptures: [
      'Genesis 1-11',
      'Genesis 12-50',
      'Exodus 1-14'
    ]
  },
  kingdom_and_prophets: {
    sequence: [
      'Judges',
      'Saul',
      'David',
      'Solomon',
      'Divided Kingdom',
      'Major Prophets',
      'Minor Prophets'
    ],
    scriptures: [
      '1 Samuel',
      '2 Samuel',
      '1 Kings',
      '2 Kings',
      'Isaiah',
      'Jeremiah',
      'Ezekiel',
      'Daniel'
    ]
  },
  messiah_and_assemblies: {
    sequence: [
      'Birth of Jesus Christ',
      'Ministry of Jesus Christ',
      'Death and Resurrection',
      'Acts Assemblies',
      'Pauline Letters',
      'General Epistles',
      'Revelation'
    ],
    scriptures: [
      'Matthew',
      'Mark',
      'Luke',
      'John',
      'Acts',
      'Romans-Revelation'
    ]
  }
};

const TIMELINE_GUIDANCE = {
  scriptureFirst: true,
  preserveChronologicalFlow: true,
  preserveGenesisToRevelationStructure: true,
  preserveNarrativeContinuity: true,
  preserveHistoricalContext: true,
  avoidFragmentedTimelineRendering: true,
};

function buildScriptureTimeline(topic = '') {
  const normalized = String(topic || '').toLowerCase();

  const timeline = Object.entries(SCRIPTURE_TIMELINES).find(([key]) => {
    return normalized.includes(key.replace(/_/g, ' ')) || key.includes(normalized);
  });

  return {
    topic,
    timeline: timeline ? timeline[1] : null,
    guidance: TIMELINE_GUIDANCE,
    recommendations: {
      preserveChronologicalContinuity: true,
      preserveScriptureConnections: true,
      preserveHistoricalNarrative: true,
      connectOldAndNewTestamentFlow: true,
    },
  };
}

module.exports = {
  buildScriptureTimeline,
  SCRIPTURE_TIMELINES,
  TIMELINE_GUIDANCE,
};
