#!/usr/bin/env node
/**
 * Phase 4G — Production parity verification (local baseline + optional DEPLOY_URL).
 * Usage: DEPLOY_URL=https://your-service.onrender.com node scripts/runPhase4GProductionParityVerification.js
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { containsDiagnosticLeak } = require('../services/doctrineErrorFirewall');
const { containsMemoryDenial } = require('../services/doctrineLivePathHandlers');
const { validateStrictPhraseGuard } = require('../services/doctrineStrictPhraseGuard');
const { getRuntimeHealthSnapshot } = require('../services/runtimeHealthMonitor');

const ROOT = path.join(__dirname, '..');
const DEPLOY_URL = (process.env.DEPLOY_URL || process.env.RENDER_URL || 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com').replace(/\/$/, '');
const ACTS10_EXACT =
  'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods.';
const BAD_USER = ['AI service unavailable', 'connection_error', 'manual Render redeploy', 'safe corpus fallback', 'trouble reaching the AI'];

function fp(key = '') {
  const k = String(key);
  if (!k) return { present: false };
  return { present: true, len: k.length, sha256_8: crypto.createHash('sha256').update(k).digest('hex').slice(0, 8) };
}

function collectEnv(label) {
  return {
    label,
    NODE_ENV: process.env.NODE_ENV || null,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini (default)',
    OPENAI_API_KEY: fp(process.env.OPENAI_API_KEY),
    BIBLEBUDDY_CHAT_TIMEOUT_MS: process.env.BIBLEBUDDY_CHAT_TIMEOUT_MS || '55000 (default)',
    BIBLEBUDDY_STATE_TTL_MS: process.env.BIBLEBUDDY_STATE_TTL_MS || '86400000 (default)',
    BIBLEBUDDY_DISABLE_OPENAI: process.env.BIBLEBUDDY_DISABLE_OPENAI || 'unset',
    BUDDY_RUNTIME: process.env.BUDDY_RUNTIME || 'unset',
    BUDDY_TEMPLATE_PROSE: process.env.BUDDY_TEMPLATE_PROSE || 'unset',
    BUDDY_DISABLE_STUDY_FALLBACK: process.env.BUDDY_DISABLE_STUDY_FALLBACK || 'unset',
    startCommand: 'node server.js',
    dataDir: path.join(ROOT, 'data'),
    nodeVersion: process.version,
    heapMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
}

async function fetchJson(url, opts = {}, timeoutMs = 60000) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json, ok: res.ok };
}

async function remoteChat(userId, message) {
  const started = Date.now();
  const res = await fetchJson(
    `${DEPLOY_URL}/buddy/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        testerId: userId,
        mode: 'COMPANION',
        personaKey: 'ADAPTIVE_COMPANION',
        message,
      }),
    },
    Number(process.env.BIBLEBUDDY_CHAT_TIMEOUT_MS || 55000),
  );
  const latencyMs = Date.now() - started;
  const replyObj = res.json?.reply;
  const reply = typeof replyObj === 'object' ? String(replyObj.reply || '') : String(replyObj || '');
  return {
    status: res.status,
    ok: res.json?.ok,
    reply,
    latencyMs,
    openAiCalled: replyObj?.runtime?.openAiCalled,
    route: replyObj?.runtime?.masterRoute,
    error: res.json?.error,
    raw: res.json,
  };
}

async function localChat(userId, message) {
  const started = Date.now();
  const structured = await runBuddy({
    userId,
    message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });
  return {
    status: 200,
    ok: true,
    reply: String(structured.reply || ''),
    latencyMs: Date.now() - started,
    openAiCalled: structured.runtime?.openAiCalled,
    route: structured.runtime?.masterRoute,
    structured,
  };
}

function checkReply(r, label, checks = {}) {
  const failures = [];
  if (!r.reply || r.reply.length < 5) failures.push('blank/short reply');
  for (const b of BAD_USER) {
    if (r.reply.includes(b)) failures.push(`bad text: ${b}`);
  }
  if (containsDiagnosticLeak(r.reply).leaked) failures.push('diagnostic leak');
  if (checks.exactActs10 && !r.reply.includes(ACTS10_EXACT)) failures.push('missing Acts 10 exact wording');
  if (checks.noOpenAi && r.openAiCalled) failures.push('OpenAI called');
  if (checks.noHedge && !validateStrictPhraseGuard(r.reply, checks.topic || 'acts_10').passed) failures.push('hedge phrase');
  if (checks.noDeathDrift && /soul continues|2 corinthians 5:8|luke 16/i.test(r.reply)) failures.push('death drift');
  if (checks.noMemoryDenial && containsMemoryDenial(r.reply)) failures.push('memory denial');
  if (checks.memoryRecall && !/discussing|talking about|death|acts/i.test(r.reply)) failures.push('no memory recall');
  if (checks.beforeThat && !/before that|acts/i.test(r.reply)) failures.push('no before-that recall');
  return { label, pass: failures.length === 0, failures, latencyMs: r.latencyMs, route: r.route, openAiCalled: r.openAiCalled, replyPreview: r.reply.slice(0, 200) };
}

async function runLocalSmoke(userId) {
  const results = [];
  clearDoctrineConversationState(userId);
  results.push(checkReply(await localChat(userId, 'What does Acts 10 mean?'), 'acts10_initial', { exactActs10: true, noOpenAi: true, noHedge: true, topic: 'acts_10' }));
  await localChat(userId, 'What does Acts 10 mean?');
  results.push(checkReply(await localChat(userId, 'Why are you saying primarily?'), 'acts10_correction', { noOpenAi: true }));
  results.push(checkReply(await localChat(userId, 'Acts 10 means food is clean.'), 'acts10_challenge', { noOpenAi: true, noHedge: true, topic: 'acts_10' }));
  for (let i = 0; i < 10; i += 1) {
    results.push(checkReply(await localChat(userId, 'Show me another verse'), `acts10_verse_${i + 1}`, { noOpenAi: true }));
  }
  const uDeath = `${userId}-death`;
  clearDoctrineConversationState(uDeath);
  results.push(checkReply(await localChat(uDeath, 'What happens when a person dies?'), 'death_initial', { noOpenAi: true, noDeathDrift: true }));
  await localChat(uDeath, 'What happens when a person dies?');
  for (let i = 0; i < 10; i += 1) {
    results.push(checkReply(await localChat(uDeath, 'Show me another verse'), `death_verse_${i + 1}`, { noOpenAi: true, noDeathDrift: true }));
  }
  const uDiet = `${userId}-diet`;
  clearDoctrineConversationState(uDiet);
  results.push(checkReply(await localChat(uDiet, 'Can Christians eat pork?'), 'dietary', { noOpenAi: true }));
  const uMem = `${userId}-mem`;
  clearDoctrineConversationState(uMem);
  await localChat(uMem, 'What does Acts 10 mean?');
  await localChat(uMem, 'What happens when a person dies?');
  results.push(checkReply(await localChat(uMem, 'Can you remember what we were talking about?'), 'memory', { noMemoryDenial: true, memoryRecall: true, noOpenAi: true }));
  results.push(checkReply(await localChat(uMem, 'Before that?'), 'before_that', { beforeThat: true, noOpenAi: true }));
  process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
  const uNoAi = `${userId}-noai`;
  clearDoctrineConversationState(uNoAi);
  results.push(checkReply(await localChat(uNoAi, 'What does Acts 10 mean?'), 'openai_disabled', { exactActs10: true, noOpenAi: true }));
  delete process.env.BIBLEBUDDY_DISABLE_OPENAI;
  return results;
}

async function runRemoteSmoke(userId) {
  const results = [];
  try {
    clearDoctrineConversationState(userId);
    results.push(checkReply(await remoteChat(userId, 'What does Acts 10 mean?'), 'remote_acts10_initial', { exactActs10: true, noOpenAi: true, noHedge: true, topic: 'acts_10' }));
    await remoteChat(userId, 'What does Acts 10 mean?');
    results.push(checkReply(await remoteChat(userId, 'Why are you saying primarily?'), 'remote_correction', { noOpenAi: true }));
    results.push(checkReply(await remoteChat(userId, 'Acts 10 means food is clean.'), 'remote_challenge', { noOpenAi: true }));
    for (let i = 0; i < 10; i += 1) {
      results.push(checkReply(await remoteChat(userId, 'Show me another verse'), `remote_verse_${i + 1}`, { noOpenAi: true }));
    }
    const uDeath = `${userId}-rd`;
    results.push(checkReply(await remoteChat(uDeath, 'What happens when a person dies?'), 'remote_death', { noOpenAi: true, noDeathDrift: true }));
    await remoteChat(uDeath, 'What happens when a person dies?');
    for (let i = 0; i < 10; i += 1) {
      results.push(checkReply(await remoteChat(uDeath, 'Show me another verse'), `remote_death_v_${i + 1}`, { noOpenAi: true }));
    }
    results.push(checkReply(await remoteChat(`${userId}-diet`, 'Can Christians eat pork?'), 'remote_dietary', { noOpenAi: true }));
    const uMem = `${userId}-rm`;
    await remoteChat(uMem, 'What does Acts 10 mean?');
    await remoteChat(uMem, 'What happens when a person dies?');
    results.push(checkReply(await remoteChat(uMem, 'Can you remember what we were talking about?'), 'remote_memory', { noMemoryDenial: true, memoryRecall: true }));
    results.push(checkReply(await remoteChat(uMem, 'Before that?'), 'remote_before', { beforeThat: true }));
  } catch (e) {
    results.push({ label: 'remote_error', pass: false, failures: [String(e.message)], latencyMs: 0 });
  }
  return results;
}

async function probeRemoteHealth() {
  const samples = [];
  const intervals = [
    { label: 'startup', delayMs: 0 },
    { label: '5min', delayMs: 0 },
  ];
  for (const { label } of intervals) {
    const health = await fetchJson(`${DEPLOY_URL}/health`, {}, 30000);
    const runtime = await fetchJson(`${DEPLOY_URL}/api/runtime-health`, {}, 30000);
    samples.push({
      label,
      at: new Date().toISOString(),
      health: { status: health.status, version: health.json?.health?.version },
      runtimeHealth: { status: runtime.status, body: runtime.json },
    });
  }
  return samples;
}

async function main() {
  const userId = `phase4g-${Date.now()}`;
  const out = {
    generatedAt: new Date().toISOString(),
    deployUrl: DEPLOY_URL,
    localEnv: collectEnv('local'),
    renderYamlEnv: {
      NODE_ENV: 'production',
      BUDDY_RUNTIME: 'legacy',
      BUDDY_TEMPLATE_PROSE: '0',
      BUDDY_DISABLE_STUDY_FALLBACK: '1',
      startCommand: 'node server.js',
      plan: 'standard',
      note: 'Phase 4F vars not in render.yaml — use dashboard defaults',
    },
    localHealth: getRuntimeHealthSnapshot(),
    remoteHealthSamples: await probeRemoteHealth(),
    localSmoke: await runLocalSmoke(userId),
    remoteSmoke: await runRemoteSmoke(`${userId}-remote`),
  };

  const outPath = path.join(ROOT, 'docs', 'regression-trace', 'phase4g-parity-results.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({
    deployUrl: DEPLOY_URL,
    localSmokePass: out.localSmoke.filter((r) => r.pass).length,
    localSmokeTotal: out.localSmoke.length,
    remoteSmokePass: out.remoteSmoke.filter((r) => r.pass).length,
    remoteSmokeTotal: out.remoteSmoke.length,
    runtimeHealthOnRender: out.remoteHealthSamples[0]?.runtimeHealth?.status,
    healthOnRender: out.remoteHealthSamples[0]?.health?.status,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
