// lib/ai/index.js
const axios = require('axios');

const PROVIDER = String(process.env.LLM_PROVIDER || 'openai').toLowerCase();
const API_KEY  = process.env.LLM_API_KEY || '';
const MODEL    = process.env.LLM_MODEL || 'gpt-4o-mini';
const BASE     = process.env.LLM_API_BASE || (
  PROVIDER === 'openai'
    ? 'https://api.openai.com/v1'
    : 'https://api.openai.com/v1'
);

function toOpenAIMessages(messages) {
  return messages.map(m => ({ role: m.role, content: m.content }));
}

async function chat(messages) {
  if (!API_KEY) {
    return { text: 'LLM not configured. Admin: set LLM_PROVIDER, LLM_API_KEY, LLM_MODEL in Environment.' };
  }
  try {
    const resp = await axios.post(
      `${BASE}/chat/completions`,
      { model: MODEL, messages: toOpenAIMessages(messages), temperature: 0.3 },
      { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    const choice = resp.data?.choices?.[0];
    const text = choice?.message?.content || '(no content)';
    return { text };
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message;
    return { text: `LLM error: ${msg}` };
  }
}

module.exports = { chat };
