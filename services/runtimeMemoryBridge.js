const fs = require('fs');
const path = require('path');
const { saveReplayRecord } = require('./runtimeReplayQA');
const { saveRegressionRecord, calculateContinuityScore } = require('./continuityRegressionRuntime');
const { saveRuntimeProvenance } = require('./scriptureHistoryProvenanceRuntime');

// DEPRECATED for live buddy path (Sprint 2.12A): buddyBrain uses companionRelationshipOrchestrator
// and direct continuity/personality writes instead. Kept for structuredCompanionRuntime and QA tooling.
const { getContinuityMemory, saveContinuityMemory } = require('./continuityMemoryRuntime');
const { savePersonalityContinuity, getPersonalityContinuity } = require('./runtimePersonalityContinuity');

function buildMemoryBridgeContext({ userId, message, references = [] }) {
  const continuity = getContinuityMemory(userId);
  const personality = getPersonalityContinuity(userId);

  return {
    continuity,
    personality,
    references,
    scriptureFirst: true,
    continuityEnabled: true,
  };
}

function persistRuntimeInteraction({
  userId,
  message,
  response,
  references = [],
  history = [],
  topic = 'general-study',
}) {
  saveContinuityMemory({
    userId,
    message,
    response,
  });

  savePersonalityContinuity({
    userId,
    message,
  });

  const continuityScore = calculateContinuityScore({
    references,
    continuityUsed: true,
  });

  saveRegressionRecord({
    userId,
    topic,
    references,
    continuityUsed: true,
    score: continuityScore,
  });

  saveReplayRecord({
    userId,
    message,
    response,
    runtime: {
      scriptureFirst: true,
      continuityEnabled: true,
      continuityScore,
    },
  });

  saveRuntimeProvenance({
    userId,
    topic,
    scripture: references,
    history,
    mode: response?.mode || 'study',
    continuityUsed: true,
  });

  return {
    continuityScore,
    persisted: true,
    scriptureFirst: true,
  };
}

module.exports = {
  buildMemoryBridgeContext,
  persistRuntimeInteraction,
};
