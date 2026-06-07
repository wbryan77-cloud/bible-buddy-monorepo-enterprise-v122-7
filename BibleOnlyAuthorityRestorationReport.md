# Bible-Only Authority Restoration Report

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Commit:** pending (not pushed — awaiting happy-path OpenAI validation)  
**Status:** IMPLEMENTED — architecture validated; **happy-path blocked locally (no OPENAI_API_KEY)**

---

## Executive summary

Root cause: **approved Scripture evidence was present but not binding**. `deathResurrectionKingdomCatalog` chains (`threeHeavens`, `kingdomComesToEarth`) were **not wired** into the live evidence pack. Evidence Cards reached OpenAI as optional context; validators ran **after** drift; composer allowed pretrained religious defaults to dominate.

This restoration makes evidence **binding** for doctrine turns without restoring template responders or new final-answer systems.

---

## Part A — Why approved evidence was not dominating

### Audit answers

| Question | Finding |
|----------|---------|
| **1. Are heavens/kingdom cards retrieved?** | **Yes** after Phase 2A patterns; now **3 cards** for doctrine-heavy turns. Verified: third heaven → `heavens` + catalog `threeHeavens`; compound → `heavens` + `kingdom`; bible-only → both + both catalogs. |
| **2. Is `threeHeavens` wired?** | **Was NO** — only in `doctrineStudyCatalogResolver` / `genesisToRevelationContinuityRegistry` (bypassed path). **Now YES** via `approvedCatalogEvidence.js` → `retrievalEvidencePack.approvedCatalogEvidence`. |
| **3. Is `kingdomComesToEarth` wired?** | **Was NO**. **Now YES** same path. |
| **4. Were cards too weak?** | **Yes** — thin references, no `bindingRules`, no catalog chain, 2-card cap dropped kingdom on compound questions. |
| **5. Was evidence optional?** | **Yes** — prompt said "facts only" / "teach from cards" but not "claims must trace here or say Scripture does not state that directly." |
| **6. Validators only after drift?** | **Yes** — `scripturePolicyValidator` flagged some patterns but not evidence citation, 2 Cor 5:8 standalone, or affirmative third-heaven claims. |

### Live failure mapping

| Failure | Root cause |
|---------|------------|
| Believers go to third heaven | No binding rules; OpenAI pretrained default; weak validator |
| 2 Cor 5:8 traditional use | No caution enforcement; death chain not co-retrieved |
| Missing John 3:13 / Matt 6:10 / Rev 21 | Catalog unwired; cards not authoritative in prompt |
| Bible-only request ignored | No `bibleOnlyMode`; no default heavens+kingdom cards |

---

## Part B — Bible-only answer authority rule (implemented)

**New:** `BIBLE_ONLY_AUTHORITY_INSTRUCTION` in `reasonFirstComposer.js`

- Doctrinal claims must trace to retrieved evidence
- Unsupported claims → **"Scripture does not state that directly."**
- No common Christian tradition / pretrained afterlife framing
- Follow `bindingRules` on Evidence Cards and `approvedCatalogEvidence.chains`

**Evidence pack:** `evidenceAuthority.bindingInstruction` in `retrievalEvidencePack.js`

---

## Part C — Heaven / kingdom evidence hardening

### Upgraded cards

- `services/evidenceCards/heavens.card.js` — all required passages, `bindingRules`, `cautionScriptures` (2 Cor 5:8), `approvedCatalogChainKey: threeHeavens`
- `services/evidenceCards/kingdom.card.js` — Matthew 5:5, Acts 2:34, full boundary set, `kingdomComesToEarth`

### Catalog wiring

**New:** `services/approvedCatalogEvidence.js`

- Loads `DEATH_RESURRECTION_KINGDOM_CATALOG.threeHeavens` and `.kingdomComesToEarth`
- Injects `teachingOrder` into evidence pack (evidence only)

### Retrieval improvements

- Up to **3 cards** for doctrine-heavy messages
- Priority: heavens → kingdom → deathState
- `bible only` / `no tradition` → heavens + kingdom + both catalogs
- `bibleOnlyMode` flag when user requests Scripture-only

---

## Part D — KJV-first enforcement

`scripturePolicyValidator.js` (via `bibleOnlyAuthorityValidator.js`):

- Non-KJV quotation fingerprints
- Paraphrase vs quote guidance in composer prompt

---

## Part E — Bible-only validator (implemented)

**New:** `services/bibleOnlyAuthorityValidator.js`

Checks:

1. Unsupported tradition / afterlife framing  
2. Approved Scripture citation on doctrine turns  
3. Evidence Card contradiction (third-heaven destination, kingdom-away-from-earth)  
4. Affirmative "believers go to third heaven"  
5. 2 Corinthians 5:8 standalone heaven-at-death proof  
6. KJV drift, unsolicited history (delegated to scripture policy)  

**Regen:** One maximum via guard layer with standard hint:

> Answer again using only the approved Scripture evidence…

Integrated: `doctrineBoundaryValidator.js`, `openAiFirstCompanionRuntime.js` guards.

---

## Part F — Memory / stability (see companion report)

- Initial compose: `maxAttempts: 1`  
- Guard regen: `maxAttempts: 1`, once only  
- `evidencePackSlimmer.js` — caps memory snippets, discovery reinforcement  
- Compact JSON in composer (no pretty-print)  
- Production debug off in `render.yaml` (from Phase 1)

---

## Part G — Companion quality (prompt only)

`COMPANION_TONE_INSTRUCTION` retained — listen, reflect, Scripture gently, no therapy/cold Q&A. No responder restoration.

---

## Part H — Validation status

**Script:** `scripts/bibleOnlyAuthorityRegression.js`  
**Artifact:** `docs/regression-trace/bible-only-authority-results.json`

| Suite | Result |
|-------|--------|
| Hard cutover (18) | **18/18 PASS** |
| Catalog wiring smoke | **PASS** |
| Happy-path (12 tests) | **BLOCKED** — `OPENAI_API_KEY` not available in local environment |

### To complete happy-path validation

```bash
export OPENAI_API_KEY="..."
export BUDDY_TEMPLATE_PROSE=0
export BUDDY_DISABLE_STUDY_FALLBACK=1
export BUDDY_DEBUG=0
export BUDDY_LIVE_TRACE=0
node scripts/bibleOnlyAuthorityRegression.js
```

**Do not push until `allPass: true` in results JSON.**

---

## Files changed (this restoration)

| File | Role |
|------|------|
| `services/approvedCatalogEvidence.js` | Wire deathResurrectionKingdomCatalog chains |
| `services/bibleOnlyAuthorityValidator.js` | Binding doctrine validator |
| `services/evidencePackSlimmer.js` | Memory cap for composer payload |
| `services/evidenceCards/heavens.card.js` | Hardened binding rules |
| `services/evidenceCards/kingdom.card.js` | Hardened binding rules |
| `services/evidenceCards/index.js` | 3-card doctrine, bible-only routing |
| `services/retrievalEvidencePack.js` | Catalog + bibleOnlyMode + authority |
| `services/reasonFirstComposer.js` | Binding prompt + slim evidence |
| `services/doctrineBoundaryValidator.js` | Integrate bible-only validator |
| `services/openAiFirstCompanionRuntime.js` | Guard integration, regen cap |
| `services/doctrineEvidenceSnippets.js` | Expanded snippets |
| `scripts/bibleOnlyAuthorityRegression.js` | Happy-path battery |

---

## What was NOT done (per constraints)

- No template responders restored  
- No one-off answer scripts  
- No new final-answer systems  
- No push to production  
- No broad Phase 2B (law/feasts/death concordance)

**End of report.**
