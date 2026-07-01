/**
 * Phase 3D — Bible-wide open topic discovery.
 * Seed categories only — does not limit discovery to these topics.
 */

const { getAllApprovedCards } = require('./evidenceCards');

const SEED_CATEGORIES = {
  people: [
    'adam', 'eve', 'cain', 'abel', 'noah', 'shem', 'ham', 'japheth', 'abraham', 'isaac', 'jacob',
    'joseph', 'judah', 'moses', 'aaron', 'joshua', 'samson', 'samuel', 'saul', 'david', 'solomon',
    'elijah', 'elisha', 'isaiah', 'jeremiah', 'ezekiel', 'daniel', 'peter', 'paul', 'john',
  ],
  prophecy: [
    'two_witnesses', '144000', 'mark_of_the_beast', 'great_tribulation', 'abomination_of_desolation',
    'new_jerusalem', 'gog_and_magog', 'armageddon', 'lake_of_fire', 'millennial_kingdom',
  ],
  doctrine: [
    'sabbath', 'dietary_law', 'faith', 'works', 'grace', 'repentance', 'baptism', 'death_state',
    'resurrection', 'holy_spirit', 'priesthood', 'marriage', 'divorce', 'covenants', 'angels',
    'satan', 'michael_archangel', 'messiah', 'logos', 'kingdom_of_god', 'feasts',
  ],
  lineage: [
    'adam_to_noah', 'noah_to_abraham', 'abraham_to_david', 'david_to_christ', 'tribes_of_israel', 'sons_of_noah',
  ],
  temple: ['tabernacle', 'temple', 'sacrificial_system', 'priesthood', 'holy_days'],
};

const TOPIC_PATTERNS = [
  { topic: 'two_witnesses', pattern: /\b(two witnesses|witnesses of god)\b/i, category: 'prophecy' },
  { topic: 'mark_of_the_beast', pattern: /\b(mark of the beast|mark of god|666)\b/i, category: 'prophecy' },
  { topic: '144000', pattern: /\b(144,?000|144000)\b/i, category: 'prophecy' },
  { topic: 'great_tribulation', pattern: /\b(great tribulation|time of trouble|jacob.?s trouble)\b/i, category: 'prophecy' },
  { topic: 'abomination_of_desolation', pattern: /\b(abomination of desolation|abomination that maketh desolate)\b/i, category: 'prophecy' },
  { topic: 'new_jerusalem', pattern: /\bnew jerusalem\b/i, category: 'prophecy' },
  { topic: 'gog_and_magog', pattern: /\b(gog and magog|gog of magog)\b/i, category: 'prophecy' },
  { topic: 'armageddon', pattern: /\barmageddon\b/i, category: 'prophecy' },
  { topic: 'lake_of_fire', pattern: /\b(lake of fire|hell fire|everlasting fire)\b/i, category: 'prophecy' },
  { topic: 'millennial_kingdom', pattern: /\b(millennial kingdom|thousand years|millennium)\b/i, category: 'prophecy' },
  { topic: 'adam', pattern: /\badam\b/i, category: 'people' },
  { topic: 'eve', pattern: /\beve\b/i, category: 'people' },
  { topic: 'cain', pattern: /\bcain\b/i, category: 'people' },
  { topic: 'abel', pattern: /\babel\b/i, category: 'people' },
  { topic: 'noah', pattern: /\bnoah\b/i, category: 'people' },
  { topic: 'shem', pattern: /\bshem\b/i, category: 'people' },
  { topic: 'ham', pattern: /\bham\b/i, category: 'people' },
  { topic: 'japheth', pattern: /\bjapheth\b/i, category: 'people' },
  { topic: 'abraham', pattern: /\babraham\b/i, category: 'people' },
  { topic: 'isaac', pattern: /\bisaac\b/i, category: 'people' },
  { topic: 'jacob', pattern: /\bjacob\b/i, category: 'people' },
  { topic: 'joseph', pattern: /\bjoseph\b/i, category: 'people' },
  { topic: 'judah', pattern: /\bjudah\b/i, category: 'people' },
  { topic: 'moses', pattern: /\bmoses\b/i, category: 'people' },
  { topic: 'aaron', pattern: /\baaron\b/i, category: 'people' },
  { topic: 'joshua', pattern: /\bjoshua\b/i, category: 'people' },
  { topic: 'samson', pattern: /\bsamson\b/i, category: 'people' },
  { topic: 'samuel', pattern: /\bsamuel\b/i, category: 'people' },
  { topic: 'saul', pattern: /\bsaul\b/i, category: 'people' },
  { topic: 'david', pattern: /\bdavid\b/i, category: 'people' },
  { topic: 'solomon', pattern: /\bsolomon\b/i, category: 'people' },
  { topic: 'elijah', pattern: /\belijah\b/i, category: 'people' },
  { topic: 'elisha', pattern: /\belisha\b/i, category: 'people' },
  { topic: 'isaiah', pattern: /\bisaiah\b/i, category: 'people' },
  { topic: 'jeremiah', pattern: /\bjeremiah\b/i, category: 'people' },
  { topic: 'ezekiel', pattern: /\bezekiel\b/i, category: 'people' },
  { topic: 'daniel', pattern: /\bdaniel\b/i, category: 'people' },
  { topic: 'peter', pattern: /\bpeter\b/i, category: 'people' },
  { topic: 'paul', pattern: /\bpaul\b/i, category: 'people' },
  { topic: 'john', pattern: /\bjohn\b/i, category: 'people' },
  { topic: 'sabbath', pattern: /\b(sabbath|seventh day|seventh-day|saturday|hebrews 4:9)\b/i, category: 'doctrine' },
  { topic: 'dietary_law', pattern: /\b(pork|unclean|clean animals|leviticus 11|acts 10|acts 11)\b/i, category: 'doctrine' },
  { topic: 'faith', pattern: /\bfaith\b/i, category: 'doctrine' },
  { topic: 'works', pattern: /\bworks\b/i, category: 'doctrine' },
  { topic: 'grace', pattern: /\bgrace\b/i, category: 'doctrine' },
  { topic: 'repentance', pattern: /\brepent(ance)?\b/i, category: 'doctrine' },
  { topic: 'baptism', pattern: /\bbaptism\b/i, category: 'doctrine' },
  { topic: 'death_state', pattern: /\b(dead|death|die|died|grave|sleep in death|soul sleep|grieving|passed away)\b/i, category: 'doctrine' },
  { topic: 'resurrection', pattern: /\bresurrection\b/i, category: 'doctrine' },
  { topic: 'holy_spirit', pattern: /\b(holy spirit|holy ghost|spirit of god)\b/i, category: 'doctrine' },
  { topic: 'priesthood', pattern: /\bpriesthood\b/i, category: 'doctrine' },
  { topic: 'marriage', pattern: /\bmarriage\b/i, category: 'doctrine' },
  { topic: 'divorce', pattern: /\bdivorce\b/i, category: 'doctrine' },
  { topic: 'covenants', pattern: /\b(covenant|covenants)\b/i, category: 'doctrine' },
  { topic: 'angels', pattern: /\bangels?\b/i, category: 'doctrine' },
  { topic: 'satan', pattern: /\b(satan|devil|lucifer|serpent)\b/i, category: 'doctrine' },
  { topic: 'michael_archangel', pattern: /\b(michael the archangel|archangel michael)\b/i, category: 'doctrine' },
  { topic: 'messiah_logos', pattern: /\b(logos|word of god|john 1:1|messiah|christ is)\b/i, category: 'doctrine' },
  { topic: 'kingdom_of_god', pattern: /\b(kingdom of god|thy kingdom come|kingdom of heaven)\b/i, category: 'doctrine' },
  { topic: 'feasts', pattern: /\b(feast days|passover|pentecost|leviticus 23|day of atonement)\b/i, category: 'doctrine' },
  { topic: 'holiness', pattern: /\b(holy|holiness|sanctif)\b/i, category: 'doctrine' },
  { topic: 'heavens', pattern: /\b(heaven|heavens|third heaven|firmament)\b/i, category: 'doctrine' },
  { topic: 'adam_to_noah', pattern: /\b(adam to noah|from adam to noah)\b/i, category: 'lineage' },
  { topic: 'noah_to_abraham', pattern: /\b(noah to abraham|from noah)\b/i, category: 'lineage' },
  { topic: 'abraham_to_david', pattern: /\b(abraham to david|from abraham)\b/i, category: 'lineage' },
  { topic: 'david_to_christ', pattern: /\b(david to christ|line of david)\b/i, category: 'lineage' },
  { topic: 'tribes_of_israel', pattern: /\b(tribes of israel|twelve tribes)\b/i, category: 'lineage' },
  { topic: 'sons_of_noah', pattern: /\b(sons of noah|shem ham japheth)\b/i, category: 'lineage' },
  { topic: 'tabernacle', pattern: /\btabernacle\b/i, category: 'temple' },
  { topic: 'temple', pattern: /\b(temple of god|solomon's temple|holy temple)\b/i, category: 'temple' },
  { topic: 'sacrificial_system', pattern: /\b(sacrifice|burnt offering|sin offering)\b/i, category: 'temple' },
  { topic: 'holy_days', pattern: /\b(holy days|high sabbath)\b/i, category: 'temple' },
  { topic: 'ten_commandments', pattern: /\b(ten commandments|decalogue)\b/i, category: 'doctrine' },
  { topic: 'tithes', pattern: /\b(tithe|tithes|tithing)\b/i, category: 'doctrine' },
  { topic: 'emotional', pattern: /\b(anxious|grief|grieving|abandoned|lonely|afraid|scared|depressed)\b/i, category: 'doctrine' },
  { topic: 'prayer', pattern: /\b(pray|prayer|praying)\b/i, category: 'doctrine' },
];

function normalizeKey(s = '') {
  return String(s).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function tokenTopicFromText(text = '') {
  const tokens = normalizeKey(text).split(' ').filter((w) => w.length > 2);
  if (!tokens.length) return null;
  return tokens.slice(0, 4).join('_');
}

/**
 * Score-based topic assignment — avoids open_topic when any seed matches.
 */
function discoverTopicFromText(text = '', context = {}) {
  const combined = `${context.lessonTitle || ''} ${context.answerSummary || ''} ${text}`.trim();
  const approved = new Set(getAllApprovedCards().map((c) => c.topic));

  let best = null;
  let bestScore = 0;

  for (const entry of TOPIC_PATTERNS) {
    if (!entry.pattern.test(combined)) continue;
    const weight = entry.pattern.test(text) ? 2 : 1;
    if (weight > bestScore) {
      bestScore = weight;
      best = entry;
    }
  }

  if (best) {
    return {
      topic: best.topic,
      category: best.category,
      discoveredTopic: best.topic,
      isNewTopic: !approved.has(best.topic),
      classification: 'seed_match',
      confidence: bestScore >= 2 ? 'high' : 'medium',
    };
  }

  const tokenTopic = tokenTopicFromText(combined);
  if (tokenTopic && tokenTopic.length > 3) {
    return {
      topic: tokenTopic,
      category: 'discovered',
      discoveredTopic: tokenTopic,
      isNewTopic: !approved.has(tokenTopic),
      classification: 'token_discovered',
      confidence: 'low',
    };
  }

  return {
    topic: 'unclassified',
    category: 'unknown',
    discoveredTopic: tokenTopic || 'unclassified',
    isNewTopic: true,
    classification: 'unclassified',
    confidence: 'none',
  };
}

function assignRecordTopic(record) {
  const discovery = discoverTopicFromText(record.question || '', {
    lessonTitle: record.lessonTitle,
    answerSummary: record.answerSummary || record.conclusion,
  });
  return {
    ...record,
    topic: discovery.topic,
    topicCandidate: discovery.topic,
    topicCategory: discovery.category,
    discoveredTopic: discovery.discoveredTopic,
    isNewTopic: discovery.isNewTopic,
    topicClassification: discovery.classification,
  };
}

function buildTopicMap(records) {
  const map = {};
  for (const r of records) {
    const topic = r.topic || 'unclassified';
    if (!map[topic]) {
      map[topic] = {
        topic,
        category: r.topicCategory || 'discovered',
        questionCount: 0,
        sources: new Set(),
        sampleQuestions: [],
        isNewTopic: r.isNewTopic,
      };
    }
    map[topic].questionCount += r.frequency || 1;
    map[topic].sources.add(r.source || r.sourceName || 'unknown');
    if (map[topic].sampleQuestions.length < 5) {
      map[topic].sampleQuestions.push(r.question);
    }
  }

  return Object.values(map).map((t) => ({
    ...t,
    sources: [...t.sources],
  })).sort((a, b) => b.questionCount - a.questionCount);
}

module.exports = {
  SEED_CATEGORIES,
  TOPIC_PATTERNS,
  discoverTopicFromText,
  assignRecordTopic,
  buildTopicMap,
  normalizeKey,
};
