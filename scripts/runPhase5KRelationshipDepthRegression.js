#!/usr/bin/env node
/**
 * Phase 5K — Relationship depth + companion maturity regression.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { forgetMemory } = require('../services/companionMemoryManager');
const { guardChecks } = require('../services/companionStyleGuard');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5KRelationshipDepthRegressionReport.md');
const ERROR_RE = /core_connection_error|trouble retrieving additional passages/i;

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return { reply: String(s.reply || ''), route: s.runtime?.masterRoute };
}

async function run() {
  const prefix = `phase5k-${Date.now()}`;
  const results = [];

  function push(id, pass, failures, r) {
    results.push({ id, pass, failures, preview: (r?.reply || '').slice(0, 180), route: r?.route });
  }

  const u = `${prefix}-pork`;
  clearDoctrineConversationState(u);
  let r1 = await chat(u, 'Can we eat pork?');
  push('1_pork', /^no\b/i.test(r1.reply) && !ERROR_RE.test(r1.reply), [], r1);

  let r2 = await chat(u, 'How do I explain it to my family?');
  push('2_explain_family', /leviticus|deuteronomy|acts|not judging|gentle/i.test(r2.reply), guardChecks('', r2.reply), r2);

  let r3 = await chat(u, 'But how do I explain it to them?');
  push('3_explain_them', !/which book, topic, or passage/i.test(r3.reply) && /leviticus|acts|scripture/i.test(r3.reply), [], r3);

  let r4 = await chat(u, "I'm nervous.");
  push('4_nervous', /nervous|family|scripture|joshua|philippians/i.test(r4.reply), [], r4);

  let r5 = await chat(u, 'Can you pray with me?');
  push('5_prayer', /\b(father|lord|jesus|amen)\b/i.test(r5.reply), guardChecks('pray', r5.reply), r5);

  let r6 = await chat(u, 'What verse should I remember?');
  push('6_verse', /joshua|philippians|verse/i.test(r6.reply), [], r6);

  let r7 = await chat(`${prefix}-over`, 'My feeling overwhelmed');
  push('7_overwhelmed', /overwhelmed|\?|psalm/i.test(r7.reply), [], r7);

  let r8 = await chat(`${prefix}-app`, 'What is the purpose of this app?');
  push('8_app_purpose', /companion|scripture|listen|pray/i.test(r8.reply) && !/which book, topic/i.test(r8.reply), [], r8);

  let r9 = await chat(`${prefix}-conv`, 'Are you trying to convert me?');
  push('9_no_pressure', /not.*pressure|not trying|conscience|listen/i.test(r9.reply), [], r9);

  let r10 = await chat(u, 'My family still disagrees.');
  push('10_family_disagree', /family|disagree|scripture|respect/i.test(r10.reply), [], r10);

  let r11 = await chat(u, 'What should I say to them?');
  push('11_what_say', /say|leviticus|acts|gentle|scripture/i.test(r11.reply), [], r11);

  let r12 = await chat(u, "That's not what I asked");
  push('12_correction', /pork|leviticus|scripture|hear/i.test(r12.reply), [], r12);

  let r13 = await chat(`${prefix}-multi`, 'Can you pray and give me a verse for talking to my family?');
  push('13_multi', /\b(father|lord|jesus|amen)\b/i.test(r13.reply) && /joshua|philippians|verse/i.test(r13.reply), [], r13);

  const uMem = `${prefix}-mem`;
  clearDoctrineConversationState(uMem);
  await chat(uMem, 'Can we eat pork?');
  await chat(uMem, 'How do I explain it to my family?');
  let r14 = await chat(uMem, 'What do you remember?');
  push('14_recall', /remember|family|explain|session|direct/i.test(r14.reply) && !/always know your name/i.test(r14.reply), [], r14);

  await chat(uMem, 'Can you remember that I like direct answers?');
  forgetMemory({ userId: uMem, scope: 'preferences' });
  let r15 = await chat(uMem, 'Forget that.');
  push('15_forget', /clear|forget|reset|preference/i.test(r15.reply), [], r15);

  const indexHtml = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  const uiPass = /reading-plan-link|readingPlanLink|one-year Bible reading/i.test(indexHtml) && /thinkingBubble|showThinkingBubble/i.test(indexHtml);
  results.push({ id: '16_ui', pass: uiPass, failures: uiPass ? [] : ['ui_missing'], preview: 'index.html scan', route: 'ui' });

  const passed = results.filter((r) => r.pass).length;
  const md = [
    '# Phase 5K Relationship Depth Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    '',
    ...results.map((r) => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} — ${r.failures?.join(', ') || 'ok'}\n  ${r.preview}`),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase 5K: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
