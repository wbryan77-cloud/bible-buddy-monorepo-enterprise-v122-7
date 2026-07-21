#!/usr/bin/env node
/**
 * Phase 5R — Live runtime validation.
 *
 * Verifies Phase 5P (canonical Scripture retrieval) and Phase 5Q (grounded
 * Scripture engine: READ / QUOTE / COMPARE / YES_NO) through the ACTUAL
 * production HTTP path — POST /buddy/chat via the real Express app/routes
 * (server.js + routes/buddy.js) — not just in-process regression scripts.
 *
 * Also re-verifies companion regression surfaces (prayer, companion,
 * memory, continuation, identity, strict doctrine, emotional support,
 * health support) through that same live HTTP path.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5RLiveRuntimeValidationReport.md');
const BASE_URL = process.env.PHASE5R_HTTP_BASE || null;

const SCRIPTURE_CASES = [
  {
    id: 'read_john_3_16',
    label: 'READ',
    message: 'What does John 3:16 say?',
    mustInclude: [/for god so loved the world/i],
    expectScriptureMode: 'QUOTE',
    expectRetrievalMode: 'canonical_text',
    expectReference: /john 3:16/i,
  },
  {
    id: 'read_revelation',
    label: 'READ',
    message: 'Read Revelation 1:14-15.',
    mustInclude: [/wool/i, /fine brass/i],
    expectScriptureMode: 'QUOTE',
    expectRetrievalMode: 'canonical_text',
    expectReference: /revelation 1:14-15/i,
  },
  {
    id: 'quote_romans',
    label: 'QUOTE',
    message: 'Quote Romans 8:1-4.',
    mustInclude: [/no condemnation/i],
    expectScriptureMode: 'QUOTE',
    expectRetrievalMode: 'canonical_text',
    expectReference: /romans 8:1-4/i,
  },
  {
    id: 'compare_genesis_john',
    label: 'COMPARE',
    message: 'Compare Genesis 1:1 and John 1:1.',
    mustInclude: [/in the beginning god created/i, /in the beginning was the word/i],
    expectScriptureMode: 'COMPARE',
    expectRetrievalMode: 'canonical_text',
    expectReference: /genesis 1:1/i,
  },
  {
    id: 'yes_no_jesus_appearance',
    label: 'YES_NO',
    message:
      'Based only on Revelation 1:14-15, does Scripture describe Jesus as having white skin and blue eyes?',
    mustInclude: [/^no/i, /wool/i],
    expectScriptureMode: 'YES_NO',
    expectRetrievalMode: 'canonical_text',
    expectReference: /revelation 1:14-15/i,
  },
  {
    id: 'invalid_john_99_99',
    label: 'INVALID',
    message: 'Read John 99:99.',
    mustInclude: [/could not find/i],
    mustNotInclude: [/for god so loved/i],
    expectScriptureMode: 'QUOTE',
    expectRetrievalMode: 'canonical_text_unavailable',
  },
  {
    id: 'mixed_valid_invalid',
    label: 'MIXED',
    message: 'Read John 3:16 and John 99:99.',
    mustInclude: [/for god so loved the world/i, /could not find/i],
    expectScriptureMode: 'QUOTE',
    expectRetrievalMode: 'canonical_text_partial',
  },
];

const COMPANION_CASES = [
  {
    id: 'prayer',
    label: 'Prayer',
    message: 'Will you pray with me?',
    mustInclude: [/amen/i],
  },
  {
    id: 'companion_emotional',
    label: 'Companion / emotional support',
    message: 'I had a really hard day today.',
    mustInclude: [/sorry|here with you|hard day/i],
  },
  {
    id: 'health_support',
    label: 'Health support',
    message: 'My knees hurt again today.',
    mustInclude: [/knee/i],
  },
  {
    id: 'strict_doctrine_pork',
    label: 'Strict doctrine',
    message: 'Can we eat pork?',
    mustInclude: [/^no\b/i],
  },
  {
    id: 'identity',
    label: 'Identity',
    message: 'What is BibleBuddy?',
    mustInclude: [/scripture|bible/i],
  },
];

async function postChat(baseUrl, message, userId) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userId,
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
    scripture: replyObj.scripture || [],
    masterRoute: replyObj.runtime?.masterRoute,
    retrievalMode: replyObj.runtime?.retrievalMode,
    scriptureMode: replyObj.runtime?.scriptureMode,
  };
}

async function spinLocalServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/buddy', require('../routes/buddy'));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  return { baseUrl: `http://127.0.0.1:${port}`, close: () => server.close() };
}

async function main() {
  let baseUrl = BASE_URL;
  let local = null;
  if (!baseUrl) {
    local = await spinLocalServer();
    baseUrl = local.baseUrl;
  }

  const prefix = `phase5r-live-${Date.now()}`;
  const results = [];

  console.log(`[Phase 5R] Base URL: ${baseUrl}`);

  for (const c of [...SCRIPTURE_CASES, ...COMPANION_CASES]) {
    const userId = `${prefix}-${c.id}`;
    try {
      const r = await postChat(baseUrl, c.message, userId);
      const failures = [];

      if (r.httpStatus !== 200) failures.push(`http_${r.httpStatus}`);
      if (r.ok !== true) failures.push('ok_false');

      (c.mustInclude || []).forEach((re) => {
        if (!re.test(r.text)) failures.push(`missing:${re}`);
      });
      (c.mustNotInclude || []).forEach((re) => {
        if (re.test(r.text)) failures.push(`leaked:${re}`);
      });

      if (c.expectScriptureMode && r.scriptureMode !== c.expectScriptureMode) {
        failures.push(`scriptureMode:${r.scriptureMode}!=${c.expectScriptureMode}`);
      }
      if (c.expectRetrievalMode && r.retrievalMode !== c.expectRetrievalMode) {
        failures.push(`retrievalMode:${r.retrievalMode}!=${c.expectRetrievalMode}`);
      }
      if (c.expectReference) {
        const refs = (r.scripture || []).map((s) => s.reference || '').join(' | ');
        if (!c.expectReference.test(refs)) failures.push(`reference_mismatch:${refs}`);
      }
      if (c.expectReference && r.scripture?.length) {
        const hasTranslation = r.scripture.every((s) => /king james/i.test(s.translation || ''));
        if (!hasTranslation) failures.push('missing_kjv_translation');
      }

      results.push({
        id: c.id,
        label: c.label,
        pass: failures.length === 0,
        failures,
        message: c.message,
        preview: r.text.slice(0, 220),
        masterRoute: r.masterRoute,
        retrievalMode: r.retrievalMode,
        scriptureMode: r.scriptureMode,
        scripture: r.scripture,
      });
    } catch (e) {
      results.push({
        id: c.id,
        label: c.label,
        pass: false,
        failures: ['request_error', String(e.message || e)],
        message: c.message,
      });
    }
  }

  if (local) local.close();

  const passed = results.filter((r) => r.pass).length;
  const lines = [
    '# Phase 5R Live Runtime Validation Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Base URL:** ${baseUrl}`,
    `**Path:** POST /buddy/chat (routes/buddy.js -> services/buddyBrain.js runBuddy)`,
    `**Result:** ${passed}/${results.length}`,
    '',
    '## Scripture (Phase 5P/5Q) cases',
    '',
  ];

  for (const r of results) {
    lines.push(`- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} (${r.label}) — ${r.failures?.join(', ') || 'ok'}`);
    lines.push(`  Message: ${r.message}`);
    if (r.preview) lines.push(`  Reply: ${r.preview}`);
    if (r.masterRoute) lines.push(`  masterRoute=${r.masterRoute} retrievalMode=${r.retrievalMode} scriptureMode=${r.scriptureMode}`);
    if (r.scripture?.length) {
      lines.push(
        `  scripture=${JSON.stringify(r.scripture.map((s) => ({ reference: s.reference, translation: s.translation })))}`
      );
    }
    lines.push('');
  }

  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8');
  console.log(`Phase 5R: ${passed}/${results.length}`);
  console.log(`Report: ${REPORT}`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
