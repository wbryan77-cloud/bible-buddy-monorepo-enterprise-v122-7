# Claim Support Accuracy Report

**Date:** 2026-06-08  
**Regression:** `docs/regression-trace/phase2b-support-relationship-regression.json`  
**Topics:** 9 live OpenAI compose runs

---

## Aggregate metrics

| Metric | Value |
|--------|-------|
| Topics run | 9 |
| OpenAI success | 9/9 (100%) |
| Total claims | 57 |
| Class A (direct) | 20 (35%) |
| Class B (indirect) | 10 (18%) |
| Class C (insufficient) | 27 (47%) |
| Class D (contradicted) | 0 (0%) |
| **Support accuracy** | **53%** (A+B / total) |
| Validator pass | 2/9 (22%) |
| Approval approved | 2/9 (22%) |
| Approval degraded | 7/9 (78%) |
| Claims with `supportReason` | 57/57 (100%) |

**Support accuracy** = percentage of claims classified A or B (verified direct or indirect support).

**Degradation rate** = turns where approval gate degraded due to validator failure = 7/9 = **78%**.

---

## Per-topic breakdown

| Topic | Claims | A | B | C | D | Support % | Validator | Approval |
|-------|--------|---|---|---|---|-----------|-----------|----------|
| Third heaven | 10 | 5 | 2 | 3 | 0 | 70% | fail | degraded |
| Kingdom | 8 | 6 | 0 | 2 | 0 | 75% | fail | degraded |
| Acts 10 | 4 | 2 | 0 | 2 | 0 | 50% | fail | degraded |
| Pork | 5 | 3 | 0 | 2 | 0 | 60% | fail | degraded |
| Sabbath | 10 | 0 | 0 | 10 | 0 | 0% | fail | degraded |
| Death state | 6 | 3 | 3 | 0 | 0 | **100%** | **pass** | **approved** |
| Resurrection | 6 | 1 | 5 | 0 | 0 | **100%** | **pass** | **approved** |
| Logos | 6 | 0 | 0 | 6 | 0 | 0% | fail | degraded |
| Holy | 2 | 0 | 0 | 2 | 0 | 0% | fail | degraded |

---

## Clean passes

### Death state (100% support accuracy)

All 6 claims are A or B. Key verified claims:

- Ecclesiastes 9:5 — dead know nothing (A, binding rule)
- John 11:11-14 — death as sleep (A, binding rule)
- Psalm 146:4, 1 Thessalonians 4:13-16 — chain support (B)

### Resurrection (100% support accuracy)

All 6 claims are A or B. Death-state evidence card reused correctly; no C claims.

---

## Degraded topics — root causes

### Third heaven (70% — 3 C claims)

| Issue | Claims |
|-------|--------|
| `unsupported_citation` | Matthew 6:10 not in heavens evidence graph |
| `citation_without_verified_support` | Revelation 21:1-3 lacks frozen affirmation on heavens card |

Core third-heaven claims (2 Cor 12:2, John 3:13) are **class A**.

### Kingdom (75% — 2 C claims)

| Issue | Claims |
|-------|--------|
| `citation_without_verified_support` | John 14:3 witness claim |
| `unsupported_citation` | Matthew 6:10 sentence ref (range mismatch: graph has 6:9-10) |

### Acts 10 / Pork (50–60% — Acts 10:28 unverified)

Acts 10:28 claims about vision concerning people not food are **class C** — citation present but no frozen affirmation rule on `dietaryLaw` card. Leviticus 11 / Deuteronomy 14 unclean claims are **class A**.

### Sabbath (0% — all C)

Sabbath evidence card has teaching-order refs but **no frozen affirmation rules** for witness claims. All 10 claims rejected as `citation_without_verified_support` or `unsupported_citation`.

### Logos (0% — all C)

`messiahLogos` card retrieved but John 1 / Genesis 1 claims lack verified affirmations under frozen rules.

### Holy (0% — all C)

No evidence pack retrieved (`evidenceCardUsed: null`). Both claims get `ungrounded_no_evidence_pack`.

---

## Class D (contradicted)

**0 contradicted claims** across all 9 topics in this run. The engine correctly avoided false D classifications on live compose output. Fixture tests confirm D detection still works for known bad patterns (9/9 pass in `baeClaimValidatorFixtures.js`).

---

## Comparison to Phase 2A

| Metric | Phase 2A (7 topics) | Phase 2B (9 topics) |
|--------|---------------------|---------------------|
| Claims with refs | 100% | 100% |
| `supportReason` on every claim | N/A | **100%** |
| Class A+B rate | ~partial (no per-claim reason) | **53%** aggregate |
| Validator pass | 1/7 | 2/9 |
| Death state pass | yes | yes (confirmed) |

Phase 2B adds **explainable support verification** without reducing ref attachment from Phase 2A.

---

## Key finding

Support verification is working: claims now carry explicit `supportClass`, `supportReason`, and `confidence`. The bottleneck has shifted from citation mapping (solved in 2A) to **evidence graph affirmation coverage** — topics with rich frozen affirmations (death state) pass cleanly; topics with refs but no affirmations (sabbath, logos, holy) fail even when citations are topically correct.
