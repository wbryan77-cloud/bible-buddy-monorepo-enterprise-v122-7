#!/usr/bin/env node
/**
 * Sprint 2.FINAL-B — Meta-Question + Answer Verification HTTP tests.
 * Scenarios 1–5 through POST /buddy/chat (runBuddy).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'sprint2finalb');
const OUT_FILE = path.join(OUT_DIR, 'meta-question-results.json');

const HISTORY_REPEAT = /\b(constantine|ad 321|laodicea|council of laodicea|codex justinianus|shift toward sunday|shift from sabbath)\b/i;
const STUDY_PROMPT = /would you like to continue studying|continue your study journey/i;
const MEMORY_BLEED = /last week we|when we spoke about/i;

function createBuddyServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/buddy/chat') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      return;
    }
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const reply = await runBuddy({
          userId: parsed.userId || 'anonymous',
          mode: parsed.mode || 'COMPANION',
          personaKey: parsed.personaKey || 'ADAPTIVE_COMPANION',
          message: parsed.message || '',
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, reply }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  });
}

async function postChat(server, userId, message) {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message }),
  });
  const data = await res.json();
  const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
  return {
    status: res.status,
    reply: payload.reply || '',
    runtime: payload.runtime || {},
    memory_used: payload.memory_used,
  };
}

function evaluate(name, result, checks) {
  const failures = [];
  for (const [label, fn] of Object.entries(checks)) {
    try {
      if (!fn(result)) failures.push(label);
    } catch (e) {
      failures.push(`${label}: ${e.message}`);
    }
  }
  return {
    name,
    passed: failures.length === 0,
    failures,
    replyPreview: result.reply.slice(0, 320),
    route: result.runtime?.masterRoute,
    intent: result.runtime?.intent,
  };
}

function countHistoryMarkers(text) {
  const markers = ['constantine', 'ad 321', 'laodicea', 'council of laodicea', 'codex justinianus'];
  return markers.filter((m) => text.toLowerCase().includes(m)).length;
}

async function runScenario(server, id, userId, turns, checksFn) {
  clearActiveConversation(userId);
  const results = [];
  for (const msg of turns) {
    results.push(await postChat(server, userId, msg));
  }
  const final = results[results.length - 1];
  return evaluate(id, final, checksFn(final, results));
}

function scoreCategory(results, fn) {
  const passed = results.filter(fn).length;
  return Math.round((passed / results.length) * 100);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = createBuddyServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  const results = [];

  results.push(
    await runScenario(
      server,
      'Scenario 1 — Roman Catholic wording after Sabbath history',
      's2fb-s1',
      [
        'Did Rome change the Sabbath?',
        'Why are you saying Roman church instead of Roman Catholic Church?',
      ],
      (final) => ({
        'routes meta': () => final.runtime?.masterRoute === 'meta_about_previous_answer',
        'mentions Roman Catholic Church': () => /Roman Catholic Church/i.test(final.reply),
        'addresses wording/precision': () => /precise|shorthand|wording|institutional/i.test(final.reply),
        'distinguishes imperial vs Catholic': () => /imperial|Constantine|institutional|later/i.test(final.reply),
        'no history template repeat': () => countHistoryMarkers(final.reply) < 2,
        'no study prompt': () => !STUDY_PROMPT.test(final.reply),
      })
    )
  );

  results.push(
    await runScenario(
      server,
      'Scenario 2 — Yahweh naming question',
      's2fb-s2',
      ["Why didn't you say Yahweh?"],
      (final) => ({
        'routes meta or correction recovery': () =>
          ['meta_about_previous_answer', 'open_general'].includes(final.runtime?.masterRoute) ||
          /yahweh|yhwh|sacred name|divine name/i.test(final.reply),
        'answers naming question': () => /yahweh|yhwh|lord|name/i.test(final.reply),
        'no sabbath history repeat': () => countHistoryMarkers(final.reply) === 0,
      })
    )
  );

  results.push(
    await runScenario(
      server,
      'Scenario 3 — Not asking about history, asking about wording',
      's2fb-s3',
      ["No, I'm not asking about history. I'm asking about your wording."],
      (final) => ({
        'apologizes or acknowledges': () => /you'?re right|wording|not.*history/i.test(final.reply),
        'answers wording only': () => /wording|worded|precise|shorthand/i.test(final.reply),
        'no history template': () => countHistoryMarkers(final.reply) < 2,
        'routes meta': () => final.runtime?.masterRoute === 'meta_about_previous_answer',
      })
    )
  );

  results.push(
    await runScenario(
      server,
      'Scenario 4 — Not answering my question',
      's2fb-s4',
      ['Why are you not answering my question?'],
      (final) => ({
        'identifies missed question or apologizes': () =>
          /exact question|you'?re right|not answering|wording|answer is/i.test(final.reply),
        'no study prompt': () => !STUDY_PROMPT.test(final.reply),
        'no memory bleed': () => !MEMORY_BLEED.test(final.reply),
        'routes meta': () => final.runtime?.masterRoute === 'meta_about_previous_answer',
      })
    )
  );

  results.push(
    await runScenario(
      server,
      'Scenario 5 — Correction chain stops looping',
      's2fb-s5',
      [
        'Did Rome change the Sabbath?',
        'Why are you using the wording church instead of the actual technical name the Roman Catholic Church?',
        "You're not answering my question.",
        "That's not my question. I'm asking about wording.",
      ],
      (final, all) => ({
        'final routes meta': () => final.runtime?.masterRoute === 'meta_about_previous_answer',
        'answers wording on final turn': () => /Roman Catholic Church|wording|precise|shorthand/i.test(final.reply),
        'no history template on final': () => countHistoryMarkers(final.reply) < 2,
        'second correction escalates': () =>
          all.some((r) => r.runtime?.strictAnswerMode) ||
          all.some((r) => r.runtime?.correctionMode) ||
          /you'?re right|exact question/i.test(final.reply),
        'no study prompt on final': () => !STUDY_PROMPT.test(final.reply),
      })
    )
  );

  server.close();

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  const scorecard = {
    exactQuestionUnderstanding: scoreCategory(results, (r) => !r.failures.some((f) => f.includes('exact') || f.includes('wording') || f.includes('naming'))),
    metaQuestionHandling: scoreCategory(results, (r) => r.name.includes('Scenario 1') || r.name.includes('Scenario 2') || r.name.includes('Scenario 3') ? r.passed : true),
    correctionRecovery: scoreCategory(results, (r) => r.name.includes('Scenario 4') || r.name.includes('Scenario 5') ? r.passed : true),
    loopPrevention: scoreCategory(results, (r) => r.name.includes('Scenario 5') ? r.passed : true),
    noTemplateRepetition: scoreCategory(results, (r) => !r.failures.some((f) => f.includes('history') || f.includes('template'))),
    naturalTone: scoreCategory(results, (r) => /you'?re right|fair question|right to press/i.test(r.replyPreview) || r.passed),
    directness: scoreCategory(results, (r) => r.replyPreview.length > 40 && r.replyPreview.length < 900),
  };

  const minScore = Math.min(...Object.values(scorecard));
  const avgScore = Math.round(Object.values(scorecard).reduce((a, b) => a + b, 0) / Object.keys(scorecard).length);

  const output = {
    sprint: '2.FINAL-B',
    passed,
    total,
    allPassed: passed === total,
    results,
    scorecard,
    minScore,
    avgScore,
    ready: passed === total && minScore >= 95,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\nSprint 2.FINAL-B Meta-Question Tests: ${passed}/${total}`);
  for (const r of results) {
    console.log(`${r.passed ? 'PASS' : 'FAIL'} — ${r.name}`);
    if (!r.passed) console.log('  failures:', r.failures.join(', '));
    console.log(`  route: ${r.route} | ${r.replyPreview.slice(0, 100)}…`);
  }
  console.log('\nScorecard:', scorecard);
  console.log(`Min: ${minScore} | Avg: ${avgScore} | Ready: ${output.ready}`);
  process.exit(output.ready ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
