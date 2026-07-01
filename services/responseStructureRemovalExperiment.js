/**
 * TEST-ONLY: RESPONSE STRUCTURE removal experiment.
 * NOT wired to production / buddyBrain.
 *
 * Keeps: buildRetrievalEvidencePack (RACL), memory, correction ledger, doctrine boundaries.
 * Removes from compose only:
 *   - buildSystemPrompt / buildRuntimeInstructions (RESPONSE STRUCTURE 1–5, Scripture-first, etc.)
 *   - reflect-before-advise, practical next-step, prayer-close, essay ordering
 *
 * Replaced with single companion-moment instruction (Part B).
 *
 * Use: scripts/responseStructureRemovalExperiment.js
 */

const openai = require('./openaiClient');
const { safeJsonParse } = require('./buddyBrain');
const { buildRuntimeContext } = require('./runtimeOrchestrator');
const { buildRetrievalEvidencePack } = require('./retrievalEvidencePack');
const { validateDoctrineBoundaries } = require('./doctrineBoundaryValidator');
const { FORBIDDEN_TEACHINGS } = require('./doctrineBoundaries');
const { buildListeningComposerSignals } = require('./listeningSpecificityValidator');

/** Part B — sole behavioral compose instruction (besides doctrine + JSON envelope). */
const STRUCTURE_REMOVAL_INSTRUCTION =
  'Respond in the way a wise, caring companion naturally would. Do not force a structure. Let the response match the moment.';

const CRISIS_REPLY =
  "I'm really sorry you're carrying this. I am not a therapist or emergency service, but your safety matters right now. If you might hurt yourself or feel in immediate danger, please call emergency services now. If you're in the U.S., call or text 988 for the Suicide & Crisis Lifeline.";

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

function buildStructureRemovalSystemPrompt({ evidencePack }) {
  const boundaries = evidencePack?.doctrine?.boundaries || [];
  const forbidden =
    evidencePack?.doctrine?.forbiddenTeachings || FORBIDDEN_TEACHINGS.map((t) => t.boundary);
  const boundaryBlock = [...boundaries, ...forbidden].filter(Boolean).slice(0, 12);

  return `You are BibleBuddy, a warm biblical companion.
Return JSON only: {"reply":"your response"}

Doctrine boundaries (do not violate):
${boundaryBlock.map((b) => `- ${b}`).join('\n')}

${STRUCTURE_REMOVAL_INSTRUCTION}`;
}

function buildStructureRemovalUserPayload({ message, evidencePack }) {
  const historyBlock = (evidencePack.conversationHistory || [])
    .map((t) => `Turn ${t.turn} user: ${t.user}\nTurn ${t.turn} assistant: ${t.assistant}`)
    .join('\n\n');

  const ledger = evidencePack.correctionLedger || {};
  const listeningSignals = buildListeningComposerSignals(evidencePack, message);

  const correctionLedger =
    ledger.active || ledger.correctionCount >= 1
      ? {
          priorAssistantQuote: ledger.priorAssistantQuote,
          correctedIntent: ledger.correctedIntent,
          forbiddenRepeatTopics: ledger.forbiddenRepeatTopics,
          correctionCount: ledger.correctionCount,
          requireDirectAnswerFirst: ledger.requireDirectAnswerFirst,
          userCorrection: ledger.userCorrection,
        }
      : null;

  return {
    userMessage: message,
    conversationHistory: historyBlock || 'none',
    threadLocal: evidencePack.threadLocal,
    companionThreadContext: evidencePack.companionThreadContext,
    detailCandidates: listeningSignals.detailCandidates,
    listeningGuidance: listeningSignals.listeningGuidance,
    correctionLedger,
    activeConversation: evidencePack.activeConversation,
    evidence: {
      memory: evidencePack.memory,
      scripture: evidencePack.scripture,
      history: evidencePack.history,
      doctrine: evidencePack.doctrine,
      understanding: evidencePack.understanding,
      companionContext: evidencePack.companionContext,
    },
    regenInstruction: null,
  };
}

function buildStructureRemovalPromptBundle({ message, evidencePack }) {
  const systemPrompt = buildStructureRemovalSystemPrompt({ evidencePack });
  const userPayload = buildStructureRemovalUserPayload({ message, evidencePack });
  const userJson = JSON.stringify(userPayload, null, 2);
  return {
    systemPrompt,
    userPayload,
    sizes: {
      systemPromptChars: systemPrompt.length,
      systemPromptTokensEst: estimateTokens(systemPrompt),
      userPayloadTokensEst: estimateTokens(userJson),
      totalTokensEst: estimateTokens(systemPrompt) + estimateTokens(userJson),
    },
  };
}

async function callStructureRemovalOpenAI({ systemPrompt, userPayload, temperature = 0.74 }) {
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

async function composeStructureRemovalReply({ message, evidencePack, maxAttempts = 2 } = {}) {
  const bundle = buildStructureRemovalPromptBundle({ message, evidencePack });
  let lastValidation = { passed: true, issues: [] };
  let reply = '';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await callStructureRemovalOpenAI({
      systemPrompt: bundle.systemPrompt,
      userPayload: {
        ...bundle.userPayload,
        regenInstruction:
          attempt > 0 && lastValidation.issues?.length
            ? `Fix doctrine only: ${lastValidation.issues.join('; ')}`
            : null,
      },
      temperature: attempt > 0 ? 0.58 : 0.74,
    });

    if (!result.ok) {
      return {
        reply: `[Response structure removal experiment unavailable: ${result.error}]`,
        openaiCalled: false,
        validation: lastValidation,
        promptSizes: bundle.sizes,
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
    bundle,
  };
}

async function runResponseStructureRemovalExperimentRuntime(
  H,
  inputOrUserId,
  modeArg,
  personaKeyArg,
  messageArg
) {
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
        masterRoute: 'response_structure_removal_empty',
        openaiCalled: false,
        buddyRuntime: 'response_structure_removal_test',
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
      runtime: { masterRoute: 'response_structure_removal_crisis' },
    });
    return {
      reply: CRISIS_REPLY,
      runtime: {
        masterRoute: 'response_structure_removal_crisis',
        openaiCalled: false,
        buddyRuntime: 'response_structure_removal_test',
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

  const composed = await composeStructureRemovalReply({ message, evidencePack });

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
        masterRoute: 'response_structure_removal_openai',
        openaiCalled: composed.openaiCalled,
      },
    },
    safety,
    runtime: { masterRoute: 'response_structure_removal_openai' },
  });

  return {
    reply: composed.reply,
    runtime: {
      masterRoute: composed.openaiCalled
        ? 'response_structure_removal_openai'
        : 'response_structure_removal_unavailable',
      openaiCalled: composed.openaiCalled,
      buddyRuntime: 'response_structure_removal_test',
      validation: composed.validation,
    },
    promptSizes: composed.promptSizes,
  };
}

module.exports = {
  STRUCTURE_REMOVAL_INSTRUCTION,
  buildStructureRemovalSystemPrompt,
  buildStructureRemovalUserPayload,
  composeStructureRemovalReply,
  runResponseStructureRemovalExperimentRuntime,
  clearTestSessions,
  testGetRecentSessions,
};
