#!/usr/bin/env node
/**
 * Phase 2D — reference normalization audit (offline).
 */
const fs = require('fs');
const path = require('path');
const { refMatchesApproved } = require('../services/scriptureReferenceNormalizer');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { validateClaimToScripture } = require('../services/claimToScriptureValidator');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2d-reference-normalization-audit.json');

const REF_PAIRS = [
  { cited: 'Matthew 6:10', approved: 'Matthew 6:9-10', expect: true },
  { cited: 'Acts 10:28', approved: 'Acts 10', expect: true },
  { cited: 'Acts 10:28', approved: 'Acts 10:28', expect: true },
  { cited: 'John 14:3', approved: 'John 14:3', expect: true },
  { cited: 'John 14:3', approved: 'John 14', expect: true },
  { cited: 'Revelation 21:1-3', approved: 'Revelation 21', expect: true },
  { cited: 'Genesis 1:6-8', approved: 'Genesis 1', expect: true },
  { cited: 'Matthew 6:10', approved: 'John 3:13', expect: false },
];

const CLASS_C_REF_CLAIMS = [
  {
    id: 'third_heaven_matt610',
    message: 'What is the third heaven?',
    claim: 'Emphasizes kingdom coming on earth, grounding hope there.',
    refs: ['Matthew 6:10'],
    card: 'heavens',
  },
  {
    id: 'kingdom_matt610_sent',
    message: 'What is the kingdom of God?',
    claim: "Jesus taught us to pray, Thy kingdom come, Thy will be done in earth (Matthew 6:10), showing the kingdom is realized on earth.",
    refs: ['Matthew 6:10'],
    card: 'kingdom',
  },
];

function classifyClaim(message, claim, refs) {
  const pack = buildRetrievalEvidencePack({ message });
  return validateClaimToScripture({
    reply: claim,
    claims: [{ claimId: 'c1', claim, type: 'doctrine', supportingScriptures: refs }],
    evidencePack: pack,
    message,
  });
}

const refResults = REF_PAIRS.map((p) => ({
  ...p,
  pass: refMatchesApproved(p.cited, p.approved) === p.expect,
}));

const claimResults = CLASS_C_REF_CLAIMS.map((c) => {
  const result = classifyClaim(c.message, c.claim, c.refs);
  const cr = result.claimResults[0] || {};
  return {
    id: c.id,
    classification: cr.classification,
    issues: cr.issues,
    supportGraphMatch: cr.supportGraphMatch?.id || null,
  };
});

const report = {
  ranAt: new Date().toISOString(),
  refPairs: refResults,
  refPairsPass: refResults.filter((r) => r.pass).length,
  refPairsTotal: refResults.length,
  classCRefClaims: claimResults,
  claimsImprovedByNormalization: claimResults.filter((r) => r.classification === 'A' || r.classification === 'B').length,
  doctrineChange: false,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
