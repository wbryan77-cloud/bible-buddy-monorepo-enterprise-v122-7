const { mapRevelationCompletion } = require('./runtimeDynamicRevelationCompletionMapper');
const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');

function buildRestorationContinuity({
  category = '',
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const revelationCompletion = mapRevelationCompletion({
    completionKey,
    category,
    prophecyKey
  });

  const continuityInsights = generateContinuityInsights({
    category,
    verses,
    completionKey,
    prophecyKey
  });

  return {
    category,
    restorationContinuity: {
      revelationCompletion,
      continuityInsights,
      restorationStages: [
        'creation-foundation',
        'covenant-expansion',
        'messiah-restoration',
        'apostolic-restoration-witness',
        'new-jerusalem-completion'
      ]
    },
    restorationObjective:
      'Preserve Genesis to Revelation eternal restoration continuity canonically.'
  };
}

module.exports = {
  buildRestorationContinuity
};
