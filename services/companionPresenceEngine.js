/**
 * Phase 5L — Emotional / relational presence drafts (not final authority).
 */

const { buildCuriosityFollowUp } = require('./companionCuriosityEngine');

function buildPresenceResponse({ message = '', anchor = {}, state = {} } = {}) {
  const m = String(message || '').trim();
  const familyCtx =
    anchor.currentRelationshipContext === 'family' ||
    state.familyConversationContext ||
    state.sessionMemory?.familyContext;

  if (/\boverwhelmed\b/i.test(m)) {
    const curiosity = buildCuriosityFollowUp({ message: m, anchor, humanNeed: 'emotional_support' });
    let reply =
      "I'm sorry you're carrying so much right now. What feels heaviest — family, work, health, faith, or something else? We can take it one piece at a time.";
    if (curiosity && !reply.includes(curiosity)) reply = `${reply}`;
    return {
      reply,
      scripture: [{ reference: 'Psalm 34:18', theme: 'comfort' }],
      masterRoute: 'phase5l_presence_overwhelmed',
    };
  }

  if (/\bnervous\b/i.test(m) && familyCtx) {
    const curiosity =
      'Do you want help with the words to say, or would you rather pray first?';
    return {
      reply: `You sound nervous about talking with your family about what you believe. That makes sense — those conversations can feel heavy. ${curiosity}`,
      scripture: [
        { reference: 'Joshua 1:9', theme: 'courage' },
        { reference: 'Philippians 4:6-7', theme: 'peace' },
      ],
      masterRoute: 'phase5l_presence_nervous_family',
    };
  }

  if (/\bnervous\b/i.test(m)) {
    return {
      reply:
        "I hear that you're nervous. Pause and breathe for a moment. What's weighing on you most — a conversation, a decision, or something else?",
      scripture: [{ reference: 'Philippians 4:6-7', theme: 'peace' }],
      masterRoute: 'phase5l_presence_nervous',
    };
  }

  if (/\bfamily disagree/i.test(m)) {
    return {
      reply:
        "Family disagreement can feel heavy. You don't have to win an argument — you can speak with respect and stay with Scripture. Would you like help with what to say, or would you rather pray first?",
      scripture: [{ reference: 'Colossians 4:6', theme: 'speech' }],
      masterRoute: 'phase5l_presence_family_disagree',
    };
  }

  return null;
}

function buildNextStepsResponse({ message = '', anchor = {}, state = {} } = {}) {
  const familyCtx =
    anchor.currentRelationshipContext === 'family' || state.familyConversationContext;
  const opener = familyCtx
    ? "When you're nervous about a family conversation, try this simple path:"
    : "When something feels heavy, try this simple path:";
  return {
    reply: `${opener}\n1. Pause and breathe for a moment.\n2. Pray briefly and ask God for peace.\n3. Name the actual concern — what's making you nervous?\n4. Take one practical step, not the whole conversation all at once.\n5. If you want, I can help with words to say, prayer, or a Scripture to hold onto.`,
    scripture: [{ reference: 'Philippians 4:6-7', theme: 'peace' }],
    masterRoute: 'phase5m_next_steps',
  };
}

module.exports = {
  buildPresenceResponse,
  buildNextStepsResponse,
};
