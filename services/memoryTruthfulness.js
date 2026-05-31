const TRUTH_LEVEL = Object.freeze({
  KNOWN: 'known',
  LIKELY: 'likely',
  PARTIAL: 'partial',
  UNKNOWN: 'unknown',
});

const IMPORTANCE_TIER = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

const HIGH_RETENTION_CATEGORIES = new Set([
  'grief_events',
  'health_concerns',
  'prayer_requests',
  'family_concerns',
  'important_people',
  'ongoing_goals',
]);

const MEDIUM_RETENTION_CATEGORIES = new Set([
  'favorite_study_topics',
  'recurring_struggles',
  'life_milestones',
  'open_loop',
]);

const LOW_RETENTION_CATEGORIES = new Set([
  'conversation',
  'continuity',
  'ephemeral_questions',
  'temporary_topics',
]);

function classifyImportance(category = '', importance = 'normal', detail = '') {
  if (importance === 'high' || HIGH_RETENTION_CATEGORIES.has(category)) {
    return IMPORTANCE_TIER.HIGH;
  }
  if (LOW_RETENTION_CATEGORIES.has(category)) {
    return IMPORTANCE_TIER.LOW;
  }
  if (MEDIUM_RETENTION_CATEGORIES.has(category)) {
    return IMPORTANCE_TIER.MEDIUM;
  }
  if (category === 'ongoing_goals' && /major|life|career|family|health/.test(String(detail))) {
    return IMPORTANCE_TIER.HIGH;
  }
  if (category === 'important_people') {
    return IMPORTANCE_TIER.HIGH;
  }
  return IMPORTANCE_TIER.MEDIUM;
}

function classifyTruthLevel({ hit, frequency = 1, ageWindow = 'last_7_days' }) {
  if (!hit) return TRUTH_LEVEL.UNKNOWN;
  if (frequency >= 2 || hit.importance === 'high') {
    if (['current_conversation', 'earlier_today', 'yesterday', 'last_7_days'].includes(ageWindow)) {
      return TRUTH_LEVEL.KNOWN;
    }
    return TRUTH_LEVEL.LIKELY;
  }
  if (hit.detail || hit.message || hit.issue) {
    return ageWindow === 'older' ? TRUTH_LEVEL.PARTIAL : TRUTH_LEVEL.LIKELY;
  }
  return TRUTH_LEVEL.PARTIAL;
}

function phrasingForTruthLevel(level, content) {
  switch (level) {
    case TRUTH_LEVEL.KNOWN:
      return `I remember you mentioning ${content} recently.`;
    case TRUTH_LEVEL.LIKELY:
      return `From what we discussed recently, ${content}.`;
    case TRUTH_LEVEL.PARTIAL:
      return `I have a partial memory that ${content}.`;
    default:
      return null;
  }
}

function filterByImportance(memories = [], minTier = IMPORTANCE_TIER.LOW) {
  const rank = { high: 3, medium: 2, low: 1 };
  const min = rank[minTier] || 1;
  return memories.filter(
    (m) => rank[classifyImportance(m.category, m.importance, m.detail || m.issue)] >= min
  );
}

function retainHighImportanceMemories(memories = [], limit = 30) {
  const ranked = memories.map((m) => ({
    ...m,
    tier: classifyImportance(m.category, m.importance, m.detail || m.issue),
  }));

  const high = ranked.filter((m) => m.tier === IMPORTANCE_TIER.HIGH);
  const medium = ranked.filter((m) => m.tier === IMPORTANCE_TIER.MEDIUM);
  const low = ranked.filter((m) => m.tier === IMPORTANCE_TIER.LOW);

  const highCap = Math.min(high.length, Math.ceil(limit * 0.55));
  const mediumCap = Math.min(medium.length, Math.ceil(limit * 0.35));
  const lowCap = Math.max(0, limit - highCap - mediumCap);

  return [
    ...high.slice(-highCap),
    ...medium.slice(-mediumCap),
    ...low.slice(-lowCap),
  ];
}

function buildTruthfulnessMeta(hits = []) {
  const { classifyTimestamp } = require('./memoryRecallEngine');
  return hits.map((hit) => {
    const ageWindow = hit.timeWindow || classifyTimestamp(hit.at);
    const level = classifyTruthLevel({ hit, frequency: hit.frequency || 1, ageWindow });
    return {
      source: hit.source || 'relationship',
      category: hit.category,
      age: ageWindow,
      importance: classifyImportance(hit.category, hit.importance, hit.detail || hit.message),
      confidence: level,
      truthLevel: level,
    };
  });
}

function isEphemeralQuestion(message = '') {
  const text = String(message).trim();
  if (text.length > 120) return false;
  return /^(what is|what are|who is|how do|tell me about|define|explain)\b/i.test(text) &&
    !/\b(my|i am|i've|we|pray|hurt|lost|goal|family)\b/i.test(text);
}

module.exports = {
  TRUTH_LEVEL,
  IMPORTANCE_TIER,
  HIGH_RETENTION_CATEGORIES,
  LOW_RETENTION_CATEGORIES,
  classifyImportance,
  classifyTruthLevel,
  phrasingForTruthLevel,
  filterByImportance,
  retainHighImportanceMemories,
  buildTruthfulnessMeta,
  isEphemeralQuestion,
};
