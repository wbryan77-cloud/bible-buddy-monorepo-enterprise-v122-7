# Class C Claim Inventory

**Date:** 2026-06-08  
**Source:** `docs/regression-trace/phase2b-support-relationship-regression.json`  
**Total Class C claims:** 27 of 57 (47%)

---

## Inventory schema

Each row documents one Class C claim with full traceability context.  
**Source sentence** = how the claim entered the pipeline (`scripture_witness` = OpenAI `scripture[]` witness line; `sentence_ref` = reply sentence with inline ref).  
**Retrieved catalog** = approved teaching chain keys wired for that turn (from card `approvedCatalogChainKey` + `approvedCatalogEvidence`).

---

## third_heaven (3 Class C)

| # | claimId | Claim | Source | Scriptures | Card | Catalog | supportReason | Validator | Approval |
|---|---------|-------|--------|------------|------|---------|---------------|-----------|----------|
| 1 | c_witness_5 | Emphasizes kingdom coming on earth, grounding hope there. | scripture_witness | Matthew 6:10 | heavens | threeHeavens | Citation not in approved evidence graph | Rejected | degraded |
| 2 | c_witness_6 | Shows the new heaven and new earth where God dwells with man. | scripture_witness | Revelation 21:1-3 | heavens | threeHeavens | Related topic; no verified affirmation | Rejected | degraded |
| 3 | c_sent_10 | The Bible overall focuses on the coming kingdom of God on earth (Matthew 6:10) and the new heavens and new earth described in Revelation 21. | sentence_ref | Matthew 6:10 | heavens | threeHeavens | Citation not in approved evidence graph | Rejected | degraded |

**Diagnosis notes:** Matthew 6:10 fails `refInApproved` because the heavens card lists `Matthew 6:9-10` and the matcher does not treat `6:10` as inside `6:9-10`. Revelation 21:1-3 is on the card (`supportingScriptures`) and in `kingdomComesToEarth` teaching order, but no frozen affirmation rule matches on the heavens turn.

---

## kingdom (2 Class C)

| # | claimId | Claim | Source | Scriptures | Card | Catalog | supportReason | Validator | Approval |
|---|---------|-------|--------|------------|------|---------|---------------|-----------|----------|
| 4 | c_witness_2 | This promises Christ's return to bring believers to be with Him. | scripture_witness | John 14:3 | kingdom | kingdomComesToEarth | Related topic; no verified affirmation | Rejected | degraded |
| 5 | c_sent_6 | Jesus taught us to pray, "Thy kingdom come, Thy will be done in earth…" (Matthew 6:10), showing that the kingdom is a future reality where God's will is fully realized here on earth. | sentence_ref | Matthew 6:10 | kingdom | kingdomComesToEarth | Citation not in approved evidence graph | Rejected | degraded |

**Diagnosis notes:** John 14:3 is `primaryScriptures` on kingdom card and appears in `cautionPassages` / `bindingRules`, but no `CITATION_SUPPORT_AFFIRMATIONS` entry exists. Matthew 6:10-only ref fails graph lookup despite `matt6_10_kingdom_on_earth` affirmation existing for `Matthew 6:9-10`.

---

## acts_10 (2 Class C)

| # | claimId | Claim | Source | Scriptures | Card | Catalog | supportReason | Validator | Approval |
|---|---------|-------|--------|------------|------|---------|---------------|-----------|----------|
| 6 | c_witness_3 | Peter clarifies that the vision was about people, not food. | scripture_witness | Acts 10:28 | dietaryLaw | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 7 | c_sent_4 | The vision Peter received in Acts 10 concerns not food but the acceptance of Gentiles, as Peter explains in Acts 10:28… | sentence_ref | Acts 10:28 | dietaryLaw | *(none)* | Related topic; no verified affirmation | Rejected | degraded |

**Diagnosis notes:** Acts 10:28 is `supportingScriptures` on dietaryLaw card; `cautionPassages` explicitly state vision context is people/Gentiles. Card has no `bindingRules` and no affirmation rule encodes this support.

---

## pork (2 Class C)

| # | claimId | Claim | Source | Scriptures | Card | Catalog | supportReason | Validator | Approval |
|---|---------|-------|--------|------------|------|---------|---------------|-----------|----------|
| 8 | c_witness_3 | Peter explains the vision concerned people, not food, so it doesn't overturn the clean/unclean food distinction. | scripture_witness | Acts 10:28 | dietaryLaw | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 9 | c_witness_4 | Peter's explanation clarifies the vision was about Gentiles, not food laws. | scripture_witness | Acts 11:1-18 | dietaryLaw | *(none)* | Related topic; no verified affirmation | Rejected | degraded |

**Diagnosis notes:** Same affirmation gap as acts_10. Acts 11:1-18 is on card `supportingScriptures`; `bibleFirstConclusion` says "examine Peter's words in Acts 11" but no verifier rule exists.

---

## sabbath (10 Class C)

| # | claimId | Claim | Source | Scriptures | Card | Catalog | supportReason | Validator | Approval |
|---|---------|-------|--------|------------|------|---------|---------------|-----------|----------|
| 10 | c_witness_1 | Shows God's rest and sanctification of the seventh day as a pattern. | scripture_witness | Genesis 2:2-3 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 11 | c_witness_2 | God's direct command to keep the Sabbath holy by ceasing work. | scripture_witness | Exodus 20:8-11 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 12 | c_witness_3 | Teaches delighting in the Sabbath and refraining from personal pleasure. | scripture_witness | Isaiah 58:13-14 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 13 | c_witness_4 | Jesus' example of gathering for worship on the Sabbath. | scripture_witness | Luke 4:16 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 14 | c_witness_5 | Early believers gathered on the Sabbath to hear the word. | scripture_witness | Acts 13:42-44 | sabbath | *(none)* | Citation not in approved evidence graph | Rejected | degraded |
| 15 | c_witness_6 | Paul reasoned with Jews in the synagogue on the Sabbath. | scripture_witness | Acts 17:2 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 16 | c_witness_7 | Confirms ongoing Sabbath rest for God's people. | scripture_witness | Hebrews 4:9 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 17 | c_sent_8 | To keep the Sabbath holy… rest from ordinary work as God did (Genesis 2:2-3) and observe the commandment (Exodus 20:8-11). | sentence_ref | Gen 2:2-3, Ex 20:8-11 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 18 | c_sent_9 | We delight in the Lord on His holy day… (Isaiah 58:13-14). | sentence_ref | Isaiah 58:13-14 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 19 | c_sent_10 | Hebrews 4:9 affirms a Sabbath rest for the people of God. | sentence_ref | Hebrews 4:9 | sabbath | *(none)* | Related topic; no verified affirmation | Rejected | degraded |

**Diagnosis notes:** Sabbath card retrieved with all primary/supporting scriptures except Acts 13:42-44. Card has **no `bindingRules`**, **no `approvedCatalogChainKey`**, and sabbath is **not** in `TOPIC_TO_CATALOG_KEY`. No teaching chain → no class B chain path. No affirmations → all on-card refs fail verification.

---

## death_state (0 Class C)

All 6 claims class A or B. No inventory rows.

---

## resurrection (0 Class C)

All 6 claims class A or B. Reused `deathState` card + `stateOfTheDead` catalog.

---

## logos (6 Class C)

| # | claimId | Claim | Source | Scriptures | Card | Catalog | supportReason | Validator | Approval |
|---|---------|-------|--------|------------|------|---------|---------------|-----------|----------|
| 20 | c_witness_1 | Shows that Logos means Word and is God Himself. | scripture_witness | John 1:1-14 | messiahLogos | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 21 | c_witness_2 | Reveals that the Logos became human in Jesus. | scripture_witness | John 1:1 | messiahLogos | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 22 | c_witness_3 | Demonstrates God's creative power through His word, linking to the Logos concept. | scripture_witness | Genesis 1:1 | messiahLogos | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 23 | c_sent_4 | In John 1:1, the term "Logos" means "Word." It refers to Jesus as the divine Word… | sentence_ref | John 1:1-14 | messiahLogos | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 24 | c_sent_5 | This Logos is… God's self-revelation and creative power, as seen in Genesis 1:1… | sentence_ref | Genesis 1:1 | messiahLogos | *(none)* | Related topic; no verified affirmation | Rejected | degraded |
| 25 | c_sent_6 | John 1:14 further reveals that this Word became flesh… | sentence_ref | John 1:1 | messiahLogos | *(none)* | Related topic; no verified affirmation | Rejected | degraded |

**Diagnosis notes:** Card retrieved; scriptures on card. No `bindingRules`, no catalog chain, no affirmations. `claimSupportVerifier` has only 5 affirmation rules total — none for messiahLogos.

---

## holy (2 Class C)

| # | claimId | Claim | Source | Scriptures | Card | Catalog | supportReason | Validator | Approval |
|---|---------|-------|--------|------------|------|---------|---------------|-----------|----------|
| 26 | c_witness_1 | This verse shows God's people are called to be holy, set apart… because God Himself is holy. | scripture_witness | Leviticus 20:26 | *(none)* | *(none)* | No approved evidence pack | Rejected | degraded |
| 27 | c_witness_2 | It explains that believers should be holy in all manner of living, following God's holiness. | scripture_witness | 1 Peter 1:15-16 | *(none)* | *(none)* | No approved evidence pack | Rejected | degraded |

**Diagnosis notes:** No evidence card matches "What does holy mean?" — `MESSAGE_PATTERNS` in `evidenceCards/index.js` has no `/\bholy\b/` trigger. `runtimeScriptureHolinessContinuityEngine` exists but is not wired into retrieval. Validator never receives an evidence pack.

---

## Root cause summary (27 claims)

| Cause code | Description | Count |
|------------|-------------|-------|
| **B** | Card exists but lacks affirmation rules | 21 |
| **G** | Scripture reference range mismatch | 3 |
| **A** | Missing evidence card / ref not on card | 3 |
| **H** | Missing catalog chain (contributing, sabbath) | 10 *(all sabbath — overlaps B)* |

Death state and resurrection: **0 Class C** — proof that affirmation + catalog coverage works when complete.
