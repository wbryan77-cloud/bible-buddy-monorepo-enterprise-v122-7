/**
 * TEST-ONLY minimal reason-first runtime — prompt hierarchy experiment.
 * NOT wired to buddyBrain / production. Use scripts/promptHierarchyExperiment.js.
 *
 * OpenAI receives ONLY:
 *   1. User message
 *   2. Last 10 conversation turns
 *   3. Relevant memory hits
 *   4. Relevant scripture evidence
 *   5. Relevant historical evidence
 *   6. Doctrine boundary list
 *
 * System prompt capped at 1500 tokens. No legacy stack.
 */

const openai = require('./openaiClient');
const { buildRuntimeContext } = require('./runtimeOrchestrator');
const { buildRetrievalEvidencePack } = require('./retrievalEvidencePack');
const { safeJsonParse } = require('./buddyBrain');
const { FORBIDDEN_TEACHINGS } = require('./doctrineBoundaries');

const MAX_SYSTEM_TOKENS = 1500;
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

const MINIMAL_ROLE = `You are Bible Buddy — a warm, listening spiritual companion.
Listen first. Mirror the user's exact words and concern before advising.
Answer their exact question. Use Scripture as foundation (KJV references when citing).
On correction or meta questions: acknowledge what you heard; do not repeat the same explanation.
Return JSON only: {"reply":"your natural response"}`.trim();

function estimateTokens(text = '') {
  return Math.ceil(String(text).length / 4);
}

function buildDoctrineBoundaryList(evidencePack) {
  const boundaries = evidencePack?.doctrine?.boundaries || [];
  const forbidden = evidencePack?.doctrine?.forbiddenTeachings || FORBIDDEN_TEACHINGS.map((t) => t.boundary);
  return [...boundaries, ...forbidden].filter(Boolean);
}

function buildMinimalSystemPrompt({ doctrineBoundaries }) {
  const boundaryBlock = doctrineBoundaries.length
    ? `Doctrine boundaries (do not violate):\n${doctrineBoundaries.map((b) => `- ${b}`).join('\n')}`
    : 'Doctrine boundaries: Scripture is foundation; history is secondary.';

  let prompt = `${MINIMAL_ROLE}\n\n${boundaryBlock}`;

  if (estimateTokens(prompt) > MAX_SYSTEM_TOKENS) {
    const budget = MAX_SYSTEM_TOKENS - estimateTokens(MINIMAL_ROLE) - 4;
    const chars = Math.max(200, budget * 4);
    prompt = `${MINIMAL_ROLE}\n\n${boundaryBlock.slice(0, chars)}…`;
  }

  return prompt;
}

function buildMinimalUserPayload({ message, recentSessions = [], evidencePack }) {
  const conversationHistory = recentSessions.slice(-10).map((s, i) => ({
    turn: i + 1,
    user: String(s.message || ''),
    assistant: String(s.reply || s.structured?.reply || '').slice(0, 1200),
  }));

  const historicalEvidence = evidencePack.history?.included
    ? {
        included: true,
        focus: evidencePack.history.focus || null,
        chainSteps: evidencePack.history.chainSteps || [],
        sources: evidencePack.history.sources || [],
        distinction: evidencePack.history.distinction || null,
      }
    : { included: false, reason: evidencePack.history?.reason || 'not_applicable' };

  return {
    userMessage: message,
    conversationHistory,
    memory: {
      snippets: evidencePack.memory?.snippets || [],
      hits: evidencePack.memory?.hits || [],
    },
    scripture: {
      topic: evidencePack.scripture?.topic || null,
      references: evidencePack.scripture?.references || [],
    },
    historicalEvidence,
  };
}

function buildMinimalPromptBundle({ message, recentSessions, evidencePack }) {
  const doctrineBoundaries = buildDoctrineBoundaryList(evidencePack);
  const systemPrompt = buildMinimalSystemPrompt({ doctrineBoundaries });
  const userPayload = buildMinimalUserPayload({ message, recentSessions, evidencePack });

  return {
    systemPrompt,
    userPayload,
    sizes: {
      systemPromptChars: systemPrompt.length,
      systemPromptTokensEst: estimateTokens(systemPrompt),
      userPayloadChars: JSON.stringify(userPayload, null, 2).length,
      userPayloadTokensEst: estimateTokens(JSON.stringify(userPayload)),
      totalTokensEst: estimateTokens(systemPrompt) + estimateTokens(JSON.stringify(userPayload)),
    },
  };
}

async function callMinimalOpenAI({ systemPrompt, userPayload, temperature = 0.72 }) {
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
    const raw = completion?.choices?.[0]?.message?.content || '';
    return { ok: true, raw, error: null };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), raw: null };
  }
}

/**
 * Test-only entry — mirrors reasonFirstBuddyRuntime signature subset.
 */
async function runMinimalReasonFirstRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const { userId, mode, personaKey, message } = H.normalizeInput(inputOrUserId, modeArg, personaKeyArg, messageArg);

  if (!message || !String(message).trim()) {
    return {
      reply: '',
      runtime: { masterRoute: 'minimal_reason_first_empty', openaiCalled: false, buddyRuntime: 'minimal_reason_first_test' },
      promptSizes: null,
    };
  }

  const profile = H.getUserCompanionProfile(userId);
  const getSessions = H.getRecentSessions || testGetRecentSessions;
  const recentSessions = getSessions(userId, 10);
  const safety = H.classifySafety(message);

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

  const bundle = buildMinimalPromptBundle({ message, recentSessions, evidencePack });

  const result = await callMinimalOpenAI({
    systemPrompt: bundle.systemPrompt,
    userPayload: bundle.userPayload,
  });

  if (!result.ok) {
    const fallback = `[Minimal reason-first unavailable: ${result.error}]`;
    return {
      reply: fallback,
      runtime: {
        masterRoute: 'minimal_reason_first_unavailable',
        openaiCalled: false,
        buddyRuntime: 'minimal_reason_first_test',
      },
      promptSizes: bundle.sizes,
      systemPrompt: bundle.systemPrompt,
      userPayload: bundle.userPayload,
    };
  }

  const parsed = safeJsonParse(result.raw) || { reply: result.raw };
  const reply = String(parsed.reply || result.raw || '').trim();

  const append = H.appendSession || testAppendSession;
  append({
    userId,
    mode,
    personaKey,
    message,
    reply,
    structured: { reply, runtime: { masterRoute: 'minimal_reason_first_openai' } },
    safety,
    runtime: { masterRoute: 'minimal_reason_first_openai', openaiCalled: true },
  });

  return {
    reply,
    runtime: {
      masterRoute: 'minimal_reason_first_openai',
      openaiCalled: true,
      buddyRuntime: 'minimal_reason_first_test',
    },
    promptSizes: bundle.sizes,
    systemPrompt: bundle.systemPrompt,
    userPayload: bundle.userPayload,
  };
}

module.exports = {
  MAX_SYSTEM_TOKENS,
  MINIMAL_ROLE,
  estimateTokens,
  buildMinimalSystemPrompt,
  buildMinimalUserPayload,
  buildMinimalPromptBundle,
  runMinimalReasonFirstRuntime,
  clearTestSessions,
  testGetRecentSessions,
};
