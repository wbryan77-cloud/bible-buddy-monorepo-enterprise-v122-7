/**
 * Phase 4D.1 — Render audit logging for witness inventory and error firewall.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const LOG_FILES = {
  timeouts: 'phase4d1-openai-timeouts.jsonl',
  continuationFailures: 'phase4d1-continuation-failures.jsonl',
  errorLeaks: 'phase4d1-error-leaks.jsonl',
};

function appendJsonl(filename, entry = {}) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
    fs.appendFileSync(path.join(DATA_DIR, filename), `${line}\n`, 'utf8');
  } catch (e) {
    console.warn(`[phase4d1] log write failed (${filename}):`, e.message);
  }
}

function logPhase4d1OpenAiTimeout(entry = {}) {
  appendJsonl(LOG_FILES.timeouts, { event: 'openai_timeout', ...entry });
}

function logPhase4d1ContinuationFailure(entry = {}) {
  appendJsonl(LOG_FILES.continuationFailures, { event: 'continuation_failure', ...entry });
}

function logPhase4d1ErrorLeak(entry = {}) {
  appendJsonl(LOG_FILES.errorLeaks, { event: 'error_leak', ...entry });
}

function logPhase4d1CircuitBreaker(entry = {}) {
  appendJsonl(LOG_FILES.continuationFailures, { event: 'circuit_breaker_bypass', ...entry });
}

module.exports = {
  LOG_FILES,
  logPhase4d1OpenAiTimeout,
  logPhase4d1ContinuationFailure,
  logPhase4d1ErrorLeak,
  logPhase4d1CircuitBreaker,
};
