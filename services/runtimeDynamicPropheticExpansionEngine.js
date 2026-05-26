const { resolvePropheticFulfillment } = require('./runtimePropheticFulfillmentResolver');
const { scoreCanonicalContinuity } = require('./runtimeCanonicalContinuityScoringAI');

function expandPropheticContinuity({
  prophecyKey = '',
  category = '',
  references = []
} = {}) {
  const propheticPath = resolvePropheticFulfillment(prophecyKey);

  if (!propheticPath) {
    return {
      expanded: false,
      prophecyKey,
      reason: 'No prophetic fulfillment continuity found.'
    };
  }

  const continuityScore = scoreCanonicalContinuity({
    category,
    references: [
      ...propheticPath.prophecy,
      ...propheticPath.fulfillment,
      ...propheticPath.completion,
      ...references
    ]
  });

  return {
    expanded: true,
    prophecyKey,
    propheticExpansion: {
      prophecy: propheticPath.prophecy,
      fulfillment: propheticPath.fulfillment,
      completion: propheticPath.completion
    },
    continuityScore,
    expansionObjective:
      'Expand Genesis to Revelation prophetic continuity pathways.'
  };
}

module.exports = {
  expandPropheticContinuity
};
