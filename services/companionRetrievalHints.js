/**
 * Retrieval hints for OpenAI-first companion path — facts only, no final prose.
 */

const { getActiveConversation } = require('./activeConversationManager');
const { classifyHealthCompanion } = require('./healthCompanionResponse');
const { classifyEmotionalSupport } = require('./griefCompanionResponse');
const { classifyPrayerIntent } = require('./prayerCompanionResponse');
const { detectHealthConcern } = require('./relationshipMemoryBridge');

function buildCompanionRetrievalHints({ userId = 'anonymous', message = '' } = {}) {
  const active = getActiveConversation(userId);
  const health = classifyHealthCompanion(message);
  const emotional = classifyEmotionalSupport(message, userId);
  const prayer = classifyPrayerIntent(message);
  const healthDetect = detectHealthConcern(message);

  return {
    activeConversationHint: active?.isActive
      ? {
          topic: active.topic,
          subtopic: active.subtopic,
          questionType: active.questionType,
          ageMs: active.conversationAge,
          note: 'Context only — do not override the current user message.',
        }
      : null,
    health: health.isHealthSupport
      ? { issue: health.health?.issue || healthDetect?.issue || 'health', detail: healthDetect?.detail || null }
      : null,
    grief: emotional.isEmotionalSupport
      ? { supportType: emotional.supportType, matched: emotional.matched, isFollowUp: emotional.isFollowUp }
      : null,
    prayer: prayer.isPrayerRequest ? { matched: true } : null,
    userAskedWhatToDo: /\bwhat (should|do) i do\b/i.test(String(message)),
    userMentionedGrief: /\bgrief\b|\bgrieving\b/i.test(String(message)),
  };
}

module.exports = {
  buildCompanionRetrievalHints,
};
