const {
  MODE,
  TIER,
  tierForNode,
  isTierAllowedForMode,
  filterNodesForMode,
} = require('./scriptureCertaintyFramework');

const MODE_RANK = Object.freeze({
  [MODE.NORMAL_DOCTRINE]: 3,
  [MODE.ADVANCED_STUDY]: 2,
  [MODE.RESEARCH_QUESTION]: 1,
});

const NO_AUTO_PROMOTION = true;

function normalizeMode(mode = '') {
  const value = String(mode || MODE.NORMAL_DOCTRINE).trim();
  if (Object.values(MODE).includes(value)) return value;
  return MODE.NORMAL_DOCTRINE;
}

function getAllowedTiersForMode(mode = MODE.NORMAL_DOCTRINE) {
  const normalized = normalizeMode(mode);

  if (normalized === MODE.NORMAL_DOCTRINE) {
    return [TIER.A, `${TIER.B}:strong`];
  }

  if (normalized === MODE.ADVANCED_STUDY) {
    return [TIER.A, TIER.B, TIER.C];
  }

  return [TIER.A, TIER.B, TIER.C, TIER.D, TIER.E];
}

function validateNodeForMode(node = {}, mode = MODE.NORMAL_DOCTRINE) {
  const tier = tierForNode(node);
  if (!tier) {
    return { allowed: false, reason: 'missing_tier' };
  }

  const allowed = isTierAllowedForMode(tier, mode, node);
  return {
    allowed,
    reason: allowed ? 'tier_allowed' : `tier_${tier}_not_allowed_for_${mode}`,
  };
}

function filterChainForMode(nodes = [], mode = MODE.NORMAL_DOCTRINE) {
  return filterNodesForMode(nodes, normalizeMode(mode));
}

function canPromoteMode() {
  return !NO_AUTO_PROMOTION ? true : false;
}

function isModeTransitionAllowed(fromMode = '', toMode = '') {
  const from = normalizeMode(fromMode);
  const to = normalizeMode(toMode);

  if (from === to) return true;

  if (NO_AUTO_PROMOTION) {
    const fromRank = MODE_RANK[from] || 0;
    const toRank = MODE_RANK[to] || 0;
    return toRank <= fromRank;
  }

  return true;
}

function resolveEffectiveMode({
  requestedMode = MODE.NORMAL_DOCTRINE,
  recommendedMode = MODE.NORMAL_DOCTRINE,
  eligibleForRequestedMode = true,
} = {}) {
  const requested = normalizeMode(requestedMode);
  const recommended = normalizeMode(recommendedMode);

  if (eligibleForRequestedMode) {
    return {
      effectiveMode: requested,
      adjusted: false,
      reason: 'requested_mode_allowed',
    };
  }

  if (!isModeTransitionAllowed(requested, recommended)) {
    return {
      effectiveMode: requested,
      adjusted: false,
      reason: 'no_auto_promotion_blocks_adjustment',
    };
  }

  return {
    effectiveMode: recommended,
    adjusted: requested !== recommended,
    reason: 'downgraded_to_recommended_mode',
  };
}

function findModeViolations(nodes = [], mode = MODE.NORMAL_DOCTRINE) {
  const list = Array.isArray(nodes) ? nodes : [];
  const violations = [];

  for (const node of list) {
    const check = validateNodeForMode(node, mode);
    if (!check.allowed) {
      violations.push({
        reference: node.reference,
        tier: tierForNode(node),
        reason: check.reason,
      });
    }
  }

  return violations;
}

module.exports = {
  MODE,
  TIER,
  NO_AUTO_PROMOTION,
  normalizeMode,
  getAllowedTiersForMode,
  validateNodeForMode,
  filterChainForMode,
  canPromoteMode,
  isModeTransitionAllowed,
  resolveEffectiveMode,
  findModeViolations,
};
