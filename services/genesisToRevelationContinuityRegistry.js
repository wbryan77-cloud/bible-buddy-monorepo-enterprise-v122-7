const { TIER } = require('./scriptureCertaintyFramework');

function node(reference, tier, options = {}) {
  return {
    reference: String(reference).trim(),
    tier,
    ...options,
  };
}

const TOPIC_REGISTRY = Object.freeze({
  covenant: {
    topicKey: 'covenant',
    title: 'Covenant: Genesis to Revelation',
    canonicalEngine: null,
    sourceCatalogs: [
      'covenantReferenceCatalog.js',
      'bibleTopicCatalog.abrahamIsaacJacobIsrael',
      'runtimeCovenantContinuityEngine',
    ],
    canonicalChain: [
      node('Genesis 9:8-17', TIER.A),
      node('Genesis 12:1-3', TIER.A),
      node('Exodus 19:5-8', TIER.A),
      node('Jeremiah 31:31-34', TIER.A),
      node('Luke 22:14-20', TIER.A),
      node('Hebrews 8:6-13', TIER.A, { sisFrom: 'Jeremiah 31:31-34' }),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: false,
    sisThemes: ['covenant', 'promise'],
    forbiddenSources: ['historicalEvidenceSeparate', 'edomHistoricalEvidenceBucket'],
  },

  messiah: {
    topicKey: 'messiah',
    title: 'Messiah: Old Testament to New Testament Witness',
    canonicalEngine: 'messiahWitnessMatrix',
    sourceCatalogs: [
      'bibleTopicCatalog.jesusInBible',
      'feastsAndProphecyCatalog.passover',
      'priesthoodAndLawCatalog.melchizedekPriesthood',
      'runtimeReferenceConnectionIndex.js',
    ],
    canonicalChain: [
      node('Genesis 3:15', TIER.B),
      node('Genesis 22:1-18', TIER.B),
      node('Exodus 12:1-14', TIER.A),
      node('Deuteronomy 18:15-19', TIER.A),
      node('Psalm 22:1-18', TIER.A),
      node('Isaiah 53:1-12', TIER.A),
      node('Jonah 1:17-2:10', TIER.A, { sisFrom: 'Matthew 12:39-40' }),
      node('Daniel 7:13-14', TIER.A),
      node('John 1:1-14', TIER.A),
      node('Acts 3:22-26', TIER.A, { sisFrom: 'Deuteronomy 18:15-19' }),
      node('Hebrews 7:1-28', TIER.A, { sisFrom: 'Psalm 110:4' }),
      node('Revelation 5:6-12', TIER.A, { sisFrom: 'Exodus 12:1-14' }),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: false,
    sisThemes: ['passover', 'melchizedek', 'david', 'kingdom', 'resurrection'],
    forbiddenSources: ['historicalEvidenceSeparate', 'blackColorDescriptions'],
  },

  kingdom: {
    topicKey: 'kingdom',
    title: 'Kingdom: Creation to New Jerusalem',
    canonicalEngine: 'kingdomContinuityEngine',
    sourceCatalogs: [
      'deathResurrectionKingdomCatalog.kingdomComesToEarth',
      'bibleTopicCatalog.secondComingKingdom',
      'bibleTopicCatalog.davidAndKingdom',
    ],
    canonicalChain: [
      node('Isaiah 2:1-4', TIER.A),
      node('Micah 4:1-5', TIER.B, { strongB: true }),
      node('2 Samuel 7:12-16', TIER.A),
      node('Daniel 2:44-45', TIER.A),
      node('Daniel 7:13-14', TIER.A),
      node('Matthew 5:5', TIER.A),
      node('Matthew 6:10', TIER.A),
      node('Acts 3:19-21', TIER.B, { strongB: true }),
      node('Revelation 5:10', TIER.A),
      node('Revelation 20:4-6', TIER.A),
      node('Revelation 21:1-4', TIER.A),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: false,
    sisThemes: ['kingdom', 'david', 'new_jerusalem'],
    forbiddenSources: ['historicalEvidenceSeparate'],
  },

  sabbath: {
    topicKey: 'sabbath',
    title: 'The Seventh-Day Sabbath',
    canonicalEngine: null,
    sourceCatalogs: [
      'bibleTopicCatalog.sabbath',
      'studyContinuityRuntime.sabbath',
      'runtimeSabbathContinuityEngine',
    ],
    canonicalChain: [
      node('Genesis 2:2-3', TIER.A),
      node('Exodus 20:8-11', TIER.A),
      node('Leviticus 23:1-3', TIER.A),
      node('Isaiah 58:13-14', TIER.A),
      node('Luke 4:16', TIER.A),
      node('Acts 13:42-44', TIER.A),
      node('Hebrews 4:9', TIER.B, { strongB: true }),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: true,
    liveInterceptAlias: 'sabbath',
    sisThemes: ['sabbath', 'creation'],
    forbiddenSources: [],
  },

  feast_days: {
    topicKey: 'feast_days',
    title: 'Feasts of the LORD and High Sabbaths',
    canonicalEngine: null,
    sourceCatalogs: [
      'bibleTopicCatalog.feastDaysHighSabbaths',
      'feastsAndProphecyCatalog',
      'runtimeFeastDayContinuityEngine',
    ],
    canonicalChain: [
      node('Leviticus 23:1-44', TIER.A),
      node('Exodus 12:1-14', TIER.A),
      node('Acts 2:1-4', TIER.A),
      node('Luke 22:7-20', TIER.A),
      node('1 Corinthians 5:7-8', TIER.A, { sisFrom: 'Exodus 12:1-14' }),
      node('Zechariah 14:16-19', TIER.B, { strongB: true }),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: true,
    liveInterceptAlias: 'feast_days',
    sisThemes: ['passover', 'kingdom'],
    forbiddenSources: [],
  },

  resurrection: {
    topicKey: 'resurrection',
    title: 'Resurrection Timeline and Hope',
    canonicalEngine: 'deathSleepResurrectionEngine',
    sourceCatalogs: [
      'bibleTopicCatalog.resurrectionTimeline',
      'resurrectionReferenceCatalog.js',
      'deathResurrectionKingdomCatalog.firstResurrection',
    ],
    canonicalChain: [
      node('Matthew 12:40', TIER.A),
      node('Matthew 27:57-66', TIER.A),
      node('Matthew 28:1-6', TIER.A),
      node('Mark 16:1-6', TIER.A),
      node('Luke 24:1-6', TIER.A),
      node('John 20:1-8', TIER.A),
      node('1 Corinthians 15:1-58', TIER.A),
      node('1 Thessalonians 4:13-18', TIER.A),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: true,
    liveInterceptAlias: 'resurrection_timeline',
    sisThemes: ['resurrection', 'kingdom'],
    forbiddenSources: [],
  },

  daniel: {
    topicKey: 'daniel',
    title: 'Daniel: Life, Faithfulness, and Prophecy',
    canonicalEngine: null,
    sourceCatalogs: [
      'prophecyCharacterAndAngelsCatalog.danielLifeAndProphecy',
      'feastsAndProphecyCatalog.abominationOfDesolation',
      'beastSystemReferenceCatalog.js',
    ],
    canonicalChain: [
      node('Daniel 1:1-21', TIER.A),
      node('Daniel 2:31-45', TIER.A),
      node('Daniel 7:1-28', TIER.A),
      node('Daniel 9:26-27', TIER.A),
      node('Daniel 12:1-13', TIER.A),
      node('Matthew 24:15-22', TIER.A, { sisFrom: 'Daniel 12:11' }),
    ],
    defaultMode: 'advanced_study',
    liveIntercept: false,
    sisThemes: ['kingdom', 'babylon', 'abomination'],
    forbiddenSources: ['historicalReferenceIndex.js'],
  },

  revelation: {
    topicKey: 'revelation',
    title: 'Revelation: Completion and Restoration',
    canonicalEngine: null,
    sourceCatalogs: [
      'feastsAndProphecyCatalog',
      'prophecySymbolCatalog.js',
      'runtimeRevelationCompletionEngine',
    ],
    canonicalChain: [
      node('Revelation 1:1-20', TIER.A),
      node('Revelation 5:6-14', TIER.A),
      node('Revelation 11:15', TIER.A),
      node('Revelation 13:1-18', TIER.A),
      node('Revelation 17:1-18', TIER.A),
      node('Revelation 19:11-21', TIER.A),
      node('Revelation 20:1-6', TIER.A),
      node('Revelation 21:1-5', TIER.A),
    ],
    defaultMode: 'advanced_study',
    liveIntercept: false,
    liveInterceptPartialKeywords: ['abomination', 'rome', 'seven hills'],
    sisThemes: ['kingdom', 'babylon', 'bride', 'temple', 'resurrection'],
    forbiddenSources: ['historicalEvidenceSeparate'],
  },

  egypt_bondage: {
    topicKey: 'egypt_bondage',
    title: 'Egypt, Bondage, and Deliverance',
    canonicalEngine: 'egyptBondageDeliveranceEngine',
    sourceCatalogs: [
      'genealogyCaptivityIdentityCatalog.hamMizraimEgyptAndIsraelBondage',
      'exodusPatternCatalog.js',
      'feastsAndProphecyCatalog.unleavenedBread',
    ],
    canonicalChain: [
      node('Genesis 15:13-16', TIER.A, { layer: 'literal' }),
      node('Exodus 1:8-22', TIER.A, { layer: 'literal' }),
      node('Exodus 20:2', TIER.A, { layer: 'literal' }),
      node('Deuteronomy 5:6', TIER.A, { layer: 'literal' }),
      node('Deuteronomy 28:68', TIER.A, { layer: 'continuity' }),
      node('Jeremiah 16:14-15', TIER.B, { layer: 'continuity', strongB: true }),
      node('Galatians 4:3-9', TIER.A, { layer: 'symbolic' }),
      node('Revelation 11:8', TIER.A, { layer: 'symbolic' }),
    ],
    defaultMode: 'advanced_study',
    liveIntercept: false,
    sisThemes: ['egypt', 'exodus', 'wilderness'],
    forbiddenSources: ['historicalEvidenceSeparate'],
  },

  captivity: {
    topicKey: 'captivity',
    title: 'Captivity, Scattering, and Restoration',
    canonicalEngine: null,
    sourceCatalogs: [
      'bibleTopicCatalog.identityCaptivityAwakening',
      'genealogyCaptivityIdentityCatalog.deuteronomyCursesCaptivityShips',
    ],
    canonicalChain: [
      node('Leviticus 26:14-46', TIER.A),
      node('Deuteronomy 28:15-68', TIER.A),
      node('2 Kings 17:6-23', TIER.A),
      node('Jeremiah 16:14-21', TIER.A),
      node('Ezekiel 37:1-14', TIER.A),
      node('Luke 21:20-24', TIER.A),
      node('Romans 11:25-29', TIER.A),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: false,
    sisThemes: ['captivity', 'remnant', 'exodus'],
    forbiddenSources: ['historicalEvidenceSeparate'],
  },

  remnant: {
    topicKey: 'remnant',
    title: 'Remnant Preserved Through Judgment',
    canonicalEngine: 'remnantContinuityEngine',
    sourceCatalogs: ['bibleTopicCatalog.identityCaptivityAwakening'],
    canonicalChain: [
      node('Isaiah 10:20-22', TIER.A),
      node('Jeremiah 23:3', TIER.A),
      node('Ezekiel 6:8', TIER.A),
      node('1 Kings 19:18', TIER.A),
      node('Romans 11:1-5', TIER.A),
      node('Revelation 7:4-8', TIER.A),
      node('Revelation 12:17', TIER.A),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: false,
    sisThemes: ['remnant', 'captivity'],
    forbiddenSources: ['historicalEvidenceSeparate'],
  },

  babylon: {
    topicKey: 'babylon',
    title: 'Babylon: Literal and Prophetic',
    canonicalEngine: null,
    sourceCatalogs: [
      'babylonReferenceCatalog.js',
      'feastsAndProphecyCatalog.romeSevenHills',
      'beastSystemReferenceCatalog.js',
    ],
    canonicalChain: [
      node('Genesis 11:1-9', TIER.A),
      node('Isaiah 13:1-22', TIER.A),
      node('Jeremiah 50:1-46', TIER.A),
      node('Daniel 2:31-45', TIER.A),
      node('Daniel 7:1-28', TIER.A),
      node('Revelation 17:1-18', TIER.A),
      node('Revelation 18:4-5', TIER.A),
    ],
    defaultMode: 'advanced_study',
    liveIntercept: false,
    sisThemes: ['babylon', 'kingdom'],
    forbiddenSources: ['edomHistoricalEvidenceBucket'],
  },

  wilderness: {
    topicKey: 'wilderness',
    title: 'Wilderness: Testing and Preparation',
    canonicalEngine: null,
    sourceCatalogs: [
      'wildernessReferenceCatalog.js',
      'feastsAndProphecyCatalog.propheticTimeMarkers',
      'exodusPatternCatalog.js',
    ],
    canonicalChain: [
      node('Exodus 16:1-36', TIER.A, { layer: 'israel_historical' }),
      node('Numbers 14:1-45', TIER.A, { layer: 'israel_historical' }),
      node('Deuteronomy 8:1-20', TIER.A, { layer: 'israel_historical' }),
      node('1 Corinthians 10:1-11', TIER.A, { layer: 'israel_historical', sisFrom: 'Exodus 16:1-36' }),
      node('Hebrews 3:7-19', TIER.B, { layer: 'israel_historical', strongB: true }),
      node('Matthew 4:1-11', TIER.A, { layer: 'messiah' }),
      node('Revelation 12:6', TIER.A, { layer: 'prophetic' }),
      node('Revelation 12:14', TIER.A, { layer: 'prophetic' }),
    ],
    defaultMode: 'advanced_study',
    liveIntercept: false,
    sisThemes: ['wilderness', 'egypt', 'exodus'],
    forbiddenSources: [],
  },

  death_resurrection: {
    topicKey: 'death_resurrection',
    title: 'Death, Sleep, Resurrection, and Judgment',
    canonicalEngine: 'deathSleepResurrectionEngine',
    sourceCatalogs: [
      'deathResurrectionKingdomCatalog.stateOfTheDead',
      'deathResurrectionKingdomCatalog.firstResurrection',
      'studyContinuityRuntime.resurrection',
    ],
    canonicalChain: [
      node('Genesis 2:7', TIER.A),
      node('Genesis 3:19', TIER.A),
      node('Ecclesiastes 9:5-10', TIER.A),
      node('Daniel 12:2', TIER.A),
      node('John 11:11-14', TIER.A),
      node('John 5:28-29', TIER.A),
      node('1 Corinthians 15:1-58', TIER.A),
      node('Revelation 20:11-15', TIER.A),
    ],
    defaultMode: 'advanced_study',
    liveIntercept: false,
    sisThemes: ['resurrection', 'kingdom'],
    forbiddenSources: [],
  },

  heaven_heavens: {
    topicKey: 'heaven_heavens',
    title: 'Heaven, Heavens, Kingdom, and Inheritance',
    canonicalEngine: 'heavenKingdomStudyEngine',
    sourceCatalogs: ['deathResurrectionKingdomCatalog.threeHeavens'],
    canonicalChain: [
      node('Genesis 1:1', TIER.A),
      node('Genesis 1:6-8', TIER.A),
      node('Deuteronomy 10:14', TIER.A),
      node('Psalm 115:16', TIER.A),
      node('Matthew 5:5', TIER.A),
      node('Matthew 6:10', TIER.A),
      node('John 3:13', TIER.A),
      node('Acts 2:34', TIER.A),
      node('Revelation 21:2-3', TIER.A),
    ],
    defaultMode: 'advanced_study',
    liveIntercept: false,
    sisThemes: ['kingdom', 'new_jerusalem', 'resurrection'],
    forbiddenSources: [],
  },

  traditions: {
    topicKey: 'traditions',
    title: 'Traditions of Men versus Commandments of God',
    canonicalEngine: 'traditionsOfMenEngine',
    sourceCatalogs: [
      'bibleTopicCatalog.traditionsOfMen',
      'treeOfLifeDoctrineCatalog.deceptionAndFalseWords',
    ],
    canonicalChain: [
      node('Deuteronomy 4:2', TIER.A),
      node('Deuteronomy 12:29-32', TIER.A),
      node('Jeremiah 10:1-4', TIER.A),
      node('Matthew 15:1-9', TIER.A),
      node('Mark 7:6-13', TIER.A),
      node('Colossians 2:8', TIER.A),
      node('Revelation 22:18-19', TIER.A),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: true,
    liveInterceptAlias: 'traditions',
    sisThemes: ['tradition', 'commandment'],
    forbiddenSources: [],
  },

  graven_images: {
    topicKey: 'graven_images',
    title: 'Graven Images, Idols, and Worship',
    canonicalEngine: 'gravenImagesEngine',
    sourceCatalogs: ['idolatryTorahCatalog.js'],
    canonicalChain: [
      node('Exodus 20:4-6', TIER.A),
      node('Deuteronomy 4:15-19', TIER.A),
      node('Deuteronomy 5:8-10', TIER.A),
      node('Psalm 115:4-8', TIER.A),
      node('Isaiah 44:9-20', TIER.A),
      node('Acts 17:29', TIER.A),
      node('1 Corinthians 10:14', TIER.B, { strongB: true }),
    ],
    defaultMode: 'advanced_study',
    liveIntercept: false,
    sisThemes: ['temple', 'idolatry'],
    forbiddenSources: [],
  },

  dietary_law: {
    topicKey: 'dietary_law',
    title: 'Clean and Unclean Food',
    canonicalEngine: null,
    sourceCatalogs: ['bibleTopicCatalog.dietaryLaw', 'studyContinuityRuntime.food'],
    canonicalChain: [
      node('Leviticus 11:1-47', TIER.A),
      node('Deuteronomy 14:1-21', TIER.A),
      node('Daniel 1:8-16', TIER.A),
      node('Acts 10:14', TIER.A),
      node('Acts 10:28', TIER.A),
      node('Acts 11:1-18', TIER.A),
      node('Isaiah 66:17', TIER.B, { strongB: true }),
    ],
    defaultMode: 'normal_doctrine',
    liveIntercept: true,
    liveInterceptAlias: 'dietaryLaw',
    sisThemes: ['law', 'clean_unclean'],
    forbiddenSources: [],
  },
});

const CORE_TOPIC_KEYS = Object.freeze([
  'covenant',
  'messiah',
  'kingdom',
  'sabbath',
  'feast_days',
  'resurrection',
  'daniel',
  'revelation',
  'egypt_bondage',
  'captivity',
  'remnant',
  'babylon',
  'wilderness',
  'death_resurrection',
  'heaven_heavens',
  'traditions',
  'graven_images',
]);

function listRegistryTopicKeys() {
  return Object.keys(TOPIC_REGISTRY);
}

function listCoreTopicKeys() {
  return [...CORE_TOPIC_KEYS];
}

function getRegistryTopic(topicKey = '') {
  const key = String(topicKey || '').trim();
  return TOPIC_REGISTRY[key] || null;
}

function getRegistryChain(topicKey = '') {
  const entry = getRegistryTopic(topicKey);
  return entry ? [...entry.canonicalChain] : [];
}

function resolveLiveInterceptTopic(topicKey = '') {
  const key = String(topicKey || '').trim();
  const entry = getRegistryTopic(key);
  if (!entry?.liveIntercept) return null;
  return entry.liveInterceptAlias || key;
}

function listLiveInterceptTopics() {
  return listRegistryTopicKeys()
    .map((key) => getRegistryTopic(key))
    .filter((entry) => entry?.liveIntercept)
    .map((entry) => ({
      topicKey: entry.topicKey,
      liveInterceptAlias: entry.liveInterceptAlias || entry.topicKey,
    }));
}

function getRegistrySummary() {
  return {
    topicCount: listRegistryTopicKeys().length,
    coreTopicCount: CORE_TOPIC_KEYS.length,
    liveInterceptCount: listLiveInterceptTopics().length,
    topicKeys: listRegistryTopicKeys(),
    coreTopicKeys: listCoreTopicKeys(),
  };
}

module.exports = {
  TOPIC_REGISTRY,
  CORE_TOPIC_KEYS,
  listRegistryTopicKeys,
  listCoreTopicKeys,
  getRegistryTopic,
  getRegistryChain,
  resolveLiveInterceptTopic,
  listLiveInterceptTopics,
  getRegistrySummary,
};
