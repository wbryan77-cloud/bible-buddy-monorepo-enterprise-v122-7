#!/usr/bin/env node
/**
 * Phase 4O — Bible-wide reasoning, concordance, memory, organic answers.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { DENIAL_RE, countScriptureWitnesses } = require('../services/directAnswerFormatter');

const ROOT = path.join(__dirname, '..');

function assert(cond, label) {
  return { pass: !!cond, label };
}

function summarize(checks) {
  const failed = checks.filter((c) => !c.pass);
  return { pass: failed.length === 0, failed: failed.map((c) => c.label), checks };
}

async function chat(userId, message) {
  const structured = await runBuddy({
    userId,
    message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });
  return {
    reply: String(structured.reply || ''),
    route: structured.runtime?.masterRoute,
    scripture: structured.scripture || [],
    structured,
  };
}

async function main() {
  const results = [];

  const u1 = `phase4o-${Date.now()}`;
  clearDoctrineConversationState(u1);

  const t1 = await chat(u1, 'Can we eat pork?');
  results.push({
    id: '1_pork',
    preview: t1.reply.slice(0, 200),
    ...summarize([
      assert(/^no\b/i.test(t1.reply.trim()), 'starts with No.'),
      assert(/leviticus\s*11/i.test(t1.reply), 'Leviticus 11'),
      assert(/deuteronomy\s*14/i.test(t1.reply), 'Deuteronomy 14'),
      assert(!DENIAL_RE.test(t1.reply), 'no validator leak'),
    ]),
  });

  const t2 = await chat(u1, 'So are you saying we can eat pork?');
  results.push({
    id: '2_pork_clarify',
    preview: t2.reply.slice(0, 200),
    ...summarize([
      assert(/^no\b/i.test(t2.reply.trim()), 'starts with No.'),
      assert(!/^yes\b.*pork.*unclean/i.test(t2.reply), 'no Yes-pork-unclean bug'),
    ]),
  });

  await chat(u1, 'stop saying yes and say No and the explanation.');
  const t3 = await chat(u1, 'So are you saying we can eat pork?');
  results.push({
    id: '3_correction_memory',
    preview: t3.reply.slice(0, 200),
    ...summarize([
      assert(/^no\b/i.test(t3.reply.trim()), 'remembers No first preference'),
      assert(!/^yes\b/i.test(t3.reply.trim()), 'no Yes opener after correction'),
    ]),
  });

  const u4 = `${u1}-sex`;
  clearDoctrineConversationState(u4);
  const t4 = await chat(u4, 'Can we have sex without marriage?');
  results.push({
    id: '4_fornication',
    preview: t4.reply.slice(0, 200),
    ...summarize([
      assert(/^no\b/i.test(t4.reply.trim()), 'starts with No.'),
      assert(countScriptureWitnesses(t4.reply, t4.scripture) >= 2, '2+ refs'),
      assert(/1\s*corinthians\s*6:?\s*18|1\s*thessalonians\s*4|hebrews\s*13:?\s*4/i.test(t4.reply), 'fornication refs'),
    ]),
  });

  const t5 = await chat(u4, 'more scriptures on sex before marriage');
  results.push({
    id: '5_fornication_more',
    preview: t5.reply.slice(0, 200),
    ...summarize([
      assert(!/which bible topic/i.test(t5.reply), 'no which topic loop'),
      assert(/fornication|corinthians|hebrews|thessalonians/i.test(t5.reply), 'fornication continuation'),
    ]),
  });

  const t6 = await chat(u4, 'show me another verse about fornication?');
  results.push({
    id: '6_fornication_verse',
    preview: t6.reply.slice(0, 200),
    ...summarize([
      assert(!/which bible topic/i.test(t6.reply), 'no which topic loop'),
      assert(/fornication|corinthians|hebrews|galatians|ephesians/i.test(t6.reply), 'another fornication witness'),
    ]),
  });

  const u7 = `${u1}-kingdom`;
  clearDoctrineConversationState(u7);
  const t7 = await chat(u7, 'Heaven on earth.');
  results.push({
    id: '7_heaven_on_earth',
    preview: t7.reply.slice(0, 220),
    ...summarize([
      assert(/kingdom|earth/i.test(t7.reply), 'kingdom on earth theme'),
      assert(/matthew\s*6:?\s*10/i.test(t7.reply), 'Matthew 6:10'),
      assert(/revelation\s*21/i.test(t7.reply), 'Revelation 21'),
    ]),
  });

  const t8 = await chat(
    u7,
    'Can you give me more scriptures with man staying on earth and the kingdom coming?',
  );
  results.push({
    id: '8_kingdom_more',
    preview: t8.reply.slice(0, 220),
    ...summarize([
      assert(!/which bible topic/i.test(t8.reply), 'answers directly'),
      assert(countScriptureWitnesses(t8.reply, t8.scripture) >= 3, '3+ witnesses'),
      assert(/matthew\s*6:?\s*10/i.test(t8.reply), 'Matthew 6:10'),
      assert(/revelation|daniel|psalm|matthew\s*5/i.test(t8.reply), 'kingdom refs'),
    ]),
  });

  const u9 = `${u1}-emo`;
  clearDoctrineConversationState(u9);
  const t9 = await chat(u9, 'Love life is crashing.');
  results.push({
    id: '9_emotional',
    preview: t9.reply.slice(0, 200),
    ...summarize([
      assert(/sorry|here with you|heavy|hurt/i.test(t9.reply), 'warm companion'),
      assert(/psalm\s*34:?\s*18|1\s*peter\s*5:?\s*7|broken heart/i.test(t9.reply), 'optional scripture'),
      assert(/\?/.test(t9.reply) || /what happened/i.test(t9.reply), 'caring follow-up'),
    ]),
  });

  await chat(u9, 'Can we eat pork?');
  const t10 = await chat(u9, 'Why won\'t you answer?');
  results.push({
    id: '10_why_not_answer',
    preview: t10.reply.slice(0, 200),
    ...summarize([
      assert(/right|listen|answer|pork|question/i.test(t10.reply), 'acknowledges frustration'),
    ]),
  });

  const u11 = `${u1}-cont`;
  clearDoctrineConversationState(u11);
  await chat(u11, 'Can we eat pork?');
  const t11a = await chat(u11, 'show me another verse');
  results.push({
    id: '11_continuation_active',
    preview: t11a.reply.slice(0, 200),
    ...summarize([
      assert(/leviticus|deuteronomy|acts|isaiah|verse|scripture/i.test(t11a.reply), 'continuation works'),
    ]),
  });

  const u12 = `${u1}-orphan`;
  clearDoctrineConversationState(u12);
  const t12 = await chat(u12, 'show me another verse');
  results.push({
    id: '12_continuation_orphan',
    preview: t12.reply.slice(0, 200),
    ...summarize([
      assert(/which|topic|explore|active/i.test(t12.reply), 'asks clarification'),
    ]),
  });

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);

  const report = {
    at: new Date().toISOString(),
    passed,
    total: results.length,
    failed: failed.map((f) => ({ id: f.id, failed: f.failed, preview: f.preview })),
    results,
  };

  const jsonPath = path.join(ROOT, 'docs', 'regression-trace', 'phase4o-bible-wide-results.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    '# Phase 4O Bible-Wide Reasoning Regression Report',
    '',
    `**Date:** ${report.at}`,
    `**Result:** ${passed}/${results.length}`,
    '',
    failed.length
      ? failed.map((f) => `- FAIL **${f.id}**: ${f.failed.join(', ')}`).join('\n')
      : 'All tests passed.',
    '',
    results.map((r) => `### ${r.id} (${r.pass ? 'PASS' : 'FAIL'})\n${r.preview}\n`).join('\n'),
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, 'Phase4OBibleWideReasoningRegressionReport.md'), md);

  console.log(`Phase 4O: ${passed}/${results.length} passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`FAIL ${f.id}: ${f.failed.join(', ')}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
