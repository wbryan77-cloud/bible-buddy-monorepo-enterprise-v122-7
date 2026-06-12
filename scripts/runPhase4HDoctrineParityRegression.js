#!/usr/bin/env node
/**
 * Phase 4H — Doctrine parity regression (local + optional DEPLOY_URL).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { containsDiagnosticLeak } = require('../services/doctrineErrorFirewall');
const { containsMemoryDenial } = require('../services/doctrineLivePathHandlers');
const { validateStrictPhraseGuard } = require('../services/doctrineStrictPhraseGuard');

const ROOT = path.join(__dirname, '..');
const DEPLOY_URL = (process.env.DEPLOY_URL || '').replace(/\/$/, '');
const ACTS10_EXACT =
  'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods.';
const BAD = ['AI service unavailable', 'connection_error', 'manual Render redeploy', 'safe corpus fallback', 'trouble reaching the AI'];

function checkReply(r, label, opts = {}) {
  const failures = [];
  const reply = r.reply || '';
  if (reply.length < 5) failures.push('blank');
  for (const b of BAD) if (reply.includes(b)) failures.push(`bad:${b}`);
  if (containsDiagnosticLeak(reply).leaked) failures.push('leak');
  if (opts.noOpenAi && r.openAiCalled) failures.push('openai');
  if (opts.exactActs10 && !reply.includes(ACTS10_EXACT)) failures.push('acts10_exact');
  if (opts.noHedge && !validateStrictPhraseGuard(reply, opts.topic || 'acts_10').passed) failures.push('hedge');
  if (opts.noDeathDrift && /soul continues|2 corinthians 5:8|luke 16/i.test(reply)) failures.push('death_drift');
  if (opts.noMemoryDenial && containsMemoryDenial(reply)) failures.push('memory_denial');
  if (opts.memoryRecall && !/discussing|talking about|death|acts/i.test(reply)) failures.push('no_recall');
  if (opts.beforeThat && !/before that|acts/i.test(reply)) failures.push('no_before');
  return { label, pass: failures.length === 0, failures, latencyMs: r.latencyMs, route: r.route, openAiCalled: r.openAiCalled, preview: reply.slice(0, 160) };
}

async function localChat(userId, message) {
  const t = Date.now();
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    openAiCalled: s.runtime?.openAiCalled,
    route: s.runtime?.masterRoute,
    latencyMs: Date.now() - t,
  };
}

async function remoteChat(userId, message) {
  const t = Date.now();
  const res = await fetch(`${DEPLOY_URL}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message }),
    signal: AbortSignal.timeout(Number(process.env.BIBLEBUDDY_CHAT_TIMEOUT_MS || 55000)),
  });
  const data = await res.json();
  const replyObj = data.reply;
  const reply = typeof replyObj === 'object' ? String(replyObj.reply || '') : String(replyObj || '');
  return {
    reply,
    openAiCalled: replyObj?.runtime?.openAiCalled,
    route: replyObj?.runtime?.masterRoute,
    latencyMs: Date.now() - t,
    httpStatus: res.status,
  };
}

async function runLocalSuite(userId) {
  const results = [];
  clearDoctrineConversationState(userId);
  await localChat(userId, 'What does Acts 10 mean?');
  results.push(checkReply(await localChat(userId, 'Acts 10 means food is clean.'), '1_food_challenge', { noOpenAi: true, topic: 'acts_10' }));
  results.push(checkReply(await localChat(userId, 'Why are you saying primarily?'), '2_correction', { noOpenAi: true, noHedge: true, topic: 'acts_10' }));
  for (let i = 0; i < 10; i += 1) {
    results.push(checkReply(await localChat(userId, 'Show me another verse'), `3_verse_${i + 1}`, { noOpenAi: true }));
  }
  const uD = `${userId}-d`;
  clearDoctrineConversationState(uD);
  results.push(checkReply(await localChat(uD, 'What happens when a person dies?'), '4_death', { noOpenAi: true, noDeathDrift: true }));
  await localChat(uD, 'What happens when a person dies?');
  for (let i = 0; i < 10; i += 1) {
    results.push(checkReply(await localChat(uD, 'Show me another verse'), `5_death_verse_${i + 1}`, { noOpenAi: true, noDeathDrift: true }));
  }
  const uM = `${userId}-m`;
  clearDoctrineConversationState(uM);
  await localChat(uM, 'What does Acts 10 mean?');
  await localChat(uM, 'What happens when a person dies?');
  results.push(checkReply(await localChat(uM, 'Can you remember what we were talking about?'), '6_memory', { noOpenAi: true, noMemoryDenial: true, memoryRecall: true }));
  results.push(checkReply(await localChat(uM, 'Before that?'), '7_before', { noOpenAi: true, beforeThat: true }));
  results.push(checkReply(await localChat(`${userId}-diet`, 'Can Christians eat pork?'), '8_dietary', { noOpenAi: true }));
  results.push(checkReply(await localChat(`${userId}-isa`, 'What about Isaiah 66:17?'), '9_isaiah', { noOpenAi: true }));
  process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
  results.push(checkReply(await localChat(`${userId}-noai`, 'What does Acts 10 mean?'), '10_openai_disabled', { exactActs10: true, noOpenAi: true }));
  delete process.env.BIBLEBUDDY_DISABLE_OPENAI;
  return results;
}

async function main() {
  const userId = `phase4h-${Date.now()}`;
  const local = await runLocalSuite(userId);
  let remote = [];
  if (DEPLOY_URL) {
    try {
      const r = await remoteChat(`${userId}-r`, 'What does Acts 10 mean?');
      remote.push(checkReply(r, 'remote_acts10', { exactActs10: true, noOpenAi: true, noHedge: true, topic: 'acts_10' }));
    } catch (e) {
      remote.push({ label: 'remote_error', pass: false, failures: [String(e.message)] });
    }
  }

  const all = [...local, ...remote];
  const passed = all.filter((c) => c.pass).length;
  const lines = [
    '# Phase 4H Doctrine Parity Regression Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `DEPLOY_URL: ${DEPLOY_URL || '(not set — local only)'}`,
    '',
    `## Summary: ${passed}/${all.length}`,
    '',
  ];
  for (const c of all) {
    lines.push(`- [${c.pass ? 'PASS' : 'FAIL'}] ${c.label}${c.failures?.length ? ` — ${c.failures.join(', ')}` : ''}`);
  }
  lines.push('');
  lines.push(`Phase 4H doctrine parity: ${passed === all.length ? 'PASS' : 'FAIL'}`);

  fs.writeFileSync(path.join(ROOT, 'Phase4HDoctrineParityRegressionReport.md'), lines.join('\n'), 'utf8');
  console.log(`Phase4H doctrine: ${passed}/${all.length}`);
  process.exit(passed === all.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
