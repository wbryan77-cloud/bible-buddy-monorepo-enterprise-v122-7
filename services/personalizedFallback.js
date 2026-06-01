const { buildLearningContext } = require('./companionLearningLayer');
const { getRelevantMemoryForSurfacing } = require('./relationshipRecallEngine');
const { getPrayerContinuity } = require('./runtimePrayerContinuityEngine');
const { buildCompanionNextSteps } = require('./companionNextSteps');
const { buildContinueStudyOffer } = require('./continueStudyEngine');
const {
  resolveDeliveryMode,
  trimScriptureForDelivery,
  buildDeliverySummary,
  applyDeliveryToReply,
} = require('./companionDeliveryLayer');
const { hasGenericLoop } = require('./runtimeLoopGuard');
const { buildCompanionReflection } = require('./companionReflectionLayer');
const { getStudyJourneyContext } = require('./studyJourneyEngine');
const { detectOpenLoop } = require('./openLoopsEngine');

const TOPIC_LABELS = {
  sabbath: 'Sabbath',
  feast_days: 'Feast Days',
  dietaryLaw: 'dietary law',
  dietary_law: 'dietary law',
  traditions: 'traditions and Scripture',
  resurrection_timeline: 'the resurrection timeline',
  kingdom: 'the Kingdom of God',
  covenant: 'covenant',
  messiah: 'the Messiah',
};

function formatTopic(topic = '') {
  return TOPIC_LABELS[topic] || String(topic || '').replace(/_/g, ' ');
}

function buildPersonalizedFallback({
  userId,
  message = '',
  safety = {},
  recentSessions = [],
  runtimeContext = {},
  profile = {},
  suppressStudyPrompts = false,
  suppressMemory = false,
}) {
  const learning = buildLearningContext(userId);
  const delivery = resolveDeliveryMode({ userId, profile });
  const memorySurface = getRelevantMemoryForSurfacing({ userId, message });
  const prayers = getPrayerContinuity(userId, 2);
  const lastSession = recentSessions[recentSessions.length - 1];
  const nextStepsBundle = buildCompanionNextSteps({ userId, message, runtimeContext, mode: 'companion' });

  const favoriteTopic = learning.favoriteTopics?.[0] || null;
  const studyLabel = favoriteTopic ? formatTopic(favoriteTopic) : null;
  const prayerTopic = prayers[0]?.topic || learning.prayerTopics?.[0] || null;
  const lower = String(message).toLowerCase();

  const parts = [];
  let memory_used = false;
  const reflection = buildCompanionReflection({ userId, message, runtimeContext });

  if (reflection.reflection && !suppressMemory) {
    parts.push(reflection.reflection);
    memory_used = true;
  } else if (memorySurface.line && !suppressMemory) {
    parts.push(memorySurface.line);
    memory_used = true;
  }

  const incomingLoop = detectOpenLoop(message);
  if (incomingLoop && !parts.some((part) => part.includes(incomingLoop.label))) {
    parts.push(
      `Thank you for sharing about your ${incomingLoop.label}. I will hold that gently — we can return to it whenever you want.`
    );
    memory_used = true;
  }

  if (!suppressMemory && studyLabel && favoriteTopic === 'sabbath') {
    const offer = buildContinueStudyOffer({ userId, doctrineTopic: 'sabbath' });
    parts.push(
      `You've been studying ${studyLabel} frequently. ${offer.phrase || 'Would you like to continue the Sabbath study path?'}`
    );
    memory_used = true;
  } else if (!suppressMemory && studyLabel && prayerTopic) {
    parts.push(
      `You've been studying ${studyLabel} and asking for guidance around ${prayerTopic}. We can continue that study, pray through what you're carrying, or look at a Scripture for strength.`
    );
    memory_used = true;
  } else if (!suppressMemory && studyLabel) {
    parts.push(
      `You've been studying ${studyLabel}. We can continue that study, pray through what you're carrying, or look at a Scripture for strength.`
    );
    memory_used = true;
  } else if (!suppressMemory && (prayerTopic || learning.prayerTopics?.length)) {
    parts.push(
      `I remember you've been carrying concerns around ${prayerTopic || learning.prayerTopics[0]}. We can pray together, turn to Scripture, or take one gentle step for today.`
    );
    memory_used = true;
  } else if (!suppressMemory && lastSession?.message) {
    parts.push(
      `When we last spoke you mentioned "${String(lastSession.message).slice(0, 100)}..." — would you like to pick that back up, turn to Scripture, or pray through it?`
    );
    memory_used = true;
  } else if (lower.includes('study') || lower.includes('scripture') || lower.includes('sabbath') || lower.includes('verse')) {
    parts.push(
      "Let's stay close to Scripture together. Tell me which passage or topic you want to explore, and we can walk through it line upon line."
    );
  } else {
    parts.push(
      "I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now."
    );
  }

  const studyJourney = getStudyJourneyContext({ userId });
  if (!suppressStudyPrompts && studyJourney.enabled && studyJourney.phrase && /study|sabbath|kingdom|continue/i.test(lower)) {
    parts.push(studyJourney.phrase);
    memory_used = true;
  }

  if (!suppressStudyPrompts && nextStepsBundle.gentleSuggestion) {
    parts.push(nextStepsBundle.gentleSuggestion);
  }

  const summaryLine = buildDeliverySummary({ delivery, topicLabel: studyLabel });
  const reply = applyDeliveryToReply({
    reply: parts.filter(Boolean).join('\n\n'),
    delivery,
    summaryLine: delivery.isLight && memory_used ? summaryLine : null,
  });

  const scripture = trimScriptureForDelivery(
    [
      {
        reference: 'Psalm 46:1',
        text: 'God is our refuge and strength, a very present help in trouble.',
        reason: 'steadying reminder',
      },
    ],
    delivery
  );

  const structured = {
    reply,
    scripture,
    mode: lower.includes('study') || studyLabel ? 'study' : 'companion',
    confidence: memory_used ? 'medium' : 'low',
    memory_used,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: safety.level || 'standard',
    next_steps: nextStepsBundle.nextSteps?.length
      ? nextStepsBundle.nextSteps
      : ['Choose prayer, Scripture, or a practical next step.'],
    admin_flags: memory_used ? ['personalized_fallback'] : ['fallback_loop_suppressed'],
    runtime: {
      personalizedFallback: true,
      companionNextSteps: nextStepsBundle,
      deliveryMode: delivery.depth,
      memorySurface: memorySurface.confidenceBlock,
      memoryPresenceUsed: !!memorySurface.line,
    },
  };

  if (hasGenericLoop(structured.reply)) {
    structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'fallback_loop_suppressed'])];
  }

  return structured;
}

module.exports = {
  buildPersonalizedFallback,
};
