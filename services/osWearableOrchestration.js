function buildWearableOrchestration(input = {}) {
  const permissions = input.permissions || {};

  return {
    enabled: !!permissions.wearables,
    supportedSurfaces: ['apple_watch_future', 'android_wear_future'],
    capabilities: [
      'haptic_prompts',
      'calm_reminders',
      'sleep_rhythm_summaries',
      'movement_pattern_summaries',
      'concerning_reading_escalation',
      'wellness_checkins',
    ],
    orchestration: {
      gentleMode: true,
      proactiveEscalation: 'concerning_readings_only',
      quietHoursAware: true,
    },
    rules: [
      'Tell the truth about readings.',
      'Do not diagnose medical conditions.',
      'Encourage professional care when readings are concerning.',
      'Use calm and non-alarming language.',
      'All wearable integrations require explicit user opt-in.',
    ],
  };
}

module.exports = { buildWearableOrchestration };
