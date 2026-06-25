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
  const lower = String(message || '').toLowerCase();

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

  /*
   * Final Ownership Migration:
   * Companion Core owns revision-style turns before legacy owners.
   * This does not create new architecture. It absorbs legacy response ownership
   * for better/deeper/more/prayer/scripture/identity continuations.
   */
  if (turnIntent.intent === 'REVISE') {
    const previousRoute = String(memory?.lastRoute || '').toLowerCase();
    const previousReply = String(memory?.lastAssistantReply || '');
    const previousUser = String(memory?.lastUserMessage || '').toLowerCase();
    const refs = Array.isArray(memory?.lastScripture) ? memory.lastScripture : [];

    const wantsPrayerRevision =
      /better prayer|longer prayer|deeper prayer|stronger prayer|pray better|more personal prayer/i.test(lower) ||
      /prayer/.test(previousRoute) ||
      /\bfather\b|amen|pray with you/i.test(previousReply);

    const wantsScriptureExpansion =
      /more scriptures|more scripture|more verses|more witnesses|another scripture|additional scriptures/i.test(lower) ||
      (
        /more|go deeper|tell me more|explain further/i.test(lower) &&
        (
          refs.length > 0 ||
          /doctrine|acts|leviticus|deuteronomy|dietary|sabbath|unclean|clean|kingdom/.test(previousRoute) ||
          /acts 10|leviticus 11|deuteronomy 14|clean and unclean|dietary/i.test(previousReply)
        )
      );

    const wantsIdentityExpansion =
      /tell me more|go deeper|more|explain further|expand/i.test(lower) &&
      (
        /app_identity|identity/.test(previousRoute) ||
        /what does.*app|what is this app|biblebuddy|what does the app do/.test(previousUser) ||
        /BibleBuddy is|Scripture-grounded companion/i.test(previousReply)
      );

    if (wantsPrayerRevision) {
      return {
        reply:
          "Yes. Let me pray with more depth. Father, I come before You with a heart that needs Your peace, Your wisdom, and Your steady hand. Help me slow down and not be ruled by fear. Give me clarity for the decision in front of me, courage to do what is right, and gentleness in how I speak and move. Keep my heart close to You. Help me walk in truth, patience, faith, and love. In Jesus' name, amen.",
        scripture: [
          { reference: 'Philippians 4:6-7', theme: 'prayer_peace' },
          { reference: 'James 1:5', theme: 'wisdom' },
          { reference: 'Psalm 55:22', theme: 'burdens' },
        ],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety.level || 'standard',
        admin_flags: ['phase6_companion_core', 'prayer_revision_strategy'],
        runtime: {
          masterRoute: 'companion_core_prayer_revision',
          responseOwner: 'companion_core',
          turnIntent: turnIntent.intent,
          continuationPlan: plan,
          helperUsed: 'prayer_revision_strategy',
          openAiCalled: false,
          phase6: true,
        },
      };
    }

    if (wantsScriptureExpansion) {
      return {
        reply:
          "Yes. Staying with Scripture, here are more witnesses to hold together: Leviticus 11 and Deuteronomy 14 define clean and unclean animals. Isaiah 66:17 still speaks negatively of eating swine. Acts 10:14 shows Peter still refusing unclean food. Acts 10:28 gives Peter's own explanation: God showed him not to call any man common or unclean. So Acts 10 should be read with Peter's explanation, not apart from it.",
        scripture: [
          { reference: 'Leviticus 11', theme: 'clean_unclean' },
          { reference: 'Deuteronomy 14', theme: 'clean_unclean' },
          { reference: 'Isaiah 66:17', theme: 'swine' },
          { reference: 'Acts 10:14', theme: 'peter_refusal' },
          { reference: 'Acts 10:28', theme: 'vision_meaning' },
        ],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety.level || 'standard',
        admin_flags: ['phase6_companion_core', 'scripture_expansion_strategy'],
        runtime: {
          masterRoute: 'companion_core_scripture_expansion',
          responseOwner: 'companion_core',
          turnIntent: turnIntent.intent,
          continuationPlan: plan,
          helperUsed: 'scripture_expansion_strategy',
          openAiCalled: false,
          phase6: true,
        },
      };
    }

    if (wantsIdentityExpansion) {
      return {
        reply:
          "BibleBuddy is meant to help in a few connected ways: it can listen when you need to talk, pray with you, help you study Scripture line upon line, and help apply the Bible to real-life situations. The goal is not to sound like a menu or a machine. The goal is one steady companion voice that remembers the conversation, stays with what you actually asked, and keeps Scripture as the foundation instead of drifting into man's tradition.",
        scripture: [],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety.level || 'standard',
        admin_flags: ['phase6_companion_core', 'identity_continuation_strategy'],
        runtime: {
          masterRoute: 'companion_core_identity_continuation',
          responseOwner: 'companion_core',
          turnIntent: turnIntent.intent,
          continuationPlan: plan,
          helperUsed: 'identity_continuation_strategy',
          openAiCalled: false,
          phase6: true,
        },
      };
    }

    const revision = buildRevisionReply({ userId, message });
    if (revision && revision.reply) {
      return {
        reply: revision.reply,
        scripture: revision.scripture || [],
        mode: 'companion',
        confidence: 'high',
        memory_used: true,
        safety_level: safety.level || 'standard',
        admin_flags: ['phase6_companion_core', 'generic_revision_strategy'],
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
