/**
 * Phase 4F — Doctrine finality pipeline (local authority before outbound).
 */

const { enforceStrictPhraseGuard } = require('./doctrineStrictPhraseGuard');
const { applyDoctrineErrorFirewall } = require('./doctrineErrorFirewall');
const { setActiveDoctrineConversation } = require('./doctrineConversationState');
const { syncUsedWitnessesFromReply } = require('./doctrineWitnessInventory');

function applyDoctrineFinalityPipeline({
  structured = {},
  topic = '',
  userId = '',
  message = '',
  evidencePack = {},
} = {}) {
  let out = { ...structured };
  if (topic) {
    out = enforceStrictPhraseGuard(out, topic, userId);
  }
  out = applyDoctrineErrorFirewall(out, {
    userId,
    topic,
    strictDoctrine: !!topic,
  });
  if (!out.reply || String(out.reply).trim().length < 3) {
    const { STRICT_DOCTRINE_FALLBACK_MESSAGE } = require('./doctrineErrorFirewall');
    out.reply = STRICT_DOCTRINE_FALLBACK_MESSAGE;
  }
  if (topic && userId) {
    setActiveDoctrineConversation({
      userId,
      topic,
      contract: evidencePack.doctrineStrict?.contract,
      userMessage: message,
      answerSummary: out.reply,
      lastWitness: out.runtime?.doctrineWitnessRef,
    });
    syncUsedWitnessesFromReply(userId, topic, out.reply, { limit: 2 });
  }
  return out;
}

module.exports = {
  applyDoctrineFinalityPipeline,
};
