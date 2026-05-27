// services/platformUnification/adapters/missionsAdapter.js
// Platform Unification Phase — Missions Adapter
//
// This adapter does NOT replace existing missions systems.
// It normalizes outreach and service signals so the Canonical Orchestrator
// can connect personal formation to community impact and mercy-centered action.

const { registerAdapter } = require('./registry');

const missionsAdapter = registerAdapter({
  key: 'missions',
  label: 'Missions Adapter',
  family: 'outreach',
  status: 'connected-foundation',
  mode: 'read-only',
  sourcePaths: [
    'missions systems',
    'community outreach systems',
    'service opportunity flows',
    'mercy and witness pathways',
  ],
  accepts: [
    'service-opportunity',
    'community-need',
    'mission-action',
    'outreach-followup',
    'mercy-project',
  ],
  emits: [
    'missions-continuity-signal',
    'discipleship-context',
    'community-impact-context',
    'memory-summary-candidate',
  ],
  normalize(input = {}) {
    const scriptureRefs = Array.isArray(input.scriptureRefs)
      ? input.scriptureRefs
      : [];

    const tags = [
      'missions',
      'service',
      'outreach',
      ...(Array.isArray(input.tags) ? input.tags : []),
    ];

    return {
      sourceSystem: 'missions',
      type: input.type || 'service-opportunity',
      text:
        input.text ||
        input.note ||
        input.summary ||
        input.action ||
        'Mission and outreach continuity signal.',
      scriptureRefs,
      tags,
      metadata: {
        missionType: input.missionType || input.type || 'service',
        communityFocus: input.communityFocus || 'local',
        cadence: input.cadence || 'weekly',
        continuityPriority: input.continuityPriority || 'medium',
        outputPreference: input.outputPreference || 'gentle-service-next-step',
      },
    };
  },
});

module.exports = missionsAdapter;
