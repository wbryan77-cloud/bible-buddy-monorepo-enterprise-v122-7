#!/usr/bin/env node
/**
 * Sprint 2.14C — Natural reasoning HTTP acceptance tests.
 */

const http = require('http');
const { runBuddy } = require('../services/buddyBrain');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'sprint214c');

function createBuddyServer() {
  return http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/buddy/chat') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      return;
    }
    let body = '';
    req.on('data', (c) => {
      body += c;
    });
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
    scripture: payload.scripture || [],
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
    replyPreview: result.reply.slice(0, 360),
    intent: result.runtime?.intent || result.runtime?.questionIntent?.questionType || null,
    intercept: result.runtime?.intercept || null,
  };
}

function scoreCategories(results) {
  const all = results.map((r) => r.replyPreview).join('\n');
  const passed = results.filter((r) => r.passed).length;
  const factualReplies = results
    .filter((r) => /Sabbath|historical|Rome|Sunday|evidence|Correction|Comparison/i.test(r.name))
    .map((r) => r.replyPreview)
    .join('\n');

  const memoryBleedInFactual = /companion recently|You mentioned recently|You were thinking about companion/i.test(
    factualReplies
  );

  const scores = {
    questionUnderstanding: passed >= 9 ? 97 : passed >= 7 ? 88 : 70,
    directness: /ask that directly|Tacitus Histories|That is a good question about the Sabbath command itself/i.test(all) ? 72 : 97,
    depth: /Constantine|Laodicea|Direct answer|Historical chain/i.test(all) ? 97 : 80,
    warmth: /I hear|thoughtful question|glad you brought|I'm here|sorry for your loss/i.test(all) ? 96 : 88,
    scriptureGrounding: /Genesis 2:2-3|Exodus 20:8-11|Scripture/i.test(all) ? 97 : 75,
    historicalReasoning: /Constantine|321|Laodicea|Roman Catholic|Historical chain/i.test(all) ? 97 : 70,
    companionTone: memoryBleedInFactual ? 65 : 96,
    memoryRelevance: memoryBleedInFactual ? 60 : 97,
    noCannedRepetition: /ask that directly|Source-grounded answer:/i.test(factualReplies) ? 70 : 97,
    noPrematureStudyPrompt: results.some((r) =>
      /Would you like to continue studying|continue into Feast Days/i.test(r.replyPreview) &&
      /Who changed|Did Rome|historical evidence|not my question|Why Sunday/i.test(r.name)
    )
      ? 68
      : 97,
  };

  const values = Object.values(scores);
  return { scores, overall: Math.round(values.reduce((a, b) => a + b, 0) / values.length) };
}

async function runSuite(options = {}) {
  const USER_PREFIX = options.userPrefix || `s214c-${Date.now()}-${process.pid}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await new Promise((resolve, reject) => {
    const s = createBuddyServer();
    s.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const results = [];

  try {
    results.push(
      evaluate(
        'TEST 1 — What is the Sabbath?',
        await postChat(server, `${USER_PREFIX}-t1`, 'What is the Sabbath?'),
        {
          directAnswer: (r) => /seventh day|Direct answer|Genesis 2:2-3/i.test(r.reply),
          notHistoryDump: (r) => !/Constantine.*321.*Laodicea/i.test(r.reply.slice(0, 200)),
          noAskDirectly: (r) => !/ask that directly/i.test(r.reply),
          noStudyInterrupt: (r) => !/Would you like to continue studying/i.test(r.reply),
        }
      )
    );

    results.push(
      evaluate(
        'TEST 2 — Who changed Sabbath',
        await postChat(server, `${USER_PREFIX}-t2`, 'Who changed Sabbath from Saturday to Sunday?'),
        {
          historical: (r) => /Constantine|321|Laodicea/i.test(r.reply),
          scripture: (r) => /does not record God changing|Scripture identifies the seventh day/i.test(r.reply),
          direct: (r) => /Direct answer|who changed/i.test(r.reply),
        }
      )
    );

    const uid3 = `${USER_PREFIX}-t3`;
    await postChat(server, uid3, 'What is the Sabbath?');
    results.push(
      evaluate(
        'TEST 3 — Rome/Catholic change',
        await postChat(server, uid3, 'Did Rome/Roman Catholic Church perform that change?'),
        {
          yesAnswer: (r) => /\bYes\b|major role|Roman church authority/i.test(r.reply),
          notDefinition: (r) => !/^That is a good question/i.test(r.reply.trim()),
        }
      )
    );

    const uid4 = `${USER_PREFIX}-t4`;
    await postChat(server, uid4, 'What is the Sabbath?');
    results.push(
      evaluate(
        'TEST 4 — Historical evidence',
        await postChat(server, uid4, 'Give me the historical evidence.'),
        {
          chain: (r) => /Historical chain|Constantine|Laodicea/i.test(r.reply),
          notDefinitionRepeat: (r) => !/Line upon line study path/i.test(r.reply),
        }
      )
    );

    const uid5 = `${USER_PREFIX}-t5`;
    await postChat(server, uid5, 'What is the Sabbath?');
    await postChat(server, uid5, 'Who changed the Sabbath and why?');
    results.push(
      evaluate(
        'TEST 5 — Correction',
        await postChat(server, uid5, 'That was not my question.'),
        {
          apology: (r) => /right|drifted|wasn't your question|I'll answer/i.test(r.reply),
          historical: (r) => /Constantine|Laodicea|historical/i.test(r.reply),
        }
      )
    );

    const uid6 = `${USER_PREFIX}-t6`;
    await postChat(server, uid6, 'What is the Sabbath?');
    results.push(
      evaluate(
        'TEST 6 — Why Sunday',
        await postChat(server, uid6, 'Why do some people keep Sunday?'),
        {
          whyAnswer: (r) => /why|Sunday observance|first day|Constantine|historical/i.test(r.reply),
          companionTone: (r) => /I hear|answer that directly|historical/i.test(r.reply),
        }
      )
    );

    results.push(
      evaluate(
        'TEST 7 — Comparison',
        await postChat(server, `${USER_PREFIX}-t7`, 'What is the difference between biblical Sabbath and Sunday observance?'),
        {
          comparison: (r) => /difference|seventh day|developed later|historical/i.test(r.reply),
          bothSides: (r) => /Scripture|Sunday/i.test(r.reply),
        }
      )
    );

    results.push(
      evaluate(
        'TEST 8 — Prayer',
        await postChat(server, `${USER_PREFIX}-t8`, 'I need help from the Lord.'),
        {
          prayerPath: (r) => /pray|Lord|here with you|bring this/i.test(r.reply),
          notDoctrine: (r) => !/Constantine|fourth commandment anchors/i.test(r.reply),
        }
      )
    );

    results.push(
      evaluate(
        'TEST 9 — Grief',
        await postChat(server, `${USER_PREFIX}-t9`, 'I lost a friend.'),
        {
          griefTone: (r) => /sorry|grief|heart|here with you|comfort/i.test(r.reply),
          notSabbath: (r) => !/Sabbath command|Constantine/i.test(r.reply),
        }
      )
    );

    const uid10 = `${USER_PREFIX}-t10`;
    await postChat(server, uid10, 'What is the Sabbath?');
    results.push(
      evaluate(
        'TEST 10 — Continue study',
        await postChat(server, uid10, 'Continue our Sabbath study.'),
        {
          continueStudy: (r) => /continue|pick up|Sabbath|study|Genesis|Exodus/i.test(r.reply),
        }
      )
    );

    const scoring = scoreCategories(results);
    const out = {
      timestamp: new Date().toISOString(),
      sprint: '2.14C',
      results,
      scoring,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
    };

    fs.writeFileSync(path.join(OUT_DIR, 'natural-reasoning-results.json'), JSON.stringify(out, null, 2));
    if (!options.quiet) {
      console.log(JSON.stringify(out, null, 2));
    }
    return out;
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runSuite()
    .then((out) => {
      const minScore = Math.min(...Object.values(out.scoring.scores));
      console.error(`\nNatural Reasoning: ${out.passed}/${out.total} | Overall: ${out.scoring.overall} | Min category: ${minScore}`);
      if (out.passed < out.total || minScore < 95) process.exit(1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { runSuite, createBuddyServer, postChat, evaluate, scoreCategories };
