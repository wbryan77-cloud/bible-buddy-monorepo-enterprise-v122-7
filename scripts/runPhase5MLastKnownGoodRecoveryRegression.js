#!/usr/bin/env node
/**
 * Phase 5M — Last-known-good recovery live transcript regression.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { detectForbiddenOldPath } = require('../services/singleCompanionContract');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5MLastKnownGoodRecoveryRegressionReport.md');

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    route: s.runtime?.masterRoute,
    liveOwner: s.runtime?.liveResponseOwner,
  };
}

function row(id, pass, failures, r) {
  return { id, pass, failures, preview: (r?.reply || '').slice(0, 200), route: r?.route, liveOwner: r?.liveOwner };
}

async function run() {
  const ts = Date.now();
  const u = `phase5m-${ts}`;
  clearDoctrineConversationState(u);
  const results = [];

  let r1 = await chat(u, 'Can we eat pork?');
  results.push(row('1_pork', /^No\./i.test(r1.reply) && !/^Yes/i.test(r1.reply.trim()), ['pork_no'], r1));

  let r2 = await chat(u, 'Does pork taste good?');
  results.push(row('2_taste', /some people may like the taste|unclean|not good to eat/i.test(r2.reply) && !/^Yes[—,\s]/i.test(r2.reply.trim()), ['taste'], r2));

  let r3 = await chat(u, 'Why are you still saying yes?');
  results.push(row('3_correction', /should not start with .Yes|answer with .No/i.test(r3.reply), ['correction'], r3));

  let r4 = await chat(u, 'So I ask you again. Does pork taste good?');
  results.push(row('4_taste_again', /taste|unclean|not good/i.test(r4.reply) && !/^Yes[—,\s]/i.test(r4.reply.trim()), ['taste_again'], r4));

  let r5 = await chat(u, 'Is pork good meat to eat?');
  results.push(row('5_good_meat', /^No\./i.test(r5.reply) && /unclean|not good/i.test(r5.reply), ['good_meat'], r5));

  let r6 = await chat(u, 'How do I explain it to my family?');
  results.push(row('6_explain', /Leviticus|Acts 10:28|without sounding harsh/i.test(r6.reply) && !/which book, topic/i.test(r6.reply), ['explain'], r6));

  let r7 = await chat(u, "What do you need to know? I'm asking what we were talking about.");
  results.push(row('7_meta', /Leviticus|explain|family/i.test(r7.reply) && !/which book, topic/i.test(r7.reply), ['meta'], r7));

  let r8 = await chat(u, 'About what we talked about.');
  results.push(row('8_meta_short', /Leviticus|explain|family|pork/i.test(r8.reply) && !/which book, topic/i.test(r8.reply), ['meta_short'], r8));

  let r9 = await chat(u, 'Yes. How do I explain it to my family?');
  results.push(row('9_explain_yes', /Leviticus|explain|family/i.test(r9.reply) && !/which book, topic/i.test(r9.reply), ['explain_yes'], r9));

  let r10 = await chat(u, 'Can you pray with me?');
  results.push(row('10_prayer', /\b(father|lord|jesus|amen)\b/i.test(r10.reply), ['prayer'], r10));

  let r11 = await chat(u, 'Can you pray with me? not just send scripture');
  results.push(row('11_prayer_not_scripture', /\b(father|lord|jesus|amen)\b/i.test(r11.reply) && !/Scripture invites/i.test(r11.reply), ['prayer_ns'], r11));

  let r12 = await chat(u, "Why can't you pray with me?");
  results.push(row('12_prayer_why', /\b(father|lord|jesus|amen)\b/i.test(r12.reply), ['prayer_why'], r12));

  const app = `phase5m-app-${ts}`;
  clearDoctrineConversationState(app);
  let r13 = await chat(app, 'What is this app?');
  results.push(row('13_app', /companion|Scripture|listen|pray/i.test(r13.reply) && !/which book, topic/i.test(r13.reply), ['app'], r13));

  let r14 = await chat(app, 'What is this app and how does it work?');
  results.push(row('14_app_work', /companion|work|message/i.test(r14.reply), ['app_work'], r14));

  let r15 = await chat(app, "What is this app? I'm nervous.");
  results.push(row('15_app_nervous', /companion|nervous|understandable/i.test(r15.reply), ['app_nervous'], r15));

  const nerv = `phase5m-nerv-${ts}`;
  clearDoctrineConversationState(nerv);
  let r16 = await chat(nerv, "I'm nervous.");
  results.push(row('16_nervous', /nervous|breathe|pray|concern/i.test(r16.reply), ['nervous'], r16));

  let r17 = await chat(nerv, 'What do I do about it?');
  results.push(row('17_what_do', /breathe|pray|step|concern/i.test(r17.reply), ['what_do'], r17));

  let r18 = await chat(nerv, 'And then what do I do?');
  results.push(row('18_then', /breathe|pray|step|practical/i.test(r18.reply), ['then'], r18));

  const forbidden = results.filter((r) => detectForbiddenOldPath(r.preview, { hasEstablishedTopic: true }).length > 0);
  const passed = results.filter((r) => r.pass).length;
  const md = [
    '# Phase 5M Last Known Good Recovery Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    forbidden.length ? `**Forbidden leaks:** ${forbidden.length}` : '',
    '',
    ...results.map((r) => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} — ${r.failures?.join(', ') || 'ok'} (owner=${r.liveOwner})\n  ${r.preview}`),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase 5M recovery: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
