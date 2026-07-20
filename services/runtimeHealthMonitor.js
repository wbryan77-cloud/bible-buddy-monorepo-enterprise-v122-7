/**
 * Phase 4H — Runtime health + memory pressure guard.
 */

const fs = require('fs');
const path = require('path');
const v8 = require('v8');
const { appendJsonlSafe } = require('./safeJsonlWriter');

const DATA_DIR = path.join(__dirname, '..', 'data');
const HEALTH_PATH = path.join(DATA_DIR, 'runtime-health.json');
const HISTORY_PATH = path.join(DATA_DIR, 'runtime-health-history.jsonl');

const startedAt = Date.now();
const WARN_RSS_MB = Number(process.env.BIBLEBUDDY_MEMORY_WARN_MB || 350);
const CRITICAL_RSS_MB = Number(process.env.BIBLEBUDDY_MEMORY_CRITICAL_MB || 450);
const HEALTH_HISTORY_MAX = Number(process.env.BIBLEBUDDY_HEALTH_HISTORY_MAX_LINES || 1000);
const MAX_RECENT_ERRORS = 20;

const metrics = {
  uptimeMs: 0,
  pid: process.pid,
  heapUsedMB: 0,
  rssMB: 0,
  heapLimitMB: 0,
  memoryPressureLevel: 'normal',
  activeSessions: 0,
  activeDoctrineStates: 0,
  openAiCalls: 0,
  strictDoctrineCalls: 0,
  strictDoctrineOpenAiBlocked: 0,
  continuations: 0,
  errors: 0,
  timeouts: 0,
  fallbackCount: 0,
  averageLatencyMs: 0,
  maxLatencyMs: 0,
  totalRequests: 0,
  lastRequestAt: null,
  openAiDisabled: process.env.BIBLEBUDDY_DISABLE_OPENAI === '1',
  recentErrors: [],
  recentTimeouts: [],
  recentFallbacks: [],
  contractClarifiers: 0,
  alphaActiveTesters: 0,
  alphaSessionsToday: 0,
  alphaFeedbackCount: 0,
  alphaFlaggedDoctrineIssues: 0,
  alphaFallbackCount: 0,
  alphaAverageLatency: 0,
  alphaNotificationQueueCount: 0,
  alphaCaptureCount: 0,
  // PHASE_6H Part 7 — Founder Observation Layer. Lightweight, in-process
  // product-improvement counters (never personal profiling — no per-user
  // identity is stored here, only aggregate counts), reusing this existing
  // health-monitor module rather than a new analytics engine. Surfaced
  // read-only in the Admin Founder Readiness tab.
  observation: {
    witnessRetrievalCount: 0,
    historicalContextUsedCount: 0,
    originalLanguageUsedCount: 0,
    prayerUsageCount: 0,
    lessonAlignmentUsageCount: 0,
    continuationUsageCount: 0,
    questionCategoryCounts: {},
  },
};

let alphaLatencySum = 0;
let alphaLatencyCount = 0;
const alphaSessionsTodaySet = new Set();
let latencySum = 0;
let latencyCount = 0;

function sampleMemory() {
  const mem = process.memoryUsage();
  metrics.heapUsedMB = Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10;
  metrics.rssMB = Math.round((mem.rss / 1024 / 1024) * 10) / 10;
  try {
    const heapStats = v8.getHeapStatistics();
    metrics.heapLimitMB = Math.round((heapStats.heap_size_limit / 1024 / 1024) * 10) / 10;
  } catch {
    metrics.heapLimitMB = 0;
  }
  if (metrics.rssMB >= CRITICAL_RSS_MB) metrics.memoryPressureLevel = 'critical';
  else if (metrics.rssMB >= WARN_RSS_MB) metrics.memoryPressureLevel = 'warn';
  else metrics.memoryPressureLevel = 'normal';
}

function countDoctrineStates() {
  try {
    const file = path.join(DATA_DIR, 'doctrine-conversation-state.json');
    if (!fs.existsSync(file)) return 0;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Object.keys(data.users || {}).length;
  } catch {
    return 0;
  }
}

function countActiveSessions() {
  try {
    const { getRecentSessionCacheSize } = require('./buddyBrain');
    return getRecentSessionCacheSize();
  } catch {
    return 0;
  }
}

function pushRecentError(entry) {
  metrics.recentErrors = [...metrics.recentErrors, entry].slice(-MAX_RECENT_ERRORS);
}

function trimHealthHistoryFile() {
  try {
    if (!fs.existsSync(HISTORY_PATH)) return;
    const stat = fs.statSync(HISTORY_PATH);
    if (stat.size < HEALTH_HISTORY_MAX * 200) return;
    const fd = fs.openSync(HISTORY_PATH, 'r');
    const chunk = Math.min(stat.size, HEALTH_HISTORY_MAX * 180);
    const buf = Buffer.alloc(chunk);
    fs.readSync(fd, buf, 0, chunk, stat.size - chunk);
    fs.closeSync(fd);
    let text = buf.toString('utf8');
    const firstNl = text.indexOf('\n');
    if (firstNl >= 0) text = text.slice(firstNl + 1);
    const lines = text.trim().split('\n').filter(Boolean);
    const kept = lines.slice(-HEALTH_HISTORY_MAX);
    fs.writeFileSync(HISTORY_PATH, `${kept.join('\n')}\n`, 'utf8');
  } catch (e) {
    console.warn('[runtimeHealth] history trim failed:', e.message);
  }
}

function handleMemoryPressure() {
  const level = metrics.memoryPressureLevel;
  if (level === 'normal') return { level, actions: [] };

  const actions = [];
  try {
    const { runStateTtlCleanup } = require('./stateTtlCleanup');
    const ttl = runStateTtlCleanup();
    actions.push('state_ttl_cleanup');
    if (ttl?.results) actions.push(`removed:${ttl.results.map((r) => r.removed).join('+')}`);
  } catch (e) {
    pushRecentError({ at: new Date().toISOString(), type: 'ttl_cleanup_failed', detail: e.message });
  }

  try {
    const { trimRecentSessionCache } = require('./buddyBrain');
    trimRecentSessionCache();
    actions.push('session_cache_trim');
  } catch (_) {
    /* optional */
  }

  trimHealthHistoryFile();
  actions.push('health_history_trim');

  appendJsonlSafe(path.join(DATA_DIR, 'phase4h-memory-pressure.jsonl'), {
    event: 'memory_pressure',
    level,
    rssMB: metrics.rssMB,
    heapUsedMB: metrics.heapUsedMB,
    actions,
  });

  return { level, actions };
}

function recordRequestOutcome({
  userId = '',
  latencyMs = 0,
  ok = true,
  route = '',
  strictDoctrine = false,
  openAiCalled = false,
  error = '',
  timeout = false,
} = {}) {
  metrics.totalRequests += 1;
  metrics.lastRequestAt = new Date().toISOString();
  if (latencyMs > 0) {
    latencySum += latencyMs;
    latencyCount += 1;
    metrics.averageLatencyMs = Math.round(latencySum / latencyCount);
    if (latencyMs > metrics.maxLatencyMs) metrics.maxLatencyMs = latencyMs;
  }
  if (!ok) {
    metrics.errors += 1;
    pushRecentError({ at: new Date().toISOString(), error: String(error).slice(0, 120), route, userId: userId ? 'set' : '' });
  }
  if (timeout) {
    metrics.timeouts += 1;
    metrics.recentTimeouts = [...metrics.recentTimeouts, { at: new Date().toISOString(), route }].slice(-MAX_RECENT_ERRORS);
  }
  if (strictDoctrine) metrics.strictDoctrineCalls += 1;
  if (openAiCalled) metrics.openAiCalls += 1;
  if (strictDoctrine && !openAiCalled) metrics.strictDoctrineOpenAiBlocked += 1;
  if (/witness|continuation|another verse/i.test(route)) metrics.continuations += 1;
  if (/fallback|emergency|guarantee/i.test(route)) metrics.fallbackCount += 1;
  sampleMemory();
  metrics.activeDoctrineStates = countDoctrineStates();
  metrics.activeSessions = countActiveSessions();

  if (metrics.totalRequests % 50 === 0) {
    try {
      require('./buddyBrain').trimRecentSessionCache();
    } catch (_) {
      /* optional */
    }
  }

  if (metrics.memoryPressureLevel !== 'normal') {
    handleMemoryPressure();
  }

  persistSnapshot();
}

function recordStrictDoctrineBypass(userId = '') {
  metrics.strictDoctrineCalls += 1;
  metrics.strictDoctrineOpenAiBlocked += 1;
  sampleMemory();
  persistSnapshot();
}

function recordAlphaCapture({ testerId = '', sessionId = '', latencyMs = 0, fallback = false, error = null } = {}) {
  metrics.alphaCaptureCount += 1;
  metrics.alphaActiveTesters = Math.max(metrics.alphaActiveTesters, countAlphaTesters());
  if (sessionId) alphaSessionsTodaySet.add(`${testerId}:${sessionId}`);
  metrics.alphaSessionsToday = alphaSessionsTodaySet.size;
  if (latencyMs > 0) {
    alphaLatencySum += latencyMs;
    alphaLatencyCount += 1;
    metrics.alphaAverageLatency = Math.round(alphaLatencySum / alphaLatencyCount);
  }
  if (fallback) metrics.alphaFallbackCount += 1;
  if (error) metrics.alphaFlaggedDoctrineIssues += 1;
  persistSnapshot();
}

function recordAlphaFeedback({ tag = '', testerId = '' } = {}) {
  metrics.alphaFeedbackCount += 1;
  if (tag === 'wrong_doctrine') metrics.alphaFlaggedDoctrineIssues += 1;
  persistSnapshot();
}

function setAlphaNotificationQueueCount(count = 0) {
  metrics.alphaNotificationQueueCount = count;
  persistSnapshot();
}

function countAlphaTesters() {
  try {
    const { listTesters } = require('./alphaTesterManager');
    return listTesters().length;
  } catch {
    return 0;
  }
}

function recordContractHandled({
  userId = '',
  category = '',
  route = '',
} = {}) {
  metrics.contractClarifiers += 1;
  metrics.recentFallbacks = [
    ...metrics.recentFallbacks,
    {
      at: new Date().toISOString(),
      type: 'contract_clarifier',
      category: String(category).slice(0, 40),
      route: String(route).slice(0, 60),
      userId: userId ? 'set' : '',
    },
  ].slice(-MAX_RECENT_ERRORS);
  persistSnapshot();
}

function recordRouteFallback({
  error = '',
  errorCode = 'RUNTIME_ERROR',
  routeOwner = '',
  userId = '',
  message = '',
} = {}) {
  metrics.errors += 1;
  metrics.fallbackCount += 1;
  metrics.recentFallbacks = [
    ...metrics.recentFallbacks,
    {
      at: new Date().toISOString(),
      type: 'route_fallback',
      errorCode,
      routeOwner: String(routeOwner).slice(0, 80),
      userId: userId ? 'set' : '',
    },
  ].slice(-MAX_RECENT_ERRORS);
  pushRecentError({
    at: new Date().toISOString(),
    type: 'route_fallback',
    errorCode,
    routeOwner: String(routeOwner).slice(0, 160),
    error: String(error).slice(0, 200),
    userId: userId ? 'set' : '',
    messagePreview: String(message).slice(0, 80),
  });
  persistSnapshot();
}

const MAX_OBSERVATION_CATEGORIES = 60;

/**
 * PHASE_6H Part 7 — Founder Observation Layer. Records only aggregate,
 * product-improvement counters from a single completed /buddy/chat (or
 * lesson-alignment) turn: which category of question it was, whether a
 * witness/original-language/historical-context/prayer/continuation path
 * was used. No message text, no user identity, no free-form content is
 * stored here — this module only ever increments numbers.
 */
function recordFounderObservation({
  category = null,
  witnessRetrieved = false,
  historicalContextUsed = false,
  originalLanguageUsed = false,
  prayerUsed = false,
  lessonAlignmentUsed = false,
  continuationUsed = false,
} = {}) {
  const obs = metrics.observation;
  if (witnessRetrieved) obs.witnessRetrievalCount += 1;
  if (historicalContextUsed) obs.historicalContextUsedCount += 1;
  if (originalLanguageUsed) obs.originalLanguageUsedCount += 1;
  if (prayerUsed) obs.prayerUsageCount += 1;
  if (lessonAlignmentUsed) obs.lessonAlignmentUsageCount += 1;
  if (continuationUsed) obs.continuationUsageCount += 1;
  if (category) {
    const key = String(category).slice(0, 60);
    if (obs.questionCategoryCounts[key] != null || Object.keys(obs.questionCategoryCounts).length < MAX_OBSERVATION_CATEGORIES) {
      obs.questionCategoryCounts[key] = (obs.questionCategoryCounts[key] || 0) + 1;
    }
  }
  persistSnapshot();
}

function getRuntimeHealthSnapshot() {
  metrics.uptimeMs = Date.now() - startedAt;
  sampleMemory();
  metrics.activeDoctrineStates = countDoctrineStates();
  metrics.activeSessions = countActiveSessions();
  metrics.pid = process.pid;
  return {
    ok: true,
    at: new Date().toISOString(),
    ...metrics,
    openAiConfigured: !!process.env.OPENAI_API_KEY,
    openAiDisabled: process.env.BIBLEBUDDY_DISABLE_OPENAI === '1',
    memoryWarnMb: WARN_RSS_MB,
    memoryCriticalMb: CRITICAL_RSS_MB,
  };
}

function persistSnapshot() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const snap = getRuntimeHealthSnapshot();
    fs.writeFileSync(HEALTH_PATH, JSON.stringify(snap, null, 2), 'utf8');
    appendJsonlSafe(HISTORY_PATH, {
      at: snap.at,
      heapUsedMB: snap.heapUsedMB,
      rssMB: snap.rssMB,
      memoryPressureLevel: snap.memoryPressureLevel,
      totalRequests: snap.totalRequests,
      errors: snap.errors,
      timeouts: snap.timeouts,
      openAiCalls: snap.openAiCalls,
      strictDoctrineCalls: snap.strictDoctrineCalls,
      averageLatencyMs: snap.averageLatencyMs,
      maxLatencyMs: snap.maxLatencyMs,
    });
    trimHealthHistoryFile();
  } catch (e) {
    console.warn('[runtimeHealth] persist failed:', e.message);
  }
}

module.exports = {
  recordRequestOutcome,
  recordStrictDoctrineBypass,
  recordRouteFallback,
  recordContractHandled,
  recordAlphaCapture,
  recordAlphaFeedback,
  recordFounderObservation,
  setAlphaNotificationQueueCount,
  getRuntimeHealthSnapshot,
  persistSnapshot,
  handleMemoryPressure,
  sampleMemory,
};
