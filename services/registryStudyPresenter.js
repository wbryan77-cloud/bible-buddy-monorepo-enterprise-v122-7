const { getRegistryTopic, getRegistryChain } = require('./genesisToRevelationContinuityRegistry');
const { saveStudySession } = require('./continuityStudySessionRuntime');
const { evaluateTopicSafety } = require('./doctrineSafetyLayer');
const { buildScriptureWitnessBlock } = require('./scriptureWitnessEngine');
const { routeHistoricalContext } = require('./historicalContextRouter');
const { buildCompanionNextSteps } = require('./companionNextSteps');
const { MODE } = require('./studyModeGating');
const { filterChainForMode } = require('./studyModeGating');
const {
  resolveDeliveryMode,
  trimScriptureForDelivery,
  trimPathForDelivery,
  buildDeliverySummary,
  buildDeepStudyExtension,
  applyDeliveryToReply,
} = require('./companionDeliveryLayer');
const { polishCompanionReply } = require('./companionReplyPolish');

const REGISTRY_TOPIC_PATTERNS = Object.freeze({
  kingdom: [/what is the kingdom of god/i, /kingdom of god/i, /kingdom of heaven/i],
  covenant: [/what is the covenant/i, /biblical covenant/i, /covenant of god/i],
  messiah: [/who is the messiah/i, /what is the messiah/i, /messiah in scripture/i],
  death_resurrection: [
    /what happens at death/i,
    /state of the dead/i,
    /when we die/i,
    /what happens when we die/i,
  ],
  heaven_heavens: [/three heavens/i, /where is heaven/i, /what is heaven/i],
  captivity: [/babylonian captivity/i, /captivity of israel/i, /exile to babylon/i],
  remnant: [/remnant of israel/i, /what is the remnant/i, /faithful remnant/i],
});

function detectRegistryStudyTopic(message = '') {
  const text = String(message || '');
  for (const [registryKey, patterns] of Object.entries(REGISTRY_TOPIC_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return registryKey;
    }
  }
  return null;
}

function refLabel(ref) {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref.reference || String(ref);
}

function buildRegistryStudyBody(registryKey, refs = []) {
  const entry = getRegistryTopic(registryKey);
  const title = entry?.title || registryKey.replace(/_/g, ' ');
  const primary = refs.slice(0, 3).map(refLabel);

  const lines = [
    `Advanced Scripture Study: ${title}`,
    'These passages form a continuity path across Scripture. We can walk through them line upon line without rushing to a single-verse conclusion.',
  ];

  if (primary.length >= 2) {
    lines.push(
      `${primary[0]} opens the theme, ${primary[1]} confirms it alongside Scripture${
        primary[2] ? `, and ${primary[2]} carries the theme forward.` : '.'
      }`
    );
  }

  lines.push(
    'Genesis-to-Revelation path:',
    ...refs.slice(0, 8).map((ref, index) => `${index + 1}. ${refLabel(ref)}`),
    'Would you like to compare the next related passages together?'
  );

  return lines.join('\n\n');
}

function presentRegistryStudyResponse({ userId, message = '', registryKey, runtimeContext = {}, profile = {} }) {
  const entry = getRegistryTopic(registryKey);
  if (!entry) return null;

  const delivery = resolveDeliveryMode({ userId, profile });
  const chain = filterChainForMode(getRegistryChain(registryKey), MODE.ADVANCED_STUDY);
  const refs = trimPathForDelivery(chain.slice(0, 8), delivery);
  const scripture = refs.map((node) => ({
    reference: node.reference,
    text: '',
    reason: 'registry continuity witness',
  }));

  const witness = buildScriptureWitnessBlock({
    doctrineTopic: registryKey,
    scripture,
    chainMeta: { genesisToRevelationPath: refs.map((node) => node.reference) },
  });

  const safety = evaluateTopicSafety(registryKey, MODE.ADVANCED_STUDY);
  const historical = routeHistoricalContext({ doctrineTopic: registryKey, message });
  const nextStepsBundle = buildCompanionNextSteps({
    userId,
    message,
    runtimeContext: { ...runtimeContext, intent: 'study' },
    mode: 'study',
  });

  const parts = [
    "Let's explore that together from Scripture.",
  ];
  if (delivery.isLight) {
    parts.push(buildDeliverySummary({ delivery, topicLabel: entry.title }));
  }
  parts.push(witness.block, buildRegistryStudyBody(registryKey, refs));

  if (historical.included && historical.formattedBlock) {
    parts.push(historical.formattedBlock);
  }

  if (nextStepsBundle.gentleSuggestion) {
    parts.push(nextStepsBundle.gentleSuggestion);
  }

  const extension = buildDeepStudyExtension({
    delivery,
    registryKey,
    extraRefs: refs.slice(3).map((node) => node.reference),
  });
  if (extension) parts.push(extension);

  const finalScripture = trimScriptureForDelivery(
    witness.enrichedScripture.length >= 2 ? witness.enrichedScripture : scripture,
    delivery
  );

  try {
    saveStudySession({
      userId,
      topic: registryKey,
      references: refs.map((node) => node.reference),
      studyStep: refs[0]?.reference || null,
      studyProgress: 'invited',
      userQuestion: message,
    });
  } catch (_) {}

  return {
    reply: polishCompanionReply(parts.filter(Boolean).join('\n\n')),
    scripture: finalScripture,
    mode: 'study',
    confidence: 'medium',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: [
      'Compare the next passage in the continuity chain.',
      ...(nextStepsBundle.nextSteps || []),
    ].slice(0, 5),
    admin_flags: ['registry_study_presenter'],
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: 'study',
      registryTopic: registryKey,
      studyMode: MODE.ADVANCED_STUDY,
      registrySafety: {
        effectiveMode: safety.effectiveMode,
        confidenceScore: safety.confidenceScore,
      },
      scriptureWitness: {
        level: witness.level,
        scriptureInterpretsScripture: witness.scriptureInterpretsScripture,
      },
      historicalContext: historical.included
        ? { tier: historical.tier, secondary: true }
        : null,
      companionNextSteps: nextStepsBundle,
      deliveryMode: delivery.depth,
    },
    presentationMeta: {
      authorityOrder: historical.authorityOrder || [
        'Scripture',
        'Scripture interpreting Scripture',
        'Continuity chains',
        'Historical context',
        'Research questions',
      ],
    },
  };
}

module.exports = {
  REGISTRY_TOPIC_PATTERNS,
  detectRegistryStudyTopic,
  presentRegistryStudyResponse,
};
