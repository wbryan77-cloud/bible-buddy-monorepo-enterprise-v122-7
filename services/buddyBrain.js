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
const { resolveQuestionIntent } = require('./questionIntentResolver');
const { containsInternalRuntimeLabels } = require('./runtimeLabelStripper');

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
  const line = JSON.stringify({ ...entry, createdAt: new Date().toISOString() }) + '\n';
  fs.appendFile(file, line, (err) => {
    if (err) console.error(`Error writing ${path.basename(file)}:`, err.message);
  });
}

function appendSession(entry) {
  appendJsonl(LOG_FILE, entry);
  const cached = RECENT_SESSION_CACHE.get(entry.userId) || [];
  cached.push({
    mode: entry.mode,
    message: entry.message,
    reply: entry.reply,
    safety: entry.safety,
    runtime: {
      ...(entry.runtime || {}),
      ...(entry.structured?.runtime || {}),
    },
    quality: entry.quality,
    createdAt: entry.createdAt || new Date().toISOString(),
  });
  RECENT_SESSION_CACHE.set(entry.userId, cached.slice(-12));
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
    const text = fs.readFileSync(LOG_FILE, 'utf8');
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
    summaries: summaries.slice(-30),
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

  const factualHistory =
    /\bhistorical (references|evidence|context)\b/i.test(String(message)) ||
    /\bwho changed\b/i.test(String(message)) ||
    /\bwhy sunday\b/i.test(String(message));

  if (factualHistory) {
    const sabbathIntent = resolveSabbathCompanionIntent({ message, recentSessions });
    if (sabbathIntent.intent === 'history_deep' || sabbathIntent.intent === 'history' || sabbathIntent.recentSabbathContext) {
      return buildSabbathHistoryResponse({
        userId,
        message,
        recentSessions,
        correction: sabbathIntent.correction,
        runtimeContext,
        profile,
      });
    }
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

function normalizeInput(inputOrUserId, modeArg, personaKeyArg, messageArg) {
  if (typeof inputOrUserId === 'object' && inputOrUserId !== null) {
    return {
      userId: inputOrUserId.userId || 'anonymous',
      mode: inputOrUserId.mode || 'COMPANION',
      personaKey: inputOrUserId.personaKey || 'ADAPTIVE_COMPANION',
      message: inputOrUserId.message || '',
    };
  }

  return {
    userId: inputOrUserId || 'anonymous',
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
}) {
  const quality =
    qualityOverride ||
    structured.quality ||
    scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
  structured.quality = quality;

  if (profile?.memoryEnabled !== false && structured.mode !== 'crisis') {
    const skipEnrichment =
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

  if (!structured.runtime?.companionNextSteps && structured.runtime?.intent !== 'sabbath_history') {
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

  appendSession({
    userId,
    mode,
    personaKey,
    message,
    reply: structured.reply,
    structured,
    safety,
    runtime: runtimeContext,
    quality,
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

  return structured;
}

async function runBuddy(inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const startedAt = Date.now();
  const { userId, mode, personaKey, message } = normalizeInput(inputOrUserId, modeArg, personaKeyArg, messageArg);

  if (!message || !String(message).trim()) {
    return fallbackReply({ message, safety: { level: 'standard' } });
  }

  const safety = classifySafety(message);
  const profile = getUserCompanionProfile(userId);
  const recentSessions = getRecentSessions(userId, 8);
  const recentInsights = getRecentInsightsForUser(userId, 8);
  const snapshot = getSnapshot();
  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, recentInsights, safety });
  runtimeContext = enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  runtimeContext.userId = userId;
  runtimeContext.profile = profile;

  const questionIntent = resolveQuestionIntent({ message, recentSessions });
  runtimeContext.questionIntent = questionIntent;

  if (safety.level === 'crisis') {
    const crisisReply = fallbackReply({ message, safety });
    const quality = scoreCompanionQuality({ message, reply: crisisReply.reply, runtimeContext });
    crisisReply.quality = quality;
    crisisReply.runtime = { emotion: runtimeContext.emotion, intent: runtimeContext.intent };
    appendSession({ userId, mode, personaKey, message, reply: crisisReply.reply, structured: crisisReply, safety, runtime: runtimeContext, quality });
    appendQualityEvent({ userId, mode, issues: quality.issues, score: quality.score, safety });
    persistBuddyMemory({ userId, message, structured: crisisReply, runtimeContext, profile });
    return crisisReply;
  }

  const continueStudy = classifyContinueStudyIntent(message, userId);
  if (continueStudy.isContinueStudy && profile?.memoryEnabled !== false) {
    let continueReply = buildContinueStudyResponse({ userId, message });
    continueReply.safety_level = safety.level;
    continueReply = finalizeBuddyResponse({
      structured: continueReply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
    });
    return continueReply;
  }

  const studyConnection = classifyStudyConnectionQuery(message);
  if (studyConnection.isStudyConnection && profile?.memoryEnabled !== false) {
    const connectionReply = buildStudyConnectionResponse({
      userId,
      message,
      runtimeContext,
      profile,
    });
    if (connectionReply) {
      connectionReply.safety_level = safety.level;
      return finalizeBuddyResponse({
        structured: connectionReply,
        userId,
        mode,
        personaKey,
        message,
        safety,
        runtimeContext,
        profile,
        doctrineTopic: connectionReply.runtime?.studyConnection?.topic || null,
      });
    }
  }

  const recall = classifyRelationshipRecallQuery(message);
  if (recall.isRecallQuery && profile?.memoryEnabled !== false) {
    const recallReply = buildMemoryRecallStructured({
      userId,
      message,
      recall,
      runtimeContext,
      safety,
    });
    const quality = scoreCompanionQuality({
      message,
      reply: recallReply.reply,
      runtimeContext,
    });
    recallReply.quality = quality;
    recallReply.reply = polishCompanionReply(recallReply.reply);

    appendSession({
      userId,
      mode,
      personaKey,
      message,
      reply: recallReply.reply,
      structured: recallReply,
      safety,
      runtime: runtimeContext,
      quality,
    });
    appendQualityEvent({
      userId,
      mode,
      emotion: runtimeContext.emotion,
      intent: 'memory_recall',
      issues: quality.issues || [],
      score: quality.score,
    });
    updateUserMemory({ userId, message, structured: recallReply, runtimeContext });
    persistBuddyMemory({ userId, message, structured: recallReply, runtimeContext, profile });
    return recallReply;
  }

  const health = classifyHealthCompanion(message);
  if (health.isHealthSupport) {
    let healthReply = buildHealthSupportResponse({
      userId,
      message,
      runtimeContext,
      profile,
      health: health.health,
    });
    healthReply = finalizeBuddyResponse({
      structured: healthReply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
    });
    return healthReply;
  }

  const prayer = classifyPrayerIntent(message);
  if (prayer.isPrayerRequest) {
    let prayerReply = buildPrayerCompanionResponse({
      userId,
      message,
      runtimeContext,
      profile,
    });
    prayerReply = finalizeBuddyResponse({
      structured: prayerReply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
    });
    return prayerReply;
  }

  const emotional = classifyEmotionalSupport(message, userId);
  if (emotional.isEmotionalSupport) {
    let emotionalReply = buildEmotionalSupportResponse({
      userId,
      message,
      runtimeContext,
      supportType: emotional.supportType,
      profile,
      isFollowUp: emotional.isFollowUp,
    });
    emotionalReply = finalizeBuddyResponse({
      structured: emotionalReply,
      userId,
      mode,
      personaKey,
      message,
      safety: { level: 'emotional_support' },
      runtimeContext,
      profile,
    });
    return emotionalReply;
  }

  const sabbathIntent = resolveSabbathCompanionIntent({ message, recentSessions });
  const routeSabbathHistory =
    questionIntent.isSabbathHistory ||
    sabbathIntent.intent === 'history_deep' ||
    sabbathIntent.intent === 'history' ||
    sabbathIntent.intent === 'correction';

  if (routeSabbathHistory && questionIntent.questionType !== 'comparison') {
    let sabbathHistoryReply = buildSabbathHistoryResponse({
      userId,
      message,
      recentSessions,
      correction: sabbathIntent.correction || questionIntent.questionType === 'correction',
      runtimeContext,
      profile,
      questionIntent,
    });
    sabbathHistoryReply = finalizeBuddyResponse({
      structured: sabbathHistoryReply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
    });
    recordCompanionEvent({
      type: 'runtime_orchestration',
      userId,
      mode,
      durationMs: Date.now() - startedAt,
      latencyMs: Date.now() - startedAt,
      orbState: sabbathHistoryReply.orb_state,
      safetyLevel: sabbathHistoryReply.safety_level,
      feature: 'sabbath_history_companion',
      language: 'en',
    });
    return sabbathHistoryReply;
  }

  const doctrineResult = runDoctrineRuntimePipeline({ message, questionIntent });
  if (doctrineResult?.intercepted) {
    let structured = {
      ...doctrineResult.reply,
      safety_level: safety.level,
      memory_used: false,
      runtime: {
        ...(doctrineResult.reply.runtime || {}),
        emotion: runtimeContext.emotion,
        intent: runtimeContext.intent,
        doctrineTopic: doctrineResult.topic,
        questionIntent,
      },
    };

    try {
      const refs = (structured.scripture || []).map((s) => s.reference || s);
      const chain = await orchestrateBuddyRuntime({
        topic: doctrineResult.topic,
        scripture: refs,
        message,
      });
      structured.runtime = {
        ...structured.runtime,
        scriptureChain: chain,
      };
    } catch (err) {
      console.warn('Scripture chain enrichment failed:', err.message);
    }

    const quality =
      structured.quality ||
      scoreCompanionQuality({
        message,
        reply: structured.reply,
        runtimeContext,
      });
    structured.quality = quality;

    structured = presentCompanionDoctrine({
      structured,
      userId,
      message,
      runtimeContext,
      profile,
      safety,
      doctrineTopic: doctrineResult.topic,
      answerFirstMode: questionIntent.questionType === 'definition' || questionIntent.questionType === 'comparison',
      suppressStudyPrompts: questionIntent.shouldSuppressStudyPrompts,
      suppressMemory: questionIntent.isHistoricalQuestion,
    });

    if (profile?.memoryEnabled !== false) {
      const enriched = enrichResponseWithRelationshipIntelligence({
        userId,
        reply: structured.reply,
        message,
        runtimeContext,
        includeReflection: false,
        includeLoopRevisit: true,
        includeStudyJourney: false,
        doctrineTopic: doctrineResult.topic,
      });
      structured.reply = enriched.reply;
      structured.runtime = {
        ...structured.runtime,
        relationshipIntelligence: enriched.relationshipContext,
      };
    }

    appendSession({
      userId,
      mode,
      personaKey,
      message,
      reply: structured.reply,
      structured,
      safety,
      runtime: runtimeContext,
      quality,
    });
    appendQualityEvent({
      userId,
      mode,
      emotion: runtimeContext.emotion,
      intent: runtimeContext.intent,
      issues: quality.issues || [],
      score: quality.score,
    });
    if (profile?.memoryEnabled !== false) {
      updateUserMemory({ userId, message, structured, runtimeContext });
    }
    persistBuddyMemory({
      userId,
      message,
      structured,
      runtimeContext,
      profile,
      doctrineTopic: doctrineResult.topic,
    });

    recordCompanionEvent({
      type: 'runtime_orchestration',
      userId,
      mode,
      durationMs: Date.now() - startedAt,
      latencyMs: Date.now() - startedAt,
      orbState: structured.orb_state,
      safetyLevel: structured.safety_level,
      feature: 'doctrine_intercept',
      language: 'en',
    });

    return structured;
  }

  const registryKey = detectRegistryStudyTopic(message);
  if (registryKey) {
    let registryReply = presentRegistryStudyResponse({
      userId,
      message,
      registryKey,
      runtimeContext,
      profile,
    });
    if (registryReply) {
      registryReply.safety_level = safety.level;
      registryReply = finalizeBuddyResponse({
        structured: registryReply,
        userId,
        mode,
        personaKey,
        message,
        safety,
        runtimeContext,
        profile,
        doctrineTopic: registryKey,
      });
      recordCompanionEvent({
        type: 'runtime_orchestration',
        userId,
        mode,
        durationMs: Date.now() - startedAt,
        latencyMs: Date.now() - startedAt,
        orbState: registryReply.orb_state,
        safetyLevel: registryReply.safety_level,
        feature: 'registry_study_presenter',
        language: 'en',
      });
      return registryReply;
    }
  }

  if (!openai) {
    let reply = buildPersonalizedFallback({
      userId,
      message,
      safety,
      recentSessions,
      runtimeContext,
      profile,
    });
    reply = applyFallbackLoopGuard({
      reply,
      runtimeContext,
      recentSessions,
      message,
      safety,
      userId,
    });
    reply.quality = scoreCompanionQuality({ message, reply: reply.reply, runtimeContext });
    reply.runtime = { ...(reply.runtime || {}), emotion: runtimeContext.emotion, intent: runtimeContext.intent };
    if (profile?.memoryEnabled !== false) {
      const enriched = enrichResponseWithRelationshipIntelligence({
        userId,
        reply: reply.reply,
        message,
        runtimeContext,
        includeReflection: false,
        includeLoopRevisit: true,
      });
      reply.reply = enriched.reply;
      reply.runtime.relationshipIntelligence = enriched.relationshipContext;
    }
    appendSession({ userId, mode, personaKey, message, reply: reply.reply, structured: reply, safety, runtime: runtimeContext, quality: reply.quality });
    updateUserMemory({ userId, message, structured: reply, runtimeContext });
    persistBuddyMemory({ userId, message, structured: reply, runtimeContext, profile });
    return reply;
  }

  const runtimeInstructions = buildRuntimeInstructions(runtimeContext);
  const systemPrompt = buildSystemPrompt({ mode, personaKey, profile, runtimeInstructions });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.72,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify(
            {
              message,
              userId,
              mode,
              personaKey,
              safety,
              companionProfile: profile,
              runtimeContext,
              recentSessions,
              recentInsights,
              projectSnapshot: snapshot,
            },
            null,
            2
          ),
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || '';
    let fallback = fallbackReply({ message, safety, userId, recentSessions, runtimeContext, profile });
    fallback = applyFallbackLoopGuard({
      reply: fallback,
      runtimeContext,
      recentSessions,
      message,
      safety,
      userId,
    });
    const parsed = safeJsonParse(raw) || fallback;
    const provisionalReply = parsed.reply || fallback.reply;
    const quality = scoreCompanionQuality({ message, reply: provisionalReply, runtimeContext });
    let structured = normalizeStructured(parsed, fallback, safety, runtimeContext, quality);
    structured = applyFallbackLoopGuard({
      reply: structured,
      runtimeContext,
      recentSessions,
      message,
      safety,
      userId,
    });

    if (!quality.passed) {
      structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'low_quality_response', ...quality.issues])];
    }

    if (profile?.memoryEnabled !== false) {
      const enriched = enrichResponseWithRelationshipIntelligence({
        userId,
        reply: structured.reply,
        message,
        runtimeContext,
        includeReflection: true,
        includeLoopRevisit: true,
        includeStudyJourney: false,
      });
      structured.reply = polishCompanionReply(enriched.reply);
      structured.runtime = {
        ...(structured.runtime || {}),
        relationshipIntelligence: enriched.relationshipContext,
        openaiPathEnriched: true,
      };
    } else {
      structured.reply = polishCompanionReply(structured.reply);
    }

    appendSession({ userId, mode, personaKey, message, reply: structured.reply, structured, safety, runtime: runtimeContext, quality });
    appendQualityEvent({ userId, mode, emotion: runtimeContext.emotion, intent: runtimeContext.intent, issues: quality.issues, score: quality.score });
    if (profile?.memoryEnabled !== false) {
      updateUserMemory({ userId, message, structured, runtimeContext });
    }
    persistBuddyMemory({ userId, message, structured, runtimeContext, profile });

    recordCompanionEvent({
      type: 'runtime_orchestration',
      userId,
      mode,
      durationMs: Date.now() - startedAt,
      latencyMs: Date.now() - startedAt,
      orbState: structured.orb_state,
      safetyLevel: structured.safety_level,
      feature: 'buddy_runtime_orchestrator',
      language: 'en',
    });

    return structured;
  } catch (e) {
    console.error('BuddyBrain OpenAI error:', e?.message || e);
    let reply = fallbackReply({ message, safety, userId, recentSessions, runtimeContext, profile });
    reply = applyFallbackLoopGuard({
      reply,
      runtimeContext,
      recentSessions,
      message,
      safety,
      userId,
    });
    const quality = scoreCompanionQuality({ message, reply: reply.reply, runtimeContext });
    reply.quality = quality;
    reply.runtime = { ...(reply.runtime || {}), emotion: runtimeContext.emotion, intent: runtimeContext.intent };
    appendSession({ userId, mode, personaKey, message, reply: reply.reply, structured: reply, safety, runtime: runtimeContext, quality });
    appendQualityEvent({ userId, mode, issues: ['openai_error'], score: quality.score, error: e?.message || String(e) });
    updateUserMemory({ userId, message, structured: reply, runtimeContext });
    persistBuddyMemory({ userId, message, structured: reply, runtimeContext, profile });
    return reply;
  }
}

module.exports = {
  runBuddy,
  classifySafety,
  getUserCompanionProfile,
  applyFallbackLoopGuard,
  persistBuddyMemory,
  buildMemoryRecallStructured,
};
