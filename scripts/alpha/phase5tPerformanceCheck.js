#!/usr/bin/env node
/**
 * Phase 5T — Part 8: Performance check against the live HTTP route.
 *
 * Measures latency (median/p95), a provider cache-hit case, memory growth
 * across repeated requests, and counts unhandled rejections/errors, all
 * against the actual POST /buddy/chat route (routes/buddy.js).
 */

require('dotenv').config();

const path = require('path');
const express = require('express');

const ROOT = path.join(__dirname, '..', '..');

let unhandledRejections = 0;
process.on('unhandledRejection', (err) => {
  unhandledRejections++;
  console.error('[unhandledRejection]', err);
});

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function postChat(baseUrl, message, userId) {
  const startedAt = Date.now();
  let httpStatus = 0;
  let errored = false;
  try {
    const res = await fetch(`${baseUrl}/buddy/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' }),
    });
    httpStatus = res.status;
    await res.json();
  } catch (e) {
    errored = true;
  }
  return { latencyMs: Date.now() - startedAt, httpStatus, errored };
}

async function spinLocalServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/buddy', require(path.join(ROOT, 'routes', 'buddy')));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

async function main() {
  const local = await spinLocalServer();
  const baseUrl = local.baseUrl;
  console.log(`[Phase 5T Perf] Base URL: ${baseUrl}`);

  const scriptureCases = ['John 3:16', 'Genesis 1:1', 'Psalm 23', 'Romans 8:1', 'Acts 10'];
  const companionCases = ['Will you pray with me?', 'I had a hard day.', 'What is BibleBuddy?'];

  const memBefore = process.memoryUsage();

  // Cold-path Scripture latency (first hit, cache miss likely).
  const scriptureLatencies = [];
  let errors = 0;
  for (const msg of scriptureCases) {
    const r = await postChat(baseUrl, msg, `perf-scripture-${Date.now()}-${Math.random()}`);
    scriptureLatencies.push(r.latencyMs);
    if (r.errored || r.httpStatus !== 200) errors++;
  }

  // Cache-hit latency: repeat the same reference many times.
  const cacheHitLatencies = [];
  for (let i = 0; i < 10; i++) {
    const r = await postChat(baseUrl, 'John 3:16', `perf-cachehit-${Date.now()}-${i}`);
    cacheHitLatencies.push(r.latencyMs);
    if (r.errored || r.httpStatus !== 200) errors++;
  }

  // Repeated-request memory growth check (Scripture path, 40 requests).
  for (let i = 0; i < 40; i++) {
    const msg = scriptureCases[i % scriptureCases.length];
    await postChat(baseUrl, msg, `perf-growth-${Date.now()}-${i}`);
  }
  if (global.gc) global.gc();
  const memAfterScripture = process.memoryUsage();

  // Companion (OpenAI) latency — smaller sample since these are slow/real calls.
  const companionLatencies = [];
  for (const msg of companionCases) {
    const r = await postChat(baseUrl, msg, `perf-companion-${Date.now()}-${Math.random()}`);
    companionLatencies.push(r.latencyMs);
    if (r.errored || r.httpStatus !== 200) errors++;
  }

  local.close();

  const sortedScripture = [...scriptureLatencies].sort((a, b) => a - b);
  const sortedCacheHit = [...cacheHitLatencies].sort((a, b) => a - b);
  const sortedCompanion = [...companionLatencies].sort((a, b) => a - b);

  const report = {
    generatedAt: new Date().toISOString(),
    scripture: {
      samples: scriptureLatencies,
      medianMs: percentile(sortedScripture, 50),
      p95Ms: percentile(sortedScripture, 95),
    },
    cacheHit: {
      samples: cacheHitLatencies,
      medianMs: percentile(sortedCacheHit, 50),
      p95Ms: percentile(sortedCacheHit, 95),
      note: 'First call in this set is a cache miss; remaining 9 are cache hits against the in-process Map cache.',
    },
    companionOpenAi: {
      samples: companionLatencies,
      medianMs: percentile(sortedCompanion, 50),
      p95Ms: percentile(sortedCompanion, 95),
    },
    memory: {
      beforeRssMB: Math.round(memBefore.rss / 1024 / 1024),
      afterRssMB: Math.round(memAfterScripture.rss / 1024 / 1024),
      beforeHeapUsedMB: Math.round(memBefore.heapUsed / 1024 / 1024),
      afterHeapUsedMB: Math.round(memAfterScripture.heapUsed / 1024 / 1024),
      requestsSentBeforeMeasure: 40 + scriptureCases.length + cacheHitLatencies.length,
    },
    errorCount: errors,
    unhandledRejections,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
