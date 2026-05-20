const fs = require('fs');
const path = require('path');
const openai = require('./openaiClient');

let getSnapshot = () => ({ modules: [], phases: [], competitors: [], avatars: [] });
let getRecentInsightsForUser = () => [];

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

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'buddy-sessions.jsonl');
const MEMORY_FILE = path.join(DATA_DIR, 'buddy-memory.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const DEFAULT_COMPANION_PROFILE = {
  scriptureDepth: 'balanced', // light | balanced | deep
  tone: 'warm',
  reminderStyle: 'gentle',
  prefersPrayer: null,
  prefersReadingPlan: null,
  emotionalSupportMode: true,
  memoryEnabled: false,
};

function appendSession(entry) {
  const line = JSON.stringify({ ...entry, createdAt: new Date().toISOString() }) + '\n';
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error('Error logging buddy session:', err.message);
  });
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

function getUserCompanionProfile(userId) {
  const store = readMemoryStore();
  return {
    ...DEFAULT_COMPANION_PROFILE,
    ...(store[userId]?.profile || {}),
  };
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
  ];

  if (crisisTerms.some((term) => lower.includes(term))) {
    return { level: 'crisis', reason: 'self-harm or crisis language detected' };
  }

  if (emotionalTerms.some((term) => lower.includes(term))) {
    return { level: 'emotional_support', reason: 'emotional distress language detected' };
  }

  return { level: 'standard', reason: 'no elevated safety pattern detected' };
}

function buildSystemPrompt({ mode, personaKey, profile }) {
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
- Listen first. Ask gentle follow-up questions when helpful.
- If the user seems overwhelmed, comfort first and keep Scripture light unless they ask for more.
- If the user wants study, give deeper Scripture references and context.
- Avoid canned responses. Respond to the actual message.

Scripture rules:
- Use KJV references when citing Scripture.
- Do not invent Bible verses.
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

Return JSON only using this shape:
{
  "reply": "natural companion response",
  "scripture": [{ "reference": "Book chapter:verse", "text": "KJV text or empty if not quoted" }],
  "mode": "companion|prayer|study|reflection|wellness|crisis",
  "confidence": "low|medium|high",
  "memory_used": false,
  "suggested_settings_change": null,
  "orb_state": "idle|listening|thinking|speaking|praying|notification",
  "safety_level": "standard|emotional_support|crisis"
}
`.trim();
}

function fallbackReply({ message, safety }) {
  if (safety.level === 'crisis') {
    return {
      reply:
        "I’m really sorry you’re carrying this. I’m not a therapist or emergency service, but your safety matters right now. If you might hurt yourself or feel in immediate danger, please call emergency services now. If you’re in the U.S., call or text 988 for the Suicide & Crisis Lifeline. If you can, reach out to someone you trust and don’t stay alone with this.",
      scripture: [{ reference: 'Psalm 34:18', text: 'The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.' }],
      mode: 'crisis',
      confidence: 'high',
      memory_used: false,
      suggested_settings_change: null,
      orb_state: 'listening',
      safety_level: 'crisis',
    };
  }

  return {
    reply:
      "I’m here with you. Tell me what’s on your heart, and I’ll listen first. If you want, we can talk, pray, or look at a Scripture that fits this moment.",
    scripture: [{ reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' }],
    mode: 'companion',
    confidence: 'medium',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: safety.level,
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

async function runBuddy(inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const { userId, mode, personaKey, message } = normalizeInput(inputOrUserId, modeArg, personaKeyArg, messageArg);

  if (!message || !String(message).trim()) {
    return fallbackReply({ message, safety: { level: 'standard' } });
  }

  const safety = classifySafety(message);
  const profile = getUserCompanionProfile(userId);
  const recentSessions = getRecentSessions(userId, 8);
  const recentInsights = getRecentInsightsForUser(userId, 8);
  const snapshot = getSnapshot();

  if (safety.level === 'crisis') {
    const crisisReply = fallbackReply({ message, safety });
    appendSession({ userId, mode, personaKey, message, reply: crisisReply.reply, safety });
    return crisisReply;
  }

  if (!openai) {
    const reply = fallbackReply({ message, safety });
    appendSession({ userId, mode, personaKey, message, reply: reply.reply, safety });
    return reply;
  }

  const systemPrompt = buildSystemPrompt({ mode, personaKey, profile });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.65,
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
              recentSessions: profile.memoryEnabled ? recentSessions : [],
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
    const parsed = safeJsonParse(raw) || fallbackReply({ message, safety });

    const structured = {
      reply: parsed.reply || fallbackReply({ message, safety }).reply,
      scripture: Array.isArray(parsed.scripture) ? parsed.scripture : [],
      mode: parsed.mode || 'companion',
      confidence: parsed.confidence || 'medium',
      memory_used: !!parsed.memory_used,
      suggested_settings_change: parsed.suggested_settings_change || null,
      orb_state: parsed.orb_state || 'speaking',
      safety_level: parsed.safety_level || safety.level,
    };

    appendSession({ userId, mode, personaKey, message, reply: structured.reply, structured, safety });
    return structured;
  } catch (e) {
    console.error('BuddyBrain OpenAI error:', e?.message || e);
    const reply = fallbackReply({ message, safety });
    appendSession({ userId, mode, personaKey, message, reply: reply.reply, safety });
    return reply;
  }
}

module.exports = {
  runBuddy,
  classifySafety,
  getUserCompanionProfile,
};