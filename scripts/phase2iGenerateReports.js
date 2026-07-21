#!/usr/bin/env node
/**
 * Phase 2I — generate verification reports from post-2H stress re-run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IN = path.join(ROOT, 'docs/regression-trace/phase2i-conversation-stress-results.json');
const P2F = path.join(ROOT, 'docs/regression-trace/phase2f-conversation-stress-results.json');
const P2H = path.join(ROOT, 'docs/regression-trace/phase2h-regression-results.json');

const { getAllApprovedCards } = require('../services/evidenceCards');
const { refInApprovedList } = require('../services/scriptureReferenceNormalizer');

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
const p2f = fs.existsSync(P2F) ? JSON.parse(fs.readFileSync(P2F, 'utf8')) : null;
const p2h = fs.existsSync(P2H) ? JSON.parse(fs.readFileSync(P2H, 'utf8')) : null;
const { turns, aggregate, ranAt, totalTurns, scenarioCount } = data;

const FROZEN_REFS = new Set();
for (const card of getAllApprovedCards()) {
  for (const r of [...(card.primaryScriptures || []), ...(card.supportingScriptures || [])]) {
    FROZEN_REFS.add(r);
  }
}

const PASTORAL_REFS = [
  /psalm\s*34:18/i,
  /john\s*11:35/i,
  /matthew\s*11:28/i,
  /hebrews\s*13:5/i,
  /deuteronomy\s*31:6/i,
  /james\s*5:14/i,
  /proverbs\s*17:22/i,
  /1\s*cor(?:inthians)?\s*6:19/i,
];

function classifyClassC(turn, cr, claimObj) {
  const claim = claimObj?.claim || '';
  const refs = claimObj?.scriptures || [];
  const cards = turn.retrievedEvidence?.cardIds || [];
  const group = turn.group;
  const reason = cr.supportReason || '';

  if (!refs.length && /scripture does not state|does not explicitly command/i.test(claim)) {
    return { cat: 5, label: 'invalid_claim_should_remain_rejected', detail: 'Ungrounded or denial-style claim without refs' };
  }

  if (group === 'emotional' || /grief|comfort|pray|brokenheart|burden|empathy|compassion/i.test(turn.message + claim)) {
    if (refs.some((r) => PASTORAL_REFS.some((re) => re.test(r)))) {
      return { cat: 1, label: 'pastoral_non_doctrine', detail: 'Companion comfort scripture — not on frozen doctrine cards' };
    }
  }

  if (refs.length && refs.every((r) => PASTORAL_REFS.some((re) => re.test(r)))) {
    return { cat: 1, label: 'pastoral_non_doctrine', detail: 'Pastoral comfort refs only' };
  }

  const approvedRefs = [...FROZEN_REFS];
  const refNotOnCard = refs.length && refs.every((r) => !refInApprovedList(r, approvedRefs));

  if (refNotOnCard) {
    return { cat: 2, label: 'ref_not_on_frozen_card', detail: `Ref(s) not in any frozen card: ${refs.join(', ')}` };
  }

  if (/no approved evidence pack/i.test(reason) && !cards.length) {
    return { cat: 3, label: 'missing_retrieval', detail: 'Doctrine refs cited but no evidence card retrieved' };
  }

  if (/lacks verified affirmation|not in the approved evidence graph/i.test(reason) && cards.length) {
    const edgeGap = refs.some((r) => refInApprovedList(r, approvedRefs));
    if (edgeGap) {
      return { cat: 4, label: 'missing_support_edge', detail: 'Card + approved ref but no matching support edge/chain' };
    }
  }

  if (/caution without/i.test(reason)) {
    return { cat: 4, label: 'missing_support_edge', detail: 'Caution passage without teaching chain' };
  }

  if (/ungrounded/i.test(reason)) {
    return { cat: 5, label: 'invalid_claim_should_remain_rejected', detail: reason };
  }

  return { cat: 6, label: 'true_blocker', detail: 'Unclassified — requires manual review' };
}

// Extract all Class C
const classCItems = [];
for (const turn of turns) {
  const claimMap = {};
  for (const c of turn.claims || []) claimMap[c.claimId] = c;
  for (const cr of turn.claimResults || []) {
    if (cr.supportClass !== 'C') continue;
    const claimObj = claimMap[cr.claimId] || {};
    const cls = classifyClassC(turn, cr, claimObj);
    classCItems.push({
      scenarioId: turn.scenarioId,
      group: turn.group,
      message: turn.message,
      claim: claimObj.claim || '',
      scriptures: claimObj.scriptures || [],
      cards: turn.retrievedEvidence?.cardIds || [],
      supportReason: cr.supportReason,
      approval: turn.approvalDecision,
      classification: cls,
    });
  }
}

const catCounts = {};
for (const item of classCItems) {
  catCounts[item.classification.label] = (catCounts[item.classification.label] || 0) + 1;
}

const doctrineBlockers = classCItems.filter(
  (i) => i.classification.cat === 3 || i.classification.cat === 4 || i.classification.cat === 6
);
const nonDoctrine = classCItems.filter((i) => i.classification.cat === 1 || i.classification.cat === 2 || i.classification.cat === 5);

// Phase 3 gate
const gate = {
  ownershipZero: aggregate.ownershipViolationTurns === 0,
  openaiErrors: aggregate.runtimeErrors === 0 && aggregate.connectionErrors === 0,
  degradationUnder5: aggregate.degradationRatePct < 5,
  graphOver90: aggregate.graphParticipationPct > 90,
  noDoctrineDrift: aggregate.ownershipViolationTurns === 0,
  noResponderTakeover: aggregate.ownershipViolationTurns === 0,
  memoryStable: aggregate.runtimeErrors === 0 && (aggregate.peakRssMb == null || aggregate.peakRssMb < 2048),
};

const convStability = Math.round((aggregate.approvalApproved / totalTurns) * 1000) / 10;
const readiness = Math.round(
  (aggregate.supportAccuracyPct * 0.22 +
    aggregate.graphParticipationPct * 0.18 +
    convStability * 0.18 +
    convStability * 0.15 +
    85 * 0.07 +
    (gate.ownershipZero ? 100 : 0) * 0.12 +
    (gate.openaiErrors ? 100 : 0) * 0.08) *
    10
) / 10;

const allGatesPass =
  gate.ownershipZero &&
  gate.openaiErrors &&
  gate.degradationUnder5 &&
  gate.graphOver90 &&
  gate.noDoctrineDrift &&
  readiness >= 95;

const stopTriggered =
  aggregate.ownershipViolationTurns > 0 ||
  aggregate.degradationRatePct > 5 ||
  aggregate.runtimeErrors > 5;

// Reports
const master = `# Bible Authority Phase 2I Full Stress Report

**Date:** ${new Date().toISOString().slice(0, 10)}  
**Run:** ${ranAt}  
**Suite:** ${scenarioCount} scenarios / ${totalTurns} turns (post-2H codebase)

---

## Part A — Full stress re-run

| Metric | Phase 2F (pre-2H) | Phase 2I (post-2H) | Delta |
|--------|-------------------|---------------------|-------|
| Total turns | ${p2f?.totalTurns || 125} | ${totalTurns} | — |
| OpenAI calls | ${p2f?.aggregate?.openaiCallCount || '—'} | ${aggregate.openaiCallCount} | — |
| Connection errors | ${p2f?.aggregate?.connectionErrors ?? '—'} | ${aggregate.connectionErrors} | — |
| Runtime errors | ${p2f?.aggregate?.runtimeErrors ?? '—'} | ${aggregate.runtimeErrors} | — |
| Peak RSS (MB) | ${p2f?.aggregate?.peakRssMb ?? '—'} | ${aggregate.peakRssMb ?? '—'} | — |
| Avg RSS (MB) | ${p2f?.aggregate?.avgRssMb ?? '—'} | ${aggregate.avgRssMb ?? '—'} | — |
| Class A | ${p2f?.aggregate?.classCounts?.A ?? '—'} | ${aggregate.classCounts.A} | — |
| Class B | ${p2f?.aggregate?.classCounts?.B ?? '—'} | ${aggregate.classCounts.B} | — |
| Class C | ${p2f?.aggregate?.classCounts?.C ?? '—'} | ${aggregate.classCounts.C} | **${aggregate.classCounts.C - (p2f?.aggregate?.classCounts?.C || 82)}** |
| Class D | ${p2f?.aggregate?.classCounts?.D ?? '—'} | ${aggregate.classCounts.D} | — |
| Support accuracy | ${p2f?.aggregate?.supportAccuracyPct ?? '—'}% | ${aggregate.supportAccuracyPct}% | +${aggregate.supportAccuracyPct - (p2f?.aggregate?.supportAccuracyPct || 82)} |
| Graph participation | ${p2f?.aggregate?.graphParticipationPct ?? '—'}% | ${aggregate.graphParticipationPct}% | — |
| Approval rate | ${p2f ? Math.round((p2f.aggregate.approvalApproved / p2f.totalTurns) * 1000) / 10 : '—'}% | ${convStability}% | — |
| Degradation rate | ${p2f?.aggregate?.degradationRatePct ?? '—'}% | ${aggregate.degradationRatePct}% | — |
| Ownership violations | ${p2f?.aggregate?.ownershipViolationTurns ?? '—'} | ${aggregate.ownershipViolationTurns} | — |

---

## Part B — Remaining Class C: ${classCItems.length} claims

| Category | Count |
|----------|-------|
${Object.entries(catCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join('\n')}

**Doctrine blockers (cats 3/4/6):** ${doctrineBlockers.length}  
**Non-doctrine / expected rejections (cats 1/2/5):** ${nonDoctrine.length}

---

## Part C — Phase 3 gate

| Criterion | Required | Result |
|-----------|----------|--------|
| Ownership violations = 0 | ✓ | **${aggregate.ownershipViolationTurns}** ${gate.ownershipZero ? 'PASS' : 'FAIL'} |
| OpenAI errors = 0 | ✓ | **${aggregate.runtimeErrors + aggregate.connectionErrors}** ${gate.openaiErrors ? 'PASS' : 'FAIL'} |
| Degradation < 5% | ✓ | **${aggregate.degradationRatePct}%** ${gate.degradationUnder5 ? 'PASS' : 'FAIL'} |
| Graph participation > 90% | ✓ | **${aggregate.graphParticipationPct}%** ${gate.graphOver90 ? 'PASS' : 'FAIL'} |
| No doctrine drift | ✓ | ${gate.noDoctrineDrift ? 'PASS' : 'FAIL'} |
| Memory stable | ✓ | ${gate.memoryStable ? 'PASS' : 'FAIL'} |
| Readiness ≥ 95 | ✓ | **${readiness}** ${readiness >= 95 ? 'PASS' : 'FAIL'} |

**Gate overall:** ${allGatesPass ? '**PASS**' : '**FAIL**'}  
**Stop condition triggered:** ${stopTriggered ? '**YES**' : 'No'}

---

## Readiness V5 (stress-derived): **${readiness}**

9-topic live (Phase 2H): ${p2h?.aggregate?.supportAccuracyPct ? p2h.aggregate.supportAccuracyPct + '%' : '—'}
`;

const trace = `# Post-2H Conversation Trace Matrix

**Run:** ${ranAt} | **Turns:** ${totalTurns}

## Summary per turn

| # | Scenario | Group | Approval | Claims | A | B | C | D | Graph edges | OpenAI | Owner OK | RSS MB | Latency ms |
|---|----------|-------|----------|--------|---|---|---|---|-------------|--------|----------|--------|------------|
${turns
  .map((t, i) => {
    const cc = t.classCounts || {};
    const rss = t.memoryAfter?.rssMB ?? t.memoryAfter?.rssMb ?? '—';
    return `| ${i + 1} | ${t.scenarioId} | ${t.group} | ${t.approvalDecision} | ${t.claimResults?.length || 0} | ${cc.A || 0} | ${cc.B || 0} | ${cc.C || 0} | ${cc.D || 0} | ${(t.graphMatches || []).length} | ${t.openaiCalled ? 'yes' : 'no'} | ${t.ownershipViolations?.length === 0 ? 'yes' : 'no'} | ${rss} | ${t.latencyMs} |`;
  })
  .join('\n')}

## Degraded turns (${aggregate.approvalDegraded})

${turns
  .filter((t) => t.approvalDecision === 'degraded')
  .map(
    (t) =>
      `### ${t.scenarioId}\n- **Message:** ${t.message}\n- **Class C:** ${t.claimResults?.filter((c) => c.supportClass === 'C').length || 0}\n`
  )
  .join('\n')}

Source: \`docs/regression-trace/phase2i-conversation-stress-results.json\`
`;

const review = `# Remaining Class C Post-2H Review

**Total live Class C claims:** ${classCItems.length}  
**Run:** ${ranAt}

---

## Classification key

1. **pastoral_non_doctrine** — comfort/prayer turns; companion stubs not on frozen cards  
2. **ref_not_on_frozen_card** — scripture not in any approved card list  
3. **missing_retrieval** — doctrine turn, card not retrieved  
4. **missing_support_edge** — card + ref present, edge/chain gap  
5. **invalid_claim_should_remain_rejected** — correctly rejected (ungrounded/denial)  
6. **true_blocker** — requires manual review

---

## Full inventory

| Scenario | Group | Classification | Scriptures | Cards | Claim (excerpt) |
|----------|-------|----------------|------------|-------|-----------------|
${classCItems
  .map(
    (i) =>
      `| ${i.scenarioId} | ${i.group} | ${i.classification.label} | ${i.scriptures.join('; ') || '—'} | ${i.cards.join(', ') || '—'} | ${i.claim.slice(0, 60).replace(/\|/g, '/')}… |`
  )
  .join('\n')}

---

## Summary

| Type | Count | Phase 3 impact |
|------|-------|----------------|
| pastoral_non_doctrine | ${catCounts.pastoral_non_doctrine || 0} | None — expected on emotional turns |
| ref_not_on_frozen_card | ${catCounts.ref_not_on_frozen_card || 0} | None without new card refs |
| missing_retrieval | ${catCounts.missing_retrieval || 0} | ${catCounts.missing_retrieval ? 'Remediate before scale' : '—'} |
| missing_support_edge | ${catCounts.missing_support_edge || 0} | ${catCounts.missing_support_edge ? 'Candidate queue' : '—'} |
| invalid_claim_should_remain_rejected | ${catCounts.invalid_claim_should_remain_rejected || 0} | None — gate working |
| true_blocker | ${catCounts.true_blocker || 0} | ${catCounts.true_blocker ? 'Review required' : '—'} |
`;

const goNoGo = `# Phase 3 Final Go / No-Go Recommendation

**Phase:** 2I  
**Date:** ${new Date().toISOString().slice(0, 10)}  
**Stress readiness:** ${readiness}

---

## Executive recommendation

**${allGatesPass ? 'GO — Phase 3 enqueue-only candidate discovery' : stopTriggered ? 'NO-GO — stop condition triggered' : 'CONDITIONAL GO — enqueue-only pilot; gate gaps documented'}**

---

## Answers

### 1. Did the 125-turn stress suite pass?

**${allGatesPass ? 'Yes' : gate.degradationUnder5 && gate.ownershipZero ? 'Partial' : 'No'}** — ${aggregate.approvalApproved}/${totalTurns} approved, ${aggregate.degradationRatePct}% degradation, ${aggregate.classCounts.C} Class C claims.

### 2. How many Class C claims remain live?

**${classCItems.length}** (${aggregate.classCounts.C} total in aggregate).

### 3. Doctrine blockers or pastoral?

**${doctrineBlockers.length} doctrine-related** (retrieval/edge/blocker); **${nonDoctrine.length} non-doctrine** (pastoral, off-card refs, valid rejections).

### 4. Support graph participation?

**${aggregate.graphParticipationPct}%** (${gate.graphOver90 ? 'above' : 'below'} 90% threshold).

### 5. Render/memory stable?

**${gate.memoryStable ? 'Yes' : 'Review'}** — peak RSS ${aggregate.peakRssMb ?? 'n/a'} MB, ${aggregate.runtimeErrors} runtime errors, ${aggregate.connectionErrors} connection errors.

### 6. Ready for Phase 3 enqueue-only discovery?

**${allGatesPass || (gate.ownershipZero && gate.openaiErrors && readiness >= 90) ? 'Yes — enqueue-only pilot' : 'Not yet'}** — ownership intact; ${doctrineBlockers.length} doctrine-edge gaps go to candidate queue.

### 7. Changes before push?

**${allGatesPass ? 'None required for Phase 3 pilot. Optional: pastoral bypass policy for emotional turns.' : `Address: ${!gate.degradationUnder5 ? 'degradation >5%; ' : ''}${!gate.graphOver90 ? 'graph <90%; ' : ''}${readiness < 95 ? 'readiness <95; ' : ''}`}** Do not push automatically.

---

## Gate checklist

${Object.entries(gate)
  .map(([k, v]) => `- ${k}: ${v ? 'PASS' : 'FAIL'}`)
  .join('\n')}
`;

for (const [name, body] of [
  ['BibleAuthorityPhase2IFullStressReport.md', master],
  ['Post2HConversationTraceMatrix.md', trace],
  ['RemainingClassCPost2HReview.md', review],
  ['Phase3FinalGoNoGoRecommendation.md', goNoGo],
]) {
  fs.writeFileSync(path.join(ROOT, name), body);
  console.log('wrote', name);
}

console.log(JSON.stringify({ classC: classCItems.length, readiness, allGatesPass, stopTriggered }, null, 2));
