const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'companion-intelligence-events.jsonl');
const FEEDBACK_FILE = path.join(DATA_DIR, 'companion-feedback.jsonl');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function appendJsonl(file, entry) {
  fs.appendFileSync(file, JSON.stringify({ ...entry, createdAt: new Date().toISOString() }) + '\n');
}

function sanitizeText(value, max = 1200) {
  return String(value || '').slice(0, max);
}

function recordCompanionEvent(input = {}) {
  const entry = {
    type: input.type || 'session_event',
    sessionId: input.sessionId || null,
    userId: input.userId || 'anonymous',
    mode: input.mode || 'companion',
    channel: input.channel || 'web',
    durationMs: Number(input.durationMs || 0),
    latencyMs: Number(input.latencyMs || 0),
    orbState: input.orbState || null,
    safetyLevel: input.safetyLevel || 'standard',
    language: input.language || 'en',
    feature: input.feature || null,
    error: input.error ? sanitizeText(input.error, 500) : null,
    privacy: {
      rawConversationStored: false,
      rawAudioStored: false,
      rawVideoStored: false,
      summaryOnly: true,
    },
  };

  appendJsonl(EVENTS_FILE, entry);
  return { ok: true, event: entry };
}

function recordCompanionFeedback(input = {}) {
  const entry = {
    sessionId: input.sessionId || null,
    userId: input.userId || 'anonymous',
    helpful: input.helpful ?? null,
    feltUnderstood: input.feltUnderstood ?? null,
    feltPeaceful: input.feltPeaceful ?? null,
    feltTooPreachy: input.feltTooPreachy ?? null,
    wantedMoreScripture: input.wantedMoreScripture ?? null,
    voiceQuality: input.voiceQuality || null,
    responseQuality: input.responseQuality || null,
    issue: sanitizeText(input.issue, 800),
    suggestion: sanitizeText(input.suggestion, 800),
    consentForAggregateReview: input.consentForAggregateReview === true,
    privacy: {
      aggregateReview: true,
      rawConversationStored: false,
    },
  };

  appendJsonl(FEEDBACK_FILE, entry);
  return { ok: true, feedback: entry };
}

function readRecentJsonl(file, limit = 100) {
  try {
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line));
  } catch (_) {
    return [];
  }
}

function buildTestingSummary() {
  const events = readRecentJsonl(EVENTS_FILE, 250);
  const feedback = readRecentJsonl(FEEDBACK_FILE, 250);
  const sessions = events.filter((e) => e.type === 'session_event' || e.sessionId);
  const errors = events.filter((e) => e.error);
  const avg = (items, key) => {
    const nums = items.map((x) => Number(x[key] || 0)).filter((n) => Number.isFinite(n) && n > 0);
    if (!nums.length) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  };
  const yesRate = (items, key) => {
    const answered = items.filter((x) => typeof x[key] === 'boolean');
    if (!answered.length) return null;
    return Math.round((answered.filter((x) => x[key]).length / answered.length) * 100);
  };

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      events: events.length,
      feedback: feedback.length,
      sessions: sessions.length,
      errors: errors.length,
    },
    averages: {
      sessionDurationMs: avg(sessions, 'durationMs'),
      latencyMs: avg(events, 'latencyMs'),
    },
    emotionalQuality: {
      helpfulPct: yesRate(feedback, 'helpful'),
      feltUnderstoodPct: yesRate(feedback, 'feltUnderstood'),
      feltPeacefulPct: yesRate(feedback, 'feltPeaceful'),
      feltTooPreachyPct: yesRate(feedback, 'feltTooPreachy'),
      wantedMoreScripturePct: yesRate(feedback, 'wantedMoreScripture'),
    },
    recommendations: buildRecommendations({ events, feedback, errors }),
  };
}

function buildRecommendations({ events, feedback, errors }) {
  const recs = [];
  const feltTooPreachy = feedback.filter((x) => x.feltTooPreachy === true).length;
  const wantedMoreScripture = feedback.filter((x) => x.wantedMoreScripture === true).length;
  const notUnderstood = feedback.filter((x) => x.feltUnderstood === false).length;

  if (errors.length) recs.push('Review recent errors and route/module health before adding new features.');
  if (feltTooPreachy > wantedMoreScripture) recs.push('Reduce Scripture density in emotional-support sessions and listen longer first.');
  if (wantedMoreScripture > feltTooPreachy) recs.push('Offer deeper Scripture/cross-reference mode as an opt-in after listening.');
  if (notUnderstood > 2) recs.push('Improve follow-up questioning and memory-summary accuracy.');
  if (!events.length) recs.push('Begin closed alpha testing and collect session + feedback events.');
  if (!recs.length) recs.push('Continue current testing cadence and review trends weekly.');

  return recs;
}

function buildCompanionIntelligence(input = {}) {
  return {
    enabled: true,
    purpose: 'Measure whether Bible Buddy is helpful, peaceful, trustworthy, stable, and biblically grounded.',
    testingPhases: [
      'internal_smoke_test',
      'closed_alpha_ministers_and_trusted_users',
      'invite_beta',
      'public_launch_readiness',
      'continuous_quality_review',
    ],
    signals: [
      'session_duration',
      'latency',
      'error_rate',
      'felt_understood',
      'felt_peaceful',
      'helpfulness',
      'scripture_balance',
      'voice_quality',
      'feature_confusion',
    ],
    adminOutputs: [
      'weekly_quality_summary',
      'spiritual_balance_review',
      'bug_triage',
      'cost_and_latency_review',
      'recommended_next_improvements',
    ],
    safety: {
      rawAudioStored: false,
      rawVideoStored: false,
      rawConversationStoredByDefault: false,
      aggregateReview: true,
      consentRequiredForSensitiveDiagnostics: true,
    },
    currentSummary: input.includeSummary ? buildTestingSummary() : null,
  };
}

module.exports = {
  recordCompanionEvent,
  recordCompanionFeedback,
  buildTestingSummary,
  buildCompanionIntelligence,
};
