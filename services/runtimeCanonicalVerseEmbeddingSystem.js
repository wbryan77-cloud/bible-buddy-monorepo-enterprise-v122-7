const { expandCanonicalKnowledgeGraph } = require('./runtimeCanonicalKnowledgeGraphExpansionLayer');

function buildVerseEmbedding({
  verseReference = '',
  category = '',
  keywords = []
} = {}) {
  const graph = expandCanonicalKnowledgeGraph();

  return {
    verseReference,
    category,
    keywords,
    embeddingVector: {
      continuityCategory: category,
      keywordCount: keywords.length,
      graphConnections: graph.expandedGraph.length
    },
    embeddingObjective:
      'Enable Genesis to Revelation continuity-aware semantic Scripture retrieval.'
  };
}

function buildSemanticContinuityCluster(verses = []) {
  return verses.map(verse =>
    buildVerseEmbedding({
      verseReference: verse.reference,
      category: verse.category,
      keywords: verse.keywords || []
    })
  );
}

module.exports = {
  buildVerseEmbedding,
  buildSemanticContinuityCluster
};
