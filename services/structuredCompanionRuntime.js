// DEPRECATED for live buddy path (Sprint 2.12A): runBuddy in buddyBrain is the live orchestrator.
// This module remains for alternate structured runtime entry points and internal tooling.
const { buildRuntimeContinuityOrchestration } = require('./runtimeContinuityOrchestrator');
const { buildRelationalPromptContext } = require('./runtimePersonalityContinuity');
const { buildScriptureOnlyResponse } = require('./scriptureOnlyRuntime');
const { buildConfidenceRuntime } = require('./scriptureConfidenceRuntime');
const { buildMemoryBridgeContext } = require('./runtimeMemoryBridge');

function buildStructuredCompanionRuntime({
  userId,
  message,
  mode = 'study',
  references = [],
  summary = '',
  scriptureOnly = false,
  recentSessions = [],
}) {
  const orchestration = buildRuntimeContinuityOrchestration({
    userId,
    message,
    mode,
    references,
    summary,
    recentSessions,
  });

  const personality = buildRelationalPromptContext({ userId });

  const confidence = buildConfidenceRuntime({
    topic: orchestration.canonical.topic,
    references,
    continuityScore: orchestration.continuityScore,
  });

  const memoryBridge = buildMemoryBridgeContext({
    userId,
    message,
    references,
  });

  const scriptureRuntime = scriptureOnly
    ? buildScriptureOnlyResponse({
        topic: orchestration.canonical.topic,
        references,
        continuity: orchestration.retrieval.continuity,
      })
    : null;

  return {
    runtime: {
      scriptureFirst: true,
      retrievalFirst: true,
      continuityEnabled: true,
      canonicalTraversalEnabled: true,
      scriptureOnlyMode: scriptureOnly,
    },
    orchestration,
    personality,
    confidence,
    memoryBridge,
    scriptureRuntime,
    finalRenderedResponse: scriptureRuntime?.rendered || orchestration.rendered,
  };
}

module.exports = {
  buildStructuredCompanionRuntime,
};
