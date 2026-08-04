# 06 — Original Language Activation Audit

**Pre-repair:** OL regex missed common asks; pack/VLP languageEvidence empty; getPassageStudy never called from adapter.

**Repair:** expand regex; async attach via `getPassageStudy({reference})`; fill existing `languageEvidence` / `languageStatus=ATTACHED_BOUNDED`.

Proof: Hebrew forever / Leviticus 23 → attached Leviticus 23:21 study (see traces).
Irrelevant asks remain languageEvidence empty.
