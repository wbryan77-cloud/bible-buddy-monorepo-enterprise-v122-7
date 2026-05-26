const { buildSemanticContinuityCluster } = require('./runtimeCanonicalVerseEmbeddingSystem');
const { buildContinuityContext } = require('./runtimeScriptureContinuityContextEngine');

function retrieveSemanticContinuity({
  category = '',
  verses = [],
  chapterContext = ''
} = {}) {
  const semanticCluster = buildSemanticContinuityCluster(verses);

  const context = buildContinuityContext({
    category,
    references: verses.map(v => v.reference),
    chapterContext
  });

  return {
    category,
    semanticCluster,
    contextualContinuity: context,
    retrievalObjective:
      'Retrieve Genesis to Revelation continuity-aware semantic Scripture pathways.'
  };
}

module.exports = {
  retrieveSemanticContinuity
};
