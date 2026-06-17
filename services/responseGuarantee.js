/**
 * Phase 4F — Every /buddy/chat request returns safe JSON within timeout.
 */

const { applyDoctrineErrorFirewall, USER_SAFE_RETRIEVAL_MESSAGE } = require('./doctrineErrorFirewall');
const { getActiveDoctrineTopic } = require('./doctrineConversationState');
const { buildFinalAuthorityAnswer, buildFinalAuthorityStructured } = require('./doctrineFinalAuthorityEngine');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');
const {
  recordRequestOutcome,
  recordRouteFallback,
  handleMemoryPressure,
  sampleMemory,
} = require('./runtimeHealthMonitor');

const ROUTE_OWNER =
  'POST /buddy/chat → routes/buddy.js → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime → bibleCompanionOrchestrator';

const DEFAULT_TIMEOUT_MS = Number(process.env.BIBLEBUDDY_CHAT_TIMEOUT_MS || 55000);
const COMPANION_SAFE_FALLBACK =
  'I want to stay with you on this. Could you ask your question again in one short sentence?';

function buildStrictDoctrineEmergencyReply(userId, message = '') {
  const topic = getActiveDoctrineTopic(userId);
  if (topic && BASE_CONTRACTS[topic]) {
    const authority = buildFinalAuthorityAnswer({
      topic,
      contract: BASE_CONTRACTS[topic],
      userId,
      message,
    });
    if (authority) {
      const structured = buildFinalAuthorityStructured(authority, {}, { level: 'standard' });
      const payload = applyDoctrineErrorFirewall(
        { reply: structured.reply, scripture: structured.scripture || [], mode: 'companion' },
        { userId, topic, strictDoctrine: true },
      );
      return { ok: true, reply: payload };
    }
  }
  const payload = applyDoctrineErrorFirewall(
    { reply: USER_SAFE_RETRIEVAL_MESSAGE, mode: 'companion', confidence: 'medium' },
    { userId, strictDoctrine: true },
  );
  return { ok: true, reply: payload };
}

function classifyChatError(errMsg = '') {
  if (errMsg.includes('chat_timeout')) return 'CHAT_TIMEOUT';
  if (/cannot find module/i.test(errMsg)) return 'MODULE_LOAD_ERROR';
  return 'RUNTIME_ERROR';
}

function buildCompanionEmergencyReply(userId, context = {}) {
  const errorCode = context.errorCode || 'RUNTIME_ERROR';
  const payload = applyDoctrineErrorFirewall(
    {
      reply: COMPANION_SAFE_FALLBACK,
      mode: 'companion',
      confidence: 'medium',
      runtime: {
        masterRoute: 'response_guarantee_fallback',
        fallbackErrorCode: errorCode,
        routeOwner: ROUTE_OWNER,
        openAiCalled: false,
        buddyRuntime: 'response_guarantee',
      },
    },
    { userId, strictDoctrine: false },
  );
  return { ok: true, reply: payload };
}

function withTimeout(promise, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('chat_timeout')), timeoutMs);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

/**
 * Wrap buddy chat handler — always returns { ok, reply } or { ok: false, error }.
 */
async function withBuddyChatGuarantee(handler, context = {}) {
  const { userId, message, timeoutMs = DEFAULT_TIMEOUT_MS } = context;
  const started = Date.now();
  sampleMemory();
  handleMemoryPressure();
  try {
    const result = await withTimeout(handler(), timeoutMs);
    const firewalled = applyDoctrineErrorFirewall(result, {
      userId,
      strictDoctrine: !!result?.runtime?.doctrineTopic,
    });
    recordRequestOutcome({
      userId,
      latencyMs: Date.now() - started,
      ok: true,
      route: firewalled?.runtime?.masterRoute,
      strictDoctrine: !!firewalled?.runtime?.doctrineTopic,
      openAiCalled: !!firewalled?.runtime?.openAiCalled,
    });
    return { ok: true, reply: firewalled };
  } catch (e) {
    const errMsg = String(e?.message || e);
    const errorCode = classifyChatError(errMsg);
    console.error('[responseGuarantee] chat error:', errorCode, errMsg);
    recordRouteFallback({
      error: errMsg,
      errorCode,
      routeOwner: ROUTE_OWNER,
      userId,
      message,
    });
    recordRequestOutcome({
      userId,
      latencyMs: Date.now() - started,
      ok: false,
      error: errMsg,
      route: 'response_guarantee_fallback',
      timeout: errMsg.includes('chat_timeout'),
    });
    const active = getActiveDoctrineTopic(userId);
    if (active) {
      return buildStrictDoctrineEmergencyReply(userId, message);
    }
    return buildCompanionEmergencyReply(userId, { errorCode });
  }
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  COMPANION_SAFE_FALLBACK,
  withBuddyChatGuarantee,
  withTimeout,
  buildStrictDoctrineEmergencyReply,
  buildCompanionEmergencyReply,
};
