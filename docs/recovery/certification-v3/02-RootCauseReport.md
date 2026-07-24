# Root Cause Report — Certification v3.0

## RC-CERT-001 — Doctrine opener duplication

**Symptom (production):**  
`No. Staying with Scripture, with Scripture, Scripture answers…`

**Root cause:**  
In `applyYesNoPolarityGuard`, early return:

```js
result.replace(/\bNo\.\s+staying\b/i, 'No. Staying with Scripture,')
```

matches the substring `No. Staying` inside `No. Staying with Scripture`, producing an extra `with Scripture,` on every subsequent polish pass.

A second scrub:

```js
/\bwith Scripture,\s+Scripture answers/ → 'Scripture answers'
```

incorrectly transformed `Staying with Scripture, Scripture answers` into `Staying Scripture answers`, which then re-entered the opener injector on the next pass.

**Why prior green tests missed it:** keyword “No” / Acts 10 content matched while opener quality was not asserted.

## RC-CERT-002 — Pork correction non-answer

**Symptom (production):**  
After a complete Acts 10 answer, “You did not answer my question about pork.” → `response_correction_missed_question` + “Ask me the part I missed…”, often prefixed with dietary polarity opener.

**Root cause:**  
Correction owner did not detect that the prior turn already answered the dietary claim, and polarity inference treated any pork mention as doctrine `no` even on meta-corrections.

## RC-CERT-003 — False readiness / certification risk

**Symptom:** suites can pass while production user-visible defects remain.

**Root cause:** over-reliance on route reachability and loose keyword assertions; production parity and opener/correction quality not treated as hard gates.
