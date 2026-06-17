#!/usr/bin/env node
/**
 * Phase 5H — Companion intent intelligence, memory control, two-witness balance.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { getUserAnswerPreferences } = require('../services/userCorrectionMemory');
const { guardChecks } = require('../services/companionStyleGuard');
const { classifyCompanionIntent } = require('../services/companionIntentIntelligence');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5HCompanionIntentIntelligenceRegressionReport.md');

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
  const prefix = `phase5h-${Date.now()}`;
  const results = [];

  function push(id, pass, failures, message, r) {
    results.push({
      id,
      pass,
      failures,
      message,
      preview: (r?.reply || '').slice(0, 200),
      route: r?.route,
    });
  }

  const uThread = `${prefix}-thread`;
  clearDoctrineConversationState(uThread);
  const r1 = await chat(uThread, 'Can we eat pork?');
  let f1 = [...guardChecks('Can we eat pork?', r1.reply)];
  if (!/^no\b/i.test(r1.reply.trim())) f1.push('no_first');
  if (hasBooks(r1.reply, ['Leviticus', 'Deuteronomy']) < 2) f1.push('witness<2');
  push('1_pork', f1.length === 0, f1, 'Can we eat pork?', r1);

  const r2 = await chat(uThread, 'Why?');
  let f2 = [...guardChecks('Why?', r2.reply)];
  if (!/leviticus|deuteronomy|unclean|swine/i.test(r2.reply)) f2.push('no_why');
  if (r2.reply.length > 500 && /leviticus.*deuteronomy.*leviticus/i.test(r2.reply.toLowerCase())) f2.push('doctrine_dump');
  push('2_why', f2.length === 0, f2, 'Why?', r2);

  const r3 = await chat(uThread, 'What about Acts 10?');
  let f3 = [...guardChecks('What about Acts 10?', r3.reply)];
  if (!/acts\s*10:?\s*28|people|gentiles|unclean/i.test(r3.reply)) f3.push('no_acts10');
  push('3_acts10', f3.length === 0, f3, 'What about Acts 10?', r3);

  const r4 = await chat(uThread, 'How should I explain it?');
  let f4 = [...guardChecks('How should I explain it?', r4.reply)];
  if (/which book, topic, or passage/i.test(r4.reply)) f4.push('clarification_loop');
  if (!/leviticus|deuteronomy|acts|not judging|scripture/i.test(r4.reply)) f4.push('no_explain');
  push('4_how_explain', f4.length === 0, f4, 'How should I explain it?', r4);

  const r5 = await chat(uThread, 'But how do I explain it to them?');
  let f5 = [...guardChecks('But how do I explain it to them?', r5.reply)];
  if (/which book, topic, or passage/i.test(r5.reply)) f5.push('clarification_loop');
  if (!/leviticus|acts|scripture|gentle|not judging/i.test(r5.reply)) f5.push('no_explain');
  push('5_explain_them', f5.length === 0, f5, 'But how do I explain it to them?', r5);

  const r6 = await chat(uThread, 'Can you pray with me?');
  let f6 = [...guardChecks('Can you pray with me?', r6.reply)];
  if (!/\b(father|lord|jesus|amen)\b/i.test(r6.reply)) f6.push('no_prayer');
  push('6_prayer', f6.length === 0, f6, 'Can you pray with me?', r6);

  const r7 = await chat(uThread, "I'm nervous about talking to them");
  let f7 = [...guardChecks("I'm nervous about talking to them", r7.reply)];
  if (!/nervous|family|scripture|joshua|philippians|pray/i.test(r7.reply)) f7.push('cold');
  push('7_nervous', f7.length === 0, f7, "I'm nervous about talking to them", r7);

  const r8 = await chat(uThread, 'What verse should I remember?');
  let f8 = [...guardChecks('What verse should I remember?', r8.reply)];
  if (!/joshua|philippians|verse/i.test(r8.reply)) f8.push('no_verse');
  push('8_verse_remember', f8.length === 0, f8, 'What verse should I remember?', r8);

  const uSex = `${prefix}-sex`;
  clearDoctrineConversationState(uSex);
  const r9 = await chat(uSex, 'I want to have sex with this girl with strings attached');
  let f9 = [...guardChecks('I want to have sex with this girl with strings attached', r9.reply)];
  if (!/fornication|marriage|boundary|hebrews|corinthians/i.test(r9.reply)) f9.push('soft');
  if (hasBooks(r9.reply, ['Corinthians', 'Thessalonians', 'Hebrews']) < 2) f9.push('refs<2');
  push('9_sex_strings', f9.length === 0, f9, 'sex strings attached', r9);

  const intentTell = classifyCompanionIntent({
    message: "If I'm not ready, how do I tell her?",
    state: { lastAnsweredConcept: 'fornication_sexual_sin' },
  });
  const r10 = await chat(uSex, "If I'm not ready, how do I tell her?");
  let f10 = [...guardChecks("If I'm not ready, how do I tell her?", r10.reply)];
  if (!/care about you|not ready|honor|boundary|slow down|corinthians/i.test(r10.reply)) f10.push('no_script');
  if (intentTell.category !== 'boundary_script') f10.push('wrong_intent');
  if (/not judging anyone/i.test(r10.reply)) f10.push('family_explain_leak');
  push('10_tell_her', f10.length === 0, f10, 'how do I tell her', r10);

  const uPref = `${prefix}-pref`;
  clearDoctrineConversationState(uPref);
  const r11 = await chat(uPref, 'Can you remember that I like direct answers?');
  let f11 = [...guardChecks('Can you remember that I like direct answers?', r11.reply)];
  if (/cannot modify a database/i.test(r11.reply)) f11.push('db_deny');
  if (!/remember|preference|conversation|direct/i.test(r11.reply)) f11.push('no_ack');
  push('11_preference', f11.length === 0, f11, 'remember direct answers', r11);

  const prefs = getUserAnswerPreferences(uPref);
  const r12 = await chat(uPref, 'Can we eat pork?');
  let f12 = [...guardChecks('Can we eat pork?', r12.reply)];
  if (prefs.directAnswerFirst && !/^no\b/i.test(r12.reply.trim())) f12.push('pref_not_applied');
  push('12_pref_applied', f12.length === 0, f12, 'pork after preference', r12);

  const r13 = await chat(`${prefix}-over`, 'My feeling overwhelmed');
  let f13 = [...guardChecks('My feeling overwhelmed', r13.reply)];
  if (!/overwhelmed|here|scripture|psalm|\?/i.test(r13.reply)) f13.push('cold');
  push('13_overwhelmed', f13.length === 0, f13, 'overwhelmed', r13);

  const uLearn = `${prefix}-learn`;
  clearDoctrineConversationState(uLearn);
  const r14 = await chat(uLearn, 'Can you put this in your database for others?');
  let f14 = [...guardChecks('Can you put this in your database for others?', r14.reply)];
  if (/cannot modify a database/i.test(r14.reply)) f14.push('db_deny');
  if (!/pending|review|learning|candidate|others/i.test(r14.reply)) f14.push('no_learning_ack');
  push('14_learning_candidate', f14.length === 0, f14, 'database for others', r14);

  const errorScan = results.every((r) => r.pass && !ERROR_RE.test(r.preview));
  push('15_no_errors', errorScan, errorScan ? [] : ['errors'], 'aggregate scan', { reply: 'scan', route: 'aggregate' });

  const passed = results.filter((r) => r.pass).length;
  const md = [
    '# Phase 5H Companion Intent Intelligence Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    '',
    ...results.map((r) => {
      const st = r.pass ? 'PASS' : 'FAIL';
      return `- [${st}] ${r.id} — ${r.failures?.length ? r.failures.join(', ') : 'ok'}\n  ${r.preview}`;
    }),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase 5H: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
