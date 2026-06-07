/**
 * Approved Evidence Cards — frozen doctrine assets for OpenAI composer (facts only).
 */

const { isTopicApprovedFrozen, assertNoAutomaticCardMutation } = require('../approvedDoctrineRegistry');

const CARD_MODULES = {
  sabbath: require('./sabbath.card'),
  dietaryLaw: require('./dietaryLaw.card'),
  heavens: require('./heavens.card'),
  kingdom: require('./kingdom.card'),
  deathState: require('./deathState.card'),
  messiahLogos: require('./messiahLogos.card'),
  lawCommandments: require('./lawCommandments.card'),
  feasts: require('./feasts.card'),
  traditions: require('./traditions.card'),
};

const TOPIC_TO_CARD = {
  sabbath: 'sabbath',
  dietary_law: 'dietaryLaw',
  heavens: 'heavens',
  kingdom: 'kingdom',
  death_state: 'deathState',
  messiah_logos: 'messiahLogos',
  law_commandments: 'lawCommandments',
  feasts: 'feasts',
  feast_days: 'feasts',
  traditions: 'traditions',
  acts_10_clarification: 'dietaryLaw',
  isaiah_66_17: 'dietaryLaw',
};

const MESSAGE_PATTERNS = [
  { cardId: 'sabbath', re: /\bsabbath\b/i },
  { cardId: 'dietaryLaw', re: /\b(pork|swine|shrimp|unclean|dietary|acts\s*10|isaiah\s*66)\b/i },
  { cardId: 'heavens', re: /\b(heaven|heavens|third heaven|firmament|no man hath ascended)\b/i },
  {
    cardId: 'kingdom',
    re: /\b(kingdom|thy kingdom come|new jerusalem|kingdom come|kingdom of heaven|where i go ye cannot come|where i go you cannot come|revelation 21)\b/i,
  },
  { cardId: 'deathState', re: /\b(die|death|soul|grave|sleep)\b/i },
  { cardId: 'messiahLogos', re: /\b(logos|word of god|yahweh|jehovah|jesus).*(old testament|god)|god.*old testament\b/i },
  { cardId: 'lawCommandments', re: /\b(commandments?|ten commandments|law (still|abolished)|matthew 5:17)\b/i },
  { cardId: 'feasts', re: /\b(feast|feasts|leviticus 23|high sabbath|passover|pentecost|tabernacles)\b/i },
  { cardId: 'traditions', re: /\b(easter|christmas|good friday|tradition)\b/i },
];

function cloneFrozenCard(card) {
  return JSON.parse(JSON.stringify(card));
}

function getCardById(cardId) {
  const card = CARD_MODULES[cardId];
  if (!card) return null;
  return cloneFrozenCard(card);
}

function getAllApprovedCards() {
  return Object.keys(CARD_MODULES).map((id) => cloneFrozenCard(CARD_MODULES[id]));
}

function resolveCardIds(topic = '', message = '') {
  const ids = new Set();
  const cardFromTopic = topic && TOPIC_TO_CARD[topic];
  if (cardFromTopic) ids.add(cardFromTopic);

  const lower = String(message || '').toLowerCase();
  for (const { cardId, re } of MESSAGE_PATTERNS) {
    if (re.test(lower)) ids.add(cardId);
  }

  if (/\b(die|death|soul|grave|sleep)\b/i.test(lower) && /\b(heaven|when we die|after death)\b/i.test(lower)) {
    ids.add('deathState');
  }

  return [...ids].slice(0, 2);
}

/**
 * Retrieve up to 2 approved frozen Evidence Cards for a turn.
 */
function retrieveEvidenceCards({ topic = '', message = '' } = {}) {
  const cardIds = resolveCardIds(topic, message);
  const cards = cardIds.map((id) => getCardById(id)).filter(Boolean);

  for (const card of cards) {
    if (!isTopicApprovedFrozen(card.topic)) {
      throw new Error(`Evidence card topic not in approved registry: ${card.topic}`);
    }
  }

  return cards;
}

/**
 * Build composer-safe card payload (no automatic mutation).
 */
function buildEvidenceCardPayload(cards = [], reinforcement = []) {
  assertNoAutomaticCardMutation({ cards, reinforcement });
  return {
    cards: cards.map((c) => ({
      topic: c.topic,
      cardId: c.cardId,
      approved: true,
      status: c.status,
      questionTypes: c.questionTypes,
      references: {
        primary: c.primaryScriptures,
        supporting: c.supportingScriptures,
      },
      cautionPassages: c.cautionPassages,
      commonMisreadings: c.commonMisreadings,
      bibleFirstConclusion: c.bibleFirstConclusion,
      historySecondaryNotes: c.historySecondaryNotes,
      confidence: c.confidence,
      conflictRisk: c.conflictRisk,
    })),
    reinforcement,
    authorship: 'evidence_only_not_final_prose',
  };
}

module.exports = {
  retrieveEvidenceCards,
  buildEvidenceCardPayload,
  getCardById,
  getAllApprovedCards,
  resolveCardIds,
  TOPIC_TO_CARD,
};
