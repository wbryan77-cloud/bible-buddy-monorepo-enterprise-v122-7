/**
 * Phase 4F — Every /buddy/chat request returns safe JSON within timeout.
 */

const { applyDoctrineErrorFirewall, USER_SAFE_RETRIEVAL_MESSAGE } = require('./doctrineErrorFirewall');
const { getActiveDoctrineTopic } = require('./doctrineConversationState');
const { buildFinalAuthorityAnswer, buildFinalAuthorityStructured } = require('./doctrineFinalAuthorityEngine');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');
const { recordRequestOutcome, handleMemoryPressure, sampleMemory } = require('./runtimeHealthMonitor');

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

function buildCompanionEmergencyReply(userId) {
  const payload = applyDoctrineErrorFirewall(
    { reply: COMPANION_SAFE_FALLBACK, mode: 'companion', confidence: 'medium' },
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
    recordRequestOutcome({
      userId,
      latencyMs: Date.now() - started,
      ok: true,
      route: result?.runtime?.masterRoute,
      strictDoctrine: !!result?.runtime?.doctrineTopic,
      openAiCalled: !!result?.runtime?.openAiCalled,
    });
    return { ok: true, reply: result };
  } catch (e) {
    const errMsg = String(e?.message || e);
    console.error('[responseGuarantee] chat error:', errMsg);
    recordRequestOutcome({
      userId,
      latencyMs: Date.now() - started,
      ok: false,
      error: errMsg,
      timeout: errMsg.includes('chat_timeout'),
    });
    const active = getActiveDoctrineTopic(userId);
    if (active) {
      return buildStrictDoctrineEmergencyReply(userId, message);
    }
    return buildCompanionEmergencyReply(userId);
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
