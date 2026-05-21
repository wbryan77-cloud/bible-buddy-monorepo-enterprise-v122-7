const express = require('express');

const router = express.Router();

const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Spanish / Español',
  fr: 'French / Français',
  pt: 'Portuguese / Português',
  ht: 'Haitian Creole / Kreyòl Ayisyen',
  ar: 'Arabic / العربية',
  he: 'Hebrew / עברית',
  el: 'Greek / Ελληνικά',
};

const VOICE_MODES = {
  companion: {
    label: 'Companion',
    pacing: 'natural, warm, conversational, one gentle question at a time',
  },
  prayer: {
    label: 'Prayer',
    pacing: 'slow, reverent, soft, with short pauses and no rush',
  },
  whisper: {
    label: 'Whisper',
    pacing: 'quiet, brief, gentle, emotionally safe, low intensity',
  },
  study: {
    label: 'Study',
    pacing: 'clear, thoughtful, Scripture-grounded, concise context',
  },
  ambient: {
    label: 'Ambient',
    pacing: 'minimal, calm, only speak when helpful, respect silence',
  },
};

function safeChoice(value, choices, fallback) {
  return Object.prototype.hasOwnProperty.call(choices, value) ? value : fallback;
}

function buildRealtimeInstructions({ userId, language, voiceMode, memorySummary }) {
  const langName = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.en;
  const mode = VOICE_MODES[voiceMode] || VOICE_MODES.companion;

  return `
You are Bible Buddy in a full-duplex realtime voice session.

Permanent North Star:
- Meet the user where they are.
- Listen before instructing.
- Be warm, calm, conversational, emotionally safe, and not pushy.
- Gently guide toward truth, peace, Scripture, prayer, and the God of the Bible over time.
- The God of the Bible and the lessons/truth of Scripture remain the foundation.
- Do not be shame-based, manipulative, robotic, or overly religious in a forced way.

Language:
- Primary spoken language for this session: ${langName}.
- Reply in the user's chosen language unless they ask to switch.
- If quoting Scripture, prefer KJV in English when requested; otherwise explain the reference in the chosen language and clearly label it as Scripture/reference.

Voice mode:
- Mode: ${mode.label}.
- Pacing: ${mode.pacing}.
- Use natural pauses. Short spoken responses are better than long monologues.
- Ask only one gentle follow-up question at a time.

Full-duplex behavior:
- Expect interruptions. If the user interrupts, stop and listen.
- If the user pauses, do not rush to fill silence.
- If the user sounds overwhelmed, slow down and comfort first.
- If the user asks for prayer, enter a calm prayer mode.
- If the user asks for Bible study, cite Scripture and distinguish Scripture from your explanation.

Memory-aware behavior:
- Use only the memory summary explicitly provided to this session.
- Do not claim to remember anything that was not provided.
- Do not store new memory unless the product layer asks the user for permission.
- Current memory summary: ${memorySummary || 'No user-approved memory summary supplied.'}

Safety:
- You are not a therapist, doctor, pastor, emergency service, or replacement for God, Scripture, family, church/community, or professional care.
- Do not diagnose medical or mental health conditions.
- If self-harm or immediate danger appears, encourage emergency help and 988 in the U.S.
- For concerning health readings, tell the truth and encourage professional care when appropriate.

Response style:
- Sound like a real companion, not an FAQ bot.
- Be concise, present, calm, and emotionally intelligent.
- It is okay to say: “I’m here. Take your time.”
- Do not over-quote Scripture when the user simply needs to be heard.

User/session:
- userId: ${userId || 'anonymous'}
`.trim();
}

function buildRealtimePayload({ model, voice, userId, language, voiceMode, memorySummary, vad }) {
  return {
    session: {
      type: 'realtime',
      model,
      audio: {
        input: {
          turn_detection: {
            type: 'server_vad',
            threshold: vad.threshold,
            prefix_padding_ms: vad.prefixPaddingMs,
            silence_duration_ms: vad.silenceDurationMs,
          },
        },
        output: { voice },
      },
      instructions: buildRealtimeInstructions({ userId, language, voiceMode, memorySummary }),
    },
  };
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
    const language = safeChoice(body.language || 'en', SUPPORTED_LANGUAGES, 'en');
    const voiceMode = safeChoice(body.voiceMode || 'companion', VOICE_MODES, 'companion');
    const memorySummary = String(body.memorySummary || '').slice(0, 1200);
    const model = body.model || process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview';
    const voice = body.voice || process.env.OPENAI_REALTIME_VOICE || 'alloy';

    const vad = {
      threshold: Number(body?.vad?.threshold ?? process.env.REALTIME_VAD_THRESHOLD ?? 0.5),
      prefixPaddingMs: Number(body?.vad?.prefixPaddingMs ?? process.env.REALTIME_VAD_PREFIX_MS ?? 300),
      silenceDurationMs: Number(body?.vad?.silenceDurationMs ?? process.env.REALTIME_VAD_SILENCE_MS ?? 750),
    };

    const payload = buildRealtimePayload({
      model,
      voice,
      userId,
      language,
      voiceMode,
      memorySummary,
      vad,
    });

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
          language,
          languageLabel: SUPPORTED_LANGUAGES[language],
          voiceMode,
          voiceModeLabel: VOICE_MODES[voiceMode].label,
          vad,
          realtimeUrl: `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
          session,
          instructionsVersion: 'bible-buddy-full-duplex-v2',
          capabilities: {
            fullDuplex: true,
            interruptionHandling: true,
            serverVad: true,
            multilingual: true,
            prayerMode: true,
            whisperMode: true,
            ambientMode: true,
          },
          safety: {
            sessionBased: true,
            microphonePermissionRequired: true,
            notTherapyOrMedicalCare: true,
            userCanStopAnytime: true,
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

router.get('/capabilities', (req, res) => {
  res.json({
    ok: true,
    supportedLanguages: SUPPORTED_LANGUAGES,
    voiceModes: VOICE_MODES,
    defaultModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
    defaultVoice: process.env.OPENAI_REALTIME_VOICE || 'alloy',
  });
});

module.exports = router;
