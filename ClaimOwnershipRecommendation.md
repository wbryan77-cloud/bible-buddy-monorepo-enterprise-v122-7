# Claim Ownership Recommendation

**Date:** 2026-06-07  
**Phase:** 1D — PART D  
**Decision:** **Hybrid architecture — BibleBuddy-owned claims (primary), OpenAI-owned reply + scripture[] (stable contract)**

---

## Recommendation

| Layer | Owner | Rationale |
|-------|-------|-----------|
| **`reply`** | OpenAI | 6/6 reliable; user-facing prose quality proven |
| **`scripture[]`** | OpenAI | 6/6 reliable; latent witness structure |
| **`claims[]`** | **BibleBuddy** | 0/6 OpenAI compliance; validator requires deterministic structure |
| **`doctrineConclusion`** | **BibleBuddy** | 0/6 OpenAI compliance; derivable from first A claim or lead sentence |
| **Validation** | Existing `validateClaimToScripture` | No new validators per scope |
| **Approval** | Existing degradation gate | No changes per scope |

---

## Why not Option 1 alone (OpenAI-owned claims)

1. **0/6 compliance** after infrastructure proof — not a flaky edge case
2. **Competing schema** in `buildSystemPrompt` — model follows legacy shape 100% of measured turns
3. **Fighting stable behavior** is higher risk than extracting from stable output
4. **Auditability** today is illusory — `c_inferred` masks non-compliance

Option 1 remains a **future enhancement lane** if `json_schema` + unified prompt achieves >80% raw `claims[]` in compliance tests.

---

## Why not Option 2 alone (reply-only)

1. **`c_inferred` proven inadequate** — 0% A/B, 0% ref attachment
2. **Reply-only** cannot reach 95% traceability (see `ClaimExtractionFeasibilityReport.md`)
3. Model **already emits** `scripture[]` — ignoring it wastes 6/6 available structure

---

## Why Hybrid

| Principle | Hybrid expression |
|-----------|-------------------|
| **Accept what works** | Keep `reply` + `scripture[]` as OpenAI contract |
| **Own what matters** | BibleBuddy derives `claims[]` for Authority Engine |
| **Deterministic authority** | Extraction rules versioned, fixture-tested |
| **No extra Render cost** | No second compose call required for v1 |
| **Doctrine safety** | Filter refs against approved evidence graph before validator |
| **Incremental path** | Phase 1E: `scripture[]` witness mapper → sentence linker → deprecate `c_inferred` |

---

## Proposed claim derivation order (future — not implemented)

```
1. scripture[] → witness claims (reference + reason)
2. reply sentence split → inline ref attachment
3. dedupe + approved-graph filter
4. if zero doctrine claims → safe denial claim or regen hint (not c_inferred monolith)
5. doctrineConclusion ← lead A claim or first sentence
```

---

## What not to do

| Action | Why |
|--------|-----|
| Add doctrine / evidence cards | Out of scope |
| Add validators | Existing validator sufficient if claims are well-formed |
| Fix prompts now | Phase 1D is decision-only |
| Keep `c_inferred` as long-term strategy | Proven 0% traceability |

---

## Success criteria for Phase 1E (implementation phase)

| Metric | Target |
|--------|--------|
| Raw OpenAI `claims[]` dependency | **0%** — extraction owns claims |
| Claims with `supportingScriptures` | **≥80%** on 6-topic suite |
| Validator A/B rate | **≥40%** on evidence-aligned topics (stretch: 60%) |
| `c_inferred` usage | **0%** on doctrine turns |
| Extra API calls | **0** |

95% traceability remains a **Phase 2** goal; 80% structured ref attachment is the realistic Phase 1E bar.
