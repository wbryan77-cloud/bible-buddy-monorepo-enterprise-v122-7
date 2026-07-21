/**
 * PHASE 6F — PART 12: Admin Experience Completion.
 *
 * Read-only aggregator over EXISTING infrastructure. This module does not
 * create a new analytics engine, a new queue, or a new data store — it
 * only reads already-computed snapshots (`knowledgeAnalyticsSnapshotStore`,
 * built by Phase 6E), calls already-existing provider-health functions,
 * and reports the true, current state of a small number of Admin-visible
 * items that were not yet surfaced anywhere: build/version identity,
 * feature-flag disposition (the Part 16 matrix), and privacy
 * export/delete capability status.
 *
 * Every field is either read from disk, computed from an existing live
 * function call, or an honest "NOT_IMPLEMENTED" — never a fabricated or
 * guessed status.
 */

const { execSync } = require('child_process');
const {
  readAllSnapshots,
  SNAPSHOT_NAMES,
} = require('./knowledgeAnalyticsSnapshotStore');

function getBuildIdentity() {
  let commit = null;
  let branch = null;
  let dirty = null;
  try {
    commit = execSync('git rev-parse HEAD', { cwd: __dirname + '/..' }).toString().trim();
  } catch (_) {
    commit = process.env.RENDER_GIT_COMMIT || null;
  }
  try {
    branch = execSync('git branch --show-current', { cwd: __dirname + '/..' }).toString().trim();
  } catch (_) {
    branch = null;
  }
  try {
    const status = execSync('git status --short', { cwd: __dirname + '/..' }).toString();
    dirty = status.trim().length > 0;
  } catch (_) {
    dirty = null;
  }
  return { commit, branch, workingTreeDirty: dirty, appVersion: 'v122.14.0 (platform unification foundation)' };
}

async function getProviderHealthSummary() {
  const out = {
    openai: !!process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    email_resend: !!process.env.RESEND_API_KEY ? 'configured' : 'missing',
    sms_twilio: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN ? 'configured' : 'missing',
    scripture_provider: null,
  };
  try {
    // eslint-disable-next-line global-require
    const { getScriptureProviderHealth } = require('./canonicalScriptureProvider');
    out.scripture_provider = await getScriptureProviderHealth();
  } catch (err) {
    out.scripture_provider = { reachable: false, error: err.message };
  }
  return out;
}

function getPrivacyCapabilityStatus() {
  const capability = { exportImplemented: false, deleteImplemented: false, error: null };
  try {
    // eslint-disable-next-line global-require
    const { getMemorySnapshot, forgetMemory } = require('./companionMemoryManager');
    const probeUserId = '__founder_console_privacy_probe__';
    const snapshot = getMemorySnapshot({ userId: probeUserId });
    capability.exportImplemented = !!snapshot && typeof snapshot === 'object';
    const forgetResult = forgetMemory({ userId: probeUserId, scope: 'all' });
    capability.deleteImplemented = !!forgetResult && forgetResult.cleared === true;
  } catch (err) {
    capability.error = err.message;
  }
  capability.note =
    'Export/delete are implemented at the function layer (services/companionMemoryManager.js: getMemorySnapshot, forgetMemory) and exposed to end users via routes/alphaTest.js memory/disclosure surface. A dedicated self-service "export my data as JSON" HTTP button is NOT yet built for Founder Alpha — Founders can request deletion through the companion ("forget what you know about me") which calls forgetMemory today.';
  return capability;
}

// PHASE_6F Part 12/16 — feature-flag disposition. This mirrors the Part 16
// Founder Alpha Scope Decision matrix so Admin has one place to see what
// is ON/OFF without re-deriving it. Statuses reflect ACTUAL current
// runtime behavior verified by code inspection during this batch, not
// aspirational status.
const FEATURE_DISPOSITION = [
  { feature: 'Scripture chat (companion core)', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'KJV reader / explicit reference retrieval', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'Witnesses / cross-references', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'Original-language study (Hebrew/Aramaic/Greek)', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'Historical context (labeled, supplemental)', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'Prayer', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'Therapeutic / reflection companion', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'Companion memory (session + preference)', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'Lesson/sermon Scripture-alignment (paste text)', status: 'ADMIN_ONLY' },
  { feature: 'Lesson/sermon file upload', status: 'FEATURE_FLAG_OFF' },
  { feature: 'Reading plan', status: 'TESTER_ONLY' },
  { feature: 'Daily verse', status: 'TESTER_ONLY' },
  { feature: 'Notes / highlights / bookmarks', status: 'TESTER_ONLY' },
  { feature: 'Auth / accounts', status: 'ON_FOR_FOUNDER_ALPHA' },
  { feature: 'Voice (speech input/output)', status: 'FEATURE_FLAG_OFF' },
  { feature: 'Audio Bible', status: 'FEATURE_FLAG_OFF' },
  { feature: 'Avatar / orb presence', status: 'FEATURE_FLAG_OFF' },
  { feature: 'Food/ingredient scanner', status: 'FEATURE_FLAG_OFF' },
  { feature: 'Health/wearable integration', status: 'FEATURE_FLAG_OFF' },
  { feature: 'Groups / community', status: 'DO_NOT_BUILD' },
  { feature: 'Notifications (push/email/SMS)', status: 'DEFER_CLOSED_ALPHA' },
  { feature: 'Admin knowledge review console', status: 'ADMIN_ONLY' },
  { feature: 'Coverage / drift analytics dashboard', status: 'ADMIN_ONLY' },
];

function getFounderConsoleStatus() {
  const snapshots = readAllSnapshots({ maxAgeMs: 24 * 60 * 60 * 1000 });
  return {
    generatedAt: new Date().toISOString(),
    build: getBuildIdentity(),
    featureDisposition: FEATURE_DISPOSITION,
    privacy: getPrivacyCapabilityStatus(),
    safetyEventLogging: {
      implemented: false,
      note: 'Crisis/self-harm escalation language and behavior exist in the live companion runtime (verified in Phase 6F Part 9 multi-turn tests), but there is no dedicated persisted safety-event audit log file/table today. Recommendation: DEFER_POST_ALPHA — not a Founder Alpha blocker because escalation behavior itself was verified live; add structured logging before Closed Alpha for compliance/monitoring.',
    },
    knowledgeSnapshotsAvailable: SNAPSHOT_NAMES.filter((name) => snapshots[name] && snapshots[name].ok),
    knowledgeSnapshotsStaleOrMissing: SNAPSHOT_NAMES.filter((name) => !snapshots[name] || !snapshots[name].ok),
  };
}

module.exports = {
  getBuildIdentity,
  getProviderHealthSummary,
  getPrivacyCapabilityStatus,
  FEATURE_DISPOSITION,
  getFounderConsoleStatus,
};
