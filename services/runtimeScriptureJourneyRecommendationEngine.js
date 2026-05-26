const { expandCanonicalTopic } = require('./runtimeCanonicalTopicExpansionAI');
const { scoreCanonicalContinuity } = require('./runtimeCanonicalContinuityScoringAI');

function recommendScriptureJourney({
  category = '',
  references = []
} = {}) {
  const expansion = expandCanonicalTopic({
    category
  });

  const scoring = scoreCanonicalContinuity({
    category,
    references
  });

  return {
    category,
    recommendedJourney: {
      startingCategory: category,
      expandedDomains: expansion.linkedDomains || [],
      continuityScore: scoring.continuityScore,
      recommendedTraversal: [
        'foundation',
        'prophetic-expansion',
        'messiah-fulfillment',
        'apostolic-witness',
        'revelation-completion'
      ]
    },
    recommendationObjective:
      'Recommend Genesis to Revelation continuity study journeys.'
  };
}

module.exports = {
  recommendScriptureJourney
};
