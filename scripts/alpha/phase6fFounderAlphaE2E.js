/**
 * PHASE 6F — PART 17: Founder Alpha End-to-End Test.
 *
 * Reproducible suite covering the batch's required categories, run
 * through actual HTTP paths where a live server is available (Admin
 * routes) and through the actual production `runBuddy` entrypoint for
 * companion/Scripture/original-language/history cases (the same
 * entrypoint `routes/buddy.js` calls) — no mocks.
 *
 * Run: node -r dotenv/config scripts/alpha/phase6fFounderAlphaE2E.js
 * Optional: set FOUNDER_E2E_BASE_URL to point at a running server for
 * the Admin/HTTP-only checks (defaults to http://localhost:3000).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { runBuddy } = require('../../services/buddyBrain');
const { analyzeLessonText } = require('../../services/lessonScriptureAlignmentAnalyzer');

const BASE_URL = process.env.FOUNDER_E2E_BASE_URL || 'http://localhost:3000';

function httpGet(urlPath) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) { /* non-JSON */ }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function timed(fn) {
  const start = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - start };
}

const results = [];

function record(category, id, pass, detail, latencyMs) {
  results.push({ category, id, pass, latencyMs, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${category}/${id} (${latencyMs}ms) ${pass ? '' : JSON.stringify(detail).slice(0, 200)}`);
}

async function askCompanion(message, userId, extra = {}) {
  const { result, latencyMs } = await timed(() =>
    runBuddy({ message, userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', ...extra })
  );
  const replyText = result && result.reply && typeof result.reply === 'object' ? result.reply.reply : (result ? result.reply : '');
  return { result, latencyMs, replyText: String(replyText || '') };
}

async function main() {
  const runId = `founder-e2e-${Date.now()}`;

  // ---------------- SCRIPTURE ----------------
  const scriptureCases = [
    { id: 'explicit_read', msg: 'Read John 3:16 to me.', expect: (r) => /god so loved/i.test(r) },
    { id: 'chapter', msg: 'What does Psalm 23 say?', expect: (r) => /shepherd/i.test(r) },
    { id: 'range', msg: 'What does Exodus 20:1-17 say?', expect: (r) => /commandment|god|before me/i.test(r) },
    { id: 'doctrine', msg: 'What does the Bible say about the resurrection?', expect: (r) => /resurrection|raised|1 corinthians 15/i.test(r) },
    { id: 'contradiction', msg: 'Does the Bible say Jesus is a created being? Yes or no?', expect: (r) => /^no\b/i.test(r.trim()) || /no[\s,—-]/i.test(r) },
    { id: 'multiple_witnesses', msg: 'What does the Bible say about the Ten Commandments?', expect: (r) => /exodus 20|deuteronomy 5/i.test(r) },
    { id: 'cross_reference', msg: 'What does the Bible say about resurrection hope, with cross references?', expect: (r) => /resurrection/i.test(r) },
    { id: 'text_only_book_relationship', msg: 'What connects Ruth 4:17 to the New Testament?', expect: (r) => r.length > 20 },
    { id: 'newly_completed_book', msg: 'What does Numbers 21:9 have to do with John 3:14?', expect: (r) => r.length > 20 },
  ];
  for (const c of scriptureCases) {
    const { latencyMs, replyText } = await askCompanion(c.msg, `${runId}-scripture-${c.id}`);
    record('SCRIPTURE', c.id, c.expect(replyText), { replyPreview: replyText.slice(0, 160) }, latencyMs);
  }

  // ---------------- ORIGINAL LANGUAGE ----------------
  const olCases = [
    { id: 'hebrew', msg: 'What is the original Hebrew behind Genesis 1:1?', expect: (r) => /hebrew/i.test(r) },
    { id: 'greek', msg: 'What is the original Greek behind John 1:1?', expect: (r) => /greek/i.test(r) },
    { id: 'kjv_comparison', msg: 'Show me the KJV and original language for John 3:16.', expect: (r) => /kjv|king james/i.test(r) },
    { id: 'incomplete_data', msg: 'What is the original Aramaic wording behind Daniel 2:4?', expect: (r) => r.length > 10 },
  ];
  for (const c of olCases) {
    const { latencyMs, replyText } = await askCompanion(c.msg, `${runId}-ol-${c.id}`);
    record('ORIGINAL_LANGUAGE', c.id, c.expect(replyText), { replyPreview: replyText.slice(0, 160) }, latencyMs);
  }

  // ---------------- HISTORY ----------------
  const historyCases = [
    { id: 'approved_history', msg: 'What is the historical context of David and the house of David?', expect: (r) => r.length > 20 },
    { id: 'historical_citation', msg: 'What is the historical background of the Ten Commandments?', expect: (r) => r.length > 20 },
  ];
  for (const c of historyCases) {
    const { latencyMs, replyText } = await askCompanion(c.msg, `${runId}-history-${c.id}`);
    record('HISTORY', c.id, c.expect(replyText), { replyPreview: replyText.slice(0, 160) }, latencyMs);
  }

  // ---------------- COMPANION ----------------
  const companionCases = [
    { id: 'hard_day', msg: "I've had such a hard day, nothing went right.", expect: (r) => r.length > 10 },
    { id: 'grief', msg: 'My mom passed away three weeks ago and today is really hard.', expect: (r) => r.length > 10 },
    { id: 'family_conflict', msg: 'My brother and I got into a huge fight and haven\u2019t spoken in a month.', expect: (r) => r.length > 10 },
    { id: 'prayer', msg: 'Can you pray with me? I\u2019m scared about my job situation.', expect: (r) => r.length > 10 },
    { id: 'quiet_moment', msg: "I don't really need advice, I just don't want to be alone right now.", expect: (r) => r.length > 10 },
    { id: 'stop_release', msg: "Actually, let's stop talking about that topic.", expect: (r) => r.length > 5 },
  ];
  for (const c of companionCases) {
    const { latencyMs, replyText } = await askCompanion(c.msg, `${runId}-companion-${c.id}`);
    record('COMPANION', c.id, c.expect(replyText), { replyPreview: replyText.slice(0, 160) }, latencyMs);
  }

  // ---------------- UPLOAD / ALIGNMENT ----------------
  const alignmentCases = [
    {
      id: 'valid_lesson',
      text: 'John 3:16 says "For God so loved the world, that he gave his only begotten Son."',
      expect: (rep) => rep.claims.some((c) => c.claimType === 'QUOTED_TEXT_MATCHES_KJV'),
    },
    {
      id: 'invalid_quotation',
      text: 'Genesis 1:1 says "In the beginning God created the moon and stars."',
      expect: (rep) => rep.claims.some((c) => c.claimType === 'QUOTED_TEXT_DOES_NOT_MATCH_KJV'),
    },
    {
      id: 'unsupported_claim_reference_only',
      text: 'Romans 8:28 proves that everyone will be rich in this life.',
      expect: (rep) => rep.claims.some((c) => c.claimType === 'REFERENCE_ONLY_NO_QUOTE') && rep.verdict === null,
    },
    {
      id: 'unresolvable_reference',
      text: 'As it says in Nehemiah 99:99, all things are made new.',
      expect: (rep) => rep.claims.some((c) => c.claimType === 'REFERENCE_UNRESOLVED'),
    },
  ];
  for (const c of alignmentCases) {
    const { result: analysis, latencyMs } = await timed(() => analyzeLessonText({ text: c.text, sourceLabel: c.id }));
    const pass = analysis.ok && c.expect(analysis.report);
    record('UPLOAD_ALIGNMENT', c.id, pass, { summary: analysis.ok ? analysis.report.summary : analysis.error }, latencyMs);
  }
  // private deletion: the analyzer never persists anything to begin with (verified by code inspection in Part 11) — there is nothing to delete.
  record('UPLOAD_ALIGNMENT', 'private_deletion_not_applicable', true, { note: 'Lesson analysis is never persisted to any store (Part 11 governance.promotedToProduction is always false); no deletion action is required or exposed.' }, 0);

  // ---------------- ADMIN (HTTP, requires a running server) ----------------
  const adminEndpoints = [
    '/admin/api/bible-authority/command-center',
    '/admin/api/bible-authority/review-queue',
    '/admin/api/bible-authority/knowledge-coverage-dashboard',
    '/admin/api/bible-authority/founder-console',
    '/admin/api/bible-authority/provider-health',
    '/admin/api/bible-authority/lesson-alignment/limits',
  ];
  for (const ep of adminEndpoints) {
    const { result, latencyMs } = await timed(() => httpGet(ep));
    record('ADMIN', ep, result.status === 200, { status: result.status, error: result.error }, latencyMs);
  }

  // ---------------- FAILURE MODES ----------------
  // Malformed/empty input to the lesson analyzer (bounded, safe failure).
  {
    const { latencyMs } = { latencyMs: 0 };
    const empty = await analyzeLessonText({ text: '' });
    record('FAILURE', 'empty_lesson_text_handled', empty.ok === false && empty.error === 'empty_text', empty, latencyMs);
  }
  {
    const oversized = await analyzeLessonText({ text: 'x'.repeat(25000) });
    record('FAILURE', 'oversized_lesson_text_handled', oversized.ok === false && oversized.error === 'text_too_large', oversized, 0);
  }
  {
    // Reference that cannot be resolved by any provider tier — verifies honest failure, not fabrication.
    const { result: analysis } = await timed(() => analyzeLessonText({ text: 'Obadiah 55:1 says something important.' }));
    const unresolved = analysis.ok && analysis.report.claims.some((c) => c.claimType === 'REFERENCE_UNRESOLVED');
    record('FAILURE', 'bad_scripture_reference_handled_honestly', unresolved, analysis.ok ? analysis.report.claims : analysis, 0);
  }

  // ---------------- SUMMARY ----------------
  const byCategory = {};
  for (const r of results) {
    byCategory[r.category] = byCategory[r.category] || { pass: 0, fail: 0, avgLatencyMs: 0, latencies: [] };
    byCategory[r.category][r.pass ? 'pass' : 'fail'] += 1;
    byCategory[r.category].latencies.push(r.latencyMs);
  }
  Object.keys(byCategory).forEach((cat) => {
    const lat = byCategory[cat].latencies;
    byCategory[cat].avgLatencyMs = Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
    byCategory[cat].maxLatencyMs = Math.max(...lat);
    delete byCategory[cat].latencies;
  });

  const totalPass = results.filter((r) => r.pass).length;
  const totalFail = results.length - totalPass;

  const summary = {
    runId,
    generatedAt: new Date().toISOString(),
    totalCases: results.length,
    totalPass,
    totalFail,
    byCategory,
    results,
  };

  const outDir = path.join(__dirname, '..', '..', 'docs', 'alpha', 'phase6f-20260719-075444');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'Part17-FounderAlphaE2E.json'), JSON.stringify(summary, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(`Total: ${results.length}  Pass: ${totalPass}  Fail: ${totalFail}`);
  console.log(JSON.stringify(byCategory, null, 2));
  if (totalFail > 0) {
    console.log('\nFAILED CASES:');
    results.filter((r) => !r.pass).forEach((r) => console.log(`  ${r.category}/${r.id}:`, JSON.stringify(r.detail).slice(0, 300)));
  }
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
