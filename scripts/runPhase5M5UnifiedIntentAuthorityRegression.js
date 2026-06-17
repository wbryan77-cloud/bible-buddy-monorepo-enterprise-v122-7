#!/usr/bin/env node
/**
 * Phase 5M.5 — Unified humanNeed authority regression (real POST /buddy/chat).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5M5UnifiedIntentAuthorityReport.md');

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
  const trace = replyObj.runtime?.liveTruthTrace || {};
  const routeOwnership = replyObj.runtime?.routeOwnership || {};
  return {
    httpStatus: res.status,
    ok: json.ok,
    text,
    masterRoute: replyObj.runtime?.masterRoute,
    trace,
    routeOwnership,
    humanNeed:
      trace.routePlanHumanNeed ||
      trace.orchestratorHumanNeed ||
      routeOwnership.detectedIntent ||
      null,
    protectedHumanNeed: trace.protectedHumanNeed || false,
  };
}

function buildCases() {
  return [
    {
      id: '1_app_identity',
      message: 'What is this app?',
      expect: (r) =>
        /BibleBuddy/i.test(r.text) &&
        !/which book, topic, or passage/i.test(r.text) &&
        !/stay with you on this/i.test(r.text) &&
        (r.humanNeed === 'app_identity' || r.protectedHumanNeed),
    },
    {
      id: '2_prayer',
      message: 'Can you pray with me?',
      expect: (r) =>
        /(father|lord)/i.test(r.text) &&
        /amen/i.test(r.text) &&
        !/Scripture invites us to cast our care/i.test(r.text) &&
        (r.humanNeed === 'prayer' || r.protectedHumanNeed),
    },
    {
      id: '3_family_explain',
      setup: async (chat) => {
        await chat('Can we eat pork?');
      },
      message: 'How do I explain it to my family?',
      expect: (r) =>
        !/which book, topic, or passage/i.test(r.text) &&
        /family|them|explain|say it without|without sounding harsh/i.test(r.text) &&
        /(you could|try saying|one way|might say)/i.test(r.text) &&
        (r.humanNeed === 'practical_words_to_say' || r.protectedHumanNeed),
    },
    {
      id: '4_nervous',
      message: "I'm nervous.",
      expect: (r) =>
        /(nervous|here with you|understand|breathe|weighing)/i.test(r.text) &&
        !/doctrine_final_authority/i.test(r.masterRoute) &&
        (r.humanNeed === 'anxiety_support' ||
          r.humanNeed === 'emotional_support' ||
          r.protectedHumanNeed),
    },
    {
      id: '5_pork_taste',
      message: 'Does pork taste good?',
      expect: (r) =>
        !/^Yes\s*[—-]?\s*staying with Scripture/i.test(r.text.trim()) &&
        /some people may like the taste|different from whether Scripture/i.test(r.text),
    },
    {
      id: '6_pork_permission',
      message: 'Can we eat pork?',
      expect: (r) =>
        /^No\.\s+Staying with Scripture/i.test(r.text) &&
        /leviticus\s*11/i.test(r.text) &&
        /deuteronomy\s*14/i.test(r.text) &&
        /doctrine_final_authority|strict_doctrine/i.test(r.masterRoute || ''),
    },
    {
      id: '7_acts10',
      setup: async (chat) => {
        await chat('Can we eat pork?');
      },
      message: 'What about Acts 10?',
      expect: (r) =>
        /acts\s*10/i.test(r.text) &&
        /10:28|common or unclean|Gentiles/i.test(r.text) &&
        !/BibleBuddy is a Scripture-grounded companion/i.test(r.text),
    },
  ];
}

async function main() {
  const local = await spinLocalServer();
  const prefix = `phase5m5-intent-${Date.now()}`;
  const cases = buildCases();
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
        preview: r.text.slice(0, 220),
        masterRoute: r.masterRoute,
        humanNeed: r.humanNeed,
        protectedHumanNeed: r.protectedHumanNeed,
      });
    }
  } finally {
    local.close();
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const allPass = passed === total;

  const lines = [
    '# Phase 5M.5 Unified Intent Authority Regression',
    '',
    `**Result:** ${allPass ? 'PASS' : 'FAIL'} (${passed}/${total})`,
    '',
    '| Case | Pass | humanNeed | protected | Route |',
    '|------|------|-----------|-----------|-------|',
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.pass ? '✓' : '✗'} | ${r.humanNeed || '—'} | ${r.protectedHumanNeed} | ${r.masterRoute || '—'} |`,
    ),
  ];

  fs.writeFileSync(REPORT, lines.join('\n'));
  console.log(`Phase 5M.5 unified intent: ${passed}/${total} ${allPass ? 'PASS' : 'FAIL'}`);
  for (const r of results) {
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'} ${r.id}: need=${r.humanNeed} protected=${r.protectedHumanNeed} ${r.failures?.join(', ') || 'ok'}`,
    );
  }
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
