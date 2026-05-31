const { resolveLastStudyTopic } = require('./continueStudyIntent');
const { buildContinueStudyOffer } = require('./continueStudyEngine');
const { getStudyJourneyContext, TOPIC_LABELS } = require('./studyJourneyEngine');
const { getRegistryTopic, getRegistryChain } = require('./genesisToRevelationContinuityRegistry');
const { buildScriptureWitnessBlock } = require('./scriptureWitnessEngine');
const { buildCompanionNextSteps } = require('./companionNextSteps');
const {
  resolveDeliveryMode,
  trimScriptureForDelivery,
  trimPathForDelivery,
  applyDeliveryToReply,
} = require('./companionDeliveryLayer');
const { MODE } = require('./studyModeGating');
const { filterChainForMode } = require('./studyModeGating');

const STUDY_CONNECTION_PATTERNS = [
  /what connects to this/i,
  /how does this connect/i,
  /what should i study next/i,
  /what follows this/i,
  /what comes next in (this )?study/i,
  /what related (topic|study|passage)/i,
  /how (does|do) (this|these) connect/i,
];

const REGISTRY_TOPICS = new Set([
  'kingdom',
  'messiah',
  'covenant',
  'death_resurrection',
  'heaven_heavens',
  'captivity',
  'remnant',
]);

const TOPIC_CONNECTIONS = {
  kingdom: 'Kingdom connects to Messiah as the promised ruler, to covenant promises through David, and forward to resurrection and the New Jerusalem.',
  messiah: 'Messiah connects to covenant promises, the Kingdom, and the resurrection hope across the biblical witness.',
  covenant: 'Covenant connects to Kingdom promises, Messiah as fulfillment, and resurrection hope.',
  sabbath: 'Sabbath connects forward to Feast Days, Kingdom rest, and the creation-to-restoration arc in Scripture.',
  feast_days: 'Feast Days connect to Passover, Kingdom fulfillment, and the prophetic timeline in Scripture.',
  resurrection_timeline: 'The resurrection timeline connects to Kingdom hope and the New Jerusalem witness.',
};

function formatTopicLabel(topic = '') {
  return TOPIC_LABELS[topic] || String(topic || 'Scripture').replace(/_/g, ' ');
}

function classifyStudyConnectionQuery(message = '') {
  const text = String(message || '');
  const matched = STUDY_CONNECTION_PATTERNS.find((pattern) => pattern.test(text));
  return {
    isStudyConnection: !!matched,
    matchedPattern: matched ? String(matched) : null,
  };
}

function buildStudyConnectionResponse({ userId, message = '', runtimeContext = {}, profile = {} }) {
  const lastStudy = resolveLastStudyTopic(userId);
  if (!lastStudy?.topic) return null;

  const topic = lastStudy.topic;
  const label = formatTopicLabel(topic);
  const delivery = resolveDeliveryMode({ userId, profile });
  const journey = getStudyJourneyContext({ userId, doctrineTopic: topic });
  const offer = buildContinueStudyOffer({ userId, doctrineTopic: topic });
  const nextStepsBundle = buildCompanionNextSteps({
    userId,
    message,
    runtimeContext: { ...runtimeContext, intent: 'study' },
    mode: 'study',
  });

  const parts = [`You've been studying ${label}. Here is how this connects in Scripture:`];

  if (TOPIC_CONNECTIONS[topic]) {
    parts.push(TOPIC_CONNECTIONS[topic]);
  } else if (REGISTRY_TOPICS.has(topic)) {
    const entry = getRegistryTopic(topic);
    parts.push(
      `${entry?.title || label} forms a continuity path across Scripture — each passage builds on the last without rushing to a single-verse conclusion.`
    );
  } else {
    parts.push(
      'These passages build line upon line across Scripture. We can compare related passages without rushing to a single-verse conclusion.'
    );
  }

  if (journey.enabled && journey.nextLabel) {
    parts.push(`Next in your study journey: ${journey.nextLabel}.`);
  }

  if (offer?.nextReference) {
    parts.push(`Next in the continuity chain for ${label}: ${offer.nextReference}.`);
  }

  let scripture = [];
  if (REGISTRY_TOPICS.has(topic)) {
    const chain = filterChainForMode(getRegistryChain(topic), MODE.ADVANCED_STUDY);
    const refs = trimPathForDelivery(chain.slice(0, 4), delivery);
    scripture = refs.map((node) => ({
      reference: node.reference,
      text: '',
      reason: 'connected passage',
    }));
    const witness = buildScriptureWitnessBlock({
      doctrineTopic: topic,
      scripture,
      chainMeta: { genesisToRevelationPath: refs.map((node) => node.reference) },
    });
    if (witness.block) parts.push(witness.block);
  }

  if (nextStepsBundle.gentleSuggestion) {
    parts.push(nextStepsBundle.gentleSuggestion);
  }

  const reply = applyDeliveryToReply({ reply: parts.filter(Boolean).join('\n\n'), delivery });

  return {
    reply,
    scripture: trimScriptureForDelivery(scripture, delivery),
    mode: 'study',
    confidence: 'medium',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: [
      journey.nextLabel ? `Continue into ${journey.nextLabel}.` : null,
      offer?.nextReference ? `Read ${offer.nextReference} next.` : null,
      'Compare related passages in the continuity chain.',
    ].filter(Boolean).slice(0, 5),
    admin_flags: ['study_connection_intercept'],
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: 'study_connection',
      studyConnection: {
        topic,
        nextTopic: journey.nextTopic,
        nextReference: offer?.nextReference || null,
      },
      studyJourney: journey.enabled ? journey : null,
      continueStudy: offer?.enabled ? offer : null,
      companionNextSteps: nextStepsBundle,
      deliveryMode: delivery.depth,
    },
  };
}

module.exports = {
  STUDY_CONNECTION_PATTERNS,
  classifyStudyConnectionQuery,
  buildStudyConnectionResponse,
};
