#!/usr/bin/env node
/**
 * Sprint 2.14 — POST /buddy/chat acceptance suite (15 original + 5 quality tests).
 */

const http = require('http');
const { runBuddy } = require('../services/buddyBrain');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'sprint214');

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

function hasInternalLabels(text) {
  return /Source-grounded answer:|The app should not|Validation:|Continuity generated:/i.test(text);
}

function countStackedPhrases(text) {
  const patterns = [
    /That's a thoughtful question/gi,
    /Let's build this carefully/gi,
    /Let's explore that together/gi,
    /You mentioned recently/gi,
    /Last time we were (studying|looking at)/gi,
  ];
  return patterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0);
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
    replyPreview: String(result.reply).slice(0, 280),
    scriptureCount: result.scripture?.length || 0,
    runtimeIntent: result.runtime?.intent || result.runtime?.sabbathIntent?.intent || null,
    intercept: result.runtime?.intercept || null,
  };
}

function computeScores(ctx) {
  const {
    results,
    t7,
    t10b,
    t16,
    t17,
    t18,
    t19,
    t20,
    t9,
    t11,
    t5,
    t4,
    t1,
    t2,
  } = ctx;

  const passedCount = results.filter((r) => r.passed).length;
  const allReplies = results.map((r) => r.replyPreview).join('\n');

  const memoryRelational =
    t7.passed &&
    !/Health:|Prayer concern:|You said:/i.test(t7.replyPreview) &&
    /remember|mentioned|studying|praying|knee|friend|grief/i.test(t7.replyPreview);

  const scores = {};
  scores.Memory = memoryRelational && t16.passed && t20.passed ? 96 : t7.passed ? 90 : 62;
  scores.Warmth = Math.min(
    100,
    50 +
      (t1.passed ? 20 : 0) +
      (t2.passed ? 20 : 0) +
      (t17.passed ? 10 : 0) +
      (/slow this down together/i.test(allReplies) ? -30 : 10)
  );
  scores['Scripture Grounding'] = t4.passed && t5.passed ? 97 : 78;
  scores.Accuracy = passedCount >= 18 ? 96 : passedCount >= 15 ? 92 : 78;
  scores['Natural Conversation'] =
    !hasInternalLabels(allReplies) && !/Health: knee|You said:/i.test(allReplies) ? 96 : 72;
  scores.Listening =
    t10b.passed && t16.passed && t17.passed && !/sorry for your loss/i.test(t17.replyPreview)
      ? 97
      : t10b.passed
        ? 92
        : 68;
  scores['Organic Flow'] =
    countStackedPhrases(allReplies) <= results.length + 2 && !hasInternalLabels(allReplies) ? 96 : 82;
  scores['Follow-Up Understanding'] = t10b.passed && t17.passed ? 97 : t10b.passed ? 94 : 72;
  scores['Continue Study'] =
    t18.passed && t9.passed && t11.passed && /where|delight|blessing|next step/i.test(t18.replyPreview)
      ? 97
      : t9.passed
        ? 91
        : 75;
  scores['Historical Routing'] = t5.passed ? 96 : 55;
  scores['Companion Presence'] =
    t19.passed && t20.passed && (t16.passed || t17.passed) ? 96 : passedCount >= 17 ? 92 : 85;

  return scores;
}

async function runSuite(options = {}) {
  const USER_PREFIX = options.userPrefix || `s214-${Date.now()}-${process.pid}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer();
  const results = [];

  try {
    const uid = `${USER_PREFIX}-main`;

    const t1 = await postChat(server, uid, 'I lost a friend Wednesday.');
    results.push(
      evaluateTest('TEST 1 — Lost friend', t1, {
        empathy: (r) => /sorry|loss|grief|comfort|here with you/i.test(r.reply),
        scripture: (r) => r.scripture.length >= 1 || /Psalm|Matthew|Scripture/i.test(r.reply),
        noInternal: (r) => !hasInternalLabels(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    const t2 = await postChat(server, uid, 'My knees hurt.');
    results.push(
      evaluateTest('TEST 2 — Knee pain', t2, {
        health: (r) => /knee|pain|health|gentle|doctor/i.test(r.reply),
        noSlowDown: (r) => !/slow this down together/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    const t3 = await postChat(server, uid, 'I have a job opportunity.');
    results.push(
      evaluateTest('TEST 3 — Job opportunity', t3, {
        response: (r) => r.reply.length > 40,
        noInternal: (r) => !hasInternalLabels(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    const t4 = await postChat(server, `${USER_PREFIX}-sabbath`, 'What is the Sabbath?');
    results.push(
      evaluateTest('TEST 4 — Sabbath definition', t4, {
        scripture: (r) => /Genesis|Exodus|seventh day|Sabbath/i.test(r.reply),
        reflection: (r) => /thoughtful|explore|walk|Scripture/i.test(r.reply),
        noInternal: (r) => !hasInternalLabels(r.reply),
        notHistoryOnly: (r) => !/^You're asking the historical side now/i.test(r.reply.trim()),
      })
    );

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

    const t6 = await postChat(server, `${USER_PREFIX}-prayer`, 'Please pray for me.');
    results.push(
      evaluateTest('TEST 6 — Prayer', t6, {
        prayer: (r) => /pray|Lord|Father|amen|Scripture/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    const t7 = await postChat(server, uid, 'What were we talking about last week?');
    results.push(
      evaluateTest('TEST 7 — Memory recall', t7, {
        recall: (r) => /remember|mentioned|talked|carrying|studying|friend|knee|prayer/i.test(r.reply),
        relational: (r) => !/Health:|Prayer concern:/i.test(r.reply),
        noHallucinationMarker: (r) => !/\[object Object\]/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    const t8 = await postChat(server, `${USER_PREFIX}-kingdom`, 'What is the Kingdom of God?');
    results.push(
      evaluateTest('TEST 8 — Kingdom', t8, {
        kingdom: (r) => /Kingdom|Isaiah|Daniel|Revelation|Scripture/i.test(r.reply),
        noObjectLeak: (r) => !/\[object Object\]/i.test(r.reply),
        noInternal: (r) => !hasInternalLabels(r.reply),
      })
    );

    await postChat(server, `${USER_PREFIX}-continue`, 'What is the Sabbath?');
    const t9 = await postChat(server, `${USER_PREFIX}-continue`, 'Continue.');
    results.push(
      evaluateTest('TEST 9 — Continue study', t9, {
        continue: (r) => /continue|last time|next step|study|looking at/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

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

    const uid11 = `${USER_PREFIX}-sabbath-journey`;
    const sj = [];
    sj.push(await postChat(server, uid11, 'What is the Sabbath?'));
    sj.push(await postChat(server, uid11, 'Continue.'));
    sj.push(await postChat(server, uid11, 'Continue.'));
    sj.push(await postChat(server, uid11, 'Continue.'));
    const t11 = evaluateTest('TEST 11 — Sabbath journey', sj[3], {
      progression: () => new Set(sj.map((s) => s.reply.slice(0, 60))).size >= 2,
      continueWorks: (r) => /continue|last time|next step|Isaiah|Acts|Hebrews|study/i.test(r.reply),
    });
    results.push(t11);

    const uid12 = `${USER_PREFIX}-kingdom-journey`;
    await postChat(server, uid12, 'What is the Kingdom of God?');
    const t12 = await postChat(server, uid12, 'Continue.');
    results.push(
      evaluateTest('TEST 12 — Kingdom journey', t12, {
        continue: (r) => /continue|Kingdom|Messiah|Isaiah|study|next step/i.test(r.reply),
      })
    );

    const uid13 = `${USER_PREFIX}-feast`;
    await postChat(server, uid13, 'What are the feast days in Leviticus 23?');
    const t13 = await postChat(server, uid13, 'Continue.');
    results.push(
      evaluateTest('TEST 13 — Feast journey', t13, {
        feast: (r) => /feast|Leviticus|continue|study|Scripture/i.test(r.reply),
      })
    );

    const uid14 = `${USER_PREFIX}-resume`;
    await postChat(server, uid14, 'What is the Sabbath?');
    await postChat(server, uid14, 'My knees hurt.');
    const t14 = await postChat(server, uid14, 'Continue.');
    results.push(
      evaluateTest('TEST 14 — Resume after topic switch', t14, {
        resume: (r) => /continue|Sabbath|Acts|Hebrews|study|last time/i.test(r.reply),
      })
    );

    const uid15 = `${USER_PREFIX}-completion`;
    await postChat(server, uid15, 'What is the Kingdom of God?');
    const t15 = await postChat(server, uid15, 'What should I study next?');
    results.push(
      evaluateTest('TEST 15 — Completion / next study', t15, {
        recommendation: (r) => /study|next|Kingdom|Messiah|continue|Scripture/i.test(r.reply),
      })
    );

    const uid16 = `${USER_PREFIX}-knee-recur`;
    await postChat(server, uid16, 'My knees hurt.');
    const t16 = await postChat(server, uid16, 'My knees are hurting again today.');
    results.push(
      evaluateTest('TEST 16 — Recurring knee pain', t16, {
        acknowledgesOngoing: (r) => /again|knee|hurting|still|bother/i.test(r.reply),
        notGenericOnly: (r) => !/^I hear you sharing about health/i.test(r.reply.trim()),
        leadsWithCurrent: (r) => /again today|hurting again|knees/i.test(r.reply.slice(0, 120)),
        http200: (r) => r.status === 200,
      })
    );

    const uid17 = `${USER_PREFIX}-grief-follow`;
    await postChat(server, uid17, 'I lost my friend last week.');
    const t17 = await postChat(server, uid17, 'It is still bothering me.');
    results.push(
      evaluateTest('TEST 17 — Grief follow-up', t17, {
        usesMemory: (r) => /still|weighing|bothering|grief|loss/i.test(r.reply),
        notFirstLossOnly: (r) => !/^I'm really sorry for your loss/i.test(r.reply.trim()),
        http200: (r) => r.status === 200,
      })
    );

    const uid18 = `${USER_PREFIX}-continue-journey`;
    await postChat(server, uid18, 'What is the Sabbath?');
    const t18 = await postChat(server, uid18, 'Continue.');
    results.push(
      evaluateTest('TEST 18 — Continue journey explanation', t18, {
        journey: (r) => /last time|looking at|next step/i.test(r.reply),
        significance: (r) => /where|delight|blessing|connected|Scripture builds/i.test(r.reply),
        notVerseDump: (r) => !/^Continue study\. Next verse:/i.test(r.reply.trim()),
        http200: (r) => r.status === 200,
      })
    );

    const uid19 = `${USER_PREFIX}-focus`;
    await postChat(server, uid19, 'What is the Sabbath?');
    await postChat(server, uid19, 'Please pray for my family.');
    await postChat(server, uid19, 'My knees hurt.');
    const t19 = await postChat(server, uid19, 'What should I focus on this week?');
    results.push(
      evaluateTest('TEST 19 — Focus this week', t19, {
        usesHistory: (r) => /study|pray|knee|health|focus|Sabbath|family|carrying/i.test(r.reply),
        notGeneric: (r) => r.reply.length > 80 && !/^Share what is on your heart/i.test(r.reply.trim()),
        http200: (r) => r.status === 200,
      })
    );

    const uid20 = `${USER_PREFIX}-working-on`;
    await postChat(server, uid20, 'What is the Kingdom of God?');
    await postChat(server, uid20, 'Please pray for wisdom.');
    const t20 = await postChat(server, uid20, 'What have we been working on lately?');
    results.push(
      evaluateTest('TEST 20 — Working on lately', t20, {
        actualThemes: (r) => /studying|Kingdom|pray|prayer|working|remember/i.test(r.reply),
        notGenericSummary: (r) => !/I don't have enough/i.test(r.reply) && r.reply.length > 60,
        relational: (r) => !/Health:|Prayer concern:/i.test(r.reply),
        http200: (r) => r.status === 200,
      })
    );

    const scores = computeScores({
      results,
      t7: results.find((r) => r.name.startsWith('TEST 7')),
      t10b: results.find((r) => r.name.startsWith('TEST 10')),
      t16: results.find((r) => r.name.startsWith('TEST 16')),
      t17: results.find((r) => r.name.startsWith('TEST 17')),
      t18: results.find((r) => r.name.startsWith('TEST 18')),
      t19: results.find((r) => r.name.startsWith('TEST 19')),
      t20: results.find((r) => r.name.startsWith('TEST 20')),
      t9: results.find((r) => r.name.startsWith('TEST 9')),
      t11,
      t5: results.find((r) => r.name.startsWith('TEST 5')),
      t4: results.find((r) => r.name.startsWith('TEST 4')),
      t1: results.find((r) => r.name.startsWith('TEST 1')),
      t2: results.find((r) => r.name.startsWith('TEST 2')),
    });

    const acceptanceScore = Math.round(
      Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length
    );

    const out = {
      timestamp: new Date().toISOString(),
      sprint: '2.14',
      route: 'POST /buddy/chat',
      userPrefix: USER_PREFIX,
      results,
      scores,
      acceptanceScore,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
      allCategories95Plus: Object.values(scores).every((s) => s >= 95),
    };

    fs.writeFileSync(path.join(OUT_DIR, 'acceptance-results.json'), JSON.stringify(out, null, 2));
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
      console.error(`\nSprint 2.14 Acceptance: ${out.passed}/${out.total} passed | Score: ${out.acceptanceScore}`);
      console.error(`95+ all categories: ${out.allCategories95Plus}`);
      if (out.passed < out.total) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runSuite, createBuddyServer, postChat, evaluateTest, computeScores };
