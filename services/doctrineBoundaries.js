/**
 * Doctrine guardrails as boundaries — not canned answers.
 * Buddy may reason freely inside these limits.
 */

const FORBIDDEN_TEACHINGS = [
  {
    id: 'sunday_replaced_sabbath',
    pattern: /\b(sunday|first day)\b.{0,40}\b(replaced|is now|became|is the)\b.{0,30}\b(sabbath|biblical sabbath)\b/i,
    boundary: 'Do not teach that Sunday replaced the biblical Sabbath by explicit command from God.',
  },
  {
    id: 'law_abolished',
    pattern: /\b(law|torah)\b.{0,30}\b(abolished|done away|nailed to the cross|no longer applies)\b/i,
    boundary: 'Do not teach that God\'s law is abolished or done away with.',
  },
  {
    id: 'dietary_abolished',
    pattern: /\b(dietary law|clean and unclean|unclean foods)\b.{0,30}\b(abolished|done away|no longer|permitted all foods)\b/i,
    boundary: 'Do not teach that dietary law is abolished without Scripture-first continuity.',
  },
  {
    id: 'heaven_at_death',
    pattern: /\b(go to heaven|in heaven now|soul goes to heaven)\b.{0,20}\b(at death|when you die|immediately)\b/i,
    boundary: 'Do not teach heaven-at-death as settled doctrine without Scripture-first study.',
  },
  {
    id: 'christmas_easter_commanded',
    pattern: /\b(christmas|easter)\b.{0,30}\b(commanded|required|biblical command|scripture commands)\b/i,
    boundary: 'Do not teach Christmas or Easter as biblical commands.',
  },
  {
    id: 'roman_replaces_scripture',
    pattern: /\b(roman catholic|church tradition)\b.{0,40}\b(overrides?|replaces?|supersedes?)\b.{0,20}\bscripture\b/i,
    boundary: 'Do not teach that Roman church authority replaces Scripture.',
  },
];

const TOPIC_KEYWORDS = {
  sabbath: ['sabbath', 'seventh day', 'fourth commandment', 'sunday worship', 'sunday observance'],
  dietary_law: ['dietary', 'unclean food', 'unclean foods', 'swine', 'pork', 'acts 10', 'acts 11', 'clean and unclean'],
  feast_days: ['feast day', 'feast days', 'high sabbath', 'leviticus 23', 'passover', 'tabernacles', 'pentecost', 'unleavened bread'],
  traditions: ['christmas', 'easter', 'december 25', 'tree out of the forest', 'jeremiah 10', 'traditions of men'],
  resurrection_timeline: ['resurrection', 'three days and three nights', 'matthew 12:40', 'daniel 9:27', 'midst of the week', 'resurrection timeline'],
  messiah_logos: ['logos', 'yahweh', 'god of the old testament', 'old testament god', 'jesus in the old testament'],
  heavens: ['how many heaven', 'third heaven', 'heavens are there', 'firmament', 'no man hath ascended'],
  kingdom: [
    'thy kingdom come',
    'kingdom on earth',
    'kingdom come',
    'new jerusalem',
    'where i go ye cannot come',
    'revelation 21',
  ],
  prayer: ['pray for me', 'need prayer', 'help from the lord', 'help from god', 'please pray'],
  grief: ['lost a friend', 'lost my friend', 'someone died', 'passed away', 'grieving', 'grief'],
  health: ['knee pain', 'back pain', 'health', 'sick', 'illness', 'hurts'],
};

function detectTopicFromMessage(message = '') {
  const lower = String(message).toLowerCase();
  for (const [topic, terms] of Object.entries(TOPIC_KEYWORDS)) {
    if (terms.some((term) => lower.includes(term))) return topic;
  }
  return null;
}

function detectTopicFromSessions(recentSessions = []) {
  for (const session of recentSessions || []) {
    const topic =
      session?.runtime?.doctrineTopic ||
      session?.structured?.runtime?.doctrineTopic ||
      session?.runtime?.questionIntent?.topic ||
      session?.runtime?.sabbathIntent?.topic ||
      null;
    if (topic) return topic;
    const msg = String(session?.message || '');
    const detected = detectTopicFromMessage(msg);
    if (detected && detected !== 'prayer' && detected !== 'grief' && detected !== 'health') {
      return detected;
    }
  }
  return null;
}

function violatesDoctrineBoundary(text = '') {
  const body = String(text || '');
  return FORBIDDEN_TEACHINGS.filter((rule) => rule.pattern.test(body)).map((rule) => rule.boundary);
}

function getBoundariesForTopic(topic = '') {
  const common = [
    'Scripture is the foundation; history is secondary and labeled as such.',
    'Answer the user\'s actual question before offering study continuation.',
  ];
  const byTopic = {
    sabbath: [
      'Scripture identifies the seventh day as the Sabbath.',
      'Do not teach that God changed the Sabbath to Sunday by biblical command.',
      'Historical development of Sunday observance may be explained when asked.',
    ],
    dietary_law: ['Do not teach dietary law abolished without Acts 10 continuity study.'],
    traditions: ['Do not teach Christmas/Easter as biblical commands.'],
    resurrection_timeline: ['Do not teach heaven-at-death or tradition-based chronology as Scripture.'],
  };
  return [...common, ...(byTopic[topic] || [])];
}

module.exports = {
  FORBIDDEN_TEACHINGS,
  TOPIC_KEYWORDS,
  detectTopicFromMessage,
  detectTopicFromSessions,
  violatesDoctrineBoundary,
  getBoundariesForTopic,
};
