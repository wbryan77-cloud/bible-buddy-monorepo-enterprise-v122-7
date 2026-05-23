function retrieveDoctrineMemory({ userId, topic, memoryStore = [] }) {
  const matches = memoryStore.filter(entry => {
    return entry.userId === userId && entry.topic === topic;
  });

  return {
    userId,
    topic,
    retrievedMemories: matches,
    retrievalMode: 'doctrine_aware_scripture_memory'
  };
}

module.exports = { retrieveDoctrineMemory };
