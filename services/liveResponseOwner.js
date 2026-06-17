/**
 * Phase 5L — Single final response owner for /buddy/chat.
 */

const {
  buildSingleCompanionContract,
  enforceSingleCompanionContract,
  explainContractDecision,
  repairAbsoluteForbiddenFinal,
  scanForbiddenFinalSubstrings,
} = require('./singleCompanionContract');

const EARLY_RETURN_LOG = [];

function blockEarlyReturn({ sourceFile = '', reason = '' } = {}) {
  const entry = { sourceFile, reason, at: new Date().toISOString() };
  EARLY_RETURN_LOG.push(entry);
  if (process.env.LIVE_RESPONSE_OWNER_STRICT === '1') {
    console.warn('[liveResponseOwner] early return blocked:', entry);
  }
  return entry;
}

function buildLiveResponse({
  message = '',
  userId = '',
  sessionId = null,
  state = {},
  anchor = {},
  humanNeed = null,
  relationshipContext = {},
  concept = null,
  draft = {},
} = {}) {
  const contract = buildSingleCompanionContract({
    message,
    state: { ...state, userId },
    relationshipContext,
    humanNeed,
    concept,
    anchor,
  });

  const enforced = enforceSingleCompanionContract({
    draftReply: draft.reply || '',
    contract,
    scripture: draft.scripture || [],
  });

  const absolute = repairAbsoluteForbiddenFinal(enforced.reply, {
    ...contract,
    humanNeed: humanNeed || contract.humanNeed,
  });
  let finalReply = enforced.reply;
  let finalScripture = enforced.scripture;
  let absoluteRepairLane = enforced.repairLane;
  if (absolute.repaired && absolute.reply !== enforced.reply) {
    finalReply = absolute.reply;
    if (absolute.scripture?.length) finalScripture = absolute.scripture;
    absoluteRepairLane = absolute.repairLane;
  }

  return {
    reply: finalReply,
    scripture: finalScripture,
    contract,
    contractDecision: explainContractDecision(contract),
    liveResponseOwner: true,
    masterRoute: draft.runtime?.masterRoute || `live_owner_${contract.mode}`,
    repairLane: absoluteRepairLane || enforced.repairLane,
    forbiddenPhraseDetected:
      enforced.forbiddenPhraseDetected || scanForbiddenFinalSubstrings(finalReply, contract).length > 0,
  };
}

function finalizeLiveResponse({
  draft = {},
  message = '',
  userId = '',
  sessionId = null,
  state = {},
  anchor = {},
  humanNeed = null,
  relationshipContext = {},
  concept = null,
} = {}) {
  const structured = { ...draft };
  const live = buildLiveResponse({
    message,
    userId,
    sessionId,
    state,
    anchor,
    humanNeed,
    relationshipContext,
    concept,
    draft: structured,
  });

  structured.reply = live.reply;
  if (live.scripture?.length) structured.scripture = live.scripture;
  structured.runtime = {
    ...(structured.runtime || {}),
    liveResponseOwner: true,
    companionContractMode: live.contract?.mode,
    contractDecision: live.contractDecision,
    forbiddenBlocked: live.contract?.forbiddenBlocked,
    companionRepairLane: live.repairLane,
    forbiddenPhraseDetected: live.forbiddenPhraseDetected || false,
    masterRoute: structured.runtime?.masterRoute || live.masterRoute,
  };
  if (!structured.admin_flags?.includes('phase5l_live_owner')) {
    structured.admin_flags = [...(structured.admin_flags || []), 'phase5l_live_owner', 'phase5m_live_owner'];
  }
  return structured;
}

function explainLiveResponsePath(trace = {}) {
  return {
    owner: 'liveResponseOwner',
    contract: trace.contractDecision || trace.contract,
    earlyReturnsBlocked: EARLY_RETURN_LOG.slice(-20),
    ...trace,
  };
}

module.exports = {
  buildLiveResponse,
  finalizeLiveResponse,
  blockEarlyReturn,
  explainLiveResponsePath,
  EARLY_RETURN_LOG,
};
