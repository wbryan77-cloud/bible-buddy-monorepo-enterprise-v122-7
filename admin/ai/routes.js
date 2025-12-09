// admin/ai/routes.js
// Central AI router for Bible Buddy:
//
//  - /admin/ai/tester-chat   → Bible Buddy for testers (text chat)
//  - /admin/ai/picture-plan  → Turn described notes/plans from images into an outline
//  - /admin/ai/admin-helper  → Admin AI helper (dashboard guidance; future)
//
// This version actually calls OpenAI and logs tester activity so
// the Admin dashboard can review how people are using the Lab.

const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const router = express.Router();

// ===== Config & data paths =====
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const TESTER_LOG_PATH = path.join(DATA_DIR, "tester_log.json");
const INSIGHTS_PATH = path.join(DATA_DIR, "insights.json");

// Simple “model switch” via env:
//   BIBLE_BUDDY_MODEL_MODE=pro → gpt-5.1
//   (anything else)            → gpt-4.1-mini
const MODEL_STANDARD = "gpt-4.1-mini";
const MODEL_PRO = "gpt-5.1";

function getActiveModel() {
  const mode = (process.env.BIBLE_BUDDY_MODEL_MODE || "").toLowerCase();
  const usePro = mode === "pro";
  return {
    model: usePro ? MODEL_PRO : MODEL_STANDARD,
    label: usePro ? "Pro mode · gpt-5.1" : "Standard mode · gpt-4.1-mini",
  };
}

// ===== Helpers for JSON files =====

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TESTER_LOG_PATH)) {
    fs.writeFileSync(TESTER_LOG_PATH, "[]");
  }
  if (!fs.existsSync(INSIGHTS_PATH)) {
    fs.writeFileSync(INSIGHTS_PATH, "[]");
  }
}

function loadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.warn("Error reading JSON", p, e.message);
    return fallback;
  }
}

function saveJson(p, data) {
  try {
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn("Error writing JSON", p, e.message);
  }
}

// ===== OpenAI call helper (Responses API style) =====

async function callBibleBuddy(messages, purpose) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const { model } = getActiveModel();

  const systemPrompt = `
You are **Bible Buddy**, a gentle, Scripture-rooted AI companion for Christians.

High-level goals:
- Help testers turn messy notes or questions into clear devotional plans.
- Stay rooted in the Bible, especially when users mention “wilderness, tribulation, peace”.
- Encourage, never condemn. Point people back to God, His Word, and prayer.
- You are NOT a doctor, therapist, or lawyer. Do not give professional advice.

When giving an outline or plan:
- Suggest weeks / days / sessions with short titles.
- Include key Scripture references (book, chapter:verse) that fit the theme.
- Keep the tone kind, hopeful, and practical.
- Keep answers concise enough to read on a phone, but still useful.

Always end long answers with a short closing prayer sentence or a reflection question.
`;

  const body = {
    model,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages,
    ],
    // We don't need tool calls here yet.
  };

  const res = await axios.post("https://api.openai.com/v1/responses", body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    timeout: 45000,
  });

  const text =
    res.data && res.data.output && res.data.output[0] && res.data.output[0].content
      ? res.data.output[0].content[0].text
      : "";

  // Log to insights for later admin review
  try {
    ensureFiles();
    const insights = loadJson(INSIGHTS_PATH, []);
    insights.push({
      time: new Date().toISOString(),
      purpose,
      model,
      promptPreview: messages
        .map((m) => `${m.role}: ${typeof m.content === "string" ? m.content.slice(0, 240) : ""}`)
        .join(" | "),
      replyPreview: text.slice(0, 280),
    });
    saveJson(INSIGHTS_PATH, insights);
  } catch (e) {
    console.warn("Error logging insight:", e.message);
  }

  return text;
}

// ===== Routes =====

// Simple ping (optional)
router.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 1) Tester chat
router.post("/tester-chat", async (req, res) => {
  ensureFiles();
  const userMessage = (req.body && req.body.message) || "";

  if (!userMessage.trim()) {
    return res.status(400).json({ error: "Missing message" });
  }

  const { label } = getActiveModel();

  try {
    const reply = await callBibleBuddy(
      [
        {
          role: "user",
          content: userMessage,
        },
      ],
      "tester-chat"
    );

    // Log tester message + reply
    const log = loadJson(TESTER_LOG_PATH, []);
    log.push({
      time: new Date().toISOString(),
      type: "chat",
      message: userMessage,
      reply,
    });
    saveJson(TESTER_LOG_PATH, log);

    res.json({
      reply,
      modeLabel: label,
    });
  } catch (err) {
    console.error("tester-chat error:", err.message);
    const msg =
      err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message || JSON.stringify(err.response.data.error)
        : err.message;
    res.status(500).json({
      error: "AI error",
      detail: msg,
      modeLabel: label,
    });
  }
});

// 2) Picture → Plan (for now: description + optional filename, no image bytes)
router.post("/picture-plan", async (req, res) => {
  ensureFiles();
  const description = (req.body && req.body.description) || "";
  const imageFilename = (req.body && req.body.imageFilename) || null;

  if (!description.trim()) {
    return res.status(400).json({ error: "Missing description" });
  }

  const { label } = getActiveModel();

  const userPrompt = `
A tester is using Bible Buddy's "Picture → Plan" feature.

- They may have uploaded an image of notes: ${imageFilename || "no filename provided"}.
- You **cannot see the image**; rely fully on their description of the notes.

Task:
- Turn their description into a structured devotional or Bible study plan.
- Organize it into weeks / sessions / clear steps.
- Pull in Scripture references that fit their theme (especially wilderness, tribulation, peace when relevant).
- Keep the outline practical and easy to follow.

Tester description:
"""${description}"""
`;

  try {
    const outline = await callBibleBuddy(
      [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      "picture-plan"
    );

    // Log
    const log = loadJson(TESTER_LOG_PATH, []);
    log.push({
      time: new Date().toISOString(),
      type: "picture-plan",
      description,
      imageFilename,
      outline,
    });
    saveJson(TESTER_LOG_PATH, log);

    res.json({
      outline,
      modeLabel: label,
    });
  } catch (err) {
    console.error("picture-plan error:", err.message);
    const msg =
      err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message || JSON.stringify(err.response.data.error)
        : err.message;
    res.status(500).json({
      error: "AI error",
      detail: msg,
      modeLabel: label,
    });
  }
});

// 3) Admin helper (simple placeholder for now)
//    Later this can read tester_log.json and give guidance.
router.post("/admin-helper", async (req, res) => {
  const { label } = getActiveModel();
  try {
    const insights = loadJson(INSIGHTS_PATH, []);
    const lastFew = insights.slice(-10);

    const prompt = `
You are the Admin helper for Bible Buddy.

You see a short log of recent tester interactions (very summarized).
Give 3–5 short bullets for the human admin:
- What seems to be working well?
- What might be confusing for testers?
- One suggestion to improve the Lab in the next iteration.

Recent logs (summarized):
${JSON.stringify(lastFew, null, 2)}
`;

    const reply = await callBibleBuddy(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      "admin-helper"
    );

    res.json({ guidance: reply, modeLabel: label });
  } catch (e) {
    console.error("admin-helper error:", e.message);
    res.status(500).json({
      error: "Admin helper failed",
      detail: e.message,
      modeLabel: label,
    });
  }
});

module.exports = router;
