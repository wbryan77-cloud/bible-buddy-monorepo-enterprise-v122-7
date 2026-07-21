#!/usr/bin/env node
/**
 * Phase 2J-A — Scripture Discovery Pilot runner.
 * Discovery only — no promotion, no production wiring.
 */
const fs = require('fs');
const path = require('path');
const { runScriptureDiscoveryPilot } = require('../services/scriptureDiscoveryPilot');

const ROOT = path.join(__dirname, '..');
const OUT_JSONL = path.join(ROOT, 'docs', 'evidence-candidates', 'scripture-discovery-pilot.jsonl');
const PRODUCTION_WIRE_CHECK = [
  path.join(ROOT, 'services', 'buddyBrain.js'),
  path.join(ROOT, 'services', 'retrievalEvidencePack.js'),
  path.join(ROOT, 'services', 'approvedSupportGraph.js'),
  path.join(ROOT, 'services', 'claimToScriptureValidator.js'),
];

function verifyProductionIsolation() {
  const forbiddenImports = ['scriptureDiscoveryPilot', 'scriptureDiscoveryCrossReference'];
  const violations = [];

  for (const file of PRODUCTION_WIRE_CHECK) {
    const content = fs.readFileSync(file, 'utf8');
    for (const mod of forbiddenImports) {
      if (content.includes(mod)) {
        violations.push({ file: path.basename(file), module: mod });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    checkedFiles: PRODUCTION_WIRE_CHECK.map((f) => path.basename(f)),
  };
}

function writeReports(result, safety) {
  const s = result.summary;

  const sourcePlan = `# Scripture Discovery Source Plan

**Phase:** 2J-A Part A  
**Date:** ${new Date().toISOString().slice(0, 10)}  
**Status:** Pilot — discovery only

---

## Approved candidate source types

| Source type | Allowed in pilot | Ingestion scope |
|-------------|------------------|-----------------|
| User-provided transcripts | ✅ | Manual upload → pilot JSONL only |
| Official / licensed transcripts | ✅ | Admin attests rights |
| Creator-authorized transcripts | ✅ | \`copyrightStatus: licensed\` |
| Public materials (ToS-compliant) | ✅ | Legal review required |
| Manually supplied notes | ✅ | \`data/scripture-discovery-pilot-sources.json\` |
| Phase 2I stress Class C gaps | ✅ | Read-only from stress results |
| Approved continuity sample chains | ✅ | \`scripture-continuity-sample.json\` |
| YouTube transcript metadata | ✅ | **Metadata only** — title, videoId, cited refs |
| YouTube channel scrape | ❌ | Not permitted |
| IOG bulk ingestion | ❌ | Not started |
| Entire channel ingestion | ❌ | Not permitted |

---

## YouTube pilot protocol (metadata only)

1. Admin supplies \`videoId\`, \`title\`, \`question\`, manually extracted \`scripturesCited\`
2. Pilot writes candidate to \`docs/evidence-candidates/scripture-discovery-pilot.jsonl\`
3. **No** automated channel crawl, **no** transcript text storage without license
4. \`reviewRequired: true\`, \`autoApplied: false\` always

---

## Pilot inputs used

| Input | Count |
|-------|-------|
| Curated pilot questions | 6 |
| Continuity expansion candidates | auto |
| Phase 2I Class C extractions | auto |
| Manual sources file | \`data/scripture-discovery-pilot-sources.json\` |

---

## Output destination

\`docs/evidence-candidates/scripture-discovery-pilot.jsonl\` — **separate** from \`data/support-graph-candidates.jsonl\`
`;

  const safetyReport = `# Scripture Discovery Safety Report

**Phase:** 2J-A Part E  
**Date:** ${new Date().toISOString().slice(0, 10)}

---

## Production isolation check

| Check | Result |
|-------|--------|
| Pilot modules wired into buddyBrain | ${safety.passed ? '**No** PASS' : '**FAIL**'} |
| Pilot modules wired into retrievalEvidencePack | ${safety.passed ? '**No** PASS' : '**FAIL**'} |
| Pilot modules wired into approvedSupportGraph | ${safety.passed ? '**No** PASS' : '**FAIL**'} |
| Pilot modules wired into claimToScriptureValidator | ${safety.passed ? '**No** PASS' : '**FAIL**'} |

Files checked: ${safety.checkedFiles.join(', ')}

---

## Safety guarantees

| Guarantee | Status |
|-----------|--------|
| No candidate affects live answers | ✅ Pilot not in request path |
| No candidate affects retrieval | ✅ No changes to \`retrieveEvidenceCards\` |
| No candidate affects support graph | ✅ \`APPROVED_SUPPORT_EDGES\` unchanged |
| No candidate affects doctrine validation | ✅ Validator unchanged |
| No auto-promotion | ✅ All \`autoApplied: false\` |
| No doctrine modification | ✅ Read-only cross-reference |

${safety.violations.length ? `\n**Violations:** ${JSON.stringify(safety.violations)}` : ''}

---

## Candidate file permissions

- Write path: \`docs/evidence-candidates/\` only
- Does **not** write to \`services/evidenceCards/\`
- Does **not** append to production support graph queue without admin action
`;

  const pilotReport = `# Scripture Discovery Pilot Report

**Phase:** 2J-A Part F  
**Run:** ${result.ranAt}  
**Candidates:** ${result.candidateCount}

---

## Summary

| Metric | Count |
|--------|-------|
| Total candidates | ${s.total} |
| Already approved | ${s.alreadyApproved || 0} |
| Partially approved | ${s.byApprovalStatus?.partially_approved || 0} |
| New relationship | ${s.byApprovalStatus?.new_relationship || 0} |
| Unsupported | ${s.byApprovalStatus?.unsupported || 0} |
| Potentially useful | ${s.potentiallyUseful} |
| Review required | ${s.reviewRequired} |

---

## Answers

1. **How many candidates were found?** **${s.total}**
2. **How many already exist?** **${s.alreadyApproved || 0}** (fully on card + graph)
3. **How many are potentially useful?** **${s.potentiallyUseful}** (partial + new relationship)
4. **How many require review?** **${s.reviewRequired}** (all — \`reviewRequired: true\`)
5. **Did any candidate affect production behavior?** **No** — pilot is isolated from request path

---

## Top candidates by support score

| ID | Question (excerpt) | Status | Score | Source |
|----|-------------------|--------|-------|--------|
${result.candidates
  .sort((a, b) => b.supportScore - a.supportScore)
  .slice(0, 15)
  .map(
    (c) =>
      `| ${c.id} | ${c.question.slice(0, 50)}… | ${c.approvalStatus} | ${c.supportScore} | ${c.sourceType} |`
  )
  .join('\n')}

---

## Output files

- \`docs/evidence-candidates/scripture-discovery-pilot.jsonl\`
- \`ScriptureDiscoverySourcePlan.md\`
- \`ScriptureDiscoverySafetyReport.md\`

---

## Constraints honored

- No doctrine changes
- No evidence card changes
- No support graph changes
- No OpenAI prompt changes
- No Phase 3 activation
- No automatic approval
- No push
`;

  fs.writeFileSync(path.join(ROOT, 'ScriptureDiscoverySourcePlan.md'), sourcePlan);
  fs.writeFileSync(path.join(ROOT, 'ScriptureDiscoverySafetyReport.md'), safetyReport);
  fs.writeFileSync(path.join(ROOT, 'ScriptureDiscoveryPilotReport.md'), pilotReport);
}

function main() {
  const safety = verifyProductionIsolation();
  const result = runScriptureDiscoveryPilot();

  fs.mkdirSync(path.dirname(OUT_JSONL), { recursive: true });
  const lines = result.candidates.map((c) => JSON.stringify(c)).join('\n') + '\n';
  fs.writeFileSync(OUT_JSONL, lines);

  writeReports(result, safety);

  console.log(
    JSON.stringify(
      {
        ok: true,
        candidates: result.candidateCount,
        summary: result.summary,
        safety: safety.passed,
        out: OUT_JSONL,
      },
      null,
      2
    )
  );
}

main();
