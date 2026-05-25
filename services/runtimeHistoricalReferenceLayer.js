const HISTORICAL_REFERENCE_TOPICS = {
  second_temple_period: {
    references: [
      'Josephus - Antiquities of the Jews',
      'Josephus - Wars of the Jews',
      'Tacitus - Histories',
      'Dead Sea Scroll references'
    ],
    scriptures: [
      'Daniel 9',
      'Matthew 24',
      'Luke 21'
    ]
  },
  judea_and_jerusalem: {
    references: [
      'Roman historical records',
      'Josephus historical references',
      'Archaeological references'
    ],
    scriptures: [
      '1 Kings 12',
      'Jeremiah 3',
      'Ezekiel 37'
    ]
  },
  edom_and_idumea: {
    references: [
      'Josephus references to Idumea',
      'Greco-Roman geography references',
      'Historical maps of Edom and Idumea'
    ],
    scriptures: [
      'Genesis 36',
      'Obadiah 1',
      'Malachi 1:2-4'
    ]
  },
  kingdom_prophecy_history: {
    references: [
      'Babylonian Empire records',
      'Medo-Persian historical references',
      'Greek Empire references',
      'Roman Empire references'
    ],
    scriptures: [
      'Daniel 2',
      'Daniel 7',
      'Revelation 13'
    ]
  }
};

const HISTORY_GUIDANCE = {
  scriptureFirst: true,
  separateHistoryFromScripture: true,
  preserveHistoricalNeutrality: true,
  requirePrimarySourceReferences: true,
  preserveGenesisToRevelationFlow: true,
  avoidHistoricalDogmatism: true,
};

function buildHistoricalReferenceLayer(topic = '') {
  const normalized = String(topic || '').toLowerCase();

  const layer = Object.entries(HISTORICAL_REFERENCE_TOPICS).find(([key]) => {
    return normalized.includes(key.replace(/_/g, ' ')) || key.includes(normalized);
  });

  return {
    topic,
    historicalLayer: layer ? layer[1] : null,
    guidance: HISTORY_GUIDANCE,
    recommendations: {
      separateScriptureFromHistory: true,
      usePrimarySources: true,
      preserveHistoricalContext: true,
      avoidUnsupportedClaims: true,
    },
  };
}

module.exports = {
  buildHistoricalReferenceLayer,
  HISTORICAL_REFERENCE_TOPICS,
  HISTORY_GUIDANCE,
};
