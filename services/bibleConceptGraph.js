/**
 * Phase 5A — Bible concept graph (extends Phase 4O concordance).
 */

const {
  CONCEPTS,
  detectBibleConcept,
  hasExplicitConcept,
  detectConceptFromContinuation,
  getConceptWitnesses,
  getConceptById,
  CONTINUATION_PHRASE_RE,
} = require('./bibleConceptConcordance');

const GRAPH_EXTENSIONS = {
  dietary_clean_unclean: {
    id: 'dietary_clean_unclean',
    strictTopic: 'dietary_law',
    polarity: null,
    relatedConcepts: ['dietary_pork_unclean', 'acts_10'],
    forbiddenConfusions: ['acts_10 means all food clean'],
    synonyms: [
      /\bclean and unclean animals\b/i,
      /\bclean meats\b/i,
      /\bunclean meats\b/i,
      /\bleviticus\s*11\b/i,
      /\bdeuteronomy\s*14\b/i,
    ],
    directWitnesses: ['Leviticus 11', 'Deuteronomy 14', 'Daniel 1:8-16'],
    supportingWitnesses: ['Acts 10:14', 'Acts 10:28'],
    directAnswer:
      'Scripture distinguishes clean and unclean animals in Leviticus 11 and Deuteronomy 14.',
    examples: ['clean and unclean', 'dietary law in Scripture'],
  },
  marriage_bed: {
    id: 'marriage_bed',
    strictTopic: null,
    polarity: 'yes',
    relatedConcepts: ['fornication_sexual_sin'],
    forbiddenConfusions: ['fornication permitted'],
    synonyms: [
      /\bmarriage bed\b/i,
      /\bhonor marriage\b/i,
      /\bmarriage is honorable\b/i,
      /\bhebrews\s*13:?\s*4\b/i,
    ],
    directWitnesses: ['Hebrews 13:4', 'Genesis 2:24', 'Matthew 19:5-6'],
    supportingWitnesses: ['1 Corinthians 7:2-3', 'Ephesians 5:31-33'],
    directAnswer:
      'Yes — Scripture honors marriage. Hebrews 13:4 says marriage is honorable in all, and the bed undefiled.',
    examples: ['what Scripture says about marriage'],
  },
  new_jerusalem: {
    id: 'new_jerusalem',
    strictTopic: 'new_jerusalem',
    polarity: 'yes',
    relatedConcepts: ['kingdom_on_earth', 'heaven_layers'],
    forbiddenConfusions: ['believers leave earth permanently'],
    synonyms: [
      /\bnew jerusalem\b/i,
      /\bholy city\b.*\b(come|comes) down\b/i,
      /\bnew jerusalem comes down\b/i,
    ],
    directWitnesses: ['Revelation 21:1-3', 'Revelation 21:2', 'Revelation 22:1-5'],
    supportingWitnesses: ['Isaiah 65:17-19', 'Hebrews 11:10'],
    directAnswer:
      'Yes — Revelation 21:1-3 shows New Jerusalem coming down from God out of heaven, and God dwelling with men.',
    examples: ['New Jerusalem coming down'],
  },
  prayer_comfort: {
    id: 'prayer_comfort',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['heartbreak_comfort'],
    forbiddenConfusions: [],
    synonyms: [
      /\bpray with me\b/i,
      /\bneed prayer\b/i,
      /\bhelp me pray\b/i,
      /\bprayer for\b/i,
    ],
    directWitnesses: ['Philippians 4:6-7', 'Matthew 6:9-13', 'James 5:16'],
    supportingWitnesses: ['Psalm 55:22', '1 Peter 5:7'],
    directAnswer:
      'I’m here to pray with you. Scripture invites us to cast our care upon God — Philippians 4:6-7 and 1 Peter 5:7.',
    examples: ['pray with me', 'I need prayer'],
  },
  heartbreak_comfort: {
    id: 'heartbreak_comfort',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['prayer_comfort'],
    forbiddenConfusions: [],
    synonyms: [
      /\blove life\b/i,
      /\bheartbreak\b/i,
      /\bheart is breaking\b/i,
      /\bcrashing\b/i,
      /\bbroken heart\b/i,
      /\blife is crashing\b/i,
    ],
    directWitnesses: ['Psalm 34:18', '1 Peter 5:7', 'Psalm 147:3'],
    supportingWitnesses: ['Isaiah 61:1-3', 'Matthew 5:4'],
    directAnswer:
      'I’m sorry that hurts. Psalm 34:18 says the LORD is nigh unto them that are of a broken heart.',
    examples: ['love life is crashing', 'heartbreak'],
  },
};

const MERGED_GRAPH = { ...CONCEPTS };
for (const [id, node] of Object.entries(GRAPH_EXTENSIONS)) {
  MERGED_GRAPH[id] = { ...node, id };
}

const DETECTION_ORDER = [
  'acts_10',
  'dietary_pork_unclean',
  'dietary_clean_unclean',
  'fornication_sexual_sin',
  'marriage_bed',
  'kingdom_on_earth',
  'new_jerusalem',
  'death_state',
  'sabbath',
  'ten_commandments',
  'heaven_layers',
  'heartbreak_comfort',
  'prayer_comfort',
];

function matchesNode(message, node) {
  return (node.synonyms || []).some((re) => re.test(message));
}

function detectConceptFromGraph(message = '') {
  const m = String(message || '').trim();
  if (!m) return null;

  const fromConcordance = detectBibleConcept(m);
  if (fromConcordance) return enrichNode(fromConcordance.id);

  for (const id of DETECTION_ORDER) {
    const node = MERGED_GRAPH[id];
    if (node && matchesNode(m, node)) return enrichNode(id);
  }
  return null;
}

function enrichNode(id) {
  const base = MERGED_GRAPH[id] || getConceptById(id);
  if (!base) return null;
  return {
    ...base,
    id: base.id || id,
    relatedConcepts: base.relatedConcepts || GRAPH_EXTENSIONS[id]?.relatedConcepts || [],
    forbiddenConfusions: base.forbiddenConfusions || GRAPH_EXTENSIONS[id]?.forbiddenConfusions || [],
    examples: base.examples || GRAPH_EXTENSIONS[id]?.examples || [],
  };
}

function getGraphNode(conceptId) {
  return enrichNode(conceptId);
}

function getRelatedConcepts(conceptId) {
  const node = enrichNode(conceptId);
  if (!node) return [];
  return (node.relatedConcepts || [])
    .map((id) => enrichNode(id))
    .filter(Boolean);
}

function getGraphWitnesses(conceptId) {
  const node = enrichNode(conceptId);
  if (!node) return getConceptWitnesses(conceptId);
  return {
    direct: [...(node.directWitnesses || [])],
    supporting: [...(node.supportingWitnesses || [])],
    all: [...(node.directWitnesses || []), ...(node.supportingWitnesses || [])],
  };
}

function resolveConceptAlias(message = '') {
  return detectConceptFromGraph(message) || detectConceptFromContinuation(message);
}

module.exports = {
  MERGED_GRAPH,
  GRAPH_EXTENSIONS,
  detectConceptFromGraph,
  resolveConceptAlias,
  getGraphNode,
  getRelatedConcepts,
  getGraphWitnesses,
  enrichNode,
  hasExplicitConcept,
  CONTINUATION_PHRASE_RE,
  detectConceptFromContinuation,
};
