function buildEdgeProcessing(input = {}) {
  const permissions = input.permissions || {};

  return {
    enabled: !!permissions.edgeProcessing,
    capabilities: [
      'local_session_cache',
      'privacy_filters',
      'offline_ui_state_future',
      'local_orb_state',
      'reduced_cloud_routing_future',
    ],
    orchestration: {
      mode: 'hybrid_local_cloud',
      privacyPriority: 'high',
    },
    localFeatures: [
      'orb_animation_state',
      'session_resume_state',
      'quiet_hour_preferences',
    ],
    cloudFeatures: [
      'deep_reasoning',
      'document_generation',
      'scripture_context_retrieval',
    ],
    rules: [
      'Do not retain raw audio or video by default.',
      'Allow the user to clear local caches.',
      'Keep cloud usage transparent.',
      'Respect user privacy settings at all times.',
    ],
  };
}

module.exports = { buildEdgeProcessing };
