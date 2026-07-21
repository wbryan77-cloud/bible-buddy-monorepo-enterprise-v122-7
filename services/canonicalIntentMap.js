/**
 * Sprint 1A.1 — Canonical Intent Mapping
 *
 * Single source of truth for high-level companion intent categories.
 *
 * Rules:
 * - Does not replace route owners.
 * - Does not change existing routes.
 * - Does not change runtime behavior.
 * - Used only as a shared vocabulary layer.
 * - Bible-first categories remain explicit.
 */

const CANONICAL_INTENTS = Object.freeze({
  CRISIS: 'crisis',

  PRAYER: 'prayer',

  EMOTIONAL_SUPPORT: 'emotional_support',
  GRIEF_SUPPORT: 'grief_support',
  HEALTH_SUPPORT: 'health_support',

  DISCERNMENT: 'discernment',
  OPEN_LIFE: 'open_life',
  JOB_DISCERNMENT: 'job_discernment',

  DOCTRINE: 'doctrine',
  STRICT_DOCTRINE: 'strict_doctrine',
  BIBLE_WIDE: 'bible_wide',
  SABBATH_HISTORY: 'sabbath_history',

  STUDY_CONTINUATION: 'study_continuation',
  MEMORY_RECALL: 'memory_recall',
  APP_IDENTITY: 'app_identity',

  OPEN_GENERAL: 'open_general',
});

const COMPANION_INTENTS = Object.freeze([
  CANONICAL_INTENTS.PRAYER,
  CANONICAL_INTENTS.EMOTIONAL_SUPPORT,
  CANONICAL_INTENTS.GRIEF_SUPPORT,
  CANONICAL_INTENTS.HEALTH_SUPPORT,
  CANONICAL_INTENTS.DISCERNMENT,
  CANONICAL_INTENTS.OPEN_LIFE,
  CANONICAL_INTENTS.JOB_DISCERNMENT,
]);

const SCRIPTURE_INTENTS = Object.freeze([
  CANONICAL_INTENTS.DOCTRINE,
  CANONICAL_INTENTS.STRICT_DOCTRINE,
  CANONICAL_INTENTS.BIBLE_WIDE,
  CANONICAL_INTENTS.SABBATH_HISTORY,
]);

function isCompanionIntent(intent = '') {
  return COMPANION_INTENTS.includes(intent);
}

function isScriptureIntent(intent = '') {
  return SCRIPTURE_INTENTS.includes(intent);
}

module.exports = {
  CANONICAL_INTENTS,
  COMPANION_INTENTS,
  SCRIPTURE_INTENTS,
  isCompanionIntent,
  isScriptureIntent,
};
