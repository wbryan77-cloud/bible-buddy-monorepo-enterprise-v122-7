// services/contentInsight.js
// Bible Buddy Content Insight Engine
//
// - analyzes notes / outlines / ideas from testers, pastors, teachers, users
// - (optionally) looks at image URLs (slides, whiteboards, screenshots)
// - suggests KJV verses line upon line, precept upon precept
// - adds AI study-paraphrases that try to reflect Hebrew/Greek sense
//   (clearly marked as "AI paraphrase, not scripture")
// - logs insights so Buddy + Admin can learn from them before full launch

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { getSnapshot } = require('./projectBrain');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INSIGHTS_LOG = path.join(__dirname, '..', 'data', 'content-insights.jsonl');

// ensure data dir exists
try {
  fs.mkdirSync(path.join(__dirname, '..', 'data'));
} catch (_) {}

/**
 * Append an insight record to the JSONL log.
 */
function logInsight(entry) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFile(INSIGHTS_LOG, line, (err) => {
    if (err) console.error('Error logging content insight:', err.message);
  });
}

/**
 * Read recent insights for a user (for Buddy auto-learning).
 */
function getRecentInsightsForUser(userId, limit) {
  try {
    const text = fs.readFileSync(INSIGHTS_LOG, 'utf8');
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
 * Analyze a text note / outline / idea.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.note
 * @param {string[]} [params.chosenVerses]
 * @param {string[]} [params.tags] e.g. ["tester","pastor","phase1","sermon"]
 */
async function analyzeNote({ userId, note, chosenVerses = [], tags = [] }) {
  const snapshot = getSnapshot();
  const { modules, phases, competitors, providers } = snapshot;

  const systemPrompt = `
You are the CONTENT HELPER for the Bible Buddy app.

You help testers, pastors, teachers, and regular users refine ideas
"line upon line, precept upon precept".

You know:
- Modules: KJV_CORE, HOLY_DAYS_LEV_23, DEUT_28_MODULE, BIBLE_BUDDY_AI,
  THERAPY_HEALTH, SERMON_BUILDER, TESTING_PHASES, AVATARS_PERSONAS.
- Phases: Phase 1 (Core Bible Buddy), Phase 2 (Health & Therapy),
  Phase 3 (Sermon Builder).
- Competitor patterns: bible apps (streaks, deep study), therapy apps
  (check-ins, journaling), health apps (habits, watch/sleep).
- Providers: Bible text API, food scan API, health metrics API (if configured).

The note may come from:
- a tester giving feedback,
- a pastor/teacher planning a sermon or Bible study,
- or a user writing a reflection (sermon, therapy, or health-related).

Your job:
- Read the note carefully.
- If tags include "pastor" or "teacher", treat this as SERMON or teaching prep.
- If tags include "tester", also think about how the app could better serve this use case.
- Respect that KJV is the official translation we quote.
- If the user supplied chosenVerses, say whether they fit well or suggest better-aligned alternatives.
- Recommend 3–10 KJV passages (book chapter:verse or small ranges) that best support the idea.
- For some of those passages, provide an "AI paraphrase" that tries to reflect the
  sense of the underlying Hebrew/Aramaic/Greek based on mainstream scholarship.
  These paraphrases must be clearly labeled as "AI paraphrase, not scripture"
  and must never claim to be more pure or more authoritative than the KJV text.
- Keep suggestions "line upon line, precept upon precept" – do not rip verses out of context.
- Be gentle and balanced when dealing with sensitive passages (like Deuteronomy 28).

Output in strict JSON with this structure:
{
  "summary": "...short summary of what the note is about...",
  "fitAssessment": "...how well chosenVerses fit (if any)...",
  "recommendedVerses": [
    { "reference": "Book 1:1-3", "reason": "Why this fits" }
  ],
  "aiParaphrases": [
    {
      "reference": "Book 1:1-3",
      "paraphrase": "AI paraphrase, not scripture: ...",
      "note": "Brief comment on key Hebrew/Greek ideas if relevant."
    }
  ],
  "appFeedbackQuestions": [
    "...short question to ask the tester/pastor about how Bible Buddy can improve...",
    "..."
  ],
  "notes": "...extra advice on tone, structure, or missing ideas..."
}
`;

  const userPayload = {
    userId,
    note,
    chosenVerses,
    tags,
    modules,
    phases,
    competitors,
    providers
  };

  const completion = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(userPayload, null, 2) }
    ]
  });

  const content = completion.choices[0].message.content || '';
  let json;
  try {
    json = JSON.parse(content);
  } catch (_e) {
    json = { raw: content };
  }

  const insightRecord = {
    type: 'note',
    ts: new Date().toISOString(),
    userId,
    note,
    chosenVerses,
    tags,
    result: json
  };

  logInsight(insightRecord);

  return json;
}

/**
 * Analyze an image + optional text note.
 * - imageUrl should be a publicly accessible URL (upload handled by client).
 * - used by testers/pastors to send whiteboard photos, slide decks, etc.
 */
async function analyzeImage({ userId, imageUrl, note = '', tags = [] }) {
  const snapshot = getSnapshot();
  const { modules } = snapshot;

  const systemPrompt = `
You are the CONTENT HELPER for Bible Buddy, looking at an image and optional note.

The image may contain slides, whiteboard notes, sermon outlines, or app screenshots
from testers, pastors, teachers, or users.

Your goals:
- Briefly describe what you see.
- Extract the main Bible ideas or themes.
- Recommend 3–8 KJV passages that support those themes line upon line, precept upon precept.
- For some of those passages, also provide "AI paraphrases" that attempt to reflect
  the sense of the underlying Hebrew/Aramaic/Greek, clearly labeled
  as "AI paraphrase, not scripture".
- If tags include "tester", also suggest 1–3 short questions we could ask them about
  how well Bible Buddy is helping (or not helping).

Output in strict JSON:
{
  "description": "...what you see...",
  "ideas": ["...", "..."],
  "recommendedVerses": [
    { "reference": "Book 1:1-3", "reason": "..." }
  ],
  "aiParaphrases": [
    {
      "reference": "Book 1:1-3",
      "paraphrase": "AI paraphrase, not scripture: ...",
      "note": "Optional brief comment."
    }
  ],
  "testerQuestions": [
    "...optional question about the app experience...",
    "..."
  ]
}
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: note || 'Please analyze this image for Bible Buddy.' },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  ];

  const completion = await client.chat.completions.create({
    model: 'gpt-4.1', // multimodal with vision
    temperature: 0.3,
    messages
  });

  const content = completion.choices[0].message.content || '';
  let json;
  try {
    json = JSON.parse(content);
  } catch (_e) {
    json = { raw: content };
  }

  const insightRecord = {
    type: 'image',
    ts: new Date().toISOString(),
    userId,
    imageUrl,
    note,
    tags,
    result: json
  };

  logInsight(insightRecord);

  return json;
}

module.exports = {
  analyzeNote,
  analyzeImage,
  getRecentInsightsForUser
};
