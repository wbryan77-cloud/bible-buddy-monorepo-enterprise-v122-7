# Authority Order Scorecard

**Date:** 2026-06-07  
**Purpose:** Evidence Driven % vs Model Driven % per doctrine area  
**Status:** Diagnosis only

---

## Scoring method

| Metric | Formula |
|--------|---------|
| **Evidence Driven %** | `(A + B claims) / total doctrine units × 100` |
| **Model Driven %** | `(C + D claims) / total doctrine units × 100` |
| **Doctrine unit** | One classified claim from `claims[]` or orphan reply scan |

**Live scores:** `null` when `pipelineBlocked` (no claims to score).  
**Offline scores:** Representative model-prior vs evidence-aligned claim per topic via `validateClaimToScripture`.

---

## Live scorecard (this run)

**Run:** `scriptureAuthorityAuditRunner.js` — all topics `openaiCalled: false`

| Rank | Topic | Evidence Driven % | Model Driven % | Pipeline | Retrieval |
|------|-------|-------------------|----------------|----------|-----------|
| — | Third heaven | *unmeasured* | *unmeasured* | blocked | ✅ heavens |
| — | Kingdom | *unmeasured* | *unmeasured* | blocked | ✅ kingdom |
| — | Acts 10 | *unmeasured* | *unmeasured* | blocked | ✅ dietaryLaw |
| — | Pork | *unmeasured* | *unmeasured* | blocked | ✅ dietaryLaw |
| — | Sabbath | *unmeasured* | *unmeasured* | blocked | ✅ sabbath |
| — | Death state | *unmeasured* | *unmeasured* | blocked | ✅ deathState |
| — | Resurrection | *unmeasured* | *unmeasured* | blocked | ✅ deathState |
| — | Logos | *unmeasured* | *unmeasured* | blocked | ✅ messiahLogos |
| — | Holy | *unmeasured* | *unmeasured* | blocked | ❌ no card |

---

## Offline scorecard — typical model prior claim

*If OpenAI emitted common Christian training as a doctrine claim:*

| Rank | Topic | Evidence % | Model % | Class | Top leak pattern |
|------|-------|------------|---------|-------|------------------|
| 1 | **Third heaven** | 0% | **100%** | D | Believers' destination in third heaven |
| 1 | **Kingdom** | 0% | **100%** | D | Kingdom in heaven after death |
| 1 | **Acts 10** | 0% | **100%** | D | Pork / all foods clean |
| 1 | **Pork** | 0% | **100%** | D | Yes, pork permitted |
| 1 | **Sabbath** | 0% | **100%** | D | Sunday replaced Sabbath |
| 1 | **Death state** | 0% | **100%** | D | Immediate heaven at death |
| 7 | **Resurrection** | 0% | **100%** | C | Resurrection away from earth |
| 8 | **Logos** | 0% | **100%** | C | NIV/trinitarian gloss |
| 9 | **Holy** | 0% | **100%** | C | No approved evidence |

**Validator blocks all model-prior simulations** (D or C) — none would score as evidence-driven without claim revision.

---

## Offline scorecard — evidence-aligned claim attempt

*If OpenAI emitted claims matching frozen cards:*

| Topic | Evidence % | Model % | Class | Verdict |
|-------|------------|---------|-------|---------|
| Third heaven | **100%** | 0% | A | Paul names third heaven only |
| Kingdom | **100%** | 0% | A | Kingdom on earth |
| Death state | **100%** | 0% | B | Sleep in death |
| Acts 10 | 0% | 100% | C | Verifier needs stronger denial framing |
| Pork | 0% | 100% | C | Positive Lev 11 cite unverified |
| Sabbath | 0% | 100% | C | Ex 20 cite needs binding match |
| Resurrection | 0% | 100% | C | Affirmation rules incomplete |
| Logos | 0% | 100% | C | Affirmation rules incomplete |
| Holy | 0% | 100% | C | No evidence card |

**Gap:** Even evidence-faithful wording can score **C** where `CITATION_SUPPORT_AFFIRMATIONS` / binding rules are thin (logos, resurrection, sabbath, pork).

---

## Top doctrine areas most influenced by model priors

Ranked by **likelihood × severity** of model training vs frozen evidence:

| Rank | Area | Model prior strength | Validator strength | Evidence card |
|------|------|---------------------|-------------------|---------------|
| **1** | **Afterlife / third heaven / death** | Very high (popular Christianity) | Strong (D rules) | heavens, deathState |
| **2** | **Kingdom hope misplaced to heaven** | Very high | Strong (D) | kingdom |
| **3** | **Dietary law / Acts 10 / pork** | Very high | Strong (D) | dietaryLaw |
| **4** | **Sabbath → Sunday** | High | Strong (D) | sabbath |
| **5** | **Resurrection geography** | Medium | Moderate (C) | deathState (routing) |
| **6** | **Logos / Christology wording** | Medium | Weak (C only) | messiahLogos |
| **7** | **Holy (general)** | High (only source) | None (no card) | **missing** |

---

## Example (user specification)

**Answer:** "The third heaven is where believers go after death."

| Analysis | Result |
|----------|--------|
| Evidence Driven | **0%** |
| Model Driven | **100%** |
| Class | **D** |
| Reason | No approved evidence supports believers' destination in third heaven; 2 Cor 12:2 names Paul's vision only |

**Validator:** `contradicted_third_heaven_destination` — would reject / degrade if claim extracted.

---

## Authority order conclusion

| Question | Answer |
|----------|--------|
| Is retrieval Scripture-grounded? | **Yes** for 8/9 topics |
| Does OpenAI receive evidence? | **Yes** (when compose runs) |
| Do model priors match frozen doctrine? | **Often no** — mainstream Christian training conflicts |
| Does validator prefer evidence over model? | **Yes** when `claims[]` present — D/C rejection |
| Can answers still leak model authority? | **Yes** — empty claims, orphan prose, holy gap, C citation leaks |
| Measured live in this run? | **No** — pipeline blocked |

---

## Re-run live scorecard

```bash
export OPENAI_API_KEY=<valid-key>
node scripts/scriptureAuthorityAuditRunner.js
# → docs/regression-trace/scripture-authority-audit.json
```

---

## Related documents

- [ScriptureAuthorityAudit.md](ScriptureAuthorityAudit.md)
- [ModelAuthorityLeakReport.md](ModelAuthorityLeakReport.md)

**No fixes implemented.**
