#!/usr/bin/env node
/**
 * Phase 5L — Exact live-thread regression (single-session continuity).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { detectForbiddenOldPath } = require('../services/singleCompanionContract');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5LLiveThreadRegressionReport.md');

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    route: s.runtime?.masterRoute,
    liveOwner: s.runtime?.liveResponseOwner,
    scripture: s.scripture || [],
  };
}

function assert(id, pass, failures, r) {
  return { id, pass, failures, preview: (r?.reply || '').slice(0, 200), route: r?.route, liveOwner: r?.liveOwner };
}

async function run() {
  const ts = Date.now();
  const pork = `phase5l-pork-${ts}`;
  clearDoctrineConversationState(pork);
  const results = [];

  let r1 = await chat(pork, 'Can we eat pork?');
  results.push(assert('1_pork', /^No\.\s+Staying with Scripture/i.test(r1.reply) && !/No\.\s+staying\b/.test(r1.reply) && !/pork.*unclean.*pork.*unclean/i.test(r1.reply.toLowerCase()), ['pork_format'], r1));

  let r2 = await chat(pork, 'What about Acts 10?');
  results.push(assert('2_acts10', /Acts 10:28/i.test(r2.reply) && /Acts 10:14/i.test(r2.reply) && !/Absolutely.*staying/i.test(r2.reply), ['acts10'], r2));

  let r3 = await chat(pork, 'How do I explain it to my family?');
  results.push(assert('3_explain_family', /I hear you|without sounding harsh/i.test(r3.reply) && /Leviticus 11/i.test(r3.reply) && !/which book, topic/i.test(r3.reply), ['explain'], r3));

  let r4 = await chat(pork, 'How do I explain it to my family?');
  results.push(assert('4_explain_repeat', /Leviticus 11|Acts 10:28/i.test(r4.reply) && !/which book, topic/i.test(r4.reply), ['explain_repeat'], r4));

  let r5 = await chat(pork, 'Can you pray with me?');
  results.push(assert('5_prayer', /\b(father|lord|jesus|amen)\b/i.test(r5.reply) && !/Scripture invites/i.test(r5.reply), ['prayer'], r5));

  let r6 = await chat(pork, 'Can you give me a deeper prayer?');
  results.push(assert('6_deeper_prayer', /\b(father|lord|jesus|amen)\b/i.test(r6.reply) && !/you might pray/i.test(r6.reply), ['deeper_prayer'], r6));

  const over = `phase5l-over-${ts}`;
  clearDoctrineConversationState(over);
  let r7 = await chat(over, "I'm overwhelmed.");
  results.push(assert('7_overwhelmed', /sorry|heaviest|family, work/i.test(r7.reply) && /\?/.test(r7.reply), ['overwhelmed'], r7));

  let r8 = await chat(over, "I'm overwhelmed.");
  results.push(assert('8_overwhelmed_repeat', /sorry|heaviest|overwhelmed/i.test(r8.reply), ['overwhelmed_repeat'], r8));

  const app = `phase5l-app-${ts}`;
  clearDoctrineConversationState(app);
  let r9 = await chat(app, 'What is this app?');
  results.push(assert('9_app', /Scripture-grounded companion/i.test(r9.reply) && !/which book, topic/i.test(r9.reply), ['app'], r9));

  let r10 = await chat(app, 'What is this app?');
  results.push(assert('10_app_repeat', /companion|listen|pray/i.test(r10.reply) && !/which book, topic/i.test(r10.reply), ['app_repeat'], r10));

  let r11 = await chat(`phase5l-conv-${ts}`, 'Are you trying to convert me?');
  results.push(assert('11_convert', /not.*force|not.*pressure|no\./i.test(r11.reply), ['convert'], r11));

  let r12 = await chat(pork, 'My family disagrees.');
  results.push(assert('12_family_disagree', /family|disagree|scripture|respect/i.test(r12.reply), ['family_disagree'], r12));

  let r13 = await chat(pork, "I'm nervous.");
  results.push(assert('13_nervous', /nervous.*family|family about what you believe/i.test(r13.reply), ['nervous'], r13));

  let r14 = await chat(pork, "I'm nervous.");
  results.push(assert('14_nervous_repeat', /nervous|family|pray first|words to say/i.test(r14.reply), ['nervous_repeat'], r14));

  let r15 = await chat(pork, 'What do you remember?');
  results.push(assert('15_memory', /remember|family|explain|session|conversation/i.test(r15.reply), ['memory'], r15));

  const alpha = `phase5l-alpha-${ts}`;
  clearDoctrineConversationState(alpha);
  await chat(alpha, 'I am planning alpha testing for BibleBuddy with a small group.');
  let r16 = await chat(alpha, '10 users');
  results.push(assert('16_alpha_users', /alpha|testers?|10/i.test(r16.reply) && !/which book, topic/i.test(r16.reply), ['alpha_users'], r16));

  let r17 = await chat(alpha, '1 week');
  results.push(assert('17_alpha_week', /week|alpha|test plan|day/i.test(r17.reply) && !/which book, topic/i.test(r17.reply), ['alpha_week'], r17));

  const forbiddenHits = results.filter((r) => detectForbiddenOldPath(r.preview, { message: '', hasEstablishedTopic: true }).length);
  const indexHtml = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  const uiPass =
    /footerReadingPlanLink|one-year Bible reading plan/i.test(indexHtml) &&
    /thinkingBubble|showThinkingBubble/i.test(indexHtml) &&
    /Pray with me/i.test(indexHtml);
  results.push({ id: '18_ui', pass: uiPass, failures: uiPass ? [] : ['ui'], preview: 'index.html', route: 'ui', liveOwner: null });

  const liveOwnerPass = results.filter((r) => r.liveOwner === true || r.id === '18_ui').length;
  const passed = results.filter((r) => r.pass).length;
  const md = [
    '# Phase 5L Live Thread Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    `**Live owner on turns:** ${liveOwnerPass}/${results.length - 1}`,
  forbiddenHits.length ? `**Forbidden phrase leaks in previews:** ${forbiddenHits.length}` : '',
    '',
    ...results.map((r) => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} — ${r.failures?.join(', ') || 'ok'} (owner=${r.liveOwner})\n  ${r.preview}`),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase 5L live thread: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
