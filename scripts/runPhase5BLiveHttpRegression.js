#!/usr/bin/env node
/**
 * Phase 5B — Real HTTP regression against POST /buddy/chat (local server).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const { COMPANION_SAFE_FALLBACK } = require('../services/responseGuarantee');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5BLiveHttpRegressionReport.md');
const BASE_URL = process.env.PHASE5B_HTTP_BASE || 'http://localhost:3000';
const SPIN_LOCAL = process.env.PHASE5B_SPIN_LOCAL !== '0';

const CASES = [
  {
    id: '1_pork',
    message: 'Can we eat pork?',
    expect: (text) => /^no\b/i.test(text.trim()),
  },
  {
    id: '2_acts10',
    message: 'Acts 10',
    expect: (text) => /acts\s*10/i.test(text),
  },
  {
    id: '3_bad_day',
    message: 'I had a bad day today.',
    expect: (text) => /sorry|here with you|hard day/i.test(text),
  },
  {
    id: '4_fornication',
    message: 'Can we have sex without marriage?',
    expect: (text) => /^no\b/i.test(text.trim()) && /fornication|marriage/i.test(text),
  },
  {
    id: '5_fornication_verse',
    message: 'show me another verse about fornication?',
    expect: (text) => /corinthians|thessalonians|hebrews|ephesians|galatians|fornication/i.test(text),
  },
  {
    id: '6_kingdom',
    message:
      'Can you give me more scriptures with man staying on earth and the kingdom coming?',
    expect: (text) => /matthew|revelation|daniel|psalm|kingdom/i.test(text),
  },
];

function isShortSentenceFallback(text = '') {
  return String(text).includes(COMPANION_SAFE_FALLBACK) || String(text).includes('stay with you on this');
}

async function postChat(baseUrl, message, testerId) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      testerId,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
    }),
  });
  const json = await res.json();
  const replyObj = json.reply && typeof json.reply === 'object' ? json.reply : json;
  const text = String(replyObj.reply || '');
  return {
    httpStatus: res.status,
    ok: json.ok,
    text,
    masterRoute: replyObj.runtime?.masterRoute,
    fallbackErrorCode: replyObj.runtime?.fallbackErrorCode,
    phase5A: replyObj.runtime?.phase5A,
  };
}

async function spinLocalServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/buddy', require('../routes/buddy'));
  app.use('/api', require('../routes/runtimeHealth'));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => server.close(),
  };
}

async function main() {
  let baseUrl = BASE_URL;
  let local = null;

  if (SPIN_LOCAL) {
    local = await spinLocalServer();
    baseUrl = local.baseUrl;
  }

  const results = [];
  const prefix = `phase5b-http-${Date.now()}`;

  for (const c of CASES) {
    const testerId = `${prefix}-${c.id}`;
    try {
      const r = await postChat(baseUrl, c.message, testerId);
      const failures = [];
      if (isShortSentenceFallback(r.text)) failures.push('short_sentence_fallback');
      if (!c.expect(r.text)) failures.push('expectation_failed');
      if (r.httpStatus !== 200) failures.push(`http_${r.httpStatus}`);
      results.push({
        id: c.id,
        pass: failures.length === 0,
        failures,
        message: c.message,
        preview: r.text.slice(0, 160),
        masterRoute: r.masterRoute,
        fallbackErrorCode: r.fallbackErrorCode,
        phase5A: r.phase5A,
      });
    } catch (e) {
      results.push({
        id: c.id,
        pass: false,
        failures: ['request_error', String(e.message || e)],
        message: c.message,
      });
    }
  }

  if (local) local.close();

  const passed = results.filter((r) => r.pass).length;
  const lines = [
    '# Phase 5B Live HTTP Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Base URL:** ${baseUrl}`,
    `**Result:** ${passed}/${results.length}`,
    '',
  ];

  for (const r of results) {
    lines.push(`- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} — ${r.failures.join(', ') || 'ok'}`);
    if (r.preview) lines.push(`  Preview: ${r.preview}`);
    if (r.masterRoute) lines.push(`  Route: ${r.masterRoute}`);
  }

  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8');
  console.log(`Phase 5B HTTP: ${passed}/${results.length}`);
  console.log(`Report: ${REPORT}`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
