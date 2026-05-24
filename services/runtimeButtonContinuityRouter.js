const { buildStructuredCompanionRuntime } = require('./structuredCompanionRuntime');
const { buildJourneyResponse, getJourneyContext } = require('./dailyBibleJourneyRuntime');
const { buildStudyContinuation } = require('./continuityStudySessionRuntime');

function normalizeMode(mode = '') {
  return String(mode || '').toLowerCase().trim();
}

function buildButtonRoute({
  userId,
  mode,
  message,
  references = [],
  summary = '',
  recentSessions = [],
}) {
  const normalized = normalizeMode(mode);

  if (normalized.includes('daily') || normalized.includes('journey')) {
    const journey = getJourneyContext(userId);
    return {
      type: 'daily-bible-journey',
      payload: buildJourneyResponse(journey),
    };
  }

  if (normalized.includes('study')) {
    const continuation = buildStudyContinuation({
      userId,
      topic: message,
    });

    return {
      type: 'study-continuation',
      continuation,
      payload: buildStructuredCompanionRuntime({
        userId,
        message,
        mode,
        references,
        summary,
        recentSessions,
      }),
    };
  }

  return {
    type: 'relational-runtime',
    payload: buildStructuredCompanionRuntime({
      userId,
      message,
      mode,
      references,
      summary,
      recentSessions,
    }),
  };
}

module.exports = {
  buildButtonRoute,
};
