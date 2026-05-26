const { buildScripturePrayerGuidance } = require('./runtimeScriptureContinuityPrayerEngine');
const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');

function buildDevotionalContinuity({
  category = '',
  references = [],
  question = '',
  totalDays = 30,
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const prayerGuidance = buildScripturePrayerGuidance({
    category,
    references,
    question,
    completionKey,
    prophecyKey,
    verses
  });

  const spiritualFormation = buildSpiritualFormationJourney({
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    devotionalContinuity: {
      prayerGuidance,
      spiritualFormation,
      devotionalStructures: [
        'daily-scripture-reflection',
        'kingdom-encouragement',
        'prayer-and-meditation',
        'discipleship-growth',
        'continuity-based-devotionals'
      ]
    },
    devotionalObjective:
      'Generate Genesis to Revelation devotional continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildDevotionalContinuity
};
