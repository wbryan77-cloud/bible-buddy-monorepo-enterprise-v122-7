function buildAvatarEmbodiment(input = {}) {
  const permissions = input.permissions || {};
  const emotion = input.emotion || {};

  return {
    enabled: !!permissions.avatarEmbodiment,
    embodimentState: {
      orbState: input.orbState || 'idle',
      facialExpression: emotion.expression || 'gentle_presence',
      eyeMovement: emotion.eyeMovement || 'calm_direct',
      breathing: emotion.breathing || 'slow_calm',
      pacing: emotion.pacing || 'warm_natural',
    },
    syncTargets: [
      'orb_animation',
      'voice_pacing',
      'future_avatar_face',
      'future_eye_motion',
      'future_mouth_motion',
      'future_haptics',
    ],
    capabilities: [
      'facial_sync_future',
      'eye_movement_future',
      'emotional_pacing',
      'breathing_realism',
      'orb_avatar_synchronization',
      'multimodal_emotion_alignment',
    ],
    rules: [
      'Do not pretend to be human or divine.',
      'Do not use camera input without active-session consent.',
      'Avoid claiming exact emotion certainty.',
      'Keep embodiment calm, respectful, and non-manipulative.',
    ],
  };
}

module.exports = { buildAvatarEmbodiment };
