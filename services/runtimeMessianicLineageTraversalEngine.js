const MESSIANIC_LINEAGE_TRAVERSALS = {
  adam_to_messiah: {
    chain: [
      'Adam',
      'Seth',
      'Noah',
      'Shem',
      'Abraham',
      'Isaac',
      'Jacob',
      'Judah',
      'David',
      'Solomon',
      'Joseph',
      'Jesus Christ'
    ],
    scriptures: [
      'Genesis 5',
      'Genesis 11',
      'Genesis 12',
      'Genesis 49:10',
      '2 Samuel 7:12-16',
      'Isaiah 11:1-10',
      'Matthew 1:1-17',
      'Luke 3:23-38'
    ]
  },
  messiah_and_disciples: {
    chain: [
      'Jesus Christ',
      'Peter',
      'Andrew',
      'James',
      'John',
      'Philip',
      'Bartholomew',
      'Thomas',
      'Matthew',
      'James son of Alphaeus',
      'Simon Zelotes',
      'Jude',
      'Matthias'
    ],
    scriptures: [
      'Matthew 10:1-4',
      'Mark 3:13-19',
      'Luke 6:12-16',
      'Acts 1:21-26'
    ]
  },
  paul_and_timothy: {
    chain: [
      'Jesus Christ',
      'Paul',
      'Timothy',
      'Titus'
    ],
    scriptures: [
      'Acts 9',
      'Acts 16:1-3',
      '1 Timothy 1:1-2',
      '2 Timothy 1:1-5',
      'Titus 1:1-4'
    ]
  },
  revelation_continuity: {
    chain: [
      'Jesus Christ',
      'The Apostles',
      'The Seven Churches',
      'The Kingdom of God',
      'New Jerusalem'
    ],
    scriptures: [
      'Revelation 1:1-20',
      'Revelation 2',
      'Revelation 3',
      'Revelation 21',
      'Revelation 22'
    ]
  }
};

const LINEAGE_GUIDANCE = {
  scriptureFirst: true,
  preserveGenesisToRevelationContinuity: true,
  preserveLineUponLineStructure: true,
  preserveGenealogicalContext: true,
  preserveNarrativeFlow: true,
  avoidFragmentedLineageRendering: true,
};

function buildMessianicLineageTraversal(topic = '') {
  const normalized = String(topic || '').toLowerCase();

  const traversal = Object.entries(MESSIANIC_LINEAGE_TRAVERSALS).find(([key]) => {
    return normalized.includes(key.replace(/_/g, ' ')) || key.includes(normalized);
  });

  return {
    topic,
    traversal: traversal ? traversal[1] : null,
    guidance: LINEAGE_GUIDANCE,
    recommendations: {
      preserveChapterContinuity: true,
      readConnectedGenealogies: true,
      preserveScriptureFlow: true,
      connectOldAndNewTestamentContinuity: true,
    },
  };
}

module.exports = {
  buildMessianicLineageTraversal,
  MESSIANIC_LINEAGE_TRAVERSALS,
  LINEAGE_GUIDANCE,
};
