# Claim Inference Audit

**Date:** 2026-06-07  
**Phase:** 1D — PART B  
**Subject:** `c_inferred` in `services/claimNormalizer.js`  
**Live sample:** Phase 1C — 6/6 doctrine turns

---

## Implementation

```38:47:services/claimNormalizer.js
  if (!claims.length && reply && !SAFE_DENIAL_RE.test(reply)) {
    claims.push({
      claimId: 'c_inferred',
      claim: String(reply).slice(0, 280),
      type: 'doctrine',
      supportingScriptures: [],
      confidence: 'low',
      derivedFrom: 'inferred_from_reply',
    });
  }
```

**Trigger conditions:**

1. No claims after normalizing raw `claims[]`
2. `reply` is non-empty
3. Reply does **not** match `SAFE_DENIAL_RE` (`/scripture does not state that directly/i`) anywhere in full text

---

## Accuracy

| Metric | Measured | Assessment |
|--------|----------|------------|
| Fires when raw `claims[]` missing | **6/6** (100%) | Correct trigger |
| Attaches `supportingScriptures` | **0/6** (0%) | **Fails core purpose** — validator always sees `ungrounded_claim` |
| Preserves full reply | **0/6** — truncates at 280 chars | **Lossy** on long answers (third heaven ~845 chars, sabbath ~743) |
| Atomic claim decomposition | **0/6** — always exactly 1 claim | **Incorrect granularity** |
| `derivedFrom` trace | `inferred_from_reply` | Auditable but marks low-confidence fallback |

**Accuracy verdict:** `c_inferred` guarantees a claim **exists** for the validator but does **not** accurately represent doctrine structure or evidence linkage.

---

## False positives

A **false positive** here means: a claim is inferred that should not be validated as a single doctrine unit, or non-doctrine content is swept into a doctrine claim.

| Pattern | Risk | Example from Phase 1C |
|---------|------|----------------------|
| **Monolithic reply → one doctrine claim** | **High** | Sabbath reply mixes practical guidance + multiple Scripture points → one `c_inferred` blob |
| **Pastoral framing treated as doctrine** | Medium | Companion tone sentences bundled with doctrine |
| **Multiple assertions collapsed** | **High** | Third heaven reply discusses layers, Paul's vision, and destination — one claim |
| **Pre-degradation vs post-degradation** | Medium | E2E run appended denial phrase **after** inference on earlier compose attempt |

`c_inferred` does **not** create false **D** classifications directly (no refs → **C**, not **D**). It creates false **validation workload** and masks missing structured output.

---

## False negatives

A **false negative** means: doctrine assertions exist but no claim is produced.

| Pattern | Risk | Mechanism |
|---------|------|-----------|
| **Denial phrase anywhere in reply** | **High** | `SAFE_DENIAL_RE.test(reply)` → **no claim at all** if entire reply contains phrase |
| **Empty reply after guard strip** | Low | No inference |
| **Raw claims present but malformed** | Medium | Empty `claim` text skipped; may still infer if all items invalid |
| **Orphan forbidden prose** | Partial coverage | `scanReplyOrphans` runs on reply separately — can catch D patterns **not** in `c_inferred` text if inference skipped |

**Truncation false negative:** Assertions after char 280 are **invisible** to claim-based validator (still visible to `scanReplyOrphans` on full reply).

---

## Doctrine risk

| Risk | Severity | Detail |
|------|----------|--------|
| **Ungrounded validation pass illusion** | Medium | Claim exists → validator runs → always **C** → degraded answer ships. User sees doctrine prose; authority trace shows rejection. |
| **Missed contradiction in truncated tail** | Medium | Forbidden pattern after char 280 only caught by orphan scan, not claim classify |
| **Citation laundering not testable** | **High** | Without `supportingScriptures`, `verifyCitationSupportsClaim` never runs — D patterns in citations go unlinked |
| **Inference hides OpenAI non-compliance** | **High** | Ops cannot distinguish model-authored vs inferred claims without checking `claimId` |

---

## Coverage

| Coverage area | `c_inferred` performance |
|---------------|--------------------------|
| Phase 1C doctrine turns | **100%** inference rate (6/6) |
| Validator class A/B | **0%** (0/6) |
| Validator class C | **100%** (6/6) — `ungrounded_claim` |
| `supportingScriptures` populated | **0%** |
| Multi-claim replies | **0%** — always 1 claim |
| `scripture[]` utilization | **0%** — parallel array ignored |

---

## Relationship to `scripture[]`

Phase 1C: model returns `scripture[]` on **6/6** turns (3–7 entries each) with `reference`, `text`, `reason`. `c_inferred` **does not read `scripture[]`**. Citation data sits in the wrong field and is wasted for claim validation.

---

## PART B verdict

`c_inferred` is a **placeholder**, not a claim extraction system. It:

- ✅ Prevents empty `claims[]` from skipping validator
- ❌ Does not achieve doctrine traceability
- ❌ Collapses multi-assertion replies
- ❌ Ignores the only structured citation data the model reliably produces

**Inference audit score: 2 / 10** for Authority Engine readiness.
