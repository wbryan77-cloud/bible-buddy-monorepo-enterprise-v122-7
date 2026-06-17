/**
 * Phase 5F — Scripture reasoning plan before answering (2-3 steps ahead).
 */

const { getGraphNode, getGraphWitnesses } = require('./bibleConceptGraph');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');
const { validateConceptMatch } = require('./bncSafetyValidator');
const { selectMinimumWitnesses } = require('./twoWitnessStandard');

const FOLLOW_UP_HINTS = [
  'Would you like more Scriptures on this?',
  'Do you want practical steps from Scripture?',
  'Do you want the Genesis-to-Revelation chain on this topic?',
];

const NEXT_NEEDS_BY_CONCEPT = {
  dietary_pork_unclean: [
    'Acts 10 objection',
    'family disagreement',
    'how to explain it',
    'prayer for courage',
    'verse to remember',
  ],
  fornication_sexual_sin: [
    'what to say',
    'fear of losing her',
    'how to leave situation',
    'prayer for strength',
    'self-control Scriptures',
  ],
  sexual_boundaries_dating: [
    'boundary script',
    'fear of rejection',
    'prayer for self-control',
    'how to leave situation',
  ],
  kingdom_on_earth: ['more kingdom Scriptures', 'how kingdom relates to New Jerusalem'],
  sabbath_seventh_day: ['how to keep Sabbath', 'practical Sabbath steps'],
  overwhelmed_comfort: ['tell me what happened', 'pray with me', 'give me a verse', 'practical step tonight'],
};

function buildScriptureReasoningPlan({
  userQuestion = '',
  conceptId = null,
  strictTopic = null,
  conceptNode = null,
} = {}) {
  const node = conceptNode || (conceptId ? getGraphNode(conceptId) : null);
  const contract = strictTopic ? BASE_CONTRACTS[strictTopic] : null;
  const graphWitnesses = conceptId ? getGraphWitnesses(conceptId) : { direct: [], supporting: [], all: [] };

  const primaryWitnesses = contract?.approvedWitnesses?.length
    ? contract.approvedWitnesses.slice(0, 3)
    : (graphWitnesses.direct || []).slice(0, 3);

  const supportingWitnesses = contract?.supportingWitnesses?.length
    ? contract.supportingWitnesses.slice(0, 3)
    : (graphWitnesses.supporting || []).slice(0, 3);

  const forbiddenConfusions = node?.forbiddenConfusions || [];
  const directAnswerNeeded = !!(node?.directAnswer || contract?.requiredConclusion);
  const polarity = node?.polarity || null;

  const validation = validateConceptMatch({
    message: userQuestion,
    concept: node || { id: conceptId, strictTopic },
    witnesses: primaryWitnesses,
    strictTopic,
  });

  const minWitnesses = Math.min(2, primaryWitnesses.length + supportingWitnesses.length);
  const safeToAnswer =
    validation.ok && (primaryWitnesses.length >= minWitnesses || primaryWitnesses.length > 0);

  const answerBoundaries = [
    'Answer only from listed Scripture witnesses.',
    'No parable as primary doctrine proof.',
    'No speculation beyond witnesses.',
  ];
  if (forbiddenConfusions.length) {
    answerBoundaries.push(`Do not confuse with: ${forbiddenConfusions.join(', ')}.`);
  }

  const nextLikelyQuestions = [];
  const conceptKey = conceptId || node?.id;
  const nextLikelyUserNeeds = NEXT_NEEDS_BY_CONCEPT[conceptKey] || [];
  if (primaryWitnesses.length >= 2) nextLikelyQuestions.push(FOLLOW_UP_HINTS[0]);
  if (node?.id === 'fornication_sexual_sin' || node?.id === 'sexual_boundaries_dating') {
    nextLikelyQuestions.push('User may ask about practical boundaries.');
  }
  if (node?.id === 'kingdom_on_earth') {
    nextLikelyQuestions.push('User may ask for more kingdom-on-earth Scriptures.');
  }

  const practicalNextStep = nextLikelyUserNeeds[0] || null;
  const companionFollowUp =
    node?.id === 'dietary_pork_unclean'
      ? 'If family disagrees, I can help you think through what to say.'
      : nextLikelyUserNeeds.includes('pray with me')
        ? 'Would you like me to pray with you about this?'
        : practicalNextStep
          ? `If helpful: ${practicalNextStep}.`
          : null;
  const prayerSuggested = (nextLikelyUserNeeds || []).some((n) => /pray/i.test(n));
  const moreScriptureAvailable = primaryWitnesses.length >= 2;

  return {
    userQuestion: String(userQuestion).slice(0, 300),
    conceptId: conceptKey || null,
    strictTopic: strictTopic || node?.strictTopic || null,
    directAnswerNeeded,
    polarity,
    primaryWitnesses,
    supportingWitnesses,
    forbiddenConfusions,
    answerBoundaries,
    nextLikelyQuestions: nextLikelyQuestions.slice(0, 2),
    nextLikelyUserNeeds: nextLikelyUserNeeds.slice(0, 4),
    nextLikelyNeeds: nextLikelyUserNeeds.slice(0, 4),
    practicalNextStep,
    companionFollowUp,
    prayerSuggested,
    moreScriptureAvailable,
    safeToAnswer,
    validation,
    gentleFollowUp: companionFollowUp || nextLikelyQuestions[0] || null,
    isNewTopic: true,
    isContinuation: false,
  };
}

const FORBIDDEN_OUTPUTS_DEFAULT = [
  'unrelated verse padding',
  'parable as primary doctrine proof',
  'sexual mechanics advice',
  'interpretations vary on approved doctrine',
  'primarily on approved doctrine',
  'false memory claims',
];

function buildScriptureAnchoredResponsePlan({
  message = '',
  concept = null,
  relationshipContext = {},
  memorySnapshot = {},
  companionIntent = {},
} = {}) {
  const conceptId = concept?.id || concept || relationshipContext.priorTopic || companionIntent.conceptId;
  const node = concept?.id ? concept : conceptId ? getGraphNode(conceptId) : null;
  const basePlan = buildScriptureReasoningPlan({
    userQuestion: message,
    conceptId,
    conceptNode: node,
    strictTopic: node?.strictTopic,
  });

  const multi = relationshipContext.multiIntent || {};
  let answerType = 'doctrine_companion';
  let practicalGuidanceNeeded = false;
  let practicalScriptNeeded = false;
  let prayerNeeded = false;
  let companionOpening = '';

  if (multi.multiIntent && multi.prayer && multi.verse) {
    answerType = 'multi_prayer_verse';
    prayerNeeded = true;
    practicalGuidanceNeeded = true;
  } else if (companionIntent.practicalType === 'nervous_family') {
    answerType = 'emotional_support';
    companionOpening = relationshipContext.familyConversationContext
      ? 'I remember you were working through how to talk with your family about Scripture.'
      : "I hear that you're nervous.";
  } else if (companionIntent.category === 'prayer_request') {
    answerType = 'prayer';
    prayerNeeded = true;
  } else if (companionIntent.category === 'boundary_script' || relationshipContext.userGoal === 'set_boundary') {
    answerType = 'boundary';
    practicalScriptNeeded = true;
    companionOpening = 'I hear the pressure in that.';
  } else if (
    companionIntent.category === 'family_explanation' ||
    relationshipContext.userGoal === 'explain_to_family' ||
    relationshipContext.userGoal === 'handle_family_disagreement'
  ) {
    answerType = 'practical_guidance';
    practicalGuidanceNeeded = true;
    practicalScriptNeeded = true;
    companionOpening = "I hear you — you're not just asking for verses, you're asking how to say it without sounding harsh.";
  } else if (companionIntent.category === 'verse_to_remember' || relationshipContext.userGoal === 'verse_to_remember') {
    answerType = 'practical_guidance';
    practicalGuidanceNeeded = true;
  } else if (companionIntent.category === 'emotional_support' || relationshipContext.userGoal === 'emotional_support') {
    answerType = 'emotional_support';
    companionOpening = relationshipContext.emotionalState === 'overwhelmed'
      ? 'I hear that you feel overwhelmed.'
      : 'I hear you.';
  } else if (companionIntent.practicalType === 'why_followup') {
    answerType = 'doctrine_companion';
    basePlan.isContinuation = true;
    basePlan.isNewTopic = false;
  } else if (companionIntent.category === 'memory_preference') {
    answerType = 'memory';
  }

  const isNewTopic = !relationshipContext.priorTopic && companionIntent.isNewDoctrine;
  const isContinuation = !!relationshipContext.priorTopic || companionIntent.isContinuation;
  const witnessSpec = selectMinimumWitnesses(null, {
    isNewTopic: isNewTopic && answerType === 'doctrine_companion',
    isContinuation,
    isEmotionalSupport: answerType === 'emotional_support',
    isPrayer: prayerNeeded,
    isPracticalGuidance: practicalGuidanceNeeded || practicalScriptNeeded,
  });

  const witnesses = [
    ...basePlan.primaryWitnesses,
    ...basePlan.supportingWitnesses,
  ].slice(0, witnessSpec.preferred);

  let oneFollowUpQuestion = null;
  if (answerType === 'emotional_support') {
    oneFollowUpQuestion = 'What is weighing on you most right now?';
  } else if (answerType === 'practical_guidance' && relationshipContext.familyConversationContext) {
    oneFollowUpQuestion = 'Would you like me to pray with you before you talk with them?';
  } else if (basePlan.gentleFollowUp && !practicalScriptNeeded) {
    oneFollowUpQuestion = basePlan.gentleFollowUp.replace(/^If helpful:\s*/i, '');
  }

  return {
    answerType,
    directAnswer: node?.directAnswer || null,
    witnessesRequired: witnessSpec.minimum,
    witnesses,
    companionOpening,
    practicalGuidanceNeeded,
    practicalScriptNeeded,
    prayerNeeded,
    oneFollowUpQuestion,
    nextLikelyNeeds: basePlan.nextLikelyNeeds || [],
    nextLikelyNeedPrediction: predictNextLikelyNeeds({
      conceptId,
      anchor: relationshipContext,
      humanNeed: companionIntent.category,
    }),
    forbiddenOutputs: FORBIDDEN_OUTPUTS_DEFAULT,
    conceptId,
    conceptNode: node,
    polarity: node?.polarity || basePlan.polarity,
    isNewTopic,
    isContinuation,
    isEmotionalSupport: answerType === 'emotional_support',
    isPrayer: prayerNeeded,
    isPracticalGuidance: practicalGuidanceNeeded || practicalScriptNeeded,
    memorySnapshot,
    relationshipContext,
    companionIntent,
    basePlan,
  };
}

function predictNextLikelyNeeds({ conceptId = null, anchor = {}, humanNeed = '' } = {}) {
  const id = conceptId || anchor.priorTopic || anchor.currentDoctrineConcept || '';
  const needs = [];

  if (/dietary|pork/i.test(id)) {
    needs.push('Acts 10 objection', 'family disagreement', 'how to explain it', 'prayer for courage', 'verse to remember');
  } else if (/fornication|sexual/i.test(id)) {
    needs.push('boundary script', 'fear of rejection', 'self-control Scripture', 'exit plan');
  } else if (humanNeed === 'emotional_support' || anchor.currentEmotion === 'overwhelmed') {
    needs.push('listen first', 'prayer', 'one comfort verse', 'practical next step');
  } else if (anchor.currentRelationshipContext === 'family') {
    needs.push('how to explain it', 'prayer for courage', 'verse to remember');
  }

  return needs.slice(0, 4);
}

module.exports = {
  buildScriptureReasoningPlan,
  buildScriptureAnchoredResponsePlan,
  predictNextLikelyNeeds,
  FOLLOW_UP_HINTS,
  NEXT_NEEDS_BY_CONCEPT,
};
