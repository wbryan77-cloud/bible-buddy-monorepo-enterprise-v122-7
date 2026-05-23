function buildTopicMemoryEmbeddings(topic, verses = []) {
  return {
    topic: String(topic || '').toLowerCase(),
    embeddingKey: `topic_${String(topic || '').toLowerCase().replace(/\s+/g, '_')}`,
    canonicalVerses: verses,
    createdAt: new Date().toISOString(),
    embeddingType: 'scripture_topic_memory'
  };
}

module.exports = { buildTopicMemoryEmbeddings };
