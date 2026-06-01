#!/usr/bin/env node
/**
 * Sprint 2.FINAL — Master Runtime Stabilization HTTP tests.
 * Scenarios A–E through POST /buddy/chat (runBuddy).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'sprint2final');

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
  return { name, passed: failures.length === 0, failures, replyPreview: result.reply.slice(0, 280), intent: result.runtime?.intent, route: result.runtime?.masterRoute };
}

const KNEE = /knee pain|your knee/i;
const GRIEF_BLEED = /lost a friend Wednesday/i;
const FEAST = /Feast Days|continue into Feast|Genesis-to-Revelation path/i;
const STUDY_PROMPT = /Would you like to continue studying|continue your study journey/i;
const FALLBACK_BAD = /Source-grounded answer:|The app should|Validation:|Continuity generated:|\[object Object\]/i;
const SABBATH_DEF_ONLY = /^That is a good question about the Sabbath command itself/i;

function scoreResults(results) {
  const all = results.map((r) => r.replyPreview).join('\n');
  const sabbath = results.filter((r) => r.name.startsWith('A'));
  const grief = results.filter((r) => r.name.startsWith('B'));
  const health = results.filter((r) => r.name.startsWith('C'));
  const discern = results.filter((r) => r.name.startsWith('D'));
  const study = results.filter((r) => r.name.startsWith('E'));

  const passed = results.filter((r) => r.passed).length;

  const scores = {
    conversationContinuity: sabbath.every((r) => !KNEE.test(r.replyPreview) && !GRIEF_BLEED.test(r.replyPreview)) && grief.every((r) => !/Sabbath|Constantine/i.test(r.replyPreview)) ? 98 : 72,
    currentQuestionPriority: !FALLBACK_BAD.test(all) && passed >= results.length - 1 ? 97 : 75,
    followUpUnderstanding: sabbath.slice(1).every((r) => /Constantine|Roman|Pope|Sunday|historical|Direct answer/i.test(r.replyPreview)) ? 97 : 78,
    correctionHandling: sabbath.some((r) => /A5|A6/.test(r.name) && /right|drifted|hear you|answer/i.test(r.replyPreview)) ? 97 : 75,
    memoryRelevance: !sabbath.some((r) => KNEE.test(r.replyPreview) || GRIEF_BLEED.test(r.replyPreview)) ? 97 : 65,
    studyPromptDiscipline: !results.some((r) => STUDY_PROMPT.test(r.replyPreview) && !r.name.startsWith('E')) ? 97 : 70,
    historicalDepth: /Constantine|321|Laodicea|Canon 29|papal/i.test(all) ? 97 : 80,
    directness: !SABBATH_DEF_ONLY.test(all) && !/ask that directly/i.test(all) ? 97 : 72,
    warmth: /sorry|hear you|gently|important decision|tell me about/i.test(all) ? 96 : 85,
    curiosity: /How long|What feels|Tell me about|weighing on you/i.test(all) ? 96 : 88,
    scriptureGrounding: /Genesis 2:2-3|Exodus 20:8-11|Psalm|Proverbs|Scripture/i.test(all) ? 97 : 80,
    naturalFlow: !FALLBACK_BAD.test(all) && passed >= results.length - 1 ? 96 : 75,
    openAiFallbackParity: results.filter((r) => r.name.startsWith('F')).every((r) => r.passed) ? 96 : 85,
    responsePolish: !FALLBACK_BAD.test(all) ? 97 : 70,
  };

  const vals = Object.values(scores);
  return { scores, overall: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), passed, total: results.length };
}

async function runSuite(options = {}) {
  const PREFIX = options.userPrefix || `s2final-${Date.now()}-${process.pid}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await new Promise((resolve, reject) => {
    const s = createBuddyServer();
    s.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const results = [];

  try {
    const aUser = `${PREFIX}-sabbath`;
    results.push(evaluate('A1 — Did Rome change the Sabbath?', await postChat(server, aUser, 'Did Rome change the Sabbath?'), {
      historical: (r) => /Constantine|321|Laodicea|Roman/i.test(r.reply),
      noBleed: (r) => !KNEE.test(r.reply) && !FEAST.test(r.reply),
    }));
    results.push(evaluate('A2 — Was the Pope involved?', await postChat(server, aUser, 'Was the Pope involved?'), {
      pope: (r) => /Pope|papal|Roman|church authority|Constantine/i.test(r.reply),
      noKnee: (r) => !KNEE.test(r.reply),
      noFeast: (r) => !FEAST.test(r.reply),
    }));
    results.push(evaluate('A3 — What evidence exists?', await postChat(server, aUser, 'What evidence exists?'), {
      evidence: (r) => /Codex Justinianus|Canon 29|Eusebius|Historical chain/i.test(r.reply),
      stillHistory: (r) => /Sabbath|Sunday|Roman/i.test(r.reply),
    }));
    results.push(evaluate('A4 — Why did they do it?', await postChat(server, aUser, 'Why did they do it?'), {
      stillHistory: (r) => /Constantine|Roman|Sunday|Sabbath/i.test(r.reply),
    }));
    results.push(evaluate('A5 — Listen and answer my question.', await postChat(server, aUser, 'Listen and answer my question.'), {
      apology: (r) => /right|drifted|hear you|answer/i.test(r.reply),
      stillHistory: (r) => /Constantine|Roman|Sabbath|historical/i.test(r.reply),
    }));
    results.push(evaluate('A6 — I\'m not asking about my knee.', await postChat(server, aUser, "I'm not asking about my knee."), {
      apology: (r) => /right|drifted|hear you|answer|knee/i.test(r.reply),
      stillHistory: (r) => /Sabbath|Roman|Constantine/i.test(r.reply),
      noKneeFocus: (r) => !/^I hear you sharing about knee/i.test(r.reply),
    }));

    const bUser = `${PREFIX}-grief`;
    results.push(evaluate('B1 — I lost my friend.', await postChat(server, bUser, 'I lost my friend.'), {
      comfort: (r) => /sorry|grief|comfort|tell me about/i.test(r.reply),
      notSabbath: (r) => !/Constantine|fourth commandment/i.test(r.reply),
    }));
    results.push(evaluate('B2 — How do I help her daughters?', await postChat(server, bUser, 'How do I help her daughters?'), {
      staysGrief: (r) => /comfort|grief|loss|gently|peace|brokenhearted/i.test(r.reply),
      notSabbath: (r) => !/Sabbath|Constantine/i.test(r.reply),
    }));
    results.push(evaluate('B3 — Should I call them?', await postChat(server, bUser, 'Should I call them?'), {
      staysGrief: (r) => /comfort|grief|gently|peace|reach/i.test(r.reply),
    }));
    results.push(evaluate('B4 — What Scripture can comfort them?', await postChat(server, bUser, 'What Scripture can comfort them?'), {
      scripture: (r) => /Psalm|Matthew|Scripture|brokenhearted|comfort/i.test(r.reply),
      staysGrief: (r) => !/Sabbath|Constantine/i.test(r.reply),
    }));

    const cUser = `${PREFIX}-health`;
    results.push(evaluate('C1 — My knees hurt.', await postChat(server, cUser, 'My knees hurt.'), {
      empathy: (r) => /sorry|dealing with|How long|knee/i.test(r.reply),
      notSabbath: (r) => !/Constantine|Laodicea/i.test(r.reply),
    }));
    results.push(evaluate('C2 — It has been happening for a week.', await postChat(server, cUser, 'It has been happening for a week.'), {
      staysHealth: (r) => /knee|pain|health|gentle|doctor|Lord/i.test(r.reply),
      notSabbath: (r) => !/Constantine/i.test(r.reply),
    }));
    results.push(evaluate('C3 — What should I do next?', await postChat(server, cUser, 'What should I do next?'), {
      staysHealth: (r) => /knee|pain|health|gentle|doctor|pray|rest/i.test(r.reply),
    }));

    const dUser = `${PREFIX}-discern`;
    results.push(evaluate('D1 — I have a job opportunity.', await postChat(server, dUser, 'I have a job opportunity.'), {
      discernment: (r) => /important decision|heaviest|God|distance|timing/i.test(r.reply),
      notVerseMachine: (r) => !/^Psalm 34:18 establishes/i.test(r.reply.trim()),
    }));
    results.push(evaluate('D2 — It is far away.', await postChat(server, dUser, 'It is far away.'), {
      staysDiscernment: (r) => /distance|shift|heaviest|Lord|decision/i.test(r.reply),
    }));
    results.push(evaluate('D3 — I don\'t know if I should push or wait.', await postChat(server, dUser, "I don't know if I should push or wait."), {
      staysDiscernment: (r) => /wait|push|tension|decision|wisdom|Proverbs/i.test(r.reply),
    }));

    const eUser = `${PREFIX}-study`;
    results.push(evaluate('E1 — What is the Sabbath?', await postChat(server, eUser, 'What is the Sabbath?'), {
      definition: (r) => /seventh day|Genesis|Exodus|Sabbath/i.test(r.reply),
    }));
    results.push(evaluate('E2 — Continue.', await postChat(server, eUser, 'Continue.'), {
      continueStudy: (r) => /continue|pick up|Sabbath|study|Genesis|Exodus/i.test(r.reply),
    }));
    results.push(evaluate('E3 — Continue.', await postChat(server, eUser, 'Continue.'), {
      progress: (r) => /continue|Sabbath|study|Genesis|Exodus|Scripture/i.test(r.reply),
    }));
    results.push(evaluate('E4 — What did we study last?', await postChat(server, eUser, 'What did we study last?'), {
      recall: (r) => /Sabbath|study|Genesis|Exodus|last|continued/i.test(r.reply),
    }));

    const fUser = `${PREFIX}-life`;
    results.push(evaluate('F1 — I feel lost.', await postChat(server, fUser, 'I feel lost.'), {
      warm: (r) => /hear you|lost|unsettled|direction|step/i.test(r.reply),
      notDoctrineBlock: (r) => !/fourth commandment anchors|Sabbath command itself/i.test(r.reply),
      noFeast: (r) => !FEAST.test(r.reply),
    }));
    results.push(evaluate('F2 — What does God want me to do?', await postChat(server, fUser, 'I do not know what God wants me to do.'), {
      curious: (r) => /unsure|decision|direction|God|step/i.test(r.reply),
      notSabbath: (r) => !/Constantine|Laodicea/i.test(r.reply),
    }));
    results.push(evaluate('F3 — Help me think through it.', await postChat(server, fUser, 'Can you help me think through it?'), {
      staysOpen: (r) => /think|together|hardest|step|wisdom|Proverbs/i.test(r.reply),
      noStudyPrompt: (r) => !STUDY_PROMPT.test(r.reply),
    }));

    const scoring = scoreResults(results);
    const out = { timestamp: new Date().toISOString(), sprint: '2.FINAL', results, scoring };
    fs.writeFileSync(path.join(OUT_DIR, 'master-runtime-results.json'), JSON.stringify(out, null, 2));
    if (!options.quiet) console.log(JSON.stringify(out, null, 2));
    return out;
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runSuite()
    .then((out) => {
      const min = Math.min(...Object.values(out.scoring.scores));
      console.error(`\nMaster Runtime: ${out.scoring.passed}/${out.scoring.total} | Overall: ${out.scoring.overall} | Min: ${min}`);
      if (out.scoring.passed < out.scoring.total || min < 95) process.exit(1);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runSuite, postChat, evaluate, scoreResults };
