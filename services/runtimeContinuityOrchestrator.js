const { buildRetrievalRuntime } = require('./retrievalFirstRuntime');
const { buildThemeRetrievalRuntime } = require('./scriptureThemeRetrievalRuntime');
const { buildCanonicalResponse } = require('./canonicalResponseFormatter');
const { buildStructuredScriptureResponse } = require('./scriptureResponseRenderer');
const { buildClarificationRuntime } = require('./studyClarificationRuntime');
const { suppressLoopLanguage, hasGenericLoop } = require('./runtimeLoopGuard');
const { calculateContinuityScore } = require('./continuityRegressionRuntime');

function buildRuntimeContinuityOrchestration({
  userId,
  message,
  mode = 'study',
  references = [],
  summary = '',
  recentSessions = [],
}) {
  const retrieval = buildRetrievalRuntime({
    userId,
    message,
    mode,
    recentSessions,
  });

  const themeRuntime = buildThemeRetrievalRuntime({
    userId,
    message,
  });

  const clarification = buildClarificationRuntime({
    message,
    continuity: retrieval.continuity,
  });

  const canonical = buildCanonicalResponse({
    topic: themeRuntime.themes[0] || 'general-study',
    summary,
    references,
    continuity: retrieval.continuity,
  });

  const structured = buildStructuredScriptureResponse({
    topic: canonical.topic,
    summary,
    references: canonical.canonicalReferences,
    continuity: retrieval.continuity,
  });

  const continuityScore = calculateContinuityScore({
    references: canonical.canonicalReferences,
    continuityUsed: true,
  });

  const cleaned = suppressLoopLanguage(structured);

  return {
    runtime: {
      retrievalFirst: true,
      scriptureFirst: true,
      canonicalTraversalEnabled: true,
      continuityEnabled: true,
      ambiguityDetectionEnabled: true,
    },
    clarification,
    retrieval,
    canonical,
    continuityScore,
    genericLoopDetected: hasGenericLoop(cleaned),
    rendered: cleaned,
  };
}

module.exports = {
  buildRuntimeContinuityOrchestration,
};
