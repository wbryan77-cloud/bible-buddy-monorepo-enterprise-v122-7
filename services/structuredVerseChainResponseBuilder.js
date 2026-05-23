function buildStructuredVerseChainResponse({ topic, verses = [], parallels = [], continuity = {} }) {
  return {
    topic,
    scriptureChain: verses,
    parallelVerses: parallels,
    continuity,
    responseMode: 'structured_scripture_chain'
  };
}

module.exports = { buildStructuredVerseChainResponse };
