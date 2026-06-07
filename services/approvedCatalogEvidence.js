/**
 * Approved teaching chains from deathResurrectionKingdomCatalog — evidence only, not prose.
 */

const { DEATH_RESURRECTION_KINGDOM_CATALOG } = require('./deathResurrectionKingdomCatalog');

const TOPIC_TO_CATALOG_KEY = {
  heavens: 'threeHeavens',
  kingdom: 'kingdomComesToEarth',
  death_state: 'stateOfTheDead',
};

const MESSAGE_CATALOG_TRIGGERS = [
  { catalogKey: 'threeHeavens', re: /\b(heaven|heavens|third heaven|no man hath ascended|firmament)\b/i },
  {
    catalogKey: 'kingdomComesToEarth',
    re: /\b(kingdom|thy kingdom come|new jerusalem|kingdom come|revelation 21|where i go ye cannot come|where i go you cannot come|believers? going to heaven)\b/i,
  },
  {
    catalogKey: 'stateOfTheDead',
    re: /\b(die|death|sleep in death|absent from the body|2 corinthians 5:8|soul|grave)\b/i,
  },
];

function getCatalogEntry(catalogKey) {
  return DEATH_RESURRECTION_KINGDOM_CATALOG[catalogKey] || null;
}

function resolveCatalogKeys({ topic = '', message = '', cardTopics = [] } = {}) {
  const keys = new Set();
  const topicKey = TOPIC_TO_CATALOG_KEY[topic];
  if (topicKey) keys.add(topicKey);

  for (const ct of cardTopics) {
    const k = TOPIC_TO_CATALOG_KEY[ct];
    if (k) keys.add(k);
  }

  const msg = String(message || '');
  for (const { catalogKey, re } of MESSAGE_CATALOG_TRIGGERS) {
    if (re.test(msg)) keys.add(catalogKey);
  }

  return [...keys];
}

function buildApprovedCatalogEvidence({ topic = '', message = '', cardTopics = [] } = {}) {
  const catalogKeys = resolveCatalogKeys({ topic, message, cardTopics });
  const chains = catalogKeys
    .map((key) => {
      const entry = getCatalogEntry(key);
      if (!entry) return null;
      return {
        catalogKey: key,
        title: entry.title,
        teachingOrder: entry.teachingOrder || [],
        themes: entry.themes || [],
        authorship: 'approved_catalog_evidence_only',
      };
    })
    .filter(Boolean);

  return {
    chains,
    catalogKeys,
    wired: chains.length > 0,
  };
}

function collectApprovedReferences(catalogEvidence = {}, cards = []) {
  const refs = new Set();
  for (const chain of catalogEvidence.chains || []) {
    for (const ref of chain.teachingOrder || []) refs.add(ref);
  }
  for (const card of cards) {
    const primary = card.primaryScriptures || card.references?.primary || [];
    const supporting = card.supportingScriptures || card.references?.supporting || [];
    for (const ref of primary) refs.add(ref);
    for (const ref of supporting) refs.add(ref);
    for (const item of card.cautionScriptures || []) {
      if (typeof item === 'string') refs.add(item);
      else if (item?.reference) refs.add(item.reference);
    }
  }
  return [...refs];
}

module.exports = {
  TOPIC_TO_CATALOG_KEY,
  buildApprovedCatalogEvidence,
  collectApprovedReferences,
  getCatalogEntry,
  resolveCatalogKeys,
};
