# Evidence Coverage Readiness Score

**Date:** 2026-06-08  
**Basis:** Phase 2B regression (9 topics, 57 claims)  
**Purpose:** Measure how ready each topic is for authority approval without new responders or prompts

---

## Scoring model

Each topic scored 0–100 across five layers:

| Layer | Weight | What it measures |
|-------|--------|------------------|
| L1 Retrieval | 20 | Evidence card retrieved for question |
| L2 Ref graph | 20 | Cited refs present in approved graph |
| L3 Affirmations | 30 | Frozen affirmation rules prove claims |
| L4 Catalog chain | 15 | Teaching order enables class B |
| L5 Validator pass | 15 | Turn-level approval achieved |

**Readiness tier:**
- **Green (≥80):** Push-ready with traceability
- **Yellow (50–79):** Card present; verifier encoding gap
- **Red (<50):** Retrieval or structural gap

---

## Topic scores

| Topic | L1 | L2 | L3 | L4 | L5 | **Total** | Tier | Class C |
|-------|----|----|----|----|-----|-----------|------|---------|
| Death state | 20 | 20 | 30 | 15 | 15 | **100** | Green | 0 |
| Resurrection | 20 | 20 | 28 | 15 | 15 | **98** | Green | 0 |
| Kingdom | 20 | 16 | 18 | 15 | 0 | **69** | Yellow | 2 |
| Third heaven | 20 | 17 | 20 | 15 | 0 | **72** | Yellow | 3 |
| Pork | 20 | 20 | 12 | 0 | 0 | **52** | Yellow | 2 |
| Acts 10 | 20 | 20 | 10 | 0 | 0 | **50** | Yellow | 2 |
| Sabbath | 20 | 18 | 0 | 0 | 0 | **38** | Red | 10 |
| Logos | 20 | 20 | 0 | 0 | 0 | **40** | Red | 6 |
| Holy | 0 | 0 | 0 | 0 | 0 | **0** | Red | 2 |

### Layer notes

**Death state / Resurrection (Green):** Full stack — `deathState` card, `stateOfTheDead` catalog, affirmations via binding_rule + chain paths. Proof that the architecture works when all layers are populated.

**Kingdom / Third heaven (Yellow):** Retrieval and most refs work; 70–75% support accuracy. Gaps are ref normalization (Matt 6:10) and missing affirmations for John 14:3 / Rev 21. High readiness — small verifier work unlocks approval.

**Pork / Acts 10 (Yellow at floor):** Card and refs complete; Leviticus affirmations work (class A). Acts 10:28/11 claims fail only at affirmation layer. Two rules away from green.

**Sabbath (Red):** Card retrieves and refs mostly on-card, but **L3=0** (no affirmations, no bindingRules on card) and **L4=0** (no catalog in `approvedCatalogEvidence`). Structural verifier gap, not retrieval gap.

**Logos (Red):** Card retrieves; refs on-card; **L3=0, L4=0**. Same pattern as Sabbath without catalog history in codebase.

**Holy (Red at zero):** Complete retrieval failure — no card, no graph, no validator path.

---

## Aggregate readiness

| Metric | Score |
|--------|-------|
| Mean topic readiness | **58.6 / 100** |
| Topics Green | 2 / 9 (22%) |
| Topics Yellow | 4 / 9 (44%) |
| Topics Red | 3 / 9 (33%) |
| Claim-level support accuracy | 53% (30/57 A+B) |
| Approval rate | 22% (2/9 turns) |

---

## Coverage gap by layer (27 Class C claims)

| Failed layer | Claims | % of Class C |
|--------------|--------|--------------|
| L3 — No affirmation rule | 21 | 78% |
| L2 — Ref not in graph | 3 | 11% |
| L1 — No evidence card | 2 | 7% |
| L1+L2 — Ref not on card (Acts 13) | 1 | 4% |

---

## Readiness after recommended fixes (projected)

| Phase | Actions | Mean readiness | Approval rate |
|-------|---------|----------------|---------------|
| Current (2B) | — | 58.6 | 22% |
| P0 (2D) | Ref norm + dietary + kingdom affirmations | ~72 | ~56% (5/9) |
| P1 (2E) | Sabbath + Logos affirmations/catalog | ~85 | ~78% (7/9) |
| P1 + Holy card | Admin-reviewed holy card | ~90 | ~89% (8/9) |

---

## IOG readiness gate

IOG ingestion should not begin until:

| Gate | Threshold | Current |
|------|-----------|---------|
| Green topics | ≥5 of 9 | 2 |
| Mean readiness | ≥75 | 58.6 |
| Class C rate | ≤25% | 47% |
| False D rate | 0% on regression | ✅ 0% |
| traceability `supportReason` | 100% | ✅ 100% |

**IOG readiness: NOT READY** — score 42/100 on ingestion prerequisites.

---

## Evidence asset inventory vs verifier encoding

| Card | Exists | bindingRules | Catalog | Affirmations in verifier | Encoded? |
|------|--------|--------------|---------|--------------------------|----------|
| deathState | ✅ | via catalog themes | stateOfTheDead | partial + chain | ✅ |
| kingdom | ✅ | 6 rules | kingdomComesToEarth | 1 (matt6_10) | ⚠️ partial |
| heavens | ✅ | 5 rules | threeHeavens | 2 (2cor12, john3_13) | ⚠️ partial |
| dietaryLaw | ✅ | 0 | none | 1 (lev11) | ⚠️ partial |
| sabbath | ✅ | 0 | none | 0 | ❌ |
| messiahLogos | ✅ | 0 | none | 0 | ❌ |
| holy | ❌ | — | — | 0 | ❌ |

**Finding:** Evidence assets exist for 6/7 doctrine topics. The readiness bottleneck is **verifier encoding** (affirmations), not missing doctrine content — except holy (no card).

---

## Conclusion

BibleBuddy is **retrieval-ready** and **claim-extraction-ready** but **not approval-ready** at scale. Two topics prove end-to-end authority (death state, resurrection). The path to green is incremental verifier encoding from frozen cards — not new answer paths, prompts, or IOG.

**Next safest phase:** Phase 2D — reference normalization (P0-1) then affirmation rules from frozen card text (P0-2, P0-3), measured by re-running `phase2bSupportRelationshipRegression.js`.
