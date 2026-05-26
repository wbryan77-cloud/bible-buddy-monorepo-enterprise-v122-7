const { buildEternalKingdomContinuity } = require('./runtimeEternalKingdomContinuityEngine');
const { mapRevelationCompletion } = require('./runtimeDynamicRevelationCompletionMapper');

function buildResurrectionContinuity({
  category = '',
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const eternalKingdom = buildEternalKingdomContinuity({
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
    resurrectionContinuity: {
      eternalKingdom,
      revelationCompletion,
      resurrectionStages: [
        'promise-of-resurrection',
        'messiah-resurrection',
        'apostolic-resurrection-witness',
        'revelation-resurrection-fulfillment',
        'eternal-life-completion'
      ]
    },
    resurrectionObjective:
      'Preserve Genesis to Revelation resurrection continuity canonically.'
  };
}

module.exports = {
  buildResurrectionContinuity
};
