# Phase 3 Scripture Discovery Preparation

**Date:** 2026-06-08  
**Status:** Design only — no implementation

---

## Prerequisites met (Phase 2E)

| Gate | Status |
|------|--------|
| Support accuracy ≥85% | ✅ 100% |
| Approval rate ≥90% | ✅ 100% |
| Class C near zero | ✅ 0 |
| Readiness ≥85 | ✅ 97.8 |
| Ownership intact | ✅ 18/18 hard cutover |

---

## Phase 3 scope (design only)

Phase 3 introduces **Scripture relationship discovery** as a **candidate proposal pipeline** — not automatic doctrine change.

### What Phase 3 is

- Scan approved catalog seeds Genesis → Revelation
- Propose support/caution/limit edges
- Queue candidates for admin review
- Promote approved edges to `APPROVED_SUPPORT_EDGES` after regression

### What Phase 3 is NOT

- IOG ingestion
- Learning engine
- Automatic doctrine approval
- Responder/template restoration
- OpenAI prompt changes
- Final-answer prose generation

---

## Candidate queue flow

```
Theme question / card retrieval
    ↓
Approved catalog seeds (teachingOrder)
    ↓
Concordance expansion (approved index only)
    ↓
Cluster verses by frozen theme keys
    ↓
Propose edge candidate
    ↓
supportGraphCandidateQueue.js (pending_review)
    ↓
STOP — no auto-promote
```

---

## Admin review workflow

1. **Review queue** — `data/support-graph-candidates.jsonl`
2. **Verify source** — candidate `source` must point to frozen card/catalog/registry field
3. **Approve or reject** — manual status change
4. **Promote** — admin adds edge to `approvedSupportGraph.js` with `approved: true`
5. **Regression** — `phase2bSupportRelationshipRegression.js` + fixtures
6. **Traceability** — matrix v2 shows `supportGraphMatch` for new edge

---

## Scripture relationship discovery (future)

| Discovery type | Output edge type |
|----------------|------------------|
| Verse explicitly states claim pattern | `directly_affirms` |
| Verse in teaching order, line upon line | `indirectly_supports` |
| Caution passage pattern | `cautions_against` |
| Binding rule limits over-strong claim | `limits_claim` |
| Citation denial pattern | `contradicts` |
| No approved proof | `scripture_silent` → candidate only |

Confidence: high (bindingRule match) → medium (catalog chain) → low (concordance thematic).

---

## Promotion process

| Step | Actor | Action |
|------|-------|--------|
| 1 | BibleBuddy | Write candidate with `autoApplied: false` |
| 2 | Admin | Review `proposedClaim`, `scriptures`, `reason` |
| 3 | Admin | Confirm no new doctrine beyond frozen source |
| 4 | Engineer | Add edge to support graph |
| 5 | CI | Run regression battery |
| 6 | Admin | Mark candidate `approved` or `rejected` |

---

## Approval safeguards

| Safeguard | Enforcement |
|-----------|-------------|
| No auto-promote | Queue write-only; no graph mutation from queue |
| No answer change | Discovery never touches compose `reply` |
| No card mutation | Cards frozen; edges reference card fields |
| No IOG | Out of scope until separate gate |
| OpenAI narrator only | Discovery in BB services post-compose path |
| Measurable | Every edge has `id`, `source`, regression proof |

---

## Recommended Phase 3 sequence

1. **3A** — Admin approve Holy card (`HolyEvidenceCardRecommendation.md`)
2. **3B** — Pilot candidate queue on Sabbath catalog chain (Acts 13:42-44 from `bibleTopicCatalog`)
3. **3C** — Manual promotion workflow + admin UI/script
4. **3D** — Concordance-assisted candidate proposals (read-only scan)
5. **3E** — IOG gate review (separate decision; not automatic)

---

## Stop conditions (unchanged)

Stop Phase 3 implementation if any step requires:

- New doctrine conclusions
- External teaching ingestion
- Prompt rewrites
- Responder restoration
- Automatic doctrine approval
- OpenAI doctrine ownership
