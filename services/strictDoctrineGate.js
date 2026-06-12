/**
 * Phase 4E — Hard gate: strict doctrine never reaches OpenAI.
 */

const { BASE_CONTRACTS, attachDoctrineStrictContract } = require('./doctrineAuthorityContract');
const { getActiveDoctrineTopic, getDoctrineConversationState } = require('./doctrineConversationState');
const {
  resolveFinalAuthorityForPack,
  buildFinalAuthorityStructured,
  buildFinalAuthorityAnswer,
  isInitialDoctrineQuestion,
  isStrictFinalTopic,
} = require('./doctrineFinalAuthorityEngine');
const { tryDoctrineLivePathHandlers } = require('./doctrineLivePathHandlers');
const { handleWitnessContinuation, buildWitnessContinuationStructured } = require('./doctrineWitnessInventory');
const { enforceStrictPhraseGuard } = require('./doctrineStrictPhraseGuard');
const {
  logPhase4eOpenAiBypass,
  logPhase4eMemoryStateTrace,
} = require('./phase4eRuntimeDiagnostics');
const { isSessionBoundStrictTurn } = require('./doctrineTopicDetector');
const { recordStrictDoctrineBypass } = require('./runtimeHealthMonitor');

function forceStrictOnPack(evidencePack, topic, meta = {}) {
  const contract = BASE_CONTRACTS[topic];
  if (!contract) return false;
  evidencePack.doctrineStrict = {
    enabled: true,
    strictTopic: topic,
    contract,
    approvedWitnesses: contract.approvedWitnesses,
    cautionWitnesses: contract.cautionWitnesses || [],
    prohibitedWitnesses: contract.prohibitedWitnesses || [],
    minimumWitnessCount: contract.minimumWitnessCount,
    forbiddenPhrases: contract.forbiddenPhrases,
    requiredConclusion: contract.requiredConclusion,
    yesNoDirectnessRequired: false,
    ...meta,
  };
  return true;
}

function ensureStrictDoctrineOnPack(evidencePack, userId, message = '') {
  const active = userId ? getActiveDoctrineTopic(userId) : null;
  if (active && BASE_CONTRACTS[active] && isSessionBoundStrictTurn(message)) {
    forceStrictOnPack(evidencePack, active, { fromActiveSession: true, sessionBoundTurn: true });
    return true;
  }
  attachDoctrineStrictContract(evidencePack);
  if (!evidencePack.doctrineStrict?.enabled && userId && active && BASE_CONTRACTS[active]) {
    forceStrictOnPack(evidencePack, active, { fromActiveSession: true });
  }
  return evidencePack.doctrineStrict?.enabled || false;
}

function isStrictDoctrineChallenge(message = '') {
  const m = String(message).toLowerCase();
  return (
    /\bacts\s*10\b.*\b(food is clean|means food|clean food|eat unclean|pork)\b/i.test(m) ||
    /\bfood is clean\b/i.test(m) ||
    /\bmeans food is clean\b/i.test(m)
  );
}

function buildActs10ChallengeRejection() {
  return {
    reply:
      'No. Acts 10 is about people and Gentiles, not permission to eat unclean foods. Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean.',
    scripture: [
      { reference: 'Acts 10:28', theme: 'acts_10' },
      { reference: 'Acts 11:1-18', theme: 'acts_10' },
    ],
    topic: 'acts_10',
  };
}

function finalizeStrictStructured(structured, topic, userId, message, route) {
  structured = enforceStrictPhraseGuard(structured, topic, userId);
  logPhase4eOpenAiBypass({
    userId,
    message: String(message).slice(0, 120),
    topic,
    route: structured.runtime?.masterRoute || route,
    openAiCalled: false,
  });
  logPhase4eMemoryStateTrace({
    userId,
    activeDoctrineTopic: getDoctrineConversationState(userId).activeDoctrineTopic,
    previousDoctrineTopic: getDoctrineConversationState(userId).previousDoctrineTopic,
    route,
  });
  recordStrictDoctrineBypass(userId);
  return structured;
}

/**
 * Returns { handled: true, structured } or { handled: false }.
 * When handled, caller must return immediately — no OpenAI.
 */
function runStrictDoctrineGate({
  userId,
  message,
  evidencePack,
  recentSessions,
  safety,
  runtimeContext,
}) {
  const strictEnabled = ensureStrictDoctrineOnPack(evidencePack, userId, message);
  const activeTopic = evidencePack.doctrineStrict?.strictTopic || getActiveDoctrineTopic(userId);

  if (!strictEnabled && !activeTopic) {
    return { handled: false };
  }

  if (isStrictDoctrineChallenge(message)) {
    const rejection = buildActs10ChallengeRejection();
    let structured = {
      reply: rejection.reply,
      scripture: rejection.scripture,
      mode: 'companion',
      confidence: 'high',
      memory_used: false,
      safety_level: safety?.level || 'standard',
      admin_flags: ['strict_doctrine_challenge_rejection'],
      runtime: {
        masterRoute: 'strict_doctrine_challenge_rejection',
        openAiCalled: false,
        doctrineTopic: 'acts_10',
      },
    };
    return {
      handled: true,
      structured: finalizeStrictStructured(structured, 'acts_10', userId, message, 'strict_doctrine_challenge_rejection'),
      topic: 'acts_10',
    };
  }

  const livePath = tryDoctrineLivePathHandlers({
    userId,
    message,
    evidencePack,
    recentSessions,
    safety,
    runtimeContext,
  });
  if (livePath.handled) {
    return {
      handled: true,
      structured: finalizeStrictStructured(
        livePath.structured,
        livePath.structured.runtime?.doctrineTopic || activeTopic,
        userId,
        message,
        livePath.structured.runtime?.masterRoute,
      ),
      topic: livePath.structured.runtime?.doctrineTopic || activeTopic,
    };
  }

  const finalAuth = resolveFinalAuthorityForPack({
    userId,
    message,
    evidencePack,
    recentSessions,
  });
  if (finalAuth.handled) {
    const structured = buildFinalAuthorityStructured(finalAuth.authority, runtimeContext, safety);
    return {
      handled: true,
      structured: finalizeStrictStructured(structured, finalAuth.topic, userId, message, 'doctrine_final_authority'),
      topic: finalAuth.topic,
    };
  }

  if (evidencePack.doctrineStrict?.enabled && !isInitialDoctrineQuestion(message)) {
    const witnessResult = handleWitnessContinuation({
      userId,
      message,
      evidencePack,
      recentSessions,
    });
    if (witnessResult) {
      const topic = evidencePack.doctrineStrict.strictTopic || activeTopic;
      const structured = buildWitnessContinuationStructured({
        witnessResult,
        message,
        safety,
        runtimeContext,
        topic,
        userId,
      });
      return {
        handled: true,
        structured: finalizeStrictStructured(structured, topic, userId, message, 'doctrine_witness_inventory'),
        topic,
      };
    }
  }

  if (evidencePack.doctrineStrict?.enabled || (activeTopic && isStrictFinalTopic(activeTopic))) {
    const topic = evidencePack.doctrineStrict?.strictTopic || activeTopic;
    const authority = buildFinalAuthorityAnswer({
      topic,
      contract: evidencePack.doctrineStrict?.contract || BASE_CONTRACTS[topic],
      userId,
      message,
    });
    if (authority) {
      const structured = buildFinalAuthorityStructured(authority, runtimeContext, safety);
      return {
        handled: true,
        structured: finalizeStrictStructured(structured, topic, userId, message, 'doctrine_final_authority_fallback'),
        topic,
      };
    }
  }

  return { handled: false };
}

function mustBlockOpenAi(evidencePack, userId, message = '') {
  ensureStrictDoctrineOnPack(evidencePack, userId, message);
  return evidencePack.doctrineStrict?.enabled || !!getActiveDoctrineTopic(userId);
}

module.exports = {
  ensureStrictDoctrineOnPack,
  runStrictDoctrineGate,
  mustBlockOpenAi,
  isStrictDoctrineChallenge,
  buildActs10ChallengeRejection,
};
