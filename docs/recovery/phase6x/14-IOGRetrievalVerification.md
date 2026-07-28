# 14 — IOG Retrieval Verification (Phase 6X Obj3)

**Store:** `data/approved-cross-references.jsonl` via `iogIcojGovernedIngestion.readApprovedCrossReferences`  
**Live consumers:** `scriptureAuthorityEngine` (bible_wide) **and** `retrievalEvidencePack` (OpenAI pack) after Obj3

## Findings

- No user “IOG” keyword gate existed or was added.
- Raw IOG prose remains dormant by design (refs only; never canonized as prose).
- Pre-Obj3 gap: OpenAI pack did not consult approved xrefs → inconsistent utilization vs bible_wide.
- Post-Obj3: topic-matched xrefs auto-attach as `relation: iog_icoj_cross_reference` (supplemental).

## Verification

| Probe | Expect |
|---|---|
| Sabbath doctrine question | `brokerConsult.approvedCrossReferences >= 1` when topic=`sabbath` |
| Explicit “IOG” not required | PASS |
| Raw transcript not injected as doctrine | PASS (store is refs only) |

Local: `phase6xObj3EvidenceBroker.test.js` PASS.
