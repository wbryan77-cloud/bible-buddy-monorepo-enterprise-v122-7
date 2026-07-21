/**
 * Phase 5A — Think before answering: concept path + witness plan.
 */

const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
const {
  detectConceptFromGraph,
  resolveConceptAlias,
  getGraphWitnesses,
  getGraphNode,
  hasExplicitConcept,
  CONTINUATION_PHRASE_RE,
} = require('./bibleConceptGraph');
const { detectSemanticConcept, shouldClearStaleTopic } = require('./bibleSemanticConceptNormalizer');
const { resolveFollowUpContext } = require('./followUpContextResolver');
const {
  planCompanionDoctrineRouting,
  buildRoutingContext,
  hasExplicitScriptureReference,
} = require('./companionDoctrineRouter');
const { getDoctrineConversationState } = require('./doctrineConversationState');
const { getUserAnswerPreferences } = require('./userCorrectionMemory');
const { isPendingQuestionChallenge } = require('./pendingQuestionResolver');


const EXPLICIT_SCRIPTURE_REFERENCE_RE =
  /\b(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|1\s*samuel|2\s*samuel|1\s*kings|2\s*kings|1\s*chronicles|2\s*chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|song\s+of\s+solomon|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|1\s*corinthians|2\s*corinthians|galatians|ephesians|philippians|colossians|1\s*thessalonians|2\s*thessalonians|1\s*timothy|2\s*timothy|titus|philemon|hebrews|james|1\s*peter|2\s*peter|1\s*john|2\s*john|3\s*john|jude|revelation)\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?\b/i;

const UNKNOWN_BIBLE_RE =
  /\b(what does|what is|what are|explain|teach me|tell me about|scripture says|bible says)\b/i;

function buildReasoningPlan({
  message = '',
  userId = '',
  recentSessions = [],
  runtimeContext = {},
  userPreferences = null,
} = {}) {
  const m = String(message || '').trim();
  const context = buildRoutingContext(userId, { runtimeContext, recentSessions });
  const state = userId ? getDoctrineConversationState(userId) : {};
  const prefs = userPreferences || getUserAnswerPreferences(userId);
  const routePlan = planCompanionDoctrineRouting({
    userId,
    message,
    recentSessions,
    runtimeContext,
  });

  const explicitScriptureReference = hasExplicitScriptureReference(m);

  const protectedHumanConversation =
    routePlan.lane === 'companion' &&
    routePlan.humanNeed &&
    routePlan.humanNeed !== 'doctrine_answer';

  const followUp = resolveFollowUpContext(m, {
    lastAnsweredConcept: state.lastAnsweredConcept || context.lastAnsweredConcept,
    activeBibleConcept: context.activeBibleConcept,
    lastBibleConcept: context.lastBibleConcept,
  });
  const explicitConcept = hasExplicitConcept(m);

  let concept =
    (followUp?.conceptId && !followUp.isActorQuestion
      ? getGraphNode(followUp.conceptId)
      : null) ||
    (!protectedHumanConversation && !explicitScriptureReference
      ? detectSemanticConcept(m, context)
      : null) ||
    (explicitConcept ? resolveConceptAlias(m) : null) ||
    (!protectedHumanConversation &&
    !explicitScriptureReference &&
    context.activeBibleConcept
      ? detectConceptFromGraph(context.activeBibleConcept)
      : null);
  const strictTopic =
    routePlan.strictTopic ||
    detectStrictTopicFromMessage(m) ||
    concept?.strictTopic ||
    null;

  let answerLane = 'companion';
  if (routePlan.lane === 'strict_doctrine') answerLane = 'strict_doctrine';
  else if (routePlan.lane === 'bible_wide') answerLane = 'bible_wide';
  else if (routePlan.immediateCompanionReply) answerLane = 'companion_release';
  else if (isPendingQuestionChallenge(m)) answerLane = 'pending_resolver';
  else if (routePlan.lane !== 'companion' && concept && !strictTopic) answerLane = 'bible_wide';
  else if (strictTopic && routePlan.lane === 'strict_doctrine') answerLane = 'strict_doctrine';

  if (protectedHumanConversation) {
    concept = null;
  }

  // Explicit references stay reference-owned and cannot inherit or
  // manufacture a semantic doctrine concept.
  if (explicitScriptureReference) {
    concept = null;
    answerLane = 'bible_wide';
  }

  if (/\blogos\b/i.test(m) && /\bjohn\s*1\b/i.test(m) && concept?.id === 'ten_commandments') {
    concept = null;
  }

  const witnesses = concept ? getGraphWitnesses(concept.id) : { direct: [], supporting: [], all: [] };
  const directAnswer = concept?.directAnswer || null;
  const isContinuation =
    routePlan.intent === 'bible_concept_continuation' ||
    routePlan.useActiveBibleConcept ||
    (CONTINUATION_PHRASE_RE.test(m) && (concept || context.activeBibleConcept));

  const unknownPhrase =
    !concept &&
    !strictTopic &&
    !routePlan.immediateCompanionReply &&
    (UNKNOWN_BIBLE_RE.test(m) || /\b(zephyrian|scriture)\b/i.test(m)) &&
    m.length > 12;

  if (unknownPhrase && answerLane === 'companion') {
    answerLane = 'clarification';
  }

  return {
    intent: routePlan.intent,
    humanNeed: routePlan.humanNeed || null,
    concept: protectedHumanConversation ? null : (concept?.id || routePlan.bibleConceptId || context.activeBibleConcept || null),
    conceptNode: concept,
    answerLane,
    strictTopic,
    directAnswer,
    requiredWitnessCount: Math.min(3, witnesses.direct.length || 2),
    witnessPlan: {
      direct: witnesses.direct.slice(0, 3),
      supporting: witnesses.supporting.slice(0, 3),
      isContinuation,
      explicitTopic: hasExplicitConcept(m),
    },
    needsStrictValidation: answerLane === 'strict_doctrine',
    needsCompanionTone:
      answerLane === 'companion' ||
      answerLane === 'companion_release' ||
      routePlan.intent === 'emotional_support',
    pendingQuestionResolved: isPendingQuestionChallenge(m),
    polarity: concept?.polarity || null,
    routePlan,
    riskFlags: {
      unknownPhrase,
      validatorLeakRisk: false,
      doctrineDriftRisk: answerLane === 'companion' && strictTopic,
    },
    userPreferences: prefs,
    context,
  };
}

function buildLineUponLineExplanation(concept, witnesses = []) {
  const node = typeof concept === 'string' ? detectConceptFromGraph(concept) : concept;
  if (!node) return '';
  const refs = witnesses.length ? witnesses : getGraphWitnesses(node.id).direct.slice(0, 3);
  const witnessText = refs.join(', ');
  return `${node.directAnswer || ''} Scripture witnesses: ${witnessText}.`;
}

module.exports = {
  buildReasoningPlan,
  buildLineUponLineExplanation,
  UNKNOWN_BIBLE_RE,
};
