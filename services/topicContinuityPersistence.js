function persistTopicContinuity({ userId, topic, verses = [] }) {
  return {
    userId,
    topic,
    rememberedVerses: verses,
    persistenceMode: 'scripture_topic_continuity',
    updatedAt: new Date().toISOString()
  };
}

module.exports = { persistTopicContinuity };
