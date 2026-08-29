# Gate 0 Addendum — Subagent reconciliation (2026-08-28)

Source: detailed preflight from [Gate 0 BibleBuddy artifact map](10496f37-35f0-48ed-aa5a-b80f253951aa).

## Corrections / additions to `Gate0_RepositoryPreflightMap.md`

1. **Exact START_HERE filenames** are often missing; use functional equivalents (do not invent parallel systems).
2. **HistoricalCorpusFreeze equivalent:** `docs/evidence-candidates/Phase3CorpusFreezeManifest.json` (+ `services/phase3w3CorpusFreezePreparation.js`).
3. **Additional history modules to READ:** `scriptureHistoryRenderer.js`, `scriptureHistoryProvenanceRuntime.js` (do **not** write BookBuddy claims into runtime provenance store).
4. **`approved-book-relationships.jsonl` ≠ Phase 5D World Scope/LTMY/Jasher** — different artifacts.
5. **World Scope / Last Two Million Years / Jasher:** audits only; bodies not in repo; INDEXED_ONLY; no status promotion.
6. **Holy Testaments:** Study Chain corpus tag only — no volume tree.
7. **SBLGNT/MACULA:** deferred/not imported; **OSHB + Nestle1904** are governed.
8. **Four Winds PDF folder** `08_BIBLEBUDDY_EVIDENCE_SOURCES` referenced in integrity report but **missing** from drop — working text is the derivative `.txt`.
9. **runtimeHistoricalReferenceLayer** may be bypassed on some pack paths; prefer `historicalKnowledgeProvider` for governed citations.
10. Publishing claim pattern: ledger row → existing ID (`hist_*`, xref, chain/topic, OL edition) → status — never mutate production to “make it true.”

Canonical Gate 0 map remains `gates/Gate0_RepositoryPreflightMap.md`; this addendum overrides conflicting details.
