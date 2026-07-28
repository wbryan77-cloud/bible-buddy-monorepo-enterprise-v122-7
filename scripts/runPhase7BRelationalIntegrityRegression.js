#!/usr/bin/env node
/**
 * Phase 7B — Generalized relational integrity regression (beyond Founder-exact 7A prompts).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { extractPrayerSubjectFromMessage } = require('../services/relationshipContextSelector');
const { buildPrayerCompanionResponse } = require('../services/prayerCompanionEngine');
const { detectHumanNeed } = require('../services/humanNeedDetector');
const { detectRevisionRequest } = require('../services/responseRevisionOwner');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'docs/recovery/phase7b/83-PrayerContinuityDeepValidation.md');
const FIXTURES = path.join(ROOT, 'docs/recovery/phase7b/fixtures/prayer-continuity-results.json');
const ADMIN_RE = /learning candidate|pending review|doctrine authority without review/i;

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return { reply: String(s.reply || ''), route: s.runtime?.masterRoute || '' };
}

function push(results, id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
}

async function run() {
  const results = [];
  const prefix = `p7b-${Date.now()}`;

  // Unit extract
  push(results, 'U_mother_possessive', extractPrayerSubjectFromMessage("Please pray for my mother's surgery tomorrow.")?.person === 'mother', 'mother not mother\'s');
  push(results, 'U_stop_the', !extractPrayerSubjectFromMessage('Pray about the thing I mentioned before'), 'no person "the"');
  push(results, 'U_short_need', detectHumanNeed('Just a short prayer for my dad.') === 'prayer', 'short prayer → prayer need');
  push(results, 'U_not_revision', !detectRevisionRequest('Can we pray again?', { lastReply: 'x', lastRoute: 'prayer' }), 'pray again not revision');

  const vague = buildPrayerCompanionResponse({ message: 'Pray about the thing I mentioned before.', userId: '' });
  push(results, 'U_vague_clarifier', /name who|don.?t want to guess|can you name/i.test(vague.reply) && !/pray for the\b/i.test(vague.reply), vague.reply.slice(0, 120));

  const short = buildPrayerCompanionResponse({ message: 'Just a short prayer for my dad.' });
  push(results, 'U_short_prayer', /dad/i.test(short.reply) && short.reply.split(/\s+/).length < 80 && !/walk in truth with love/i.test(short.reply), short.reply.slice(0, 140));

  const noAdv = buildPrayerCompanionResponse({ message: 'Please just pray for my son. No explanation.' });
  push(results, 'U_no_advice', /son/i.test(noAdv.reply) && !/Philippians|James 1:5|walk in truth/i.test(noAdv.reply), noAdv.reply.slice(0, 140));

  // Live continuity
  const u = `${prefix}-cont`;
  clearDoctrineConversationState(u);
  let r = await chat(u, "Please pray for my mother's surgery tomorrow.");
  push(results, 'L_A_mother', /mother/i.test(r.reply) && !/mother's/i.test(r.reply.split('pray for')[1] || '') && !ADMIN_RE.test(r.reply), `${r.route} | ${r.reply.slice(0, 120)}`);

  r = await chat(u, 'Pray again.');
  push(results, 'L_B_again', /mother/i.test(r.reply) && !/going deeper/i.test(r.reply), `${r.route} | ${r.reply.slice(0, 120)}`);

  r = await chat(u, 'What is the capital of France?');
  push(results, 'L_C_gk', /paris/i.test(r.reply), r.reply.slice(0, 80));

  r = await chat(u, 'Can we pray again?');
  push(results, 'L_C_pray_after_gk', /mother/i.test(r.reply) && !/going deeper/i.test(r.reply), `${r.route} | ${r.reply.slice(0, 120)}`);

  r = await chat(u, 'Actually, pray for my mother instead.');
  push(results, 'L_E_change', /mother/i.test(r.reply) && !/Actually, pray for my mother instead/i.test(r.reply), `${r.route} | ${r.reply.slice(0, 140)}`);

  r = await chat(u, "Dad is home now. Let's thank God.");
  push(results, 'L_F_thanks', /thank|grateful|home|dad/i.test(r.reply), `${r.route} | ${r.reply.slice(0, 120)}`);

  r = await chat(u, 'What do you remember about me?');
  push(results, 'L_F_recall_resolved', !/hospital crisis|still (worried|scared) about dad.*hospital/i.test(r.reply) && (/home now|update|mother|surgery|prayer/i.test(r.reply) || /stands out/i.test(r.reply)), r.reply.slice(0, 160));

  r = await chat(u, 'Pray about the thing I mentioned before.');
  push(results, 'L_H_vague', /name who|don.?t want to guess|can you name/i.test(r.reply) || (/mother/i.test(r.reply) && !/\bpray for the\b/i.test(r.reply)), `${r.route} | ${r.reply.slice(0, 140)}`);

  r = await chat(u, 'Just a short prayer for my dad.');
  push(results, 'L_I_short', /dad/i.test(r.reply) && /\b(father|lord|jesus|amen)\b/i.test(r.reply) && r.route !== 'bible_wide_reasoning', `${r.route} | ${r.reply.slice(0, 120)}`);

  r = await chat(u, 'Please just pray for my son. No explanation.');
  push(results, 'L_K_no_advice', /son/i.test(r.reply) && !/Philippians 4:6-7 and James/i.test(r.reply), `${r.route} | ${r.reply.slice(0, 120)}`);

  // Forget lifecycle
  const uf = `${prefix}-forget`;
  clearDoctrineConversationState(uf);
  await chat(uf, 'Please remember that I am worried about my dad.');
  await chat(uf, 'Do not remember what I just said.');
  r = await chat(uf, 'What do you remember about me?');
  push(results, 'L_forget_no_dad', !/worried about my dad/i.test(r.reply) && !ADMIN_RE.test(r.reply), r.reply.slice(0, 160));

  // Systemic controls
  const us = `${prefix}-sys`;
  clearDoctrineConversationState(us);
  r = await chat(us, 'What is photosynthesis?');
  push(results, 'L_photosynthesis', /plant|light|carbon|energy|photosynthesis/i.test(r.reply) && !/which book, topic/i.test(r.reply), r.reply.slice(0, 100));

  r = await chat(us, 'What is the purpose of this app?');
  push(results, 'L_app', /companion|scripture|bible|pray|listen/i.test(r.reply), r.reply.slice(0, 100));

  const passed = results.filter((x) => x.pass).length;
  const md = [
    '# 83 — Prayer Continuity Deep Validation',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${passed}/${results.length}`,
    '',
    ...results.map((x) => `- [${x.pass ? 'PASS' : 'FAIL'}] **${x.id}** — ${x.detail}`),
    '',
  ].join('\n');
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, md);
  fs.mkdirSync(path.dirname(FIXTURES), { recursive: true });
  fs.writeFileSync(FIXTURES, JSON.stringify({ passed, total: results.length, results }, null, 2));
  console.log(`\nPhase 7B prayer/continuity: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
