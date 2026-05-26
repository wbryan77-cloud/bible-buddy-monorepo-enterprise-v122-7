const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');
const { buildScripturePrayerGuidance } = require('./runtimeScriptureContinuityPrayerEngine');

function buildEndurancePerseverance({
  category = '',
  references = [],
  question = '',
  totalDays = 90,
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const spiritualFormation = buildSpiritualFormationJourney({
    category,
    references,
    question,
    totalDays
  });

  const prayerGuidance = buildScripturePrayerGuidance({
    category,
    references,
    question,
    completionKey,
    prophecyKey,
    verses
  });

  return {
    category,
    endurancePerseverance: {
      spiritualFormation,
      prayerGuidance,
      perseveranceStructures: [
        'steadfast-faithfulness',
        'hope-through-trials',
        'suffering-and-endurance',
        'kingdom-perseverance',
        'revelation-hope-continuity'
      ]
    },
    perseveranceObjective:
      'Guide Genesis to Revelation endurance and perseverance continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildEndurancePerseverance
};
