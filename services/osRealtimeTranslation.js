const SUPPORTED_LANGUAGES = ['en', 'es', 'zh', 'ru', 'ja'];

function buildRealtimeTranslation(input = {}) {
  const permissions = input.permissions || {};

  return {
    enabled: !!permissions.realtimeTranslation,
    supportedLanguages: SUPPORTED_LANGUAGES,
    capabilities: [
      'speech_to_speech_translation_future',
      'meeting_translation_future',
      'multilingual_transcripts',
      'multilingual_prayer_study',
      'live_caption_translation_future',
    ],
    session: {
      sourceLanguage: input.sourceLanguage || 'en',
      targetLanguage: input.targetLanguage || 'en',
    },
    rules: [
      'Preserve meaning and tone when possible.',
      'Flag uncertainty in sensitive language.',
      'Ask before sending translated correspondence.',
      'Respect meeting consent and privacy.',
    ],
  };
}

module.exports = { buildRealtimeTranslation, SUPPORTED_LANGUAGES };
