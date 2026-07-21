# Claim Extraction Feasibility Report

**Date:** 2026-06-07  
**Phase:** 1D — PART C  
**Question:** Can `reply` → local extraction → validator achieve **95%+ doctrine traceability** without OpenAI `claims[]`?

---

## Definition: doctrine traceability

For this audit, **doctrine traceability** means:

> Each doctrinal assertion in the user-visible answer is represented as an atomic claim with at least one `supportingScripture` from the approved evidence graph, classifiable as **A** or **B** by `validateClaimToScripture`.

(Not merely "a claim object exists" — which `c_inferred` achieves at 0% A/B.)

---

## Extraction paths evaluated

### Path 0 — Current `c_inferred` (baseline)

```
reply → slice(0,280) → claim, supportingScriptures: []
```

| Metric | Estimate |
|--------|----------|
| Ref attachment rate | **0%** |
| Validator A/B rate (Phase 1C) | **0%** |
| 95% traceability | **❌ No** |

---

### Path 1 — Reply-only sentence splitting + inline ref regex

```
reply → sentences → extract "John 1:1" etc. from sentence text → claim per sentence
```

| Factor | Assessment |
|--------|------------|
| Ref attachment | **40–60%** — model often cites inline (e.g. "Leviticus 11:7", "2 Corinthians 12:2") |
| Atomic claims | **50–70%** — compound sentences bundle multiple assertions |
| Approved-ref filter | **Required** — model cites unapproved refs (Logos raw: Colossians 1:15-17, Hebrews 1:1-3) |
| A/B after validator | **15–30%** — `CITATION_SUPPORT_AFFIRMATIONS` needs specific claim wording |

**95% traceability: ❌ Not feasible** with sentence split alone.

---

### Path 2 — `scripture[]` witness mapping

```
scripture[] → one claim per entry: { claim: reason, supportingScriptures: [reference] }
```

| Factor | Phase 1C data |
|--------|---------------|
| `scripture[]` availability | **6/6** (100%) |
| Entries per turn | 3–7 |
| `reason` field populated | **Yes** (raw JSON preview) |
| Approved refs only | **No** — model adds refs outside evidence pack |
| Claim text = `reason` vs reply alignment | Variable — may not match affirmation regex |

| Metric | Estimate |
|--------|----------|
| Ref attachment | **70–85%** (per witness row) |
| Validator A/B | **20–40%** — depends on `reason` wording vs affirmation rules |
| Multi-assertion gaps | Reply assertions **not** in `scripture[]` missed |

**95% traceability: ❌ Not feasible** as sole extractor.

---

### Path 3 — Hybrid local (reply sentences + `scripture[]` + evidence graph)

```
1. Map scripture[] → witness claims (ref + reason)
2. Sentence-split reply; merge refs from inline citations
3. Dedupe against approved evidence graph
4. Orphan scan on full reply (existing)
5. doctrineConclusion = first sentence or highest-confidence A claim
```

| Metric | Estimate |
|--------|----------|
| Claims with any ref | **75–90%** |
| Claims with **approved** ref only | **60–75%** |
| Validator A/B | **35–55%** on first pass without regen |
| Full traceability (A/B per assertion) | **50–70%** |

**95% traceability: ⚠️ Unlikely** without either OpenAI structured claims or a **second LLM extraction call**.

---

### Path 4 — Second-pass local LLM (not OpenAI compose claims)

```
reply + scripture[] + evidencePack → small structured extraction call → claims[]
```

| Metric | Estimate |
|--------|----------|
| Traceability | **80–92%** — still not guaranteed 95% |
| Render cost | **+1 API call per turn** |
| Determinism | Medium |

**95%: Possible but marginal** — adds cost/complexity similar to Option 1.

---

## Validator constraint (why 95% is hard)

Validator class **A** requires **both**:

1. Approved `supportingScriptures`
2. Claim text matching `CITATION_SUPPORT_AFFIRMATIONS` or binding rules

```188:190:services/claimToScriptureValidator.js
  if (!refs.length) {
    return { classification: 'C', issues: ['ungrounded_claim'], ... };
  }
```

Offline fixtures prove validator **works** when claims are well-formed (`baeClaimValidatorFixtures.js` — good third heaven claim → class **A**). The bottleneck is **claim formation**, not validation logic.

---

## Feasibility verdict

| Target | Reply-only (`c_inferred`) | Hybrid local (no OpenAI claims) | OpenAI `claims[]` (if compliant) |
|--------|---------------------------|--------------------------------|-----------------------------------|
| **95%+ doctrine traceability** | ❌ **0%** | ❌ **~50–70%** est. | ⚠️ **Unknown** (0% today; ceiling high if schema enforced) |
| **Claims exist for validator** | ✅ 100% (degraded) | ✅ High | ✅ If compliant |
| **No extra API cost** | ✅ | ✅ | ✅ |

### PART C answer

**No** — `reply` → local extraction → validator **cannot** reliably achieve **95%+ doctrine traceability** without OpenAI producing `claims[]` **or** an additional structured extraction pass.

**However:** Hybrid local extraction from `reply` + `scripture[]` can likely outperform `c_inferred` (**0% → ~50–70%** traceability) with **zero additional API cost** and **full determinism** — a meaningful Phase 1E target, not 95%.

---

## What Phase 1C data makes free

The model already provides **witness rows** (`reference` + `reason`) at 6/6. This is latent claim metadata in the wrong field. Mapping `scripture[]` → claims is the highest-feasibility local step **without** prompt changes (implementation deferred per instructions).
