#!/usr/bin/env node
/**
 * Phase 6 — Local KJV Corpus Completion: import validation script.
 *
 * Verifies the vendored corpus at data/kjv-corpus/raw still matches its
 * recorded provenance (data/kjv-corpus/CORPUS-METADATA.json) and that the
 * production retrieval path (services/canonicalScriptureProvider) now
 * resolves entirely from the local corpus with zero network dependency.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CORPUS_ROOT = path.join(__dirname, '..', '..', 'data', 'kjv-corpus', 'raw');
const METADATA_PATH = path.join(__dirname, '..', '..', 'data', 'kjv-corpus', 'CORPUS-METADATA.json');

let failed = 0;
function check(id, condition, detail) {
  const line = { id, pass: !!condition, detail };
  console.log(condition ? 'PASS' : 'FAIL', JSON.stringify(line));
  if (!condition) failed += 1;
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function computeCorpusChecksum() {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else files.push(full);
    }
  })(CORPUS_ROOT);
  files.sort();
  let combined = '';
  for (const f of files) combined += sha256File(f);
  return { checksum: crypto.createHash('sha256').update(combined).digest('hex'), fileCount: files.length };
}

(async () => {
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  const { checksum, fileCount } = computeCorpusChecksum();

  check('corpus_checksum_unchanged', checksum === metadata.validation.combinedCorpusSha256, { checksum, expected: metadata.validation.combinedCorpusSha256 });
  check('corpus_file_count_matches_66_books', fileCount === 1192, { fileCount, expected: 1192 });

  const { getCorpusCoverageSummary, isCorpusReady, getLocalPassage } = require('../../services/localKjvCorpusProvider');

  check('corpus_ready', isCorpusReady(), {});

  const coverage = getCorpusCoverageSummary();
  check('coverage_66_books', coverage.books.length === 66, { count: coverage.books.length });
  check('coverage_full_text_all_books', coverage.books.every((b) => b.fullTextAvailable), {
    incomplete: coverage.books.filter((b) => !b.fullTextAvailable).map((b) => b.name),
  });
  const totalVerses = coverage.books.reduce((sum, b) => sum + b.totalVerses, 0);
  check('coverage_total_verses_31102', totalVerses === 31102, { totalVerses });
  const totalChapters = coverage.books.reduce((sum, b) => sum + b.totalChapters, 0);
  check('coverage_total_chapters_1189', totalChapters === 1189, { totalChapters });

  const validationVerses = [
    'Genesis 1:1', 'Exodus 3:14', 'Psalm 22:1', 'Isaiah 7:14', 'Daniel 3:4',
    'Matthew 1:23', 'John 1:1', 'John 3:16', 'Romans 8:1', 'Revelation 1:14-15',
  ];
  for (const ref of validationVerses) {
    const res = getLocalPassage(ref);
    check(`local_resolves_${ref.replace(/[^a-z0-9]/gi, '_')}`, res.ok && res.text.length > 0, { ref, ok: res.ok, error: res.error });
  }

  check('rejects_out_of_range_chapter', !getLocalPassage('Genesis 99:1').ok, {});
  check('rejects_unknown_book', !getLocalPassage('Not A Real Book 1:1').ok, {});

  // Confirm the production retrieval path itself is now local-first, with
  // zero network calls required for a known-good reference (validated
  // by running this script under a sandboxed/no-network shell as well).
  const { fetchCanonicalScripture } = require('../../services/canonicalScriptureProvider');
  const prodResult = await fetchCanonicalScripture('John 3:16');
  check('production_path_uses_local_corpus_by_default', prodResult.ok && prodResult.providerName === 'local_kjv_corpus', {
    providerName: prodResult.providerName,
  });

  const { hasLocalCorpus, getPassage } = require('../../services/bibleTextProvider');
  check('bibleTextProvider_reports_local_corpus_active', hasLocalCorpus() === true, {});
  const adapterResult = await getPassage('John 1:1');
  check('bibleTextProvider_tier1_local_corpus', adapterResult.ok && adapterResult.providerMode === 'local_corpus', {
    providerMode: adapterResult.providerMode,
  });

  console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILURE(S)`);
  process.exit(failed === 0 ? 0 : 1);
})();
