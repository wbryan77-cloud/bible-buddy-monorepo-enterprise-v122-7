#!/usr/bin/env node
/**
 * Export beta conversations and feedback to CSV + JSON.
 *
 * Usage:
 *   node scripts/exportBetaData.js
 *   node scripts/exportBetaData.js --cohort internal
 *   node scripts/exportBetaData.js --out docs/beta/exports
 */

const fs = require('fs');
const path = require('path');
const { readRegistry } = require('../services/betaRegistry');
const { readJsonl, SESSIONS_FILE, FEEDBACK_FILE } = require('../services/betaSessionReader');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'docs', 'beta', 'exports');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { cohort: null, out: DEFAULT_OUT, since: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cohort' && args[i + 1]) opts.cohort = args[++i];
    else if (args[i] === '--out' && args[i + 1]) opts.out = path.resolve(args[++i]);
    else if (args[i] === '--since' && args[i + 1]) opts.since = args[++i];
  }
  return opts;
}

function csvEscape(value) {
  const s = String(value ?? '').replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => csvEscape(row[col])).join(','));
  return [header, ...lines].join('\n') + '\n';
}

function normalizeTurn(raw) {
  return {
    testerId: raw.testerId || raw.userId || '',
    sessionId: raw.sessionId || '',
    cohort: raw.cohort || '',
    createdAt: raw.createdAt || '',
    mode: raw.mode || '',
    message: raw.message || '',
    reply: raw.reply || '',
    qualityScore: raw.quality?.score ?? '',
  };
}

function main() {
  const opts = parseArgs();
  fs.mkdirSync(opts.out, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sinceMs = opts.since ? Date.parse(opts.since) : null;

  const registry = readRegistry();
  const activeIds = new Set(
    (registry.testers || [])
      .filter((t) => t.active !== false)
      .filter((t) => !opts.cohort || t.cohort === opts.cohort)
      .map((t) => t.testerId)
  );

  const allTurns = readJsonl(SESSIONS_FILE).map(normalizeTurn).filter((t) => {
    if (!t.testerId || !activeIds.has(t.testerId)) {
      if (opts.cohort) return false;
    }
    if (opts.cohort && t.cohort !== opts.cohort) {
      const tester = (registry.testers || []).find((x) => x.testerId === t.testerId);
      if (tester && tester.cohort !== opts.cohort) return false;
    }
    if (sinceMs && t.createdAt && Date.parse(t.createdAt) < sinceMs) return false;
    return t.testerId && String(t.testerId).startsWith('beta-');
  });

  const allFeedback = readJsonl(FEEDBACK_FILE).filter((fb) => {
    const tid = fb.testerId || fb.userId;
    if (!tid || !String(tid).startsWith('beta-')) return false;
    if (opts.cohort) {
      const tester = (registry.testers || []).find((x) => x.testerId === tid);
      if (tester && tester.cohort !== opts.cohort) return false;
      if (fb.cohort && fb.cohort !== opts.cohort) return false;
    }
    if (sinceMs && fb.createdAt && Date.parse(fb.createdAt) < sinceMs) return false;
    return true;
  });

  const turnCols = [
    'testerId',
    'sessionId',
    'cohort',
    'createdAt',
    'mode',
    'message',
    'reply',
    'qualityScore',
  ];
  const feedbackCols = [
    'testerId',
    'sessionId',
    'cohort',
    'createdAt',
    'feltHeard',
    'usefulness',
    'biblicalFaithfulness',
    'naturalness',
    'wouldUseAgain',
    'comment',
    'consentForAggregateReview',
  ];

  const feedbackRows = allFeedback.map((fb) => ({
    testerId: fb.testerId || fb.userId,
    sessionId: fb.sessionId || '',
    cohort: fb.cohort || '',
    createdAt: fb.createdAt || '',
    feltHeard: fb.feltHeard ?? '',
    usefulness: fb.usefulness ?? '',
    biblicalFaithfulness: fb.biblicalFaithfulness ?? '',
    naturalness: fb.naturalness ?? '',
    wouldUseAgain: fb.wouldUseAgain ?? '',
    comment: fb.comment || fb.suggestion || '',
    consentForAggregateReview: fb.consentForAggregateReview ?? '',
  }));

  const prefix = opts.cohort ? `beta-${opts.cohort}-${stamp}` : `beta-all-${stamp}`;
  const jsonPath = path.join(opts.out, `${prefix}.json`);
  const sessionsCsvPath = path.join(opts.out, `${prefix}-conversations.csv`);
  const feedbackCsvPath = path.join(opts.out, `${prefix}-feedback.csv`);

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        cohort: opts.cohort,
        registry: registry.testers?.filter((t) => !opts.cohort || t.cohort === opts.cohort),
        conversations: allTurns,
        feedback: feedbackRows,
      },
      null,
      2
    )
  );
  fs.writeFileSync(sessionsCsvPath, toCsv(allTurns, turnCols));
  fs.writeFileSync(feedbackCsvPath, toCsv(feedbackRows, feedbackCols));

  console.log('Export complete:');
  console.log('  JSON:', jsonPath);
  console.log('  Conversations CSV:', sessionsCsvPath, `(${allTurns.length} turns)`);
  console.log('  Feedback CSV:', feedbackCsvPath, `(${feedbackRows.length} rows)`);
}

main();
