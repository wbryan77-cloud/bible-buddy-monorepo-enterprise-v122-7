const SEQUENTIAL_READING_PLAN = {
  foundation_sequence: [
    'Genesis 1-3',
    'Genesis 6-9',
    'Genesis 12',
    'Genesis 15',
    'Genesis 17'
  ],
  covenant_sequence: [
    'Exodus 12',
    'Exodus 19-20',
    'Leviticus 23',
    'Deuteronomy 16'
  ],
  kingdom_sequence: [
    '2 Samuel 7',
    'Psalm 89',
    'Isaiah 9',
    'Daniel 2',
    'Daniel 7'
  ],
  gospel_sequence: [
    'Matthew 1-2',
    'Luke 1-2',
    'John 1',
    'Luke 24',
    'John 5'
  ],
  restoration_sequence: [
    'Romans 8',
    '1 Corinthians 15',
    'Revelation 1',
    'Revelation 21-22'
  ]
};

function getSequentialReadingPlan(key = '') {
  return SEQUENTIAL_READING_PLAN[String(key || '').trim()] || null;
}

function listSequentialReadingPlans() {
  return SEQUENTIAL_READING_PLAN;
}

module.exports = {
  getSequentialReadingPlan,
  listSequentialReadingPlans,
  SEQUENTIAL_READING_PLAN
};
