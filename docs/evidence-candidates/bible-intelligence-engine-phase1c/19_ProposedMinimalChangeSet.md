# 19 — Proposed Minimal Change Set (BEFORE EDIT)

**Gate:** Preflight ownership map complete. Implementation begins only after this document.

## Defect A — Historical path misclassified / unused provider

| Field | Value |
|---|---|
| Defect | Ordinary/historical asks classified as `doctrine_explanation`; `historyAllowed=false`; pack never calls `historicalKnowledgeProvider` |
| First failing stage | Intent selection → Runtime Selection |
| Owner | `currentMessageIntent.classifyCurrentMessageIntent` + `retrievalEvidencePack.buildRetrievalEvidencePack` |
| Files | `services/currentMessageIntent.js`, `services/reasoningSnapshot.js`, `services/retrievalEvidencePack.js` |
| Why wrong | Dual gate requires HISTORY_RE + explicitHistorical + shouldUseHistory; provider never wired into pack |
| Smallest repair | Broaden history intent/patterns; attach productionEligible provider records into pack `history`; keep Sunday hardcode only for Sabbath→Sunday asks |
| Data contract | Extend pack `history` with `governedRecords[]` (additive) |
| Governance | productionEligible / APPROVED only; secondary to Scripture |
| Rollback | Revert the three files |
| Tests | History classification + provider attach unit tests |
| User-visible | History questions get governed historical context / OpenAI historyAllowed |

## Defect B — Original-language activation too narrow; empty on pack/VLP

| Field | Value |
|---|---|
| Defect | “What Hebrew word…” not treated as OL; VLP `languageEvidence` always empty |
| First failing stage | Activation gate + packet field fill |
| Owner | `originalLanguageResponseFormatter` + runtime adapter |
| Files | `services/originalLanguageResponseFormatter.js`, `services/openAiFirstCompanionRuntime.js`, `services/evidencePackSlimmer.js`, `services/reasonFirstComposer.js` |
| Why wrong | Regex misses common OL asks; Lesson Engine frozen so adapter must fill existing `languageEvidence` field |
| Smallest repair | Expand OL regex; after VLP build, call `getPassageStudy` when OL-relevant and fill existing fields; slim/composer pass-through |
| Data contract | Fill existing packet/pack fields — no schema change |
| Governance | Vendored corpus only; bounded; does not override Scripture |
| Rollback | Revert listed files |
| Tests | OL activation + pack survival |
| User-visible | OL asks get labeled language support |

## Defect C — VLP attached but unused on deterministic returns

| Field | Value |
|---|---|
| Defect | Doctrine/bible_wide return before composer; packet unused for prose/lineage |
| First failing stage | Composition bypass |
| Owner | `openAiFirstCompanionRuntime.returnStrictDoctrineStructured` / `returnBibleWideStructured` |
| Files | `services/openAiFirstCompanionRuntime.js` |
| Why wrong | Early return ignores already-attached packet/history |
| Smallest repair | Append governed historical appendix when `history.included`; attach packet lineage on `runtime` without changing doctrine conclusion text |
| Data contract | Runtime metadata + optional historical appendix only |
| Governance | No doctrine witness/conclusion mutation |
| Rollback | Revert runtime helper |
| Tests | Deterministic return still doctrine-safe; appendix only when history included |
| User-visible | History-relevant doctrine-adjacent turns can show labeled historical context |

## Explicitly NOT changing

- Lesson Engine source / Study Chain engine / packet schema
- AUTO_APPROVE / NEEDS_ADMIN_REVIEW promotion
- Phase 5D book bodies (frozen / missing)
- Support graph production activation
- Prompt redesign / new engines / vector stores

## Approval to proceed

Proceeding with Defects A–C only.
