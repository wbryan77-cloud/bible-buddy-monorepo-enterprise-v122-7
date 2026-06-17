/**
 * Phase 5I — Build human-feeling companion responses from Scripture-anchored plans.
 */

const { getGraphNode } = require('./bibleConceptGraph');
const { applyUserAnswerPreferences } = require('./userCorrectionMemory');
const {
  buildFamilyExplanation,
  buildBoundaryScript,
  buildPrayerResponse,
} = require('./practicalGuidanceEngine');
const { buildMemoryDisclosureReply } = require('./companionMemoryManager');
const { buildPreferenceAck } = require('./relationshipMemoryEngine');

function mapWitnessesToScripture(refs = [], theme = '') {
  return refs.slice(0, 3).map((ref) => ({
    reference: ref,
    theme: theme || 'scripture',
  }));
}

function buildPrayerAnswer(plan = {}, context = {}) {
  const { userId, message = '' } = context;
  const relCtx = plan.relationshipContext || {};
  const familyCtx = relCtx.familyConversationContext;
  const focus = familyCtx ? 'steady his heart as he talks with family' : 'steady his heart';
  const prayer = `Father, please ${focus}. Give him wisdom, peace, courage, and gentleness. Help him speak truth without fear and love without compromise. In Jesus' name, amen.`;

  let reply = `${plan.companionOpening ? plan.companionOpening + ' ' : ''}Yes, I'll pray with you.\n\n${prayer}`;

  const multi = relCtx.multiIntent || {};
  if (multi.multiIntent && multi.verse || plan.answerType === 'multi_prayer_verse') {
    const verseRef = familyCtx ? 'Joshua 1:9' : 'Philippians 4:6-7';
    reply += `\n\nHold onto ${verseRef} for courage in a hard conversation.`;
    return {
      reply,
      scripture: [
        { reference: 'Philippians 4:6-7', theme: 'prayer' },
        { reference: familyCtx ? 'Joshua 1:9' : 'Philippians 4:6-7', theme: 'courage' },
      ],
      masterRoute: 'phase5i_multi_prayer_verse',
    };
  }

  reply += '\n\nHold onto Philippians 4:6-7.';
  return {
    reply,
    scripture: [
      { reference: 'Philippians 4:6-7', theme: 'prayer' },
      { reference: 'James 1:5', theme: 'prayer' },
    ],
    masterRoute: 'phase5i_prayer',
  };
}

function buildPracticalGuidanceAnswer(plan = {}, context = {}) {
  const conceptId = plan.conceptId || plan.relationshipContext?.priorTopic || 'dietary_pork_unclean';
  const goal = plan.relationshipContext?.userGoal;

  if (goal === 'handle_family_disagreement') {
    const fam = buildFamilyExplanation({ concept: conceptId });
    const reply = `${plan.companionOpening || 'Family disagreement can feel heavy.'} You don't have to win an argument — speak with respect and stay with Scripture. ${fam?.reply || ''}`;
    return {
      reply: reply.trim(),
      scripture: fam?.scripture || mapWitnessesToScripture(plan.witnesses, conceptId),
      masterRoute: 'phase5i_family_disagreement',
      conceptId,
    };
  }

  if (goal === 'verse_to_remember' || plan.companionIntent?.category === 'verse_to_remember') {
    const familyCtx = plan.relationshipContext?.familyConversationContext;
    const ref = familyCtx ? 'Joshua 1:9' : 'Philippians 4:6-7';
    const reply = `For courage in a hard conversation, hold onto ${ref}. For peace when you're anxious, Philippians 4:6-7 invites you to bring every care to God.`;
    return {
      reply,
      scripture: [
        { reference: 'Joshua 1:9', theme: 'courage' },
        { reference: 'Philippians 4:6-7', theme: 'peace' },
      ],
      masterRoute: 'phase5i_verse_remember',
      conceptId,
    };
  }

  const fam = buildFamilyExplanation({ concept: conceptId });
  if (fam) {
    const reply = `${plan.companionOpening || "Here's wording you can use — gentle and clear:"} ${fam.reply}`;
    return {
      reply: reply.trim(),
      scripture: fam.scripture,
      masterRoute: 'phase5i_family_explanation',
      conceptId,
    };
  }

  return null;
}

function buildBoundaryAnswer(plan = {}, context = {}) {
  const boundary = buildBoundaryScript({ situation: context.message || plan.relationshipContext?.message || '' });
  const node = plan.conceptNode || getGraphNode(plan.conceptId);
  const nodeAnswer = node?.directAnswer && plan.isNewTopic ? `${node.directAnswer} ` : '';
  const reply = `${plan.companionOpening || ''} ${nodeAnswer}${boundary.reply}`.replace(/\s+/g, ' ').trim();
  return {
    reply,
    scripture: boundary.scripture,
    masterRoute: 'phase5i_boundary',
    conceptId: plan.conceptId,
  };
}

function buildEmotionalSupportAnswer(plan = {}, context = {}) {
  const m = String(context.message || plan.relationshipContext?.message || '');
  const relCtx = plan.relationshipContext || {};

  if (/\blove life\b/i.test(m) && /\bcrash/i.test(m)) {
    const reply =
      "I'm sorry. That kind of heartbreak can feel heavy. I'm here with you. What happened today that made it feel like it's crashing? One Scripture that may steady the heart is Psalm 34:18 — the LORD is nigh unto them that are of a broken heart.";
    return {
      reply,
      scripture: [{ reference: 'Psalm 34:18', theme: 'comfort' }],
      masterRoute: 'phase5i_heartbreak',
    };
  }

  if (/\bbad day\b|\bhard day\b/i.test(m)) {
    const reply =
      "I'm sorry today was hard. I'm here with you. Want to tell me what happened? Psalm 34:18 — the LORD is nigh unto them that are of a broken heart.";
    return {
      reply,
      scripture: [{ reference: 'Psalm 34:18', theme: 'comfort' }],
      masterRoute: 'phase5i_bad_day',
    };
  }

  const nervousFamilyCtx =
    relCtx.familyConversationContext ||
    plan.companionIntent?.practicalType === 'nervous_family';
  if (nervousFamilyCtx && (relCtx.emotionalState === 'nervous_or_concerned' || plan.companionIntent?.practicalType === 'nervous_family')) {
    const opening =
      plan.companionOpening ||
      (relCtx.familyConversationContext
        ? 'I remember you were working through how to talk with your family about Scripture.'
        : "I hear that you're nervous.");
    const reply = `${opening} That's understandable when Scripture and family relationships are both on the line. Speak slowly, listen, and don't try to answer every objection in one sitting. Joshua 1:9 reminds us to be strong and courageous — the LORD is with you. ${plan.oneFollowUpQuestion || 'Would you like me to pray with you before you talk with them?'}`;
    return {
      reply,
      scripture: [
        { reference: 'Joshua 1:9', theme: 'courage' },
        { reference: 'Philippians 4:6-7', theme: 'peace' },
      ],
      masterRoute: 'phase5i_nervous_family',
    };
  }

  const opening = plan.companionOpening || 'I hear you.';
  const comfortRef = 'Psalm 34:18';
  const comfortText = 'the LORD is nigh unto them that are of a broken heart';
  const followUp = plan.oneFollowUpQuestion || 'What is weighing on you most right now?';
  const reply = `${opening} You are not alone. ${followUp} ${comfortRef} — ${comfortText}.`;
  return {
    reply,
    scripture: [{ reference: comfortRef, theme: 'comfort' }],
    masterRoute: 'phase5i_emotional_support',
  };
}

function buildDoctrineCompanionAnswer(plan = {}, context = {}) {
  const node = plan.conceptNode || getGraphNode(plan.conceptId);
  if (!node) return null;

  const message = String(context.message || plan.relationshipContext?.message || '');
  const conceptId = plan.conceptId || node.id;

  if (conceptId === 'prayer_comfort' || node.helperOnly) {
    if (/\b(pray with me|can you pray|please pray|will you pray)\b/i.test(message)) {
      return null;
    }
    if (/\bwhat does the bible say about prayer\b/i.test(message)) {
      const witnesses = (plan.witnesses || node.directWitnesses || []).slice(0, 3);
      return {
        reply:
          'Scripture teaches believers to pray with reverence and faith. Philippians 4:6-7 calls us to pray with thanksgiving. Matthew 6:9-13 gives the Lord\'s Prayer pattern. James 5:16 invites earnest prayer.',
        scripture: witnesses.map((r) => ({ reference: r, theme: 'prayer_comfort' })),
        masterRoute: 'phase5i_prayer_teaching',
        conceptId,
      };
    }
    return null;
  }

  const witnesses = (plan.witnesses || node.witnesses || []).slice(0, 3);
  const witnessText = witnesses.join(', ');
  let reply = '';

  if (plan.isContinuation || plan.companionIntent?.practicalType === 'why_followup') {
    if (!node.directAnswer) return null;
    reply = `${node.directAnswer} Scripture witnesses: ${witnessText}.`.trim();
  } else if (node.directAnswer) {
    reply = node.directAnswer;
    if (witnesses.length >= 2) {
      reply += ` Scripture witnesses: ${witnessText}.`;
    }
  }

  if (!reply) return null;

  const userId = context.userId;
  if (userId && plan.memorySnapshot?.preferences) {
    reply = applyUserAnswerPreferences(reply, {
      userId,
      polarity: plan.polarity,
      userPreferences: plan.memorySnapshot.preferences,
      message: context.message,
    });
  }

  return {
    reply,
    scripture: witnesses.map((r) => ({ reference: r, theme: plan.conceptId })),
    masterRoute: 'phase5i_doctrine_companion',
    conceptId: plan.conceptId,
  };
}

function buildMemoryAnswer(plan = {}, context = {}) {
  const { userId, message = '' } = context;
  const ack = buildPreferenceAck(message, userId);
  if (ack) {
    return {
      reply: ack,
      scripture: [],
      masterRoute: 'phase5i_memory_preference',
    };
  }
  return {
    reply: buildMemoryDisclosureReply({ userId }),
    scripture: [],
    masterRoute: 'phase5i_memory_disclosure',
  };
}

function buildCompanionResponse(plan = {}, context = {}) {
  let built = null;

  switch (plan.answerType) {
    case 'prayer':
    case 'multi_prayer_verse':
      built = buildPrayerAnswer(plan, context);
      break;
    case 'boundary':
      built = buildBoundaryAnswer(plan, context);
      break;
    case 'practical_guidance':
      built = buildPracticalGuidanceAnswer(plan, context);
      break;
    case 'emotional_support':
      built = buildEmotionalSupportAnswer(plan, context);
      break;
    case 'doctrine_companion':
      built = buildDoctrineCompanionAnswer(plan, context);
      break;
    case 'memory':
      built = buildMemoryAnswer(plan, context);
      break;
    default:
      built = buildPracticalGuidanceAnswer(plan, context) || buildDoctrineCompanionAnswer(plan, context);
  }

  if (!built?.reply) return null;

  if (plan.oneFollowUpQuestion && built.reply && !built.reply.includes('?') && plan.answerType !== 'emotional_support') {
    built.reply = `${built.reply} ${plan.oneFollowUpQuestion}`;
  }

  return built;
}

module.exports = {
  buildCompanionResponse,
  buildDoctrineCompanionAnswer,
  buildEmotionalSupportAnswer,
  buildPracticalGuidanceAnswer,
  buildPrayerAnswer,
  buildBoundaryAnswer,
  buildMemoryAnswer,
};
