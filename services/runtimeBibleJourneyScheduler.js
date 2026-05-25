const JOURNEY_PLAN = {
  1: {
    oldTestament: ['Genesis 1-2'],
    newTestament: ['Matthew 1'],
    psalms: ['Psalm 1'],
    proverbs: ['Proverbs 1'],
  },
  2: {
    oldTestament: ['Genesis 3-4'],
    newTestament: ['Matthew 2'],
    psalms: ['Psalm 2'],
    proverbs: ['Proverbs 2'],
  },
};

function getJourneyDay(day = 1) {
  return JOURNEY_PLAN[day] || {
    oldTestament: [],
    newTestament: [],
    psalms: [],
    proverbs: [],
  };
}

function buildJourneySchedule({ currentDay = 1, includeListening = true }) {
  const plan = getJourneyDay(currentDay);

  return {
    scriptureFirst: true,
    currentDay,
    includeListening,
    plan,
    progressionEnabled: true,
    structure: {
      oldTestament: plan.oldTestament,
      newTestament: plan.newTestament,
      psalms: plan.psalms,
      proverbs: plan.proverbs,
    },
  };
}

function renderJourneySchedule(schedule = {}) {
  return [
    `Day ${schedule.currentDay}`,
    '',
    'Old Testament:',
    ...(schedule.structure?.oldTestament || []),
    '',
    'New Testament:',
    ...(schedule.structure?.newTestament || []),
    '',
    'Psalms:',
    ...(schedule.structure?.psalms || []),
    '',
    'Proverbs:',
    ...(schedule.structure?.proverbs || []),
  ].join('\n');
}

module.exports = {
  getJourneyDay,
  buildJourneySchedule,
  renderJourneySchedule,
};
