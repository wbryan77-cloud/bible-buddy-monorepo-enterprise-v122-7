#!/usr/bin/env node
/**
 * Corpus growth reports — Parts 3.1, 3.2, 4.1, 5.1
 * Informational metrics only; never blocks enrichment or discovery.
 */
require('dotenv').config();

const { runCorpusGrowthReports } = require('../services/corpusGrowthReports');

function main() {
  console.log('Corpus growth reports — starting...');
  const result = runCorpusGrowthReports();
  const e = result.executive;
  console.log('Corpus growth reports — complete');
  console.log(`Vine topics: ${e.vineTopics} (${e.vineTopicsWithOpportunities} with growth opportunities)`);
  console.log(`Topic connections: ${e.topicConnectionCount} — Strong: ${e.stronglyConnected} · Growing: ${e.growing} · Expansion: ${e.expansionOpportunity}`);
  console.log(`Pathways: observed ${e.observedPathways} · candidate ${e.candidatePathways} · supported ${e.supportedPathways} · needs evidence ${e.pathwaysNeedingEvidence}`);
  console.log(`Corpus opportunity types: ${e.corpusOpportunityTypes}`);
  console.log('Outputs: docs/evidence-candidates/scripture-vine-growth-report.json');
  console.log('         docs/evidence-candidates/topic-connection-growth-report.json');
  console.log('         docs/evidence-candidates/scripture-pathway-expansion-report.json');
  console.log('         docs/evidence-candidates/corpus-growth-opportunities.json');
}

main();
