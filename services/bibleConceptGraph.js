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
    helperOnly: true,
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
    directAnswer: null,
    examples: ['pray with me', 'I need prayer'],
  },
  heartbreak_comfort: {
    id: 'heartbreak_comfort',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['prayer_comfort', 'overwhelmed_comfort'],
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
  abomination_desolation: {
    id: 'abomination_desolation',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['millennial_kingdom'],
    forbiddenConfusions: ['dietary_law', 'pork', 'swine', 'shellfish', 'unclean food'],
    synonyms: [
      /\babomination of desolation\b/i,
      /\babomination of desalation\b/i,
      /\babomination\b.*\bdaniel\b/i,
      /\bdaniel\b.*\babomination\b/i,
      /\babomination\b.*\bdesolation\b/i,
      /\bdesolation\b.*\babomination\b/i,
      /\bstand in the holy place\b/i,
      /\bholy place\b.*\babomination\b/i,
      /\bmatthew\s*24:?\s*15\b/i,
      /\bmark\s*13:?\s*14\b/i,
      /\bdaniel\s*9:?\s*27\b/i,
      /\btalk about by daniel\b/i,
      /\btalked about by daniel\b/i,
      /\babomination talk\b/i,
    ],
    directWitnesses: ['Daniel 9:27', 'Daniel 11:31', 'Daniel 12:11', 'Matthew 24:15', 'Mark 13:14'],
    supportingWitnesses: ['Daniel 8:13', 'Luke 21:20'],
    directAnswer:
      'Scripture shows the abomination of desolation tied to the holy place. Daniel 9:27 speaks of the abomination that maketh desolate; Matthew 24:15 warns when you see the abomination of desolation stand in the holy place; Mark 13:14 says the same.',
    examples: ['abomination talked about by Daniel', 'abomination of desalation'],
    needsHumanReview: true,
  },
  sexual_boundaries_dating: {
    id: 'sexual_boundaries_dating',
    strictTopic: null,
    polarity: 'no',
    relatedConcepts: ['fornication_sexual_sin', 'marriage_bed'],
    forbiddenConfusions: ['sexual mechanics', 'contraception'],
    synonyms: [
      /\bcan you have sex\b/i,
      /\bcan we have sex\b/i,
      /\bmay want to have sex\b/i,
      /\bwant to have sex\b/i,
      /\bsexual intimacy\b/i,
      /\bdating\b.*\bsex\b/i,
      /\bnot ready for sex\b/i,
      /\bpull out\b/i,
      /\bhave a baby\b.*\bsex\b/i,
      /\btry to have a baby\b/i,
    ],
    directWitnesses: ['1 Corinthians 6:18', '1 Thessalonians 4:3-5', 'Hebrews 13:4'],
    supportingWitnesses: ['Ephesians 5:3', 'Galatians 5:19-21'],
    directAnswer:
      'No. Scripture calls believers to flee fornication and honor the marriage bed. 1 Corinthians 6:18 says flee fornication; 1 Thessalonians 4:3-5 commands sanctification and honor; Hebrews 13:4 honors marriage and warns God will judge whoremongers and adulterers. If you are not married or not ready, a clear boundary is: “I want to honor God and wait until marriage.”',
    examples: ['can you have sex', 'if I have sex should I try to have a baby'],
  },
  onan_seed_context: {
    id: 'onan_seed_context',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['marriage_bed'],
    forbiddenConfusions: ['contraception doctrine proof'],
    synonyms: [
      /\bspilled seed\b/i,
      /\bspill.*seed\b/i,
      /\bbrother\b.*\bseed\b/i,
      /\bonan\b/i,
      /\blevirate\b/i,
      /\bgenesis\s*38\b/i,
    ],
    directWitnesses: ['Genesis 38:9-10', 'Genesis 1:28', 'Deuteronomy 25:5-6'],
    supportingWitnesses: ['Genesis 38:8'],
    directAnswer:
      'Genesis 38:9-10 records Onan spilling seed on the ground when he was to raise up seed for his brother under levirate duty — the LORD judged that act. Genesis 1:28 and Deuteronomy 25:5-6 frame bearing seed and brotherly duty in Scripture. Scripture records the event in context; it is not a standalone proof-text for modern contraception debates.',
    examples: ['brother that spilled seed', 'parable about spilled seed'],
    needsHumanReview: true,
  },
  sabbath_seventh_day: {
    id: 'sabbath_seventh_day',
    strictTopic: 'sabbath',
    polarity: null,
    relatedConcepts: ['sabbath', 'sabbath_how_to_keep'],
    forbiddenConfusions: [],
    synonyms: [
      /\blord'?s sabbath\b/i,
      /\bsaturday or sunday\b/i,
      /\bfriday\b.*\bsat\b/i,
      /\bseventh day\b.*\bsabbath\b/i,
      /\bwhich day is the sabbath\b/i,
    ],
    directWitnesses: ['Exodus 20:8-11', 'Deuteronomy 5:12-15'],
    supportingWitnesses: ['Mark 2:27-28', 'Luke 4:16'],
    directAnswer:
      'Scripture identifies the seventh day as the Sabbath of the LORD your God in Exodus 20:8-11 and Deuteronomy 5:12-15 — the seventh day, not the first day of the week.',
    examples: ['Lords Sabbath Friday to Sat or Sunday'],
  },
  sabbath_how_to_keep: {
    id: 'sabbath_how_to_keep',
    strictTopic: 'sabbath',
    polarity: null,
    relatedConcepts: ['sabbath_seventh_day', 'sabbath'],
    forbiddenConfusions: [],
    synonyms: [
      /\bhow are we supposed to keep\b/i,
      /\bhow (do we|should we) keep (it|the sabbath)\b/i,
      /\bhow to keep the sabbath\b/i,
      /\bkeep the sabbath\b/i,
    ],
    directWitnesses: ['Exodus 20:8-11', 'Isaiah 58:13-14'],
    supportingWitnesses: ['Deuteronomy 5:12-15', 'Mark 2:27-28'],
    directAnswer:
      'Scripture says remember the Sabbath day to keep it holy — Exodus 20:8-11. Isaiah 58:13-14 calls honoring the Sabbath a delight and turning from your own ways on that day.',
    examples: ['how are we supposed to keep it'],
  },
  third_heaven: {
    id: 'third_heaven',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['heaven_layers'],
    forbiddenConfusions: ['kingdom_on_earth'],
    synonyms: [/\bthird heaven\b/i, /\bthree heavens\b/i, /\b2 corinthians\s*12:?\s*2\b/i],
    directWitnesses: ['2 Corinthians 12:2'],
    supportingWitnesses: ['Deuteronomy 10:14', 'Genesis 1:1'],
    directAnswer:
      'Paul mentions being caught up to the third heaven in 2 Corinthians 12:2. Scripture distinguishes heavenly realms without replacing the promise of God’s kingdom on earth.',
  },
  millennial_kingdom: {
    id: 'millennial_kingdom',
    strictTopic: 'kingdom',
    polarity: null,
    relatedConcepts: ['kingdom_on_earth'],
    forbiddenConfusions: [],
    synonyms: [/\bmillennium\b/i, /\bmillennial kingdom\b/i, /\bthousand years\b/i, /\bmillium\b/i],
    directWitnesses: ['Revelation 20:4-6'],
    supportingWitnesses: ['Daniel 7:27', 'Revelation 5:10'],
    directAnswer:
      'Revelation 20:4-6 speaks of saints living and reigning a thousand years — Scripture’s millennial framework tied to resurrection and reign.',
    needsHumanReview: true,
  },
  prayer_with_user: {
    id: 'prayer_with_user',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['prayer_comfort'],
    forbiddenConfusions: [],
    synonyms: [/\bcan you pray with me\b/i, /\bpray with me\b/i, /\blet us pray\b/i],
    directWitnesses: ['Matthew 6:9-13', 'Philippians 4:6-7'],
    supportingWitnesses: ['James 5:16', '1 Peter 5:7'],
    directAnswer: null,
    examples: ['can you pray with me'],
  },
  overwhelmed_comfort: {
    id: 'overwhelmed_comfort',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['heartbreak_comfort'],
    forbiddenConfusions: [],
    synonyms: [/\boverwhelmed\b/i, /\bmy feeling overwhelmed\b/i, /\bfeeling overwhelmed\b/i],
    directWitnesses: ['Psalm 34:18', '1 Peter 5:7', 'Psalm 55:22'],
    supportingWitnesses: ['Isaiah 41:10', 'Matthew 11:28'],
    directAnswer:
      'I hear that you feel overwhelmed. You are not alone. Psalm 34:18 says the LORD is nigh unto them that are of a broken heart, and 1 Peter 5:7 invites us to cast our care upon Him.',
  },
  dating_anxiety: {
    id: 'dating_anxiety',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['sexual_boundaries_dating'],
    forbiddenConfusions: [],
    synonyms: [/\bdating anxiety\b/i, /\bnervous about dating\b/i, /\banxious about dating\b/i],
    directWitnesses: ['Philippians 4:6-7', '1 Peter 5:7'],
    supportingWitnesses: ['Psalm 56:3', 'Isaiah 41:10'],
    directAnswer:
      'Dating can stir anxiety. Scripture invites us to bring that weight to God — Philippians 4:6-7 and 1 Peter 5:7.',
  },
  repentance: {
    id: 'repentance',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['faith_obedience'],
    forbiddenConfusions: [],
    synonyms: [/\brepent\b/i, /\brepentance\b/i, /\bturn from sin\b/i],
    directWitnesses: ['Acts 2:38', '1 John 1:9', 'Luke 13:3'],
    supportingWitnesses: ['2 Corinthians 7:10'],
    directAnswer:
      'Scripture calls sinners to repent. Acts 2:38 commands repent and be baptized; 1 John 1:9 promises forgiveness when we confess.',
  },
  faith_obedience: {
    id: 'faith_obedience',
    strictTopic: null,
    polarity: null,
    relatedConcepts: ['repentance'],
    forbiddenConfusions: [],
    synonyms: [/\bfaith and obedience\b/i, /\bobey god\b/i, /\bfaith without works\b/i],
    directWitnesses: ['James 2:17', 'Hebrews 11:1', 'Romans 1:5'],
    supportingWitnesses: ['John 14:15'],
    directAnswer:
      'Scripture joins faith and obedience. James 2:17 says faith without works is dead; Hebrews 11:1 defines faith as substance and evidence.',
  },
};

const MERGED_GRAPH = { ...CONCEPTS };
for (const [id, node] of Object.entries(GRAPH_EXTENSIONS)) {
  MERGED_GRAPH[id] = { ...node, id };
}

const DETECTION_ORDER = [
  'abomination_desolation',
  'acts_10',
  'onan_seed_context',
  'fornication_sexual_sin',
  'sexual_boundaries_dating',
  'marriage_bed',
  'dietary_pork_unclean',
  'dietary_clean_unclean',
  'kingdom_on_earth',
  'new_jerusalem',
  'millennial_kingdom',
  'death_state',
  'sabbath_seventh_day',
  'sabbath_how_to_keep',
  'sabbath',
  'ten_commandments',
  'third_heaven',
  'heaven_layers',
  'prayer_with_user',
  'overwhelmed_comfort',
  'heartbreak_comfort',
  'prayer_comfort',
  'dating_anxiety',
  'repentance',
  'faith_obedience',
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
  const ext = GRAPH_EXTENSIONS[id] || {};
  const base = MERGED_GRAPH[id] || getConceptById(id);
  if (!base) return null;
  return {
    ...base,
    ...ext,
    id: base.id || id,
    helperOnly: ext.helperOnly || base.helperOnly || false,
    relatedConcepts: base.relatedConcepts || ext.relatedConcepts || [],
    forbiddenConfusions: base.forbiddenConfusions || ext.forbiddenConfusions || [],
    examples: base.examples || ext.examples || [],
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
