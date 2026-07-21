#!/usr/bin/env node
/**
 * Offline authority gap audit — retrieval + validator, no OpenAI.
 * Output: docs/regression-trace/bae-gap-audit.json
 */
const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildApprovedEvidenceGraph } = require('../services/approvedEvidenceGraph');
const { validateClaimToScripture } = require('../services/claimToScriptureValidator');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'bae-gap-audit.json');

const TOPICS = [
  { id: 'third_heaven', message: 'What is the third heaven?', drift: 'Believers go to the third heaven when they die.' },
  { id: 'kingdom', message: 'What is the kingdom of God?', drift: 'The kingdom is in heaven where believers go after death.' },
  { id: 'death_state', message: 'What happens when we die?', drift: 'When we die we go to heaven immediately. 2 Corinthians 5:8 proves it.' },
  { id: 'resurrection', message: 'What does Scripture teach about resurrection?', drift: 'Resurrection happens in heaven away from earth.' },
  { id: 'acts_10', message: 'Does Acts 10 make pork clean?', drift: 'Yes, Acts 10 makes all foods clean including pork.' },
  { id: 'clean_unclean', message: 'Is pork unclean according to Scripture?', drift: 'Pork is now clean because Acts 10 abolished dietary law.' },
  { id: 'sabbath', message: 'How do we keep the Sabbath holy?', drift: 'Sunday replaced the Sabbath for Christians.' },
  { id: 'holy_days', message: 'What feasts does Scripture command?', drift: 'Christmas and Easter are biblical feasts.' },
  { id: 'logos', message: 'What does Logos mean in John 1:1?', drift: 'Logos means one and only Son in the NIV sense.' },
  { id: 'holy', message: 'What does holy mean?', drift: 'Holy means morally perfect in the Greek sense.' },
  { id: 'no_ascended', message: 'Where does the Bible say no man has ascended to heaven?', drift: 'Believers have ascended to heaven except Christ.' },
  { id: 'cannot_come', message: 'What did Jesus mean where I go ye cannot come?', drift: 'Believers will join Jesus in heaven permanently away from earth.' },
];

function classifyRootCause(row) {
  if (!row.evidenceAvailable) return 'A';
  if (!row.evidenceRetrieved) return 'H';
  if (row.scriptureChainCount === 0 && row.cardIds.length) return 'G';
  if (!row.driftValidatorCaught) return 'E';
  if (row.citationFalsePass) return 'F';
  return null;
}

const rows = [];
for (const t of TOPICS) {
  const pack = buildRetrievalEvidencePack({ message: t.message, routingHintsOnly: true });
  const graph = buildApprovedEvidenceGraph(pack);
  const cardIds = (pack.evidenceCards?.cards || []).map((c) => c.cardId);
  const driftValidation = validateClaimToScripture({
    reply: `${t.drift} See Matthew 6:10.`,
    claims: [{ claimId: 'd1', claim: t.drift, type: 'doctrine', supportingScriptures: ['Matthew 6:9-10'] }],
    evidencePack: pack,
    message: t.message,
  });

  const row = {
    topic: t.id,
    question: t.message,
    evidenceAvailable: cardIds.length > 0 || graph.refs.length > 0,
    evidenceRetrieved: cardIds.length > 0,
    cardIds,
    catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
    scriptureChainCount: (pack.scripture?.references || []).length,
    bindingRuleCount: graph.bindingRules.length,
    approvedRefCount: graph.refs.length,
    effectiveTopic: pack.effectiveTopic,
    driftValidatorCaught: !driftValidation.passed,
    driftClassification: driftValidation.claimResults[0]?.classification,
    citationFalsePass: /\bmatthew\b/i.test(t.drift) && !driftValidation.passed === false,
    claimsValidatedOffline: true,
    doctrineConfidence: driftValidation.passed ? 'low_risk' : 'validator_blocks_drift',
  };
  row.rootCauseIfLiveDrift = classifyRootCause(row);
  rows.push(row);
}

const report = {
  ranAt: new Date().toISOString(),
  mode: 'offline_retrieval_and_validator',
  topics: rows,
  summary: {
    evidenceGaps: rows.filter((r) => !r.evidenceAvailable).map((r) => r.topic),
    routingFailures: rows.filter((r) => r.rootCauseIfLiveDrift === 'H').map((r) => r.topic),
    graphIncomplete: rows.filter((r) => r.rootCauseIfLiveDrift === 'G').map((r) => r.topic),
    validatorMisses: rows.filter((r) => !r.driftValidatorCaught).map((r) => r.topic),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
