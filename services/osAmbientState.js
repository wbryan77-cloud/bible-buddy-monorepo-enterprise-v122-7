const DEFAULT_AMBIENT_STATE = {
  enabled: false,
  quietMode: true,
  wakeFlow: 'tap_or_shortcut',
  orbState: 'idle',
  emotionalIdleState: 'calm_available',
  backgroundRhythm: 'low_frequency',
  sessionContinuity: true,
};

function buildAmbientOSState(input = {}) {
  const permissions = input.permissions || {};
  const state = { ...DEFAULT_AMBIENT_STATE, ...(input.ambient || {}) };

  return {
    enabled: !!permissions.ambientOS || !!state.enabled,
    state,
    presence: {
      surfaces: ['app_orb', 'home_widget_future', 'watch_haptic_future', 'shortcut_future'],
      wakeFlows: ['tap_orb', 'voice_session_button', 'notification_action_future', 'device_shortcut_future'],
      idleBehavior: state.quietMode ? 'quiet_available' : 'soft_pulse',
    },
    rules: [
      'No always-on microphone.',
      'No hidden camera.',
      'Respect quiet hours.',
      'User can pause or disable ambient presence anytime.',
    ],
  };
}

module.exports = { buildAmbientOSState, DEFAULT_AMBIENT_STATE };
