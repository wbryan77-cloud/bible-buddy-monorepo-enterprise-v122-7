// services/platformUnification/adapters/covenantTimelineAdapter.js
// First connected family adapter.
//
// This adapter does NOT replace covenant timeline systems.
// It only exposes a normalized orchestration contract.

const { registerAdapter } = require('./registry');

const covenantTimelineAdapter = registerAdapter({
  key: 'covenantTimeline',
  label: 'Covenant Timeline Adapter',
  family: 'scripture-history',
  status: 'connected-foundation',
  mode: 'read-only',
  sourcePaths: [
    'covenant timeline systems',
    'timeline orchestration',
    'scripture continuity',
  ],
  accepts: [
    'timeline-event',
    'covenant-reference',
    'dispensation-transition',
    'scripture-anchor',
  ],
  emits: [
    'continuity-signal',
    'knowledge-graph-node',
    'discipleship-context',
  ],
  normalize(input = {}) {
    const scriptureRefs = Array.isArray(input.scriptureRefs)
      ? input.scriptureRefs
      : [];

    return {
      sourceSystem: 'covenantTimeline',
      type: input.type || 'timeline-event',
      text:
        input.text ||
        input.summary ||
        input.timelineSummary ||
        'Covenant timeline continuity signal.',
      scriptureRefs,
      tags: [
        'covenant',
        'timeline',
        'continuity',
        ...(Array.isArray(input.tags) ? input.tags : []),
      ],
      metadata: {
        covenantPeriod: input.covenantPeriod || 'unspecified',
        anchorType: input.anchorType || 'scripture',
        continuityPriority: 'high',
      },
    };
  },
});

module.exports = covenantTimelineAdapter;
