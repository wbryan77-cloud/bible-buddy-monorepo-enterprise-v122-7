# 10 — Evidence Broker Verification (Phase 6X Obj3)

**Owner:** `services/retrievalEvidencePack.js` (unified broker — not replaced)  
**Disposition:** Surgical extension COMPLETE (local) — dual-path IOG/ICOJ gap closed for OpenAI pack  
**Date:** 2026-07-27

## Architecture preserved

Production path continues: `openAiFirstCompanionRuntime` → `buildRetrievalEvidencePack({ routingHintsOnly: true })` → reason-first composer.

No second broker. No auth/streaming/memory/claim-verifier replacement.

## Pack slices

| Slice | Consult | Notes |
|---|---|---|
| Scripture refs | Topic chain + catalog | Refs only (no KJV hydrate in this Obj) |
| Doctrine cards | Topic/message patterns | Cap 2–3 |
| Approved DRK catalog | Topic | |
| **Approved IOG/ICOJ xrefs** | **Topic auto-consult** | **Obj3 repair** — same store as bible_wide |
| History | Explicit historical AND-stack | Anti-leak preserved |
| Concordance hints | Soft OL | Explicit OL still orchestrator lane |
| Memory / companion / study | Intent-constrained | |
| `brokerConsult` telemetry | Always | Cards, xrefs, history, OL hints |

## Root cause (inconsistency)

IOG/ICOJ approved cross-references were consulted on `scriptureAuthorityEngine` (bible_wide) but **not** on the OpenAI evidence pack. Users did not need to say “IOG”; the OpenAI path simply never auto-consulted the store.

## Repair

`retrieveApprovedCrossReferenceEvidence(topic)` → pack `approvedCrossReferences` + supplemental scripture refs + `brokerConsult` flags. Composer evidence slice includes the same.

## Local regression

`node tests/phase6xObj3EvidenceBroker.test.js` → PASS (sabbath xrefs auto-consulted without org keyword).

## Residuals (backlog, not Obj3 blockers)

- Pack still does not hydrate local KJV verse text before compose
- History / original-language remain phrase-gated by design (anti-leak)
- holy_spirit topic may miss message detection even though store has xrefs
