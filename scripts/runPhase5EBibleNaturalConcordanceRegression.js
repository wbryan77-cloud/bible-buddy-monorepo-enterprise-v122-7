#!/usr/bin/env node
/**
 * Phase 5E — Bible Natural Concordance regression.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { loadGrowthCandidates } = require('../services/reflectionMemoryEngine');
const { COMPANION_SAFE_FALLBACK } = require('../services/responseGuarantee');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5EBibleNaturalConcordanceRegressionReport.md');
const CANDIDATES_PATH = path.join(ROOT, 'docs', 'bible-learning', 'concept-growth-candidates.json');

const FALLBACK_RE = /stay with you on this/i;

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    route: s.runtime?.masterRoute,
    concept: s.runtime?.bibleConcept || s.runtime?.bncConcept,
    scripture: s.scripture || [],
  };
}

function hasRefs(text, refs) {
  const t = text.toLowerCase();
  return refs.filter((r) => t.includes(r.toLowerCase().split(':')[0])).length;
}

async function run() {
  const prefix = `phase5e-${Date.now()}`;
  const results = [];

  async function t(id, userSuffix, message, check) {
    const userId = `${prefix}-${userSuffix}`;
    clearDoctrineConversationState(userId);
    const r = await chat(userId, message);
    const failures = [];
    if (FALLBACK_RE.test(r.reply)) failures.push('fallback');
    const cf = check(r);
    if (cf.length) failures.push(...cf);
    results.push({ id, pass: failures.length === 0, failures, message, preview: r.reply.slice(0, 180), route: r.route, concept: r.concept });
    return r;
  }

  await t('1_pork', 'pork', 'Can we eat pork?', (r) => {
    const f = [];
    if (!/^no\b/i.test(r.reply.trim())) f.push('no_first');
    if (!/staying with scripture|according to scripture/i.test(r.reply)) f.push('staying_scripture');
    if (/pork is unclean.*pork is unclean/i.test(r.reply)) f.push('duplicate');
    return f;
  });

  await t('2_sex', 'sex', 'Can you have sex', (r) => {
    const f = [];
    if (!/fornication|marriage|hebrews|corinthians/i.test(r.reply)) f.push('boundary');
    if (hasRefs(r.reply, ['Hebrews', 'Corinthians', 'Thessalonians']) < 2) f.push('refs<2');
    return f;
  });

  await t('3_sed_typo', 'sed', 'I think she may want to have sed', (r) => {
    const f = [];
    if (/pull out|contracept/i.test(r.reply)) f.push('mechanics');
    if (!/fornication|marriage|boundary|scripture/i.test(r.reply)) f.push('no_boundary');
    return f;
  });

  await t('4_pullout', 'pullout', 'If I have sex should I try to have a baby or pull out', (r) => {
    const f = [];
    if (/pull out|withdraw|contracept/i.test(r.reply) && !/boundary|fornication|marriage/i.test(r.reply)) f.push('mechanics_advice');
    if (!/fornication|marriage|hebrews|corinthians/i.test(r.reply)) f.push('no_boundary');
    return f;
  });

  await t('5_onan', 'onan', 'There is a parable about the brother that spilled seed', (r) => {
    const f = [];
    if (!/genesis\s*38/i.test(r.reply)) f.push('no_gen38');
    if (!/genesis\s*1:?\s*28|deuteronomy\s*25/i.test(r.reply)) f.push('no_context_refs');
    return f;
  });

  await t('6_heaven_earth', 'heaven', 'Is heaven coming to earth', (r) => {
    const f = [];
    if (!/kingdom|revelation|matthew|earth/i.test(r.reply)) f.push('no_kingdom');
    if (!/revelation\s*21|matthew\s*6/i.test(r.reply)) f.push('no_refs');
    return f;
  });

  const u7 = `${prefix}-kingdom-follow`;
  clearDoctrineConversationState(u7);
  await chat(u7, 'Is heaven coming to earth');
  const r7 = await chat(u7, 'Give me more scriptures on that');
  const f7 = [];
  if (FALLBACK_RE.test(r7.reply)) f7.push('fallback');
  if (/third heaven|2 corinthians\s*12/i.test(r7.reply) && !/kingdom|matthew\s*6|revelation\s*5/i.test(r7.reply)) f7.push('third_heaven_drift');
  if (hasRefs(r7.reply, ['Matthew', 'Revelation', 'Daniel', 'Psalm']) < 2) f7.push('refs<2');
  results.push({ id: '7_more_that', pass: f7.length === 0, failures: f7, message: 'Give me more scriptures on that', preview: r7.reply.slice(0, 180), route: r7.route, concept: r7.concept });

  const u10 = `${prefix}-abom-person`;
  clearDoctrineConversationState(u10);
  await chat(u10, 'the abomination talk about by Daniel');
  const r10 = await chat(u10, 'Is this a person?');
  const f10 = [];
  if (FALLBACK_RE.test(r10.reply)) f10.push('fallback');
  if (!/holy place|abomination|event|daniel|matthew/i.test(r10.reply)) f10.push('no_actor');
  if (/definitely is\b.*person named/i.test(r10.reply)) f10.push('overclaim');
  if (/trouble retrieving additional passages/i.test(r10.reply)) f10.push('retrieval_error');
  results.push({ id: '10_person', pass: f10.length === 0, failures: f10, message: 'Is this a person?', preview: r10.reply.slice(0, 180), route: r10.route, concept: r10.concept });

  await t('8_abomination', 'abom', 'the abomination talk about by Daniel', (r) => {
    const f = [];
    if (/pork|swine|leviticus\s*11|dietary/i.test(r.reply)) f.push('dietary_leak');
    if (!/abomination|daniel|matthew\s*24/i.test(r.reply)) f.push('no_abomination');
    return f;
  });

  await t('9_desalation', 'desal', 'abomination of desalation', (r) => {
    const f = [];
    if (!/abomination|desolation|daniel|matthew/i.test(r.reply)) f.push('no_match');
    return f;
  });

  await t('11_learning', 'learn', 'Can you remember that when others ask the same question?', (r) => {
    const f = [];
    const data = loadGrowthCandidates();
    const pending = (data.candidates || []).some((c) => c.status === 'pending_review');
    if (!pending && !/learning candidate|pending_review|without review/i.test(r.reply)) f.push('no_candidate');
    if (/cannot modify a database/i.test(r.reply)) f.push('db_deny');
    return f;
  });

  await t('12_overwhelmed', 'overwhelm', 'My feeling overwhelmed', (r) => {
    const f = [];
    if (!/sorry|here|overwhelmed|scripture|psalm|peter/i.test(r.reply)) f.push('cold');
    return f;
  });

  await t('13_prayer', 'pray', 'Can you pray with me?', (r) => {
    const f = [];
    if (!/lord|jesus|amen|pray/i.test(r.reply)) f.push('no_prayer');
    return f;
  });

  await t('14_sabbath_day', 'sabbath', "Is the Lord's Sabbath Friday to Sat or Sunday?", (r) => {
    const f = [];
    if (!/seventh|saturday|exodus\s*20/i.test(r.reply)) f.push('no_seventh');
    return f;
  });

  const u15 = `${prefix}-sabbath-how`;
  clearDoctrineConversationState(u15);
  await chat(u15, "Is the Lord's Sabbath Friday to Sat or Sunday?");
  await t('15_sabbath_keep', 'sabbath-how', 'How are we supposed to keep it?', (r) => {
    const f = [];
    if (!/exodus\s*20|isaiah\s*58|keep|holy/i.test(r.reply)) f.push('no_keep');
    return f;
  });

  await t('16_unknown', 'unknown', 'What does the scriture say about zephyrian covenant', (r) => {
    const f = [];
    if (!/tell me more|which book|clarif|scripture directly/i.test(r.reply)) f.push('no_clarify');
    if (/zephyrian covenant is/i.test(r.reply)) f.push('hallucination');
    return f;
  });

  const u17 = `${prefix}-hijack`;
  clearDoctrineConversationState(u17);
  await chat(u17, 'Can we eat pork?');
  await t('17_hijack', 'hijack', 'the abomination talk about by Daniel', (r) => {
    const f = [];
    if (/pork|swine|leviticus\s*11:?\s*7/i.test(r.reply)) f.push('pork_hijack');
    if (!/abomination|daniel/i.test(r.reply)) f.push('no_abomination');
    return f;
  });

  await t('18_fornication_verse', 'forn-verse', 'show me another verse about fornication', (r) => {
    const f = [];
    if (/which bible topic/i.test(r.reply)) f.push('orphan');
    if (!/corinthians|thessalonians|hebrews|ephesians|galatians/i.test(r.reply)) f.push('no_witness');
    return f;
  });

  const passed = results.filter((r) => r.pass).length;
  const lines = [
    '# Phase 5E Bible Natural Concordance Regression Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    '',
  ];
  for (const r of results) {
    lines.push(`- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} — ${r.failures.join(', ') || 'ok'}`);
    if (r.preview) lines.push(`  ${r.preview}`);
  }
  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8');
  console.log(`Phase 5E: ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
