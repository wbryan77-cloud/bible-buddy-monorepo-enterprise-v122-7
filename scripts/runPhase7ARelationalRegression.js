#!/usr/bin/env node
/**
 * Phase 7A — Relational behavior-family regression (generalized, not Founder-exact only).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { detectRevisionRequest } = require('../services/responseRevisionOwner');
const {
  extractPrayerSubjectFromMessage,
  isPersonalRememberRequest,
  companionRememberAck,
} = require('../services/relationshipContextSelector');
const { buildPrayerCompanionResponse } = require('../services/prayerCompanionEngine');
const { polishCompanionReply } = require('../services/companionReplyPolish');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'docs/recovery/phase7a/71-RelationalRegressionCorpus.md');
const FIXTURES = path.join(ROOT, 'docs/recovery/phase7a/fixtures/behavior-family-results.json');

const ADMIN_RE = /learning candidate|pending review|doctrine authority without review|governance queue/i;

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return {
    reply: String(s.reply || ''),
    route: s.runtime?.masterRoute || s.runtime?.orchestratorLane || '',
    runtime: s.runtime || {},
  };
}

function push(results, id, pass, detail, extra = {}) {
  results.push({ id, pass, detail, ...extra });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
}

async function run() {
  const prefix = `p7a-${Date.now()}`;
  const results = [];

  // --- Unit / selector families ---
  push(
    results,
    'U1_extract_dad',
    extractPrayerSubjectFromMessage('Pray for my dad')?.person === 'dad',
    'dad extracted',
  );
  push(
    results,
    'U2_extract_maya',
    /maya/i.test(extractPrayerSubjectFromMessage('Please pray for Maya')?.person || ''),
    'Maya extracted',
  );
  const pDad = buildPrayerCompanionResponse({ message: 'Pray with me for my dad' });
  push(
    results,
    'U3_prayer_dad',
    pDad.personalized && /dad/i.test(pDad.reply) && !/steady my heart\. Give me wisdom/i.test(pDad.reply),
    pDad.reply.slice(0, 140),
  );
  const pMaya = buildPrayerCompanionResponse({ message: 'Please pray for Maya' });
  push(results, 'U4_prayer_maya', pMaya.personalized && /Maya/i.test(pMaya.reply), pMaya.reply.slice(0, 140));
  push(
    results,
    'U5_pray_again_not_revision',
    !detectRevisionRequest('Pray with me again', { lastReply: 'prior', lastRoute: 'phase5k_prayer_companion' }),
    'revision blocked for prayer again',
  );
  push(
    results,
    'U6_remember_natural',
    isPersonalRememberRequest('Please remember that I am worried about my dad') &&
      !ADMIN_RE.test(companionRememberAck('Please remember that I am worried about my dad')),
    companionRememberAck('Please remember…'),
  );
  const polished = polishCompanionReply(
    'Yes. I can save that as a learning candidate for review so Buddy can answer that wording better later. I will not automatically change doctrine authority without review.',
  );
  push(results, 'U7_polish_admin', !ADMIN_RE.test(polished) && /remember|mind|trust/i.test(polished), polished);

  // --- Live buddy families ---
  const uPray = `${prefix}-pray`;
  clearDoctrineConversationState(uPray);
  let r = await chat(uPray, 'Pray with me for my dad.');
  push(
    results,
    'L1_pray_dad',
    /\b(father|lord|jesus|amen)\b/i.test(r.reply) && /dad|father/i.test(r.reply) && !ADMIN_RE.test(r.reply),
    `${r.route} | ${r.reply.slice(0, 160)}`,
    { route: r.route },
  );

  r = await chat(uPray, 'Pray with me again.');
  push(
    results,
    'L2_pray_again',
    /\b(father|lord|jesus|amen)\b/i.test(r.reply) &&
      !/going deeper|what part should i open|revision/i.test(r.reply),
    `${r.route} | ${r.reply.slice(0, 160)}`,
    { route: r.route },
  );

  const uMem = `${prefix}-mem`;
  clearDoctrineConversationState(uMem);
  r = await chat(uMem, 'Please remember that I am worried about my dad.');
  push(
    results,
    'L3_remember',
    !ADMIN_RE.test(r.reply) && /remember|mind|trust/i.test(r.reply),
    `${r.route} | ${r.reply.slice(0, 160)}`,
    { route: r.route },
  );

  r = await chat(uMem, 'What do you remember about me?');
  push(
    results,
    'L4_recall_person',
    (/dad|worried|prayer|father/i.test(r.reply) || /stands out|conversation/i.test(r.reply)) &&
      !ADMIN_RE.test(r.reply) &&
      !(/^here's what i remember for you: you prefer/i.test(r.reply) && !/dad|worried|prayer/i.test(r.reply)),
    `${r.route} | ${r.reply.slice(0, 200)}`,
    { route: r.route },
  );

  const uEmo = `${prefix}-emo`;
  clearDoctrineConversationState(uEmo);
  r = await chat(uEmo, 'John 3:16 made me cry.');
  push(
    results,
    'L5_celebration',
    /thank you|glad|sharing|with you|listening|stay with/i.test(r.reply) &&
      !/^scripture speaks directly/i.test(r.reply.trim()),
    `${r.route} | ${r.reply.slice(0, 160)}`,
    { route: r.route },
  );

  r = await chat(uEmo, "I'm scared.");
  push(
    results,
    'L6_presence_scared',
    /with you|fear|breath|pray|here/i.test(r.reply),
    `${r.route} | ${r.reply.slice(0, 160)}`,
    { route: r.route },
  );

  // Safety / controls — relationship must not break GK or invent intimacy
  const uGk = `${prefix}-gk`;
  clearDoctrineConversationState(uGk);
  r = await chat(uGk, 'What is the capital of France?');
  push(
    results,
    'L7_gk_intact',
    /paris/i.test(r.reply) && !/which book, topic, or passage/i.test(r.reply),
    `${r.route} | ${r.reply.slice(0, 120)}`,
    { route: r.route },
  );

  r = await chat(`${prefix}-forget`, 'Do not remember what I just said.');
  push(
    results,
    'L8_forget_natural',
    !ADMIN_RE.test(r.reply) && /won'?t|forget|hold onto|alright/i.test(r.reply),
    `${r.route} | ${r.reply.slice(0, 120)}`,
    { route: r.route },
  );

  const passed = results.filter((x) => x.pass).length;
  const md = [
    '# 71 — Relational Regression Corpus',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    '',
    'Behavior-family coverage (generalized prompts):',
    '',
    ...results.map((x) => `- [${x.pass ? 'PASS' : 'FAIL'}] **${x.id}** — ${x.detail}`),
    '',
    passed === results.length
      ? '## Verdict\nLocal Phase 7A relational corpus **PASS**.'
      : '## Verdict\nLocal Phase 7A relational corpus **FAIL** — repair before production certify.',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, md, 'utf8');
  fs.mkdirSync(path.dirname(FIXTURES), { recursive: true });
  fs.writeFileSync(FIXTURES, JSON.stringify({ passed, total: results.length, results }, null, 2));
  console.log(`\nPhase 7A relational: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
