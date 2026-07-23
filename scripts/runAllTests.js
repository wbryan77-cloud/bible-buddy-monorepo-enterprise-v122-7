#!/usr/bin/env node
/**
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Developer Experience (objective 5).
 *
 * A unified `npm test` runner for tests/*.test.js. Before this script,
 * every file under tests/ (13 of them, predating this batch) had to be
 * run individually by hand — there was no single command that ran all of
 * them and reported a consolidated result. This does exactly that and
 * nothing more: it does not replace or reinterpret any existing test file,
 * it just runs each one as its own subprocess (matching how they were
 * always run) and aggregates exit codes.
 *
 * Each test file gets its own child process (not required in-process) so
 * one file's module-level side effects (several of these tests exercise
 * real runtime code paths) can never bleed into another file's run.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(__dirname, '..', 'tests');
const PER_TEST_TIMEOUT_MS = Number(process.env.BIBLEBUDDY_TEST_TIMEOUT_MS || 120000);

function findTestFiles() {
  if (!fs.existsSync(TESTS_DIR)) return [];
  return fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith('.test.js'))
    .sort();
}

function runOne(fileName) {
  const filePath = path.join(TESTS_DIR, fileName);
  const start = Date.now();
  const result = spawnSync(process.execPath, ['-r', 'dotenv/config', filePath], {
    cwd: path.join(__dirname, '..'),
    timeout: PER_TEST_TIMEOUT_MS,
    encoding: 'utf8',
  });
  const elapsedMs = Date.now() - start;
  const timedOut = result.error && result.error.code === 'ETIMEDOUT';
  return {
    fileName,
    elapsedMs,
    passed: !timedOut && result.status === 0,
    timedOut: !!timedOut,
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function main() {
  const files = findTestFiles();
  if (!files.length) {
    console.log('No tests/*.test.js files found.');
    process.exit(0);
  }

  console.log(`Running ${files.length} test file(s) from tests/...\n`);
  const results = files.map((f) => {
    process.stdout.write(`  ${f} ... `);
    const r = runOne(f);
    console.log(r.timedOut ? `TIMEOUT (${PER_TEST_TIMEOUT_MS}ms)` : r.passed ? `PASS (${r.elapsedMs}ms)` : `FAIL (exit ${r.exitCode})`);
    return r;
  });

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} test files passed.`);

  if (failed.length) {
    console.log('\n--- Failure details ---');
    for (const r of failed) {
      console.log(`\n=== ${r.fileName} ===`);
      if (r.stdout.trim()) console.log(r.stdout.trim());
      if (r.stderr.trim()) console.log(r.stderr.trim());
    }
    process.exit(1);
  }
  process.exit(0);
}

main();
