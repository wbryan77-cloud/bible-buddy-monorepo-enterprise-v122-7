# Updated Repair Report — RC v4.0

Commit: `fb2cb52`  
Rollback: `git revert fb2cb52` (or redeploy prior `7fc7acf`)

## Repair A — H1 opener
- Files: `services/directAnswerFormatter.js`, `services/singleCompanionContract.js`
- Validation: local corpus H1 PASS; multi-pass formatter probe PASS
- Regression: Truth Corpus asserts no `Staying with Scripture, with Scripture`

## Repair B — H2 dietary correction
- Files: `services/responseRevisionOwner.js`, `services/directAnswerFormatter.js`
- Validation: local corpus H2 → `response_correction_restate_dietary`
- Regression: rejects “ask me the part I missed” for pork meta-correction

## Repair C — Corpus completion
- File: `scripts/runFounderTruthCorpus.js`
- Added families: O–Z (state of the dead, Sabbath, Greek agape, historical Daniel 3, memory forget, repeated Q, long conversation, claim silence/explicit, OpenAI healthy path, hallucination correction, evidence≠Scripture, college-major silence/clarify)
- Local predeploy: **32/32 PASS**

## Repair D — Naming conflict
- File: `docs/recovery/26-FinalCoreCompanionReadinessReport.md`
- Added supersession banner: not GO_FOR_FOUNDER_ALPHA
