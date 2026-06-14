/**
 * Phase 4O — Natural-language Bible concept synonym map and witness registry.
 */

const CONCEPTS = {
  dietary_pork_unclean: {
    id: 'dietary_pork_unclean',
    strictTopic: 'dietary_law',
    polarity: 'no',
    synonyms: [
      /\bcan we eat pork\b/i,
      /\bcan (christians|we) eat pork\b/i,
      /\beat pork\b/i,
      /\bpork\b/i,
      /\bswine\b/i,
      /\bshellfish\b/i,
      /\bunclean food\b/i,
      /\bclean and unclean\b/i,
      /\bdietary law\b/i,
      /\bleviticus\s*11\b/i,
      /\bdeuteronomy\s*14\b/i,
      /\bisaiah\s*66:?\s*17\b/i,
      /\bso are you saying\b.*\b(pork|swine|eat)\b/i,
      /\bare you saying\b.*\b(eat pork|can eat)\b/i,
    ],
    directWitnesses: [
      'Leviticus 11:7-8',
      'Deuteronomy 14:8',
      'Leviticus 11',
      'Deuteronomy 14',
      'Isaiah 66:17',
      'Acts 10:14',
      'Acts 10:28',
    ],
    supportingWitnesses: ['Daniel 1:8-16', 'Acts 11:1-18'],
    directAnswer:
      'No. According to Scripture, pork is unclean. Leviticus 11:7-8 and Deuteronomy 14:8 say swine is unclean and shall not be eaten. Isaiah 66:17 also treats eating swine’s flesh seriously in judgment.',
  },
  fornication_sexual_sin: {
    id: 'fornication_sexual_sin',
    strictTopic: null,
    polarity: 'no',
    synonyms: [
      /\bfornication\b/i,
      /\bsex without marriage\b/i,
      /\bsex before marriage\b/i,
      /\bpremarital sex\b/i,
      /\bsexual relations without marriage\b/i,
      /\bsleeping together\b/i,
      /\bwhoremonger/i,
      /\bsexual immorality\b/i,
      /\bcan we have sex\b/i,
      /\bcan we have sex without marriage\b/i,
      /\badultery\b/i,
      /\bmore scriptures?\b.*\b(sex before marriage|premarital|fornication)\b/i,
      /\babout fornication\b/i,
      /\banother verse\b.*\bfornication\b/i,
    ],
    directWitnesses: [
      '1 Corinthians 6:18',
      '1 Thessalonians 4:3-5',
      'Hebrews 13:4',
      'Ephesians 5:3',
      'Galatians 5:19-21',
    ],
    supportingWitnesses: ['Matthew 15:19', 'Acts 15:20', 'Acts 15:29'],
    directAnswer:
      'No. Scripture calls sexual relations outside marriage fornication and commands believers to flee it. 1 Corinthians 6:18 says flee fornication, 1 Thessalonians 4:3-5 commands believers to possess their vessel in sanctification, and Hebrews 13:4 honors the marriage bed while warning that whoremongers and adulterers God will judge.',
  },
  kingdom_on_earth: {
    id: 'kingdom_on_earth',
    strictTopic: 'kingdom',
    polarity: 'yes',
    synonyms: [
      /\bheaven on earth\b/i,
      /\bkingdom on earth\b/i,
      /\bkingdom coming here\b/i,
      /\bkingdom come here\b/i,
      /\bkingdom coming to earth\b/i,
      /\bman staying on earth\b/i,
      /\bmen staying on earth\b/i,
      /\bpeople staying on earth\b/i,
      /\breign on earth\b/i,
      /\bmeek inherit\b.*\bearth\b/i,
      /\bkingdom under\b.*\bheaven\b/i,
      /\bnew jerusalem\b.*\b(come|comes) down\b/i,
      /\bnew jerusalem comes down\b/i,
      /\bmore scriptures?\b.*\b(man staying on earth|kingdom coming)\b/i,
      /\bkingdom coming\b/i,
      /\bthy kingdom come\b/i,
    ],
    directWitnesses: [
      'Matthew 6:10',
      'Revelation 5:10',
      'Revelation 21:1-3',
      'Daniel 7:27',
      'Psalm 37:9-11',
      'Matthew 5:5',
    ],
    supportingWitnesses: ['Proverbs 10:30', 'Isaiah 11:9', 'Luke 17:20-21'],
    directAnswer:
      'Yes — Scripture points to God’s kingdom coming to earth, not man permanently escaping earth. Matthew 6:10 says God’s will is to be done in earth as in heaven. Revelation 5:10 says the saints shall reign on the earth. Revelation 21:1-3 shows New Jerusalem coming down from God out of heaven and God dwelling with men.',
  },
  heaven_layers: {
    id: 'heaven_layers',
    strictTopic: null,
    polarity: null,
    synonyms: [
      /\bthird heaven\b/i,
      /\bthree heavens\b/i,
      /\bheavens\b/i,
      /\bheaven and earth\b/i,
    ],
    directWitnesses: ['2 Corinthians 12:2', 'Genesis 1:1', 'Deuteronomy 10:14'],
    supportingWitnesses: ['Psalm 115:16', 'Isaiah 66:1'],
    directAnswer:
      'Scripture speaks of heavens and earth as God’s creation. Paul mentions a third heaven in 2 Corinthians 12:2. Genesis 1:1 and Deuteronomy 10:14 frame heaven and earth as distinct realms under God.',
  },
  ten_commandments: {
    id: 'ten_commandments',
    strictTopic: null,
    polarity: null,
    synonyms: [
      /\b10 commandments\b/i,
      /\bten commandments\b/i,
      /\bdecalogue\b/i,
      /\bwhat are the commandments\b/i,
    ],
    directWitnesses: ['Exodus 20', 'Deuteronomy 5', 'Exodus 34:28'],
    supportingWitnesses: ['Matthew 5:17-19', 'Romans 13:9'],
    directAnswer:
      'The ten commandments are recorded in Exodus 20 and repeated in Deuteronomy 5. Exodus 34:28 calls them the ten commandments.',
  },
  death_state: {
    id: 'death_state',
    strictTopic: 'death_state',
    polarity: null,
    synonyms: [
      /\bwhat happens when\b.*\bdies\b/i,
      /\bwhen (someone|a person) dies\b/i,
      /\bdead know nothing\b/i,
      /\bdeath as sleep\b/i,
      /\bdead\b.*\bresurrection\b/i,
    ],
    directWitnesses: [
      'Ecclesiastes 9:5',
      'Psalm 146:4',
      'John 11:11-14',
      '1 Thessalonians 4:13-16',
    ],
    supportingWitnesses: ['Daniel 12:2', '1 Corinthians 15'],
    directAnswer:
      'Scripture describes death as sleep until resurrection. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. John 11:11-14 calls death sleep.',
  },
  acts_10: {
    id: 'acts_10',
    strictTopic: 'acts_10',
    polarity: 'no',
    synonyms: [
      /\bacts\s*10\b/i,
      /\bpeter'?s?\s+vision\b/i,
      /\bgentiles\b.*\bacts\s*10\b/i,
      /\bfood is clean\b/i,
      /\bacts\s*10 mean\b/i,
    ],
    directWitnesses: ['Acts 10:28', 'Acts 10:14', 'Acts 10:34-35', 'Acts 11:1-18'],
    supportingWitnesses: [],
    directAnswer:
      'No. Acts 10 is about people and Gentiles, not permission to eat unclean foods. Peter explains the vision in Acts 10:28 — God showed him not to call any man common or unclean.',
  },
  sabbath: {
    id: 'sabbath',
    strictTopic: 'sabbath',
    polarity: null,
    synonyms: [
      /\bsabbath\b/i,
      /\bseventh day\b/i,
      /\bfourth commandment\b/i,
      /\bkeep the sabbath\b/i,
    ],
    directWitnesses: ['Exodus 20:8-11', 'Deuteronomy 5:12-15', 'Isaiah 58:13-14'],
    supportingWitnesses: ['Mark 2:27-28', 'Luke 4:16'],
    directAnswer:
      'Scripture identifies the seventh day as the Sabbath of the LORD your God in Exodus 20:8-11 and Deuteronomy 5:12-15.',
  },
};

const CONTINUATION_PHRASE_RE =
  /\b(show me another|give me another|another verse|another witness|more scriptures?|more verses?|give me more|continue)\b/i;

const EXPLICIT_TOPIC_RE = [
  /\babout\s+(\w+(?:\s+\w+){0,4})\b/i,
  /\bon\s+(sex before marriage|premarital sex|fornication|pork|kingdom|sabbath|death)\b/i,
  /\bwith\s+(man staying on earth|kingdom coming)\b/i,
  /\bfornication\b/i,
  /\bsex before marriage\b/i,
  /\bkingdom coming\b/i,
  /\bman staying on earth\b/i,
];

function normalizeMessage(message = '') {
  return String(message || '').trim();
}

function matchesConcept(message, concept) {
  return concept.synonyms.some((re) => re.test(message));
}

function detectBibleConcept(message = '') {
  const m = normalizeMessage(message);
  if (!m) return null;

  const order = [
    'acts_10',
    'dietary_pork_unclean',
    'fornication_sexual_sin',
    'kingdom_on_earth',
    'death_state',
    'sabbath',
    'ten_commandments',
    'heaven_layers',
  ];

  for (const id of order) {
    if (matchesConcept(m, CONCEPTS[id])) return CONCEPTS[id];
  }
  return null;
}

function hasExplicitConcept(message = '') {
  const m = normalizeMessage(message);
  if (!m) return false;
  if (detectBibleConcept(m)) return true;
  for (const re of EXPLICIT_TOPIC_RE) {
    if (re.test(m)) return true;
  }
  return false;
}

function detectConceptFromContinuation(message = '') {
  const m = normalizeMessage(message);
  if (!m || !CONTINUATION_PHRASE_RE.test(m)) return null;
  return detectBibleConcept(m);
}

function getConceptSynonyms(concept) {
  const c = typeof concept === 'string' ? CONCEPTS[concept] : concept;
  if (!c) return [];
  return c.synonyms.map((re) => re.source);
}

function getConceptWitnesses(concept) {
  const c = typeof concept === 'string' ? CONCEPTS[concept] : concept;
  if (!c) return { direct: [], supporting: [] };
  return {
    direct: [...(c.directWitnesses || [])],
    supporting: [...(c.supportingWitnesses || [])],
    all: [...(c.directWitnesses || []), ...(c.supportingWitnesses || [])],
  };
}

function getConceptById(id) {
  return CONCEPTS[id] || null;
}

module.exports = {
  CONCEPTS,
  detectBibleConcept,
  hasExplicitConcept,
  detectConceptFromContinuation,
  getConceptSynonyms,
  getConceptWitnesses,
  getConceptById,
  CONTINUATION_PHRASE_RE,
};
