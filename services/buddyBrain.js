const fs = require('fs');
const path = require('path');
const openai = require('./openaiClient');
const { getSnapshot } = require('./projectBrain');
const { getRecentInsightsForUser } = require('./contentInsight'); // <--- add this

const LOG_FILE = path.join(__dirname, '..', 'data', 'buddy-sessions.jsonl');

// make sure data folder exists
try {
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
} catch (_) {}

function appendSession(entry) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error('Error logging buddy session:', err.message);
  });
}

function getRecentSessions(userId, limit) {
  try {
    const text = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = text.trim().split('\n').reverse();
    const out = [];
    for (const line of lines) {
      if (!line) continue;
      const entry = JSON.parse(line);
      if (entry.userId === userId) {
        out.push(entry);
        if (out.length >= limit) break;
      }
    }
    return out.reverse();
  } catch (_) {
    return [];
  }
}

/**
 * mode: "BIBLE" | "THERAPY" | "HEALTH" | "SERMON"
 * personaKey: "GENTLE_COACH" | "BIBLE_TEACHER" | "CONTEXT_GUIDE"
 */
/**
 * mode: "BIBLE" | "THERAPY" | "HEALTH" | "SERMON"
 * personaKey: "GENTLE_COACH" | "BIBLE_TEACHER" | "CONTEXT_GUIDE"
 */
async function runBuddy(userId, mode, personaKey, message) {
    // Friendly safety check (OpenAI not configured)
  if (!openai) {
    return "AI is warming up. Please try again shortly.";
  }

  const snapshot = getSnapshot();
  
  const { modules, phases, competitors, avatars } = snapshot;

  const persona =
    avatars.find((a) => a.key === personaKey) ||
    avatars.find((a) => a.key === 'GENTLE_COACH') ||
    { displayName: 'Companion', systemPrompt: '' };

  // Recent chat history with this user
  const recentSessions = getRecentSessions(userId, 10);

  // 🔥 NEW: recent tester/pastor/user insights (notes + images + AI paraphrases)
  const recentInsights = getRecentInsightsForUser(userId, 10);

  const systemPrompt = `
You are Bible Buddy's "${persona.displayName}" persona for mode "${mode}".

You know:
- Modules (KJV core, Holy Days Lev 23, Deut 28, Bible Buddy AI, Therapy & Health, Sermon Builder, Testing Phases, Avatars).
- Phases (Phase 1 core, Phase 2 health/therapy, Phase 3 sermons).
- Competitor patterns:
- Bible
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify(
            {
              userId,
              mode,
              personaKey,
              message,
              modules,
              phases,
              competitors,
              recentSessions,
              recentInsights,
            },
            null,
            2
          ),
        },
      ],
    });

    return completion?.choices?.[0]?.message?.content || "I’m here — what would you like help with?";
  } catch (e) {
    console.error("BuddyBrain OpenAI error:", e?.message || e);
    return "I had trouble reaching the AI just now. Please try again in a moment.";
  }
}

module.exports = { runBuddy };
