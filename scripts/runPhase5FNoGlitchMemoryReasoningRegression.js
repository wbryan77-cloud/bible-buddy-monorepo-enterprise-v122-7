#!/usr/bin/env node
/**
 * Phase 5F — No-glitch turn contract, memory, word-sense regression.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const {
  clearDoctrineConversationState,
  finalizeStopRelease,
} = require('../services/doctrineConversationState');
const { loadGrowthCandidates } = require('../services/reflectionMemoryEngine');
const { getRuntimeHealthSnapshot } = require('../services/runtimeHealthMonitor');
const { COMPANION_SAFE_FALLBACK } = require('../services/responseGuarantee');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5FNoGlitchMemoryReasoningRegressionReport.md');

const FALLBACK_RE = /stay with you on this/i;
const ERROR_RE = /core_connection_error|trouble retrieving additional passages|cannot modify a database/i;

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    route: s.runtime?.masterRoute,
    concept: s.runtime?.bibleConcept || s.runtime?.bncConcept,
    scripture: s.scripture || [],
  };
}

function hasRefs(text, books) {
  const t = text.toLowerCase();
  return books.filter((b) => t.includes(b.toLowerCase())).length;
}

function noUserErrors(r) {
  const f = [];
  if (ERROR_RE.test(r.reply)) f.push('user_visible_error');
  if (FALLBACK_RE.test(r.reply)) f.push('generic_fallback');
  return f;
}

async function run() {
  const prefix = `phase5f-${Date.now()}`;
  const results = [];

  async function t(id, userSuffix, message, check) {
    const userId = `${prefix}-${userSuffix}`;
    clearDoctrineConversationState(userId);
    const r = await chat(userId, message);
    const failures = [...noUserErrors(r), ...(check(r) || [])];
    results.push({
      id,
      pass: failures.length === 0,
      failures,
      message,
      preview: r.reply.slice(0, 180),
      route: r.route,
      concept: r.concept,
    });
    return r;
  }

  const healthBefore = getRuntimeHealthSnapshot();

  const u1 = `${prefix}-stop`;
  clearDoctrineConversationState(u1);
  await chat(u1, 'Acts 10');
  await chat(u1, 'I had a bad day today.');
  await chat(u1, 'show me another verse');
  await chat(u1, 'stop');
  const r1 = await chat(u1, 'show me another verse');
  const f1 = [...noUserErrors(r1)];
  if (!/which bible topic|sabbath|kingdom|clean foods|death/i.test(r1.reply)) f1.push('no_clarifier');
  if (r1.route !== 'no_glitch_clarifier' && !/which bible topic/i.test(r1.reply)) f1.push('wrong_route');
  results.push({ id: '1_stop_verse', pass: f1.length === 0, failures: f1, message: 'stop → show another verse', preview: r1.reply.slice(0, 180), route: r1.route });

  const u2 = `${prefix}-nostate`;
  clearDoctrineConversationState(u2);
  finalizeStopRelease(u2);
  const r2 = await chat(u2, 'show me another verse');
  const f2 = [...noUserErrors(r2)];
  if (!/which bible topic|sabbath|kingdom/i.test(r2.reply)) f2.push('no_clarifier');
  results.push({ id: '2_no_state', pass: f2.length === 0, failures: f2, message: 'show me another verse (no state)', preview: r2.reply.slice(0, 180), route: r2.route });

  await t('3_fornication_verse', 'forn', 'show me another verse about fornication', (r) => {
    const f = [];
    if (!/fornication|corinthians|hebrews|thessalonians/i.test(r.reply)) f.push('no_fornication');
    return f;
  });

  const u4 = `${prefix}-hijack`;
  clearDoctrineConversationState(u4);
  await chat(u4, 'Can we eat pork?');
  const r4 = await chat(u4, 'the abomination talk about by Daniel');
  const f4 = [...noUserErrors(r4)];
  if (/pork|swine|dietary/i.test(r4.reply) && !/abomination/i.test(r4.reply)) f4.push('dietary_hijack');
  if (!/abomination|daniel|matthew/i.test(r4.reply)) f4.push('no_abomination');
  results.push({ id: '4_pork_abom', pass: f4.length === 0, failures: f4, message: 'pork → abomination', preview: r4.reply.slice(0, 180), route: r4.route });

  const u5 = `${prefix}-kingdom`;
  clearDoctrineConversationState(u5);
  await chat(u5, 'Is heaven coming to earth');
  const r5 = await chat(u5, 'Give me more scriptures on that');
  const f5 = [...noUserErrors(r5)];
  if (/third heaven/i.test(r5.reply) && !/kingdom|matthew\s*6|revelation\s*5/i.test(r5.reply)) f5.push('third_heaven_drift');
  if (hasRefs(r5.reply, ['Matthew', 'Revelation', 'Daniel', 'Psalm']) < 1) f5.push('refs');
  results.push({ id: '5_kingdom_follow', pass: f5.length === 0, failures: f5, message: 'kingdom follow-up', preview: r5.reply.slice(0, 180), route: r5.route });

  const u6 = `${prefix}-person`;
  clearDoctrineConversationState(u6);
  await chat(u6, 'the abomination talk about by Daniel');
  const r6 = await chat(u6, 'Is this a person?');
  const f6 = [...noUserErrors(r6)];
  if (!/holy place|abomination|event|daniel|matthew/i.test(r6.reply)) f6.push('no_actor');
  results.push({ id: '6_person', pass: f6.length === 0, failures: f6, message: 'abomination → person?', preview: r6.reply.slice(0, 180), route: r6.route });

  await t('7_sed', 'sed', 'I think she may want to have sed on our date', (r) => {
    const f = [];
    if (!/fornication|marriage|boundary|hebrews|corinthians/i.test(r.reply)) f.push('no_boundary');
    if (/pull out|contracept/i.test(r.reply)) f.push('mechanics');
    return f;
  });

  await t('8_seed', 'seed', 'There is a story about seed spilled on the ground', (r) => {
    const f = [];
    if (!/genesis\s*38|onan/i.test(r.reply)) f.push('no_onan');
    if (/contraception doctrine/i.test(r.reply)) f.push('overclaim');
    return f;
  });

  await t('9_learning', 'learn', 'Can you remember that for others when they ask?', (r) => {
    const f = [];
    const data = loadGrowthCandidates();
    if (!data.candidates?.some((c) => c.status === 'pending_review')) f.push('no_pending');
    if (/cannot modify a database/i.test(r.reply)) f.push('db_deny');
    return f;
  });

  await t('10_overwhelmed', 'over', "I'm overwhelmed", (r) => {
    const f = [];
    if (!/here|sorry|overwhelmed|scripture|psalm/i.test(r.reply)) f.push('cold');
    return f;
  });

  await t('11_prayer', 'pray', 'Can you pray with me?', (r) => {
    const f = [];
    if (!/lord|jesus|amen|pray/i.test(r.reply)) f.push('no_prayer');
    return f;
  });

  await t('12_pork', 'pork', 'Can we eat pork?', (r) => {
    const f = [];
    if (!/^no\b/i.test(r.reply.trim())) f.push('no_first');
    if (hasRefs(r.reply, ['Leviticus', 'Deuteronomy']) < 1) f.push('refs');
    return f;
  });

  await t('13_sex', 'sex', 'Can we have sex without marriage?', (r) => {
    const f = [];
    if (!/fornication|marriage|hebrews|corinthians/i.test(r.reply)) f.push('boundary');
    if (hasRefs(r.reply, ['Hebrews', 'Corinthians', 'Thessalonians']) < 2) f.push('refs<2');
    return f;
  });

  await t('14_unknown', 'unk', 'What does Zephyrian covenant mean in scriture?', (r) => {
    const f = [];
    if (!/which|tell me more|clarif|book|topic|passage/i.test(r.reply)) f.push('no_clarify');
    if (/zephyrian covenant is/i.test(r.reply)) f.push('hallucination');
    return f;
  });

  const errorScan = results.every((r) => r.pass && !ERROR_RE.test(r.preview));
  results.push({
    id: '15_no_user_errors',
    pass: errorScan,
    failures: errorScan ? [] : ['error_in_prior_tests'],
    message: 'scan all replies',
    preview: 'no core_connection_error / retrieval / db deny',
    route: 'aggregate',
  });

  const healthAfter = getRuntimeHealthSnapshot();
  const healthOk =
    healthAfter.memoryPressureLevel === 'normal' &&
    (healthAfter.errors === healthBefore.errors || healthAfter.errors === 0);
  results.push({
    id: '16_health',
    pass: healthOk,
    failures: healthOk ? [] : ['health_metrics'],
    message: 'health snapshot',
    preview: `errors=${healthAfter.errors} pressure=${healthAfter.memoryPressureLevel} clarifiers=${healthAfter.contractClarifiers || 0}`,
    route: 'runtime_health',
  });

  const passed = results.filter((r) => r.pass).length;
  const md = [
    '# Phase 5F No-Glitch Memory Reasoning Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    '',
    ...results.map((r) => {
      const status = r.pass ? 'PASS' : 'FAIL';
      return `- [${status}] ${r.id} — ${r.failures.length ? r.failures.join(', ') : 'ok'}\n  ${r.preview}`;
    }),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase 5F: ${passed}/${results.length}`);
  if (passed < results.length) {
    process.exitCode = 1;
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
