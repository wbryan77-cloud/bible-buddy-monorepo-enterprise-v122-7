const { buildCompanionPresence } = require('./runtimeCompanionPresenceEngine');
const { buildNaturalConversation } = require('./runtimeNaturalConversationRenderer');
const { buildReflectionPrompt } = require('./runtimeCompanionReflectionEngine');
const { buildPersonalizedFollowup } = require('./runtimePersonalizedFollowupEngine');

function detectConversationIntent(message = '') {
  const text = String(message || '').toLowerCase();

  if (text.includes('pray') || text.includes('prayer')) {
    return 'prayer';
  }

  if (text.includes('study') || text.includes('scripture') || text.includes('verse')) {
    return 'study';
  }

  if (text.includes('reflect') || text.includes('thinking')) {
    return 'reflection';
  }

  if (text.includes('job') || text.includes('resume') || text.includes('work')) {
    return 'practical';
  }

  return 'conversation';
}

function buildAdaptiveConversation({
  userId,
  message = '',
  scripture = [],
  summary = '',
}) {
  const intent = detectConversationIntent(message);

  const presence = buildCompanionPresence({
    userId,
    currentMessage: message,
    mode: intent,
  });

  const reflection = buildReflectionPrompt({
    userId,
    currentMessage: message,
  });

  const followup = buildPersonalizedFollowup({
    userId,
    currentMessage: message,
  });

  const naturalConversation = buildNaturalConversation({
    userId,
    message,
    scripture,
    summary,
    emotionalTone: intent === 'prayer' ? 'gentle' : 'balanced',
  });

  return {
    scriptureFirst: true,
    adaptiveConversationEnabled: true,
    intent,
    presence,
    reflection,
    followup,
    naturalConversation,
    rendered: naturalConversation.rendered,
    guidance: {
      avoidGenericResponses: true,
      preserveRelationalContinuity: true,
      prioritizeScriptureCenteredSupport: true,
      maintainNaturalConversationFlow: true,
    },
  };
}

module.exports = {
  buildAdaptiveConversation,
  detectConversationIntent,
};
