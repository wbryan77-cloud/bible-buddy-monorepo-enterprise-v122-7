const fs = require('fs');

fs.writeFileSync('services/conversationContinuationMemory.js', `/**
 * Phase 5P — Conversation State Owner
 * Owns short follow-ups before doctrine/no-glitch routing.
 */

const {
  getDoctrineConversationState,
  updateDoctrineConversationState,
} = require('./doctrineConversationState');

const CONTINUATION_RE =
  /^(tell me more|more|go deeper|explain more|continue|what do you mean|why|how so|decision|better|better prayer|deeper prayer|prayer as i asked|stop)\\.?$/i;

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

  if (/^stop\\.?$/.test(m)) {
    return {
      reply: "I hear you. I’ll stop that topic. What do you want to talk about now?",
      scripture: [],
      masterRoute: 'phase5p_stop_release',
      clearState: true,
    };
  }

  if (/better prayer|deeper prayer|prayer as i asked|^better$/.test(m) || need === 'prayer' || /prayer/i.test(route)) {
    return {
      reply: "Yes. Let’s pray deeper. Father, I come to You needing peace, wisdom, and strength. Help me slow down, hear clearly, and walk in truth instead of fear. Give me a clean heart, a steady mind, and courage to do what is right. Lead me by Your word, protect me from confusion, and help me trust You one step at a time. In Jesus’ name, amen.",
      scripture: [
        { reference: 'Philippians 4:6-7', theme: 'prayer' },
        { reference: 'James 1:5', theme: 'wisdom' },
        { reference: 'Psalm 51:10', theme: 'clean heart' },
      ],
      masterRoute: 'phase5p_continuation_prayer',
    };
  }

  if (/^decision\\.?$/.test(m) || /decision/.test(m)) {
    return {
      reply: "I hear you. This is about a real-life decision, not a Bible topic menu. Tell me the decision you’re facing, what choices are in front of you, and what feels heavy about it. Then we can slow it down and look for the wise next step.",
      scripture: [{ reference: 'James 1:5', theme: 'wisdom' }],
      masterRoute: 'phase5p_continuation_life_decision',
    };
  }

  if (/tell me more|more|go deeper|explain more|continue|what do you mean/.test(m)) {
    if (need === 'app_identity' || /app_identity/i.test(route)) {
      return {
        reply: "BibleBuddy helps in a few simple ways: you can ask Bible questions, ask for prayer, talk through something hard, or ask for help applying Scripture to a real situation. For Bible teaching, the goal is line upon line and precept upon precept — using Scripture as the authority, not man’s tradition. For life situations, Buddy should listen first, understand what you mean, and then respond with care.",
        scripture: [],
        masterRoute: 'phase5p_continuation_app_identity',
      };
    }

    return {
      reply: memory?.lastReplySummary
        ? \`\${memory.lastReplySummary} Tell me which part you want me to go deeper on, and I’ll continue from there instead of changing the subject.\`
        : "I can continue, but tell me what part you want me to go deeper on.",
      scripture: memory?.lastScripture || [],
      masterRoute: memory?.lastDoctrineTopic ? 'phase5p_continuation_doctrine' : 'phase5p_continuation_general',
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
`);

let runtime = fs.readFileSync('services/openAiFirstCompanionRuntime.js', 'utf8');

if (!runtime.includes("conversationContinuationMemory")) {
  runtime = runtime.replace(
    "const { setActiveDoctrineConversation, recordUserTurn } = require('./doctrineConversationState');",
    "const { setActiveDoctrineConversation, recordUserTurn } = require('./doctrineConversationState');\nconst { saveContinuationMemory } = require('./conversationContinuationMemory');"
  );
}

runtime = runtime.replace(
"  attachDebug(out, {",
"  saveContinuationMemory(userId, { message, answer: out, humanNeed: routePlan?.humanNeed || out.runtime?.companionIntent, route: out.runtime?.masterRoute });\n\n  attachDebug(out, {"
);

runtime = runtime.replace(
"  attachDebug(out, {",
"  saveContinuationMemory(userId, { message, answer: out, humanNeed: topic || concept, route: out.runtime?.masterRoute });\n\n  attachDebug(out, {"
);

fs.writeFileSync('services/openAiFirstCompanionRuntime.js', runtime);

let orch = fs.readFileSync('services/bibleCompanionOrchestrator.js', 'utf8');

if (!orch.includes("conversationContinuationMemory")) {
  orch = orch.replace(
    "const { detectHumanNeed } = require('./humanNeedDetector');",
    `const { detectHumanNeed } = require('./humanNeedDetector');
const {
  isContinuationTurn,
  saveContinuationMemory,
  buildContinuationReply,
} = require('./conversationContinuationMemory');`
  );
}

const continuationBlock = `
  if (isContinuationTurn(message)) {
    const continuation = buildContinuationReply({ userId, message });
    if (continuation?.reply) {
      if (continuation.clearState && typeof clearStopReleaseStateSafely === 'function') {
        clearStopReleaseStateSafely(userId);
      }

      const structured = verifyOrchestratorOutput({
        reply: continuation.reply,
        scripture: continuation.scripture || [],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety?.level || 'standard',
        admin_flags: ['phase5p_conversation_state_owner'],
        runtime: {
          masterRoute: continuation.masterRoute,
          openAiCalled: false,
          orchestratorLane: 'conversation_state_owner',
          phase5P: true,
          conversationContinuation: true,
        },
      }, { message });

      saveContinuationMemory(userId, {
        message,
        answer: structured,
        humanNeed: 'continuation',
        route: continuation.masterRoute,
      });

      recordUserTurn(userId, message, 'companion');

      return {
        handled: true,
        dispatch: 'companion',
        reasoningPlan: { answerLane: 'conversation_state_owner', phase5P: true },
        ctx: {
          structured,
          userId,
          mode,
          personaKey,
          message,
          safety,
          runtimeContext,
          profile,
          testerId,
          sessionId,
          cohort,
          route: continuation.masterRoute,
        },
      };
    }
  }

`;

if (!orch.includes("phase5p_conversation_state_owner")) {
  const idx = orch.indexOf("runNoGlitchPreflight(userId, message, safety, runtimeContext)");
  if (idx === -1) throw new Error("Could not find runNoGlitchPreflight call");
  const lineStart = orch.lastIndexOf("\n", idx) + 1;
  orch = orch.slice(0, lineStart) + continuationBlock + orch.slice(lineStart);
}

fs.writeFileSync('services/bibleCompanionOrchestrator.js', orch);

console.log('Phase 5P Conversation State Owner applied.');
