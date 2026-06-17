#!/usr/bin/env node
/**
 * Phase 5M.3 — Old phrase quarantine regression.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { scanForbiddenFinalSubstrings } = require('../services/singleCompanionContract');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5M3RegressionReport.md');

const FORBIDDEN_ANY = [
  'Yes — staying',
  'No. staying',
  'Absolutely — staying',
  'I want to answer from Scripture directly',
  'which book, topic, or passage',
  'Scripture witnesses:',
  'Scripture invites us to cast our care upon God',
];

function hasForbidden(text = '') {
  const t = String(text);
  return FORBIDDEN_ANY.filter((f) => t.includes(f));
}

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  const ro = s.runtime?.routeOwnership || {};
  return {
    reply: String(s.reply || ''),
    route: s.runtime?.masterRoute,
    owner: ro.finalResponseOwner || (s.runtime?.liveResponseOwner ? 'liveResponseOwner' : 'unknown'),
    intent: ro.detectedIntent,
    engine: ro.selectedEngine,
    draftRoute: ro.draftRoute,
    repairLane: ro.contractRepairLane || s.runtime?.companionRepairLane,
    forbiddenDetected: s.runtime?.forbiddenPhraseDetected || false,
    routeOwnership: ro,
  };
}

function row(id, pass, note, r) {
  return { id, pass, note, preview: r.reply.slice(0, 220), ...r };
}

async function run() {
  const ts = Date.now();
  const results = [];
  const routeLogs = [];

  const u = `phase5m3-${ts}`;
  clearDoctrineConversationState(u);

  let r1 = await chat(u, 'Can we eat pork?');
  results.push(
    row(
      '1_pork',
      /^No\.\s+Staying/i.test(r1.reply) && !/No\.\s+staying\b/.test(r1.reply) && hasForbidden(r1.reply).length === 0,
      'No. Staying, no lowercase staying',
      r1,
    ),
  );
  routeLogs.push(r1);

  let r2 = await chat(u, 'Does pork taste good?');
  results.push(
    row(
      '2_taste',
      /some people may like the taste/i.test(r2.reply) &&
        !/^Yes/i.test(r2.reply.trim()) &&
        !/Yes — staying/i.test(r2.reply),
      'taste distinction',
      r2,
    ),
  );
  routeLogs.push(r2);

  let r3 = await chat(u, 'Is pork good meat to eat?');
  results.push(
    row(
      '3_good_meat',
      /^No\./i.test(r3.reply) && !/Yes — staying/i.test(r3.reply),
      'No for good meat',
      r3,
    ),
  );
  routeLogs.push(r3);

  let r4 = await chat(u, "Why are you saying Yes it seems you are saying it's ok.");
  results.push(
    row(
      '4_correction',
      /should not start with .Yes|Scripture identifies pork as unclean/i.test(r4.reply) &&
        !/Leviticus 11 and Deuteronomy 14 both identify swine as unclean\. Acts 10/i.test(r4.reply),
      'correction ack not dump',
      r4,
    ),
  );
  routeLogs.push(r4);

  let r5 = await chat(u, 'How do I explain it to my family?');
  results.push(
    row(
      '5_explain',
      /explain|family|Leviticus/i.test(r5.reply) && !/which book, topic, or passage/i.test(r5.reply),
      'practical family',
      r5,
    ),
  );
  routeLogs.push(r5);

  let r6 = await chat(u, 'Can you pray with me?');
  results.push(
    row(
      '6_prayer',
      /\b(father|lord|jesus|amen)\b/i.test(r6.reply) && !/Scripture invites us/i.test(r6.reply),
      'actual prayer',
      r6,
    ),
  );
  routeLogs.push(r6);

  const app = `phase5m3-app-${ts}`;
  clearDoctrineConversationState(app);
  let r7 = await chat(app, 'What is this app?');
  results.push(
    row(
      '7_app',
      /BibleBuddy|companion/i.test(r7.reply) && !/which book, topic, or passage/i.test(r7.reply),
      'app identity',
      r7,
    ),
  );
  routeLogs.push(r7);

  const nerv = `phase5m3-nerv-${ts}`;
  clearDoctrineConversationState(nerv);
  let r8 = await chat(nerv, "I'm nervous.");
  results.push(
    row(
      '8_nervous',
      /nervous|breathe|weighing on you|concern/i.test(r8.reply),
      'warm support',
      r8,
    ),
  );
  routeLogs.push(r8);

  const teach = `phase5m3-teach-${ts}`;
  clearDoctrineConversationState(teach);
  let r9 = await chat(teach, 'What does the Bible say about prayer?');
  results.push(
    row(
      '9_prayer_teaching',
      /scripture teaches|Philippians|Matthew 6|James 5/i.test(r9.reply) &&
        !/\b(father|lord|jesus|amen)\b/i.test(r9.reply.slice(0, 80)),
      'teaching not pray-with-me',
      r9,
    ),
  );
  routeLogs.push(r9);

  const ownerOk = routeLogs.every((r) => r.owner === 'liveResponseOwner');
  const forbiddenOk = routeLogs.every((r) => !r.forbiddenDetected && hasForbidden(r.reply).length === 0);

  results.push(
    row('10_route_owner', ownerOk, 'all liveResponseOwner', {
      reply: ownerOk ? 'ok' : 'fail',
      owner: ownerOk ? 'liveResponseOwner' : 'mixed',
      forbiddenDetected: !forbiddenOk,
    }),
  );
  results.push(
    row('11_forbidden_scan', forbiddenOk, 'no forbidden substrings', {
      reply: forbiddenOk ? 'ok' : 'fail',
      owner: 'liveResponseOwner',
      forbiddenDetected: !forbiddenOk,
    }),
  );

  const passed = results.filter((r) => r.pass).length;
  const md = [
    '# Phase 5M.3 Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    '',
    ...results.map(
      (r) =>
        `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} — ${r.note}\n  owner=${r.owner} forbidden=${r.forbiddenDetected}\n  ${r.preview}`,
    ),
    '',
    '## Route ownership logs',
    '',
    ...routeLogs.map(
      (r) =>
        `- intent=${r.intent} engine=${r.engine} draft=${r.draftRoute} repair=${r.repairLane} forbidden=${r.forbiddenDetected}`,
    ),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase 5M.3 quarantine: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
