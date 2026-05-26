const { buildRestorationContinuity } = require('./runtimeCanonicalRevelationRestorationEngine');
const { mapRevelationCompletion } = require('./runtimeDynamicRevelationCompletionMapper');

function buildEternalKingdomContinuity({
  category = '',
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const restoration = buildRestorationContinuity({
    category,
    completionKey,
    prophecyKey,
    verses
  });

  const revelationCompletion = mapRevelationCompletion({
    completionKey,
    category,
    prophecyKey
  });

  return {
    category,
    eternalKingdom: {
      restoration,
      revelationCompletion,
      kingdomStages: [
        'promise-of-kingdom',
        'messiah-kingdom-arrival',
        'apostolic-kingdom-witness',
        'revelation-kingdom-fulfillment',
        'eternal-kingdom-completion'
      ]
    },
    kingdomObjective:
      'Preserve Genesis to Revelation eternal kingdom continuity canonically.'
  };
}

module.exports = {
  buildEternalKingdomContinuity
};
