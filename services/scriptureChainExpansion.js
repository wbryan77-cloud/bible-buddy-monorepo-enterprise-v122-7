const { BIBLE_TOPIC_CATALOG } = require('./bibleTopicCatalog');

const EXPANSION_TO_CATALOG_KEY = {
  sabbath: 'sabbath',
  dietaryLaw: 'dietaryLaw',
  feastDays: 'feastDaysHighSabbaths',
  traditions: 'traditionsOfMen',
  resurrection: 'resurrectionTimeline',
};

const SCRIPTURE_CHAINS = Object.fromEntries(
  Object.entries(EXPANSION_TO_CATALOG_KEY).map(([expansionKey, catalogKey]) => [
    expansionKey,
    BIBLE_TOPIC_CATALOG[catalogKey]?.scriptureChain || [],
  ])
);

function getScriptureChain(topic = '') {
  return SCRIPTURE_CHAINS[topic] || [];
}

module.exports = {
  SCRIPTURE_CHAINS,
  getScriptureChain,
};
