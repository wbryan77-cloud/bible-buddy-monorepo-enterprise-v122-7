const { buildPrayerContinuityContext } = require('./runtimePrayerContinuityEngine');
const { buildRelationalContinuityPrompt } = require('./relationalContinuityPromptBuilder');

function buildVoicePrayerSession({
  userId,
  message = '',
  scripture = [],
}) {
  const prayerContext = buildPrayerContinuityContext(userId);

  const relationalContext = buildRelationalContinuityPrompt({
    userId,
    currentMessage: message,
  });

  const rendered = [
    'Prayer Companion Session',
    '',
    'Scripture References:',
    ...(scripture || []).map((item, index) => `${index + 1}. ${item}`),
    '',
    'Prayer Continuity Topics:',
    ...(prayerContext.activePrayerTopics || []),
  ].join('\n');

  return {
    scriptureFirst: true,
    voiceCompanionEnabled: true,
    prayerContinuityEnabled: true,
    relationalContext,
    prayerContext,
    rendered,
    audioReady: true,
  };
}

module.exports = {
  buildVoicePrayerSession,
};
