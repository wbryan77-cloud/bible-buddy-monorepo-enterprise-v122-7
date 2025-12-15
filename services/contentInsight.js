// services/contentInsight.js
// Bible Buddy Content Insight Engine
//
// • Analyzes notes / outlines / ideas from testers, pastors, teachers, users
// • Optionally looks at image URLs (slides, whiteboards, screenshots)
// • Suggests KJV verses line upon line, precept upon precept
// • Adds clearly marked “AI paraphrase (not scripture)” text that may reflect Hebrew/Greek sense
// • Logs insights so Buddy & Admin can learn from them before full launch

const fs = require('fs');
const path = require('path');
const openai = require("./openaiClient");
const { getSnapshot } = require('./projectBrain');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Where we store insight records (one JSON object per line)
const DATA_DIR = path.join(__dirname, '..', 'data');
const INSIGHTS_LOG = path.join(DATA_DIR, 'content-insights.jsonl');

// Ensure /data exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('WARNING: could not ensure data directory for insights:', e.message);
}

// Append an insight record to the JSONL log.
function logInsight(entry) {
  try {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(INSIGHTS_LOG, line, 'utf8');
  } catch (err) {
    console.error('Error logging content insight:', err.message);
  }
}

// Read recent insights for a user (for Buddy auto-learning / admin view).
function getRecentInsightsForUser(userId, limit = 10) {
  try {
    if (!fs.existsSync(INSIGHTS_LOG)) return [];
    const text = fs.readFileSync(INSIGHTS_LOG, 'utf8');
    const lines = text.trim().split('\n').reverse();
    const out = [];

    for (const line of lines) {
      if (!line) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (entry.userId !== userId) continue;
      out.push(entry);
      if (out.length >= limit) break;
    }

    return out.reverse();
  } catch (err) {
    console.error('Error reading content insights:', err.message);
    return [];
  }
}

/**
 * Analyze a text note / outline / idea.
 *
 * @param {string} userId
 * @param {string} note           The raw note text
 * @param {string[]} chosenVerses Verses the user already has in mind (optional)
 * @param {string[]} tags         Any extra tags like ["tester","pastor","phase2"]
 */
async function analyzeNote(userId, note, chosenVerses = [], tags = []) {
  const snapshot = getSnapshot();
  const { modules, phases, competitors, providers } = snapshot;

  const systemPrompt = `
You are the CONTENT HELPER for the Bible Buddy app.

You help testers, pastors, teachers, and regular users refine ideas
“line upon line, precept upon precept” using KJV scripture as the base.

Project context:
- Modules (KJV core, Holy Days Lev 23, Deut 28, Bible Buddy AI, Therapy & Health, Sermon Builder, Testing Phases).
- Phases: Phase 1 (Core Bible Buddy), Phase 2 (Health + Therapy), Phase 3 (Sermons).
- Competitor patterns:
  • Bible apps (streaks, deep study, theme plans)
  • Therapy apps (daily check-ins, journaling, CBT-style prompts)
  • Health apps (habits, watch/sleep, nutrition)
- Providers: Bible text API, food scan API, health metrics API (if configured).

The note may come from:
- A pastor/teacher planning a sermon or Bible study,
- A user writing a devotional, reflection, or study note,
- A health / therapy angle that still needs to stay grounded in scripture.

Your job:
- Read the note carefully.
- If the author is a “pastor” or “teacher”, treat this as SERMON or teaching prep.
- Use the KJV Bible as the *only* scripture text. 
- Where helpful, you may include short “AI paraphrase (not scripture)” lines to reflect
  the sense of underlying Hebrew/Aramaic/Greek. These paraphrases:
    • MUST be clearly labelled “AI paraphrase (not scripture)”
    • MUST not claim to be more pure, more original, or more authoritative than KJV.
- Suggest better KJV verses if the user’s chosenVerses don’t fit, but explain why.
- Try to keep things in context — do not rip verses out of context, especially passages
  like Deuteronomy 28.
- Be gentle and balanced when dealing with sensitive topics (mental health, suffering, etc.).

Output in strict JSON with this structure:

{
  "summary": "Short summary of what the note is about...",
  "fitAssessment": "How well the current idea or chosen verses fit (if any)...",
  "recommendedVerses": [
    {
      "reference": "Book 1:1-3",
      "reason": "Why this fits the idea..."
    }
  ],
  "aiParaphrases": [
    {
      "reference": "Book 11:3",
      "paraphrase": "AI paraphrase (not scripture)..."
    }
  ],
  "structureSuggestions": [
    "Suggestion on how to order or improve the outline...",
    "Another small, practical suggestion..."
  ],
  "hebrewGreekNotes": [
    "Optional brief comment on key word/phrase (clearly non-authoritative)..."
  ],
  "appFeedbackQuestions": [
    "One short question to ask this tester or pastor about how Bible Buddy can improve..."
  ],
  "notes": [
    "Any extra gentle coaching, reminders about context, etc."
  ]
}
`.trim();

  const userPayload = {
    userId,
    note,
    chosenVerses,
    tags,
    modules,
    phases,
    competitors,
    providers,
  };

  let json;
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
    });

    const raw = completion.choices[0].message.content || '';
    try {
      json = JSON.parse(raw);
    } catch {
      // If the model responded with text instead of JSON, wrap it.
      json = { summary: raw, raw };
    }
  } catch (err) {
    console.error('Error calling OpenAI in analyzeNote:', err.message);
    json = {
      error: 'analyzeNote_openai_error',
      message: err.message,
    };
  }

  const insightRecord = {
    type: 'note',
    ts: new Date().toISOString(),
    userId,
    note,
    chosenVerses,
    tags,
    result: json,
  };

  logInsight(insightRecord);
  return json;
}

/**
 * Analyze an image + optional text note.
 *
 * imageUrl should be a publicly accessible URL (uploaded by client).
 * Used by testers/pastors to send whiteboard photos, sermon outlines, app screenshots, etc.
 */
async function analyzeImage(userId, imageUrl, note = '', tags = []) {
  const snapshot = getSnapshot();
  const { modules } = snapshot;

  const systemPrompt = `
You are the CONTENT HELPER for Bible Buddy, looking at an image and optional note.

The image may contain slides, whiteboard notes, sermon outlines, or app screenshots
from testers, pastors, teachers, or users.

Your job:
- Briefly describe what you see.
- Extract the main Bible ideas or themes.
- Suggest 3–6 KJV passages that support those themes line upon line, precept upon precept.
- Optionally add clearly-labelled “AI paraphrase (not scripture)” paraphrases that try to
  reflect Hebrew/Greek ideas behind the text, ALWAYS marked “AI paraphrase (not scripture)”.
- Keep everything gentle and grounded in KJV scripture.

Output in strict JSON:

{
  "description": "What you see...",
  "ideas": ["Idea 1", "Idea 2"],
  "recommendedVerses": [
    { "reference": "Book 1:1-3", "reason": "Why this fits..." }
  ],
  "aiParaphrases": [
    { "reference": "Book 11:3", "paraphrase": "AI paraphrase (not scripture)..." }
  ],
  "testerQuestions": [
    "Optional question we could ask this tester about the app or content..."
  ]
}
`.trim();

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text:
            (note || '') +
            '\n\nModules context: ' +
            (modules ? Object.keys(modules).join(', ') : 'n/a'),
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl },
        },
      ],
    },
  ];

  let json;
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      messages,
    });

    const raw = completion.choices[0].message.content || '';
    try {
      json = JSON.parse(raw);
    } catch {
      json = { description: raw, raw };
    }
  } catch (err) {
    console.error('Error calling OpenAI in analyzeImage:', err.message);
    json = {
      error: 'analyzeImage_openai_error',
      message: err.message,
    };
  }

  const insightRecord = {
    type: 'image',
    ts: new Date().toISOString(),
    userId,
    imageUrl,
    note,
    tags,
    result: json,
  };

  logInsight(insightRecord);
  return json;
}

module.exports = {
  analyzeNote,
  analyzeImage,
  getRecentInsightsForUser,
};
