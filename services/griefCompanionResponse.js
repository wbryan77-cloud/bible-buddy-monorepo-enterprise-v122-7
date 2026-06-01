const { buildScriptureWitnessBlock } = require('./scriptureWitnessEngine');
const { buildCompanionNextSteps } = require('./companionNextSteps');
const { getRelevantMemoryForSurfacing } = require('./relationshipRecallEngine');
const { buildPrayerFollowUpLine } = require('./prayerContinuityFollowup');
const {
  resolveDeliveryMode,
  trimScriptureForDelivery,
  applyDeliveryToReply,
} = require('./companionDeliveryLayer');

const { getRelationshipMemory } = require('./runtimeRelationshipMemoryEngine');

const GRIEF_FOLLOWUP_PATTERNS = [
  /still bothering/i,
  /still hurts/i,
  /still grieving/i,
  /it is still/i,
  /it's still/i,
  /hasn't gone away/i,
  /hard to move on/i,
  /can't stop thinking/i,
];

const GRIEF_PATTERNS = [
  /lost a friend/i,
  /lost my (friend|mother|father|child|spouse|parent|brother|sister|son|daughter|husband|wife)/i,
  /passed away/i,
  /\bdied\b/i,
  /grieving/i,
  /funeral/i,
  /mourning/i,
  /my heart hurts/i,
  /need peace/i,
  /need strength/i,
  /someone i love (died|passed)/i,
];

const REST_PATTERNS = [
  /tired and need rest/i,
  /\b(very )?tired\b/i,
  /\bweary\b/i,
  /\bexhausted\b/i,
  /need rest/i,
  /burned out/i,
  /fatigue\b/i,
];

const GRIEF_SCRIPTURES = [
  {
    reference: 'Psalm 34:18',
    text: 'The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.',
    reason: 'comfort for grief',
  },
  {
    reference: 'Matthew 5:4',
    text: 'Blessed are they that mourn: for they shall be comforted.',
    reason: 'comfort for mourning',
  },
  {
    reference: 'Revelation 21:4',
    text: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain.',
    reason: 'hope beyond grief',
  },
  {
    reference: '1 Thessalonians 4:13-18',
    text: '',
    reason: 'comfort about those who sleep in death',
  },
];

const REST_SCRIPTURES = [
  {
    reference: 'Matthew 11:28-30',
    text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
    reason: 'rest for the weary',
  },
  {
    reference: 'Psalm 23:1-3',
    text: 'The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures.',
    reason: 'rest and restoration',
  },
  {
    reference: 'Isaiah 40:31',
    text: 'They that wait upon the LORD shall renew their strength.',
    reason: 'strength for the weary',
  },
];

function classifyEmotionalSupport(message = '', userId = null) {
  const text = String(message || '');

  if (userId && GRIEF_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(text))) {
    const hasGriefMemory = getRelationshipMemory(userId, 12).some(
      (item) => item.category === 'grief_events'
    );
    if (hasGriefMemory) {
      return {
        isEmotionalSupport: true,
        supportType: 'grief',
        matched: 'grief_followup',
        isFollowUp: true,
      };
    }
  }

  const isGrief = GRIEF_PATTERNS.some((pattern) => pattern.test(text));
  const isRest = REST_PATTERNS.some((pattern) => pattern.test(text));

  if (isGrief) {
    return { isEmotionalSupport: true, supportType: 'grief', matched: 'grief', isFollowUp: false };
  }
  if (isRest) {
    return { isEmotionalSupport: true, supportType: 'rest', matched: 'rest', isFollowUp: false };
  }
  return { isEmotionalSupport: false, supportType: null, matched: null, isFollowUp: false };
}

function buildEmotionalSupportResponse({
  userId,
  message = '',
  runtimeContext = {},
  supportType = 'grief',
  profile = {},
  isFollowUp = false,
  suppressStudyPrompts = false,
}) {
  const delivery = resolveDeliveryMode({ userId, profile });
  const scriptures = supportType === 'rest' ? REST_SCRIPTURES : GRIEF_SCRIPTURES;
  const witness = buildScriptureWitnessBlock({
    doctrineTopic: supportType === 'rest' ? 'rest' : 'grief',
    scripture: scriptures,
    chainMeta: { genesisToRevelationPath: scriptures.map((s) => s.reference) },
  });

  const memorySurface = getRelevantMemoryForSurfacing({
    userId,
    message,
    currentTopic: supportType === 'rest' ? null : 'grief',
  });
  const nextStepsBundle = buildCompanionNextSteps({
    userId,
    message,
    runtimeContext,
    mode: supportType === 'rest' ? 'wellness' : 'reflection',
  });

  let opening;
  if (supportType === 'rest') {
    opening = "I hear the weariness in what you're carrying. Let's take this gently.";
  } else if (isFollowUp) {
    opening =
      "I hear you — it's still weighing on you. That kind of grief doesn't lift quickly, and it makes sense that it's still bothering you.";
  } else {
    opening = "I'm really sorry for your loss. Tell me about her if you want — we can take this gently, one step at a time.";
  }

  const witnessLines =
    supportType === 'grief'
      ? 'Psalm 34:18 shows the LORD draws near to the brokenhearted. Matthew 5:4 acknowledges mourning and promises comfort. Revelation 21:4 and 1 Thessalonians 4:13-18 carry hope beyond present grief.'
      : 'Matthew 11:28-30 invites the weary to come to Christ for rest. Psalm 23 and Isaiah 40:31 speak of restoration and renewed strength.';

  const parts = [opening];
  if (isFollowUp && memorySurface.line && /grief|loss|weighing/i.test(memorySurface.line)) {
    parts.push(memorySurface.line);
  } else if (!isFollowUp && memorySurface.line && /grief|loss|prayer/i.test(memorySurface.line)) {
    parts.push(memorySurface.line);
  }
  parts.push(witness.connection || witnessLines);
  parts.push(
    supportType === 'grief'
      ? 'If you would like, we can pray together, sit with a comforting passage, or simply talk through what you are feeling — no pressure.'
      : 'If you would like, we can pray for rest, sit with a gentle passage, or take one small step toward peace today.'
  );

  if (supportType === 'grief' && !isFollowUp) {
    parts.push('When you are ready, I can gently check in on how you have been doing — only if you want that.');
  } else if (supportType === 'rest') {
    parts.push('Would you like a brief prayer for rest, or a moment with a gentle passage?');
  }

  if (!suppressStudyPrompts && nextStepsBundle.gentleSuggestion && !/Feast|continue studying|Genesis-to-Revelation/i.test(nextStepsBundle.gentleSuggestion)) {
    parts.push(nextStepsBundle.gentleSuggestion);
  }

  const reply = applyDeliveryToReply({ reply: parts.filter(Boolean).join('\n\n'), delivery });
  const enrichedScripture = trimScriptureForDelivery(
    witness.enrichedScripture.length ? witness.enrichedScripture : scriptures,
    delivery
  );

  const nextSteps = [
    ...(nextStepsBundle.nextSteps || []),
    supportType === 'grief' ? 'Pray through the loss when you are ready.' : 'Rest with Matthew 11:28-30 or Psalm 23.',
    'Sit with a comforting Scripture.',
  ].slice(0, 5);

  return {
    reply,
    scripture: enrichedScripture,
    mode: supportType === 'rest' ? 'wellness' : 'reflection',
    confidence: 'medium',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: supportType === 'rest' ? 'speaking' : 'listening',
    safety_level: 'emotional_support',
    next_steps: nextSteps,
    admin_flags: [supportType === 'rest' ? 'rest_support' : 'grief_support'],
    runtime: {
      emotion: runtimeContext?.emotion || { primary: supportType === 'rest' ? 'anxiety' : 'grief' },
      intent: 'emotional_support',
      emotionalSupport: { type: supportType },
      scriptureWitness: {
        level: witness.level,
        scriptureInterpretsScripture: witness.scriptureInterpretsScripture,
      },
      companionNextSteps: nextStepsBundle,
      deliveryMode: delivery.depth,
      memorySurface: memorySurface.confidenceBlock,
      prayerFollowUpEligible: !!buildPrayerFollowUpLine({ userId }),
    },
  };
}

module.exports = {
  GRIEF_PATTERNS,
  REST_PATTERNS,
  classifyEmotionalSupport,
  buildEmotionalSupportResponse,
};
