const { getContinuityMemory } = require('./continuityMemoryRuntime');
const { getStudyContext } = require('./studyContinuityRuntime');
const { getJourneyContext } = require('./dailyBibleJourneyRuntime');
const { buildButtonRuntimeContext } = require('./companionButtonRuntime');

function buildRetrievalRuntime({ userId, message, mode, recentSessions = [] }) {
  const continuity = getContinuityMemory(userId);
  const studyContext = getStudyContext({ userId, message });
  const journeyContext = getJourneyContext(userId);

  const buttonRuntime = buildButtonRuntimeContext({
    mode,
    recentSessions,
    studyContext,
    journeyContext,
  });

  return {
    continuity,
    studyContext,
    journeyContext,
    buttonRuntime,
    orchestration: {
      retrievalFirst: true,
      scriptureFirst: true,
      continuityEnabled: true,
      unresolvedThreadTracking: true,
      canonicalTraversal: true,
    },
  };
}

module.exports = {
  buildRetrievalRuntime,
};
