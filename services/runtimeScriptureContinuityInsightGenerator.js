const { buildCanonicalTimeline } = require('./runtimeCanonicalHistoricalTimelineEngine');
const { rankSemanticContinuity } = require('./runtimeCanonicalSemanticRankingAI');
const { mapRevelationCompletion } = require('./runtimeDynamicRevelationCompletionMapper');

function generateContinuityInsights({
  category = '',
  verses = [],
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const timeline = buildCanonicalTimeline();

  const rankedContinuity = rankSemanticContinuity({
    category,
    verses,
    chapterContext: 'genesis-to-revelation'
  });

  const revelationCompletion = mapRevelationCompletion({
    completionKey,
    category,
    prophecyKey
  });

  return {
    category,
    insights: {
      timeline,
      rankedContinuity,
      revelationCompletion
    },
    insightObjective:
      'Generate Genesis to Revelation continuity insights line upon line and precept upon precept.'
  };
}

module.exports = {
  generateContinuityInsights
};
