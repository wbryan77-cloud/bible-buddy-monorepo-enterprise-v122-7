// ai/routes.js
// Central AI router for Bible Buddy:
// - POST /api/ai/tester-chat     → Bible Buddy for testers (text chat)
// - POST /api/ai/tester-image    → describe notes/plans from images (via description or optional image)
// - POST /admin/api/ai/helper    → Admin AI helper (summaries + next steps)

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const TESTER_LOG_PATH = path.join(DATA_DIR, 'tester_log.json');
const INSIGHTS_PATH = path.join(DATA_DIR, 'ai_insights.json');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(TESTER_LOG_PATH)) fs.writeFileSync(TESTER_LOG_PATH, '[]');
  if (!fs.existsSync(INSIGHTS_PATH)) fs.writeFileSync(INSIGHTS_PATH, '[]');
}
ensureFiles();

function loadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ---- OpenAI helper ----
// Requires OPENAI_API_KEY in Render → Environment
async function callOpenAIChat({ system, messages }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  const json = await res.json();
  const choice = json.choices && json.choices[0];
  const content = choice && choice.message && choice.message.content;
  return content || '';
}

// ---- Tester Chat ----
router.post('/tester-chat', express.json(), async (req, res) => {
  try {
    const { sessionId, userId, message } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const log = loadJson(TESTER_LOG_PATH, []);
    const now = new Date().toISOString();

    const lastFew = log
      .filter((r) => r.sessionId === sessionId)
      .slice(-6);

    const historyMessages = lastFew.flatMap((r) => [
      { role: 'user', content: r.userMessage || '' },
      { role: 'assistant', content: r.aiReply || '' },
    ]);

    const systemPrompt = `
You are "Bible Buddy", a warm, encouraging Christian assistant helping testers
shape and improve their Bible study notes, plans, and ideas.

Goals:
- Keep everything aligned with Christian faith, scripture, and love.
- Help organize notes into clear sections (title, scripture, 3–4 main points, application, prayer).
- Encourage the tester gently; suggest ways to make their plan clearer or more impactful.
- Always stay kind, non-judgmental, and supportive.

Keep responses concise but helpful. Offer a next step or reflection question when appropriate.
    `.trim();

    const content = await callOpenAIChat({
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: 'user', content: message },
      ],
    });

    log.push({
      t: now,
      sessionId: sessionId || null,
      userId: userId || null,
      userMessage: message,
      aiReply: content,
      kind: 'tester-chat',
    });
    saveJson(TESTER_LOG_PATH, log);

    res.json({ reply: content });
  } catch (e) {
    console.error('tester-chat error', e);
    res.status(500).json({ error: e.message || 'tester-chat failed' });
  }
});

// ---- Tester "Image" helper ----
router.post('/tester-image', express.json({ limit: '5mb' }), async (req, res) => {
  try {
    const { sessionId, userId, description, imageName, imageDataBase64 } = req.body || {};

    if (!description && !imageDataBase64) {
      return res.status(400).json({
        error: 'description or imageDataBase64 is required (for now we primarily use description).',
      });
    }

    const log = loadJson(TESTER_LOG_PATH, []);
    const now = new Date().toISOString();

    const systemPrompt = `
You are "Bible Buddy", helping a tester turn rough notes or images of plans
into structured, clear Bible study or sermon outlines.

The tester may upload an image of handwritten notes or slides, and they will provide
a short description of what the image contains. Use that description to:

- Extract the key ideas.
- Suggest a clean structure: Title, Scripture(s), Main points (3–4), Application, Prayer.
- Suggest improvements: clarity, flow, adding scripture, making it more practical.

Respond with clear headings and bullet points.
    `.trim();

    const userText = `
Tester description of their image/notes:

"${description || '(no description)'}"

If imageDataBase64 is present, assume it roughly matches this description and do your best
based on the description.
    `;

    const content = await callOpenAIChat({
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    });

    log.push({
      t: now,
      kind: 'tester-image',
      sessionId: sessionId || null,
      userId: userId || null,
      description: description || null,
      imageName: imageName || null,
      imageDataBase64: imageDataBase64 ? '(stored for now)' : null,
      aiReply: content,
    });
    saveJson(TESTER_LOG_PATH, log);

    res.json({ reply: content });
  } catch (e) {
    console.error('tester-image error', e);
    res.status(500).json({ error: e.message || 'tester-image failed' });
  }
});

// ---- Admin AI Helper ----
router.post('/helper', express.json(), async (req, res) => {
  try {
    const { selftest, providers } = req.body || {};

    const insights = loadJson(INSIGHTS_PATH, []);
    const now = new Date().toISOString();

    const systemPrompt = `
You are the Admin AI helper for the Bible Buddy app.

You receive:
- A self-test result (health, version, queue).
- A provider summary (email/SMS/queue).
- Optionally, you may have past insight summaries.

Your job:
- Explain in plain, concise language what the current status is.
- Identify the top 3–5 recommended next steps for the admin.
- Keep suggestions practical, non-technical if possible, with clear reasons.
- If providers are missing keys (Resend/Twilio), call that out as a priority.
- If everything is OK, suggest product/testing steps instead of technical work.

Return JSON in this shape:
{
  "summary": "short paragraph",
  "actions": [
    "First recommended action...",
    "Second recommended action..."
  ]
}
    `.trim();

    const context = `
Current selftest:
${JSON.stringify(selftest || {}, null, 2)}

Current providers:
${JSON.stringify(providers || {}, null, 2)}

Recent past insights (summaries only):
${insights.slice(-5).map(i => '- ' + (i.summary || '')).join('\n')}
    `;

    const raw = await callOpenAIChat({
      system: systemPrompt,
      messages: [{ role: 'user', content: context }],
    });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { summary: raw, actions: [] };
    }

    const record = {
      t: now,
      selftest: selftest || null,
      providers: providers || null,
      summary: parsed.summary || '',
      actions: parsed.actions || [],
    };
    insights.push(record);
    saveJson(INSIGHTS_PATH, insights);

    res.json({
      summary: parsed.summary || '',
      actions: parsed.actions || [],
    });
  } catch (e) {
    console.error('admin helper error', e);
    res.status(500).json({ error: e.message || 'admin helper failed' });
  }
});

module.exports = router;
