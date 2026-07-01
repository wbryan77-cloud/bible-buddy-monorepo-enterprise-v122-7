#!/usr/bin/env node
/**
 * Phase 2D — offline replay of Phase 2C Class C claims against support graph.
 */
const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { validateClaimToScripture } = require('../services/claimToScriptureValidator');

const PHASE2B = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2b-support-relationship-regression.json');
const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2d-class-c-offline-replay.json');

const data = JSON.parse(fs.readFileSync(PHASE2B, 'utf8'));
const rows = [];

for (const topic of data.topics) {
  for (const m of topic.matrix || []) {
    if (m.supportClass !== 'C') continue;
    const pack = buildRetrievalEvidencePack({ message: topic.message });
    const result = validateClaimToScripture({
      reply: m.claim,
      claims: [{ claimId: m.claimId, claim: m.claim, type: 'doctrine', supportingScriptures: m.scriptures }],
      evidencePack: pack,
      message: topic.message,
    });
    const cr = result.claimResults[0] || {};
    rows.push({
      topic: topic.id,
      claimId: m.claimId,
      before: 'C',
      after: cr.classification,
      improved: cr.classification === 'A' || cr.classification === 'B',
      supportGraphMatch: cr.supportGraphMatch?.id || null,
      issues: cr.issues,
    });
  }
}

const summary = {
  total: rows.length,
  eliminated: rows.filter((r) => r.improved).length,
  stillC: rows.filter((r) => r.after === 'C').length,
  nowD: rows.filter((r) => r.after === 'D').length,
  classCounts: rows.reduce((acc, r) => {
    acc[r.after] = (acc[r.after] || 0) + 1;
    return acc;
  }, {}),
};

const report = { ranAt: new Date().toISOString(), summary, rows };
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ summary, sample: rows.slice(0, 5) }, null, 2));
