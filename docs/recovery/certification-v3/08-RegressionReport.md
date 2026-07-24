# Regression Report — Certification v3.0

## Permanent suite

`scripts/runFounderTruthCorpus.js` — 19 cases (A–N), production-first.

## Results

- Local with repairs: **19/19 PASS** (`founder-truth-corpus-local.txt`)
- Production without repairs: **17/19 FAIL** H1/H2 (`founder-truth-corpus-production.txt`)

## Protections added

- H1 rejects duplicated opener / broken “Staying Scripture answers”
- H2 requires restated dietary answer; rejects “ask me the part I missed”
- H2 rejects polarity-prefixed “You are right”

## Prior recovery protections still required

- Phase 5O continuation regression
- Scripture fidelity smoke
- Decision ownership smoke
- Multi-turn corpus (`runFounderMultiTurnCorpus.js`)

Do not weaken keyword gates; tighten toward claim/opener quality as shown here.
