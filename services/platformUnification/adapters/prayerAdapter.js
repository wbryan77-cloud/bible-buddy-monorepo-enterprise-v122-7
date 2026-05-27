// services/platformUnification/adapters/prayerAdapter.js
// Platform Unification Phase — Prayer Adapter
//
// This adapter does NOT replace existing prayer systems.
// It normalizes prayer-centered signals so the Canonical Orchestrator can keep
// requests, intercession, answered prayer, and spiritual journaling connected to continuity.

const { registerAdapter } = require('./registry');

const prayerAdapter = registerAdapter({
  key: 'prayer',
  label: 'Prayer Adapter',
  family: 'care',
  status: 'connected-foundation',
  mode: 'read-only',
  sourcePaths: [
    'prayer systems',
    'intercession flows',
    'answered prayer tracking',
    'spiritual journaling systems',
  ],
  accepts: [
    'prayer-request',
    'intercession-topic',
    'answered-prayer',
    'journal-prayer',
    'pastoral-care-signal',
  ],
  emits: [
    'prayer-continuity-signal',
    'care-context',
    'discipleship-context',
    'memory-summary-candidate',
  ],
  normalize(input = {}) {
    const scriptureRefs = Array.isArray(input.scriptureRefs)
      ? input.scriptureRefs
      : [];

    const tags = [
      'prayer',
      'care',
      'continuity',
      ...(Array.isArray(input.tags) ? input.tags : []),
    ];

    return {
      sourceSystem: 'prayer',
      type: input.type || 'prayer-request',
      text:
        input.text ||
        input.note ||
        input.summary ||
        input.request ||
        'Prayer continuity signal.',
      scriptureRefs,
      tags,
      metadata: {
        prayerType: input.prayerType || input.type || 'request',
        sensitivity: input.sensitivity || 'pastoral-care',
        cadence: input.cadence || 'as-needed',
        followUp: input.followUp || 'gentle-check-in',
        continuityPriority: input.continuityPriority || 'high',
        outputPreference: input.outputPreference || 'gentle-prayer-and-next-step',
      },
    };
  },
});

module.exports = prayerAdapter;
