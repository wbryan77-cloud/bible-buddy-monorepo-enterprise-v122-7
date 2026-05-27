// services/platformUnification/adapters/analyticsAdapter.js
// Platform Unification Phase — Analytics Adapter
//
// This adapter does NOT replace existing analytics systems.
// It normalizes orchestration analytics signals so the Canonical Orchestrator
// can unify runtime measurement, learning visibility, safety tracking,
// continuity scoring, and orchestration readiness.

const { registerAdapter } = require('./registry');

const analyticsAdapter = registerAdapter({
  key: 'analytics',
  label: 'Analytics Adapter',
  family: 'measurement',
  status: 'connected-foundation',
  mode: 'read-only',
  sourcePaths: [
    'analytics systems',
    'runtime measurement systems',
    'learning loop systems',
    'admin readiness metrics',
  ],
  accepts: [
    'event',
    'metric',
    'feedback-signal',
    'runtime-health-check',
    'continuity-score-update',
  ],
  emits: [
    'analytics-continuity-signal',
    'runtime-health-context',
    'orchestration-measurement-context',
    'memory-summary-candidate',
  ],
  normalize(input = {}) {
    const scriptureRefs = Array.isArray(input.scriptureRefs)
      ? input.scriptureRefs
      : [];

    const tags = [
      'analytics',
      'runtime-health',
      'measurement',
      ...(Array.isArray(input.tags) ? input.tags : []),
    ];

    return {
      sourceSystem: 'analytics',
      type: input.type || 'metric',
      text:
        input.text ||
        input.note ||
        input.summary ||
        input.metricName ||
        'Analytics continuity signal.',
      scriptureRefs,
      tags,
      metadata: {
        analyticsType: input.analyticsType || input.type || 'runtime-health',
        measurementCategory:
          input.measurementCategory || 'orchestration',
        continuityPriority:
          input.continuityPriority || 'medium',
        outputPreference:
          input.outputPreference || 'runtime-visibility',
        adminVisible:
          input.adminVisible !== false,
      },
    };
  },
});

module.exports = analyticsAdapter;
