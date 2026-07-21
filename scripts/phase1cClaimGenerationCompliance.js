#!/usr/bin/env node
/**
 * Phase 1C — raw model claim generation compliance test (diagnosis only).
 * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase1cClaimGenerationCompliance.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildComposerSystemPrompt } = require('../services/reasonFirstComposer');
const {
  classifySafety,
  getUserCompanionProfile,
  getRecentSessions,
  enrichRuntimeContextWithMemory,
  safeJsonParse,
} = require('../services/buddyBrain');
const { buildRuntimeContext } = require('../services/runtimeOrchestrator');
const { normalizeClaims, extractDoctrineConclusion } = require('../services/claimNormalizer');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase1c-claim-generation-compliance.json');

const TOPICS = [
  { id: 'logos', message: 'What does Logos mean in John 1:1?' },
  { id: 'third_heaven', message: 'What is the third heaven?' },
  { id: 'acts_10', message: 'Does Acts 10 make pork clean?' },
  { id: 'pork', message: 'Can I eat pork?' },
  { id: 'sabbath', message: 'How do we keep the Sabbath holy?' },
  { id: 'death_state', message: 'What happens when we die?' },
];

function fieldState(val) {
  if (val === undefined || val === null) return 'missing';
  if (Array.isArray(val) && val.length === 0) return 'empty';
  if (typeof val === 'string' && !val.trim()) return 'empty';
  return 'populated';
}

async function rawComposeCapture({ userId, message }) {
  const safety = classifySafety(message);
  const profile = getUserCompanionProfile(userId);
  const recentSessions = getRecentSessions(userId, 8);
  let runtimeContext = buildRuntimeContext({ message, mode: 'COMPANION', profile, recentSessions, safety });
  runtimeContext = enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });

  const evidencePack = buildRetrievalEvidencePack({
    userId,
    message,
    mode: 'COMPANION',
    recentSessions,
    runtimeContext,
    profile,
    safety,
    routingHintsOnly: true,
  });

  const historyBlock = (evidencePack.conversationHistory || [])
    .map((t) => `Turn ${t.turn} user: ${t.user}\nTurn ${t.turn} assistant: ${t.assistant}`)
    .join('\n\n');

  const userPayload = {
    userMessage: message,
    conversationHistory: historyBlock || 'none',
    evidence: {
      memory: evidencePack.memory,
      scripture: evidencePack.scripture,
      history: evidencePack.history,
      doctrine: evidencePack.doctrine,
      evidenceCards: evidencePack.evidenceCards,
      answerGuidance: evidencePack.answerGuidance,
    },
    currentIntent: evidencePack.currentIntent || null,
  };

  const systemPrompt = buildComposerSystemPrompt({
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    profile,
    runtimeContext,
    evidencePack,
    userMessage: message,
    coreRestoration: true,
  });

  const openai = require('../services/openaiClient');
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const t0 = Date.now();

  if (!openai) {
    return { success: false, error: 'openai_unavailable', evidencePack };
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.72,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
    });
    const raw = completion?.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(raw) || {};
    const rawClaims = parsed.claims;
    const normalized = normalizeClaims(parsed.claims, { reply: parsed.reply || '' });
    const doctrineFromParsed = parsed.doctrineConclusion;
    const doctrineExtracted = extractDoctrineConclusion(parsed, normalized);

    return {
      success: !!raw,
      latencyMs: Date.now() - t0,
      usage: completion.usage || null,
      responseBytes: Buffer.byteLength(raw, 'utf8'),
      evidencePack: {
        topic: evidencePack.topic,
        cardIds: (evidencePack.evidenceCards?.cards || []).map((c) => c.cardId),
      },
      raw: {
        reply: fieldState(parsed.reply),
        replyLen: String(parsed.reply || '').length,
        claims: fieldState(rawClaims),
        claimsCount: Array.isArray(rawClaims) ? rawClaims.length : 0,
        claimsIsArray: Array.isArray(rawClaims),
        doctrineConclusion: fieldState(doctrineFromParsed),
        doctrineConclusionLen: String(doctrineFromParsed || '').length,
        hasScripture: Array.isArray(parsed.scripture) && parsed.scripture.length > 0,
        scriptureCount: Array.isArray(parsed.scripture) ? parsed.scripture.length : 0,
        topLevelKeys: Object.keys(parsed),
        claimsSample: Array.isArray(rawClaims) ? rawClaims.slice(0, 3) : rawClaims,
        doctrineConclusionText: String(doctrineFromParsed || '').slice(0, 200),
        replyPreview: String(parsed.reply || '').slice(0, 200),
      },
      postNormalize: {
        claimsCount: normalized.length,
        inferred: normalized.some((c) => c.claimId === 'c_inferred'),
        doctrineConclusion: doctrineExtracted ? 'populated' : 'empty',
        doctrineConclusionLen: doctrineExtracted.length,
      },
      parseLoss: {
        claimsLostInParse: !Array.isArray(rawClaims) && normalized.length > 0,
        doctrineLostInExtract: fieldState(doctrineFromParsed) === 'populated' && !doctrineExtracted,
      },
    };
  } catch (e) {
    return {
      success: false,
      latencyMs: Date.now() - t0,
      error: String(e.message || e).slice(0, 400),
      status: e.status,
      evidencePack: { topic: evidencePack.topic },
    };
  }
}

async function main() {
  const results = {
    ranAt: new Date().toISOString(),
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    keyPresent: !!process.env.OPENAI_API_KEY,
    keyLooksSk: String(process.env.OPENAI_API_KEY || '').startsWith('sk-'),
    topics: [],
    aggregate: {},
  };

  for (const t of TOPICS) {
    const uid = `phase1c-${t.id}`;
    const r = await rawComposeCapture({ userId: uid, message: t.message });
    results.topics.push({ id: t.id, message: t.message, ...r });
  }

  const ok = results.topics.filter((t) => t.success);
  results.aggregate = {
    total: TOPICS.length,
    composeSuccess: ok.length,
    replyPopulated: ok.filter((t) => t.raw?.reply === 'populated').length,
    rawClaimsPopulated: ok.filter((t) => t.raw?.claims === 'populated').length,
    rawClaimsEmpty: ok.filter((t) => t.raw?.claims === 'empty').length,
    rawClaimsMissing: ok.filter((t) => t.raw?.claims === 'missing').length,
    doctrinePopulated: ok.filter((t) => t.raw?.doctrineConclusion === 'populated').length,
    doctrineEmpty: ok.filter((t) => t.raw?.doctrineConclusion === 'empty').length,
    inferredAfterNormalize: ok.filter((t) => t.postNormalize?.inferred).length,
    scriptureArrayUsed: ok.filter((t) => t.raw?.hasScripture).length,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: true, out: OUT, aggregate: results.aggregate }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
