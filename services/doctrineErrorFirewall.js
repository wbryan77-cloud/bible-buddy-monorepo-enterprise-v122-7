/**
 * Phase 4D.1 — Error firewall: never expose internal diagnostics to users.
 */

const { logPhase4d1ErrorLeak } = require('./phase4d1RuntimeDiagnostics');

const USER_SAFE_RETRIEVAL_MESSAGE =
  'I am having trouble retrieving additional passages right now. Please try again in a moment.';

const STRICT_DOCTRINE_FALLBACK_MESSAGE =
  "I'm still on the same Bible topic. Let me stay with the approved witness chain.";

/** User-facing exhaustion line — allowed outbound; filtered on inbound echo only. */
const WITNESS_EXHAUSTION_USER_MESSAGE =
  'I have shown the approved witness chain currently attached to this topic.';

const USER_ECHO_FILTER_PHRASES = [
  'approved witness chain currently attached',
  'safe corpus fallback',
  'doctrine_strict_safe',
  'witness_inventory_exhausted',
];

const INTERNAL_SYSTEM_PHRASES = [
  'safe corpus fallback',
  'doctrine_strict_safe',
  'witness_inventory_exhausted',
];

const LEAK_PATTERNS = [
  /AI service unavailable/i,
  /AI service trouble/i,
  /connection_error/i,
  /core_connection_error/i,
  /manual render redeploy/i,
  /safe corpus fallback/i,
  /doctrine_strict_safe/i,
  /openai_unavailable/i,
  /openai_timeout/i,
  /OpenAIAuthError/i,
  /doctrine_strict_validation_failed/i,
  /witness_inventory_incomplete/i,
  /validation failed/i,
  /DOCTRINE STRICT VALIDATION FAILED/i,
  /regenHint/i,
  /admin_flags/i,
  /source-grounded answer:/i,
  /the app should not/i,
  /BibleBuddy should not/i,
  /trouble reaching the AI service/i,
  /having trouble reaching the AI service/i,
  /I'm having trouble reaching/i,
];

const INTERNAL_ADMIN_FLAGS = new Set([
  'core_connection_error',
  'doctrine_strict_safe_corpus',
  'safe_corpus_fallback',
  'claim_validation_degraded',
  'openai_attempt_cap_exceeded',
]);

function containsDiagnosticLeak(text = '') {
  const sample = String(text);
  for (const re of LEAK_PATTERNS) {
    if (re.test(sample)) return { leaked: true, pattern: re.source };
  }
  return { leaked: false };
}

function sanitizeUserFacingReply(text = '', context = {}) {
  let reply = String(text || '').trim();
  const leak = containsDiagnosticLeak(reply);
  if (leak.leaked) {
    logPhase4d1ErrorLeak({
      event: 'reply_leak_sanitized',
      pattern: leak.pattern,
      userId: context.userId,
      topic: context.topic,
      sample: reply.slice(0, 160),
    });
    reply = context.strictDoctrine ? STRICT_DOCTRINE_FALLBACK_MESSAGE : USER_SAFE_RETRIEVAL_MESSAGE;
  }
  return reply;
}

function applyDoctrineErrorFirewall(structured = {}, context = {}) {
  const out = { ...structured };
  out.reply = sanitizeUserFacingReply(out.reply, context);

  if (out.finalAnswer) {
    out.finalAnswer = sanitizeUserFacingReply(out.finalAnswer, context);
  }
  if (out.directAnswer) {
    out.directAnswer = sanitizeUserFacingReply(out.directAnswer, context);
  }

  if (out.admin_flags) {
    out.admin_flags = out.admin_flags.filter((f) => !INTERNAL_ADMIN_FLAGS.has(f));
  }

  if (containsDiagnosticLeak(out.reply).leaked) {
    out.reply = USER_SAFE_RETRIEVAL_MESSAGE;
  }

  return out;
}

function isInternalSystemMessage(text = '') {
  const sample = String(text).trim().toLowerCase();
  if (!sample) return false;
  for (const phrase of USER_ECHO_FILTER_PHRASES) {
    if (sample.includes(phrase.toLowerCase())) return true;
  }
  for (const re of LEAK_PATTERNS) {
    if (re.test(sample)) return true;
  }
  return false;
}

function mapInternalErrorToUserMessage(error = '', { strictDoctrine = false } = {}) {
  if (strictDoctrine) return STRICT_DOCTRINE_FALLBACK_MESSAGE;
  return USER_SAFE_RETRIEVAL_MESSAGE;
}

module.exports = {
  USER_SAFE_RETRIEVAL_MESSAGE,
  STRICT_DOCTRINE_FALLBACK_MESSAGE,
  WITNESS_EXHAUSTION_USER_MESSAGE,
  USER_ECHO_FILTER_PHRASES,
  INTERNAL_SYSTEM_PHRASES,
  LEAK_PATTERNS,
  containsDiagnosticLeak,
  isInternalSystemMessage,
  sanitizeUserFacingReply,
  applyDoctrineErrorFirewall,
  mapInternalErrorToUserMessage,
};
