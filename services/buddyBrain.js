const fs = require('fs');
const path = require('path');
const openai = require('./openaiClient');
const {
  buildRuntimeContext,
  buildRuntimeInstructions,
  scoreCompanionQuality,
} = require('./runtimeOrchestrator');
const { runDoctrineRuntimePipeline } = require('./doctrineRuntimePipeline');
const { orchestrateBuddyRuntime } = require('./retrievalFirstBuddyOrchestrator');
const { presentCompanionDoctrine } = require('./companionDoctrinePresenter');
const { saveConversationState, buildConversationStateContext } = require('./runtimeConversationStateEngine');
const { saveContinuityMemory } = require('./continuityMemoryRuntime');
const { savePrayerContinuity, buildPrayerContinuityContext } = require('./runtimePrayerContinuityEngine');
const { getStudyContext, saveStudyContext } = require('./studyContinuityRuntime');
const { recordCompanionLearning, buildLearningContext } = require('./companionLearningLayer');
const {
  buildMemoryReadContext,
  readMemorySummaries,
} = require('./memoryRecallEngine');
const { suppressFallbackLoops } = require('./fallbackLoopSuppressor');
const { hasGenericLoop, suppressLoopLanguage } = require('./runtimeLoopGuard');
const { classifyContinueStudyIntent, buildContinueStudyResponse } = require('./continueStudyIntent');
const { persistRelationshipMemoryFromInteraction } = require('./relationshipMemoryBridge');
const { classifyEmotionalSupport, buildEmotionalSupportResponse } = require('./griefCompanionResponse');
const { detectRegistryStudyTopic, presentRegistryStudyResponse } = require('./registryStudyPresenter');
const { buildPersonalizedFallback } = require('./personalizedFallback');
const { buildCompanionNextSteps } = require('./companionNextSteps');
const {
  classifyRelationshipRecallQuery,
  searchRelationshipRecall,
} = require('./relationshipRecallEngine');
const { savePersonalityContinuity } = require('./runtimePersonalityContinuity');
const { appendPrayerFollowUp } = require('./prayerContinuityFollowup');
const {
  persistCompanionRelationshipState,
  buildCompanionRelationshipContext,
  enrichResponseWithRelationshipIntelligence,
} = require('./companionRelationshipOrchestrator');
const { classifyHealthCompanion, buildHealthSupportResponse } = require('./healthCompanionResponse');
const { classifyPrayerIntent, buildPrayerCompanionResponse } = require('./prayerCompanionResponse');
const {
  classifyStudyConnectionQuery,
  buildStudyConnectionResponse,
} = require('./studyConnectionIntent');
const { polishCompanionReply } = require('./companionReplyPolish');
const { resolveSabbathCompanionIntent } = require('./sabbathIntentRouter');
const { buildSabbathHistoryResponse } = require('./sabbathHistoryCompanion');
const { resolveQuestionIntent, resolveFollowUpQuestion } = require('./questionIntentResolver');
const { detectTopicFromMessage } = require('./doctrineBoundaries');
const {
  getActiveConversation,
  updateActiveConversation,
} = require('./activeConversationManager');
const { containsInternalRuntimeLabels } = require('./runtimeLabelStripper');
const { isStudyFallbackDisabled } = require('./ownershipAntiOverrideGuard');
const { getDoctrineConversationState } = require('./doctrineConversationState');
const { buildConversationAnchor } = require('./conversationAnchorEngine');
const { detectHumanNeed } = require('./humanNeedDetector');
const { finalizeLiveResponse } = require('./liveResponseOwner');
const { buildRouteOwnershipTrace, logRouteOwnership } = require('./liveRequestTrace');

let getSnapshot = () => ({ modules: [], phases: [], competitors: [], avatars: [] });
let getRecentInsightsForUser = () => [];
let recordCompanionEvent = () => ({ ok: true, skipped: true });

try {
  ({ getSnapshot } = require('./projectBrain'));
} catch (error) {
  console.warn('Project brain unavailable:', error.message);
}

try {
  ({ getRecentInsightsForUser } = require('./contentInsight'));
} catch (error) {
  console.warn('Content insights unavailable:', error.message);
}

try {
  ({ recordCompanionEvent } = require('./companionIntelligence'));
} catch (error) {
  console.warn('Companion intelligence unavailable:', error.message);
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'buddy-sessions.jsonl');
const MEMORY_FILE = path.join(DATA_DIR, 'buddy-memory.json');
const QA_FILE = path.join(DATA_DIR, 'buddy-quality-events.jsonl');
const RECENT_SESSION_CACHE = new Map();
const MAX_SESSION_TURNS = Number(process.env.BIBLEBUDDY_MAX_SESSION_TURNS || 30);
const MAX_SESSION_CACHE_USERS = Number(process.env.BIBLEBUDDY_MAX_SESSION_CACHE_USERS || 200);

function trimRecentSessionCache() {
  if (RECENT_SESSION_CACHE.size <= MAX_SESSION_CACHE_USERS) {
    return { trimmed: 0, size: RECENT_SESSION_CACHE.size };
  }
  const keys = [...RECENT_SESSION_CACHE.keys()];
  let trimmed = 0;
  while (RECENT_SESSION_CACHE.size > MAX_SESSION_CACHE_USERS && keys.length) {
    RECENT_SESSION_CACHE.delete(keys.shift());
    trimmed += 1;
  }
  return { trimmed, size: RECENT_SESSION_CACHE.size };
}

function getRecentSessionCacheSize() {
  return RECENT_SESSION_CACHE.size;
}

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const DEFAULT_COMPANION_PROFILE = {
  scriptureDepth: 'balanced',
  tone: 'warm',
  reminderStyle: 'gentle',
  prefersPrayer: null,
  prefersReadingPlan: null,
  emotionalSupportMode: true,
  memoryEnabled: true,
};

function appendJsonl(file, entry) {
  try {
    const { appendJsonlSafe } = require('./safeJsonlWriter');
    appendJsonlSafe(file, { ...entry, createdAt: new Date().toISOString() });
  } catch (e) {
    console.warn(`Error writing ${path.basename(file)}:`, e.message);
  }
}

function appendSession(entry) {
  try {
    const { isInternalSystemMessage } = require('./doctrineErrorFirewall');
    if (isInternalSystemMessage(entry.message)) {
      entry.runtime = { ...(entry.runtime || {}), systemEchoFiltered: true };
      entry.message = '[continuation]';
    }
  } catch (_) {
    /* non-fatal */
  }
  appendJsonl(LOG_FILE, entry);
  const cached = RECENT_SESSION_CACHE.get(entry.userId) || [];
  cached.push({
    mode: entry.mode,
    message: String(entry.message || '').slice(0, 300),
    reply: String(entry.reply || '').slice(0, 400),
    safety: entry.safety,
    runtime: entry.structured?.runtime
      ? {
          masterRoute: entry.structured.runtime.masterRoute,
          openAiCalled: entry.structured.runtime.openAiCalled,
          doctrineTopic: entry.structured.runtime.doctrineTopic,
        }
      : entry.runtime
        ? { intent: entry.runtime.intent, emotion: entry.runtime.emotion }
        : undefined,
    quality: entry.quality ? { score: entry.quality.score } : undefined,
    createdAt: entry.createdAt || new Date().toISOString(),
  });
  RECENT_SESSION_CACHE.set(entry.userId, cached.slice(-MAX_SESSION_TURNS));
  trimRecentSessionCache();
}

function appendQualityEvent(entry) {
  appendJsonl(QA_FILE, entry);
}

function getRecentSessions(userId, limit = 8) {
  const cached = RECENT_SESSION_CACHE.get(userId);
  if (cached?.length) {
    return cached.slice(-limit);
  }

  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const stat = fs.statSync(LOG_FILE);
    const maxBytes = 512 * 1024;
    let text = '';
    if (stat.size > maxBytes) {
      const fd = fs.openSync(LOG_FILE, 'r');
      const buf = Buffer.alloc(maxBytes);
      fs.readSync(fd, buf, 0, maxBytes, stat.size - maxBytes);
      fs.closeSync(fd);
      text = buf.toString('utf8');
      const firstNl = text.indexOf('\n');
      if (firstNl >= 0) text = text.slice(firstNl + 1);
    } else {
      text = fs.readFileSync(LOG_FILE, 'utf8');
    }
    const lines = text.trim().split('\n').filter(Boolean).reverse();
    const out = [];
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.userId === userId) {
        out.push({
          mode: entry.mode,
          message: entry.message,
          reply: entry.reply,
          safety: entry.safety,
          runtime: {
            ...(entry.runtime || {}),
            ...(entry.structured?.runtime || {}),
          },
          quality: entry.quality,
          createdAt: entry.createdAt,
        });
        if (out.length >= limit) break;
      }
    }
    return out.reverse();
  } catch (_) {
    return [];
  }
}

function readMemoryStore() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return {};
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeMemoryStore(store) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Error writing buddy memory:', error.message);
  }
}

function getUserCompanionProfile(userId) {
  const store = readMemoryStore();
  return {
    ...DEFAULT_COMPANION_PROFILE,
    ...(store[userId]?.profile || {}),
  };
}

function updateUserMemory({ userId, message, structured, runtimeContext }) {
  const store = readMemoryStore();
  const current = store[userId] || { profile: {}, summaries: [], lastEmotion: null, lastTopics: [] };
  const summary = {
    at: new Date().toISOString(),
    emotion: runtimeContext?.emotion?.primary || 'general',
    intent: runtimeContext?.intent || 'companion',
    userSaid: String(message || '').slice(0, 500),
    buddyMode: structured?.mode || 'companion',
    qualityScore: structured?.quality?.score || null,
  };

  const summaries = Array.isArray(current.summaries) ? current.summaries : [];
  summaries.push(summary);

  store[userId] = {
    ...current,
    profile: {
      ...DEFAULT_COMPANION_PROFILE,
      ...(current.profile || {}),
      memoryEnabled: current.profile?.memoryEnabled !== false,
    },
    lastEmotion: summary.emotion,
    lastIntent: summary.intent,
    summaries: summaries.slice(-MAX_SESSION_TURNS),
    updatedAt: new Date().toISOString(),
  };

  writeMemoryStore(store);
}

function classifySafety(message = '') {
  const lower = String(message).toLowerCase();
  const crisisTerms = [
    'kill myself',
    'suicide',
    'end my life',
    'i want to die',
    'hurt myself',
    'self harm',
  ];
  const emotionalTerms = [
    'depressed',
    'alone',
    'lonely',
    'hopeless',
    'anxious',
    'overwhelmed',
    'stressed',
    'sad',
    'heartbroken',
    'hurt',
    'grieving',
    'mourning',
    'passed away',
    'my heart hurts',
    'need peace',
    'need strength',
    'need rest',
    'exhausted',
    'weary',
  ];

  const griefTerms = [
    'lost a friend',
    'lost my friend',
    'lost my mother',
    'lost my father',
    'lost my child',
    'lost my spouse',
    'funeral',
    'someone died',
  ];

  if (griefTerms.some((term) => lower.includes(term)) || /\blost my\b/.test(lower)) {
    return { level: 'emotional_support', reason: 'grief or loss language detected' };
  }

  if (/\bdied\b/.test(lower) && /\b(friend|mother|father|child|spouse|parent|loved one)\b/.test(lower)) {
    return { level: 'emotional_support', reason: 'loss language detected' };
  }

  if (crisisTerms.some((term) => lower.includes(term))) {
    return { level: 'crisis', reason: 'self-harm or crisis language detected' };
  }

  if (emotionalTerms.some((term) => lower.includes(term))) {
    return { level: 'emotional_support', reason: 'emotional distress language detected' };
  }

  return { level: 'standard', reason: 'no elevated safety pattern detected' };
}

function buildSystemPrompt({ mode, personaKey, profile, runtimeInstructions }) {
  return `
You are Bible Buddy, an adaptive spiritual companion.

Permanent North Star:
- Help the user feel heard before instructed.
- Meet the user where they are.
- Gently guide toward truth, peace, Scripture, prayer, and the God of the Bible over time.
- Bible-first foundation: line upon line, precept upon precept.
- Do not be pushy, robotic, shame-based, manipulative, or preachy.

Companion style:
- Warm, calm, natural, emotionally intelligent, and conversational.
- Respond to the specific user message, not a generic template.
- Reflect the user's actual situation in one sentence before advising.
- Give forward movement: practical next steps, prayer structure, study direction, or calming practice.
- Do not keep asking vague questions when the user needs guidance.
- If the user seems overwhelmed, comfort first and keep Scripture light unless they ask for more.
- If the user wants study, give deeper Scripture references and context.

Scripture rules:
- Use KJV references when citing Scripture.
- Do not invent Bible verses or quote exact verse text unless you are confident.
- Distinguish Scripture from your explanation.
- If unsure, say so.
- Do not claim divine authority or new revelation.

Safety rules:
- You are not a therapist, doctor, pastor, emergency service, or replacement for human care.
- For medical or mental health issues, support reflection and encourage qualified help where appropriate.
- If crisis/self-harm language appears, respond with immediate safety guidance and encourage contacting emergency services or 988 in the U.S.

Adaptive user profile:
- Scripture depth preference: ${profile.scriptureDepth}
- Tone preference: ${profile.tone}
- Reminder style: ${profile.reminderStyle}
- Emotional support mode: ${profile.emotionalSupportMode ? 'on' : 'off'}
- Memory enabled: ${profile.memoryEnabled ? 'yes' : 'no'}

Current mode: ${mode}
Current persona key: ${personaKey}

${runtimeInstructions || ''}

Return JSON only using this shape:
{
  "reply": "natural companion response",
  "scripture": [{ "reference": "Book chapter:verse", "text": "KJV text or empty if not quoted", "reason": "why this helps" }],
  "mode": "companion|prayer|study|reflection|wellness|crisis",
  "confidence": "low|medium|high",
  "memory_used": false,
  "suggested_settings_change": null,
  "orb_state": "idle|listening|thinking|speaking|praying|notification",
  "safety_level": "standard|emotional_support|crisis",
  "next_steps": ["short practical next step"],
  "admin_flags": []
}
`.trim();
}

const FALLBACK_LOOP_PHRASE = 'slow this down together';

function buildAlternateFallbackReply({ message, safety, recentSessions = [], userId, runtimeContext = {}, profile = {} }) {
  if (isStudyFallbackDisabled()) {
    return {
      reply:
        "I'm here with you. Tell me what you'd like help with, and I'll answer from Scripture as directly as I can.",
      scripture: [],
      mode: 'companion',
      confidence: 'low',
      memory_used: false,
      safety_level: safety.level,
      admin_flags: ['minimal_ownership_fallback'],
      runtime: { minimalOwnershipFallback: true },
    };
  }
  return buildPersonalizedFallback({
    userId,
    message,
    safety,
    recentSessions,
    runtimeContext,
    profile,
  });
}

function applyFallbackLoopGuard({ reply, runtimeContext, recentSessions, message, safety, userId }) {
  const structured = { ...reply };
  const loopRisk = runtimeContext?.loopRisk?.fallbackLoop;
  const genericLoop = hasGenericLoop(structured.reply);
  const suppression = suppressFallbackLoops(structured.reply);

  if (!loopRisk && !genericLoop && !suppression.suppressed && !containsInternalRuntimeLabels(structured.reply)) {
    return structured;
  }

  if (suppression.suppressed || loopRisk || genericLoop || containsInternalRuntimeLabels(structured.reply)) {
    if (isStudyFallbackDisabled()) {
      structured.reply = suppressLoopLanguage(structured.reply);
      structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'ownership_no_fallback_swap'])];
      return structured;
    }
    const alternate = buildAlternateFallbackReply({
      message,
      safety,
      recentSessions,
      userId: userId || runtimeContext?.userId,
      runtimeContext,
      profile: runtimeContext?.profile || {},
    });
    structured.reply = alternate.reply;
    structured.scripture = alternate.scripture;
    structured.mode = alternate.mode;
    structured.memory_used = alternate.memory_used;
    structured.next_steps = alternate.next_steps;
    structured.admin_flags = [...new Set([...(structured.admin_flags || []), ...(alternate.admin_flags || [])])];
    structured.runtime = {
      ...(structured.runtime || {}),
      fallbackLoopSuppressed: true,
      blockedPhrase: suppression.blocked || FALLBACK_LOOP_PHRASE,
    };
    return structured;
  }

  structured.reply = suppressLoopLanguage(structured.reply);
  return structured;
}

function persistBuddyMemory({
  userId,
  message,
  structured,
  runtimeContext,
  profile,
  doctrineTopic = null,
}) {
  if (profile?.memoryEnabled === false) return;

  saveConversationState({
    userId,
    mode: structured.mode || runtimeContext?.intent || 'companion',
    currentTopic: doctrineTopic || runtimeContext?.intent || '',
    unresolvedTopics: [],
    lastScriptures: (structured.scripture || []).map((item) => item.reference || item).filter(Boolean),
  });

  saveContinuityMemory({ userId, message, response: structured });

  if (runtimeContext?.intent === 'prayer' || /\b(pray|prayer)\b/i.test(message)) {
    savePrayerContinuity({
      userId,
      topic: runtimeContext?.intent === 'prayer' ? 'prayer' : 'general',
      prayerRequest: String(message || '').slice(0, 500),
      scriptures: (structured.scripture || []).map((item) => item.reference || item).filter(Boolean),
    });
  }

  const studyContext = getStudyContext({ userId, message });
  if (studyContext.enabled) {
    saveStudyContext({ userId, message, response: structured, context: studyContext });
  }

  recordCompanionLearning({
    userId,
    message,
    structured,
    runtimeContext,
    doctrineTopic,
  });

  persistRelationshipMemoryFromInteraction({
    userId,
    message,
    runtimeContext,
    doctrineTopic,
    structured,
  });

  savePersonalityContinuity({ userId, message });

  persistCompanionRelationshipState({
    userId,
    message,
    structured,
    runtimeContext,
    doctrineTopic,
  });
}

function enrichRuntimeContextWithMemory({ runtimeContext, userId, profile }) {
  if (profile?.memoryEnabled === false) {
    return runtimeContext;
  }

  const memoryRead = buildMemoryReadContext(userId);
  const learning = buildLearningContext(userId);

  const relationshipIntelligence = buildCompanionRelationshipContext(userId);

  return {
    ...runtimeContext,
    memory: {
      ...(runtimeContext.memory || {}),
      enabled: true,
      summaries: memoryRead.summaries,
      continuity: memoryRead.continuity,
      relationship: memoryRead.relationship,
      conversation: buildConversationStateContext(userId),
      prayer: buildPrayerContinuityContext(userId),
      studySessions: memoryRead.studySessions,
      learning,
      recentSummaries: readMemorySummaries(userId).slice(-5),
      relationshipIntelligence,
      openLoops: relationshipIntelligence.openLoops,
      emotionalArc: relationshipIntelligence.emotionalArc,
      studyJourney: relationshipIntelligence.studyJourney,
      timeline: relationshipIntelligence.timeline,
    },
  };
}

function buildMemoryRecallStructured({ userId, message, recall, runtimeContext, safety }) {
  const recallResult = searchRelationshipRecall({
    userId,
    message,
    recallType: recall.recallType,
    timeWindow: recall.timeWindow,
  });

  let reply = recallResult.reply;
  if (recall.recallType === 'relationship_status') {
    reply = appendPrayerFollowUp({ userId, reply, includeFollowUp: recallResult.memoryAvailable });
  }

  return {
    reply,
    scripture: [],
    mode: 'companion',
    confidence: recallResult.memoryAvailable ? 'medium' : 'low',
    memory_used: recallResult.memoryAvailable,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: safety.level,
    next_steps: recallResult.memoryAvailable
      ? ['Continue from a stored memory.', 'Pray through an active concern.', 'Turn to a related Scripture.']
      : ['Start a fresh Scripture study.', 'Share what is on your heart today.'],
    admin_flags: recallResult.memoryAvailable ? ['memory_recall', 'relationship_recall'] : ['memory_unavailable'],
    runtime: {
      emotion: runtimeContext.emotion,
      intent: 'memory_recall',
      memoryRecall: {
        timeWindow: recallResult.timeWindow,
        requestedWindow: recall.timeWindow,
        hitCount: recallResult.hits?.length || 0,
        memoryAvailable: recallResult.memoryAvailable,
        recallType: recall.recallType,
        presenceUsed: recallResult.presenceUsed,
        confidenceBlock: recallResult.confidenceBlock,
      },
    },
  };
}

function fallbackReply({
  message,
  safety,
  userId = 'anonymous',
  recentSessions = [],
  runtimeContext = {},
  profile = {},
}) {
  if (safety.level === 'crisis') {
    return {
      reply:
        "I’m really sorry you’re carrying this. I’m not a therapist or emergency service, but your safety matters right now. If you might hurt yourself or feel in immediate danger, please call emergency services now. If you’re in the U.S., call or text 988 for the Suicide & Crisis Lifeline. If you can, reach out to someone you trust and don’t stay alone with this.",
      scripture: [{ reference: 'Psalm 34:18', text: 'The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.', reason: 'comfort in crisis' }],
      mode: 'crisis',
      confidence: 'high',
      memory_used: false,
      suggested_settings_change: null,
      orb_state: 'listening',
      safety_level: 'crisis',
      next_steps: ['Call emergency services or 988 if you may hurt yourself.', 'Reach out to a trusted person now.'],
      admin_flags: ['crisis_language'],
    };
  }

  if (isStudyFallbackDisabled()) {
    return {
      reply:
        "I'm here with you. Tell me what you'd like help with, and I'll answer from Scripture as directly as I can.",
      scripture: [],
      mode: 'companion',
      confidence: 'low',
      memory_used: false,
      suggested_settings_change: null,
      orb_state: 'speaking',
      safety_level: safety.level,
      next_steps: [],
      admin_flags: ['minimal_ownership_fallback'],
      runtime: { minimalOwnershipFallback: true },
    };
  }

  return buildPersonalizedFallback({
    userId,
    message,
    safety,
    recentSessions,
    runtimeContext,
    profile,
    suppressStudyPrompts: true,
    suppressMemory: true,
  });
}

function normalizeInput(inputOrUserId, modeArg, personaKeyArg, messageArg) {
  if (typeof inputOrUserId === 'object' && inputOrUserId !== null) {
    const testerId = inputOrUserId.testerId || inputOrUserId.userId || 'anonymous';
    return {
      userId: testerId,
      testerId,
      sessionId: inputOrUserId.sessionId || null,
      cohort: inputOrUserId.cohort || null,
      mode: inputOrUserId.mode || 'COMPANION',
      personaKey: inputOrUserId.personaKey || 'ADAPTIVE_COMPANION',
      message: inputOrUserId.message || '',
    };
  }

  return {
    userId: inputOrUserId || 'anonymous',
    testerId: inputOrUserId || 'anonymous',
    sessionId: null,
    cohort: null,
    mode: modeArg || 'COMPANION',
    personaKey: personaKeyArg || 'ADAPTIVE_COMPANION',
    message: messageArg || '',
  };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {}
    }
    return null;
  }
}

function normalizeStructured(parsed, fallback, safety, runtimeContext, quality) {
  return {
    reply: parsed?.reply || fallback.reply,
    scripture: Array.isArray(parsed?.scripture) ? parsed.scripture : [],
    claims: Array.isArray(parsed?.claims) ? parsed.claims : [],
    doctrineConclusion: parsed?.doctrineConclusion || null,
    mode: parsed?.mode || runtimeContext?.intent || 'companion',
    confidence: parsed?.confidence || 'medium',
    memory_used: !!parsed?.memory_used,
    suggested_settings_change: parsed?.suggested_settings_change || null,
    orb_state: parsed?.orb_state || (runtimeContext?.intent === 'prayer' ? 'praying' : 'speaking'),
    safety_level: parsed?.safety_level || safety.level,
    next_steps: Array.isArray(parsed?.next_steps) ? parsed.next_steps : runtimeContext?.actionPlan || [],
    admin_flags: Array.isArray(parsed?.admin_flags) ? parsed.admin_flags : [],
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: runtimeContext?.intent,
      loopRisk: runtimeContext?.loopRisk,
      scripturePath: runtimeContext?.scripturePath,
      actionPlan: runtimeContext?.actionPlan,
    },
    quality,
  };
}

function finalizeBuddyResponse({
  structured,
  userId,
  mode,
  personaKey,
  message,
  safety,
  runtimeContext,
  profile,
  doctrineTopic = null,
  qualityOverride = null,
  testerId = null,
  sessionId = null,
  cohort = null,
}) {
  const quality =
    qualityOverride ||
    structured.quality ||
    scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
  structured.quality = quality;

  // Active-conversation lock (Sprint 2.14D): follow-up/correction turns suppress
  // memory, study, and enrichment so Buddy stays on the live thread.
  const activeConversationLock = !!structured.runtime?.activeConversationLock;
  const hardCutover = process.env.BUDDY_TEMPLATE_PROSE !== '1';

  if (profile?.memoryEnabled !== false && structured.mode !== 'crisis') {
    const skipEnrichment =
      hardCutover ||
      activeConversationLock ||
      structured.runtime?.intent === 'sabbath_history' ||
      structured.runtime?.companionPresentation?.skipRelationshipEnrichment;
    const skipJourney =
      skipEnrichment ||
      ['continue_study', 'study_connection', 'memory_recall'].includes(structured.runtime?.intent);

    if (skipEnrichment) {
      structured.reply = polishCompanionReply(structured.reply);
    } else {
      const enriched = enrichResponseWithRelationshipIntelligence({
        userId,
        reply: structured.reply,
        message,
        runtimeContext,
        includeReflection:
          !structured.runtime?.doctrineTopic &&
          structured.mode !== 'study' &&
          !['health_support', 'prayer', 'memory_recall', 'emotional_support'].includes(
            structured.runtime?.intent
          ),
        includeLoopRevisit: structured.runtime?.intent !== 'memory_recall',
        includeStudyJourney: !skipJourney && (structured.mode === 'study' || !!doctrineTopic),
        doctrineTopic,
      });
      structured.reply = polishCompanionReply(enriched.reply);
      structured.runtime = {
        ...(structured.runtime || {}),
        relationshipIntelligence: enriched.relationshipContext,
        reflectionUsed: enriched.reflectionUsed,
      };
    }
  } else {
    structured.reply = polishCompanionReply(structured.reply);
  }

  try {
    let doctrineState = getDoctrineConversationState(userId);
    if (/\balpha test|alpha testing|test plan\b/i.test(message)) {
      const { updateDoctrineConversationState } = require('./doctrineConversationState');
      updateDoctrineConversationState(userId, {
        sessionMemory: { ...(doctrineState.sessionMemory || {}), alphaTestingContext: true },
      });
      doctrineState = getDoctrineConversationState(userId);
    }
    const anchor = buildConversationAnchor({ userId, message, state: doctrineState });
    const humanNeed = detectHumanNeed(message, anchor, doctrineState);
    const draftRoute = structured.runtime?.masterRoute || null;
    const draftOrchestratorLane = structured.runtime?.orchestratorLane || null;
    structured = finalizeLiveResponse({
      draft: structured,
      message,
      userId,
      sessionId,
      state: doctrineState,
      anchor,
      humanNeed,
      relationshipContext: structured.runtime?.relationshipSummary || {},
    });
    const routeOwnership = buildRouteOwnershipTrace({
      message,
      structured,
      humanNeed,
      anchor,
      doctrineState,
      draftRoute,
      draftOrchestratorLane,
    });
    structured.runtime = {
      ...(structured.runtime || {}),
      routeOwnership,
    };
    logRouteOwnership(routeOwnership);
  } catch (liveOwnerErr) {
    console.warn('liveResponseOwner finalize skipped:', liveOwnerErr.message);
  }

  if (
    !hardCutover &&
    !activeConversationLock &&
    !structured.runtime?.companionPresentation?.skipStudyPrompts &&
    !structured.runtime?.companionNextSteps &&
    structured.runtime?.intent !== 'sabbath_history'
  ) {
    const nextStepsBundle = buildCompanionNextSteps({
      userId,
      message,
      runtimeContext,
      mode: structured.mode,
    });
    if (nextStepsBundle.gentleSuggestion && !String(structured.reply).includes(nextStepsBundle.gentleSuggestion.slice(0, 24))) {
      structured.runtime = {
        ...(structured.runtime || {}),
        companionNextSteps: nextStepsBundle,
      };
    }
  }

  const slimStructured = {
    mode: structured.mode,
    confidence: structured.confidence,
    memory_used: structured.memory_used,
    safety_level: structured.safety_level,
    admin_flags: structured.admin_flags,
    runtime: structured.runtime
      ? {
          masterRoute: structured.runtime.masterRoute,
          openAiCalled: structured.runtime.openAiCalled,
          doctrineTopic: structured.runtime.doctrineTopic,
          doctrineWitnessContinuation: structured.runtime.doctrineWitnessContinuation,
        }
      : undefined,
  };

  appendSession({
    userId,
    testerId: testerId || userId,
    sessionId: sessionId || null,
    cohort: cohort || null,
    mode,
    personaKey,
    message,
    reply: structured.reply,
    structured: slimStructured,
    safety: safety ? { level: safety.level } : undefined,
    runtime: runtimeContext
      ? { intent: runtimeContext.intent, emotion: runtimeContext.emotion }
      : undefined,
    quality: quality ? { score: quality.score } : undefined,
  });
  appendQualityEvent({
    userId,
    mode,
    emotion: runtimeContext.emotion,
    intent: structured.runtime?.intent || runtimeContext.intent,
    issues: quality.issues || [],
    score: quality.score,
  });

  if (profile?.memoryEnabled !== false && structured.mode !== 'crisis') {
    updateUserMemory({ userId, message, structured, runtimeContext });
  }
  persistBuddyMemory({
    userId,
    message,
    structured,
    runtimeContext,
    profile,
    doctrineTopic,
  });

  recordActiveConversationTurn({ userId, message, structured, doctrineTopic, runtimeContext });

  return structured;
}

// Derive the live conversation topic from a finalized reply and persist it.
function recordActiveConversationTurn({ userId, message, structured, doctrineTopic = null, runtimeContext = {} }) {
  if (!userId) return;
  const intent = structured.runtime?.intent || runtimeContext.intent || null;
  const sabbathTopic = structured.runtime?.sabbathIntent?.topic;
  const supportType = structured.runtime?.supportType;

  let topic = null;
  if (intent === 'sabbath_history' || sabbathTopic === 'sabbath') topic = 'sabbath';
  else if (intent === 'emotional_support') topic = supportType === 'rest' ? 'grief' : 'grief';
  else if (intent === 'health_support') topic = 'health';
  else if (intent === 'prayer') topic = 'prayer';
  else if (intent === 'discernment' || structured.runtime?.masterRoute === 'job_discernment') topic = 'discernment';
  else if (doctrineTopic) topic = doctrineTopic;
  else if (intent === 'memory_recall') topic = null; // recall should not anchor the thread
  else if (structured.runtime?.studyConnection?.topic) topic = structured.runtime.studyConnection.topic;

  if (!topic) return;

  try {
    updateActiveConversation({
      userId,
      topic,
      questionType: runtimeContext.questionIntent?.questionType || structured.runtime?.questionIntent?.questionType || null,
      depth: runtimeContext.questionIntent?.requestedDepth || 'standard',
      message,
      answerTopic: topic,
    });
  } catch (_) {}
}

// Detect whether the current message independently signals a *different*
// concrete topic than the active conversation. If so, it is a topic switch
// (not a follow-up) and must be allowed through normal routing.
function messageStartsNewTopic(message = '', activeTopic = null) {
  if (!activeTopic) return false;

  const family = normalizeConversationTopic;
  const active = activeTopic;

  if (active !== 'health' && classifyHealthCompanion(message).isHealthSupport) return true;

  const emotional = classifyEmotionalSupport(message);
  if (active !== 'grief' && emotional.isEmotionalSupport && !emotional.isFollowUp) return true;

  if (active !== 'prayer' && classifyPrayerIntent(message).isPrayerRequest) return true;

  const explicit = detectTopicFromMessage(message);
  if (explicit && family(explicit) !== family(active)) return true;

  return false;
}

function normalizeConversationTopic(topic = '') {
  const t = String(topic || '').toLowerCase();
  if (t === 'sabbath_history') return 'sabbath';
  return t;
}

// Sprint 2.14D Part C/F/G: route a follow-up/correction to the active topic's
// handler, locking out memory bleed, study prompts, and premature enrichment.
function dispatchActiveConversationFollowUp({
  userId,
  mode,
  personaKey,
  message,
  safety,
  runtimeContext,
  profile,
  recentSessions,
  questionIntent,
  followUp,
  startedAt,
}) {
  const topic = followUp.inheritedTopic;
  const isCorrection = followUp.correction === true;

  // Reflect the follow-up/correction on the question intent so downstream
  // presenters suppress study prompts and memory.
  runtimeContext.questionIntent = {
    ...questionIntent,
    questionType: isCorrection ? 'correction' : 'follow_up',
    shouldSuppressStudyPrompts: true,
    isFollowUp: true,
  };

  const lockRuntime = (structured, intent) => {
    structured.runtime = {
      ...(structured.runtime || {}),
      intent: structured.runtime?.intent || intent,
      activeConversationLock: true,
      followUp: true,
      correction: isCorrection,
      activeTopic: topic,
    };
    return structured;
  };

  if (topic === 'sabbath') {
    let reply = buildSabbathHistoryResponse({
      userId,
      message,
      recentSessions,
      correction: isCorrection,
      runtimeContext,
      profile,
      questionIntent: runtimeContext.questionIntent,
    });
    reply = lockRuntime(reply, 'sabbath_history');
    return finalizeBuddyResponse({
      structured: reply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
    });
  }

  if (topic === 'grief') {
    let reply = buildEmotionalSupportResponse({
      userId,
      message,
      runtimeContext,
      supportType: 'grief',
      profile,
      isFollowUp: true,
    });
    reply = lockRuntime(reply, 'emotional_support');
    return finalizeBuddyResponse({
      structured: reply,
      userId,
      mode,
      personaKey,
      message,
      safety: { level: 'emotional_support' },
      runtimeContext,
      profile,
    });
  }

  if (topic === 'health') {
    const healthConcern = classifyHealthCompanion(message);
    let reply = buildHealthSupportResponse({
      userId,
      message,
      runtimeContext,
      profile,
      health: healthConcern.health || { issue: 'this' },
    });
    reply = lockRuntime(reply, 'health_support');
    return finalizeBuddyResponse({
      structured: reply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
    });
  }

  if (topic === 'prayer') {
    let reply = buildPrayerCompanionResponse({
      userId,
      message,
      runtimeContext,
      profile,
    });
    reply = lockRuntime(reply, 'prayer');
    return finalizeBuddyResponse({
      structured: reply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
    });
  }

  return null;
}

async function runBuddy(inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const H = {
    normalizeInput,
    getUserCompanionProfile,
    getRecentSessions,
    enrichRuntimeContextWithMemory,
    classifySafety,
    fallbackReply,
    finalizeBuddyResponse,
    buildMemoryRecallStructured,
    applyFallbackLoopGuard,
    persistBuddyMemory,
    appendSession,
    appendQualityEvent,
    updateUserMemory,
    buildSystemPrompt,
    safeJsonParse,
    normalizeStructured,
  };

  if (process.env.BUDDY_OPENAI_FIRST === '0' || String(process.env.BUDDY_RUNTIME || '').toLowerCase() === 'reason_first') {
    console.warn(
      'WARN: BUDDY_OPENAI_FIRST=0 and BUDDY_RUNTIME=reason_first are disabled by hard cutover — using openAiFirstCompanionRuntime.'
    );
  }

  const { runOpenAiFirstCompanionRuntime } = require('./openAiFirstCompanionRuntime');
  return runOpenAiFirstCompanionRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg);
}

module.exports = {
  runBuddy,
  classifySafety,
  getUserCompanionProfile,
  getRecentSessions,
  enrichRuntimeContextWithMemory,
  buildSystemPrompt,
  safeJsonParse,
  normalizeStructured,
  applyFallbackLoopGuard,
  persistBuddyMemory,
  buildMemoryRecallStructured,
  trimRecentSessionCache,
  getRecentSessionCacheSize,
};
