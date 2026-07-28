/**
 * Phase 5G — Companion style guard: warm guide, not cold Q&A bot.
 */

const { LEARNING_ACK } = require('./reflectionMemoryEngine');
const { validateWitnessStandard, isWitnessReestablishment } = require('./twoWitnessStandard');

const DB_DENY_RE = /\bi cannot modify a database\b/i;
const RETRIEVAL_ERROR_RE = /\btrouble retrieving additional passages\b/i;
const CONNECTION_ERROR_RE = /\bcore_connection_error\b/i;

function compressRepeatedSentences(text = '') {
  const parts = String(text)
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = p.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function fixYesNoOpener(text = '', polarity = null) {
  let t = String(text || '').trim();
  if (polarity === 'forbidden' && /^yes\b/i.test(t) && /\b(no\.|not eat|unclean|fornication|flee)\b/i.test(t)) {
    t = t.replace(/^yes[—,\s]*/i, 'No. ');
  }
  return t;
}

const ANOTHER_VERSE_RE = /\b(another verse|show me another|one more verse|more verses|give me another)\b/i;

function trimDoctrineDumpOnAnotherVerse(reply = '', message = '') {
  let t = String(reply || '').trim();
  if (!ANOTHER_VERSE_RE.test(message)) return t;
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 4) return t;
  const doctrineHeavy = sentences.filter((s) =>
    /\b(leviticus|deuteronomy|acts|fornication|unclean|swine)\b/i.test(s),
  );
  if (doctrineHeavy.length >= 2 && sentences.length > doctrineHeavy.length) {
    const kept = sentences.filter((s) => !doctrineHeavy.includes(s) || doctrineHeavy.indexOf(s) === 0);
    return kept.slice(0, 4).join(' ').trim();
  }
  return sentences.slice(0, 4).join(' ').trim();
}

function applyCompanionStyleGuard(structured = {}, context = {}) {
  const out = { ...structured };
  let reply = String(out.reply || '').trim();
  const message = String(context.message || '');
  const scripture = out.scripture || [];

  if (DB_DENY_RE.test(reply)) {
    const { companionRememberAck } = require('./relationshipContextSelector');
    reply = companionRememberAck(message) || "I'll keep that in mind.";
  }
  if (RETRIEVAL_ERROR_RE.test(reply) || CONNECTION_ERROR_RE.test(reply)) {
    reply =
      'I want to stay with you on this. Could you ask your question again in one short sentence?';
  }

  if (/\bhow (do|should|can) i explain\b/i.test(message) && /which book, topic, or passage/i.test(reply)) {
    reply = context.practicalFallback || reply;
  }

  if (/\bpray with me\b/i.test(message) && !/\b(father|lord|jesus|amen)\b/i.test(reply)) {
    reply = context.prayerFallback || reply;
  }

  if (/^(why|sad|overwhelmed|nervous|afraid|hurt)\b/i.test(message) && !/\b(i hear|i'm sorry|here with you|understandable)\b/i.test(reply)) {
    reply = `I hear you. ${reply}`;
  }

  if (/\?/.test(message) && /^(can we|can i|should i)\b/i.test(message) && !/^(yes|no)\b/i.test(reply)) {
    /* leave doctrine answers that embed yes/no in sentence */
  }

  reply = compressRepeatedSentences(reply);
  reply = trimDoctrineDumpOnAnotherVerse(reply, message);
  reply = fixYesNoOpener(reply, context.polarity);

  const witnessCheck = validateWitnessStandard(reply, scripture, {
    isNewTopic: context.isNewTopic !== false && !context.isContinuation,
    isContinuation: context.isContinuation,
    isEmotionalSupport: context.isEmotionalSupport,
    isPrayer: context.isPrayer,
    isPracticalGuidance: context.isPracticalGuidance,
    isChallenge: isWitnessReestablishment(message),
  });

  out.reply = reply;
  out.styleGuard = {
    witnessStandard: witnessCheck,
    compressed: true,
  };
  return out;
}

function guardChecks(message = '', reply = '') {
  const failures = [];
  if (DB_DENY_RE.test(reply)) failures.push('db_deny');
  if (RETRIEVAL_ERROR_RE.test(reply)) failures.push('retrieval_error');
  if (CONNECTION_ERROR_RE.test(reply)) failures.push('connection_error');
  if (/\bpray with me\b/i.test(message) && !/\b(father|lord|jesus|amen)\b/i.test(reply)) failures.push('no_actual_prayer');
  if (/\bhow (do|should) i explain\b/i.test(message) && /which book, topic, or passage/i.test(reply)) failures.push('clarification_loop');
  return failures;
}

module.exports = {
  applyCompanionStyleGuard,
  guardChecks,
  compressRepeatedSentences,
};
