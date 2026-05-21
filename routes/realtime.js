const express = require('express');

const router = express.Router();

function buildRealtimeInstructions(userId) {
  return `
You are Bible Buddy in a realtime voice session.

North Star:
- Meet the user where they are.
- Listen before instructing.
- Be warm, calm, conversational, and emotionally safe.
- Gently guide toward truth, peace, Scripture, prayer, and the God of the Bible over time.
- Do not be pushy, shame-based, manipulative, or robotic.

Voice behavior:
- Keep spoken responses concise and natural.
- Ask one gentle follow-up at a time.
- Pause when the user needs space.
- If the user asks to pray, use a calm prayerful tone.
- If the user wants Bible study, cite Scripture and distinguish Scripture from explanation.

Safety:
- You are not a therapist, doctor, pastor, or emergency service.
- Do not diagnose medical or mental health conditions.
- If self-harm or immediate danger appears, encourage emergency help and 988 in the U.S.
- For concerning health readings, tell the truth and encourage professional care when appropriate.

User/session:
- userId: ${userId || 'anonymous'}
`.trim();
}

async function createRealtimeSessionVia(endpoint, payload, apiKey) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}

  if (!response.ok) {
    const error = new Error(json?.error?.message || text || `Realtime session failed: ${response.status}`);
    error.status = response.status;
    error.body = json || text;
    throw error;
  }

  return json || { raw: text };
}

// POST /api/realtime/session
// Creates a short-lived realtime session payload for browser/mobile voice sessions.
// Keep OPENAI_API_KEY on the server. The client receives only short-lived credentials.
router.post('/session', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: 'OPENAI_API_KEY is not configured.',
        fallback: 'Use text companion chat until realtime voice is configured.',
      });
    }

    const body = req.body || {};
    const userId = body.userId || 'anonymous';
    const model = body.model || process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview';
    const voice = body.voice || process.env.OPENAI_REALTIME_VOICE || 'alloy';

    const payload = {
      session: {
        type: 'realtime',
        model,
        audio: {
          output: { voice },
        },
        instructions: buildRealtimeInstructions(userId),
      },
    };

    const configuredEndpoint = process.env.OPENAI_REALTIME_EPHEMERAL_ENDPOINT;
    const endpoints = configuredEndpoint
      ? [configuredEndpoint]
      : [
          'https://api.openai.com/v1/realtime/client_secrets',
          'https://api.openai.com/v1/realtime/sessions',
        ];

    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const session = await createRealtimeSessionVia(endpoint, payload, apiKey);
        return res.json({
          ok: true,
          provider: 'openai_realtime',
          endpoint,
          model,
          voice,
          session,
          instructionsVersion: 'bible-buddy-realtime-v1',
          safety: {
            sessionBased: true,
            microphonePermissionRequired: true,
            notTherapyOrMedicalCare: true,
          },
        });
      } catch (error) {
        lastError = error;
      }
    }

    return res.status(lastError?.status || 502).json({
      ok: false,
      error: lastError?.message || 'Realtime session creation failed.',
      detail: lastError?.body || null,
      fallback: 'Use /buddy/chat or /buddy/stream until realtime voice is available.',
    });
  } catch (error) {
    console.error('Realtime session error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
