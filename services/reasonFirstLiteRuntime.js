/**
 * TEST-ONLY reason-first lite runtime — simplification experiment.
 * NOT wired to buddyBrain / production. Use scripts/reasonFirstLiteExperiment.js.
 *
 * Same retrieval as reason-first (RACL evidence pack).
 * Removed from compose path:
 *   - buildRuntimeInstructions
 *   - responseContract / answerMatchGate
 *   - response normalization (normalizeStructured, polish, sanitize, strip)
 *   - scripture triplet enforcement (max 1 ref in payload)
 *   - correction compression rules (RACL addendum, ledger compression fields)
 *   - overlap / loop-control validator
 *
 * Kept: doctrine boundary validator, crisis protection, full RACL retrieval.
 */

const openai = require('./openaiClient');
const { safeJsonParse } = require('./buddyBrain');
const { buildRuntimeContext } = require('./runtimeOrchestrator');
const { buildRetrievalEvidencePack } = require('./retrievalEvidencePack');
const { validateDoctrineBoundaries } = require('./doctrineBoundaryValidator');
const { FORBIDDEN_TEACHINGS } = require('./doctrineBoundaries');

const CRISIS_REPLY =
  "I'm really sorry you're carrying this. I am not a therapist or emergency service, but your safety matters right now. If you might hurt yourself or feel in immediate danger, please call emergency services now. If you're in the U.S., call or text 988 for the Suicide & Crisis Lifeline.";

const LITE_ROLE = `You are Bible Buddy — a warm, listening spiritual companion.
Answer the user's exact latest message. Use their words when you can.
Use Scripture naturally when it helps; do not list verses mechanically.
History explains practice but does not override Scripture.
Return JSON only: {"reply":"your response"}`.trim();

const LITE_COMPOSER_HINT = `
Listen first. Be human and specific to this thread.
Do not paste evidence verbatim. Do not add unsolicited study prompts.
`.trim();

const TEST_SESSION_CACHE = new Map();

function testAppendSession(entry) {
  const cached = TEST_SESSION_CACHE.get(entry.userId) || [];
  cached.push({
    message: entry.message,
    reply: entry.reply,
    structured: entry.structured,
  });
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

function buildLiteSystemPrompt({ evidencePack }) {
  const boundaries = evidencePack?.doctrine?.boundaries || [];
  const forbidden =
    evidencePack?.doctrine?.forbiddenTeachings || FORBIDDEN_TEACHINGS.map((t) => t.boundary);
  const boundaryBlock = [...boundaries, ...forbidden].filter(Boolean).slice(0, 12);

  return `${LITE_ROLE}\n\n${LITE_COMPOSER_HINT}\n\nDoctrine boundaries (do not violate):\n${boundaryBlock.map((b) => `- ${b}`).join('\n')}`;
}

function buildLiteUserPayload({ message, evidencePack }) {
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

function buildLitePromptBundle({ message, evidencePack }) {
  const systemPrompt = buildLiteSystemPrompt({ evidencePack });
  const userPayload = buildLiteUserPayload({ message, evidencePack });
  const userJson = JSON.stringify(userPayload, null, 2);
  return {
    systemPrompt,
    userPayload,
    sizes: {
      systemPromptChars: systemPrompt.length,
      systemPromptTokensEst: estimateTokens(systemPrompt),
      userPayloadChars: userJson.length,
      userPayloadTokensEst: estimateTokens(userJson),
      totalTokensEst: estimateTokens(systemPrompt) + estimateTokens(userJson),
    },
  };
}

async function callLiteOpenAI({ systemPrompt, userPayload, temperature = 0.72 }) {
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

/**
 * Compose with doctrine-only validation (no answerMatch, loop control, polish).
 */
async function composeReasonFirstLiteReply({
  message,
  evidencePack,
  safety,
  maxAttempts = 2,
} = {}) {
  const bundle = buildLitePromptBundle({ message, evidencePack });
  let lastValidation = { passed: true, issues: [] };
  let reply = '';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await callLiteOpenAI({
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
        reply: `[Reason-first lite unavailable: ${result.error}]`,
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

/**
 * Test-only entry — same session pattern as minimalReasonFirstRuntime.
 */
async function runReasonFirstLiteRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg) {
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
        masterRoute: 'reason_first_lite_empty',
        openaiCalled: false,
        buddyRuntime: 'reason_first_lite_test',
      },
      promptSizes: null,
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
      structured: { reply: CRISIS_REPLY, runtime: { masterRoute: 'reason_first_lite_crisis' } },
      safety,
      runtime: { masterRoute: 'reason_first_lite_crisis' },
    });
    return {
      reply: CRISIS_REPLY,
      runtime: {
        masterRoute: 'reason_first_lite_crisis',
        openaiCalled: false,
        buddyRuntime: 'reason_first_lite_test',
      },
      promptSizes: null,
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

  const composed = await composeReasonFirstLiteReply({ message, evidencePack, safety });

  const append = H.appendSession || testAppendSession;
  append({
    userId,
    mode,
    personaKey,
    message,
    reply: composed.reply,
    structured: {
      reply: composed.reply,
      runtime: { masterRoute: 'reason_first_lite_openai', openaiCalled: composed.openaiCalled },
    },
    safety,
    runtime: { masterRoute: 'reason_first_lite_openai', openaiCalled: composed.openaiCalled },
  });

  return {
    reply: composed.reply,
    runtime: {
      masterRoute: composed.openaiCalled ? 'reason_first_lite_openai' : 'reason_first_lite_unavailable',
      openaiCalled: composed.openaiCalled,
      buddyRuntime: 'reason_first_lite_test',
      validation: composed.validation,
    },
    promptSizes: composed.promptSizes,
    systemPrompt: composed.bundle?.systemPrompt,
    userPayload: composed.bundle?.userPayload,
  };
}

module.exports = {
  runReasonFirstLiteRuntime,
  composeReasonFirstLiteReply,
  buildLitePromptBundle,
  buildLiteSystemPrompt,
  buildLiteUserPayload,
  clearTestSessions,
  testGetRecentSessions,
  estimateTokens,
};
