# Bible Authority Engine — Phase Zero Evidence Traceability Audit

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Status:** DIAGNOSIS ONLY — no doctrine fixes, no new evidence, no new validators, no push  
**Codebase:** local commits `3053cae` + `417289c` (unpushed)  
**Method:** Deterministic retrieval trace via `buildRetrievalEvidencePack` + validator simulation on **known drift replies** (not live OpenAI — no `OPENAI_API_KEY` in audit environment)

---

## Executive diagnosis

**BibleBuddy often retrieves approved evidence correctly for major doctrine topics, but the system cannot prove OpenAI used it.** The authority-order failure is **not primarily missing heaven/kingdom cards** — it is:

1. **No claim extractor** — steps 6–8 of the trace pipeline do not exist  
2. **Citation ≠ support** — validators check verse *mentions*, not whether claims are authorized  
3. **Validator blind spots** — several high-risk tradition claims pass validation while citing real verses  
4. **Partial retrieval** — cards load but `topic: null` drops scripture chains for some questions  
5. **Evidence gaps** — standalone word studies (e.g. “holy”) have no frozen card  

Adding more doctrine content **before fixing traceability** would mask the real failure mode.

---

## Trace pipeline (as implemented today)

```
Question
  → classifyCurrentMessageIntent          ✅ exists
  → buildRetrievalEvidencePack          ✅ exists
      → Evidence Cards (max 2–3)
      → approvedCatalogEvidence (3 DRK keys)
      → scripture chains (TOPIC_TO_CHAIN — requires resolved topic)
      → doctrine snippets
      → evidenceAuthority.bindingInstruction
  → composeReasonFirstReply               ✅ OpenAI authors prose
      → system: North Star + BIBLE_ONLY_AUTHORITY + CORE_RESTORATION + evidence JSON (~3.5–15 KB)
      → user: duplicate evidence object
  → Claims extracted                      ❌ NOT IMPLEMENTED
  → claim-to-Scripture match              ❌ NOT IMPLEMENTED (regex proxies only)
  → validateBibleOnlyAuthority            ⚠️ partial (post-hoc regex)
  → guard regen (max 1)                   ✅ exists
  → final answer
```

---

## Per-test traceability matrices

Legend for root-cause codes:

| Code | Meaning |
|------|---------|
| **A** | Evidence never existed in approved assets |
| **B** | Evidence existed but retrieval failed |
| **C** | Retrieval succeeded but prompt omitted or weakened evidence |
| **D** | Prompt contained evidence but OpenAI ignored it (requires live API to confirm) |
| **E** | Validator failed to catch unsupported claim |

---

### Test 1: What is the third heaven?

| Step | Result |
|------|--------|
| **Intent** | `definition` |
| **Cards** | `heavens` ✅ |
| **Catalog** | `threeHeavens` ✅ (17 refs in teachingOrder) |
| **Scripture chain** | 10 refs via `heavensLayers` ✅ |
| **Snippets** | `heavens` ✅ |
| **Binding rules** | 5 rules on card ✅ |
| **Prompt** | ~14.7 KB evidence JSON + binding instructions ✅ |
| **Claims (live)** | *Not captured — no extractor* |
| **Simulated drift reply** | “Believers go to the third heaven… 2 Corinthians 12:2 shows our final destination…” |
| **Validator** | **FAIL** — `unsupported_third_heaven_destination`, `affirmative_third_heaven_destination`, `contradicts_heavens_card_boundary` |
| **Citation check** | **PASS (misleading)** — matches `2 Corinthians 12:2` despite false claim |

| Claim (simulated) | Supported by evidence? | Validator |
|-------------------|------------------------|-----------|
| Paul names third heaven | ✅ 2 Cor 12:2 | — |
| Believers go to third heaven at death | ❌ bindingRules forbid | Caught |
| 2 Cor 12:2 proves believer destination | ❌ bindingRules forbid | Caught |

**Root cause for live failures:** **D + E** — evidence and binding rules are in prompt; OpenAI can still drift; if drift is subtle (paraphrase without regex hits), **E** dominates. Citation check falsely reassures because verse is mentioned.

---

### Test 2: What does Logos mean?

| Step | Result |
|------|--------|
| **Intent** | `meaning_word_study` |
| **Cards** | `messiahLogos` ✅ (10 refs) |
| **Catalog** | ❌ none (`messiah_logos` not in `TOPIC_TO_CATALOG_KEY`) |
| **Scripture chain** | ❌ empty (`messiah_logos` not in `TOPIC_TO_CHAIN`) |
| **Binding rules** | ❌ none on card |
| **Prompt** | ~9.6 KB with card + continuity discovery possible |
| **Simulated drift** | NIV phrase “one and only Son” in John 1:1 explanation |
| **Validator** | **FAIL** — `non_kjv_quotation_drift` ✅ |

| Claim | Evidence | Root if wrong |
|-------|----------|---------------|
| Logos = Word | John 1:1-14 ✅ | — |
| NIV wording | ❌ KJV policy | E catches fingerprint |

**Root cause:** Retrieval **partial** — card yes, chain/catalog no (**B** for chain). Doctrine substance mostly in card; line-upon-line chain missing.

---

### Test 3: What does holy mean?

| Step | Result |
|------|--------|
| **Intent** | `meaning_word_study` ✅ (matches `what does…mean`) |
| **Cards** | ❌ **none** |
| **Catalog** | ❌ none |
| **Scripture chain** | ❌ none |
| **Prompt evidence** | ~3.5 KB — boundaries only, **no doctrine card** |
| **Simulated reply** | “Holy means set apart… Exodus 20:8-11” |
| **Validator** | **PASS** — no doctrine evidence required (`evidenceCitation.required: false`) |

**Root cause:** **A** — no frozen Evidence Card for generic `holy` word study (only Sabbath card if “Sabbath” + “holy” co-occur). OpenAI answers from **general training** with no binding asset.

| Failure mode | Code |
|--------------|------|
| No holy word-study card | **A** |
| Validator does not require evidence | **E** |

---

### Test 4: Does Acts 10 make pork clean?

| Step | Result |
|------|--------|
| **Intent** | `direct_yes_no` |
| **Cards** | `dietaryLaw` ✅ (7 refs, Acts 10 caution on card) |
| **Scripture chain** | 7 refs ✅ |
| **Snippets** | `dietary_law` with Acts 10 context notes ✅ |
| **Binding rules** | ❌ none on card |
| **Prompt** | Full dietary evidence with `cautionPassages` |
| **Simulated drift** | “Yes, Acts 10 makes **all foods clean**… all animals permissible” |
| **Validator** | **PASS** ❌ — `bibleOnlyPassed: true`, **zero issues** |

| Claim | Evidence actually says | Validator |
|-------|------------------------|-----------|
| Acts 10 makes pork clean | Card: Acts 10 is people/Gentiles context; examine Acts 11 | **NOT CAUGHT** |
| All foods clean | No approved binding | **NOT CAUGHT** |

**Root cause:** **E** — critical blind spot. Evidence **exists and retrieves**; prompt contains caution; validator has **no Acts-10-pork-clean pattern**. `doctrineBoundaries.dietary_abolished` regex may not match “all foods clean” phrasing.

---

### Test 5: How do we keep the Sabbath holy?

| Step | Result |
|------|--------|
| **Intent** | `how_to_practice` |
| **Cards** | `sabbath` ✅ (6 refs) |
| **Scripture chain** | 8 refs ✅ |
| **Snippets** | `sabbath` with how-to hints ✅ |
| **Binding rules** | ❌ none |
| **Simulated drift** | “Constantine AD 321… rest on **Sunday**” |
| **Validator** | **FAIL** — `history_when_not_asked`, `missing_approved_scripture_citation` ✅ |

**Root cause:** Evidence retrieves well; unsolicited history caught (**E** works for Constantine). If OpenAI gives softer Sunday-practice advice without Constantine keywords, **E** may miss (**D**).

---

### Test 6: What happens when we die?

| Step | Result |
|------|--------|
| **Intent** | `definition` |
| **Topic resolved** | `null` ⚠️ |
| **Cards** | `deathState` ✅ (via die/death pattern) |
| **Catalog** | `stateOfTheDead` ✅ (17 refs) |
| **Scripture chain** | ❌ empty (topic null → no `TOPIC_TO_CHAIN`) |
| **Binding rules** | ❌ none on death card |
| **Simulated drift** | “go to heaven immediately… 2 Corinthians 5:8” |
| **Validator** | **FAIL** — `corinthians_5_8_standalone`, `tradition_afterlife_framing`, `doctrineBoundaries.heaven_at_death` ✅ |

**Root cause:** Card + catalog retrieve; chain missing (**B**). Validator catches obvious heaven-at-death drift (**E** works for strong patterns). Subtle “soul in heaven” without 5:8 may slip (**E**).

---

### Test 7: What is the kingdom of God?

| Step | Result |
|------|--------|
| **Intent** | `definition` |
| **Topic resolved** | `null` ⚠️ |
| **Cards** | `kingdom` ✅ (24 approved refs, 6 binding rules) |
| **Catalog** | `kingdomComesToEarth` ✅ |
| **Scripture chain** | ❌ **0 refs** (topic null — chain not loaded despite card) |
| **Prompt** | ~11.7 KB with binding rules + catalog |
| **Simulated drift** | “Kingdom is **in heaven where believers go after death**. Matthew 6:10…” |
| **Validator** | **PASS** ❌ — cites Matt 6:9-10 → citation check passes |

| Claim | Evidence | Validator |
|-------|----------|-----------|
| Kingdom on earth (Matt 6:10) | ✅ binding rule | Mentioned but contradicted |
| Believers go to heaven as kingdom hope | ❌ binding forbids | **NOT CAUGHT** |

**Root cause:** **B + E** — scripture chain dropped; validator passes because **Matthew is cited** while contradicting binding rules. Textbook **citation ≠ support** failure.

---

## Summary table (retrieval vs usage)

| Test | Cards | Catalog | Chain | Prompt has evidence | Validator catches obvious drift | Can prove OpenAI used evidence |
|------|:-----:|:-------:|:-----:|:-------------------:|:-------------------------------:|:------------------------------:|
| Third heaven | ✅ | ✅ | ✅ | ✅ | ✅ (strong drift) | ❌ |
| Logos | ✅ | ❌ | ❌ | ✅ | ✅ (NIV drift) | ❌ |
| Holy mean | ❌ | ❌ | ❌ | ⚠️ thin | N/A | ❌ |
| Acts 10 pork | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Sabbath how | ✅ | ❌ | ✅ | ✅ | ✅ (history) | ❌ |
| When we die | ✅ | ✅ | ❌ | ✅ | ✅ (5:8/heaven) | ❌ |
| Kingdom of God | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## Root question analysis (A–E frequency)

| Code | Description | Tests affected | Severity |
|------|-------------|----------------|----------|
| **A** | Evidence never existed | t03 (holy) | Medium — word-study gap |
| **B** | Retrieval failed | t02 chain, t06/t07 chain (topic null), t07 chain | High — breaks line-upon-line |
| **C** | Prompt omitted evidence | t03 thin pack; t07 chain missing from pack | Medium |
| **D** | OpenAI ignored evidence | All doctrine tests (unproven without live API) | **High** — architectural |
| **E** | Validator missed claim | t04 Acts 10, t07 kingdom-in-heaven, t03 no gate, t01 citation false-pass | **Critical** |

**Dominant failure:** **D + E together** — evidence often **is** in the prompt, but there is no claim-level enforcement and validators miss semantic contradictions that cite real verses.

---

## Ranked authority failures

| Rank | Failure | Frequency | Doctrinal risk | Impl. effort | Fix class |
|------|---------|-----------|----------------|--------------|-----------|
| 1 | **No claim extractor / claim-to-Scripture map** | Every doctrine turn | Critical | Medium | BAE-1 structured `claims[]` |
| 2 | **Citation ≠ support** (verse mention passes validator) | High | Critical | Medium | Claim matcher, not regex |
| 3 | **Acts 10 / pork-clean validator blind spot** | Medium | High | Low | Pattern + binding rule check |
| 4 | **Kingdom-in-heaven passes while citing Matt 6** | Medium | Critical | Medium | Contradiction vs bindingRules |
| 5 | **`topic: null` drops scripture chains** | t06, t07 | Medium | Low | Resolve topic from cards |
| 6 | **No holy word-study card** | t03 only | Medium | Low (but user said no new cards now) | Evidence gap A |
| 7 | **Logos/messiah chain not wired to catalog** | t02 | Low | Low | Wire `messiah_logos` chain |
| 8 | **No bindingRules on sabbath/dietary/death cards** | t04–t06 | Medium | Low | Card metadata only |
| 9 | **Live OpenAI drift unmeasured** | Unknown | High | Low | Happy-path API battery |
| 10 | **Prompt size / ordering** (evidence after warmth) | All | Low | Low | Prompt reorder |

---

## Answers to the six authority questions

| # | Question | Verdict |
|---|----------|---------|
| 1 | Retrieving approved evidence? | **Mostly yes** for 6/7 tests; **no** for standalone “holy” |
| 2 | Making evidence binding? | **Prompt-only** — not machine-enforceable |
| 3 | Preventing unsupported tradition? | **Partial** — strong regex hits only |
| 4 | Line-upon-line reasoning? | **Chains often missing** when topic null |
| 5 | KJV-first? | **NIV fingerprint caught**; no corpus verification |
| 6 | Validating every doctrine claim? | **No** — claim extraction absent |

---

## What NOT to do next (per Phase Zero)

- Do not add heaven/kingdom cards  
- Do not add doctrine validators without claim extractor  
- Do not push without live OpenAI trace  

## What TO do next (Phase One — plan only)

1. **Happy-path trace** with `OPENAI_API_KEY` — capture real OpenAI claims vs simulated  
2. **BAE-1:** structured `claims[]` in compose JSON (metadata, not second speaker)  
3. **Claim-to-Scripture matcher** against `bindingRules` + approved refs  
4. **Fix topic resolution** from retrieved cards so chains always load  
5. **Close validator gaps:** Acts 10 pork, kingdom-in-heaven vs binding rules  

---

## Audit tooling

Diagnostic script (local, not required for deploy): `scripts/evidenceTraceabilityAudit.js`  
Run: `node scripts/evidenceTraceabilityAudit.js`

---

## Related documents

- `BibleAuthorityEngineRootCausePlan.md`
- `BibleAuthorityEngineImplementationRecommendation.md`
- `BibleOnlyAuthorityRestorationReport.md`

**End of Phase Zero traceability audit.**
