# Updated Root Cause Report — RC v4.0

## RC-RC4-001 — Doctrine opener duplication (CONFIRMED)

**Symptom:** `No. Staying with Scripture, with Scripture, Scripture answers…`  
**Root cause:** `/\bNo\.\s+staying\b/` rewrite matched inside `No. Staying with Scripture` on polish passes.  
**Status:** Repaired in `fb2cb52` (`collapseDoctrineOpener` / safe opener apply). Production validation pending/attached in RC artifacts.

## RC-RC4-002 — Dietary meta-correction non-answer (CONFIRMED)

**Symptom:** After a complete Acts 10 answer, “You did not answer…” → ask-me-the-part-I-missed + polarity prefix.  
**Root cause:** missed-question lane used when prior dietary answer already existed; polarity inferred on meta-corrections.  
**Status:** Repaired in `fb2cb52` (`response_correction_restate_dietary` + `isMetaCorrectionMessage`).

## RC-RC4-003 — Production/local mismatch (CONFIRMED)

**Root cause:** companion repairs existed only in working tree / local server while production served unrepaired `7fc7acf` behavior.  
**Status:** Pushed `fb2cb52` to `origin/main` (Render autoDeploy).

## RC-RC4-004 — Incomplete Founder Truth Corpus (CONFIRMED)

**Root cause:** 19-case corpus omitted Manual Guide / historical families (state of the dead, Sabbath doctrine, original language, long conversation, memory forget, etc.).  
**Status:** Expanded to 32 automated cases in `scripts/runFounderTruthCorpus.js`.

## Residuals (not claimed fixed as full certification)

- Forced OpenAI outage injection
- Full IOG/ICOJ utilization matrix
- Full claim-classifier on every doctrine sentence
- Browser/Desktop/Mobile UI automation parity
- Ordered dual conversation/continuation lanes (not simultaneous competing path; live entry is single)
