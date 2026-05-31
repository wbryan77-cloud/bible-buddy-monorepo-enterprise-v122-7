const { CONTINUITY_RULES } = require('./doctrineContinuityRules');
const {
  MODE,
  TIER,
  tierLabel,
  tierForNode,
} = require('./scriptureCertaintyFramework');
const {
  evaluateDoctrineTopicSafety,
  mapDoctrineTopicToRegistryKey,
} = require('./doctrineSafetyLayer');
const {
  findModeViolations,
  normalizeMode,
} = require('./studyModeGating');

const NORMAL_MODE_TIER_VIOLATION_PHRASES = [
  'proven by archaeology',
  'historical evidence confirms',
  'josephus proves',
  'this is speculation but',
  'definitely rome is',
  'without question this nation is',
];

function detectNormalModeTierViolations(reply = '') {
  const lower = String(reply || '').toLowerCase();
  const matches = [];

  for (const phrase of NORMAL_MODE_TIER_VIOLATION_PHRASES) {
    if (lower.includes(phrase)) {
      matches.push(`normal_mode_tier_violation:${phrase}`);
    }
  }

  return matches;
}

function buildCertaintyValidation({ topic = '', mode = MODE.NORMAL_DOCTRINE, scriptures = [] } = {}) {
  const registryKey = mapDoctrineTopicToRegistryKey(topic);
  const safety = registryKey
    ? evaluateDoctrineTopicSafety(topic, mode)
    : null;

  const scriptureNodes = (scriptures || []).map((item) => {
    if (typeof item === 'string') {
      return { reference: item, tier: TIER.A };
    }
    return {
      reference: item.reference || item,
      tier: item.tier || TIER.A,
      strongB: item.strongB === true,
    };
  });

  const scriptureViolations = scriptureNodes.length
    ? findModeViolations(scriptureNodes, mode)
    : [];

  return {
    registryTopicKey: registryKey,
    requestedMode: normalizeMode(mode),
    safety,
    aggregateTier: safety?.aggregateTier || null,
    confidenceScore: safety?.confidenceScore || 0,
    effectiveMode: safety?.effectiveMode || normalizeMode(mode),
    eligibleForNormalDoctrine: safety?.eligibleForNormalDoctrine || false,
    tierLabel: safety?.aggregateTier ? tierLabel(safety.aggregateTier) : null,
    scriptureViolations,
  };
}

function validateDoctrineResponse(reply = '', topic = '', options = {}) {
  const lower = String(reply || '').toLowerCase();
  const issues = [];
  let score = 100;

  const rules = CONTINUITY_RULES[topic];

  if (rules) {
    for (const phrase of rules.forbiddenPhrases || []) {
      if (lower.includes(String(phrase).toLowerCase())) {
        score -= 30;
        issues.push(`forbidden_phrase:${phrase}`);
      }
    }

    if (topic === 'dietaryLaw') {
      if (!lower.includes('acts 10:28') && !lower.includes('acts 11')) {
        score -= 15;
        issues.push('missing_contextual_explanation');
      }
    }

    if (topic === 'sabbath') {
      if (!lower.includes('genesis 2') || !lower.includes('exodus 20')) {
        score -= 15;
        issues.push('missing_foundation_chain');
      }
    }

    if (topic === 'feast_days') {
      if (!lower.includes('leviticus 23')) {
        score -= 15;
        issues.push('missing_foundation_chain');
      }
    }

    if (topic === 'resurrection_timeline') {
      if (!lower.includes('matthew 12:40') && !lower.includes('matthew 12')) {
        score -= 15;
        issues.push('missing_foundation_chain');
      }
    }
  }

  const requestedMode = options.mode || MODE.NORMAL_DOCTRINE;
  const certainty = buildCertaintyValidation({
    topic,
    mode: requestedMode,
    scriptures: options.scriptures || [],
  });

  if (certainty.safety?.found && requestedMode === MODE.NORMAL_DOCTRINE) {
    if (!certainty.eligibleForNormalDoctrine) {
      issues.push('certainty:normal_doctrine_ineligible');
      score -= 5;
    }

    const tierViolations = detectNormalModeTierViolations(reply);
    for (const violation of tierViolations) {
      issues.push(violation);
      score -= 10;
    }
  }

  if (certainty.scriptureViolations.length) {
    issues.push('certainty:scripture_tier_violation');
    score -= 5;
  }

  return {
    passed: score >= 75,
    score,
    issues,
    certainty,
  };
}

module.exports = {
  validateDoctrineResponse,
  buildCertaintyValidation,
  detectNormalModeTierViolations,
};
