const { retrieveSemanticContinuity } = require('./runtimeCanonicalSemanticRetrievalEngine');

function rankSemanticContinuity({
  category = '',
  verses = [],
  chapterContext = ''
} = {}) {
  const retrieval = retrieveSemanticContinuity({
    category,
    verses,
    chapterContext
  });

  const rankedResults = retrieval.semanticCluster.map((entry, index) => ({
    reference: entry.verseReference,
    category: entry.category,
    semanticRank: index + 1,
    keywordStrength: entry.embeddingVector.keywordCount
  }));

  return {
    category,
    rankedResults,
    rankingObjective:
      'Prioritize strongest Genesis to Revelation semantic continuity pathways.'
  };
}

module.exports = {
  rankSemanticContinuity
};
