const fs = require('fs');
const path = require('path');
const openai = require('./openaiClient');
const {
  buildRuntimeContext,
  buildRuntimeInstructions,
  scoreCompanionQuality,
} = require('./runtimeOrchestrator');

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
}

function appendQualityEvent(entry) {
  appendJsonl(QA_FILE, entry);
}

function getRecentSessions(userId, limit = 8) {
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
          runtime: entry.runtime,
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
  ];

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

function fallbackReply({ message, safety }) {
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

  return {
    reply:
      "I’m here with you. Let’s slow this down together. One simple next step is to name what is weighing on you most, then we can either pray through it, find a Scripture that fits it, or make a small plan for today.",
    scripture: [{ reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.', reason: 'steadying reminder' }],
    mode: 'companion',
    confidence: 'medium',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: safety.level,
    next_steps: ['Name the main burden.', 'Choose prayer, Scripture, or a practical plan.'],
    admin_flags: [],
  };
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
  const runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, recentInsights, safety });

  if (safety.level === 'crisis') {
    const crisisReply = fallbackReply({ message, safety });
    const quality = scoreCompanionQuality({ message, reply: crisisReply.reply, runtimeContext });
    crisisReply.quality = quality;
    crisisReply.runtime = { emotion: runtimeContext.emotion, intent: runtimeContext.intent };
    appendSession({ userId, mode, personaKey, message, reply: crisisReply.reply, structured: crisisReply, safety, runtime: runtimeContext, quality });
    appendQualityEvent({ userId, mode, issues: quality.issues, score: quality.score, safety });
    return crisisReply;
  }

  if (!openai) {
    const reply = fallbackReply({ message, safety });
    const quality = scoreCompanionQuality({ message, reply: reply.reply, runtimeContext });
    reply.quality = quality;
    reply.runtime = { emotion: runtimeContext.emotion, intent: runtimeContext.intent };
    appendSession({ userId, mode, personaKey, message, reply: reply.reply, structured: reply, safety, runtime: runtimeContext, quality });
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
    const fallback = fallbackReply({ message, safety });
    const parsed = safeJsonParse(raw) || fallback;
    const provisionalReply = parsed.reply || fallback.reply;
    const quality = scoreCompanionQuality({ message, reply: provisionalReply, runtimeContext });
    const structured = normalizeStructured(parsed, fallback, safety, runtimeContext, quality);

    if (!quality.passed) {
      structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'low_quality_response', ...quality.issues])];
    }

    appendSession({ userId, mode, personaKey, message, reply: structured.reply, structured, safety, runtime: runtimeContext, quality });
    appendQualityEvent({ userId, mode, emotion: runtimeContext.emotion, intent: runtimeContext.intent, issues: quality.issues, score: quality.score });
    updateUserMemory({ userId, message, structured, runtimeContext });

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
    const reply = fallbackReply({ message, safety });
    const quality = scoreCompanionQuality({ message, reply: reply.reply, runtimeContext });
    reply.quality = quality;
    reply.runtime = { emotion: runtimeContext.emotion, intent: runtimeContext.intent };
    appendSession({ userId, mode, personaKey, message, reply: reply.reply, structured: reply, safety, runtime: runtimeContext, quality });
    appendQualityEvent({ userId, mode, issues: ['openai_error'], score: quality.score, error: e?.message || String(e) });
    return reply;
  }
}

module.exports = {
  runBuddy,
  classifySafety,
  getUserCompanionProfile,
};
