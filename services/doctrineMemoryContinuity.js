function buildDoctrineMemoryEntry({ topic = '', message = '', scriptures = [] }) {
  return {
    topic,
    summary: String(message).slice(0, 500),
    scriptures,
    createdAt: new Date().toISOString(),
    continuityMode: 'line_upon_line',
  };
}

function mergeDoctrineMemory(existing = [], nextEntry = {}) {
  const memory = Array.isArray(existing) ? existing : [];
  memory.push(nextEntry);

  return memory.slice(-50);
}

module.exports = {
  buildDoctrineMemoryEntry,
  mergeDoctrineMemory,
};