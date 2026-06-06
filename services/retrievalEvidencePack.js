/**
 * Reason-first retrieval layer — facts only, no user-facing prose.
 * RACL: thread-local memory first, correction ledger, companion scripture stubs.
 */

const { BIBLE_TOPIC_CATALOG } = require('./bibleTopicCatalog');
const { getScriptureChain } = require('./scriptureChainExpansion');
const {
  detectTopicFromMessage,
  detectTopicFromSessions,
  getBoundariesForTopic,
  FORBIDDEN_TEACHINGS,
} = require('./doctrineBoundaries');
const { HISTORICAL_CHAIN, detectQuestionFocus } = require('./sabbathHistoryDeepResponder');
const { detectSourceTopic } = require('./sourceGroundedResponder');
const { detectRegistryStudyTopic } = require('./registryStudyPresenter');
const { findLastStudiedReference, findNextInRegistryChain } = require('./continueStudyEngine');
const { getRecentStudySessions } = require('./continuityStudySessionRuntime');
const { buildReasoningSnapshot } = require('./reasoningSnapshot');
const { buildDoctrineEvidenceSnippets } = require('./doctrineEvidenceSnippets');
const { buildAnswerGuidance, isNewQuestionOverridesProfile } = require('./answerGuidance');
const { retrieveEvidenceCards, buildEvidenceCardPayload } = require('./evidenceCards');
const { discoverScriptureRelationships } = require('./scriptureDiscoveryEngine');
const { buildConcordanceComposerHints } = require('./concordanceFoundation');
const { resolveQuestionIntent, resolveFollowUpQuestion } = require('./questionIntentResolver');
const { getActiveConversation } = require('./activeConversationManager');
const {
  collectRelationshipMemoryHits,
  classifyRelationshipRecallQuery,
} = require('./relationshipRecallEngine');
const { classifyHealthCompanion } = require('./healthCompanionResponse');
const { classifyEmotionalSupport } = require('./griefCompanionResponse');
const { classifyPrayerIntent } = require('./prayerCompanionResponse');
const { classifyDiscernment } = require('./companionDiscernmentResponder');
const { classifyContinueStudyIntent } = require('./continueStudyIntent');
const {
  buildCorrectionLedger,
  isMetaOrWordingTurn,
  lastCorrectionPhrase,
} = require('./correctionLedger');
const {
  classifyCurrentMessageIntent,
  buildIntentEvidenceConstraints,
  buildIntentComposerGuidance,
} = require('./currentMessageIntent');

const TOPIC_TO_CHAIN = {
  sabbath: 'sabbath',
  sabbath_history: 'sabbath',
  dietary_law: 'dietaryLaw',
  feast_days: 'feastDays',
  traditions: 'traditions',
  resurrection_timeline: 'resurrection',
};

const CATALOG_KEY_MAP = {
  sabbath: 'sabbath',
  dietary_law: 'dietaryLaw',
  dietaryLaw: 'dietaryLaw',
  feast_days: 'feastDaysHighSabbaths',
  traditions: 'traditionsOfMen',
  resurrection_timeline: 'resurrectionTimeline',
};

const NAMED_ENTITY_PATTERNS = [
  { key: 'mom', pattern: /\bmom\b|\bmother\b/i },
  { key: 'alzheimers', pattern: /\balzheimer/i },
  { key: 'job_opportunity', pattern: /\bjob opportunity\b|\bjob offer\b|\boffer\b/i },
  { key: 'knee_pain', pattern: /\bknee(s)?\b|\bknee pain\b/i },
  { key: 'friend', pattern: /\bfriend\b|\blost a friend\b/i },
  { key: 'sabbath', pattern: /\bsabbath\b|\bsunday worship\b/i },
  { key: 'roman_catholic_church', pattern: /\broman catholic church\b|\broman church\b/i },
];

const COMPANION_SCRIPTURE_STUBS = {
  caregiver: [
    { reference: 'Exodus 20:12', theme: 'Honor father and mother' },
    { reference: 'Proverbs 17:17', theme: 'Friend loves at all times' },
    { reference: 'Isaiah 46:4', theme: 'God carries into old age' },
  ],
  alzheimers: [
    { reference: 'Exodus 20:12', theme: 'Honor father and mother' },
    { reference: 'Proverbs 17:17', theme: 'Friend loves at all times' },
    { reference: 'Isaiah 46:4', theme: 'God carries into old age' },
  ],
  grief: [
    { reference: 'Psalm 34:18', theme: 'The LORD is near the brokenhearted' },
    { reference: 'John 11:35', theme: 'Jesus wept' },
    { reference: '1 Thessalonians 4:13', theme: 'Grieve with hope' },
  ],
  health: [
    { reference: 'James 5:14', theme: 'Prayer for the sick' },
    { reference: 'Proverbs 17:22', theme: 'A merry heart' },
    { reference: '1 Corinthians 6:19-20', theme: 'Body as temple' },
  ],
  discernment: [
    { reference: 'Proverbs 3:5-6', theme: 'Trust in the LORD' },
    { reference: 'James 1:5', theme: 'Ask God for wisdom' },
    { reference: 'Psalm 37:23', theme: 'Steps ordered by the LORD' },
  ],
  distant_from_god: [
    { reference: 'Psalm 139:7-10', theme: 'Where shall I flee from your presence' },
    { reference: 'James 4:8', theme: 'Draw near to God' },
    { reference: 'Psalm 51:10-12', theme: 'Renew a right spirit' },
  ],
};

function parseHistoricalFacts() {
  return {
    chainSteps: HISTORICAL_CHAIN.split('\n').filter((l) => /^[A-E]\./.test(l.trim())),
    sources: [
      'Constantine, Codex Justinianus 3.12.2 (AD 321 Sunday rest law)',
      'Council of Laodicea, Canon 29 (circa AD 364)',
      'Eusebius, Life of Constantine (early first-day imperial favor)',
      'Roman Catholic catechisms and liturgical tradition on Sunday obligation',
    ],
    distinction: 'Historical developments are not the same as biblical commands.',
    tier: 'historical_secondary',
  };
}

function buildConversationHistory(recentSessions = [], limit = 5) {
  return recentSessions.slice(-limit).map((s, i) => ({
    turn: i + 1,
    user: String(s.message || '').slice(0, 500),
    assistant: String(s.reply || s.structured?.reply || '').slice(0, 400),
  }));
}

function buildActiveConversationSummary(activeConversation) {
  if (!activeConversation) return null;
  return {
    topic: activeConversation.topic || null,
    subtopic: activeConversation.subtopic || null,
    questionType: activeConversation.questionType || null,
    lastDirectQuestion: activeConversation.lastDirectQuestion || null,
    lastAnswerSummary: activeConversation.answerSummary || activeConversation.lastAnswerSummary || null,
    correctionCount: activeConversation.correctionCount || 0,
    strictAnswerMode: !!activeConversation.strictAnswerMode,
    frustrationMode: !!activeConversation.frustrationMode,
    isActive: !!activeConversation.isActive,
  };
}

function extractNamedEntities(recentSessions = [], message = '') {
  const corpus = `${message} ${recentSessions.map((s) => `${s.message} ${s.reply || ''}`).join(' ')}`;
  const found = [];
  for (const { key, pattern } of NAMED_ENTITY_PATTERNS) {
    if (pattern.test(corpus)) found.push(key);
  }
  return found;
}

function inferLatestClarifiedIntent(message = '', recentSessions = [], understanding = {}) {
  if (isMetaOrWordingTurn(message, understanding)) {
    return String(message || understanding.exactUserQuestion || '').trim();
  }
  for (let i = recentSessions.length - 1; i >= 0; i -= 1) {
    const m = String(recentSessions[i]?.message || '').trim();
    if (m && /\?/.test(m)) return m;
  }
  return String(message || '').trim();
}

function buildThreadLocalMemory(recentSessions = [], message = '', understanding = {}) {
  const userMessages = recentSessions.map((s) => String(s.message || '')).filter(Boolean);
  const assistantReplies = recentSessions
    .map((s) => String(s.reply || s.structured?.reply || ''))
    .filter(Boolean);

  const lastUserMessages = [...userMessages, String(message || '')].filter(Boolean).slice(-6);
  const lastAssistantReplies = assistantReplies.slice(-3);

  const unresolvedQuestion =
    understanding.exactUserQuestion ||
    lastUserMessages.filter((m) => /\?/.test(m)).slice(-1)[0] ||
    message;

  const snippets = [];
  for (let i = Math.max(0, recentSessions.length - 4); i < recentSessions.length; i += 1) {
    const s = recentSessions[i];
    if (s?.message) snippets.push(`User: ${String(s.message).slice(0, 200)}`);
    if (s?.reply) snippets.push(`Assistant summary: ${String(s.reply).slice(0, 160)}`);
  }
  if (message) snippets.push(`Current: ${String(message).slice(0, 200)}`);

  return {
    lastUserMessages,
    lastAssistantReplies,
    currentUnresolvedQuestion: unresolvedQuestion,
    lastCorrectionPhrase: lastCorrectionPhrase(recentSessions, message),
    latestClarifiedIntent: inferLatestClarifiedIntent(message, recentSessions, understanding),
    namedEntities: extractNamedEntities(recentSessions, message),
    snippets: snippets.filter(Boolean).slice(-8),
    hitCount: snippets.filter(Boolean).length,
  };
}

function detectCompanionTopic(message = '', recentSessions = [], companionContext = {}) {
  const corpus = `${message} ${recentSessions.map((s) => s.message).join(' ')}`.toLowerCase();
  if (/\balzheimer|\bmom\b|\bmother\b|\bcaregiv/i.test(corpus)) return 'caregiver';
  if (companionContext.grief || /\bgrief|\blost a friend|\bbothering me\b/i.test(corpus)) return 'grief';
  if (companionContext.health || /\bknee|\bhurt|\bpain\b/i.test(corpus)) return 'health';
  if (companionContext.discernment || /\bjob opportunity|\boffer\b|\bpush or wait\b/i.test(corpus)) return 'discernment';
  if (/\bdistant from god|\bfaith is failing|\bpray but it feels empty\b/i.test(corpus)) return 'distant_from_god';
  return null;
}

function buildCompanionThreadContext(recentSessions = [], message = '', companionTopic = null) {
  if (!companionTopic) return null;

  const relevant = [...recentSessions].reverse().find((s) => String(s.message || '').trim());
  const lastMsg = relevant ? String(relevant.message) : String(message);

  const concernPatterns = [
    /\bnot remember who i am\b/i,
    /\bfar away from home\b/i,
    /\bpush or wait\b/i,
    /\bstill bothering me\b/i,
    /\bagain today\b/i,
    /\bfaith is failing\b/i,
    /\bfeels empty\b/i,
    /\bgrieving who she used to be\b/i,
  ];
  let directConcern = null;
  for (const p of concernPatterns) {
    const hit = `${message} ${recentSessions.map((s) => s.message).join(' ')}`.match(p);
    if (hit) {
      directConcern = hit[0];
      break;
    }
  }
  if (!directConcern) directConcern = String(message).slice(0, 120);

  const nextStepByTopic = {
    caregiver: 'emotional_support_and_prayer',
    grief: 'presence_and_comfort',
    health: 'practical_care_and_prayer',
    discernment: 'wise_discernment_and_peace',
    distant_from_god: 'honest_reflection_not_template',
  };

  return {
    companionTopic,
    lastRelevantUserMessage: lastMsg,
    directConcernPhrase: directConcern,
    practicalNextStepCategory: nextStepByTopic[companionTopic] || 'companion_support',
  };
}

function retrieveScriptureEvidence(topic, { companionTopic = null, suppressDoctrineChain = false } = {}) {
  if (suppressDoctrineChain && companionTopic) {
    const stubs = COMPANION_SCRIPTURE_STUBS[companionTopic] || [];
    return { topic: companionTopic, title: 'companion_support', references: stubs, source: 'companion_stub' };
  }

  const chainKey = TOPIC_TO_CHAIN[topic] || null;
  const expansionChain = chainKey ? getScriptureChain(chainKey) : [];
  const catalogKey = CATALOG_KEY_MAP[topic] || null;
  const catalog = catalogKey ? BIBLE_TOPIC_CATALOG[catalogKey] : null;

  const refs = [];
  const seen = new Set();
  for (const item of [...expansionChain, ...(catalog?.scriptureChain || [])]) {
    const ref = typeof item === 'string' ? item : item.reference || item;
    if (ref && !seen.has(ref)) {
      seen.add(ref);
      refs.push({ reference: ref, theme: catalog?.title || topic || 'scripture' });
    }
  }

  if (refs.length === 0 && companionTopic) {
    const stubs = COMPANION_SCRIPTURE_STUBS[companionTopic] || [];
    return { topic: companionTopic, title: 'companion_support', references: stubs, source: 'companion_stub' };
  }

  return { topic, title: catalog?.title || null, references: refs.slice(0, 12), source: refs.length ? 'doctrine_chain' : null };
}

function retrieveMemoryEvidence({
  userId,
  message,
  runtimeContext,
  profile,
  understanding,
  threadLocal,
}) {
  const out = { snippets: [], hits: [], recallRequested: false, threadFirst: true };

  if (threadLocal?.snippets?.length) {
    out.snippets.push(...threadLocal.snippets);
  }

  if (profile?.memoryEnabled === false) {
    out.snippets = out.snippets.filter(Boolean).slice(0, 8);
    return out;
  }

  const recall = classifyRelationshipRecallQuery(message);
  if (recall.isRecallQuery || understanding.shouldUseMemory) {
    out.recallRequested = true;
    const globalHits = collectRelationshipMemoryHits({ userId, recallType: recall.recallType || 'relationship_status' })
      .slice(0, 6)
      .map((h) => ({
        category: h.category,
        summary: h.summary || h.detail || h.label,
        when: h.when || h.timestamp || null,
      }));
    if (globalHits.length) out.hits = globalHits;
  }

  if (runtimeContext?.memory && out.snippets.length < 4) {
    for (const s of (runtimeContext.memory.recentSummaries || runtimeContext.memory.summaries || []).slice(-2)) {
      out.snippets.push(typeof s === 'string' ? s : s.summary || s.text || '');
    }
  }

  out.snippets = out.snippets.filter(Boolean).slice(0, 8);
  return out;
}

function retrieveCompanionContextTags(message, recentSessions = []) {
  const corpus = `${message} ${recentSessions.map((s) => s.message).join(' ')}`;
  return {
    health: classifyHealthCompanion(corpus).isHealthSupport,
    grief: classifyEmotionalSupport(corpus).isEmotionalSupport,
    prayer: classifyPrayerIntent(corpus).isPrayerRequest,
    discernment: classifyDiscernment(corpus).isDiscernment,
    continueStudy: classifyContinueStudyIntent(corpus).isContinueStudy,
  };
}

function retrieveStudyState({ userId, message, topic, recentSessions = [] }) {
  const registryKey = detectRegistryStudyTopic(message);
  const studySessions = getRecentStudySessions(userId, 25);
  const lastRef = findLastStudiedReference(studySessions, topic || registryKey);
  const nextStep = lastRef && registryKey ? findNextInRegistryChain(lastRef, registryKey) : null;
  return {
    registryKey: registryKey || null,
    lastStudiedReference: lastRef || null,
    nextReference: nextStep?.nextRef || null,
    catalogTitle: registryKey && BIBLE_TOPIC_CATALOG[registryKey] ? BIBLE_TOPIC_CATALOG[registryKey].title : null,
  };
}

function shouldSuppressDoctrineRetrieval(understanding = {}, correctionLedger = {}) {
  return (
    correctionLedger.active ||
    correctionLedger.correctionCount >= 1 ||
    understanding.isCorrection ||
    understanding.isMetaQuestion ||
    understanding.requestedAnswerType === 'wording_explanation' ||
    understanding.strictAnswerMode
  );
}

function isPracticalSabbathHowQuestion(message = '') {
  const text = String(message || '');
  return (
    /\bhow (do|can|should) (we|i)\b/i.test(text) &&
    /\b(keep|honor|observe|sanctify)\b/i.test(text) &&
    /\bsabbath\b/i.test(text)
  );
}

function isExplicitHistoricalQuestion(message = '') {
  const text = String(message || '');
  return (
    /\bconstantine\b/i.test(text) ||
    /\blaodicea\b/i.test(text) ||
    /\bwho changed\b/i.test(text) ||
    /\bwhy (do|does|did).*\b(sunday|sabbath)\b/i.test(text) ||
    /\bhistorical evidence\b/i.test(text) ||
    /\bhow did this change\b/i.test(text) ||
    /\broman catholic\b/i.test(text) ||
    /\bsaturday to sunday\b/i.test(text)
  );
}

/**
 * Build structured evidence pack for the OpenAI composer.
 */
function buildRetrievalEvidencePack({
  userId = 'anonymous',
  message = '',
  mode = 'COMPANION',
  recentSessions = [],
  runtimeContext = {},
  profile = {},
  safety = {},
  routingHintsOnly = false,
} = {}) {
  const activeConversationRaw = getActiveConversation(userId);
  const activeConversationForRouting = routingHintsOnly ? null : activeConversationRaw;

  const questionIntent = resolveQuestionIntent({
    message,
    recentSessions,
    activeConversation: activeConversationForRouting,
  });
  const followUp = routingHintsOnly
    ? {
        isFollowUp: false,
        correction: false,
        inheritedTopic: null,
        questionType: null,
        reason: 'routing_hints_only',
      }
    : resolveFollowUpQuestion({ message, activeConversation: activeConversationForRouting });

  const understanding = buildReasoningSnapshot({
    message,
    activeConversation: activeConversationForRouting,
    recentSessions,
    questionIntent,
    followUp,
    safety,
  });

  const correctionLedger = buildCorrectionLedger({ message, recentSessions, understanding });
  const currentIntentResult = classifyCurrentMessageIntent(message, {
    correctionLedger,
    understanding,
    recentSessions,
  });
  const intentConstraints = buildIntentEvidenceConstraints(currentIntentResult.intent);
  const threadLocal = buildThreadLocalMemory(recentSessions, message, understanding);
  const companionContext = retrieveCompanionContextTags(message, recentSessions);
  const companionTopic = detectCompanionTopic(message, recentSessions, companionContext);
  const companionThreadContext = buildCompanionThreadContext(recentSessions, message, companionTopic);

  const messageTopic = detectSourceTopic(message) || detectTopicFromMessage(message) || null;
  const topic =
    routingHintsOnly || intentConstraints.topicFromMessageOnly
      ? messageTopic
      : messageTopic ||
        understanding.activeTopic ||
        (!intentConstraints.suppressPriorTopic ? detectTopicFromSessions(recentSessions) : null) ||
        null;

  const suppressDoctrine = shouldSuppressDoctrineRetrieval(understanding, correctionLedger);
  const practicalSabbathHow = isPracticalSabbathHowQuestion(message);
  const explicitHistorical = isExplicitHistoricalQuestion(message);

  const includeHistory =
    intentConstraints.historyAllowed &&
    !practicalSabbathHow &&
    explicitHistorical &&
    !suppressDoctrine &&
    understanding.shouldUseHistory &&
    understanding.shouldUseHistory !== 'minimal' &&
    understanding.requestedAnswerType !== 'wording_explanation';

  const boundaries = getBoundariesForTopic(topic || '');
  const forbiddenTeachings = FORBIDDEN_TEACHINGS.map((t) => t.boundary);

  const memory = retrieveMemoryEvidence({
    userId,
    message,
    runtimeContext,
    profile,
    understanding,
    threadLocal,
  });

  const scripture = retrieveScriptureEvidence(topic, {
    companionTopic,
    suppressDoctrineChain: suppressDoctrine && !companionTopic,
  });

  const doctrineSnippets = buildDoctrineEvidenceSnippets(topic, message);
  const evidenceCards = retrieveEvidenceCards({ topic, message });
  const reinforcement = discoverScriptureRelationships(evidenceCards);
  const evidenceCardPayload = buildEvidenceCardPayload(evidenceCards, reinforcement);
  const concordanceHints = buildConcordanceComposerHints(evidenceCards);
  const answerGuidance = buildAnswerGuidance(message, {
    practicalSabbathHow,
    explicitHistorical,
    correctionLedger,
    understanding,
    topic,
    currentIntent: currentIntentResult.intent,
    historyAllowed: intentConstraints.historyAllowed,
  });

  const intentComposerGuidance = buildIntentComposerGuidance(currentIntentResult, message, {
    threadLocal,
    correctionLedger,
  });

  return {
    userMessage: message,
    mode,
    conversationHistory: buildConversationHistory(recentSessions),
    activeConversation: buildActiveConversationSummary(activeConversationRaw),
    routingHintsOnly: !!routingHintsOnly,
    threadLocal,
    correctionLedger,
    companionThreadContext,
    understanding: {
      exactUserQuestion: understanding.exactUserQuestion,
      plainEnglishRestatement: understanding.plainEnglishRestatement,
      questionType: understanding.questionType,
      requestedAnswerType: understanding.requestedAnswerType,
      forbiddenDistractions: understanding.forbiddenDistractions,
      strictAnswerMode: understanding.strictAnswerMode,
      isMetaQuestion: understanding.isMetaQuestion,
      isCorrection: understanding.isCorrection,
    },
    topic,
    memory,
    scripture,
    history: includeHistory
      ? { included: true, focus: detectQuestionFocus(message), ...parseHistoricalFacts() }
      : {
          included: false,
          reason: suppressDoctrine
            ? 'correction_or_wording_turn'
            : understanding.requestedAnswerType === 'wording_explanation'
              ? 'wording_question'
              : 'not_historical',
        },
    studyState:
      intentConstraints.suppressStudyState || isNewQuestionOverridesProfile(message)
        ? { suppressed: true, reason: 'current_intent_overrides_study_state' }
        : retrieveStudyState({ userId, message, topic, recentSessions }),
    companionContext,
    doctrine: {
      boundaries,
      forbiddenTeachings,
      snippets: doctrineSnippets,
      evidenceCards: evidenceCardPayload,
      concordanceHints,
    },
    evidenceCards: evidenceCardPayload,
    discoveryReinforcement: reinforcement,
    answerGuidance,
    currentIntent: currentIntentResult.intent,
    currentIntentReason: currentIntentResult.reason,
    intentConstraints,
    intentComposerGuidance,
    historyAllowed: intentConstraints.historyAllowed,
    questionIntent,
    followUp,
    activeConversationRaw: activeConversationRaw,
    practicalSabbathHow,
    explicitHistorical,
  };
}

module.exports = {
  buildRetrievalEvidencePack,
  buildConversationHistory,
  buildActiveConversationSummary,
  buildThreadLocalMemory,
  retrieveScriptureEvidence,
  retrieveMemoryEvidence,
  parseHistoricalFacts,
  COMPANION_SCRIPTURE_STUBS,
};
