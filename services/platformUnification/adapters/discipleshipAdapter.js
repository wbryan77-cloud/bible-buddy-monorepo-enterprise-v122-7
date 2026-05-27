// services/platformUnification/adapters/discipleshipAdapter.js
// Platform Unification Phase — Discipleship Adapter
//
// This adapter does NOT replace existing discipleship systems.
// It normalizes discipleship signals so the Canonical Orchestrator can compile
// one coherent, gentle next step instead of disconnected recommendations.

const { registerAdapter } = require('./registry');

const discipleshipAdapter = registerAdapter({
  key: 'discipleship',
  label: 'Discipleship Adapter',
  family: 'formation',
  status: 'connected-foundation',
  mode: 'read-only',
  sourcePaths: [
    'discipleship systems',
    'daily companion guidance',
    'formation pathways',
    'habit and study follow-through',
  ],
  accepts: [
    'formation-goal',
    'daily-next-step',
    'study-progress',
    'habit-check-in',
    'reflection-signal',
  ],
  emits: [
    'discipleship-context',
    'continuity-signal',
    'unified-next-step',
    'memory-summary-candidate',
  ],
  normalize(input = {}) {
    const scriptureRefs = Array.isArray(input.scriptureRefs)
      ? input.scriptureRefs
      : [];

    const tags = [
      'discipleship',
      'formation',
      'next-step',
      ...(Array.isArray(input.tags) ? input.tags : []),
    ];

    return {
      sourceSystem: 'discipleship',
      type: input.type || 'formation-goal',
      text:
        input.text ||
        input.note ||
        input.summary ||
        input.goal ||
        'Discipleship formation signal.',
      scriptureRefs,
      tags,
      metadata: {
        formationStage: input.formationStage || input.stage || 'unspecified',
        goal: input.goal || 'unspecified',
        cadence: input.cadence || 'daily',
        continuityPriority: input.continuityPriority || 'high',
        outputPreference: input.outputPreference || 'one-gentle-next-step',
      },
    };
  },
});

module.exports = discipleshipAdapter;
