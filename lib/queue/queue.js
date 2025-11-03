// src/lib/queue/queue.js
// CommonJS + safe default: memory queue. Only loads BullMQ when QUEUE_MODE=redis

const USE_REDIS = String(process.env.QUEUE_MODE || '').toLowerCase() === 'redis';

function createMemoryQueue() {
  return {
    add: async (_name, _payload) => {
      // no-op memory queue; keeps API compatible
      return { id: Date.now().toString() };
    },
  };
}

async function createRedisQueue() {
  // Lazy import so deploys don't fail if bullmq isn't installed
  let Queue;
  try {
    ({ Queue } = await import('bullmq'));
  } catch (e) {
    console.warn('[queue] BullMQ not available, falling back to memory:', e.message);
    return createMemoryQueue();
  }

  const connection =
    process.env.REDIS_URL ||
    process.env.REDIS_CONNECTION_STRING ||
    undefined;

  const opts = connection ? { connection: { url: connection } } : {};
  const q = new Queue('send', opts);

  return {
    add: async (name, payload) =>
      q.add(name, payload, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      }),
  };
}

async function createQueue() {
  if (USE_REDIS) return createRedisQueue();
  return createMemoryQueue();
}

module.exports = { createQueue };
