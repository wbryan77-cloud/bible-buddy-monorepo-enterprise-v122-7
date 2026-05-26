const { buildDevotionalContinuity } = require('./runtimeScriptureContinuityDevotionalEngine');
const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');

function buildScriptureMemorization({
  category = '',
  references = [],
  verses = [],
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const devotionalContinuity = buildDevotionalContinuity({
    category,
    references,
    question: '',
    totalDays: 30,
    completionKey,
    prophecyKey,
    verses
  });

  const continuityInsights = generateContinuityInsights({
    category,
    verses,
    completionKey,
    prophecyKey
  });

  return {
    category,
    scriptureMemorization: {
      devotionalContinuity,
      continuityInsights,
      memorizationStructures: [
        'verse-memory-cycles',
        'kingdom-theme-memorization',
        'scripture-repetition-pathways',
        'continuity-linked-memory',
        'genesis-to-revelation-memory-flow'
      ]
    },
    memorizationObjective:
      'Guide Genesis to Revelation Scripture memorization continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildScriptureMemorization
};
