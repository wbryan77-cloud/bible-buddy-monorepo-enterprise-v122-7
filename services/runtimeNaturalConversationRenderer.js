const { buildPersonalizedFollowup } = require('./runtimePersonalizedFollowupEngine');
const { suppressLoopLanguage } = require('./runtimeLoopGuard');

function buildNaturalConversation({
  userId,
  message = '',
  scripture = [],
  summary = '',
  emotionalTone = 'balanced',
}) {
  const followup = buildPersonalizedFollowup({
    userId,
    currentMessage: message,
  });

  let response = '';

  if (summary) {
    response += `${summary}\n\n`;
  }

  if (scripture.length) {
    response += 'Scripture References:\n';
    response += scripture.map((ref, index) => `${index + 1}. ${ref}`).join('\n');
    response += '\n\n';
  }

  if (followup.suggestions.length) {
    response += 'Continuing Thoughts:\n';
    response += followup.suggestions.slice(0, 2).join('\n');
  }

  response = suppressLoopLanguage(response);

  return {
    scriptureFirst: true,
    relationalContinuityEnabled: true,
    emotionalTone,
    rendered: response.trim(),
    followup,
  };
}

module.exports = {
  buildNaturalConversation,
};
