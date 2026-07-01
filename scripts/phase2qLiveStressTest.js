#!/usr/bin/env node
/**
 * Phase 2Q — Full 125-turn live stress (post batch 1/2/3).
 * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2qLiveStressTest.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PHASE2I_OUT = path.join(ROOT, 'docs', 'regression-trace', 'phase2i-conversation-stress-results.json');
const LIVE_OUT = path.join(ROOT, 'docs', 'regression-trace', 'phase2q-live-stress-results.json');
const BASELINE = path.join(ROOT, 'docs', 'regression-trace', 'phase2i-baseline-snapshot.json');

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY required for live 125-turn / 105-scenario suite');
  process.exit(1);
}

console.log('Phase 2Q — Running 105 scenarios / 125 turns live...');
execSync('node scripts/phase2iConversationStressTest.js', {
  cwd: ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    BUDDY_RUNTIME: 'legacy',
    BUDDY_TEMPLATE_PROSE: '0',
    BUDDY_DISABLE_STUDY_FALLBACK: '1',
  },
});

const result = JSON.parse(fs.readFileSync(PHASE2I_OUT, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

const live = {
  ...result,
  phase: '2Q-post-batch3',
  postImplementation: true,
  comparedTo: 'phase2i-baseline',
  baselineAggregate: baseline.aggregate,
  deltas: {
    supportAccuracyPct: (result.aggregate.supportAccuracyPct ?? 0) - (baseline.aggregate?.supportAccuracyPct ?? 0),
    degradationRatePct: (result.aggregate.degradationRatePct ?? 0) - (baseline.aggregate?.degradationRatePct ?? 0),
    classC: (result.aggregate.classCounts?.C ?? 0) - (baseline.aggregate?.classCounts?.C ?? 0),
    graphParticipationPct: (result.aggregate.graphParticipationPct ?? 0) - (baseline.aggregate?.graphParticipationPct ?? 0),
    ownershipViolationTurns: (result.aggregate.ownershipViolationTurns ?? 0) - (baseline.aggregate?.ownershipViolationTurns ?? 0),
  },
};

fs.writeFileSync(LIVE_OUT, `${JSON.stringify(live, null, 2)}\n`);
console.log('Written:', LIVE_OUT);
console.log(JSON.stringify({ aggregate: live.aggregate, deltas: live.deltas }, null, 2));
