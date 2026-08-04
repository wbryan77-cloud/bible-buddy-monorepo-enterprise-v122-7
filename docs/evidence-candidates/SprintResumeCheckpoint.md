# SprintResumeCheckpoint.md

Single source of truth for BibleBuddy / Bible Intelligence Engine lifecycle.

## Engineering center

**Bible Intelligence Engine (BIE)**  
BibleBuddy = first runtime client.

## Completed and Frozen

- Study Chain Engine · HT-4 · Schema Readiness · Lesson Engine
- Historical Citation Resolution · Historical Corpus Freeze
- BIE Phase 1 / 1A / 1B / 1C (now **deployed**)
- Production parity deploy batch (`04de40d`)

## Certifications

| Phase | Result |
|---|---|
| 1A | RUNTIME_ADAPTER_FIXED |
| 1B | RUNTIME_IMPROVED |
| 1C | KNOWLEDGE_ACTIVATION_PARTIALLY_COMPLETE |
| 1D preflight | PHASE_1D_NO_GO (superseded by parity deploy) |
| Production parity deploy | **PHASE_1D_READY** |

## Current Verified Production State

- `/health.releaseCommit` = `04de40d`
- origin/main = `04de40d`
- durableMemory = POSTGRES / durable true
- VLP adapter + history provider wire + OL attach **deployed**

## Current Response Ownership

- Final funnel: `finalizeBuddyResponse`
- Doctrine decision: `doctrineFinalAuthorityEngine`
- Composition: still split (templates vs OpenAI)

## Current Deterministic Composition State

- Fixed prose templates **still active** on strict doctrine routes
- Next engineering: Defect D1 (consume VLP without lowering governance)

## Active Knowledge Families (production)

KJV · xrefs · Evidence Cards · VLP attach · history when relevant · OL when relevant · durable Postgres memory · companion lanes

## Inactive Knowledge Families

Support graph NEEDS_ADMIN_REVIEW · Phase 5D books INDEXED_ONLY · durable VERIFIED study-chain ledger load

## Exact Next Engineering Bottleneck

Deterministic doctrine routes: `buildFinalAuthorityAnswer` fixed prose instead of VLP-contextual composition

## Do Not Reopen Without New Evidence

Corpus expansion without acquisitions · AUTO_APPROVE expansion · parallel engines

Artifacts: `docs/evidence-candidates/bie-production-parity-deploy/`
