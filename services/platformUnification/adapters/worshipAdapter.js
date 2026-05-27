// services/platformUnification/adapters/worshipAdapter.js
// Platform Unification Phase — Worship Adapter
//
// This adapter does NOT replace existing worship systems.
// It normalizes worship-centered signals so the Canonical Orchestrator can keep
// devotion, praise, gratitude, and reverence connected to the unified discipleship flow.

const { registerAdapter } = require('./registry');

const worshipAdapter = registerAdapter({
  key: 'worship',
  label: 'Worship Adapter',
  family: 'devotion',
  status: 'connected-foundation',
  mode: 'read-only',
  sourcePaths: [
    'worship systems',
    'devotional worship flows',
    'praise and gratitude prompts',
    'reverence and reflection systems',
  ],
  accepts: [
    'worship-theme',
    'praise-prompt',
    'gratitude-reflection',
    'devotional-moment',
    'song-or-prayer-context',
  ],
  emits: [
    'devotion-context',
    'worship-continuity-signal',
    'discipleship-context',
    'memory-summary-candidate',
  ],
  normalize(input = {}) {
    const scriptureRefs = Array.isArray(input.scriptureRefs)
      ? input.scriptureRefs
      : [];

    const tags = [
      'worship',
      'devotion',
      'gratitude',
      ...(Array.isArray(input.tags) ? input.tags : []),
    ];

    return {
      sourceSystem: 'worship',
      type: input.type || 'worship-theme',
      text:
        input.text ||
        input.note ||
        input.summary ||
        input.theme ||
        'Worship devotion continuity signal.',
      scriptureRefs,
      tags,
      metadata: {
        worshipTheme: input.worshipTheme || input.theme || 'unspecified',
        posture: input.posture || 'reverence',
        cadence: input.cadence || 'daily',
        continuityPriority: input.continuityPriority || 'medium',
        outputPreference: input.outputPreference || 'devotional-and-gentle',
      },
    };
  },
});

module.exports = worshipAdapter;
