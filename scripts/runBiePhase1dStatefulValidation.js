#!/usr/bin/env node
/**
 * BIE Phase 1D — local stateful + paraphrase validation for deterministic VLP composition.
 * Run: node -r dotenv/config scripts/runBiePhase1dStatefulValidation.js
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(
  __dirname,
  '../docs/evidence-candidates/bible-intelligence-engine-phase1d-implementation'
);

const SEQUENCES = {
  A_resurrection: [
    'How many resurrections are described in the Bible?',
    'What happens to those in the first resurrection?',
    'What happens to the rest of the dead after the thousand years?',
    'I asked what they do, not merely when they rise.',
    'What was my last question?',
    'Explain it briefly.',
    'Now give me the supporting Scriptures.',
  ],
  B_satan: [
    'Who releases Satan after the thousand years?',
    'Does the verse explicitly name the person who releases him?',
    'Answer yes or no first.',
    'Now explain the distinction between what is stated and what is inferred.',
  ],
  C_feasts: [
    'Which feasts are called statutes forever?',
    'Does Zechariah 14 show Tabernacles being observed in the future?',
    'Answer the question directly.',
    'Give me the short version.',
    'Go deeper.',
    'Why do many Christians observe different holidays today?',
  ],
  D_appearance: [
    'What does Revelation 1:14–15 explicitly describe?',
    'Give me the Scripture only.',
    'Does the passage identify a modern racial category?',
    'Separate the explicit text from later comparison or inference.',
  ],
  E_deut28_history: [
    'What does Deuteronomy 28:68 explicitly say?',
    'Does the verse itself identify a modern ethnic population?',
    'Which historical population was transported in the transatlantic slave trade?',
    'Answer my historical question only.',
    'Were Holocaust victims transported through the Atlantic hereditary chattel slave system in ships?',
    'What evidence is required to establish descent from ancient Israelites?',
  ],
  F_general: [
    'What does this app do?',
    'Who was Abraham Lincoln?',
    'I am having a difficult day.',
    'Can you pray for me?',
    'What did I tell you I was struggling with?',
  ],
};

const PARAPHRASE_PROBES = [
  {
    id: 'sabbath_explain',
    variants: [
      'Explain the Sabbath.',
      'What does Scripture teach about the Sabbath?',
      'Tell me about the seventh-day Sabbath.',
      'Can you explain Sabbath briefly?',
      'Scripture only — what about the Sabbath?',
      'go deeper on the Sabbath please',
      'I asked about the Sabbath, not Sunday.',
      'explain sabbath real quick',
    ],
  },
  {
    id: 'resurrection_count',
    variants: [
      'How many resurrections are described in the Bible?',
      'How many resurrections does the Bible describe?',
      'Bible: number of resurrections?',
      'Answer only — how many resurrections?',
      'I asked how many resurrections, not Jesus rising alone.',
      'how many resurrections r in the bible',
    ],
  },
];

function clip(s, n = 1200) {
  const t = String(s || '');
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function scoreTurn(message, reply, runtime = {}) {
  const r = String(reply || '');
  const m = String(message || '');
  const fixedStamp = /^From the approved Scripture witnesses/i.test(r);
  const direct = /^(Yes|No|Direct answer)/i.test(r.trim()) || /\bDirect answer\b/i.test(r);
  const briefAsked = /\b(brief|briefly|short)\b/i.test(m);
  const historyAsked = /\bhistor(y|ical)|transatlantic|holocaust|Abraham Lincoln|holidays today\b/i.test(m);
  const prayerAsked = /\bpray\b/i.test(m);
  return {
    fixedStamp,
    hasDirectSignal: direct,
    briefAsked,
    briefLikelyHonored: !briefAsked || r.length < 900,
    historyAsked,
    historyRouteSignal:
      !!runtime.historyAllowed ||
      /history|historical|does not establish doctrine/i.test(r) ||
      runtime.masterRoute === 'reason_first_openai',
    prayerAsked,
    prayerSignal: prayerAsked && /\b(pray|Father|Amen)\b/i.test(r),
    doctrineComposedFromPacket: !!runtime.doctrineComposedFromPacket,
    masterRoute: runtime.masterRoute || null,
    openAiCalled: !!runtime.openAiCalled,
    replyLen: r.length,
  };
}

async function runSequence(name, messages) {
  const { runBuddy } = require('../services/buddyBrain');
  const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
  const { clearActiveConversation } = require('../services/activeConversationManager');
  const userId = `phase1d-seq-${name}-${Date.now()}`;
  clearDoctrineConversationState(userId);
  try {
    clearActiveConversation(userId);
  } catch (_) {
    /* optional */
  }

  const turns = [];
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const started = Date.now();
    let structured;
    let error = null;
    try {
      structured = await runBuddy({
        userId,
        message,
        mode: 'COMPANION',
        personaKey: 'ADAPTIVE_COMPANION',
      });
    } catch (e) {
      error = String(e?.message || e);
      structured = { reply: '', runtime: {} };
    }
    const reply = String(structured.reply || '');
    const runtime = structured.runtime || {};
    turns.push({
      i: i + 1,
      message,
      latencyMs: Date.now() - started,
      reply: clip(reply),
      replyLen: reply.length,
      error,
      runtime: {
        masterRoute: runtime.masterRoute || null,
        openAiCalled: !!runtime.openAiCalled,
        doctrineTopic: runtime.doctrineTopic || null,
        doctrineComposedFromPacket: !!runtime.doctrineComposedFromPacket,
        historyAllowed: !!runtime.historyAllowed,
        finalAnswerAuthor: runtime.finalAnswerAuthor || null,
      },
      scores: scoreTurn(message, reply, runtime),
      finalConclusion: structured.finalConclusion || null,
      doctrineComposedFromPacket: !!structured.doctrineComposedFromPacket,
    });
  }
  return { name, userId, turns };
}

async function runParaphrases() {
  const { runBuddy } = require('../services/buddyBrain');
  const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
  const out = [];
  for (const probe of PARAPHRASE_PROBES) {
    const variants = [];
    for (const text of probe.variants) {
      const userId = `phase1d-para-${probe.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      clearDoctrineConversationState(userId);
      const started = Date.now();
      let structured;
      try {
        structured = await runBuddy({
          userId,
          message: text,
          mode: 'COMPANION',
          personaKey: 'ADAPTIVE_COMPANION',
        });
      } catch (e) {
        structured = { reply: String(e?.message || e), runtime: {} };
      }
      const reply = String(structured.reply || '');
      variants.push({
        text,
        latencyMs: Date.now() - started,
        reply: clip(reply, 800),
        fixedStamp: /^From the approved Scripture witnesses/i.test(reply),
        composedFromPacket: !!structured.doctrineComposedFromPacket || !!structured.runtime?.doctrineComposedFromPacket,
        masterRoute: structured.runtime?.masterRoute || null,
        conclusionStable: !!(structured.finalConclusion || /Sabbath|resurrection/i.test(reply)),
      });
    }
    const stampCount = variants.filter((v) => v.fixedStamp).length;
    out.push({
      id: probe.id,
      variants,
      generalizationPass: stampCount === 0 || variants.some((v) => v.composedFromPacket),
      fixedStampCount: stampCount,
    });
  }
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const started = Date.now();
  const sequences = {};
  for (const [name, messages] of Object.entries(SEQUENCES)) {
    console.error(`Running sequence ${name}...`);
    sequences[name] = await runSequence(name, messages);
  }
  console.error('Running paraphrases...');
  const paraphrases = await runParaphrases();

  const doctrineTurns = Object.values(sequences)
    .flatMap((s) => s.turns)
    .filter((t) => /doctrine_final|strict_doctrine|bible_wide/i.test(String(t.runtime.masterRoute || '')));
  const fixedAmongDoctrine = doctrineTurns.filter((t) => t.scores.fixedStamp).length;

  const summary = {
    startedAt: new Date(started).toISOString(),
    elapsedMs: Date.now() - started,
    sequenceCount: Object.keys(sequences).length,
    paraphraseFamilies: paraphrases.length,
    doctrineRouteTurns: doctrineTurns.length,
    fixedStampOnDoctrineTurns: fixedAmongDoctrine,
    packetCompositionSignals: doctrineTurns.filter((t) => t.doctrineComposedFromPacket || t.runtime.doctrineComposedFromPacket)
      .length,
    gates: {
      noFixedStampOnPacketDoctrine: fixedAmongDoctrine === 0,
      paraphraseGeneralizes: paraphrases.every((p) => p.generalizationPass),
    },
  };

  const statefulPath = path.join(OUT_DIR, 'stateful-conversation-results.json');
  const paraPath = path.join(OUT_DIR, 'paraphrase-results.json');
  fs.writeFileSync(statefulPath, JSON.stringify({ summary, sequences }, null, 2));
  fs.writeFileSync(paraPath, JSON.stringify({ summary: summary.gates, paraphrases }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.error(`Wrote ${statefulPath}`);
  console.error(`Wrote ${paraPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
