const TIER = Object.freeze({
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
});

const TIER_ORDER = Object.freeze({
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
});

const TIER_LABELS = Object.freeze({
  A: 'Explicit Scripture',
  B: 'Strong Continuity',
  C: 'Possible Inference',
  D: 'Historical Interpretation',
  E: 'Speculation',
});

const MODE = Object.freeze({
  NORMAL_DOCTRINE: 'normal_doctrine',
  ADVANCED_STUDY: 'advanced_study',
  RESEARCH_QUESTION: 'research_question',
});

const MODE_ALLOWED_TIERS = Object.freeze({
  [MODE.NORMAL_DOCTRINE]: new Set([TIER.A, TIER.B]),
  [MODE.ADVANCED_STUDY]: new Set([TIER.A, TIER.B, TIER.C]),
  [MODE.RESEARCH_QUESTION]: new Set([TIER.A, TIER.B, TIER.C, TIER.D, TIER.E]),
});

function normalizeTier(tier = '') {
  const upper = String(tier || '').trim().toUpperCase();
  return TIER[upper] || null;
}

function tierForNode(node = {}) {
  if (!node || typeof node !== 'object') return null;
  return normalizeTier(node.tier);
}

function isStrongB(node = {}) {
  return tierForNode(node) === TIER.B && node.strongB === true;
}

function isTierAllowedForMode(tier, mode = MODE.NORMAL_DOCTRINE, node = {}) {
  const normalizedTier = normalizeTier(tier);
  const normalizedMode = String(mode || MODE.NORMAL_DOCTRINE).trim();

  if (!normalizedTier || !MODE_ALLOWED_TIERS[normalizedMode]) {
    return false;
  }

  if (normalizedMode === MODE.NORMAL_DOCTRINE && normalizedTier === TIER.B) {
    return node.strongB === true || isStrongB(node);
  }

  return MODE_ALLOWED_TIERS[normalizedMode].has(normalizedTier);
}

function aggregatePathTier(nodes = []) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (!list.length) return null;

  let weakest = TIER.A;
  let weakestScore = TIER_ORDER.A;

  for (const node of list) {
    const tier = tierForNode(node);
    if (!tier) continue;
    const score = TIER_ORDER[tier];
    if (score < weakestScore) {
      weakest = tier;
      weakestScore = score;
    }
  }

  return weakest;
}

function confidenceScore(nodes = []) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (!list.length) return 0;

  const weights = { A: 100, B: 85, C: 65, D: 40, E: 20 };
  let total = 0;
  let count = 0;

  for (const node of list) {
    const tier = tierForNode(node);
    if (!tier) continue;
    total += weights[tier] || 0;
    count += 1;
  }

  if (!count) return 0;
  return Math.round(total / count);
}

function tierLabel(tier = '') {
  const normalized = normalizeTier(tier);
  return normalized ? TIER_LABELS[normalized] : 'Unknown';
}

function filterNodesForMode(nodes = [], mode = MODE.NORMAL_DOCTRINE) {
  const list = Array.isArray(nodes) ? nodes : [];
  return list.filter((node) => isTierAllowedForMode(tierForNode(node), mode, node));
}

module.exports = {
  TIER,
  TIER_ORDER,
  TIER_LABELS,
  MODE,
  MODE_ALLOWED_TIERS,
  normalizeTier,
  tierForNode,
  isStrongB,
  isTierAllowedForMode,
  aggregatePathTier,
  confidenceScore,
  tierLabel,
  filterNodesForMode,
};
