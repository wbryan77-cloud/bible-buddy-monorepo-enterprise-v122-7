/**
 * Phase 4E — Live path diagnostics logging.
 */

const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');

const DATA_DIR = path.join(__dirname, '..', 'data');

function appendJsonl(filename, entry = {}) {
  appendJsonlSafe(path.join(DATA_DIR, filename), { ts: new Date().toISOString(), ...entry });
}

function logPhase4eLivePathError(entry = {}) {
  appendJsonl('phase4e-live-path-errors.jsonl', { event: 'live_path_error', ...entry });
}

function logPhase4eOpenAiBypass(entry = {}) {
  appendJsonl('phase4e-openai-bypass-confirmation.jsonl', { event: 'openai_bypass', ...entry });
}

function logPhase4eMemoryStateTrace(entry = {}) {
  appendJsonl('phase4e-memory-state-trace.jsonl', { event: 'memory_state', ...entry });
}

module.exports = {
  logPhase4eLivePathError,
  logPhase4eOpenAiBypass,
  logPhase4eMemoryStateTrace,
};
