// admin/ai/routes.js
// Central AI router for Bible Buddy
// - /admin/ai/tester-chat   → Bible Buddy for testers (text chat)
// - /admin/ai/picture-plan  → Describe notes/plans from images (phase 1: description-based)
// - /admin/ai/helper        → Admin AI helper (dashboard guidance)

const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const router = express.Router();

// ===== AI config =====

// Your OpenAI API key and model
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
// default to gpt-4.1-mini; you can override in Render env with OPENAI_MODEL
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

// Simple guard: if no key, we’ll return a friendly error instead of crashing
function ensureKey() {
  if (!OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY is not set');
    err.code = 'NO_API_KEY';
    throw err;
  }
}

// ===== Data files where AI can “learn” tester patterns =====

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const TESTER_LOG_PATH = path.join(DATA_DIR, 'tester_log.json');
const INSIGHTS_PATH = path.join(DATA_DIR, 'insights.json');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(TESTER_LOG_PATH)) fs.writeFileSync(TESTER_LOG_PATH, '[]');
  if (!fs.existsSync(INSIGHTS_PATH)) fs.writeFileSync(INSIGHTS_PATH, '[]');
}

function loadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn('Failed to read JSON', p, e.message);
    return fallback;
  }
}

function saveJson(p, data) {
  try {
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write JSON', p, e.message);
  }
}

ensureFiles();

// ===== Helper: call OpenAI Responses API =====

async function callOpenAIChat(systemPrompt, userMessage, extraContext) {
  ensureKey();

  const body = {
    model: OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: systemPrompt
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: userMessage
          }
        ]
      }
    ],
    // You can tweak this later if you want longer/shorter answers
    max_output_tokens: 800,
    metadata: extraContext || {}
  };

  try {
    const resp = await axios.post('https://api.openai.com/v1/responses', body, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const output = resp.data;
    // New Responses API: text is in output.output[0].content[0].text
    const first = output.output && output.output[0];
    const firstContent = first && first.content && first.content[0];
    const text = firstContent && firstContent.text
      ? firstContent.text
      : JSON.stringify(output);

    return { text, raw: output };
  } catch (e) {
    // Try to surface a helpful error
    if (e.response && e.response.data && e.response.data.error) {
      const apiErr = e.response.data.error;
      if (e.response.status === 429 || apiErr.type === 'insufficient_quota') {
        return {
          text:
            'Bible Buddy hit an OpenAI usage limit. Please check your plan/credits on the OpenAI dashboard, then try again.',
          raw: apiErr
        };
      }
      return {
        text:
          `OpenAI error: ${apiErr.message || apiErr.type || 'Unknown error'}.`,
        raw: apiErr
      };
    }

    console.error('OpenAI call failed:', e.message);
    return {
      text:
        'Sorry, Bible Buddy had trouble reaching the AI service. Please try again in a moment.',
      raw: { message: e.message }
    };
  }
}

// ===== 1) Tester chat endpoint =====
//
// Frontend: Bible Buddy Lab chat box calls POST /admin/ai/tester-chat
// Body: { message: "text the tester typed" }

router.post('/tester-chat', async (req, res) => {
  const message = (req.body && req.body.message) || '';

  if (!message.trim()) {
    return res.json({
      ok: false,
      reply: 'Please type something for Bible Buddy to respond to 🙂',
      error: 'EMPTY_MESSAGE'
    });
  }

  const systemPrompt = `
You are "Bible Buddy" – an AI devotional coach and test guide for a Christian Bible app.

Goals:
- Encourage and support testers as they share notes and plans.
- Help them structure simple devotionals, Bible study plans, and reflections.
- Always stay aligned with Scripture, kindness, and clarity.
- Never give medical, legal, or financial advice.

Conversation style:
- Warm, encouraging, and clear.
- Ask short follow-up questions when helpful.
- Suggest simple next steps (e.g., "Would you like an outline with title, Scripture, points, and prayer?").
  `.trim();

  const context = {
    endpoint: 'tester-chat',
    timestamp: new Date().toISOString()
  };

  const { text, raw } = await callOpenAIChat(systemPrompt, message, context);

  // Log this exchange so the Admin can review patterns later
  const log = loadJson(TESTER_LOG_PATH, []);
  log.push({
    time: new Date().toISOString(),
    type: 'chat',
    message,
    reply: text
  });
  saveJson(TESTER_LOG_PATH, log);

  return res.json({
    ok: true,
    reply: text,
    model: OPENAI_MODEL,
    meta: {
      finish_reason:
        raw && raw.output && raw.output[0] && raw.output[0].stop_reason
          ? raw.output[0].stop_reason
          : null
    }
  });
});

// ===== 2) Picture → Plan endpoint =====
//
// For now this uses the tester's description + a simple note that an image was supplied.
// You can later upgrade this to real image understanding using the Vision APIs.

router.post('/picture-plan', async (req, res) => {
  const description = (req.body && req.body.description) || '';
  const hasImage = !!(req.body && req.body.imageMeta);

  if (!description.trim() && !hasImage) {
    return res.json({
      ok: false,
      outline:
        'Please upload a picture or type a short description of your notes, and I will help turn it into a simple Bible plan.',
      error: 'NO_INPUT'
    });
  }

  const userText = `
Here is what the tester shared:

Description: ${description || '(no text description provided)'}
Image attached: ${hasImage ? 'yes' : 'no (text only)'}

Please suggest a short, clear Bible-based plan or devotional outline they could build from.
  `.trim();

  const systemPrompt = `
You are "Bible Buddy" helping testers turn raw notes or pictures into a simple Bible-based plan.

When you answer, use this structure:
1) Title
2) Scripture(s)
3) 3–5 simple points
4) A short reflection question
5) A short closing prayer

Keep it friendly and encouraging.
  `.trim();

  const context = {
    endpoint: 'picture-plan',
    timestamp: new Date().toISOString()
  };

  const { text } = await callOpenAIChat(systemPrompt, userText, context);

  // Log
  const log = loadJson(TESTER_LOG_PATH, []);
  log.push({
    time: new Date().toISOString(),
    type: 'picture-plan',
    description,
    hasImage,
    outline: text
  });
  saveJson(TESTER_LOG_PATH, log);

  return res.json({
    ok: true,
    outline: text,
    model: OPENAI_MODEL
  });
});

// ===== 3) Admin helper endpoint =====
//
// Admin dashboard calls POST /admin/ai/helper with a small status snapshot.
// We turn that into simple guidance.

router.post('/helper', async (req, res) => {
  const snapshot = req.body || {};

  // If no API key, just show a graceful hint on the dashboard
  if (!OPENAI_API_KEY) {
    return res.json({
      ok: false,
      advice:
        'To enable AI guidance here, add your OPENAI_API_KEY in Render → Environment, then refresh this page.',
      error: 'NO_API_KEY'
    });
  }

  const statusText = JSON.stringify(snapshot, null, 2);

  const systemPrompt = `
You are the "Bible Buddy Admin Guide" – a friendly assistant helping the product owner understand tester activity and next steps.

- Be concise (2–5 bullet points).
- Highlight any obvious configuration issues (like missing keys).
- Suggest 1–3 simple actions they can take this week to improve the app.
- Keep the tone encouraging, not alarming.
  `.trim();

  const userMessage = `
Here is the current status snapshot from the Admin dashboard:

${statusText}

Please give short, practical guidance.
  `.trim();

  const context = {
    endpoint: 'admin-helper',
    timestamp: new Date().toISOString()
  };

  const { text } = await callOpenAIChat(systemPrompt, userMessage, context);

  // Save as an "insight" for future reference
  const insights = loadJson(INSIGHTS_PATH, []);
  insights.push({
    time: new Date().toISOString(),
    snapshot,
    advice: text
  });
  saveJson(INSIGHTS_PATH, insights);

  return res.json({
    ok: true,
    advice: text,
    model: OPENAI_MODEL
  });
});

module.exports = router;
