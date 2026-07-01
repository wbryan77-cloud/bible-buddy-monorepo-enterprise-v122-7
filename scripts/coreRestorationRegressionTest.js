#!/usr/bin/env node
/**
 * Core restoration regression — proves OpenAI authorship and no template loops.
 *
 * Usage:
 *   node scripts/coreRestorationRegressionTest.js
 *   OPENAI_API_KEY=... node scripts/coreRestorationRegressionTest.js
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation, updateActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'docs', 'regression-trace', 'core-restoration-results.json');

const TEMPLATE_MARKERS = [
  { id: 'witness_triplet', re: /establishes the matter/i },
  { id: 'witness_confirms', re: /confirms it alongside Scripture/i },
  { id: 'health_doctor', re: /I'm not a doctor|I’m not a doctor/i },
  { id: 'health_flaring', re: /flaring up again/i },
  { id: 'pray_unasked', re: /glad you asked to pray|I'm glad you asked to pray|I’m glad you asked to pray/i },
];

const FORBIDDEN_ROUTES = new Set(['health_support', 'grief_support', 'job_discernment', 'prayer']);

const TESTS = [
  {
    id: '1_relationship_pain',
    message:
      'Today has been a tough day. I let go of someone that I truly love, but she hasn’t been right for years…',
    assert(s) {
      if (FORBIDDEN_ROUTES.has(s.runtime?.masterRoute)) return `route ${s.runtime.masterRoute}`;
      return markerFail(s);
    },
  },
  {
    id: '2_correction_no_template',
    message: 'What’s flaring up again and you didn’t address what I just mentioned at all. Why?',
    assert(s) {
      if (FORBIDDEN_ROUTES.has(s.runtime?.masterRoute)) return `route ${s.runtime.masterRoute}`;
      return markerFail(s);
    },
  },
  {
    id: '2b_seeded_health_no_route',
    seedHealth: true,
    message: 'What’s flaring up again and you didn’t address what I just mentioned at all. Why?',
    assert(s) {
      if (s.runtime?.masterRoute === 'health_support') return 'health_support with seeded topic';
      return markerFail(s);
    },
  },
  {
    id: '3_listen_first',
    message: 'I just want to talk for a minute. Please listen first.',
    assert(s) {
      if (FORBIDDEN_ROUTES.has(s.runtime?.masterRoute)) return `route ${s.runtime.masterRoute}`;
      return markerFail(s);
    },
  },
  {
    id: '4_alzheimers',
    message: 'Mom has Alzheimer’s. What do I do?',
    assert(s) {
      if (s.runtime?.masterRoute === 'health_support') return 'health_support';
      return markerFail(s);
    },
  },
  {
    id: '5_how_many_heavens',
    message: 'How many heavens are there according to the Bible?',
    assert(s) {
      if (FORBIDDEN_ROUTES.has(s.runtime?.masterRoute)) return `route ${s.runtime.masterRoute}`;
      const r = String(s.reply || '');
      if (!/\bheaven/i.test(r) && !/\bthird heaven\b/i.test(r)) return 'reply does not address heavens';
      return markerFail(s);
    },
    assertNoApi: routeAndMarkerOnly,
  },
  {
    id: '6_sabbath_definition',
    message: 'What is a Sabbath day?',
    assert(s) {
      const r = String(s.reply || '');
      if (!/\bsabbath\b/i.test(r)) return 'missing sabbath in reply';
      return markerFail(s);
    },
  },
  {
    id: '7_sabbath_how_holy',
    message: 'How do we keep the Sabbath holy?',
    assert(s) {
      const r = String(s.reply || '');
      if (/Constantine|Laodicea|Council of Laodicea/i.test(r) && !/how|holy|rest|cease/i.test(r.slice(0, 120))) {
        return 'Sunday history instead of how-to';
      }
      return markerFail(s);
    },
  },
  {
    id: '8_dietary_law',
    message: 'What does the Bible say about dietary law?',
    assert(s) {
      const r = String(s.reply || '');
      if (!/\b(leviticus|deuteronomy|unclean|clean|food|dietary)\b/i.test(r)) {
        return 'reply not Bible-grounded on dietary law';
      }
      return markerFail(s);
    },
    assertNoApi: routeAndMarkerOnly,
  },
  {
    id: '9_swine_pork',
    message: 'Can we eat swine or pork according to Scripture?',
    assert(s) {
      const r = String(s.reply || '');
      if (!/\b(leviticus|deuteronomy|isaiah|swine|pork|unclean)\b/i.test(r)) {
        return 'missing Leviticus/Deuteronomy/Isaiah grounding';
      }
      return markerFail(s);
    },
    assertNoApi: routeAndMarkerOnly,
  },
  {
    id: '10_no_unasked_prayer',
    message: "I didn't ask to pray. I asked whether Jesus is the God of the Old Testament.",
    assert(s) {
      const r = String(s.reply || '');
      if (TEMPLATE_MARKERS.find((m) => m.id === 'pray_unasked')?.re.test(r)) return 'unasked prayer opener';
      if (/let's pray together|bring this before the Lord together/i.test(r) && !/pray/i.test(s.message)) {
        return 'prayer redirect without user request';
      }
      return markerFail(s);
    },
  },
  {
    id: '11_jesus_god_ot',
    message: 'Is Jesus the God seen in the Old Testament?',
    assert(s) {
      const r = String(s.reply || '');
      if (!/\b(jesus|yeshua|logos|god|lord|old testament)\b/i.test(r)) return 'no doctrine answer';
      return markerFail(s);
    },
    assertNoApi: routeAndMarkerOnly,
  },
  {
    id: '12_real_health',
    message: 'My knees hurt again today and I want practical care advice.',
    assert(s) {
      if (s.runtime?.masterRoute === 'health_support') return 'template health_support route';
      return markerFail(s, { allowHealthDoctor: true });
    },
  },
];

function routeAndMarkerOnly(test, structured) {
  if (FORBIDDEN_ROUTES.has(structured.runtime?.masterRoute)) {
    return `route ${structured.runtime.masterRoute}`;
  }
  if (structured.runtime?.masterRoute === 'health_support') return 'health_support';
  return markerFail(structured);
}

function markerFail(structured, opts = {}) {
  const r = String(structured.reply || '');
  for (const m of TEMPLATE_MARKERS) {
    if (opts.allowHealthDoctor && (m.id === 'health_doctor' || m.id === 'health_flaring')) continue;
    if (m.id === 'pray_unasked' && /\bpray\b/i.test(structured.message || '')) continue;
    if (m.re.test(r)) return `template marker: ${m.id}`;
  }
  return null;
}

async function runOne(test, index) {
  const userId = `core-restoration-${test.id}-${Date.now()}-${index}`;
  clearActiveConversation(userId);

  if (test.seedHealth) {
    updateActiveConversation({
      userId,
      topic: 'health',
      questionType: 'follow_up',
      message: 'knees hurt',
      answerTopic: 'health',
    });
  }

  const structured = await runBuddy({
    userId,
    message: test.message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });

  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const failReason = hasApiKey
    ? test.assert({ ...structured, message: test.message })
    : (test.assertNoApi ? test.assertNoApi(test, structured) : routeAndMarkerOnly(test, structured));
  const openAiCalled = !!(
    structured.runtime?.openAiCalled || structured.coreDebug?.openaiCalled
  );
  const openAiFail = hasApiKey && !openAiCalled ? 'openAiCalled false' : null;

  return {
    id: test.id,
    pass: !failReason && !openAiFail,
    failReason: failReason || openAiFail,
    masterRoute: structured.runtime?.masterRoute,
    openAiCalled,
    finalAnswerAuthor: structured.coreDebug?.finalAnswerAuthor || structured.runtime?.coreDebug?.finalAnswerAuthor,
    templateUsed: structured.coreDebug?.templateUsed,
    replyPreview: String(structured.reply || '').slice(0, 320),
  };
}

async function main() {
  if (process.env.BUDDY_OPENAI_FIRST === '0') {
    console.error('BUDDY_OPENAI_FIRST=0 uses master templates. Unset for core restoration test.');
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  const results = [];

  for (let i = 0; i < TESTS.length; i++) {
    const row = await runOne(TESTS[i], i);
    results.push(row);
    console.log(`[${row.pass ? 'PASS' : 'FAIL'}] ${row.id} route=${row.masterRoute} openAi=${row.openAiCalled}`);
    if (!row.pass) console.log(`       ${row.failReason}`);
  }

  const summary = {
    ranAt: new Date().toISOString(),
    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${OUT_JSON}`);
  console.log(`Passed ${summary.passed}/${results.length}`);
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
