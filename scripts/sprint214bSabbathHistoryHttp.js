#!/usr/bin/env node
/**
 * Sprint 2.14B — Sabbath history depth HTTP acceptance tests.
 */

const http = require('http');
const { runBuddy } = require('../services/buddyBrain');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'sprint214b');

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
    intercept: result.runtime?.intercept || null,
    intent: result.runtime?.intent || null,
  };
}

function scoreDepth(results) {
  const r = Object.fromEntries(results.map((x) => [x.name, x]));
  const t1 = r['TEST 1 — Who changed Sabbath'];
  const t2 = r['TEST 2 — Rome and Catholic Church'];
  const t3 = r['TEST 3 — Catholic Church performed change'];
  const t4 = r['TEST 4 — Historical evidence'];
  const t5 = r['TEST 5 — Follow-up correction'];

  const allReplies = results.map((x) => x.replyPreview).join('\n');

  const scores = {
    directness: 0,
    historicalSpecificity: 0,
    scriptureFirst: 0,
    naturalConversation: 0,
    noIrrelevantPrompts: 0,
    noMemoryBleed: 0,
    noRepetition: 0,
  };

  if (t1?.passed && t2?.passed && t3?.passed) scores.directness = 97;
  else if (results.filter((x) => x.passed).length >= 3) scores.directness = 82;
  else scores.directness = 55;

  if (/Constantine|321|Laodicea|Roman Catholic|church authority/i.test(allReplies)) {
    scores.historicalSpecificity = 97;
  } else scores.historicalSpecificity = 60;

  if (/Genesis 2:2-3|Exodus 20:8-11|Scripture first|does not record God changing/i.test(allReplies)) {
    scores.scriptureFirst = 97;
  } else scores.scriptureFirst = 65;

  scores.naturalConversation = /ask that directly|companion recently|Tacitus Histories/i.test(allReplies) ? 70 : 96;

  scores.noIrrelevantPrompts =
    /continue into Feast Days|Would you like to continue studying/i.test(allReplies) ? 65 : 97;

  scores.noMemoryBleed = /companion recently|You mentioned recently/i.test(allReplies) ? 60 : 97;

  scores.noRepetition =
    t4?.passed && !/That is a good question|fourth commandment anchors/i.test(t4.replyPreview) ? 97 : 78;

  const values = Object.values(scores);
  return {
    scores,
    overall: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  };
}

async function runSuite(options = {}) {
  const USER_PREFIX = options.userPrefix || `s214b-${Date.now()}-${process.pid}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await new Promise((resolve, reject) => {
    const s = createBuddyServer();
    s.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const results = [];

  try {
    const uid1 = `${USER_PREFIX}-t1`;
    const t1 = await postChat(server, uid1, 'Who changed Sabbath from Saturday to Sunday?');
    results.push(
      evaluate('TEST 1 — Who changed Sabbath', t1, {
        scriptureNoChange: (r) => /does not record God changing|Scripture identifies the seventh day/i.test(r.reply),
        constantine: (r) => /Constantine|321/i.test(r.reply),
        laodicea: (r) => /Laodicea/i.test(r.reply),
        churchAuthority: (r) => /Roman Catholic|church authority/i.test(r.reply),
        historySecondary: (r) => /secondary to Scripture|History can explain/i.test(r.reply),
        intercept: (r) => r.runtime?.intercept === 'sabbath_history_companion',
      })
    );

    const uid2 = `${USER_PREFIX}-t2`;
    await postChat(server, uid2, 'What is the Sabbath?');
    const t2 = await postChat(server, uid2, 'Did Rome do that religious change by making the Roman Catholic Church?');
    results.push(
      evaluate('TEST 2 — Rome and Catholic Church', t2, {
        directAnswer: (r) => /Yes|Roman civil authority|Roman church authority|major role/i.test(r.reply),
        notVague: (r) => !/Tacitus Histories/i.test(r.reply) && !/Historical Sabbath observance records/i.test(r.reply),
        notDefinitionOnly: (r) => !/^That is a good question/i.test(r.reply.trim()),
        romeMention: (r) => /Rome|Roman/i.test(r.reply),
      })
    );

    const uid3 = `${USER_PREFIX}-t3`;
    await postChat(server, uid3, 'What is the Sabbath?');
    const t3 = await postChat(
      server,
      uid3,
      'So did the Roman Catholic Church perform the change of the Sabbath from Sat to Sunday?'
    );
    results.push(
      evaluate('TEST 3 — Catholic Church performed change', t3, {
        yesHistorically: (r) => /\bYes\b|yes — historically|historical answer is yes/i.test(r.reply),
        gradual: (r) => /gradual|over time|321|Laodicea/i.test(r.reply),
        notBiblicalCommand: (r) => /not.*biblical command|does not record/i.test(r.reply),
      })
    );

    const uid4 = `${USER_PREFIX}-t4`;
    await postChat(server, uid4, 'What is the Sabbath?');
    const t4 = await postChat(server, uid4, 'Give me the historical evidence.');
    results.push(
      evaluate('TEST 4 — Historical evidence', t4, {
        chain: (r) => /Constantine|Laodicea|first day|Roman/i.test(r.reply),
        notDefinitionRepeat: (r) => !/That is a good question about the Sabbath command itself/i.test(r.reply),
        historicalChain: (r) => /Historical chain|AD 321|Council of Laodicea/i.test(r.reply),
      })
    );

    const uid5 = `${USER_PREFIX}-t5`;
    await postChat(server, uid5, 'What is the Sabbath?');
    await postChat(server, uid5, 'Who changed the Sabbath and why?');
    const t5 = await postChat(server, uid5, 'That was not my question.');
    results.push(
      evaluate('TEST 5 — Follow-up correction', t5, {
        apology: (r) => /right|sorry|drifted|definition again/i.test(r.reply),
        historicalAnswer: (r) => /Constantine|Laodicea|Roman|historical/i.test(r.reply),
        direct: (r) => /Direct answer|historical answer/i.test(r.reply),
      })
    );

    const scoring = scoreDepth(results);
    const out = {
      timestamp: new Date().toISOString(),
      sprint: '2.14B',
      results,
      scoring,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
    };

    fs.writeFileSync(path.join(OUT_DIR, 'sabbath-history-depth-results.json'), JSON.stringify(out, null, 2));
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
      console.error(`\nSabbath History Depth: ${out.passed}/${out.total} | Score: ${out.scoring.overall}`);
      if (out.passed < out.total || out.scoring.overall < 95) process.exit(1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { runSuite, createBuddyServer, postChat, evaluate, scoreDepth };
