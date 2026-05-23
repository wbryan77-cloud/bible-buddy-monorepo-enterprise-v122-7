function retrieveDoctrineMemory(memory = [], topic = '') {
  const records = Array.isArray(memory) ? memory : [];

  return records
    .filter((entry) => entry.topic === topic)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);
}

module.exports = {
  retrieveDoctrineMemory,
};