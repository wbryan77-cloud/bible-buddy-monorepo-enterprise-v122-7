#!/usr/bin/env node
/**
 * Phase 4H — Memory stress test (local runBuddy path).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy, trimRecentSessionCache } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { containsDiagnosticLeak } = require('../services/doctrineErrorFirewall');
const { withBuddyChatGuarantee } = require('../services/responseGuarantee');
const { getRuntimeHealthSnapshot, handleMemoryPressure } = require('../services/runtimeHealthMonitor');

const ROOT = path.join(__dirname, '..');
const BAD = ['AI service unavailable', 'connection_error', 'manual Render redeploy', 'safe corpus fallback'];

function memSnap() {
  const m = process.memoryUsage();
  return { heap: m.heapUsed, rss: m.rss };
}

async function chat(userId, message) {
  const t = Date.now();
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    ms: Date.now() - t,
    openAi: s.runtime?.openAiCalled,
    route: s.runtime?.masterRoute,
  };
}

async function main() {
  const start = memSnap();
  let peakHeap = start.heap;
  let peakRss = start.rss;
  let errors = 0;
  let timeouts = 0;
  let blanks = 0;
  let openAiStrict = 0;
  let badText = 0;
  let maxLatency = 0;
  let latencySum = 0;
  let turns = 0;
  const userId = `phase4h-mem-${Date.now()}`;

  const track = (r) => {
    turns += 1;
    latencySum += r.ms;
    if (r.ms > maxLatency) maxLatency = r.ms;
    if (!r.reply || r.reply.length < 3) blanks += 1;
    if (r.openAi) openAiStrict += 1;
    for (const b of BAD) if (r.reply.includes(b)) badText += 1;
    if (containsDiagnosticLeak(r.reply).leaked) badText += 1;
    const m = memSnap();
    if (m.heap > peakHeap) peakHeap = m.heap;
    if (m.rss > peakRss) peakRss = m.rss;
  };

  clearDoctrineConversationState(userId);
  await chat(userId, 'What does Acts 10 mean?');

  for (let i = 0; i < 500; i += 1) {
    track(await chat(userId, i % 3 === 0 ? 'What does Acts 10 mean?' : 'show me another verse'));
    if (i % 100 === 99) handleMemoryPressure();
  }
  for (let i = 0; i < 500; i += 1) track(await chat(userId, 'show me another verse'));
  for (let i = 0; i < 250; i += 1) track(await chat(userId, 'Why are you saying primarily?'));
  for (let i = 0; i < 250; i += 1) track(await chat(`${userId}-mem`, i % 2 ? 'Can you remember what we were talking about?' : 'Before that?'));
  process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
  for (let i = 0; i < 100; i += 1) track(await chat(`${userId}-comp`, 'How are you today?'));
  for (let i = 0; i < 50; i += 1) track(await chat(`${userId}-noai`, 'What does Acts 10 mean?'));
  delete process.env.BIBLEBUDDY_DISABLE_OPENAI;

  for (let i = 0; i < 25; i += 1) {
    const g = await withBuddyChatGuarantee(() => Promise.reject(new Error('forced_timeout_test')), { userId: `${userId}-err`, message: 'test' });
    if (!g.ok || !g.reply?.reply) errors += 1;
    if (containsDiagnosticLeak(g.reply?.reply || '').leaked) badText += 1;
  }

  trimRecentSessionCache();
  handleMemoryPressure();
  const end = memSnap();
  const health = getRuntimeHealthSnapshot();

  const heapGrowthMB = (end.heap - start.heap) / 1024 / 1024;
  const rssGrowthMB = (end.rss - start.rss) / 1024 / 1024;
  const peakHeapMB = peakHeap / 1024 / 1024;
  const peakRssMB = peakRss / 1024 / 1024;
  const avgLatency = Math.round(latencySum / turns);

  const checks = {
    noCrash: true,
    heapGrowthMB,
    rssGrowthMB,
    peakHeapMB,
    peakRssMB,
    avgLatency,
    maxLatency,
    errors,
    blanks,
    openAiStrict,
    badText,
    turns,
    healthRssMB: health.rssMB,
    memoryPressure: health.memoryPressureLevel,
  };

  const pass =
    blanks === 0 &&
    openAiStrict === 0 &&
    badText === 0 &&
    heapGrowthMB < 120 &&
    peakRssMB < 400 &&
    rssGrowthMB < 220;

  const lines = [
    '# Phase 4H Memory Stress Test Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Turns: ${turns}`,
    '',
    '## Metrics',
    `- Starting heap MB: ${(start.heap / 1024 / 1024).toFixed(1)}`,
    `- Ending heap MB: ${(end.heap / 1024 / 1024).toFixed(1)}`,
    `- Peak heap MB: ${checks.peakHeapMB.toFixed(1)}`,
    `- Heap growth MB: ${heapGrowthMB.toFixed(1)}`,
    `- RSS growth MB: ${rssGrowthMB.toFixed(1)}`,
    `- Peak RSS MB: ${checks.peakRssMB.toFixed(1)}`,
    `- Avg latency ms: ${avgLatency}`,
    `- Max latency ms: ${maxLatency}`,
    `- Blank responses: ${blanks}`,
    `- Strict OpenAI calls: ${openAiStrict}`,
    `- Bad internal text: ${badText}`,
    `- Memory pressure: ${health.memoryPressureLevel}`,
    '',
    `## Result: ${pass ? 'PASS' : 'FAIL'}`,
  ];

  fs.writeFileSync(path.join(ROOT, 'Phase4HMemoryStressTestReport.md'), lines.join('\n'), 'utf8');
  console.log(JSON.stringify({ pass, ...checks }));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
