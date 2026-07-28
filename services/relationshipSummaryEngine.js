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
  const { selectRelationshipContext } = require('./relationshipContextSelector');
  const { getRelationshipContext } = require('./relationshipMemoryEngine');
  const rel = getRelationshipContext({ userId });
  const care = selectRelationshipContext({ userId, message });
  const personParts = [];

  if (care.importantPeople?.[0]?.label) {
    personParts.push(`you asked prayer concerning ${care.importantPeople[0].label}`);
  }
  if (rel.currentStruggle && rel.recentConcern !== 'resolved') {
    personParts.push(`you shared: ${String(rel.currentStruggle).slice(0, 100)}`);
  } else if (rel.recentConcern === 'resolved' && rel.currentStruggle) {
    personParts.push(`you shared an update: ${String(rel.currentStruggle).slice(0, 100)}`);
  } else if (care.activeBurdens?.[0]?.text) {
    personParts.push(String(care.activeBurdens[0].text).slice(0, 100));
  }
  if (rel.lastPrayerRequest) {
    personParts.push(`you asked: ${String(rel.lastPrayerRequest).slice(0, 100)}`);
  }
  if (care.ongoingTopics?.conversationObjective) {
    personParts.push(`we were focused on: ${String(care.ongoingTopics.conversationObjective).slice(0, 80)}`);
  }

  const summary = buildRelationshipSummary({ userId, message, state });
  for (const p of summary.summaryParts || []) {
    if (!personParts.some((x) => x.includes(String(p).slice(0, 20)))) personParts.push(p);
  }

  const prefBits = [];
  if (summary.preferences?.directAnswerFirst || care.relevantPreferences?.directAnswerFirst) {
    prefBits.push('you prefer direct answers with Scripture support');
  }

  if (!personParts.length && !prefBits.length) {
    return 'In this conversation I mainly have what we’ve discussed so far. I don’t invent personal details — if you want me to remember something specific, just say “please remember…” and I’ll keep it in mind.';
  }

  const lines = [];
  if (personParts.length) {
    lines.push(`Here’s what stands out about you from our conversation: ${personParts.slice(0, 4).join('; ')}.`);
  }
  if (prefBits.length) {
    lines.push(`For how I answer: ${prefBits.join('; ')}.`);
  }
  lines.push('If I missed something important, tell me and I’ll correct it.');
  return lines.join(' ');
}

module.exports = {
  buildRelationshipSummary,
  formatRecallReply,
};
