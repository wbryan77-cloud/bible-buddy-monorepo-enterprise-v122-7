# Issue #11 Current-State Audit — 2026-09-07

## Purpose

Issue #11 was opened on 2026-05-21 as a closed-alpha testing-readiness build. Substantial work landed after that date. This audit prevents rebuilding superseded systems and establishes the evidence required before any corrective implementation or issue closure.

## Governing sequence

Inventory → crosswalk old requirement to current owner → verify current behavior → identify genuine gap → smallest corrective build → targeted tests → full regression → retest → production verification where authorized → update/close Issue #11 only when acceptance criteria are proven.

## Baseline evidence

- Issue #11 remains open and unchanged since 2026-05-21.
- Current main HEAD: `598be8c2c21c9ce3c460510c075daac35a723baa`.
- Latest GitHub Actions CI run on that HEAD completed successfully.
- Later Admin work introduced a unified Admin Command Center, consolidated review workflow, Decision Queue, operational observability, feedback capture, durable state, retrieval/evaluation infrastructure, graph/retrieval work, and governed memory.
- Production behavior must not be changed by this audit.

## Crosswalk

| # | Original Issue #11 requirement | Current evidence | Disposition | Verification still required |
|---|---|---|---|---|
| 1 | `/admin/testing.html` testing dashboard | Later unified Admin Command Center exists at `/admin/bible-authority.html`; later commits add overview, Decision Queue, Alerts, Briefings, Audit, Search, operational observability and Founder Intelligence. | **SUPERSEDED / CONSOLIDATE** — do not create a second admin dashboard unless a missing testing view cannot fit the existing command center. | Map every original metric/card to an existing command-center section or identify the smallest missing panel. |
| 2 | `routes/qualityMetrics.js` summary/event/feedback APIs | In-chat Helpful/Not helpful feedback shipped; alpha feedback is durable; unified `/unified/metrics` operational observability exists; Founder Experience Loop/evaluation registry exists. | **PARTIALLY SUPERSEDED** — reuse current feedback/metrics owners rather than create a parallel API. | Confirm session count, latency, error count, helpfulness and the original qualitative feedback fields are queryable from existing owners; add only missing fields/contracts. |
| 3 | `/admin/resources.html` resource upload UI | Resource/governance and later unified admin/review systems exist, but this audit has not yet proven an equivalent complete upload/metadata UI on current main. | **OPEN PENDING FILE/ROUTE PROOF** | Inventory current resource/admin UI and metadata capture path. |
| 4 | `routes/resourceReview.js` review-plan/submit/review-note using resource ingestion review | Resource ingestion review service was added around the original issue; later admin review was consolidated into Research Console → Human Review → Approval Workflow → Regression → Staging → Promotion. | **LIKELY SUPERSEDED / PARTIAL** | Prove that external resource metadata submission, review notes, approval state and no-auto-ingestion invariant are covered end-to-end. |
| 5 | `services/ocrTranscriptPipeline.js` stub | No dedicated OCR implementation has been proven by current commit/file search. | **GENUINE GAP CANDIDATE** | Search current tree for document/transcript extraction owners; if absent, design a provider-neutral ingestion-extraction interface with metadata, provenance, size/type limits and human-review gate. Do not add OCR provider spend yet. |
| 6 | `services/vectorMemoryRuntime.js` stub | Topic memory embeddings, canonical memory, relationship/continuation memory and later durable Postgres-backed user-memory ownership were implemented. | **SUPERSEDED** — do not create a parallel vector-memory runtime. | Verify delete/export/correct/forget semantics, durable ownership and embedding/retrieval boundaries against the current memory architecture. |
| 7 | knowledge graph + reference linking | Verse/relationship/cross-book/canonical graph work and later authority/support graph architecture were implemented. | **SUPERSEDED / EVOLVED** | Verify provenance, review state, reference linking and graph use are traceable and do not bypass Scripture/source governance. |
| 8 | retrieval orchestration | Multiple retrieval-first/canonical/semantic orchestration layers and later shadow retrieval/evaluation infrastructure were implemented. | **SUPERSEDED / EVOLVED** | Verify source-first ordering, approved-resource boundary, source-type distinction, provenance and uncertainty/human-review routing on current runtime. |
| 9 | human-review moderation states | Unified Research Console/Human Review/Approval Workflow exists; current UI uses Approve / Hold / Reject and queue items are review-required/not auto-applied. | **SUPERSEDED WITH STRONGER GOVERNANCE** | Map original `pending/approved/rejected/needs more support/disabled` semantics to current state machine and prove no knowledge promotion occurs without authorized review. |

## Acceptance-criteria audit status

| Original acceptance criterion | Current audit status |
|---|---|
| Render boots | **Previously evidenced in later release work; current live verification still required before closure.** |
| Admin can open testing dashboard | **Functionally superseded by unified Admin Command Center; exact original testing metrics mapping still required.** |
| Testers can submit feedback | **Implemented later via per-response feedback / alpha feedback. Retest required.** |
| Admin can view summary metrics | **Operational observability exists; original metric coverage must be cross-checked.** |
| Resource review plan visible | **Needs current end-to-end proof.** |
| Uploaded resource metadata recorded | **Needs current end-to-end proof.** |
| Nothing ingested without human approval | **Architecture strongly supports this; must be tested against current resource/knowledge path.** |
| All new routes fail soft | **Later systems use fail-soft/partial-failure patterns; targeted route failure tests required for the surviving Issue #11 surface.** |

## Corrective-build rules

1. **No parallel systems.** Reuse unified Admin, feedback, memory, retrieval, graph and review owners.
2. **No model migration or broad GraphRAG rebuild as part of #11.** Observability, evidence and review integrity come first.
3. **OCR is provider-neutral first.** If extraction is genuinely missing, define the internal interface, provenance and review contract before choosing a paid provider.
4. **Every Scripture/resource-derived claim must retain provenance.** Citation presence alone is insufficient; tests should verify the cited evidence actually supports the claim.
5. **Passage/context anchoring test.** When a user explicitly selects a passage, the retrieval trace must preserve it as the primary anchor unless a transparent rule says otherwise.
6. **Regression protection.** Preserve onboarding, database fail-soft behavior, doctrine/source routing, memory/forget semantics, admin auth and all frozen Bible Authority behavior.

## Required next verification batch

- Inventory current files/routes/services for Admin testing metrics, resource submission/review, extraction/transcript handling, memory ownership, graph/reference linking, retrieval tracing and review-state ownership.
- Build a machine-readable Issue #11 requirement-to-owner matrix.
- Add targeted tests only for uncovered acceptance criteria.
- Run existing CI/regression suites before changes to establish baseline.
- Implement the smallest gap set on an isolated branch.
- Run targeted tests twice plus full CI/regression; compare against baseline.
- Do not close Issue #11 until current-main/live acceptance evidence is attached and every obsolete requirement is explicitly marked superseded.

## Current recommendation

Issue #11 should remain **OPEN**, but it should no longer be treated as nine greenfield features. The dominant work is now a **consolidation/verification closure project**, with OCR/resource-ingestion completeness and exact testing-metric coverage the leading genuine-gap candidates.