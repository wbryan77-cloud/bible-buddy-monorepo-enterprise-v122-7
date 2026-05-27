// services/platformUnification/adapters/ethicsAdapter.js
// Platform Unification Phase — Ethics Adapter
//
// This adapter does NOT replace existing ethics systems.
// It normalizes discernment and integrity signals so the Canonical Orchestrator
// can unify moral reasoning, pastoral care, doctrine integrity, and decision continuity.

const { registerAdapter } = require('./registry');

const ethicsAdapter = registerAdapter({
  key: 'ethics',
  label: 'Ethics Adapter',
  family: 'discernment',
  status: 'connected-foundation',
  mode: 'read-only',
  sourcePaths: [
    'ethics systems',
    'discernment systems',
    'integrity guidance flows',
    'pastoral decision support',
  ],
  accepts: [
    'decision-point',
    'risk-signal',
    'integrity-check',
    'discernment-question',
    'pastoral-guidance-request',
  ],
  emits: [
    'ethics-continuity-signal',
    'doctrine-context',
    'discernment-context',
    'memory-summary-candidate',
  ],
  normalize(input = {}) {
    const scriptureRefs = Array.isArray(input.scriptureRefs)
      ? input.scriptureRefs
      : [];

    const tags = [
      'ethics',
      'discernment',
      'integrity',
      ...(Array.isArray(input.tags) ? input.tags : []),
    ];

    return {
      sourceSystem: 'ethics',
      type: input.type || 'decision-point',
      text:
        input.text ||
        input.note ||
        input.summary ||
        input.question ||
        'Ethics continuity signal.',
      scriptureRefs,
      tags,
      metadata: {
        ethicsType: input.ethicsType || input.type || 'discernment',
        sensitivity: input.sensitivity || 'pastoral',
        doctrineReview: input.doctrineReview || true,
        continuityPriority: input.continuityPriority || 'high',
        outputPreference: input.outputPreference || 'gentle-discernment-guidance',
      },
    };
  },
});

module.exports = ethicsAdapter;
