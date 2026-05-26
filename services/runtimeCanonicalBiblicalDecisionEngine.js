const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');
const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');

function buildBiblicalDecisionGuidance({
  category = '',
  references = [],
  question = '',
  decisionPaths = []
} = {}) {
  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  const continuityInsights = generateContinuityInsights({
    category,
    verses: references.map(reference => ({
      reference,
      category,
      keywords: []
    })),
    completionKey: 'kingdom-discernment',
    prophecyKey: 'wisdom'
  });

  return {
    category,
    biblicalDecisionGuidance: {
      discernment,
      continuityInsights,
      decisionPaths,
      wisdomStructures: [
        'prayerful-discernment',
        'scripture-confirmation',
        'covenant-alignment',
        'wise-counsel',
        'kingdom-fruit'
      ]
    },
    decisionObjective:
      'Guide Genesis to Revelation biblical decision making line upon line and precept upon precept.'
  };
}

module.exports = {
  buildBiblicalDecisionGuidance
};
