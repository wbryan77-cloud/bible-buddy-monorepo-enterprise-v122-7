function buildLongMemoryGraph(input = {}) {
  const permissions = input.permissions || {};

  return {
    enabled: !!permissions.longMemory,
    mode: 'summary_first',
    graph: {
      nodes: [
        'faith_journey',
        'wellness_patterns',
        'life_goals',
        'emotional_themes',
        'documents_projects',
        'relationship_patterns',
      ],
      edges: ['supports', 'stresses', 'encourages', 'needs_followup'],
    },
    memoryFeatures: [
      'memory_summaries',
      'emotional_continuity',
      'goal_history',
      'life_patterns',
      'faith_journey_summaries',
      'contextual_recall',
    ],
    rules: [
      'Use user-approved summaries by default.',
      'Allow inspect, correction, export, and deletion.',
      'Never use memory to manipulate the user.',
      'Use memory to serve and simplify life.',
    ],
  };
}

module.exports = { buildLongMemoryGraph };
