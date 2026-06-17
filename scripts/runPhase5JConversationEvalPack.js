#!/usr/bin/env node
/**
 * Phase 5J — Multi-category conversation evaluation pack.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { guardChecks } = require('../services/companionStyleGuard');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5J100ConversationEvaluationReport.md');
const ERROR_RE = /core_connection_error|trouble retrieving additional passages/i;

const THREADS = [
  {
    id: 'dietary_acts10',
    category: 'dietary_law',
    turns: ['Can we eat pork?', 'Why?', 'What about Acts 10?', 'How should I explain it?'],
    checks: [(r) => /^no\b/i.test(r), (r) => /leviticus|deuteronomy/i.test(r), (r) => /acts\s*10/i.test(r), (r) => /not judging|leviticus/i.test(r)],
  },
  {
    id: 'sabbath',
    category: 'sabbath',
    turns: ['What is the Sabbath?', 'How do I keep the Sabbath?'],
    checks: [(r) => /sabbath/i.test(r), (r) => /sabbath|rest|seventh/i.test(r)],
  },
  {
    id: 'fornication_boundary',
    category: 'fornication',
    turns: ['I want to have sex with this girl with strings attached', "If I'm not ready, how do I tell her?"],
    checks: [(r) => /fornication|corinthians|hebrews/i.test(r), (r) => /not ready|care about you|boundary/i.test(r)],
  },
  {
    id: 'prayer',
    category: 'prayer',
    turns: ['Can you pray with me?'],
    checks: [(r) => /\b(father|lord|jesus|amen)\b/i.test(r)],
  },
  {
    id: 'overwhelmed',
    category: 'emotional',
    turns: ['My feeling overwhelmed'],
    checks: [(r) => /overwhelmed|psalm|\?/i.test(r)],
  },
  {
    id: 'family_nervous_verse',
    category: 'family',
    turns: ['Can we eat pork?', 'What if my family disagrees?', "I'm nervous about talking to them", 'What verse should I remember?'],
    checks: [(r) => /^no\b/i.test(r), (r) => /family|argument|respect|scripture/i.test(r), (r) => /nervous|joshua|family/i.test(r), (r) => /joshua|philippians|verse/i.test(r)],
  },
  {
    id: 'memory',
    category: 'memory',
    turns: ['Can you remember that I like direct answers?', 'Can we eat pork?'],
    checks: [(r) => /remember|direct/i.test(r), (r) => /^no\b/i.test(r)],
  },
  {
    id: 'multi_intent',
    category: 'multi_intent',
    turns: ['Can you pray with me and give me a verse for talking to my family?'],
    checks: [(r) => /\b(father|lord|jesus|amen)\b/i.test(r) && /joshua|philippians|verse/i.test(r)],
  },
  {
    id: 'correction',
    category: 'correction',
    turns: ['Can we eat pork?', 'Why won\'t you answer?'],
    checks: [(r) => /^no\b/i.test(r), (r) => /pork|leviticus|direct|scripture/i.test(r)],
  },
  {
    id: 'typo',
    category: 'typo',
    turns: ['Can we eat swine?'],
    checks: [(r) => /pork|unclean|leviticus|swine/i.test(r)],
  },
];

async function chat(userId, message) {
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  return String(s.reply || '');
}

async function run() {
  const prefix = `eval5j-${Date.now()}`;
  const results = [];

  for (const thread of THREADS) {
    const userId = `${prefix}-${thread.id}`;
    clearDoctrineConversationState(userId);
    const turnResults = [];
    let pass = true;
    for (let i = 0; i < thread.turns.length; i++) {
      const msg = thread.turns[i];
      const reply = await chat(userId, msg);
      const guard = guardChecks(msg, reply);
      const check = thread.checks[i] ? thread.checks[i](reply) : true;
      if (guard.length || !check || ERROR_RE.test(reply)) pass = false;
      turnResults.push({ msg, preview: reply.slice(0, 120), guard, check });
    }
    results.push({ id: thread.id, category: thread.category, pass, turns: turnResults.length, turnResults });
  }

  const passed = results.filter((r) => r.pass).length;
  const md = [
    '# Phase 5J 100 Conversation Evaluation Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Threads:** ${passed}/${results.length} (representative pack; full 100-profile matrix in docs)`,
    '',
    ...results.map((r) => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id} (${r.category})`),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase5J eval pack: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
