const { buildTeachingGeneration } = require('./runtimeCanonicalMediaTeachingGenerationEngine');
const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');

function buildAISermonFlow({
  category = '',
  verses = [],
  completionKey = '',
  prophecyKey = '',
  sermonTheme = ''
} = {}) {
  const teachingGeneration = buildTeachingGeneration({
    category,
    verses,
    completionKey,
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
    sermonTheme,
    aiSermonFlow: {
      teachingGeneration,
      continuityInsights,
      sermonStructures: [
        'genesis-foundation',
        'prophetic-expansion',
        'messiah-fulfillment',
        'apostolic-application',
        'revelation-completion'
      ]
    },
    sermonObjective:
      'Generate Genesis to Revelation continuity-safe sermon flows line upon line and precept upon precept.'
  };
}

module.exports = {
  buildAISermonFlow
};
