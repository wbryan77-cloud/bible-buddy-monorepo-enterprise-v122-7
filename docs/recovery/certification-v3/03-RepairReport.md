# Repair Report — Certification v3.0

Repairs below are **local / uncommitted relative to production**. Production still fails H1/H2.

## Repair A — Opener collapse (RC-CERT-001)

- **Files:** `services/directAnswerFormatter.js`, `services/singleCompanionContract.js`
- **Implementation:** `collapseDoctrineOpener`, `applyDoctrineNoOpener`; remove destructive early-return rewrite and unsafe scrub
- **Validation:** local Truth Corpus H1 PASS; 3× polish unit probe PASS
- **Rollback:** revert those two files

## Repair B — Dietary correction restatement (RC-CERT-002)

- **Files:** `services/responseRevisionOwner.js`, `services/directAnswerFormatter.js` (`isMetaCorrectionMessage`)
- **Implementation:** `response_correction_restate_dietary`; skip polarity mutation on meta-corrections
- **Validation:** local Truth Corpus H2 PASS (`response_correction_restate_dietary`)
- **Rollback:** revert revision owner + meta-correction guard

## Repair C — Regression protection

- **File:** `scripts/runFounderTruthCorpus.js`
- **Implementation:** assert no `Staying with Scripture, with Scripture`; reject “ask me the part I missed” for H2; reject polarity-prefixed “You are right”
- **Validation:** production run FAIL on H1/H2 (proves gate works); local PASS

## Not repaired in this pass

- Stage 6 claim classifier
- Stage 8 IOG/ICOJ utilization matrix
- Shadow ownership consolidation
- Incident close (blocked until production PASS)
