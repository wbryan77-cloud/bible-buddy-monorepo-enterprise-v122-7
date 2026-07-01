/**
 * TEST-ONLY companion conversation experiment runtime.
 * NOT wired to buddyBrain / production.
 *
 * Uses: buildRetrievalEvidencePack (RACL) — unchanged.
 * Changes: conversation behavior only (explore-before-advise rules in compose).
 * Does not modify: legacy runtime, doctrine systems, memory systems, RACL modules.
 *
 * Use: scripts/companionConversationExperiment.js
 */

const openai = require('./openaiClient');
const { safeJsonParse } = require('./buddyBrain');
const { buildRuntimeContext } = require('./runtimeOrchestrator');
const { buildRetrievalEvidencePack } = require('./retrievalEvidencePack');
const { validateDoctrineBoundaries } = require('./doctrineBoundaryValidator');
const { FORBIDDEN_TEACHINGS } = require('./doctrineBoundaries');
const {
  shouldAllowExploratoryQuestion,
  buildConversationBehaviorPayload,
} = require('./companionConversationBehavior');

const CRISIS_REPLY =
  "I'm really sorry you're carrying this. I am not a therapist or emergency service, but your safety matters right now. If you might hurt yourself or feel in immediate danger, please call emergency services now. If you're in the U.S., call or text 988 for the Suicide & Crisis Lifeline.";

const COMPANION_ROLE = `You are Bible Buddy — a warm spiritual companion (not a lecture bot).
Answer the user's exact latest message. Use their words when you can.
Use Scripture naturally when it helps; do not list verses mechanically.
History may explain practice but does not override Scripture.
Return JSON only: {"reply":"your response"}`.trim();

const TEST_SESSION_CACHE = new Map();

function testAppendSession(entry) {
  const cached = TEST_SESSION_CACHE.get(entry.userId) || [];
  cached.push({ message: entry.message, reply: entry.reply, structured: entry.structured });
  TEST_SESSION_CACHE.set(entry.userId, cached.slice(-12));
}

function testGetRecentSessions(userId, limit = 10) {
  const cached = TEST_SESSION_CACHE.get(userId);
  return cached ? cached.slice(-limit) : [];
}

function clearTestSessions(userId) {
  TEST_SESSION_CACHE.delete(userId);
}

function estimateTokens(text = '') {
  return Math.ceil(String(text || '').length / 4);
}

function capScriptureReferences(scripture = {}) {
  const refs = scripture.references || [];
  if (refs.length <= 1) return { ...scripture, references: refs };
  return { ...scripture, references: refs.slice(0, 1), cappedFrom: refs.length };
}

function buildExperimentSystemPrompt({ evidencePack, conversationBehavior }) {
  const boundaries = evidencePack?.doctrine?.boundaries || [];
  const forbidden =
    evidencePack?.doctrine?.forbiddenTeachings || FORBIDDEN_TEACHINGS.map((t) => t.boundary);
  const boundaryBlock = [...boundaries, ...forbidden].filter(Boolean).slice(0, 12);

  return `${COMPANION_ROLE}

${conversationBehavior.systemRules}

Doctrine boundaries (do not violate):
${boundaryBlock.map((b) => `- ${b}`).join('\n')}`;
}

function buildExperimentUserPayload({ message, evidencePack, conversationBehavior }) {
  const historyBlock = (evidencePack.conversationHistory || [])
    .map((t) => `Turn ${t.turn} user: ${t.user}\nTurn ${t.turn} assistant: ${t.assistant}`)
    .join('\n\n');

  const ledger = evidencePack.correctionLedger || {};
  const correctionFacts =
    ledger.active || ledger.priorAssistantQuote
      ? {
          priorAssistantQuote: ledger.priorAssistantQuote || null,
          correctedIntent: ledger.correctedIntent || message,
        }
      : null;

  return {
    userMessage: message,
    conversationHistory: historyBlock || 'none',
    conversationBehavior: conversationBehavior.payload,
    threadLocal: evidencePack.threadLocal,
    companionThreadContext: evidencePack.companionThreadContext,
    correctionFacts,
    memory: evidencePack.memory,
    scripture: capScriptureReferences(evidencePack.scripture || {}),
    historicalEvidence: evidencePack.history?.included
      ? {
          included: true,
          focus: evidencePack.history.focus || null,
          chainSteps: (evidencePack.history.chainSteps || []).slice(0, 5),
          distinction: evidencePack.history.distinction || null,
        }
      : { included: false, reason: evidencePack.history?.reason || 'not_applicable' },
  };
}

function buildExperimentPromptBundle({ message, evidencePack }) {
  const conversationBehavior = buildConversationBehaviorPayload({ message, evidencePack });
  const systemPrompt = buildExperimentSystemPrompt({ evidencePack, conversationBehavior });
  const userPayload = buildExperimentUserPayload({ message, evidencePack, conversationBehavior });
  const userJson = JSON.stringify(userPayload, null, 2);
  return {
    systemPrompt,
    userPayload,
    conversationBehavior,
    sizes: {
      systemPromptChars: systemPrompt.length,
      systemPromptTokensEst: estimateTokens(systemPrompt),
      userPayloadChars: userJson.length,
      userPayloadTokensEst: estimateTokens(userJson),
      totalTokensEst: estimateTokens(systemPrompt) + estimateTokens(userJson),
    },
  };
}

async function callExperimentOpenAI({ systemPrompt, userPayload, temperature = 0.72 }) {
  if (!openai) {
    return { ok: false, error: 'openai_unavailable', raw: null };
  }
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
    });
    return { ok: true, raw: completion?.choices?.[0]?.message?.content || '', error: null };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), raw: null };
  }
}

async function composeCompanionExperimentReply({ message, evidencePack, maxAttempts = 2 } = {}) {
  const bundle = buildExperimentPromptBundle({ message, evidencePack });
  let lastValidation = { passed: true, issues: [] };
  let reply = '';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await callExperimentOpenAI({
      systemPrompt: bundle.systemPrompt,
      userPayload: {
        ...bundle.userPayload,
        regenInstruction:
          attempt > 0 && lastValidation.issues?.length
            ? `Fix doctrine issues only: ${lastValidation.issues.join('; ')}`
            : null,
      },
      temperature: attempt > 0 ? 0.6 : 0.72,
    });

    if (!result.ok) {
      return {
        reply: `[Companion conversation experiment unavailable: ${result.error}]`,
        openaiCalled: false,
        validation: lastValidation,
        promptSizes: bundle.sizes,
        conversationBehavior: bundle.conversationBehavior,
        bundle,
      };
    }

    const parsed = safeJsonParse(result.raw) || { reply: result.raw };
    reply = String(parsed.reply || result.raw || '').trim();

    lastValidation = validateDoctrineBoundaries(reply);
    if (lastValidation.passed) break;
  }

  return {
    reply,
    openaiCalled: true,
    validation: lastValidation,
    promptSizes: bundle.sizes,
    conversationBehavior: bundle.conversationBehavior,
    bundle,
  };
}

async function runCompanionConversationExperimentRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const { userId, mode, personaKey, message } = H.normalizeInput(
    inputOrUserId,
    modeArg,
    personaKeyArg,
    messageArg
  );

  if (!message || !String(message).trim()) {
    return {
      reply: '',
      runtime: {
        masterRoute: 'companion_conversation_experiment_empty',
        openaiCalled: false,
        buddyRuntime: 'companion_conversation_experiment_test',
      },
    };
  }

  const profile = H.getUserCompanionProfile(userId);
  const getSessions = H.getRecentSessions || testGetRecentSessions;
  const recentSessions = getSessions(userId, 10);
  const safety = H.classifySafety(message);

  if (safety.level === 'crisis') {
    const append = H.appendSession || testAppendSession;
    append({
      userId,
      mode,
      personaKey,
      message,
      reply: CRISIS_REPLY,
      structured: { reply: CRISIS_REPLY },
      safety,
      runtime: { masterRoute: 'companion_conversation_experiment_crisis' },
    });
    return {
      reply: CRISIS_REPLY,
      runtime: {
        masterRoute: 'companion_conversation_experiment_crisis',
        openaiCalled: false,
        buddyRuntime: 'companion_conversation_experiment_test',
      },
    };
  }

  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, safety });
  runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  runtimeContext.userId = userId;

  const evidencePack = buildRetrievalEvidencePack({
    userId,
    message,
    mode,
    recentSessions,
    runtimeContext,
    profile,
    safety,
  });

  const composed = await composeCompanionExperimentReply({ message, evidencePack });
  const allowExplore = shouldAllowExploratoryQuestion({ message, evidencePack });

  const append = H.appendSession || testAppendSession;
  append({
    userId,
    mode,
    personaKey,
    message,
    reply: composed.reply,
    structured: {
      reply: composed.reply,
      runtime: {
        masterRoute: 'companion_conversation_experiment_openai',
        openaiCalled: composed.openaiCalled,
        allowExploratoryQuestion: allowExplore,
      },
    },
    safety,
    runtime: { masterRoute: 'companion_conversation_experiment_openai' },
  });

  return {
    reply: composed.reply,
    runtime: {
      masterRoute: composed.openaiCalled
        ? 'companion_conversation_experiment_openai'
        : 'companion_conversation_experiment_unavailable',
      openaiCalled: composed.openaiCalled,
      buddyRuntime: 'companion_conversation_experiment_test',
      validation: composed.validation,
      allowExploratoryQuestion: allowExplore,
      conversationBehavior: composed.conversationBehavior?.payload,
    },
    promptSizes: composed.promptSizes,
  };
}

module.exports = {
  runCompanionConversationExperimentRuntime,
  composeCompanionExperimentReply,
  buildExperimentPromptBundle,
  clearTestSessions,
  testGetRecentSessions,
};
