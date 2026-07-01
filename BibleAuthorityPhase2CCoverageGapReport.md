# Bible Authority Phase 2C — Coverage Gap Report

**Date:** 2026-06-08  
**Phase:** 2C — Class C Coverage Gap Analysis  
**Status:** Analysis complete — **no implementation**

---

## Executive summary

Phase 2B proved the Support Relationship Engine works: every claim gets a class and reason. The bottleneck is not citation mapping (Phase 2A solved that) but **approved support proof**.

| Metric | Value |
|--------|-------|
| Total claims | 57 |
| Class C (insufficient) | 27 (47%) |
| Class A+B (verified) | 30 (53%) |
| Class D (contradicted) | 0 |
| Topics with 0 Class C | death_state, resurrection |

**Dominant failure mode:** `citation_without_verified_support` (24/27) — scripture is on-card or retrievable, but `claimSupportVerifier` has no frozen affirmation rule to prove the claim.

**Secondary failure mode:** `unsupported_citation` (3/27) — `Matthew 6:10` not matched to card entry `Matthew 6:9-10` (reference normalization gap).

**Retrieval failure:** holy topic — no evidence card retrieved (2/27).

---

## Part B — Root cause classification (all 27 claims)

| # | Topic | claimId | Primary cause | Explanation |
|---|-------|---------|---------------|-------------|
| 1 | third_heaven | c_witness_5 | **G** | Matt 6:10 not matched to card ref Matt 6:9-10 |
| 2 | third_heaven | c_witness_6 | **B** | Rev 21:1-3 on card; no affirmation rule on heavens turn |
| 3 | third_heaven | c_sent_10 | **G** | Matt 6:10 range mismatch (Rev 21 cited in text but not in claim refs) |
| 4 | kingdom | c_witness_2 | **B** | John 14:3 on card + bindingRules text; no affirmation rule |
| 5 | kingdom | c_sent_6 | **G** | Matt 6:10 vs Matt 6:9-10; would match affirmation if ref normalized |
| 6 | acts_10 | c_witness_3 | **B** | Acts 10:28 on card; cautionPassage supports but no affirmation |
| 7 | acts_10 | c_sent_4 | **B** | Duplicate witness; same affirmation gap |
| 8 | pork | c_witness_3 | **B** | Same Acts 10:28 gap |
| 9 | pork | c_witness_4 | **B** | Acts 11:1-18 on card; bibleFirstConclusion references it; no affirmation |
| 10–13, 15–19 | sabbath | c_witness_1–4,6–7, c_sent_8–10 | **B** + **H** | Card has scriptures but zero bindingRules, zero catalog chain, zero affirmations |
| 14 | sabbath | c_witness_5 | **A** + **B** | Acts 13:42-44 not on sabbath card at all |
| 20–25 | logos | all 6 | **B** + **H** | messiahLogos card has no bindingRules, no catalog, no affirmations |
| 26–27 | holy | both | **A** | No holy evidence card in retrieval registry |

**Not observed in this regression:** C (relationship not modeled as graph edge), D (claim too broad), E (engine too strict), F (invalid — should stay rejected), I (concordance/OL), J (OpenAI unnecessary claim) as **primary** causes. Some claims are broad (J-adjacent) but would pass with affirmations from frozen card text.

---

## Part C — Fix type recommendation (one per claim)

| Fix type | Meaning | Claims |
|----------|---------|--------|
| **5** Reference normalization | Matt 6:10 ↔ Matt 6:9-10 | #1, #3, #5 |
| **2** Add support affirmation rule | Encode existing card bindingRules/cautionPassages | #2, #4, #6–9, #10–13, #15–19, #20–25 |
| **1** Add/upgrade evidence card | Holy topic card + retrieval trigger | #26, #27 |
| **3** Scripture relationship edge | Acts 13:42-44 → sabbath card supportingScriptures | #14 |
| **9** Admin review required | Holy card scope; Hebrews 4:9 Sabbath semantics | #26–27, #19 *(optional review)* |
| **8** Keep rejected | None — all Class C claims are doctrinally aligned with frozen cards | — |

---

## Part D — Topic summaries

| Topic | Class C | Dominant cause | Safest fix | Risk | Expected impact |
|-------|---------|----------------|------------|------|-----------------|
| **Logos** | 6 | B — no affirmations on messiahLogos | **2** affirmation rules from card primaryScriptures | Medium — must not import Trinitarian tradition beyond card | 6 claims → A/B; topic pass possible |
| **Holy** | 2 | A — no card retrieved | **1** new card + retrieval pattern; **9** admin review | High — new topic asset | 2 claims fixed; enables validator on topic |
| **Sabbath** | 10 | B+H — card without rules/chain | **2** affirmations + **4** catalog chain from `bibleTopicCatalog.sabbath` | Medium — avoid sabbath history responder hijack | Largest single-topic gain (+10 claims) |
| **Acts 10** | 2 | B — Acts 10:28 affirmation missing | **2** rule from dietaryLaw cautionPassages | Low — card already states context | 2 claims; acts_10 pass possible |
| **Pork** | 2 | B — same as Acts 10 | **2** affirmation for Acts 10:28 + Acts 11 | Low | 2 claims; pork pass possible |
| **Kingdom** | 2 | G + B | **5** ref norm + **2** John 14:3 affirmation | Low | 2 claims; kingdom pass likely (6/8 already A) |
| **Third heaven** | 3 | G + B | **5** ref norm + **2** Rev 21 affirmation on kingdom/heavens bindingRules | Low | 3 claims; third_heaven pass likely (7/10 already A/B) |
| **Death state** | 0 | — | None needed | — | Baseline proof (100%) |
| **Resurrection** | 0 | — | None needed | — | Baseline proof (100%) |

---

## Part F — Safety rules (mandatory for any future fix)

1. **No final-answer responders** — fixes are metadata/verifier only; OpenAI still composes prose.
2. **No template prose** — evidence cards supply refs/rules, not answer templates.
3. **No study-loop fallback** — degraded approval stays; do not bypass with alternate speakers.
4. **No witness-path prose** — `scripture_witness` claims remain claims, not final reply injection.
5. **No external teaching auto-promoted** — affirmations derive from frozen card fields only.
6. **OpenAI remains narrator** — claims/conclusions validated post-compose.
7. **BibleBuddy owns doctrine support** — affirmations in `claimSupportVerifier`, not prompt rewrites.
8. **Evidence Cards = evidence, not scripts** — bindingRules/cautionPassages are source of truth for new rules.
9. **Measurable by claim traceability** — every fix must move specific claimIds in matrix v2 regression.

---

## Structural finding

The pipeline has three support proof layers:

```
Layer 1: Retrieval     → card + catalog present?     (holy fails here)
Layer 2: Ref graph     → citation in approved refs? (Matt 6:10 fails here)
Layer 3: Affirmation   → claim matches frozen rule?  (21 claims fail here)
```

Death state/resurrection succeed because all three layers are populated. Sabbath/logos fail at layer 3 despite layer 1 success. Holy fails at layer 1. Kingdom/third heaven partially fail at layer 2.

---

## What NOT to do next

| Action | Why avoid |
|--------|-----------|
| IOG pilot (F) | Adds ingestion surface before affirmation coverage proven |
| New responders/templates | Historical regression vector |
| Prompt changes (7) | Masks authority gap; OpenAI should not self-certify support |
| Validator loosening | Would approve unproven claims without traceability |
| Bulk evidence card expansion | Sabbath/logos cards exist — problem is verifier encoding |

---

## Final answer — next safest implementation phase

**Recommended: Phase 2D = C (Add support affirmation rules) with D (reference normalization) as first commit in the same phase.**

| Option | Verdict |
|--------|---------|
| A. Add missing Holy card | P1 — needed but only 2 claims; requires admin review |
| B. Upgrade Logos support chain | Insufficient alone — chain without affirmations still yields C |
| **C. Add support affirmation rules** | **PRIMARY — fixes 21/27 claims from frozen card text** |
| **D. Fix reference range normalization** | **PREREQUISITE — fixes 3/27 with zero doctrine risk** |
| E. Add catalog relationship edges | P1 — helps Sabbath class B path; pair with C |
| F. Begin IOG pilot | Defer — violates safety sequencing |
| G. Do not add evidence yet | Wrong — gaps are encodable from existing frozen assets |

### Rationale

1. **78% of Class C** share one cause: affirmations not encoded for scriptures already on frozen cards.
2. **Reference normalization (D)** is infrastructure-only, fixes Matthew 6:10 immediately, and unblocks existing `matt6_10_kingdom_on_earth` affirmation.
3. **Affirmation rules (C)** must be transcribed from existing `bindingRules`, `cautionPassages`, and `bibleFirstConclusion` — not new doctrine.
4. Death state proves the model: when affirmations + catalog exist, support accuracy hits 100%.
5. Holy card (A) and Sabbath catalog (E) follow in P1 after C+D regression proves no loop/template regression.

**Sequence:** D → C (dietaryLaw Acts 10, kingdom John 14/Rev 21, sabbath core refs) → re-run phase2b regression → then A (holy) with admin sign-off.
