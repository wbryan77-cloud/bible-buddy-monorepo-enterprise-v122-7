const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');
const { buildHistoricalContinuity } = require('./runtimeScriptureContinuityHistoricalEngine');

function detectContinuityPatterns({
  category = '',
  era = '',
  verses = [],
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const historicalEra = buildHistoricalContinuity({
    era
  });

  const insights = generateContinuityInsights({
    category,
    verses,
    completionKey,
    prophecyKey
  });

  return {
    category,
    era,
    detectedPatterns: {
      historicalEra,
      continuityInsights: insights,
      covenantPatterns: [
        'promise-and-fulfillment',
        'judgment-and-restoration',
        'messiah-and-kingdom',
        'creation-and-new-creation'
      ]
    },
    patternRecognitionObjective:
      'Detect Genesis to Revelation covenant and fulfillment continuity patterns canonically.'
  };
}

module.exports = {
  detectContinuityPatterns
};
