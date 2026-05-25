const SCRIPTURE_CATEGORY_ROADMAP = {
  buildPurpose: {
    mission: 'Build Scripture-first continuity pathways from Genesis to Revelation.',
    method: 'Line upon line, precept upon precept, references first, chapter context preserved.',
    guardrails: [
      'Use Scripture references as anchors.',
      'Keep commentary separate from Scripture references.',
      'Prefer connected chapter flow over isolated verse answers.',
      'Avoid unsupported doctrinal assertions.',
      'Preserve Genesis to Revelation continuity.'
    ]
  },
  categoryTemplate: {
    key: 'example_continuity',
    nodesField: 'exampleNodes',
    referencesField: 'exampleReferences',
    modeField: 'exampleMode',
    requiredSections: [
      'foundation_continuity',
      'messiah_continuity',
      'covenant_continuity',
      'eternal_continuity'
    ]
  },
  completedCategories: [
    'faith',
    'obedience',
    'assembly',
    'holiness',
    'mercy',
    'grace',
    'peace',
    'love',
    'hope',
    'righteousness',
    'salvation',
    'judgment',
    'resurrection',
    'covenant',
    'restoration',
    'wisdom',
    'word',
    'light',
    'kingdom',
    'messiah'
  ],
  backlogCategories: [
    'repentance',
    'forgiveness',
    'sanctification',
    'commandments',
    'appointed_times',
    'sabbath',
    'prayer',
    'fasting',
    'spirit',
    'truth',
    'life',
    'bread',
    'water',
    'shepherd',
    'temple',
    'priesthood',
    'sacrifice',
    'blood',
    'passover',
    'atonement',
    'firstfruits',
    'harvest',
    'trumpets',
    'tabernacles',
    'clean_and_unclean',
    'dietary_instruction',
    'idolatry',
    'false_prophets',
    'babylon',
    'beast_kingdoms',
    'new_jerusalem'
  ],
  nextCategoryQueue: [
    'repentance',
    'forgiveness',
    'sanctification',
    'commandments',
    'appointed_times',
    'sabbath'
  ]
};

function listRoadmap() {
  return SCRIPTURE_CATEGORY_ROADMAP;
}

function getNextCategory() {
  return SCRIPTURE_CATEGORY_ROADMAP.nextCategoryQueue[0] || null;
}

module.exports = {
  SCRIPTURE_CATEGORY_ROADMAP,
  listRoadmap,
  getNextCategory
};
