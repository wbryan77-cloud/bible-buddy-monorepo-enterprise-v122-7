#!/usr/bin/env node
const DEPLOY_URL = process.env.DEPLOY_URL || 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com';
const MESSAGE = 'What does Logos mean in John 1:1?';
const MASK = "I'm here with you. Tell me a little more.";
const MAX_ATTEMPTS = 12;
const WAIT_MS = 30000;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const out = { deployUrl: DEPLOY_URL, attempts: [] };
  for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
    const attempt = { n: i, at: new Date().toISOString() };
    try {
      const healthRes = await fetch(`${DEPLOY_URL}/health`, { signal: AbortSignal.timeout(30000) });
      attempt.healthStatus = healthRes.status;
      if (healthRes.status === 200) {
        const chatRes = await fetch(`${DEPLOY_URL}/buddy/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'demo-user',
            mode: 'COMPANION',
            personaKey: 'ADAPTIVE_COMPANION',
            message: MESSAGE,
          }),
          signal: AbortSignal.timeout(120000),
        });
        attempt.chatStatus = chatRes.status;
        const data = await chatRes.json();
        attempt.dataOk = data.ok;
        attempt.error = data.error || null;
        const reply = data.reply && typeof data.reply === 'object' ? data.reply.reply : data.reply;
        attempt.replyLength = String(reply || '').length;
        attempt.replyPreview = String(reply || '').slice(0, 300);
        attempt.isMask = String(reply || '') === MASK;
        attempt.hasLogos = /logos|word|john 1:1/i.test(String(reply || ''));
        attempt.openAiCalled = data.reply?.runtime?.openAiCalled ?? data.reply?.coreDebug?.openaiCalled ?? null;
        attempt.pass =
          chatRes.status === 200 &&
          data.ok === true &&
          attempt.replyLength > 20 &&
          !attempt.isMask &&
          attempt.hasLogos;
        out.attempts.push(attempt);
        if (attempt.pass || (chatRes.status === 200 && !data.error?.includes('answerVerifier'))) {
          out.final = attempt;
          break;
        }
      }
    } catch (e) {
      attempt.error = String(e.message || e);
      out.attempts.push(attempt);
    }
    if (i < MAX_ATTEMPTS) await sleep(WAIT_MS);
  }
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.final?.pass ? 0 : 1);
}

main();
