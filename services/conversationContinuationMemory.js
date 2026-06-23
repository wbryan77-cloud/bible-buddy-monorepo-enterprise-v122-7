/**
 * Conversation Continuation Memory
 * Industry-standard role:
 * - short follow-ups are handled before doctrine/no-glitch/OpenAI routing
 * - continuation owns "tell me more", "decision", "better prayer", "stop"
 */

const {
  getDoctrineConversationState,
  updateDoctrineConversationState,
} = require('./doctrineConversationState');

const CONTINUATION_RE =
  /^(tell me more|more|go deeper|explain more|continue|what do you mean|why|how so|decision|better|better prayer|deeper prayer|prayer as i asked|stop)\.?$/i;

function isContinuationTurn(message = '') {
  return CONTINUATION_RE.test(String(message || '').trim());
}

function getContinuationMemory(userId) {
  const state = getDoctrineConversationState(userId);
  return state.conversationMemory || state.sessionMemory?.conversationMemory || null;
}

function saveContinuationMemory(userId, { message = '', answer = {}, humanNeed = null, route = null } = {}) {
  if (!userId || !answer?.reply) return null;

  const state = getDoctrineConversationState(userId);
  const memory = {
    lastUserMessage: message,
    lastReply: String(answer.reply || '').slice(0, 1200),
    lastReplySummary: String(answer.reply || '').slice(0, 300),
    lastScripture: answer.scripture || [],
    lastHumanNeed:
      humanNeed ||
      answer.runtime?.liveTruthTrace?.orchestratorHumanNeed ||
      answer.runtime?.contractDecision?.humanNeed ||
      answer.runtime?.companionIntent ||
      null,
    lastRoute: route || answer.runtime?.masterRoute || null,
    lastDoctrineTopic: answer.runtime?.doctrineTopic || null,
    updatedAt: new Date().toISOString(),
  };

  updateDoctrineConversationState(userId, {
    conversationMemory: memory,
    sessionMemory: {
      ...(state.sessionMemory || {}),
      conversationMemory: memory,
    },
  });

  return memory;
}

function buildContinuationReply({ userId, message = '' } = {}) {
  const memory = getContinuationMemory(userId);
  const m = String(message || '').trim().toLowerCase();
  const need = memory?.lastHumanNeed;
  const route = memory?.lastRoute || '';

  if (/^stop\.?$/.test(m)) {
    return {
      reply: "I hear you. I'll stop that topic. What do you want to talk about now?",
      scripture: [],
      masterRoute: 'conversation_owner_stop',
      clearState: true,
    };
  }

  if (/better prayer|deeper prayer|prayer as i asked|^better$/.test(m) || need === 'prayer' || /prayer/i.test(route)) {
    return {
      reply:
        "Yes. Let’s pray deeper. Father, I come to You needing peace, wisdom, and strength. Help me slow down, hear clearly, and walk in truth instead of fear. Give me a clean heart, a steady mind, and courage to do what is right. Lead me by Your word, protect me from confusion, and help me trust You one step at a time. In Jesus’ name, amen.",
      scripture: [
        { reference: 'Philippians 4:6-7', theme: 'prayer' },
        { reference: 'James 1:5', theme: 'wisdom' },
        { reference: 'Psalm 51:10', theme: 'clean heart' },
      ],
      masterRoute: 'conversation_owner_prayer_continuation',
    };
  }

  if (/^decision\.?$/.test(m) || /decision/.test(m)) {
    return {
      reply:
        "I hear you. This is about a real-life decision, not a Bible topic menu. Tell me the decision you’re facing, what choices are in front of you, and what feels heavy about it. Then we can slow it down and look for the wise next step.",
      scripture: [{ reference: 'James 1:5', theme: 'wisdom' }],
      masterRoute: 'conversation_owner_life_decision',
    };
  }

  if (/tell me more|more|go deeper|explain more|continue|what do you mean/.test(m)) {
    if (memory?.lastReplySummary && !/core_connection_error|fallback/i.test(route)) {
      return {
        reply:
          `${memory.lastReplySummary} I can keep going from there. Tell me which part you want me to go deeper on, and I’ll stay with the same conversation instead of changing the subject.`,
        scripture: memory.lastScripture || [],
        masterRoute: 'conversation_owner_continue_previous',
      };
    }

    return {
      reply:
        "BibleBuddy helps in a few simple ways: you can ask Bible questions, ask for prayer, talk through something hard, or ask for help applying Scripture to a real situation. For Bible teaching, the goal is line upon line and precept upon precept — using Scripture as the authority, not man’s tradition. For life situations, Buddy should listen first, understand what you mean, and then respond with care.",
      scripture: [],
      masterRoute: 'conversation_owner_app_identity_continuation',
    };
  }

  return null;
}

module.exports = {
  isContinuationTurn,
  getContinuationMemory,
  saveContinuationMemory,
  buildContinuationReply,
};
