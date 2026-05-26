const { buildScripturePrayerGuidance } = require('./runtimeScriptureContinuityPrayerEngine');
const { buildChurchLeadershipFormation } = require('./runtimeCanonicalChurchLeadershipFormationEngine');

function buildRevivalAwakeningPrayer({
  category = '',
  references = [],
  question = '',
  totalDays = 40,
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

  const churchLeadership = buildChurchLeadershipFormation({
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    revivalAwakeningPrayer: {
      prayerGuidance,
      churchLeadership,
      revivalStructures: [
        'corporate-prayer-continuity',
        'repentance-and-renewal',
        'spiritual-awakening-focus',
        'church-revival-strengthening',
        'kingdom-renewal-continuity'
      ]
    },
    revivalObjective:
      'Guide Genesis to Revelation revival and awakening prayer continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildRevivalAwakeningPrayer
};
