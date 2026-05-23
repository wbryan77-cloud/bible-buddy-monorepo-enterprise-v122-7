function createDoctrineSessionIndex({ userId = '', topic = '', message = '' }) {
  return {
    userId,
    topic,
    messagePreview: String(message).slice(0, 300),
    indexedAt: new Date().toISOString(),
    runtimeMode: 'doctrine_first',
  };
}

module.exports = {
  createDoctrineSessionIndex,
};