# Original Vision Reconciliation — Phase 6F Part 1

Full machine-readable ledger: `OriginalVisionReconciliation.json` (30 requirements).
Sources: `docs/alpha/phase5t-20260717-211212/{CurrentProductionInventory,ProviderEvaluation,FounderTestGuide}.md`,
`Phase5AProviderStrategy.md`, `Phase5ACompetitorFeatureAudit.md`, `README.md`, `docs/legal/`.

## Summary table

| ID | Requirement | Status | Alpha priority | Action |
|---|---|---|---|---|
| REQ-001 | Local KJV corpus (Tier 1) | IMPLEMENTED_AND_VERIFIED | CRITICAL | KEEP |
| REQ-002 | Deterministic Scripture Authority layer | IMPLEMENTED_AND_VERIFIED | CRITICAL | KEEP |
| REQ-003 | Typed cross-reference / relationship graph | IMPLEMENTED_AND_VERIFIED | HIGH | COMPLETE_NOW (Part 2B) |
| REQ-004 | Original-language (Hebrew/Aramaic/Greek) data | IMPLEMENTED_AND_VERIFIED | HIGH | COMPLETE_NOW (Part 4) |
| REQ-005 | Response owner / prayer / memory / continuation / identity / safety | IMPLEMENTED_AND_VERIFIED | CRITICAL | KEEP |
| REQ-006 | Duplicate dead prayer module (`prayerCompanionResponse.js`) | PARTIAL | LOW | DEFER_POST_ALPHA (Part 14 register) |
| REQ-007 | Health-mention acknowledgment (non-diagnostic) | IMPLEMENTED_AND_VERIFIED | MEDIUM | KEEP |
| REQ-008 | User accounts / authentication | MISSING | LOW | DEFER_BETA |
| REQ-009 | KJV reader/search UI | MISSING | LOW | DEFER_BETA |
| REQ-010 | Bookmarks/notes/highlights | MISSING | LOW | DEFER_BETA |
| REQ-011 | Prayer journal (persisted) | SCAFFOLD_ONLY | LOW | DEFER_BETA |
| REQ-012 | Daily verse (scheduled) | PARTIAL | LOW | DEFER_BETA |
| REQ-013 | Reading plan (full) | SCAFFOLD_ONLY | LOW | DEFER_BETA |
| REQ-014 | Admin review console | IMPLEMENTED_AND_VERIFIED | HIGH | COMPLETE_NOW (Part 12) |
| REQ-015 | Privacy export/delete (REST) | PARTIAL | MEDIUM | DEFER_CLOSED_ALPHA |
| REQ-016 | Voice/realtime | IMPLEMENTED_NOT_USER_EXPOSED | LOW | FEATURE_FLAG (off) |
| REQ-017 | Audio Bible | SCAFFOLD_ONLY | LOW | DEFER_BETA |
| REQ-018 | Avatar/orb | PARTIAL | LOW | KEEP (orb only) |
| REQ-019 | Food barcode/OCR | SCAFFOLD_ONLY | LOW | FEATURE_FLAG_OFF |
| REQ-020 | Health integrations (HealthKit/Health Connect) | SCAFFOLD_ONLY | LOW | DO_NOT_BUILD (no mobile shell) |
| REQ-021 | Groups/community | SCAFFOLD_ONLY | LOW | DEFER_BETA |
| REQ-022 | IOG/ICOJ governed ingestion | IMPLEMENTED_AND_VERIFIED | HIGH | COMPLETE_NOW (Part 3) |
| REQ-023 | Loyalty / faith-action tone material | IMPLEMENTED_NOT_USER_EXPOSED | LOW | NOT_RELEVANT_TO_BIBLEBUDDY |
| REQ-024 | "TruthLens" branding | UNKNOWN_NEEDS_REVIEW | LOW | ADMIN_REVIEW |
| REQ-025 | Deployment/ZIP/build recovery | PARTIAL | MEDIUM | COMPLETE_NOW (Part 15) |
| REQ-026 | OpenAI-assisted, doctrine-gated learning | IMPLEMENTED_AND_VERIFIED | CRITICAL | KEEP |
| REQ-027 | Text comparison (COMPARE mode + original language) | IMPLEMENTED_AND_VERIFIED | MEDIUM | KEEP |
| REQ-028 | Lesson upload/paste Scripture alignment | MISSING | MEDIUM | COMPLETE_NOW (Part 11) |
| REQ-029 | Notifications (general opt-in) | PARTIAL | LOW | DEFER_BETA |
| REQ-030 | Audit/safety logs + consent | PARTIAL | MEDIUM | COMPLETE_NOW (Part 12) |

## Key correction vs. the 2026-07-18 (pre-Phase-6) inventory

The most recent full inventory (Phase 5T, 2026-07-18) reported the local KJV corpus,
cross-reference dataset, and original-language data as **MISSING/PARTIAL/SCAFFOLD_ONLY**.
Phases 6A–6E (completed 2026-07-18/19) implemented and verified all three. This ledger
reflects the corrected, current-as-of-this-batch state, not the stale pre-Phase-6 text.

## Items explicitly excluded as not relevant

Per the batch's own instruction, tone/personality and life-topic source material inform
existing companion voice and test cases but do not create new doctrine topics by
themselves (REQ-023). No unrelated creative/business content was found inside the
Bible evidence layer (`services/*Concept*`, `services/*Authority*`, `services/*Witness*`).

## COMPLETE_NOW items and where they are closed in this batch

- REQ-003, REQ-004 → Part 2B / Part 4 (doctrine gap closure + original-language linkage)
- REQ-014, REQ-030 → Part 12 (Admin experience completion)
- REQ-022 → Part 3 (IOG/ICOJ deep knowledge utilization)
- REQ-025 → Part 15 (Founder build/recovery guide)
- REQ-028 → Part 11 (lesson alignment prototype)
