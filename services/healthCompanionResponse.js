const { detectHealthConcern } = require('./relationshipMemoryBridge');
const { buildScriptureWitnessBlock } = require('./scriptureWitnessEngine');
const { buildCompanionNextSteps } = require('./companionNextSteps');
const { getRelevantMemoryForSurfacing } = require('./relationshipRecallEngine');
const {
  resolveDeliveryMode,
  trimScriptureForDelivery,
  applyDeliveryToReply,
} = require('./companionDeliveryLayer');

const HEALTH_SCRIPTURES = [
  {
    reference: 'Psalm 103:1-5',
    text: 'Bless the LORD, O my soul... who healeth all thy diseases.',
    reason: 'comfort and care',
  },
  {
    reference: '3 John 1:2',
    text: 'Beloved, I wish above all things that thou mayest prosper and be in health, even as thy soul prospereth.',
    reason: 'wholeness in body and soul',
  },
  {
    reference: 'Matthew 11:28-30',
    text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
    reason: 'rest for the weary',
  },
];

function classifyHealthCompanion(message = '') {
  if (/lost|grief|passed away|funeral|mourning|died\b/i.test(String(message))) {
    return { isHealthSupport: false, health: null };
  }
  const health = detectHealthConcern(message);
  if (!health) return { isHealthSupport: false, health: null };
  return { isHealthSupport: true, health };
}

function buildHealthSupportResponse({
  userId,
  message = '',
  runtimeContext = {},
  profile = {},
  health = {},
  suppressStudyPrompts = false,
}) {
  const delivery = resolveDeliveryMode({ userId, profile });
  const issue = health.issue || 'this health concern';
  const witness = buildScriptureWitnessBlock({
    doctrineTopic: 'wellness',
    scripture: HEALTH_SCRIPTURES,
    chainMeta: { genesisToRevelationPath: HEALTH_SCRIPTURES.map((s) => s.reference) },
  });

  const isRecurring = /\b(again|still|today)\b/i.test(message) && /knee|pain|hurt|ache/i.test(message);
  const memorySurface = getRelevantMemoryForSurfacing({ userId, message, currentTopic: 'health' });
  const nextStepsBundle = buildCompanionNextSteps({
    userId,
    message,
    runtimeContext,
    mode: 'wellness',
  });

  const isFirstMention = !isRecurring && !/\b(week|days|month|while|ongoing)\b/i.test(message);
  let opening;
  if (isFirstMention && /knee|hurt|pain|ache/i.test(message + issue)) {
    opening =
      "I'm sorry you're dealing with that. How long has it been hurting — just today, or has this been going on for a while?";
  } else if (isRecurring && /knee/i.test(message + issue)) {
    opening =
      "I hear you — your knees are hurting again today. That matters, and I'm glad you told me. Let's take this gently — I'm not a doctor, but we can bring this before the Lord together.";
  } else if (isRecurring) {
    opening = `I hear you — ${issue} is flaring up again. That matters, and I'm glad you told me. Let's take this gently — I'm not a doctor, but we can bring this before the Lord together.`;
  } else {
    opening = `I hear you sharing about ${issue}. Let's take this gently — I'm not a doctor, but we can bring this before the Lord together.`;
  }

  const parts = [opening];

  const healthMemory =
    memorySurface.line && /knee|pain|health|bother|sleep|fatigue|weary/i.test(memorySurface.line)
      ? memorySurface.line
      : null;
  if (healthMemory && !isRecurring) {
    parts.push(healthMemory);
  }

  parts.push(
    witness.connection ||
      'Psalm 103 reminds us the LORD heals and renews. 3 John speaks of health alongside spiritual well-being. Matthew 11:28-30 invites the weary to come to Christ for rest.'
  );
  parts.push(
    'If you would like, we can pray for strength and peace, sit with a gentle passage, or take one small step for today — no pressure.'
  );

  if (!suppressStudyPrompts && nextStepsBundle.gentleSuggestion && !/grief|loss|Feast|continue studying/i.test(nextStepsBundle.gentleSuggestion)) {
    parts.push(nextStepsBundle.gentleSuggestion);
  }

  const reply = applyDeliveryToReply({ reply: parts.filter(Boolean).join('\n\n'), delivery });
  const enrichedScripture = trimScriptureForDelivery(
    witness.enrichedScripture.length ? witness.enrichedScripture : HEALTH_SCRIPTURES,
    delivery
  );

  return {
    reply,
    scripture: enrichedScripture,
    mode: 'wellness',
    confidence: 'medium',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: [
      ...(nextStepsBundle.nextSteps || []),
      'Pray for strength and peace.',
      'Rest with a gentle Scripture.',
    ].slice(0, 5),
    admin_flags: ['health_support'],
    runtime: {
      emotion: runtimeContext?.emotion || { primary: 'concern', intensity: 'medium' },
      intent: 'health_support',
      healthSupport: { issue: health.issue, detail: health.detail },
      scriptureWitness: {
        level: witness.level,
        scriptureInterpretsScripture: witness.scriptureInterpretsScripture,
      },
      companionNextSteps: nextStepsBundle,
      deliveryMode: delivery.depth,
      memorySurface: memorySurface.confidenceBlock,
    },
  };
}

module.exports = {
  classifyHealthCompanion,
  buildHealthSupportResponse,
};
