# Bible Authority Engine — Root Cause Plan

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Status:** PLAN ONLY — no implementation, no push  
**Commits in scope (local, unpushed):** `3053cae` (Phase 1/2A), `417289c` (Bible-only binding — partial authority engine)

---

## Executive summary

BibleBuddy’s root failure is an **authority-order inversion**: OpenAI’s general religious training competes with — and often wins over — approved Scripture evidence. The third-heaven drift is one symptom, not the disease.

The disease is: **no claim-to-evidence traceability loop**. Evidence is retrieved, sometimes bound in prompt, but **doctrine claims in the final answer are not extracted and checked against approved references one-by-one**.

Current stack (post-`417289c`) improved retrieval and prompt binding but still lacks a true **Bible Authority Engine** with structured claim-evidence mapping.

---

## Authority-order model (target)

```
User question
  → current intent (currentMessageIntent)
  → approved Evidence Cards (retrieveEvidenceCards, max 3)
  → scripture chains (TOPIC_TO_CHAIN + bibleTopicCatalog)
  → catalog evidence (approvedCatalogEvidence → deathResurrectionKingdomCatalog)
  → doctrine snippets + evidenceAuthority binding flag
  → composer prompt (BIBLE_ONLY_AUTHORITY_INSTRUCTION — binding mode)
  → OpenAI authors final prose (sole author)
  → CLAIM EXTRACTION (missing today)
  → claim-to-Scripture validator (partial — regex only today)
  → one regeneration max (guard layer)
  → final answer + admin findings log
```

---

## Six authority questions — current state

| # | Capability | Status | Gap |
|---|------------|--------|-----|
| 1 | Retrieving approved evidence | **Partial** | Cards + catalog wired for heavens/kingdom/death; resurrection chain not always co-retrieved |
| 2 | Making evidence binding | **Partial** | Prompt says binding; no structured enforcement per claim |
| 3 | Preventing unsupported tradition | **Partial** | Regex validators (`bibleOnlyAuthorityValidator`); misses nuanced paraphrase |
| 4 | Line-upon-line reasoning | **Prompt only** | No validator checks reasoning order or witness chain |
| 5 | KJV-first Scripture | **Prompt + soft regex** | No hard quote fingerprint check against KJV corpus |
| 6 | Validating every doctrine claim | **No** | No claim extraction; citation presence ≠ claim support |

---

## Part A — Authority-order audit (per test question)

Method: trace through `buildRetrievalEvidencePack` → `composeReasonFirstReply` → `validateBibleOnlyAuthority` (local smoke, no live OpenAI in plan environment).

### Test 1: What is the third heaven?

| Stage | Expected | Current (code trace) |
|-------|----------|----------------------|
| Intent | `definition` | ✅ `classifyCurrentMessageIntent` |
| Cards | `heavens` | ✅ pattern match |
| Catalog | `threeHeavens` | ✅ `approvedCatalogEvidence` |
| Chains | `heavensLayers` | ✅ `TOPIC_TO_CHAIN` |
| Binding prompt | Yes | ✅ `BIBLE_ONLY_AUTHORITY_INSTRUCTION` |
| Claim map | Layered heavens + Paul’s vision; no believer destination | ⚠️ **Not extracted** — OpenAI may still collapse layers |

**Claim-evidence map (required answer shape):**

| Claim | Must cite | Forbidden without evidence |
|-------|-----------|---------------------------|
| Scripture uses heaven in layers | Gen 1:6-8, 1:14-17 | Single “heaven” count from tradition |
| Paul names “third heaven” | 2 Cor 12:2 | — |
| Third heaven = believer destination | — | **Unless Scripture proves — it does not** |
| No man ascended except Son of Man | John 3:13 | — |

**Validator today:** flags affirmative third-heaven destination regex; does **not** verify each positive claim has a reference.

---

### Test 2: Does the Bible say believers go to the third heaven?

| Stage | Expected | Current |
|-------|----------|---------|
| Intent | `direct_yes_no` or `doctrine_explanation` | ✅ yes/no intent detected |
| Cards | `heavens` | ✅ |
| Catalog | `threeHeavens` | ✅ |
| Binding | Must lead yes/no from evidence | ⚠️ `directnessGuard` checks yes/no lead; not evidence-bound yes/no |

**Claim-evidence map:**

| Claim | Evidence | Correct answer shape |
|-------|----------|---------------------|
| Bible names third heaven | 2 Cor 12:2 | Yes — Paul’s vision |
| Bible says believers go to third heaven | **None in approved set** | **No — Scripture does not state that directly** |

**Gap:** Validator catches some affirmative drift; does not **require** explicit negation on direct yes/no heaven-destination questions.

---

### Test 3: Are believers going to heaven or is the kingdom coming to earth?

| Stage | Expected | Current |
|-------|----------|---------|
| Cards | `heavens` + `kingdom` (3-card cap) | ✅ both retrieved |
| Catalog | `threeHeavens` + `kingdomComesToEarth` | ✅ |
| Death state | Optional co-card | ⚠️ Not auto-added — 2 Cor 5:8 tension may appear without `deathState` |

**Claim-evidence map:**

| Claim | Evidence |
|-------|----------|
| Kingdom prayer on earth | Matt 6:9-10 |
| Reign on earth | Rev 5:10 |
| New Jerusalem comes down | Rev 21:1-3 |
| Christ comes again | John 14:3, Acts 1:11 |
| Believers permanently “go to heaven” as final hope | **Not in approved binding rules** |

**Gap:** Compound question needs **synthesis validator** — answer must cite kingdom-on-earth anchors, not treat as either/or tradition debate.

---

### Test 4: Give me Bible only. No traditions.

| Stage | Expected | Current |
|-------|----------|---------|
| `bibleOnlyMode` | true | ✅ `detectBibleOnlyMode` |
| Cards | heavens + kingdom default | ✅ |
| Tradition block | Strict | ⚠️ `detectTraditionAfterlife` only on some patterns |

**Claim-evidence map:** Every doctrinal sentence must map to retrieved reference or be labeled “Scripture does not state that directly.”

**Gap:** No per-sentence claim audit; “Bible only” is a mode flag, not a validator pass/fail on each claim.

---

### Test 5: What does death as sleep mean?

| Stage | Expected | Current |
|-------|----------|---------|
| Cards | `deathState` | ✅ on death/sleep keywords |
| Catalog | `stateOfTheDead` | ✅ |
| Binding rules on card | Weak | ❌ `deathState.card.js` has no `bindingRules` array |
| 2 Cor 5:8 caution | Should co-activate | ⚠️ Only if “absent from body” in message |

**Claim-evidence map:**

| Claim | Evidence |
|-------|----------|
| Dead sleep / know not | Eccl 9:5, Ps 146:4, John 11:11-14 |
| Resurrection hope | 1 Thess 4:13-16, Dan 12:2 |
| Immediate heaven at death | **Not approved without chain** |

**Gap:** Death/resurrection authority engine not hardened to same level as heavens/kingdom.

---

### Test 6: What happens at the resurrection?

| Stage | Expected | Current |
|-------|----------|---------|
| Cards | `deathState` | ⚠️ May miss if only “resurrection” without death keywords |
| Catalog | `firstResurrection` in DRK catalog | ❌ **Not wired** — only `stateOfTheDead` mapped |
| Chain | resurrection timeline | Partial via `TOPIC_TO_CHAIN.resurrection_timeline` |

**Gap:** `approvedCatalogEvidence` maps only 3 catalog keys; `firstResurrection` unwired.

---

### Test 7: What does John 3:13 mean?

| Stage | Expected | Current |
|-------|----------|---------|
| Cards | `heavens` | ✅ via heaven/no man ascended |
| Catalog | `threeHeavens` | ✅ includes John 3:13 |
| Intent | `meaning_word_study` or `definition` | ✅ |

**Claim-evidence map:**

| Claim | Evidence |
|-------|----------|
| No man hath ascended except Son of Man | John 3:13 |
| Applies to general human ascension to heaven | Binding rule on heavens card |

**Gap:** Word-study validator checks vocabulary, not claim-evidence trace.

---

### Test 8: What does Matthew 6:10 mean?

| Stage | Expected | Current |
|-------|----------|---------|
| Cards | `kingdom` | ✅ |
| Catalog | `kingdomComesToEarth` | ✅ |

**Claim-evidence map:**

| Claim | Evidence |
|-------|----------|
| Thy kingdom come | Matt 6:9-10 |
| Thy will done **in earth** | Matt 6:10 (binding) |

**Gap:** Must not answer with “kingdom in heaven only” — no specific validator for inverting earth/heaven.

---

## Root cause synthesis

### Why OpenAI still wins

1. **Evidence is context, not contract** — even with binding prompt, there is no machine-checkable claim→reference map.
2. **Validators are reactive regex** — catch known bad phrases; miss novel paraphrase of same tradition.
3. **Partial catalog wiring** — only 3 DRK chains; resurrection, millennium, first resurrection unwired.
4. **Uneven card hardening** — heavens/kingdom have `bindingRules`; death, Sabbath, dietary, law do not.
5. **Citation ≠ support** — `replyCitesApprovedEvidence` checks book name presence, not whether cited verse supports the claim.
6. **No claim extraction** — cannot fail “every doctrine claim traced” without NLP/LLM-assisted extraction or structured output.
7. **Happy-path unproven** — `bibleOnlyAuthorityRegression.js` blocked without `OPENAI_API_KEY`; production may still run pre-`417289c` deploy.

### What is NOT the root cause

- OpenAI as final author (correct architecture)
- Missing template responders (re-enabling would recreate loops)
- Single missing if/then for third heaven (surface patch)

---

## Authority engine definition (target product)

**Bible Authority Engine (BAE)** — a subsystem, not a responder:

| Module | Role |
|--------|------|
| Evidence Retrieval Authority | Cards + chains + catalog + snippets — complete per intent |
| Binding Composer Mode | Prompt contract: evidence-only doctrine |
| Claim Extractor | Parse answer into `{ claim, type, citations[] }` |
| Claim-to-Scripture Matcher | Match each claim against approved reference graph |
| Tradition Drift Guard | Regex + semantic patterns for known failures |
| KJV Quote Guard | Fingerprint quoted text vs KJV allowlist |
| Regen Orchestrator | Max 1 regen with structured failure reason |
| Admin Findings Log | Unsupported claims → review queue — never auto-merge |

OpenAI writes prose. BAE judges whether prose is Scripture-authorized.

---

## Phased restoration (plan only — do not implement here)

| Phase | Focus | Risk |
|-------|-------|------|
| **BAE-0** | Happy-path validation of `417289c` with real API key | Low |
| **BAE-1** | Claim extractor + claim-to-scripture validator (structured JSON side-channel) | Medium |
| **BAE-2** | Wire all DRK catalog chains; harden all doctrine cards with bindingRules | Medium |
| **BAE-3** | KJV quote corpus check; line-upon-line order validator | Medium |
| **BAE-4** | External teaching ingestion (admin-review only) | Low if no auto-promote |
| **BAE-5** | Memory-optimized evidence graph cache | Low |

---

## Related documents

- `BibleAuthorityEngineImplementationRecommendation.md` — Parts B, C, E, G
- `ExternalBibleTeachingIngestionPlan.md` — Part D
- `RenderDoctrineStressStabilityPlan.md` — Part F
- `BibleOnlyAuthorityRestorationReport.md` — what `417289c` already did
- `PostCrashBibleBuddyRestorationPlan.md` — prior audit

**End of root cause plan.**
