/**
 * Lightweight per-request memory logging — opt-in only (BUDDY_REQUEST_MEMORY_LOG=1).
 */

function isRequestMemoryLogEnabled() {
  return String(process.env.BUDDY_REQUEST_MEMORY_LOG || '').toLowerCase() === '1';
}

function snapshotMemory() {
  const mu = process.memoryUsage();
  return {
    rssMB: Math.round(mu.rss / 1024 / 1024),
    heapUsedMB: Math.round(mu.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mu.heapTotal / 1024 / 1024),
  };
}

function logRequestMemory({
  userId = null,
  message = '',
  openaiCalled = false,
  regenerated = false,
  openaiAttempts = 0,
  evidencePackApproxBytes = 0,
  latencyMs = 0,
} = {}) {
  if (!isRequestMemoryLogEnabled()) return null;

  const mem = snapshotMemory();
  const record = {
    ts: new Date().toISOString(),
    userId: userId ? String(userId).slice(0, 32) : null,
    messagePreview: String(message).slice(0, 80),
    openaiCalled,
    regenerated,
    openaiAttempts,
    evidencePackApproxBytes,
    latencyMs,
    ...mem,
  };
  console.log(`[BUDDY_MEM] ${JSON.stringify(record)}`);
  return record;
}

module.exports = {
  isRequestMemoryLogEnabled,
  snapshotMemory,
  logRequestMemory,
};
