#!/usr/bin/env node
/**
 * Phase 5M.1 — Known working path regression (8 human threads).
 * Validates restored 5G–5I orchestrator path + final contract gate.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { detectForbiddenOldPath } = require('../services/singleCompanionContract');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5M1KnownWorkingPathRegressionReport.md');

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    route: s.runtime?.masterRoute,
    liveOwner: s.runtime?.liveResponseOwner,
  };
}

function row(id, pass, note, r) {
  return { id, pass, note, preview: (r?.reply || '').slice(0, 220), route: r?.route, liveOwner: r?.liveOwner };
}

async function run() {
  const ts = Date.now();
  const u = `phase5m1-${ts}`;
  clearDoctrineConversationState(u);
  const results = [];

  let r1 = await chat(u, 'Can we eat pork?');
  results.push(
    row(
      '1_pork',
      /^No\.\s+Staying with Scripture/i.test(r1.reply),
      'clear No + Staying with Scripture',
      r1,
    ),
  );

  let r2 = await chat(u, 'Does pork taste good?');
  results.push(
    row(
      '2_taste',
      /many people may like the taste|unclean|not good to eat/i.test(r2.reply) && !/^Yes[—,\s]/i.test(r2.reply.trim()),
      'taste distinction, not Yes opener',
      r2,
    ),
  );

  let r3 = await chat(u, 'Is pork good meat to eat?');
  results.push(
    row(
      '3_good_meat',
      /^No\./i.test(r3.reply.trim()) && /biblically|unclean/i.test(r3.reply),
      'No biblically unclean',
      r3,
    ),
  );

  let r4 = await chat(u, 'How do I explain it to my family?');
  results.push(
    row(
      '4_explain',
      /explain|Leviticus|family|without sounding harsh/i.test(r4.reply) && !/which book, topic/i.test(r4.reply),
      'practical family wording',
      r4,
    ),
  );

  let r5 = await chat(u, 'Can you pray with me?');
  results.push(
    row(
      '5_prayer',
      /\b(father|lord|jesus|amen)\b/i.test(r5.reply) && !/Scripture invites/i.test(r5.reply),
      'actual prayer',
      r5,
    ),
  );

  const app = `phase5m1-app-${ts}`;
  clearDoctrineConversationState(app);
  let r6 = await chat(app, 'What is this app?');
  results.push(
    row(
      '6_app',
      /BibleBuddy|companion|Scripture|listen|pray/i.test(r6.reply) && !/which book, topic/i.test(r6.reply),
      'app identity',
      r6,
    ),
  );

  const nerv = `phase5m1-nerv-${ts}`;
  clearDoctrineConversationState(nerv);
  let r7 = await chat(nerv, "I'm nervous.");
  results.push(
    row(
      '7_nervous',
      /nervous|breathe|pray|concern|weighing on you/i.test(r7.reply),
      'warm support or family context',
      r7,
    ),
  );

  let r8 = await chat(nerv, 'What do I do about it?');
  results.push(
    row(
      '8_next_steps',
      /breathe|pray|step|concern|practical/i.test(r8.reply),
      'practical next steps',
      r8,
    ),
  );

  const forbidden = results.filter((r) => detectForbiddenOldPath(r.preview, { hasEstablishedTopic: true }).length > 0);
  const passed = results.filter((r) => r.pass).length;

  const md = [
    '# Phase 5M.1 Known Working Path Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    forbidden.length ? `**Forbidden leaks:** ${forbidden.length}` : '',
    '',
    ...results.map(
      (r) =>
        `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} — ${r.note} (owner=${r.liveOwner}, route=${r.route})\n  ${r.preview}`,
    ),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase 5M.1 known path: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
