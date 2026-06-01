const { buildScriptureWitnessBlock } = require('./scriptureWitnessEngine');
const { buildCompanionNextSteps } = require('./companionNextSteps');
const { buildCompanionReflection } = require('./companionReflectionLayer');
const { buildPrayerFollowUpLine } = require('./prayerContinuityFollowup');
const {
  resolveDeliveryMode,
  trimScriptureForDelivery,
  applyDeliveryToReply,
} = require('./companionDeliveryLayer');

const PRAYER_PATTERNS = [
  /pray for/i,
  /please pray/i,
  /can you pray/i,
  /could you pray/i,
  /need prayer/i,
  /pray about/i,
  /let'?s pray/i,
  /will you pray/i,
];

const PRAYER_SCRIPTURES = [
  {
    reference: 'Philippians 4:6-7',
    text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
    reason: 'bringing requests to God',
  },
  {
    reference: 'James 5:16',
    text: 'The effectual fervent prayer of a righteous man availeth much.',
    reason: 'power of prayer',
  },
  {
    reference: 'Psalm 34:17',
    text: 'The righteous cry, and the LORD heareth, and delivereth them out of all their troubles.',
    reason: 'God hears prayer',
  },
];

function classifyPrayerIntent(message = '') {
  const text = String(message || '');
  const matched = PRAYER_PATTERNS.find((pattern) => pattern.test(text));
  return {
    isPrayerRequest: !!matched,
    matchedPattern: matched ? String(matched) : null,
  };
}

function extractPrayerSubject(message = '') {
  const text = String(message).trim();
  const forMatch = text.match(/pray for (.+)/i);
  if (forMatch) return forMatch[1].replace(/[.?!]+$/, '').trim();
  const aboutMatch = text.match(/pray about (.+)/i);
  if (aboutMatch) return aboutMatch[1].replace(/[.?!]+$/, '').trim();
  return text.slice(0, 120);
}

function buildPrayerText(subject = '') {
  const focus = subject ? ` for ${subject}` : '';
  return `Father, we bring this need before You${focus}. You see what we cannot fully see. Please draw near with comfort, wisdom, and peace. Hold those who are hurting, guide those who are waiting, and help us trust You one step at a time. In Jesus' name, amen.`;
}

function buildPrayerCompanionResponse({
  userId,
  message = '',
  runtimeContext = {},
  profile = {},
  suppressStudyPrompts = false,
}) {
  const delivery = resolveDeliveryMode({ userId, profile });
  const subject = extractPrayerSubject(message);
  const witness = buildScriptureWitnessBlock({
    doctrineTopic: 'prayer',
    scripture: PRAYER_SCRIPTURES,
    chainMeta: { genesisToRevelationPath: PRAYER_SCRIPTURES.map((s) => s.reference) },
  });

  const reflection = buildCompanionReflection({ userId, message, runtimeContext });
  const nextStepsBundle = buildCompanionNextSteps({
    userId,
    message,
    runtimeContext,
    mode: 'companion',
  });
  const followUp = buildPrayerFollowUpLine({ userId });

  const parts = [];
  parts.push("I'm glad you asked to pray. Let's bring this before the Lord together.");
  parts.push(buildPrayerText(subject));

  if (reflection.reflection && !/^I hear you|^You mentioned|^Thank you for/i.test(reflection.reflection)) {
    parts.push(reflection.reflection);
  }
  parts.push(
    witness.connection ||
      'Philippians 4:6-7 invites us to bring every request to God. James 5:16 speaks of earnest prayer. Psalm 34:17 assures us the LORD hears.'
  );
  parts.push(
    'If you would like, we can sit with one of these passages, talk through what you are carrying, or check in gently later — only if you want that.'
  );

  if (followUp?.line && !parts.some((part) => part.includes(followUp.line.slice(0, 24)))) {
    parts.push(followUp.line);
  } else {
    parts.push('When you are ready, we can follow up on how this prayer concern is going.');
  }

  if (nextStepsBundle.gentleSuggestion && !suppressStudyPrompts) {
    parts.push(nextStepsBundle.gentleSuggestion);
  }

  const reply = applyDeliveryToReply({ reply: parts.filter(Boolean).join('\n\n'), delivery });
  const enrichedScripture = trimScriptureForDelivery(
    witness.enrichedScripture.length ? witness.enrichedScripture : PRAYER_SCRIPTURES,
    delivery
  );

  return {
    reply,
    scripture: enrichedScripture,
    mode: 'companion',
    confidence: 'medium',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: 'praying',
    safety_level: 'standard',
    next_steps: [
      'Sit with Philippians 4:6-7.',
      'Return to this prayer when you are ready.',
      ...(nextStepsBundle.nextSteps || []),
    ].slice(0, 5),
    admin_flags: ['prayer_intercept'],
    runtime: {
      emotion: runtimeContext?.emotion || { primary: 'hope', intensity: 'medium' },
      intent: 'prayer',
      prayerSubject: subject,
      scriptureWitness: {
        level: witness.level,
        scriptureInterpretsScripture: witness.scriptureInterpretsScripture,
      },
      companionNextSteps: nextStepsBundle,
      deliveryMode: delivery.depth,
      prayerFollowUpEligible: true,
    },
  };
}

module.exports = {
  PRAYER_PATTERNS,
  classifyPrayerIntent,
  buildPrayerCompanionResponse,
};
