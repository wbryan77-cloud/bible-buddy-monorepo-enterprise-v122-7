const {
  TIER,
  MODE,
  tierForNode,
  aggregatePathTier,
  confidenceScore,
} = require('./scriptureCertaintyFramework');
const {
  normalizeMode,
  filterChainForMode,
  resolveEffectiveMode,
  findModeViolations,
} = require('./studyModeGating');
const {
  getRegistryTopic,
  getRegistryChain,
} = require('./genesisToRevelationContinuityRegistry');

const LIVE_DOCTRINE_TOPIC_MAP = Object.freeze({
  sabbath: 'sabbath',
  dietaryLaw: 'dietary_law',
  feast_days: 'feast_days',
  traditions: 'traditions',
  resurrection_timeline: 'resurrection',
});

const NORMAL_DOCTRINE_MIN_CONFIDENCE = 75;

function mapDoctrineTopicToRegistryKey(topic = '') {
  const key = String(topic || '').trim();
  return LIVE_DOCTRINE_TOPIC_MAP[key] || key || null;
}

function hasScriptureSupport(chain = []) {
  return chain.some((node) => tierForNode(node) === TIER.A);
}

function hasContinuitySupport(chain = []) {
  const normalNodes = filterChainForMode(chain, MODE.NORMAL_DOCTRINE);
  return normalNodes.length > 0 && normalNodes.length === chain.length;
}

function isHistoricalOnlyChain(chain = []) {
  if (!chain.length) return false;
  return chain.every((node) => {
    const tier = tierForNode(node);
    return tier === TIER.D || tier === TIER.E;
  });
}

function hasInferenceOnlyChain(chain = []) {
  if (!chain.length) return false;
  return chain.some((node) => tierForNode(node) === TIER.C);
}

function recommendModeFromChain(chain = [], entry = {}) {
  if (!chain.length) {
    return {
      recommendedMode: MODE.RESEARCH_QUESTION,
      reason: 'empty_chain',
    };
  }

  if (isHistoricalOnlyChain(chain)) {
    return {
      recommendedMode: MODE.RESEARCH_QUESTION,
      reason: 'historical_or_speculative_only',
    };
  }

  const score = confidenceScore(chain);
  const eligibleNormal =
    hasScriptureSupport(chain) &&
    hasContinuitySupport(chain) &&
    score >= NORMAL_DOCTRINE_MIN_CONFIDENCE &&
    !hasInferenceOnlyChain(chain);

  if (eligibleNormal) {
    return {
      recommendedMode: MODE.NORMAL_DOCTRINE,
      reason: 'scripture_and_continuity_support',
    };
  }

  if (hasInferenceOnlyChain(chain) || score < NORMAL_DOCTRINE_MIN_CONFIDENCE) {
    return {
      recommendedMode: MODE.ADVANCED_STUDY,
      reason: 'insufficient_for_normal_doctrine',
    };
  }

  return {
    recommendedMode: entry.defaultMode || MODE.ADVANCED_STUDY,
    reason: 'default_or_advanced_required',
  };
}

function evaluateTopicSafety(topicKey = '', requestedMode = MODE.NORMAL_DOCTRINE) {
  const registryKey = String(topicKey || '').trim();
  const entry = getRegistryTopic(registryKey);
  const chain = entry ? getRegistryChain(registryKey) : [];
  const requested = normalizeMode(requestedMode);

  if (!entry) {
    return {
      topicKey: registryKey,
      found: false,
      requestedMode: requested,
      recommendedMode: MODE.ADVANCED_STUDY,
      effectiveMode: MODE.ADVANCED_STUDY,
      adjusted: requested !== MODE.ADVANCED_STUDY,
      eligibleForNormalDoctrine: false,
      eligibleForRequestedMode: false,
      scriptureSupport: false,
      continuitySupport: false,
      confidenceScore: 0,
      aggregateTier: null,
      modeViolations: [],
      reasons: ['topic_not_in_registry'],
    };
  }

  const recommendation = recommendModeFromChain(chain, entry);
  const eligibleForNormalDoctrine =
    recommendation.recommendedMode === MODE.NORMAL_DOCTRINE;
  const modeViolations = findModeViolations(chain, requested);
  const eligibleForRequestedMode = modeViolations.length === 0 &&
    (requested !== MODE.NORMAL_DOCTRINE || eligibleForNormalDoctrine);

  const effective = resolveEffectiveMode({
    requestedMode: requested,
    recommendedMode: recommendation.recommendedMode,
    eligibleForRequestedMode,
  });

  return {
    topicKey: registryKey,
    found: true,
    title: entry.title,
    defaultMode: entry.defaultMode,
    liveIntercept: !!entry.liveIntercept,
    requestedMode: requested,
    recommendedMode: recommendation.recommendedMode,
    effectiveMode: effective.effectiveMode,
    adjusted: effective.adjusted,
    eligibleForNormalDoctrine,
    eligibleForRequestedMode,
    scriptureSupport: hasScriptureSupport(chain),
    continuitySupport: hasContinuitySupport(chain),
    confidenceScore: confidenceScore(chain),
    aggregateTier: aggregatePathTier(chain),
    modeViolations,
    chainLength: chain.length,
    reasons: [recommendation.reason, effective.reason],
  };
}

function evaluateDoctrineTopicSafety(doctrineTopic = '', requestedMode = MODE.NORMAL_DOCTRINE) {
  const registryKey = mapDoctrineTopicToRegistryKey(doctrineTopic);
  return evaluateTopicSafety(registryKey, requestedMode);
}

module.exports = {
  LIVE_DOCTRINE_TOPIC_MAP,
  NORMAL_DOCTRINE_MIN_CONFIDENCE,
  mapDoctrineTopicToRegistryKey,
  evaluateTopicSafety,
  evaluateDoctrineTopicSafety,
  hasScriptureSupport,
  hasContinuitySupport,
  recommendModeFromChain,
};
