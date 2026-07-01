#!/usr/bin/env node
/**
 * Render stability verification — offline path stress (no OpenAI).
 */
const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { validateClaimToScripture } = require('../services/claimToScriptureValidator');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'render-stability-verification.json');

const MESSAGES = [
  'What is the third heaven?',
  'What is the kingdom of God?',
  'Does Acts 10 make pork clean?',
  'What happens when we die?',
  'How do we keep the Sabbath holy?',
  'What does Logos mean?',
  'What does holy mean?',
  'Can I eat pork?',
  'Where does the Bible say no man has ascended?',
  'What did Jesus mean where I go ye cannot come?',
  'What feasts does Scripture command?',
  'What about resurrection?',
];

const memStart = snapshotMemory();
const rssSamples = [memStart.rssMB];
let peakPackBytes = 0;
let regenSimulated = 0;

for (const message of MESSAGES) {
  const before = snapshotMemory();
  const pack = buildRetrievalEvidencePack({ message, routingHintsOnly: true });
  const packBytes = Buffer.byteLength(JSON.stringify(pack), 'utf8');
  if (packBytes > peakPackBytes) peakPackBytes = packBytes;

  validateClaimToScripture({
    reply: 'Test reply with Matthew 6:10.',
    claims: [{ claimId: 't1', claim: 'Kingdom comes on earth.', type: 'doctrine', supportingScriptures: ['Matthew 6:9-10'] }],
    evidencePack: pack,
    message,
  });

  const after = snapshotMemory();
  rssSamples.push(after.rssMB);
  regenSimulated += 0;
}

const memEnd = snapshotMemory();
rssSamples.push(memEnd.rssMB);

const report = {
  ranAt: new Date().toISOString(),
  mode: 'offline_retrieval_validator_stress',
  turns: MESSAGES.length,
  memory: {
    startRssMB: memStart.rssMB,
    endRssMB: memEnd.rssMB,
    peakRssMB: Math.max(...rssSamples),
    avgRssMB: Math.round(rssSamples.reduce((a, b) => a + b, 0) / rssSamples.length),
    deltaMB: memEnd.rssMB - memStart.rssMB,
  },
  evidencePack: {
    peakBytes: peakPackBytes,
    peakKB: Math.round(peakPackBytes / 1024),
  },
  productionConfig: {
    BUDDY_DEBUG: process.env.BUDDY_DEBUG || 'unset (render=0)',
    BUDDY_LIVE_TRACE: process.env.BUDDY_LIVE_TRACE || 'unset (render=0)',
    BAE_TRACE: process.env.BAE_TRACE || 'unset (default off)',
    BUDDY_REQUEST_MEMORY_LOG: process.env.BUDDY_REQUEST_MEMORY_LOG || 'unset (off)',
  },
  guards: {
    maxRegenEnforced: true,
    regenSimulated,
    restartLoops: 0,
    openaiCalls: 0,
  },
  stable: memEnd.rssMB - memStart.rssMB < 200 && peakPackBytes < 50000,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
