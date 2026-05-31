#!/usr/bin/env node
/**
 * Sprint 2.13 — POST /buddy/chat acceptance suite (native HTTP, no express required).
 * Mirrors routes/buddy.js handler contract exactly.
 */

const http = require('http');
const { runBuddy } = require('../services/buddyBrain');
const fs = require('fs');
const path = require('path');

const USER_PREFIX = `s213-${Date.now()}`;
const PORT = 0;
const OUT_DIR = path.join(__dirname, '..', 'docs', 'sprint213');

function normalizePayload(reply) {
  if (reply && typeof reply === 'object') return reply;
  return {
    reply: String(reply || "I'm here with you. Tell me a little more."),
    scripture: [],
    mode: 'companion',
    confidence: 'medium',
    memory_used: false,
    orb_state: 'speaking',
    safety_level: 'standard',
  };
}

function createBuddyServer() {
  return http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/buddy/chat') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const userId = parsed.userId || 'anonymous';
        const mode = parsed.mode || 'COMPANION';
        const personaKey = parsed.personaKey || 'ADAPTIVE_COMPANION';
        const message = parsed.message || '';

        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'message is required' }));
          return;
        }

        const reply = await runBuddy({ userId, mode, personaKey, message });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, reply: normalizePayload(reply) }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: error.message }));
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
    ok: data.ok,
    reply: payload.reply || '',
    scripture: payload.scripture || [],
    mode: payload.mode,
    runtime: payload.runtime || {},
    memory_used: payload.memory_used,
    full: payload,
  };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createBuddyServer();
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function scoreWarmth(text) {
  let s = 50;
  if (/sorry|hear you|glad you|gentle|together|friend|comfort/i.test(text)) s += 25;
  if (/slow this down together/i.test(text)) s -= 30;
  if (/Source-grounded|The app should/i.test(text)) s -= 40;
  return Math.max(0, Math.min(100, s));
}

function scoreScripture(text, refs) {
  let s = 40;
  s += Math.min(40, (refs?.length || 0) * 12);
  if (/Genesis|Exodus|Isaiah|Matthew|Daniel|Revelation|Psalm|Acts|Leviticus/i.test(text)) s += 20;
  if (/Source-grounded answer:/i.test(text)) s -= 30;
  return Math.max(0, Math.min(100, s));
}

function scoreListening(text, priorReply) {
  if (!priorReply) return 70;
  let s = 70;
  if (text.slice(0, 120) === priorReply.slice(0, 120)) s -= 50;
  if (/You're right|historical side|not just the Sabbath definition/i.test(text)) s += 25;
  return Math.max(0, Math.min(100, s));
}

function hasInternalLabels(text) {
  return /Source-grounded answer:|The app should not|Validation:|Continuity generated:/i.test(text);
}

function evaluateTest(name, result, checks) {
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
    status: result.status,
    replyPreview: String(result.reply).slice(0, 220),
    scriptureCount: result.scripture?.length || 0,
    runtimeIntent: result.runtime?.intent || result.runtime?.sabbathIntent?.intent || null,
    intercept: result.runtime?.intercept || null,
  };
}

async function runSuite() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer();
  const results = [];
  const scores = {};

  try {
    const uid = `${USER_PREFIX}-main`;

    // TEST 1
    const t1 = await postChat(server, uid, 'I lost a friend Wednesday.');
    results.push(
      evaluateTest('TEST 1 — Lost friend', t1, {
        empathy: (r) => /sorry|loss|grief|comfort|here with you/i.test(r.reply),
        scripture: (r) => r.scripture.length >= 1 || /Psalm|Matthew|Scripture/i.test(r.reply),
        noInternal: (r) => !hasInternalLabels(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    // TEST 2
    const t2 = await postChat(server, uid, 'My knees hurt.');
    results.push(
      evaluateTest('TEST 2 — Knee pain', t2, {
        health: (r) => /knee|pain|health|gentle|doctor/i.test(r.reply),
        noSlowDown: (r) => !/slow this down together/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    // TEST 3
    const t3 = await postChat(server, uid, 'I have a job opportunity.');
    results.push(
      evaluateTest('TEST 3 — Job opportunity', t3, {
        response: (r) => r.reply.length > 40,
        noInternal: (r) => !hasInternalLabels(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    // TEST 4
    const t4 = await postChat(server, `${USER_PREFIX}-sabbath`, 'What is the Sabbath?');
    results.push(
      evaluateTest('TEST 4 — Sabbath definition', t4, {
        scripture: (r) => /Genesis|Exodus|seventh day|Sabbath/i.test(r.reply),
        reflection: (r) => /thoughtful|explore|walk|Scripture/i.test(r.reply),
        noInternal: (r) => !hasInternalLabels(r.reply),
        notHistoryOnly: (r) => !/^You're asking the historical side now/i.test(r.reply.trim()),
      })
    );

    // TEST 5
    const t5 = await postChat(server, `${USER_PREFIX}-sabbath`, 'Who changed the Sabbath and why?');
    results.push(
      evaluateTest('TEST 5 — Sabbath history', t5, {
        scriptureFirst: (r) => /Scripture|Genesis|Exodus/i.test(r.reply),
        history: (r) => /historical/i.test(r.reply),
        distinction: (r) => /not the same as a biblical command|does not show God changing/i.test(r.reply),
        noInternal: (r) => !hasInternalLabels(r.reply),
        historyIntercept: (r) =>
          r.runtime?.intercept === 'sabbath_history_companion' ||
          r.runtime?.intent === 'sabbath_history' ||
          /historical side now/i.test(r.reply),
      })
    );

    // TEST 6
    const t6 = await postChat(server, `${USER_PREFIX}-prayer`, 'Please pray for me.');
    results.push(
      evaluateTest('TEST 6 — Prayer', t6, {
        prayer: (r) => /pray|Lord|Father|amen|Scripture/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    // TEST 7
    const t7 = await postChat(server, uid, 'What were we talking about last week?');
    results.push(
      evaluateTest('TEST 7 — Memory recall', t7, {
        recall: (r) => /remember|last week|talked|carrying|studying|friend|knee|prayer/i.test(r.reply),
        noHallucinationMarker: (r) => !/\[object Object\]/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    // TEST 8
    const t8 = await postChat(server, `${USER_PREFIX}-kingdom`, 'What is the Kingdom of God?');
    results.push(
      evaluateTest('TEST 8 — Kingdom', t8, {
        kingdom: (r) => /Kingdom|Isaiah|Daniel|Revelation|Scripture/i.test(r.reply),
        noObjectLeak: (r) => !/\[object Object\]/i.test(r.reply),
        noInternal: (r) => !hasInternalLabels(r.reply),
      })
    );

    // TEST 9
    await postChat(server, `${USER_PREFIX}-continue`, 'What is the Sabbath?');
    const t9 = await postChat(server, `${USER_PREFIX}-continue`, 'Continue.');
    results.push(
      evaluateTest('TEST 9 — Continue study', t9, {
        continue: (r) => /continue|Hebrews|Acts|study|pick up|where we left/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    // TEST 10 — follow-up
    const uid10 = `${USER_PREFIX}-followup`;
    await postChat(server, uid10, 'What is the Sabbath?');
    const t10a = await postChat(server, uid10, 'Who changed the Sabbath and why?');
    const t10b = await postChat(server, uid10, 'That was not my question. Who changed it historically?');
    results.push(
      evaluateTest('TEST 10 — Follow-up understanding', t10b, {
        correction: (r) => /right|historical|Sunday|Scripture/i.test(r.reply),
        differentFromPrior: (r) => r.reply.slice(0, 100) !== t10a.reply.slice(0, 100),
        noInternal: (r) => !hasInternalLabels(r.reply),
      })
    );

    // TEST 11 — Sabbath journey
    const uid11 = `${USER_PREFIX}-sabbath-journey`;
    const sj = [];
    sj.push(await postChat(server, uid11, 'What is the Sabbath?'));
    sj.push(await postChat(server, uid11, 'Continue.'));
    sj.push(await postChat(server, uid11, 'Continue.'));
    sj.push(await postChat(server, uid11, 'Continue.'));
    const progression = sj.map((s) => s.reply.slice(0, 80)).join(' | ');
    results.push(
      evaluateTest('TEST 11 — Sabbath journey', sj[3], {
        progression: () => new Set(sj.map((s) => s.reply.slice(0, 60))).size >= 2,
        continueWorks: (r) => /continue|Hebrews|Acts|study|Scripture/i.test(r.reply),
      })
    );

    // TEST 12 — Kingdom journey
    const uid12 = `${USER_PREFIX}-kingdom-journey`;
    await postChat(server, uid12, 'What is the Kingdom of God?');
    const t12 = await postChat(server, uid12, 'Continue.');
    results.push(
      evaluateTest('TEST 12 — Kingdom journey', t12, {
        continue: (r) => /continue|Kingdom|Messiah|Isaiah|study/i.test(r.reply),
      })
    );

    // TEST 13 — Feast journey memory
    const uid13 = `${USER_PREFIX}-feast`;
    await postChat(server, uid13, 'What are the feast days in Leviticus 23?');
    const t13 = await postChat(server, uid13, 'Continue.');
    results.push(
      evaluateTest('TEST 13 — Feast journey', t13, {
        feast: (r) => /feast|Leviticus|continue|study|Scripture/i.test(r.reply),
      })
    );

    // TEST 14 — Resume after delay / topic switch
    const uid14 = `${USER_PREFIX}-resume`;
    await postChat(server, uid14, 'What is the Sabbath?');
    await postChat(server, uid14, 'My knees hurt.');
    const t14 = await postChat(server, uid14, 'Continue.');
    results.push(
      evaluateTest('TEST 14 — Resume after topic switch', t14, {
        resume: (r) => /continue|Sabbath|Acts|Hebrews|study/i.test(r.reply),
      })
    );

    // TEST 15 — Completion path
    const uid15 = `${USER_PREFIX}-completion`;
    await postChat(server, uid15, 'What is the Kingdom of God?');
    const t15 = await postChat(server, uid15, 'What should I study next?');
    results.push(
      evaluateTest('TEST 15 — Completion / next study', t15, {
        recommendation: (r) => /study|next|Kingdom|Messiah|continue|Scripture/i.test(r.reply),
      })
    );

    // Scoring
    const allReplies = results.map((r) => r.replyPreview).join('\n');
    scores.Memory = t7.passed ? 88 : 62;
    scores.Warmth = Math.round((scoreWarmth(t1.replyPreview) + scoreWarmth(t2.replyPreview)) / 2);
    scores['Scripture Grounding'] = Math.round(
      (scoreScripture(t4.replyPreview, t4.scriptureCount) + scoreScripture(t5.replyPreview, t5.scriptureCount)) / 2
    );
    scores.Accuracy = results.filter((r) => r.passed).length >= 13 ? 92 : 78;
    scores['Natural Conversation'] = hasInternalLabels(allReplies) ? 70 : 90;
    scores.Listening = t10b.passed ? 92 : 68;
    scores['Organic Flow'] = scores['Natural Conversation'];
    scores['Follow-Up Understanding'] = t10b.passed ? 94 : 72;
    scores['Continue Study'] = t9.passed && t12.passed ? 91 : 75;
    scores['Historical Routing'] = t5.passed ? 96 : 55;
    scores['Reflection Before Teaching'] = /thoughtful|explore|walk/i.test(t4.replyPreview) ? 93 : 80;

    const acceptanceScore = Math.round(
      (Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length)
    );

    const out = {
      timestamp: new Date().toISOString(),
      route: 'POST /buddy/chat',
      userPrefix: USER_PREFIX,
      results,
      scores,
      acceptanceScore,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
    };

    fs.writeFileSync(path.join(OUT_DIR, 'acceptance-results.json'), JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
    return out;
  } finally {
    server.close();
  }
}

runSuite()
  .then((out) => {
    console.error(`\nAcceptance: ${out.passed}/${out.total} passed | Score: ${out.acceptanceScore}`);
    if (out.passed < out.total) process.exit(1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
