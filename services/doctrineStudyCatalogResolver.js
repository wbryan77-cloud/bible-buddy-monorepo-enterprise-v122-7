const { BIBLE_TOPIC_CATALOG } = require('./bibleTopicCatalog');
const { FEASTS_AND_PROPHECY_CATALOG } = require('./feastsAndProphecyCatalog');
const { RESURRECTION_REFERENCE_CATALOG } = require('./resurrectionReferenceCatalog');
const { DEATH_RESURRECTION_KINGDOM_CATALOG } = require('./deathResurrectionKingdomCatalog');
const { getScriptureChain } = require('./scriptureChainExpansion');
const { getTopicReferences } = require('./studyContinuityRuntime');
const { buildLineUponLineTraversal } = require('./runtimeLineUponLineTraversalEngine');

const DOCTRINE_TO_BIBLE_TOPIC = {
  sabbath: 'sabbath',
  dietaryLaw: 'dietaryLaw',
  dietary_law: 'dietaryLaw',
  feast_days: 'feastDaysHighSabbaths',
  traditions: 'traditionsOfMen',
  resurrection_timeline: 'resurrectionTimeline',
};

const DOCTRINE_TO_EXPANSION_KEY = {
  sabbath: 'sabbath',
  dietaryLaw: 'dietaryLaw',
  dietary_law: 'dietaryLaw',
  feast_days: 'feastDays',
  traditions: 'traditions',
  resurrection_timeline: 'resurrection',
};

const DOCTRINE_TO_STUDY_CONTINUITY = {
  sabbath: 'sabbath',
  dietaryLaw: 'food',
  dietary_law: 'food',
  feast_days: 'prophecy',
  traditions: 'law',
  resurrection_timeline: 'resurrection',
};

const DEFAULT_FEAST_KEYS = [
  'leviticus23Overview',
  'passover',
  'unleavenedBread',
  'pentecost',
  'jesusAndApostlesKeepingFeasts',
];

const RESURRECTION_FEAST_KEYS = [
  'abominationOfDesolation',
  'propheticTimeMarkers',
  'secondComingAfterAbomination',
];

function uniqueMerge(...arrays) {
  const seen = new Set();
  const out = [];

  for (const arr of arrays) {
    for (const value of arr || []) {
      const ref = String(value).trim();
      const key = ref.toLowerCase();
      if (ref && !seen.has(key)) {
        seen.add(key);
        out.push(ref);
      }
    }
  }

  return out;
}

function extractVersesFromEntry(entry) {
  if (!entry || typeof entry !== 'object') return [];
  const verses = [];
  if (Array.isArray(entry.scriptureChain)) verses.push(...entry.scriptureChain);
  if (Array.isArray(entry.teachingOrder)) verses.push(...entry.teachingOrder);
  return verses;
}

function resolveFeastCatalogKeys(message = '', doctrineTopic = '') {
  const lower = String(message).toLowerCase();
  const keys = new Set();

  if (doctrineTopic === 'feast_days') {
    DEFAULT_FEAST_KEYS.forEach((key) => keys.add(key));

    if (lower.includes('passover')) keys.add('passover');
    if (lower.includes('unleavened')) keys.add('unleavenedBread');
    if (lower.includes('pentecost') || lower.includes('weeks')) keys.add('pentecost');
    if (lower.includes('trumpet')) keys.add('trumpets');
    if (lower.includes('atonement')) keys.add('atonement');
    if (lower.includes('tabernacle')) keys.add('tabernacles');
    if (lower.includes('pilgrimage') || lower.includes('three times')) keys.add('threePilgrimageFeasts');
  }

  if (doctrineTopic === 'resurrection_timeline' || lower.includes('daniel')) {
    RESURRECTION_FEAST_KEYS.forEach((key) => keys.add(key));
  }

  if (lower.includes('abomination')) keys.add('abominationOfDesolation');
  if (lower.includes('1260') || lower.includes('42 month') || lower.includes('time, times')) {
    keys.add('propheticTimeMarkers');
  }
  if (lower.includes('second coming') || lower.includes('last trump')) {
    keys.add('secondComingAfterAbomination');
  }
  if (lower.includes('rome') || lower.includes('seven hills') || lower.includes('seven mountain')) {
    keys.add('romeSevenHills');
  }

  return [...keys].filter((key) => FEASTS_AND_PROPHECY_CATALOG[key]);
}

function buildGenesisToRevelationSteps(refs = []) {
  return refs.map((ref, index) => {
    const label = index === 0 ? 'Scripture' : index === 1 ? 'Cross References' : 'Continuity Chain';
    return { step: index + 1, label, reference: ref };
  });
}

function buildContinuityStudySteps({ doctrineTopic, chains = {} }) {
  const path = chains.genesisToRevelationPath || [];

  if (doctrineTopic === 'sabbath') {
    return [
      `Step 1: Read ${path[0] || 'Genesis 2:2-3'}. What day did God bless and sanctify?`,
      `Step 2: Read ${path.find((r) => r.includes('Exodus 20')) || 'Exodus 20:8-11'}. What does the fourth commandment identify?`,
      `Step 3: Read ${path.find((r) => r.includes('Isaiah 58')) || 'Isaiah 58:13-14'}. How does Isaiah describe the Sabbath?`,
      `Step 4: Read ${path.find((r) => r.includes('Mark 2')) || 'Mark 2:27-28'} and ${path.find((r) => r.includes('Hebrews 4')) || 'Hebrews 4:9'}. What continuity appears in the Gospels and epistles?`,
    ];
  }

  if (doctrineTopic === 'feast_days') {
    return [
      `Step 1: Read ${path.find((r) => r.includes('Exodus 12')) || 'Exodus 12:1-14'}. What does Scripture say about Passover?`,
      `Step 2: Read ${path.find((r) => r.includes('Leviticus 23')) || 'Leviticus 23'}. Which feasts does the LORD list?`,
      `Step 3: Read ${path.find((r) => r.includes('Luke 22')) || 'Luke 22:7-20'}. How do the Gospels connect to the feasts?`,
      `Step 4: Read ${path.find((r) => r.includes('1 Corinthians 5')) || '1 Corinthians 5:7-8'}. What continuity appears in the epistles?`,
    ];
  }

  if (doctrineTopic === 'resurrection_timeline') {
    return [
      `Step 1: Read ${path.find((r) => r.includes('Daniel 9')) || 'Daniel 9:27'}. What do you notice about midst of the week?`,
      `Step 2: Read ${path.find((r) => r.includes('Matthew 12')) || 'Matthew 12:40'}. What do you notice about three days and three nights?`,
      `Step 3: Read ${path.find((r) => r.includes('Matthew 28')) || 'Matthew 28:1-6'}. Were the women present when He rose?`,
      `Step 4: Compare ${path.find((r) => r.includes('Mark 16')) || 'Mark 16'}, ${path.find((r) => r.includes('Luke 24')) || 'Luke 24'}, and ${path.find((r) => r.includes('John 20')) || 'John 20'}.`,
    ];
  }

  if (doctrineTopic === 'dietaryLaw' || doctrineTopic === 'dietary_law') {
    return [
      `Step 1: Read ${path.find((r) => r.includes('Leviticus 11')) || 'Leviticus 11'} and ${path.find((r) => r.includes('Deuteronomy 14')) || 'Deuteronomy 14'}. What distinction does Scripture make?`,
      `Step 2: Read ${path.find((r) => r.includes('Acts 10:14')) || 'Acts 10:14'}, ${path.find((r) => r.includes('Acts 10:28')) || 'Acts 10:28'}, and ${path.find((r) => r.includes('Acts 11')) || 'Acts 11:1-18'} together. What does Peter explain?`,
      `Step 3: Read ${path.find((r) => r.includes('Isaiah 66')) || 'Isaiah 66:17'}. What continuity does this passage add?`,
    ];
  }

  if (doctrineTopic === 'traditions') {
    return [
      `Step 1: Read ${path.find((r) => r.includes('Jeremiah 10')) || 'Jeremiah 10:1-4'}. What warning does Scripture give about customs?`,
      `Step 2: Read ${path.find((r) => r.includes('Mark 7')) || 'Mark 7:6-13'}. How does Jesus describe tradition and commandment?`,
      `Step 3: Read ${path.find((r) => r.includes('Colossians 2')) || 'Colossians 2:8'}. What caution appears there?`,
    ];
  }

  return path.slice(0, 4).map((ref, index) =>
    `Step ${index + 1}: Read ${ref}. Note what Scripture states explicitly before any interpretation.`
  );
}

function resolveDoctrineStudyChains({ topic = '', message = '', primaryScripture = [] }) {
  const bibleKey = DOCTRINE_TO_BIBLE_TOPIC[topic];
  const bibleEntry = bibleKey ? BIBLE_TOPIC_CATALOG[bibleKey] : null;
  const bibleTopicChain = bibleEntry?.scriptureChain || [];

  const expansionKey = DOCTRINE_TO_EXPANSION_KEY[topic] || topic;
  const expansionChain = getScriptureChain(expansionKey);

  const feastKeys = resolveFeastCatalogKeys(message, topic);
  const feastChains = feastKeys.flatMap((key) =>
    extractVersesFromEntry(FEASTS_AND_PROPHECY_CATALOG[key])
  );

  let approvedStudyChain = [];
  if (topic === 'resurrection_timeline') {
    approvedStudyChain = uniqueMerge(
      RESURRECTION_REFERENCE_CATALOG.resurrectionChains || [],
      extractVersesFromEntry(DEATH_RESURRECTION_KINGDOM_CATALOG.firstResurrection),
      extractVersesFromEntry(DEATH_RESURRECTION_KINGDOM_CATALOG.stateOfTheDead)
    );
  }

  const continuityKey = DOCTRINE_TO_STUDY_CONTINUITY[topic];
  const continuityChain = uniqueMerge(
    getTopicReferences(continuityKey),
    buildLineUponLineTraversal(topic)
  );

  const scriptureChain = uniqueMerge(primaryScripture, expansionChain, bibleTopicChain);
  const genesisToRevelationPath = uniqueMerge(
    primaryScripture,
    bibleTopicChain,
    feastChains,
    approvedStudyChain
  );

  return {
    topic,
    bibleKey,
    bibleTopicChain,
    scriptureChain,
    continuityChain,
    approvedStudyChain: uniqueMerge(feastChains, approvedStudyChain),
    genesisToRevelationPath,
    genesisToRevelationSteps: buildGenesisToRevelationSteps(genesisToRevelationPath),
    feastCatalogKeys: feastKeys,
    authorityOrder: ['Scripture', 'Scripture Chain', 'Continuity Chain', 'Approved Study Chain'],
  };
}

module.exports = {
  DOCTRINE_TO_BIBLE_TOPIC,
  resolveDoctrineStudyChains,
  buildContinuityStudySteps,
  uniqueMerge,
};
