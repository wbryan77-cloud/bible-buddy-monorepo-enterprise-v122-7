const SCRIPTURE_CHAINS = {
  creation_chain: [
    'Genesis 1',
    'Genesis 2',
    'John 1:1-5',
    'Colossians 1:16-17',
    'Revelation 21'
  ],
  kingdom_chain: [
    'Daniel 2',
    'Daniel 7',
    'Isaiah 9:6-7',
    'Luke 1:31-33',
    'Revelation 11:15'
  ],
  sabbath_chain: [
    'Genesis 2:1-3',
    'Exodus 20:8-11',
    'Isaiah 58:13-14',
    'Mark 2:27-28',
    'Hebrews 4:9'
  ],
  covenant_chain: [
    'Genesis 12',
    'Genesis 17',
    'Exodus 19',
    'Jeremiah 31',
    'Hebrews 8'
  ],
  restoration_chain: [
    'Isaiah 65',
    'Ezekiel 37',
    'Acts 3:19-21',
    'Revelation 21',
    'Revelation 22'
  ]
};

const RENDER_GUIDANCE = {
  scriptureFirst: true,
  preserveVerseContinuity: true,
  preserveChapterFlow: true,
  preserveGenesisToRevelationStructure: true,
  preserveLineUponLineStructure: true,
  avoidFragmentedScriptureRendering: true,
};

function renderScriptureChain(chain = '') {
  const normalized = String(chain || '').toLowerCase();

  const result = Object.entries(SCRIPTURE_CHAINS).find(([key]) => {
    return normalized.includes(key.replace(/_/g, ' ')) || key.includes(normalized);
  });

  return {
    chain,
    scriptures: result ? result[1] : [],
    guidance: RENDER_GUIDANCE,
    recommendations: {
      preserveNarrativeFlow: true,
      readFullSections: true,
      preserveHistoricalContext: true,
      preserveScriptureInterconnection: true,
    },
  };
}

module.exports = {
  renderScriptureChain,
  SCRIPTURE_CHAINS,
  RENDER_GUIDANCE,
};
