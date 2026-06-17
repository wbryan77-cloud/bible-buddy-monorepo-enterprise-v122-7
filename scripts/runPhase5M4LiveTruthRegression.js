#!/usr/bin/env node
/**
 * Phase 5M.4 — Live runtime truth regression via real POST /buddy/chat.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5M4LiveTruthRegressionReport.md');

function spinLocalServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/buddy', require('../routes/buddy'));
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => server.close(),
      });
    });
  });
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
    liveTruthTrace: replyObj.runtime?.liveTruthTrace,
    forbiddenPhraseDetected: replyObj.runtime?.forbiddenPhraseDetected,
  };
}

function hasDuplicateUnclean(text = '') {
  const t = String(text);
  const remain = /pork and shellfish remain unclean/i.test(t);
  const are = /pork and shellfish are unclean/i.test(t);
  return remain && are;
}

function buildCases(prefix) {
  return [
    {
      id: '1_pork_permission',
      message: 'Can we eat pork?',
      expect: (r) =>
        /^No\.\s+Staying with Scripture/i.test(r.text) &&
        !/No\.\s+staying\b/.test(r.text) &&
        !hasDuplicateUnclean(r.text),
    },
    {
      id: '2_pork_taste',
      message: 'Does pork taste good?',
      expect: (r) =>
        !/^Yes\s*[—-]?\s*staying with Scripture/i.test(r.text.trim()) &&
        /some people may like the taste|different from whether Scripture/i.test(r.text) &&
        (/leviticus\s*11/i.test(r.text) || /deuteronomy\s*14/i.test(r.text)),
    },
    {
      id: '3_pork_good_meat',
      message: 'Is pork good meat to eat?',
      expect: (r) => /^No\./i.test(r.text.trim()) && !/^Yes\b/i.test(r.text.trim()),
    },
    {
      id: '4_family_explain',
      setup: async (chat) => {
        await chat('Can we eat pork?');
      },
      message: 'How do I explain it to my family?',
      expect: (r) =>
        !/which book, topic, or passage/i.test(r.text) &&
        /family|them|say|explain/i.test(r.text) &&
        /(you could|try saying|one way|might say)/i.test(r.text),
    },
    {
      id: '5_prayer',
      message: 'Can you pray with me?',
      expect: (r) =>
        /(father|lord)/i.test(r.text) &&
        /amen/i.test(r.text) &&
        !/Scripture invites us to cast our care/i.test(r.text),
    },
    {
      id: '6_app_identity',
      message: 'What is this app?',
      expect: (r) =>
        /BibleBuddy/i.test(r.text) &&
        /(scripture|companion)/i.test(r.text) &&
        !/which book, topic, or passage/i.test(r.text) &&
        (/not.*(force|pressure)/i.test(r.text) || !/(force|pressure)/i.test(r.text)),
    },
    {
      id: '7_nervous',
      setup: async (chat) => {
        await chat('How do I explain it to my family?');
      },
      message: "I'm nervous.",
      expect: (r) =>
        /(nervous|here with you|understand|heavy|makes sense|family)/i.test(r.text) &&
        (r.text.match(/\?/g) || []).length <= 1,
    },
    {
      id: '8_correction',
      setup: async (chat) => {
        await chat('Does pork taste good?');
      },
      message: 'Why are you saying yes?',
      expect: (r) =>
        /(right|apologize|sorry)/i.test(r.text) &&
        /(taste|permission|different)/i.test(r.text) &&
        !/which book, topic, or passage/i.test(r.text),
    },
  ];
}

async function main() {
  const local = await spinLocalServer();
  const prefix = `phase5m4-live-${Date.now()}`;
  const cases = buildCases(prefix);
  const results = [];

  try {
    for (const c of cases) {
      const testerId = `${prefix}-${c.id}`;
      const chatFn = (msg) => postChat(local.baseUrl, msg, testerId);
      if (c.setup) await c.setup(chatFn);
      const r = await chatFn(c.message);
      const failures = [];
      if (r.httpStatus !== 200) failures.push(`http_${r.httpStatus}`);
      if (!c.expect(r)) failures.push('expectation_failed');
      results.push({
        id: c.id,
        pass: failures.length === 0,
        failures,
        message: c.message,
        preview: r.text.slice(0, 240),
        masterRoute: r.masterRoute,
        liveTruthTrace: r.liveTruthTrace,
        forbiddenPhraseDetected: r.forbiddenPhraseDetected,
      });
    }
  } finally {
    local.close();
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const allPass = passed === total;

  const lines = [
    '# Phase 5M.4 Live Truth Regression',
    '',
    `**Result:** ${allPass ? 'PASS' : 'FAIL'} (${passed}/${total})`,
    '',
    '| Case | Pass | Route | Preview |',
    '|------|------|-------|---------|',
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.pass ? '✓' : '✗'} | ${r.masterRoute || '—'} | ${r.preview.replace(/\|/g, '/').slice(0, 80)}… |`,
    ),
    '',
    '## Details',
    '',
    ...results.map(
      (r) =>
        `### ${r.id}\n- Message: ${r.message}\n- Failures: ${r.failures.join(', ') || 'none'}\n- Trace dispatch: ${r.liveTruthTrace?.orchestratorDispatch || '—'}\n`,
    ),
  ];

  fs.writeFileSync(REPORT, lines.join('\n'));
  console.log(`Phase 5M.4 live truth: ${passed}/${total} ${allPass ? 'PASS' : 'FAIL'}`);
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}: ${r.failures.join(', ') || 'ok'}`);
  }
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
