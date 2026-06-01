#!/usr/bin/env node
/**
 * Sprint 2.14D — Active Conversation Integrity HTTP acceptance tests.
 *
 * Validates that Buddy stays attached to the current conversation:
 *  - Part H: a Sabbath-history thread holds across follow-ups + a correction.
 *  - Part I: a grief thread holds across follow-ups without topic jumps.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'sprint214d');

function createBuddyServer() {
  return http.createServer((req, res) => {
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
    intent: result.runtime?.intent || null,
    activeTopic: result.runtime?.activeTopic || null,
    followUp: !!result.runtime?.followUp,
  };
}

// Off-topic bleed that must never appear inside a focused thread.
const KNEE_BLEED = /knee|joint pain|your knee/i;
const GRIEF_BLEED = /lost a friend|your grief|those who sleep|mourning/i;
const FEAST_BLEED = /Feast Days|feast day|Passover study|continue into Feast/i;
const STUDY_PROMPT_BLEED = /Would you like to continue studying|continue your study|next study|study journey|pick up where we left off/i;
const MEMORY_BLEED = /You mentioned recently|You were thinking about|I remember you/i;

function scoreCategories(results) {
  const sabbathTurns = results.filter((r) => r.name.startsWith('H'));
  const griefTurns = results.filter((r) => r.name.startsWith('I'));

  const sabbathStayedOnTopic = sabbathTurns.every(
    (r) => !KNEE_BLEED.test(r.replyPreview) && !GRIEF_BLEED.test(r.replyPreview) && !FEAST_BLEED.test(r.replyPreview)
  );
  const sabbathHistorical = sabbathTurns
    .slice(1)
    .every((r) => /Constantine|Laodicea|Roman|Sunday|Sabbath|historical|Direct answer/i.test(r.replyPreview));

  const griefStayedOnTopic = griefTurns.every(
    (r) => !/Sabbath|Constantine|Laodicea/i.test(r.replyPreview) && !FEAST_BLEED.test(r.replyPreview)
  );

  const noStudyPrompts = results.every((r) => !STUDY_PROMPT_BLEED.test(r.replyPreview));

  // Part D: off-topic memory must not surface. On-topic memory (grief recall
  // inside a grief thread) is permitted. We only penalize cross-topic bleed:
  //   - any non-grief memory inside Sabbath turns
  //   - health/Sabbath memory inside grief turns
  const sabbathMemoryBleed = sabbathTurns.some(
    (r) => MEMORY_BLEED.test(r.replyPreview) || KNEE_BLEED.test(r.replyPreview) || GRIEF_BLEED.test(r.replyPreview)
  );
  const griefMemoryBleed = griefTurns.some((r) => KNEE_BLEED.test(r.replyPreview) || /Sabbath|Constantine/i.test(r.replyPreview));
  const offTopicMemoryBleed = sabbathMemoryBleed || griefMemoryBleed;

  const correctionHandled = results.some(
    (r) => /not my question|H5/.test(r.name) && /right|drifted|hear you|answer/i.test(r.replyPreview)
  );

  const allPassed = results.every((r) => r.passed);

  const scores = {
    conversationContinuity: sabbathStayedOnTopic && griefStayedOnTopic ? 98 : 70,
    followUpUnderstanding: sabbathHistorical && allPassed ? 97 : 78,
    correctionHandling: correctionHandled ? 97 : 75,
    memoryRelevance: !offTopicMemoryBleed ? 97 : 65,
    topicPersistence: sabbathStayedOnTopic && griefStayedOnTopic ? 98 : 70,
    naturalConversation: noStudyPrompts && allPassed ? 96 : 75,
  };

  const values = Object.values(scores);
  return { scores, overall: Math.round(values.reduce((a, b) => a + b, 0) / values.length) };
}

async function runSuite(options = {}) {
  const USER_PREFIX = options.userPrefix || `s214d-${Date.now()}-${process.pid}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await new Promise((resolve, reject) => {
    const s = createBuddyServer();
    s.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const results = [];

  try {
    // ── PART H — ACTIVE SABBATH-HISTORY TOPIC ───────────────────────────────
    const hUser = `${USER_PREFIX}-sabbath`;

    results.push(
      evaluate('H1 — Did Rome change the Sabbath?', await postChat(server, hUser, 'Did Rome change the Sabbath?'), {
        historical: (r) => /Constantine|321|Laodicea|Roman/i.test(r.reply),
        scriptureFirst: (r) => /Genesis 2:2-3|Exodus 20:8-11|Scripture/i.test(r.reply),
        noBleed: (r) => !KNEE_BLEED.test(r.reply) && !GRIEF_BLEED.test(r.reply) && !FEAST_BLEED.test(r.reply),
      })
    );

    results.push(
      evaluate('H2 — Was the pope involved?', await postChat(server, hUser, 'Was the pope involved?'), {
        stillSabbath: (r) => /Roman|Catholic|church authority|Constantine|Laodicea|Sunday|Sabbath/i.test(r.reply),
        noKnee: (r) => !KNEE_BLEED.test(r.reply),
        noGrief: (r) => !GRIEF_BLEED.test(r.reply),
        noFeast: (r) => !FEAST_BLEED.test(r.reply),
        noStudyPrompt: (r) => !STUDY_PROMPT_BLEED.test(r.reply),
      })
    );

    results.push(
      evaluate('H3 — What evidence exists?', await postChat(server, hUser, 'What evidence exists?'), {
        evidence: (r) => /Codex Justinianus|Canon 29|Eusebius|Constantine|Laodicea|Historical chain/i.test(r.reply),
        stillSabbath: (r) => /Sabbath|Sunday|Roman/i.test(r.reply),
        noBleed: (r) => !KNEE_BLEED.test(r.reply) && !GRIEF_BLEED.test(r.reply) && !FEAST_BLEED.test(r.reply),
      })
    );

    results.push(
      evaluate('H4 — Why did they do it?', await postChat(server, hUser, 'Why did they do it?'), {
        stillSabbath: (r) => /Constantine|Roman|Sunday|Sabbath|historical/i.test(r.reply),
        noBleed: (r) => !KNEE_BLEED.test(r.reply) && !GRIEF_BLEED.test(r.reply) && !FEAST_BLEED.test(r.reply),
      })
    );

    results.push(
      evaluate('H5 — That wasn\'t my question.', await postChat(server, hUser, "That wasn't my question."), {
        apology: (r) => /right|drifted|hear you|wasn't your question|answer what you/i.test(r.reply),
        stillSabbath: (r) => /Constantine|Laodicea|Roman|Sabbath|historical/i.test(r.reply),
        noBleed: (r) => !KNEE_BLEED.test(r.reply) && !GRIEF_BLEED.test(r.reply) && !FEAST_BLEED.test(r.reply),
        noStudyPrompt: (r) => !STUDY_PROMPT_BLEED.test(r.reply),
      })
    );

    // ── PART I — HUMAN GRIEF CONVERSATION ───────────────────────────────────
    const iUser = `${USER_PREFIX}-grief`;

    results.push(
      evaluate('I1 — I lost my friend.', await postChat(server, iUser, 'I lost my friend.'), {
        comfort: (r) => /sorry|grief|heart|comfort|here with you|gently/i.test(r.reply),
        notSabbath: (r) => !/Sabbath|Constantine|Laodicea/i.test(r.reply),
      })
    );

    results.push(
      evaluate('I2 — How do I help her daughters?', await postChat(server, iUser, 'How do I help her daughters?'), {
        staysGrief: (r) => /comfort|grief|loss|hurt|brokenhearted|mourn|here with|gently|peace/i.test(r.reply),
        notSabbath: (r) => !/Sabbath|Constantine|Laodicea/i.test(r.reply),
        noFeast: (r) => !FEAST_BLEED.test(r.reply),
        noStudyPrompt: (r) => !STUDY_PROMPT_BLEED.test(r.reply),
      })
    );

    results.push(
      evaluate('I3 — Should I call them?', await postChat(server, iUser, 'Should I call them?'), {
        staysGrief: (r) => /comfort|grief|loss|hurt|brokenhearted|mourn|here with|gently|peace|reach out/i.test(r.reply),
        notSabbath: (r) => !/Sabbath|Constantine|Laodicea/i.test(r.reply),
        noFeast: (r) => !FEAST_BLEED.test(r.reply),
      })
    );

    const scoring = scoreCategories(results);
    const out = {
      timestamp: new Date().toISOString(),
      sprint: '2.14D',
      results,
      scoring,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
    };

    fs.writeFileSync(path.join(OUT_DIR, 'active-conversation-results.json'), JSON.stringify(out, null, 2));
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
      console.error(
        `\nActive Conversation Integrity: ${out.passed}/${out.total} | Overall: ${out.scoring.overall} | Min category: ${minScore}`
      );
      if (out.passed < out.total || minScore < 95) process.exit(1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { runSuite, createBuddyServer, postChat, evaluate, scoreCategories };
