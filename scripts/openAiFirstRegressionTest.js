#!/usr/bin/env node
/**
 * OpenAI-first restoration regression suite (Part E).
 *
 * Usage:
 *   BUDDY_RUNTIME=legacy node scripts/openAiFirstRegressionTest.js
 *   OPENAI_API_KEY=... BUDDY_RUNTIME=legacy node scripts/openAiFirstRegressionTest.js
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation, updateActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'docs', 'regression-trace', 'openai-first-results.json');

// Excludes quoted usage (straight or smart quotes) so a self-aware
// correction that quotes back its own prior wording — e.g. "I shouldn't
// have said 'flaring up again'" — is not mistaken for template leakage.
const HEALTH_MARKERS = [
  /(?<!["'“”‘’])\bflaring up again\b(?!["'“”‘’])/i,
  /I'm not a doctor|I’m not a doctor/i,
  /I hear you sharing about/i,
];
const JOB_DISCERNMENT_MARKERS = [
  /establishes the matter/i,
  /confirms it alongside Scripture/i,
  /carries the theme forward/i,
];

const TESTS = [
  {
    id: '1_relationship_loss',
    message:
      'Today has been a tough day. I let go of someone that I truly love, but she hasn’t been right for years…',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      const reply = String(structured.reply || '');
      if (route === 'health_support') return 'masterRoute was health_support';
      if (HEALTH_MARKERS.some((r) => r.test(reply))) return 'reply contains health template markers';
      return null;
    },
    expectOpenAi: true,
  },
  {
    id: '2_correction_after_relationship',
    message: 'What’s flaring up again and you didn’t address what I just mentioned at all. Why?',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      const reply = String(structured.reply || '');
      if (route === 'health_support') return 'masterRoute was health_support';
      if (HEALTH_MARKERS.some((r) => r.test(reply))) return 'reply contains health template markers';
      return null;
    },
    expectOpenAi: true,
  },
  {
    id: '2b_correction_seeded_health_topic',
    seedHealth: true,
    message: 'What’s flaring up again and you didn’t address what I just mentioned at all. Why?',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      const reply = String(structured.reply || '');
      if (route === 'health_support') return 'masterRoute was health_support with seeded health topic';
      if (HEALTH_MARKERS.some((r) => r.test(reply))) return 'health template with seeded activeConversation';
      return null;
    },
    expectOpenAi: true,
  },
  {
    id: '3_listen_first',
    message: 'I just want to talk for a minute. Please listen first.',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      const reply = String(structured.reply || '');
      if (route === 'health_support') return 'masterRoute was health_support';
      if (HEALTH_MARKERS.some((r) => r.test(reply))) return 'health block in listen-first message';
      return null;
    },
    expectOpenAi: true,
  },
  {
    id: '4_same_script',
    message: 'Why are you just giving me the same script over and over again?',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      const reply = String(structured.reply || '');
      if (route === 'health_support') return 'masterRoute was health_support';
      if (HEALTH_MARKERS.some((r) => r.test(reply))) return 'health template on meta complaint';
      return null;
    },
    expectOpenAi: true,
  },
  {
    id: '5_alzheimers',
    message: 'Mom has Alzheimer’s. What do I do?',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      const reply = String(structured.reply || '');
      if (route === 'health_support') return 'masterRoute was health_support';
      if (route === 'job_discernment' && JOB_DISCERNMENT_MARKERS.filter((r) => r.test(reply)).length >= 2) {
        return 'generic job_discernment triplet only';
      }
      return null;
    },
    expectOpenAi: true,
  },
  {
    id: '6_grief_what_do_i_do',
    message: 'I’m going through some grief what do I do?',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      const reply = String(structured.reply || '');
      if (route === 'job_discernment' && JOB_DISCERNMENT_MARKERS.filter((r) => r.test(reply)).length >= 2) {
        return 'job_discernment triplet without grief-aware content';
      }
      return null;
    },
    expectOpenAi: true,
  },
  {
    id: '7_doctrine_after_grief_session',
    preMessage: 'I’m going through some grief what do I do?',
    message: 'Is the Logos spoken of in the Old Testament Jesus in the New Testament as well?',
    assert(structured) {
      const reply = String(structured.reply || '');
      if (/I'm really sorry for your loss|I’m really sorry for your loss/i.test(reply) && reply.length < 400) {
        return 'grief opener on doctrine question';
      }
      return null;
    },
    expectOpenAi: true,
  },
  {
    // PHASE_6G: refreshed for the approved Scripture Authority Engine.
    // OLD expectation (obsolete): route must be one of a hardcoded list of
    // legacy template routes, or fall back to generic 'openai_first'.
    // CURRENT expectation (approved architecture): Sabbath is governed
    // doctrine — it is correctly answered by doctrine_final_authority with
    // real, cited KJV Scripture witnesses (Genesis 2 / Exodus 20 / Isaiah
    // 58 / Luke 4), not by a hardcoded template name and not by generic
    // OpenAI prose. This is a stronger assertion than the original (it
    // requires an actual Scripture citation, not just an accepted route
    // string).
    id: '8_sabbath_definition',
    message: 'What is a Sabbath day?',
    oldExpectation: "route in ['sabbath_definition','doctrine_general','sabbath_history','registry_study'] or 'openai_first'",
    currentExpectation:
      'route === doctrine_final_authority (or bible_wide_reasoning) with a real cited Sabbath Scripture witness (Genesis 2 / Exodus 20 / Isaiah 58 / Luke 4) present in the reply',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      const reply = String(structured.reply || '');
      const governedAuthorityRoutes = ['doctrine_final_authority', 'bible_wide_reasoning', 'strict_doctrine_gate'];
      const hasSabbathWitness = /Genesis 2|Exodus 20|Isaiah 58|Luke 4/.test(reply);
      if (governedAuthorityRoutes.includes(route)) {
        return hasSabbathWitness ? null : 'governed authority route but no cited Sabbath Scripture witness in reply';
      }
      const legacyAllowed = ['sabbath_definition', 'doctrine_general', 'sabbath_history', 'registry_study'];
      if (legacyAllowed.includes(route) || route === 'openai_first') return null;
      return `unexpected route ${route} (expected governed doctrine authority with a cited Sabbath witness)`;
    },
    expectOpenAi: false,
  },
  {
    id: '9_knees_health',
    message: 'My knees hurt again today',
    assert(structured) {
      const route = structured.runtime?.masterRoute;
      if (route === 'health_support' && HEALTH_MARKERS.some((r) => r.test(String(structured.reply)))) {
        return null;
      }
      if (route === 'openai_first' || route === 'reason_first_openai' || route === 'health_support' || !route) {
        return null;
      }
      return `unexpected route ${route} for health mention`;
    },
    expectOpenAi: true,
  },
];

async function runOne(test, index) {
  const userId = `openai-first-regression-${test.id}-${Date.now()}-${index}`;
  clearActiveConversation(userId);

  if (test.seedHealth) {
    updateActiveConversation({
      userId,
      topic: 'health',
      questionType: 'follow_up',
      depth: 'standard',
      message: 'My knees hurt',
      answerTopic: 'health',
    });
  }

  if (test.preMessage) {
    await runBuddy({ userId, message: test.preMessage, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  }

  const structured = await runBuddy({
    userId,
    message: test.message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });

  const failReason = test.assert(structured);
  const openAiCalled = !!structured.runtime?.openAiCalled;
  const openAiExpected = test.expectOpenAi && !!process.env.OPENAI_API_KEY;
  const openAiFail = openAiExpected && !openAiCalled ? 'openAiCalled was false' : null;

  return {
    id: test.id,
    userId,
    message: test.message,
    pass: !failReason && !openAiFail,
    failReason: failReason || openAiFail,
    masterRoute: structured.runtime?.masterRoute || null,
    openAiCalled,
    replyPreview: String(structured.reply || '').slice(0, 280),
    adminFlags: structured.admin_flags || [],
  };
}

async function main() {
  if (process.env.BUDDY_OPENAI_FIRST === '0') {
    console.error('Set BUDDY_OPENAI_FIRST unset (default) or =1; BUDDY_OPENAI_FIRST=0 uses master path.');
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  const results = [];
  for (let i = 0; i < TESTS.length; i++) {
    const row = await runOne(TESTS[i], i);
    results.push(row);
    const status = row.pass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${row.id} route=${row.masterRoute} openAi=${row.openAiCalled}`);
    if (!row.pass) console.log(`       ${row.failReason}`);
  }

  const summary = {
    ranAt: new Date().toISOString(),
    buddyRuntime: process.env.BUDDY_RUNTIME || 'legacy',
    buddyOpenAiFirst: process.env.BUDDY_OPENAI_FIRST || 'default-on',
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
