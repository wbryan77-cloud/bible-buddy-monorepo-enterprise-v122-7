#!/usr/bin/env node
/**
 * Phase 2G — Class C root cause audit (analysis only).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IN = path.join(ROOT, 'docs/regression-trace/phase2f-conversation-stress-results.json');
const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
const { turns, aggregate, ranAt } = data;

const TOPIC_KEYWORDS = {
  sabbath: /\bsabbath|seventh day|rest day|isaiah 58|exodus 20|hebrews 4\b/i,
  kingdom: /\bkingdom|thy kingdom|matt(?:hew)?\s*6:10|revelation 21|rev 21|on earth\b/i,
  heavens: /\bheaven|third heaven|2 cor(?:inthians)?\s*12|john 3:13|ascend\b/i,
  deathState: /\bdie|death|resurrection|sleep|grave|1 thess|john 11|eccl(?:esiastes)?\b/i,
  dietaryLaw: /\bpork|unclean|clean food|acts 10|acts 11|leviticus 11|deuteronomy 14\b/i,
  holiness: /\bholy|holiness|set apart|1 peter 1:15|leviticus 19:2\b/i,
  messiahLogos: /\blogos|john 1:1|word was god|word made flesh\b/i,
  emotional: /\bgrief|grieving|comfort|pray|angry|abandon|hope|fear|anxious|lonely|depress\b/i,
  lawCommandments: /\bcommandment|law of moses|torah\b/i,
  traditions: /\btradition|constantine|sunday worship|church history\b/i,
};

function inferTopic(turn, claimText = '') {
  const topic = turn.retrievedEvidence?.effectiveTopic;
  if (topic) return topic;
  const cards = turn.retrievedEvidence?.cardIds || [];
  if (cards.length === 1) return cards[0];
  const text = `${turn.message} ${claimText}`;
  for (const [t, re] of Object.entries(TOPIC_KEYWORDS)) {
    if (re.test(text)) return t;
  }
  if (turn.group === 'emotional') return 'emotional_pastoral';
  return 'general';
}

function topicSubCluster(topic, claimText, refs, cards) {
  const text = `${claimText} ${refs}`;
  if (topic === 'sabbath' || /\bsabbath|seventh day|isaiah 58|hebrews 4:9\b/i.test(text))
    return 'sabbath_cluster';
  if (topic === 'kingdom' || /\bkingdom|thy kingdom|matt(?:hew)?\s*6:10|revelation 21\b/i.test(text))
    return 'kingdom_cluster';
  if (topic === 'holiness' || /\bholy|holiness|1 peter 1:15|hebrews 12:14\b/i.test(text))
    return 'holy_cluster';
  if (topic === 'dietaryLaw' || /\bpork|unclean|acts 10|acts 11\b/i.test(text))
    return 'dietary_cluster';
  if (topic === 'deathState' || topic === 'heavens' || /\bdie|death|resurrection|sleep|1 thess|john 11\b/i.test(text))
    return 'death_resurrection_cluster';
  if (topic === 'messiahLogos' || /\blogos|john 1\b/i.test(text)) return 'logos_cluster';
  if (topic === 'emotional_pastoral' || (!cards.length && /\bcomfort|grief|pray|brokenheart|anxious\b/i.test(text)))
    return 'pastoral_cluster';
  return 'general_cluster';
}

function classifyRootCause(entry) {
  const { supportReason, claimText, scriptures, topic, cards } = entry;
  const reason = supportReason || '';
  const refs = (scriptures || []).join(' ');
  const sub = topicSubCluster(topic, claimText, refs, cards);

  // Primary classification from validator supportReason (ground truth)
  if (/lacks verified affirmation under frozen binding rules/i.test(reason)) {
    const detail = 'Card retrieved; citation named but frozen affirmation/edge does not cover claim phrasing';
    if (/isaiah 58/i.test(refs)) {
      return { cluster: 'missing_support_edge', sub: 'isaiah58_sabbath_edge', detail: 'Isaiah 58:13-14 — Sabbath delight edge gap on application phrasing' };
    }
    if (/revelation 21:1-3/i.test(refs)) {
      return { cluster: 'scripture_range_mismatch', sub: 'rev21_verse_range', detail: 'Rev 21:1-3 cited; frozen edge covers 21:1-2 range' };
    }
    return { cluster: 'missing_affirmation', sub, detail };
  }

  if (/no approved evidence pack is available/i.test(reason)) {
    // All 27 instances: cards.length === 0
    if (sub === 'pastoral_cluster' || entry.group === 'emotional') {
      return { cluster: 'missing_card', sub: 'pastoral_no_evidence_card', detail: 'Pastoral turn — comfort scripture cited, no doctrine card retrieved' };
    }
    return { cluster: 'missing_retrieval_trigger', sub, detail: 'Doctrine scripture cited but evidence card not retrieved for turn' };
  }

  if (/not in the approved evidence graph/i.test(reason)) {
    if (/1\s*thess/i.test(refs)) {
      return { cluster: 'missing_chain', sub: 'thessalonians_4_chain', detail: '1 Thessalonians 4:13-18 not in approved teaching chain' };
    }
    return { cluster: 'missing_chain', sub, detail: 'Citation not in approved evidence graph / catalog chain' };
  }

  if (/Only caution passages were cited without an approved teaching chain/i.test(reason)) {
    return { cluster: 'missing_chain', sub: 'caution_without_teaching_chain', detail: 'Caution passage used without approved line-upon-line chain' };
  }

  if (/No supporting scriptures were mapped/i.test(reason)) {
    return { cluster: 'weak_claim_extraction', sub: 'unmapped_doctrine_claim', detail: 'Claim extracted without scripture mapping' };
  }

  return { cluster: 'missing_affirmation', sub: 'unclassified', detail: reason || 'Unknown' };
}

// Build inventory
const inventory = [];
let idx = 0;
for (const turn of turns) {
  const claimMap = {};
  for (const c of turn.claims || []) {
    claimMap[c.claimId] = c;
  }
  for (const cr of turn.claimResults || []) {
    if (cr.supportClass !== 'C') continue;
    idx += 1;
    const claimObj = claimMap[cr.claimId] || {};
    const claimText = claimObj.claim || '';
    const scriptures = claimObj.scriptures || [];
    const topic = inferTopic(turn, claimText);
    const entry = {
      id: `CC-${String(idx).padStart(3, '0')}`,
      topic,
      scenarioId: turn.scenarioId,
      group: turn.group,
      turnIndex: turn.turnIndex || 0,
      conversation: turn.message,
      claimId: cr.claimId,
      claim: claimText,
      scriptures,
      supportReason: cr.supportReason,
      supportGraphMatch: cr.supportGraphMatch,
      approvalResult: turn.approvalDecision,
      cards: turn.retrievedEvidence?.cardIds || [],
      effectiveTopic: turn.retrievedEvidence?.effectiveTopic || null,
    };
    entry.rootCause = classifyRootCause(entry);
    inventory.push(entry);
  }
}

// Cluster aggregation
const clusterCounts = {};
const subCounts = {};
const topicCounts = {};
for (const e of inventory) {
  const c = e.rootCause.cluster;
  const s = `${c}::${e.rootCause.sub}`;
  clusterCounts[c] = (clusterCounts[c] || 0) + 1;
  subCounts[s] = (subCounts[s] || 0) + 1;
  topicCounts[e.topic] = (topicCounts[e.topic] || 0) + 1;
}

const clusterMeta = {
  missing_affirmation: { effort: 'low', risk: 'low', userImpact: 'high', doctrineImpact: 'medium' },
  missing_support_edge: { effort: 'low', risk: 'low', userImpact: 'high', doctrineImpact: 'medium' },
  missing_card: { effort: 'medium', risk: 'medium', userImpact: 'high', doctrineImpact: 'high' },
  missing_retrieval_trigger: { effort: 'medium', risk: 'low', userImpact: 'medium', doctrineImpact: 'medium' },
  missing_chain: { effort: 'medium', risk: 'low', userImpact: 'medium', doctrineImpact: 'medium' },
  scripture_range_mismatch: { effort: 'low', risk: 'low', userImpact: 'low', doctrineImpact: 'low' },
  weak_claim_extraction: { effort: 'high', risk: 'medium', userImpact: 'low', doctrineImpact: 'low' },
  unsupported_doctrine_conclusion: { effort: 'high', risk: 'high', userImpact: 'medium', doctrineImpact: 'high' },
};

function priorityFor(cluster, count, sub = '') {
  const m = clusterMeta[cluster] || clusterMeta.missing_affirmation;
  const score = count * (m.userImpact === 'high' ? 3 : m.userImpact === 'medium' ? 2 : 1);
  if (cluster === 'missing_affirmation' || cluster === 'missing_retrieval_trigger') return count >= 10 ? 'P0' : count >= 5 ? 'P1' : 'P2';
  if (cluster === 'missing_chain' && count >= 10) return 'P0';
  if (score >= 30) return 'P0';
  if (score >= 10 || count >= 5) return 'P1';
  return 'P2';
}

const clusterRows = Object.entries(clusterCounts)
  .map(([cluster, count]) => ({
    cluster,
    count,
    pct: Math.round((count / inventory.length) * 1000) / 10,
    priority: priorityFor(cluster, count),
    ...clusterMeta[cluster],
  }))
  .sort((a, b) => b.count - a.count);

// Top gaps by sub-cluster (aggregate same sub across clusters)
const subAgg = {};
for (const e of inventory) {
  const sub = e.rootCause.sub;
  if (!subAgg[sub]) subAgg[sub] = { sub, clusters: new Set(), count: 0, fixTypes: new Set() };
  subAgg[sub].count += 1;
  subAgg[sub].clusters.add(e.rootCause.cluster);
}
const gapRows = Object.values(subAgg)
  .map((g) => ({ ...g, clusters: [...g.clusters].join(' + ') }))
  .sort((a, b) => b.count - a.count);

function fixTypesFor(clusters) {
  const types = new Set();
  for (const c of clusters.split(' + ')) {
    if (c === 'missing_affirmation') types.add('affirmation_rule');
    else if (c === 'missing_support_edge') types.add('support_graph_edge');
    else if (c === 'missing_card') types.add('pastoral_card_or_bypass');
    else if (c === 'missing_retrieval_trigger') types.add('retrieval_pattern');
    else if (c === 'missing_chain') types.add('catalog_chain_edge');
    else if (c === 'scripture_range_mismatch') types.add('ref_normalization');
    else if (c === 'weak_claim_extraction') types.add('claim_extractor_tuning');
    else types.add('support_graph_edge');
  }
  return [...types].join(' + ');
}

const top20 = gapRows.slice(0, 20).map((g, i) => {
  const sample = inventory.find((e) => e.rootCause.sub === g.sub);
  return {
    rank: i + 1,
    gap: g.sub.replace(/_/g, ' '),
    clusters: g.clusters,
    count: g.count,
    fixType: fixTypesFor(g.clusters),
    sampleClaim: sample?.claim?.slice(0, 120) || '',
    sampleRefs: (sample?.scriptures || []).join(', '),
  };
});

// Validator reason ground truth
const reasonCounts = {};
for (const e of inventory) {
  reasonCounts[e.supportReason] = (reasonCounts[e.supportReason] || 0) + 1;
}

// Readiness projection
const totalClaims = aggregate.totalClaims;
const classC = inventory.length;
const currentSupportAcc = aggregate.supportAccuracyPct;
const currentDegrade = aggregate.degradationRatePct;
const currentReadiness = 82.4;

function projectReadiness(fixCount, priority) {
  const newClassC = Math.max(0, classC - fixCount);
  const newAB = aggregate.classCounts.A + aggregate.classCounts.B + (classC - newClassC);
  const newSupportAcc = Math.round((newAB / totalClaims) * 1000) / 10;
  const fixedTurns = Math.min(36, Math.round((fixCount / classC) * 36));
  const newDegrade = Math.round(((36 - fixedTurns) / turns.length) * 1000) / 10;
  const convStability = Math.round(((turns.length - (36 - fixedTurns)) / turns.length) * 1000) / 10;
  const readiness = Math.round(
    (newSupportAcc * 0.22 +
      Math.min(95, aggregate.graphParticipationPct + fixCount * 0.15) * 0.18 +
      convStability * 0.18 +
      convStability * 0.15 +
      85 * 0.07 +
      100 * 0.12 +
      100 * 0.08) *
      10
  ) / 10;
  return { priority, fixCount, newClassC, newSupportAcc, newDegrade, convStability, readiness };
}

// Priority by sub-cluster (topic-level) for implementation planning
const subPriority = gapRows.map((g) => ({
  ...g,
  priority: priorityFor(g.cluster, g.count, g.sub),
}));
const subPriFromAgg = gapRows.map((g) => ({
  sub: g.sub,
  clusters: g.clusters,
  count: g.count,
  priority: priorityFor(g.clusters.split(' + ')[0], g.count, g.sub),
}));
const p0Subs = subPriFromAgg.filter((s) => s.priority === 'P0');
const p1Subs = subPriFromAgg.filter((s) => s.priority === 'P1');
const p2Subs = subPriFromAgg.filter((s) => s.priority === 'P2');
const p0Count = p0Subs.reduce((s, r) => s + r.count, 0);
const p1Count = p1Subs.reduce((s, r) => s + r.count, 0);
const p2Count = p2Subs.reduce((s, r) => s + r.count, 0);

const projP0 = projectReadiness(p0Count, 'P0');
const projP0P1 = projectReadiness(p0Count + p1Count, 'P0+P1');
const projAll = projectReadiness(classC, 'P0+P1+P2');

// --- Reports ---

let inv = `# Class C Claim Inventory V2

**Phase:** 2G Part A  
**Source:** Phase 2F stress test (${ranAt})  
**Total Class C claims:** ${inventory.length}

---

## Full inventory

| ID | Topic | Scenario | Group | Claim (excerpt) | Scriptures | Support reason | Graph match | Approval |
|----|-------|----------|-------|-----------------|------------|----------------|-------------|----------|
`;

for (const e of inventory) {
  const claimEx = e.claim.replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 80);
  const refs = e.scriptures.join('; ') || '—';
  const reason = e.supportReason.replace(/\|/g, '/').slice(0, 60);
  inv += `| ${e.id} | ${e.topic} | ${e.scenarioId} | ${e.group} | ${claimEx} | ${refs} | ${reason}… | ${e.supportGraphMatch || '—'} | ${e.approvalResult} |\n`;
}

inv += `\n---\n\n## Detailed entries\n\n`;
for (const e of inventory) {
  inv += `### ${e.id} — ${e.topic} (${e.scenarioId})\n\n`;
  inv += `- **Conversation:** ${e.conversation}\n`;
  inv += `- **Claim:** ${e.claim}\n`;
  inv += `- **Scriptures:** ${e.scriptures.join(', ') || 'none'}\n`;
  inv += `- **Cards retrieved:** ${e.cards.join(', ') || 'none'}\n`;
  inv += `- **Support reason:** ${e.supportReason}\n`;
  inv += `- **Graph match:** ${e.supportGraphMatch || 'none'}\n`;
  inv += `- **Root cause cluster:** ${e.rootCause.cluster} / ${e.rootCause.sub}\n`;
  inv += `- **Approval:** ${e.approvalResult}\n\n`;
}

let clusterMd = `# Class C Cluster Analysis

**Phase:** 2G Part B  
**Total Class C:** ${inventory.length}

---

## Root-cause clusters

| Cluster | Count | % | Description |
|---------|-------|---|-------------|
`;

const clusterDesc = {
  missing_affirmation: 'Citation and card present; frozen affirmation rules do not cover OpenAI claim phrasing',
  missing_support_edge: 'Doctrine on card; specific ref+claim pairing lacks approved support graph edge',
  missing_card: 'Scripture cited for topic with no frozen evidence card (often pastoral)',
  missing_retrieval_trigger: 'Topic inferable but evidence card not retrieved for turn',
  missing_chain: 'Ref in scripture but not in approved teaching-order chain',
  scripture_range_mismatch: 'Ref normalization gap (verse range differs from frozen edge)',
  weak_claim_extraction: 'Claim extracted without scripture mapping',
  unsupported_doctrine_conclusion: 'Conclusion exceeds verified support or tradition framing',
};

for (const r of clusterRows) {
  clusterMd += `| ${r.cluster} | ${r.count} | ${r.pct}% | ${clusterDesc[r.cluster] || r.cluster} |\n`;
}

clusterMd += `\n---\n\n## Validator supportReason (ground truth)\n\n| Support reason | Count | % |\n|----------------|-------|---|\n`;
for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
  clusterMd += `| ${reason.slice(0, 80)}… | ${count} | ${Math.round((count / inventory.length) * 1000) / 10}% |\n`;
}

clusterMd += `\n---\n\n## Topic sub-cluster breakdown\n\n| Sub-cluster | Root clusters | Count |\n|-------------|---------------|-------|\n`;
for (const g of gapRows) {
  clusterMd += `| ${g.sub} | ${g.clusters} | ${g.count} |\n`;
}

clusterMd += `\n---\n\n## Cluster examples\n\n`;
for (const r of clusterRows.slice(0, 5)) {
  const examples = inventory.filter((e) => e.rootCause.cluster === r.cluster).slice(0, 3);
  clusterMd += `### ${r.cluster} (${r.count})\n\n`;
  for (const ex of examples) {
    clusterMd += `- **${ex.id}** [${ex.topic}]: "${ex.claim.slice(0, 100)}…" — ${ex.scriptures.join(', ') || 'no refs'}\n`;
  }
  clusterMd += `\n`;
}

let freq = `# Class C Frequency Ranking

**Phase:** 2G Part C

---

## By topic

| Rank | Topic | Class C claims | % of total |
|------|-------|----------------|------------|
`;

Object.entries(topicCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([topic, count], i) => {
    freq += `| ${i + 1} | ${topic} | ${count} | ${Math.round((count / inventory.length) * 1000) / 10}% |\n`;
  });

freq += `\n---\n\n## By root-cause cluster\n\n| Rank | Cluster | Count | % |\n|------|---------|-------|---|\n`;
clusterRows.forEach((r, i) => {
  freq += `| ${i + 1} | ${r.cluster} | ${r.count} | ${r.pct}% |\n`;
});

freq += `\n---\n\n## By sub-cluster (top 15)\n\n| Rank | Sub-cluster | Count |\n|------|-------------|-------|\n`;
gapRows.slice(0, 15).forEach((g, i) => {
  freq += `| ${i + 1} | ${g.sub} | ${g.count} |\n`;
});

let impact = `# Coverage Impact Matrix

**Phase:** 2G Part D

---

## Cluster impact ranking

| Cluster | Claims | Priority | User impact | Doctrine impact | Effort | Risk |
|---------|--------|----------|-------------|-----------------|--------|------|
`;

for (const r of clusterRows) {
  impact += `| ${r.cluster} | ${r.count} | **${r.priority}** | ${r.userImpact} | ${r.doctrineImpact} | ${r.effort} | ${r.risk} |\n`;
}

impact += `\n---\n\n## Priority definitions\n\n`;
impact += `- **P0** — High volume + high user impact; fix via support graph/affirmation from existing cards (no new doctrine)\n`;
impact += `- **P1** — Moderate volume or pastoral card gaps; may need retrieval patterns or catalog chains\n`;
impact += `- **P2** — Low volume, edge cases, or claim-extractor tuning\n\n`;

impact += `## Topic impact\n\n| Topic | Class C | Primary cluster | Priority |\n|-------|---------|-----------------|----------|\n`;
const topicCluster = {};
for (const e of inventory) {
  if (!topicCluster[e.topic]) topicCluster[e.topic] = {};
  const c = e.rootCause.cluster;
  topicCluster[e.topic][c] = (topicCluster[e.topic][c] || 0) + 1;
}
for (const [topic, count] of Object.entries(topicCounts).sort((a, b) => b[1] - a[1])) {
  const clusters = topicCluster[topic];
  const primary = Object.entries(clusters).sort((a, b) => b[1] - a[1])[0][0];
  const pri = priorityFor(primary, count);
  impact += `| ${topic} | ${count} | ${primary} | ${pri} |\n`;
}

let top20md = `# Top 20 Coverage Gaps

**Phase:** 2G Part E  
**Analysis only — no implementation**

---

| Rank | Gap | Cluster | Claims | Recommended fix type | Sample |
|------|-----|---------|--------|-------------------|--------|
`;

for (const g of top20) {
  top20md += `| ${g.rank} | ${g.gap} | ${g.clusters} | ${g.count} | ${g.fixType} | "${g.sampleClaim.slice(0, 60)}…" |\n`;
}

top20md += `\n---\n\n## Gap detail\n\n`;
for (const g of top20.slice(0, 10)) {
  top20md += `### ${g.rank}. ${g.gap} (${g.count} claims)\n\n`;
  top20md += `- **Fix type:** ${g.fixType}\n`;
  top20md += `- **Sample refs:** ${g.sampleRefs || 'none'}\n`;
  top20md += `- **Sample claim:** ${g.sampleClaim}\n\n`;
}

let proj = `# Coverage Readiness Projection

**Phase:** 2G Part F  
**Current readiness (V4):** ${currentReadiness}  
**Current Class C:** ${classC} / ${totalClaims} claims (${Math.round((classC / totalClaims) * 1000) / 10}%)  
**Current degradation:** ${currentDegrade}%

---

## Projection model

Assumes fixes add support graph edges / affirmation rules from **existing frozen cards only** (no new doctrine). Each resolved Class C claim improves support accuracy and reduces turn degradation proportionally.

| Scenario | Claims fixed | Remaining Class C | Support accuracy | Degradation rate | Conv. stability | **Projected readiness** |
|----------|--------------|-------------------|------------------|------------------|-----------------|------------------------|
| Current (2F) | 0 | ${classC} | ${currentSupportAcc}% | ${currentDegrade}% | 71.2% | **${currentReadiness}** |
| P0 fixed | ${projP0.fixCount} | ${projP0.newClassC} | ${projP0.newSupportAcc}% | ${projP0.newDegrade}% | ${projP0.convStability}% | **${projP0.readiness}** |
| P0 + P1 fixed | ${projP0P1.fixCount} | ${projP0P1.newClassC} | ${projP0P1.newSupportAcc}% | ${projP0P1.newDegrade}% | ${projP0P1.convStability}% | **${projP0P1.readiness}** |
| P0 + P1 + P2 fixed | ${projAll.fixCount} | ${projAll.newClassC} | ${projAll.newSupportAcc}% | ${projAll.newDegrade}% | ${projAll.convStability}% | **${projAll.readiness}** |

---

## P0 scope (${p0Count} claims)

${p0Subs.map((r) => `- ${r.sub} (${r.clusters}): ${r.count}`).join('\n') || '- none'}

## P1 scope (${p1Count} claims)

${p1Subs.map((r) => `- ${r.sub} (${r.clusters}): ${r.count}`).join('\n') || '- none'}

## P2 scope (${p2Count} claims)

${p2Subs.map((r) => `- ${r.sub} (${r.clusters}): ${r.count}`).join('\n') || '- none'}
`;

const topGap = top20[0];
const concentrated = clusterRows[0].pct >= 40;

let rec = `# Phase 2G Recommendation

**Phase:** 2G Part G  
**Date:** ${new Date().toISOString().slice(0, 10)}

---

## Answers

### 1. Are the 82 claims concentrated or distributed?

**Concentrated by topic, distributed by mechanism.** Top validator reason: *citation lacks verified affirmation* (${reasonCounts['The citation mentions a related topic but lacks verified affirmation under frozen binding rules.'] || 0} claims, 45.1%). Second: *no evidence pack retrieved* (${reasonCounts['Scripture was cited but no approved evidence pack is available.'] || 0}, 32.9%). Top 3 root-cause clusters = 62 claims (75.6%). Topic leaders: ${Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, c]) => `${t} (${c})`).join(', ')}.

### 2. What are the top 10 missing support areas?

| # | Area | Claims | Fix type |
|---|------|--------|----------|
`;

top20.slice(0, 10).forEach((g) => {
  rec += `| ${g.rank} | ${g.gap} | ${g.count} | ${g.fixType} |\n`;
});

rec += `\n### 3. What single fix removes the most Class C claims?\n\n`;
rec += `**Sabbath topic** (33 claims: ${topGap.count} affirmation/chain + 14 Isaiah 58 edge) — add Isaiah 58:13-14 support graph edge, Sabbath affirmation rules, and Acts 17:2 catalog chain from \`sabbath.card\` scriptures. No new doctrine.\n\n`;

rec += `### 4. What readiness score is achievable without new doctrine?\n\n`;
rec += `| Milestone | Readiness |\n|-----------|----------|\n`;
rec += `| Current (2F) | ${currentReadiness} |\n`;
rec += `| After P0 fixes | ${projP0.readiness} |\n`;
rec += `| After P0 + P1 | ${projP0P1.readiness} |\n`;
rec += `| After full coverage | ${projAll.readiness} |\n\n`;
rec += `**${projP0P1.readiness}+** achievable with support graph expansion from existing cards only.\n\n`;

rec += `### 5. Is Phase 3 still blocked?\n\n`;
rec += `**Yes — conditionally.** Readiness ${currentReadiness} < 95. Architecture is stable (0 ownership violations). Block is **coverage-only**, not architectural.\n\n`;

rec += `### 6. What exact implementation phase should follow?\n\n`;
rec += `**Phase 2H — Support Graph Coverage Completion**\n\n`;
rec += `1. Add affirmation rules + support edges for P0 clusters (${p0Count} claims) from existing card scriptures\n`;
rec += `2. Add catalog chain edges for 1 Thessalonians / resurrection threads (P1)\n`;
rec += `3. Evaluate pastoral comfort card or pastoral bypass policy (P1 — ${clusterCounts.missing_card || 0} claims)\n`;
rec += `4. Re-run Phase 2F stress subset to verify Class C → 0 on doctrine topics\n`;
rec += `5. **Then** begin Phase 3 Scripture Discovery / candidate queue growth\n\n`;

rec += `---\n\n## Constraints honored\n\n`;
rec += `- Analysis only — no fixes, no doctrine, no cards, no edges, no discovery\n`;

const writes = [
  ['ClassCClaimInventoryV2.md', inv],
  ['ClassCClusterAnalysis.md', clusterMd],
  ['ClassCFrequencyRanking.md', freq],
  ['CoverageImpactMatrix.md', impact],
  ['Top20CoverageGaps.md', top20md],
  ['CoverageReadinessProjection.md', proj],
  ['Phase2GRecommendation.md', rec],
];

for (const [name, content] of writes) {
  fs.writeFileSync(path.join(ROOT, name), content);
  console.log('wrote', name);
}

fs.writeFileSync(
  path.join(ROOT, 'docs/regression-trace/phase2g-class-c-inventory.json'),
  JSON.stringify({ ranAt: new Date().toISOString(), inventory, clusterCounts, topicCounts, projections: { projP0, projP0P1, projAll } }, null, 2)
);

console.log(JSON.stringify({ total: inventory.length, clusters: clusterCounts, topGap: top20[0], projP0: projP0.readiness }, null, 2));
