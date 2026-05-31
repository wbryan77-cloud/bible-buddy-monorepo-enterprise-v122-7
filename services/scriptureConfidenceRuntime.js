const { buildTraversalContext } = require('./topicContinuityTraversal');
const { confidenceScore, aggregatePathTier, tierLabel } = require('./scriptureCertaintyFramework');
const {
  mapDoctrineTopicToRegistryKey,
  evaluateDoctrineTopicSafety,
} = require('./doctrineSafetyLayer');
const { getRegistryChain } = require('./genesisToRevelationContinuityRegistry');
const { MODE } = require('./studyModeGating');

function calculateScriptureConfidence({ references = [], continuityScore = 0, scriptureFirst = true }) {
  let confidence = 50;

  if (scriptureFirst) confidence += 15;
  if (references.length >= 3) confidence += 15;
  if (references.length >= 6) confidence += 10;
  if (continuityScore >= 80) confidence += 10;

  return Math.min(confidence, 100);
}

function buildRegistryCertainty(topic = '') {
  const registryKey = mapDoctrineTopicToRegistryKey(topic);
  if (!registryKey) return null;

  const chain = getRegistryChain(registryKey);
  if (!chain.length) return null;

  const safety = evaluateDoctrineTopicSafety(topic, MODE.NORMAL_DOCTRINE);

  return {
    registryTopicKey: registryKey,
    registryConfidenceScore: confidenceScore(chain),
    aggregateTier: aggregatePathTier(chain),
    aggregateTierLabel: tierLabel(aggregatePathTier(chain)),
    effectiveMode: safety.effectiveMode,
    eligibleForNormalDoctrine: safety.eligibleForNormalDoctrine,
    chainLength: chain.length,
  };
}

function buildConfidenceRuntime({ topic = '', references = [], continuityScore = 0 }) {
  const traversal = buildTraversalContext(topic);
  const registryCertainty = buildRegistryCertainty(topic);

  const heuristicConfidence = calculateScriptureConfidence({
    references,
    continuityScore,
    scriptureFirst: true,
  });

  const scriptureConfidence = registryCertainty
    ? Math.max(heuristicConfidence, registryCertainty.registryConfidenceScore)
    : heuristicConfidence;

  return {
    topic,
    continuityScore,
    canonicalTraversalScore: traversal.continuityScore,
    scriptureConfidence,
    heuristicConfidence,
    registryCertainty,
    scriptureFirst: true,
    canonicalTraversalEnabled: true,
    references,
    expandedParallelVerses: traversal.expandedParallelVerses,
  };
}

module.exports = {
  calculateScriptureConfidence,
  buildRegistryCertainty,
  buildConfidenceRuntime,
};
