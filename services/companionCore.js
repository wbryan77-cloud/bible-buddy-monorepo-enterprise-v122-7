/**
 * Phase 6 — Companion Core
 * One companion flow: state -> intent -> continuation plan -> helper output.
 * Bible truth remains validated downstream by Scripture authority l
 */

const { determineTurnIntent } = require('./turnIntentOwner');
const { getContinuationMemory } = require('./conversationContinuationMemory');
const { buildRevisionReply } = require('./responseRevisionOwner');

function planContinuation({ message = '', memory = null, turnIntent = {} } = {}) {
  const intent = turnIntent.intent;

  if (intent === 'STOP') return { action: 'stop', helper: 'boundary' };
  if (intent === 'CRISIS') return { action: 'crisis', helper: 'safety' };

  if (intent === 'REVISE') {
    return {
      action: 'continue',
      continuationType: 'revise_or_expand_previous_answer',
      helper: 'responseRevisionOwner',
    };
  }

  if (intent === 'PRAY') return { action: 'pray', helper: 'legacyPrayerOwner' };
  if (intent === 'TEACH') return { action: 'teach', helper: 'scriptureAuthority' };

  if (memory) {
    return {
      action: 'continue',
      continuationType: 'natural_companion_continuation',
      helper: 'conversationContinuationMemory',
    };
  }

  return { action: 'new_companion_turn', helper: 'legacyRuntime' };
}

function buildCompanionCoreResponse({ userId, message = '', safety = {} } = {}) {
  const memory = getContinuationMemory(userId);
  const turnIntent = determineTurnIntent({ message, hasMemory: !!memory });
  const plan = planContinuation({ message, memory, turnIntent });

  if (plan.action === 'crisis') return null;

  if (plan.action === 'stop') {
    return {
      reply: "I hear you. I'll stop that topic. What do you want to talk about now?",
      scripture: [],
      mode: 'companion',
      confidence: 'high',
      memory_used: !!memory,
      safety_level: safety.level || 'standard',
      admin_flags: ['phase6_companion_core', 'boundary_owner'],
      runtime: {
        masterRoute: 'companion_core_stop',
        responseOwner: 'companion_core',
        turnIntent: turnIntent.intent,
        continuationPlan: plan,
        openAiCalled: false,
        phase6: true,
      },
    };
  }

  if (plan.helper === 'responseRevisionOwner') {
    const revision = buildRevisionReply({ userId, message });
    if (revision && revision.reply) {
      return {
        reply: revision.reply,
        scripture: revision.scripture || [],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety.level || 'standard',
        admin_flags: ['phase6_companion_core', 'continuation_revision'],
        runtime: {
          masterRoute: revision.route,
          responseOwner: 'companion_core',
          turnIntent: turnIntent.intent,
          continuationPlan: plan,
          helperUsed: 'responseRevisionOwner',
          openAiCalled: false,
          phase6: true,
        },
      };
    }
  }

  return null;
}

module.exports = {
  planContinuation,
  buildCompanionCoreResponse,
};
