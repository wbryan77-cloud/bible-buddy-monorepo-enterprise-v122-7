const { buildCompanionPresence } = require('./runtimeCompanionPresenceEngine');
const { buildReflectionPrompt } = require('./runtimeCompanionReflectionEngine');
const { buildPersonalizedFollowup } = require('./runtimePersonalizedFollowupEngine');
const { buildOrchestration } = require('./emotionalOrchestrator');
const {
  saveStudySession,
  getRecentStudySessions,
} = require('./continuityStudySessionRuntime');
const {
  resolveDoctrineStudyChains,
  buildContinuityStudySteps,
} = require('./doctrineStudyCatalogResolver');
const { buildTraversalContext, saveTraversalStudy } = require('./runtimeLineUponLineTraversalEngine');
const { buildContinueStudyOffer } = require('./continueStudyEngine');
const { routeHistoricalContext } = require('./historicalContextRouter');
const { buildScriptureWitnessBlock } = require('./scriptureWitnessEngine');
const { getRelevantMemoryForSurfacing } = require('./relationshipRecallEngine');
const { buildCompanionNextSteps } = require('./companionNextSteps');
const {
  resolveDeliveryMode,
  trimScriptureForDelivery,
  trimPathForDelivery,
  buildDeliverySummary,
  applyDeliveryToReply,
} = require('./companionDeliveryLayer');
const { buildCompanionReflection } = require('./companionReflectionLayer');
const { getStudyJourneyContext } = require('./studyJourneyEngine');
const { polishCompanionReply } = require('./companionReplyPolish');
const { stripInternalRuntimeLabels } = require('./runtimeLabelStripper');

const OPENINGS = [
  "That's a thoughtful question.",
  "Let's explore that together.",
  "Let's begin with the passages themselves.",
  'This is a topic many people study carefully.',
  'We can walk through the Scriptures one step at a time.',
  "Let's walk through the Scriptures together.",
  "Let's stay close to the text.",
];

const TRANSITION = "Let's build this carefully from Scripture.";

const SECTION_BRIDGE_PHRASES = [
  "Let's connect that with the next passage.",
  "Now let's compare that with what Scripture says next.",
  'Scripture gives another piece here.',
  "Let's keep building line upon line.",
];

const HIDDEN_LABEL_PATTERNS = [
  /^Source-grounded answer:\s*$/gim,
  /^Validation:\s*$/gim,
  /^Continuity generated:\s*$/gim,
  /^Runtime metadata:\s*$/gim,
  /^Internal study continuity[^:\n]*:\s*$/gim,
];

const SECTION_HEADER_PATTERN =
  /^(Continuity Study Path|What these passages state explicitly:|Chronology\s*\(|Line upon line:?)$/im;

const TOPIC_GROUPS = {
  sabbath: ['sabbath', 'commandments'],
  feast_days: ['feast_days', 'feastdays', 'passover', 'feastdayshighsabbaths'],
  dietaryLaw: ['dietarylaw', 'dietary_law', 'food', 'dietary'],
  dietary_law: ['dietarylaw', 'dietary_law', 'food', 'dietary'],
  traditions: ['traditions', 'traditionsOfMen', 'traditionsofmen'],
  resurrection_timeline: ['resurrection_timeline', 'resurrection', 'kingdom', 'resurrectiontimeline'],
};

const TOPIC_DISPLAY_NAMES = {
  sabbath: 'the Sabbath',
  feast_days: 'the Feast Days',
  dietaryLaw: 'clean and unclean foods',
  dietary_law: 'clean and unclean foods',
  traditions: 'traditions and Scripture',
  resurrection_timeline: 'the resurrection timeline',
};

const DUPLICATE_INTRO_PATTERN =
  /thoughtful question|explore that together|begin with the passages|study carefully|walk through the Scriptures|stay close to the text|build this carefully|line upon line/i;

function normalizeTopic(topic = '') {
  return String(topic || '').toLowerCase().replace(/_/g, '');
}

function isRelatedDoctrineTopic(current = '', other = '') {
  const currentNorm = normalizeTopic(current);
  const otherNorm = normalizeTopic(other);
  if (!currentNorm || !otherNorm) return false;
  if (currentNorm === otherNorm || currentNorm.includes(otherNorm) || otherNorm.includes(currentNorm)) {
    return true;
  }

  for (const [groupKey, related] of Object.entries(TOPIC_GROUPS)) {
    const groupNorm = normalizeTopic(groupKey);
    const currentInGroup =
      groupNorm === currentNorm || related.some((item) => normalizeTopic(item) === currentNorm);
    const otherInGroup =
      groupNorm === otherNorm || related.some((item) => normalizeTopic(item) === otherNorm);
    if (currentInGroup && otherInGroup) return true;
  }

  return false;
}

function extractTopicFromMemoryLine(line = '') {
  const studyingMatch = String(line).match(/studying ([^.?]+)/i);
  if (studyingMatch) return studyingMatch[1].trim();
  const studiedMatch = String(line).match(/studied ([^.?]+)/i);
  if (studiedMatch) return studiedMatch[1].trim();
  const talkingMatch = String(line).match(/talking about ([^.?]+)/i);
  if (talkingMatch) return talkingMatch[1].trim();
  const focusedMatch = String(line).match(/focused on ([^.?]+)/i);
  if (focusedMatch) return focusedMatch[1].trim();
  return null;
}

function filterTopicAwareMemoryLine(line = '', doctrineTopic = '') {
  const mentionedTopic = extractTopicFromMemoryLine(line);
  if (!mentionedTopic) return true;
  return isRelatedDoctrineTopic(doctrineTopic, mentionedTopic);
}

function pickOpening(message = '', doctrineTopic = '', userId = '') {
  const seed =
    String(message).length * 3 +
    String(doctrineTopic).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) +
    String(userId).length;
  return OPENINGS[seed % OPENINGS.length];
}

function emotionalSupportLine(runtimeContext = {}, safety = {}) {
  if (safety.level === 'crisis' || safety.level === 'emotional_support') {
    return "I'm glad you brought this here. We can take it gently, one step at a time.";
  }

  const emotion = runtimeContext?.emotion?.primary;
  if (emotion === 'grief' || emotion === 'heartbreak') {
    return "I hear the weight in what you're asking. Let's let Scripture speak first.";
  }

  return null;
}

function hideInternalLabels(text = '') {
  let cleaned = String(text);
  for (const pattern of HIDDEN_LABEL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return stripInternalRuntimeLabels(cleaned.replace(/\n{3,}/g, '\n\n').trim());
}

function insertSectionBridges(body = '', message = '') {
  if (body.length <= 1200) return body;

  const paragraphs = body.split(/\n\n+/);
  const result = [];
  let bridgeIdx = String(message).length % SECTION_BRIDGE_PHRASES.length;

  paragraphs.forEach((paragraph, index) => {
    if (index > 0 && SECTION_HEADER_PATTERN.test(paragraph.trim())) {
      result.push(SECTION_BRIDGE_PHRASES[bridgeIdx % SECTION_BRIDGE_PHRASES.length]);
      bridgeIdx += 1;
    }
    result.push(paragraph);
  });

  return result.join('\n\n');
}

function buildStudyContinuationPhrase(doctrineTopic = '', userId = '') {
  const continueOffer = buildContinueStudyOffer({ userId, doctrineTopic });
  if (continueOffer?.phrase) return continueOffer.phrase;

  const label = TOPIC_DISPLAY_NAMES[doctrineTopic] || 'this topic';
  const prior = getRecentStudySessions(userId, 15).filter((session) =>
    isRelatedDoctrineTopic(doctrineTopic, session.topic)
  );

  if (prior.length) {
    return `Would you like to pick up where we left off studying ${label}?`;
  }

  return `Would you like to continue studying ${label} together?`;
}

function buildStudyModeInvitation({
  userId,
  doctrineTopic,
  scripture = [],
  message = '',
  chainMeta = {},
}) {
  const refs = (chainMeta.genesisToRevelationPath || scripture.map((s) => s.reference || s)).filter(Boolean);
  const steps = buildContinuityStudySteps({
    doctrineTopic,
    chains: chainMeta,
  });
  const traversal = buildTraversalContext(userId, doctrineTopic);
  const continuation = buildStudyContinuationPhrase(doctrineTopic, userId);

  return {
    invitation: "Let's continue building the picture from Scripture.",
    continuation,
    steps,
    references: refs,
    studyStep: steps[0] || null,
    studyProgress: 'invited',
    genesisToRevelationPath: chainMeta.genesisToRevelationPath || refs,
    traversal: traversal.traversal || [],
  };
}

function pickTopicAwareReflection({ userId, message, doctrineTopic }) {
  try {
    const reflection = buildReflectionPrompt({ userId, currentMessage: message });
    const prompts = (reflection.prompts || []).filter((prompt) => {
      if (/What has been on your mind most lately/i.test(prompt)) return false;
      return filterTopicAwareMemoryLine(prompt, doctrineTopic);
    });
    return prompts[0] || null;
  } catch (_) {
    return null;
  }
}

function pickTopicAwareFollowup({ userId, message, doctrineTopic }) {
  try {
    const followup = buildPersonalizedFollowup({ userId, currentMessage: message });
    const suggestions = (followup.suggestions || []).filter((suggestion) =>
      filterTopicAwareMemoryLine(suggestion, doctrineTopic)
    );
    return suggestions[0] || null;
  } catch (_) {
    return null;
  }
}

function presentCompanionDoctrine({
  structured = {},
  userId = 'anonymous',
  message = '',
  runtimeContext = {},
  profile = {},
  safety = {},
  doctrineTopic = '',
}) {
  const memoryEnabled = profile?.memoryEnabled !== false;
  const rawDoctrineBody = String(structured.reply || '').trim();
  const chainMeta =
    structured.runtime?.scriptureChain && typeof structured.runtime.scriptureChain === 'object'
      ? structured.runtime.scriptureChain
      : resolveDoctrineStudyChains({
          topic: doctrineTopic,
          message,
          primaryScripture: (structured.scripture || []).map((s) => s.reference || s),
        });

  const witness = buildScriptureWitnessBlock({
    doctrineTopic,
    scripture: structured.scripture || [],
    chainMeta,
  });

  const historical = routeHistoricalContext({ doctrineTopic, message });

  const doctrineBody = insertSectionBridges(
    hideInternalLabels(rawDoctrineBody),
    message
  );

  const delivery = resolveDeliveryMode({ userId, profile });
  const memorySurface = memoryEnabled ? getRelevantMemoryForSurfacing({ userId, message }) : { line: null };
  const nextStepsBundle = buildCompanionNextSteps({
    userId,
    message,
    runtimeContext,
    mode: 'study',
  });

  const parts = [];

  const opening = pickOpening(message, doctrineTopic, userId);
  parts.push(opening);

  if (memoryEnabled) {
    const companionReflection = buildCompanionReflection({ userId, message, runtimeContext });
    if (companionReflection.reflection && !DUPLICATE_INTRO_PATTERN.test(opening)) {
      parts.push(companionReflection.reflection);
    } else if (memorySurface.line && !DUPLICATE_INTRO_PATTERN.test(String(memorySurface.line))) {
      parts.push(memorySurface.line);
    }
  } else if (memorySurface.line) {
    parts.push(memorySurface.line);
  }

  if (delivery.isLight) {
    const summary = buildDeliverySummary({ delivery, topicLabel: TOPIC_DISPLAY_NAMES[doctrineTopic] || doctrineTopic });
    if (summary) parts.push(summary);
  }

  const support = emotionalSupportLine(runtimeContext, safety);
  if (support && !DUPLICATE_INTRO_PATTERN.test(support)) {
    parts.push(support);
  }

  if (memoryEnabled) {
    try {
      const presence = buildCompanionPresence({
        userId,
        currentMessage: message,
        mode: structured.mode || 'study',
      });
      const relatedPresence = (presence.gentlePresence || []).find((line) =>
        filterTopicAwareMemoryLine(line, doctrineTopic)
      );
      if (relatedPresence && relatedPresence !== opening && !parts.includes(relatedPresence)) {
        parts.push(relatedPresence);
      }
    } catch (_) {}
  }

  if (!witness.block && !witness.connection && !DUPLICATE_INTRO_PATTERN.test(opening)) {
    parts.push(TRANSITION);
  }

  if (witness.block) {
    parts.push(witness.block);
  } else if (witness.connection) {
    parts.push(witness.connection);
  }

  parts.push(doctrineBody);

  if (historical.included && historical.formattedBlock) {
    parts.push(historical.formattedBlock);
  }

  if (memoryEnabled) {
    const reflection = pickTopicAwareReflection({ userId, message, doctrineTopic });
    if (reflection) parts.push(reflection);
  }

  const followup = pickTopicAwareFollowup({ userId, message, doctrineTopic });
  if (followup) {
    parts.push(followup);
  } else {
    parts.push('Would you like to compare related passages?');
  }

  const studyMode = buildStudyModeInvitation({
    userId,
    doctrineTopic,
    scripture: witness.enrichedScripture.length
      ? witness.enrichedScripture
      : structured.scripture || [],
    message,
    chainMeta,
  });

  const continueOffer = buildContinueStudyOffer({ userId, doctrineTopic });
  const studyJourney = getStudyJourneyContext({ userId, doctrineTopic });
  if (studyJourney.enabled && studyJourney.phrase) {
    parts.push(studyJourney.phrase);
  } else if (continueOffer?.phrase) {
    parts.push(continueOffer.phrase);
  }

  if (studyMode.genesisToRevelationPath?.length) {
    const pathRefs = trimPathForDelivery(studyMode.genesisToRevelationPath, delivery);
    parts.push('\nGenesis-to-Revelation Study Path:');
    parts.push(
      pathRefs
        .map((ref, index) => `${index + 1}. ${ref}`)
        .join('\n')
    );
  }

  parts.push(
    `\n${studyMode.invitation}\n${studyMode.continuation}\n` +
      studyMode.steps.map((s) => `- ${s}`).join('\n')
  );

  if (nextStepsBundle.gentleSuggestion) {
    parts.push(nextStepsBundle.gentleSuggestion);
  }

  if (memoryEnabled && doctrineTopic) {
    try {
      saveStudySession({
        userId,
        topic: doctrineTopic,
        references: studyMode.references,
        studyStep: studyMode.studyStep,
        studyProgress: studyMode.studyProgress,
        userQuestion: message,
      });

      if (studyMode.traversal?.length) {
        saveTraversalStudy({
          userId,
          topic: doctrineTopic,
          traversal: studyMode.traversal,
          notes: '',
        });
      }
    } catch (_) {}
  }

  let orbState = structured.orb_state || 'speaking';
  try {
    const orch = buildOrchestration({
      userId,
      message,
      mode: structured.mode || 'study',
      safetyLevel: structured.safety_level || safety.level || 'standard',
    });
    orbState = orch.orbState || orbState;
  } catch (_) {}

  const presentedReply = applyDeliveryToReply({
    reply: parts.filter(Boolean).join('\n\n'),
    delivery,
  });

  const finalScripture = trimScriptureForDelivery(
    witness.enrichedScripture.length ? witness.enrichedScripture : structured.scripture,
    delivery
  );

  return {
    ...structured,
    reply: polishCompanionReply(presentedReply),
    scripture: finalScripture,
    orb_state: orbState,
    next_steps: [
      ...(Array.isArray(structured.next_steps) ? structured.next_steps : []),
      studyMode.continuation,
      continueOffer?.phrase || studyMode.continuation,
      'Compare related passages in the continuity chain.',
    ].slice(0, 6),
    runtime: {
      ...(structured.runtime || {}),
      companionPresentation: {
        wrapped: true,
        doctrineBodyPreserved: true,
        studyModeOffered: true,
        historicalSecondary: historical.included,
        historicalBlocked: historical.blocked || false,
        memoryEnabled,
        labelsHidden: true,
        topicAwareMemory: true,
        scriptureWitness: {
          level: witness.level,
          label: witness.witnessLevelLabel,
          scriptureInterpretsScripture: witness.scriptureInterpretsScripture,
        },
      },
      studyMode,
      continueStudy: continueOffer,
      companionNextSteps: nextStepsBundle,
      deliveryMode: delivery.depth,
      memorySurface: memorySurface.confidenceBlock || null,
      historicalContext: historical.included
        ? {
            tier: historical.tier,
            secondary: true,
            references: historical.references,
          }
        : null,
    },
    presentationMeta: {
      authorityOrder: historical.authorityOrder ||
        chainMeta.authorityOrder || [
          'Scripture',
          'Scripture interpreting Scripture',
          'Continuity Chain',
          'Historical context',
          'Research questions',
        ],
    },
  };
}

module.exports = {
  presentCompanionDoctrine,
  hideInternalLabels,
  isRelatedDoctrineTopic,
};
