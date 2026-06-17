#!/usr/bin/env node
/**
 * Phase 5I — Relationship intelligence, Scripture-anchored companion memory.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { getUserAnswerPreferences } = require('../services/userCorrectionMemory');
const { guardChecks } = require('../services/companionStyleGuard');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5IRelationshipIntelligenceRegressionReport.md');

const ERROR_RE = /core_connection_error|trouble retrieving additional passages|cannot modify a database/i;

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    route: s.runtime?.masterRoute,
    scripture: s.scripture || [],
  };
}

function hasBooks(text, books) {
  const t = text.toLowerCase();
  return books.filter((b) => t.includes(b.toLowerCase())).length;
}

async function run() {
  const prefix = `phase5i-${Date.now()}`;
  const results = [];

  function push(id, pass, failures, message, r) {
    results.push({
      id,
      pass,
      failures,
      message,
      preview: (r?.reply || '').slice(0, 220),
      route: r?.route,
    });
  }

  const uPork = `${prefix}-pork`;
  clearDoctrineConversationState(uPork);
  const r1 = await chat(uPork, 'Can we eat pork?');
  let f1 = [...guardChecks('Can we eat pork?', r1.reply)];
  if (!/^no\b/i.test(r1.reply.trim())) f1.push('no_first');
  if (hasBooks(r1.reply, ['Leviticus', 'Deuteronomy']) < 2) f1.push('witness<2');
  push('1_pork', f1.length === 0, f1, 'Can we eat pork?', r1);

  const r2 = await chat(uPork, 'Why?');
  let f2 = [...guardChecks('Why?', r2.reply)];
  if (!/leviticus|deuteronomy|unclean|swine/i.test(r2.reply)) f2.push('no_why');
  if (r2.reply.length > 600 && /leviticus.*deuteronomy.*leviticus/i.test(r2.reply.toLowerCase())) f2.push('dump');
  push('2_why', f2.length === 0, f2, 'Why?', r2);

  const r3 = await chat(uPork, 'What about Acts 10?');
  let f3 = [...guardChecks('What about Acts 10?', r3.reply)];
  if (!/acts\s*10:?\s*28|people|gentiles|unclean/i.test(r3.reply)) f3.push('no_acts10');
  push('3_acts10', f3.length === 0, f3, 'What about Acts 10?', r3);

  const r4 = await chat(uPork, 'What if my family disagrees?');
  let f4 = [...guardChecks('What if my family disagrees?', r4.reply)];
  if (!/family|respect|scripture|gentle|leviticus|acts/i.test(r4.reply)) f4.push('no_family');
  push('4_family_disagree', f4.length === 0, f4, 'What if my family disagrees?', r4);

  const r5 = await chat(uPork, 'How should I explain it?');
  let f5 = [...guardChecks('How should I explain it?', r5.reply)];
  if (/which book, topic, or passage/i.test(r5.reply)) f5.push('clarification_loop');
  if (!/leviticus|deuteronomy|acts|not judging|scripture/i.test(r5.reply)) f5.push('no_explain');
  push('5_how_explain', f5.length === 0, f5, 'How should I explain it?', r5);

  const r6 = await chat(uPork, 'But how do I explain it to them?');
  let f6 = [...guardChecks('But how do I explain it to them?', r6.reply)];
  if (/which book, topic, or passage/i.test(r6.reply)) f6.push('clarification_loop');
  if (!/leviticus|acts|scripture|gentle|not judging/i.test(r6.reply)) f6.push('no_explain');
  push('6_explain_them', f6.length === 0, f6, 'But how do I explain it to them?', r6);

  const r7 = await chat(uPork, 'Can you pray with me?');
  let f7 = [...guardChecks('Can you pray with me?', r7.reply)];
  if (!/\b(father|lord|jesus|amen)\b/i.test(r7.reply)) f7.push('no_prayer');
  push('7_prayer', f7.length === 0, f7, 'Can you pray with me?', r7);

  const r8 = await chat(uPork, "I'm nervous about talking to them");
  let f8 = [...guardChecks("I'm nervous about talking to them", r8.reply)];
  if (!/nervous|family|scripture|joshua|philippians|pray/i.test(r8.reply)) f8.push('cold');
  push('8_nervous', f8.length === 0, f8, "I'm nervous about talking to them", r8);

  const r9 = await chat(uPork, 'What verse should I remember?');
  let f9 = [...guardChecks('What verse should I remember?', r9.reply)];
  if (!/joshua|philippians|verse/i.test(r9.reply)) f9.push('no_verse');
  push('9_verse_remember', f9.length === 0, f9, 'What verse should I remember?', r9);

  const uSex = `${prefix}-sex`;
  clearDoctrineConversationState(uSex);
  const r10 = await chat(uSex, 'I want to have sex with this girl with strings attached');
  let f10 = [...guardChecks('I want to have sex with this girl with strings attached', r10.reply)];
  if (!/fornication|marriage|boundary|hebrews|corinthians/i.test(r10.reply)) f10.push('soft');
  if (hasBooks(r10.reply, ['Corinthians', 'Thessalonians', 'Hebrews']) < 2) f10.push('refs<2');
  push('10_sex_strings', f10.length === 0, f10, 'sex strings attached', r10);

  const r11 = await chat(uSex, "If I'm not ready, how do I tell her?");
  let f11 = [...guardChecks("If I'm not ready, how do I tell her?", r11.reply)];
  if (!/care about you|not ready|honor|boundary|corinthians/i.test(r11.reply)) f11.push('no_script');
  if (/not judging anyone/i.test(r11.reply)) f11.push('family_leak');
  push('11_tell_her', f11.length === 0, f11, 'how do I tell her', r11);

  const r12 = await chat(`${prefix}-over`, 'My feeling overwhelmed');
  let f12 = [...guardChecks('My feeling overwhelmed', r12.reply)];
  if (!/overwhelmed|here|scripture|psalm|\?/i.test(r12.reply)) f12.push('cold');
  push('12_overwhelmed', f12.length === 0, f12, 'overwhelmed', r12);

  const uPref = `${prefix}-pref`;
  clearDoctrineConversationState(uPref);
  const r13 = await chat(uPref, 'Can you remember that I like direct answers?');
  let f13 = [...guardChecks('Can you remember that I like direct answers?', r13.reply)];
  if (!/remember|preference|conversation|direct/i.test(r13.reply)) f13.push('no_ack');
  push('13_preference', f13.length === 0, f13, 'remember direct answers', r13);

  const prefsBeforeForget = getUserAnswerPreferences(uPref);
  const r14 = await chat(uPref, 'Forget that preference');
  let f14 = [...guardChecks('Forget that preference', r14.reply)];
  const prefsAfterForget = getUserAnswerPreferences(uPref);
  if (prefsBeforeForget.directAnswerFirst && prefsAfterForget.directAnswerFirst) f14.push('pref_not_cleared');
  if (!/clear|forget|reset|preference/i.test(r14.reply)) f14.push('no_forget_ack');
  push('14_forget_pref', f14.length === 0, f14, 'Forget that preference', r14);

  const r15 = await chat(uPref, 'Can we eat pork?');
  let f15 = [...guardChecks('Can we eat pork?', r15.reply)];
  push('15_after_forget', f15.length === 0, f15, 'pork after forget', r15);

  const uLearn = `${prefix}-learn`;
  clearDoctrineConversationState(uLearn);
  const r16 = await chat(uLearn, 'Can you put this in your database for others?');
  let f16 = [...guardChecks('Can you put this in your database for others?', r16.reply)];
  if (!/pending|review|learning|candidate|others/i.test(r16.reply)) f16.push('no_learning_ack');
  push('16_learning', f16.length === 0, f16, 'database for others', r16);

  const uMulti = `${prefix}-multi`;
  clearDoctrineConversationState(uMulti);
  const r17 = await chat(
    uMulti,
    'Can you pray with me and give me a verse for talking to my family?',
  );
  let f17 = [...guardChecks('multi prayer verse', r17.reply)];
  if (!/\b(father|lord|jesus|amen)\b/i.test(r17.reply)) f17.push('no_prayer');
  if (!/joshua|philippians|verse/i.test(r17.reply)) f17.push('no_verse');
  push('17_multi_intent', f17.length === 0, f17, 'pray + verse', r17);

  const uRecall = `${prefix}-recall`;
  clearDoctrineConversationState(uRecall);
  await chat(uRecall, 'Can you remember that I like direct answers?');
  const r18 = await chat(uRecall, 'What do you remember about me?');
  let f18 = [...guardChecks('What do you remember about me?', r18.reply)];
  if (/my name|where you live|always know you/i.test(r18.reply)) f18.push('false_memory');
  if (!/direct|preference|session|remember/i.test(r18.reply)) f18.push('no_recall');
  push('18_memory_recall', f18.length === 0, f18, 'what do you remember', r18);

  const errorScan = results.every((r) => r.pass && !ERROR_RE.test(r.preview));
  push('19_no_errors', errorScan, errorScan ? [] : ['errors'], 'aggregate', { reply: 'scan', route: 'aggregate' });

  const passed = results.filter((r) => r.pass).length;
  const md = [
    '# Phase 5I Relationship Intelligence Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    '',
    ...results.map((r) => {
      const st = r.pass ? 'PASS' : 'FAIL';
      return `- [${st}] ${r.id} — ${r.failures?.length ? r.failures.join(', ') : 'ok'}\n  route: ${r.route}\n  ${r.preview}`;
    }),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase 5I: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
