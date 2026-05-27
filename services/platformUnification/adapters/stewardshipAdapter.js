// services/platformUnification/adapters/stewardshipAdapter.js
// Platform Unification Phase — Stewardship Adapter
//
// This adapter does NOT replace existing stewardship systems.
// It normalizes stewardship and temple-care signals so the Canonical Orchestrator
// can connect health, habits, food, resources, and responsibility into unified discipleship continuity.

const { registerAdapter } = require('./registry');

const stewardshipAdapter = registerAdapter({
  key: 'stewardship',
  label: 'Stewardship Adapter',
  family: 'temple-care',
  status: 'connected-foundation',
  mode: 'read-only',
  sourcePaths: [
    'stewardship systems',
    'temple care systems',
    'food and ingredient guidance',
    'habit and resource stewardship flows',
  ],
  accepts: [
    'habit-signal',
    'scan-result',
    'resource-choice',
    'nutrition-reflection',
    'temple-care-checkin',
  ],
  emits: [
    'stewardship-continuity-signal',
    'discipleship-context',
    'temple-care-context',
    'memory-summary-candidate',
  ],
  normalize(input = {}) {
    const scriptureRefs = Array.isArray(input.scriptureRefs)
      ? input.scriptureRefs
      : [];

    const tags = [
      'stewardship',
      'temple-care',
      'habits',
      ...(Array.isArray(input.tags) ? input.tags : []),
    ];

    return {
      sourceSystem: 'stewardship',
      type: input.type || 'habit-signal',
      text:
        input.text ||
        input.note ||
        input.summary ||
        input.reflection ||
        'Stewardship continuity signal.',
      scriptureRefs,
      tags,
      metadata: {
        stewardshipType: input.stewardshipType || input.type || 'habit',
        focusArea: input.focusArea || 'temple-care',
        cadence: input.cadence || 'daily',
        continuityPriority: input.continuityPriority || 'medium',
        outputPreference: input.outputPreference || 'gentle-habit-guidance',
      },
    };
  },
});

module.exports = stewardshipAdapter;
