const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');
const { buildCovenantTimeline } = require('./runtimeCanonicalCovenantTimelineEngine');

function buildBiblicalLanguageContinuity({
  category = '',
  references = [],
  verses = [],
  question = '',
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const continuityInsights = generateContinuityInsights({
    category,
    verses,
    completionKey,
    prophecyKey
  });

  const covenantTimeline = buildCovenantTimeline({
    category,
    verses,
    completionKey,
    prophecyKey
  });

  return {
    category,
    biblicalLanguageContinuity: {
      continuityInsights,
      covenantTimeline,
      languageStructures: [
        'hebrew-theme-continuity',
        'greek-concept-continuity',
        'strongs-word-linkages',
        'covenant-terminology-mapping',
        'genesis-to-revelation-semantic-flow'
      ]
    },
    languageObjective:
      'Guide Genesis to Revelation biblical language continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildBiblicalLanguageContinuity
};