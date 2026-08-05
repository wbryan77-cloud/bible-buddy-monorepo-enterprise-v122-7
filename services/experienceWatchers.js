/**
 * BIE v1.1 — Watchers facade (read-only / recommendation generators).
 * Modes: OFF | SHADOW | ADVISORY | ADMIN_REVIEW
 * Never autonomous mutation.
 */

const { appendExperienceEvent } = require('./experienceEventLedger');
const { createLearningRecord } = require('./learningRecordStore');
const { readExperienceEvents } = require('./experienceEventLedger');

const WATCHER_MODES = Object.freeze(['OFF', 'SHADOW', 'ADVISORY', 'ADMIN_REVIEW']);

const DEFAULT_MODE = String(process.env.BIE_WATCHER_MODE || 'SHADOW').toUpperCase();

function getWatcherMode() {
  const m = DEFAULT_MODE;
  return WATCHER_MODES.includes(m) ? m : 'SHADOW';
}

function runRecurringFailureWatcher({ limit = 300 } = {}) {
  const mode = getWatcherMode();
  if (mode === 'OFF') return { ok: true, mode, findings: [] };

  const events = readExperienceEvents({ limit });
  const failTypes = [
    'ANSWER_REJECTED',
    'CURRENT_MESSAGE_MISS',
    'TOPIC_DRIFT',
    'SCRIPTURE_FIDELITY_FAILURE',
    'HISTORICAL_ACCURACY_FAILURE',
    'GROUNDING_FAILURE',
    'MEMORY_MISS',
    'COMPANION_TRUST_BREAK',
  ];
  const counts = {};
  for (const e of events) {
    if (!failTypes.includes(e.eventType)) continue;
    const key = `${e.eventType}:${e.topic || e.lane || 'general'}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  const findings = Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .map(([key, n]) => {
      const [eventType, topic] = key.split(':');
      return {
        watcherId: 'recurring_failure_cluster',
        eventType,
        topic,
        recurrence: n,
        mode,
        autonomousMutation: false,
      };
    });

  if (mode === 'SHADOW' || mode === 'ADVISORY' || mode === 'ADMIN_REVIEW') {
    for (const f of findings.slice(0, 10)) {
      appendExperienceEvent({
        eventType: 'DRIFT_ALERT',
        topic: f.topic,
        evaluationResults: f,
        privacyScope: 'INTERNAL_ENGINEERING',
        governanceStatus: mode === 'ADMIN_REVIEW' ? 'READY_FOR_ADMIN_REVIEW' : 'OBSERVED',
        mutationFlags: {
          doctrineChanged: false,
          evidenceActivated: false,
          productionBehaviorChanged: false,
        },
      });
      if (mode === 'ADMIN_REVIEW') {
        createLearningRecord({
          behaviorFamily: 'watcher_recurring_failure',
          failurePattern: f.eventType,
          expectedBehavior: `Investigate recurring ${f.eventType} on ${f.topic}`,
          affectedOwner: 'experienceWatchers',
          evidence: [f],
          confidence: f.recurrence >= 5 ? 'high' : 'medium',
          founderMark: null,
        });
      }
    }
  }

  return { ok: true, mode, findings, canMutateProduction: false };
}

function runDriftWatcherFromHealth(runtimeHealth = {}) {
  const mode = getWatcherMode();
  if (mode === 'OFF') return { ok: true, mode, alerts: [] };
  const alerts = [];
  // Non-mutating: only observe counters if present.
  const errRate = Number(runtimeHealth.errorRate || 0);
  if (errRate > 0.05) {
    alerts.push({ kind: 'error_rate_drift', value: errRate });
  }
  for (const a of alerts) {
    appendExperienceEvent({
      eventType: 'DRIFT_ALERT',
      evaluationResults: a,
      privacyScope: 'INTERNAL_ENGINEERING',
      governanceStatus: 'OBSERVED',
      mutationFlags: { productionBehaviorChanged: false },
    });
  }
  return { ok: true, mode, alerts, canMutateProduction: false };
}

module.exports = {
  WATCHER_MODES,
  getWatcherMode,
  runRecurringFailureWatcher,
  runDriftWatcherFromHealth,
};
