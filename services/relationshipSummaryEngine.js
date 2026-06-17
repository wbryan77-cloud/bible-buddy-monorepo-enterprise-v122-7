/**
 * Phase 5K — Honest relationship summary recall.
 */

const { recallRelevantMemory } = require('./companionMemoryManager');
const { buildConversationAnchor } = require('./conversationAnchorEngine');

function buildRelationshipSummary({ userId, message = '', state = {} } = {}) {
  const recall = recallRelevantMemory({ userId, message });
  const anchor = buildConversationAnchor({ userId, message, state });
  const parts = [];

  if (anchor.currentRelationshipContext === 'family' && anchor.currentDoctrineConcept) {
    parts.push('we were talking about explaining clean foods to your family');
  }
  if (anchor.currentEmotion === 'nervous_or_concerned') {
    parts.push('you felt nervous about the conversation');
  }
  if (anchor.currentObstacle === 'family_disagreement') {
    parts.push('your family disagrees on this topic');
  }
  for (const item of recall.items || []) {
    if (!parts.some((p) => p.includes(item.slice(0, 20)))) parts.push(item);
  }

  return {
    knownTopics: anchor.currentTopic ? [anchor.currentTopic] : [],
    knownStruggles: anchor.unresolvedConcern ? [anchor.unresolvedConcern] : [],
    knownGoals: anchor.currentGoal ? [anchor.currentGoal] : [],
    recentConversations: parts,
    preferences: recall.snapshot?.preferences || {},
    sessionOnly: parts.length > 0 && !(recall.items?.length),
    summaryParts: parts,
  };
}

function formatRecallReply({ userId, message = '', state = {} } = {}) {
  const summary = buildRelationshipSummary({ userId, message, state });
  if (!summary.summaryParts.length) {
    return 'In this conversation I mainly have session context — what we’ve discussed so far. I don’t store sensitive personal details long-term unless you ask me to remember a preference like answer style.';
  }
  const prefs = summary.preferences?.directAnswerFirst
    ? 'I also remember you prefer direct answers with Scripture support.'
    : '';
  return `In this conversation, I remember ${summary.summaryParts.join('; ')}.${prefs ? ` ${prefs}` : ''}`;
}

module.exports = {
  buildRelationshipSummary,
  formatRecallReply,
};
