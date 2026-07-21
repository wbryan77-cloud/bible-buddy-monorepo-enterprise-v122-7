#!/usr/bin/env node
/**
 * IOG / external teaching candidate pilot — manual ingest only, admin review required.
 * Usage: node scripts/ingestTeachingCandidatePilot.js --file path/to/candidate.json
 * Does NOT scrape video. Paste official/permitted transcripts only.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { crossCheckTeachingCandidate } = require('../services/teachingCandidateCrossCheck');

const STORE = path.join(__dirname, '..', 'data', 'evidence-candidates.jsonl');

function parseArgs() {
  const fileIdx = process.argv.indexOf('--file');
  if (fileIdx === -1 || !process.argv[fileIdx + 1]) {
    console.error('Usage: node scripts/ingestTeachingCandidatePilot.js --file candidate.json');
    process.exit(1);
  }
  return process.argv[fileIdx + 1];
}

function main() {
  const file = parseArgs();
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const candidate = {
    candidateId: raw.candidateId || crypto.randomUUID(),
    sourceName: raw.sourceName || 'unknown',
    sourceUrl: raw.sourceUrl || '',
    title: raw.title || '',
    speaker: raw.speaker || '',
    date: raw.date || null,
    question: raw.question || '',
    scripturesCited: raw.scripturesCited || [],
    scriptureOrder: raw.scriptureOrder || raw.scripturesCited || [],
    doctrineConclusion: raw.doctrineConclusion || '',
    confidenceScore: raw.confidenceScore || 0,
    copyrightStatus: raw.copyrightStatus || 'unknown',
    reviewRequired: true,
    status: 'pending_admin_review',
    submittedAt: new Date().toISOString(),
  };

  if (candidate.copyrightStatus === 'unknown') {
    console.warn('WARN: copyrightStatus unknown — candidate queued but not promotable until admin sets license.');
  }

  const crossCheck = crossCheckTeachingCandidate(candidate);
  const record = { ...candidate, crossCheck, promotable: crossCheck.promotable };

  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  fs.appendFileSync(STORE, `${JSON.stringify(record)}\n`, 'utf8');
  console.log(JSON.stringify({ stored: true, candidateId: record.candidateId, crossCheck }, null, 2));
}

main();
