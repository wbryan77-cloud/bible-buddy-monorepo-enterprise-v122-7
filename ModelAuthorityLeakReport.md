# Model Authority Leak Report

**Date:** 2026-06-07  
**Scope:** Where model prior knowledge can dominate or leak past Scripture evidence  
**Status:** Diagnosis only

---

## What is a "model authority leak"?

A leak occurs when the **final user-visible answer** reflects **ChatGPT religious training** rather than **frozen approved evidence**, especially when:

1. Claims are **missing** or **empty** (`claims[]` failure)
2. Claims cite Scripture but **citation ≠ support** (class **C**)
3. Claims **contradict** evidence but ship before degradation (class **D** — validator should block)
4. Doctrine prose in `reply` is **not mirrored in claims** (orphan scan gap)
5. **No evidence card** exists (holy) — model must use general knowledge

---

## Leak vectors (ranked by severity)

| Rank | Vector | Mechanism | Mitigation in repo (not modified) | Residual risk |
|------|--------|-----------|--------------------------------|---------------|
| **1** | **Afterlife / heaven destination priors** | Model trained on "believers go to heaven / third heaven" | `FORBIDDEN_CLAIM_RULES` + citation denials → **D** | Orphan prose if claims empty |
| **2** | **Acts 10 → pork clean** | Popular Christian reading of Cornelius vision | `contradicted_acts_10_pork_clean` → **D** | Yes/no lead without evidence |
| **3** | **Kingdom in heaven** | Confusion of Matt 6:10 with afterlife hope | `contradicted_kingdom_in_heaven` + citation denial | Matt 6:10 misread in reply only |
| **4** | **Sunday / Sabbath** | Tradition replacement narrative | `contradicted_sunday_replaced_sabbath` → **D** | History bleed in prose |
| **5** | **Heaven at death** (2 Cor 5:8) | Standalone proof misuse | `contradicted_corinthians_5_8_standalone` → **D** | Citation in reply without claim |
| **6** | **Holy — no evidence card** | No frozen baseline | All claims → **C** `no_approved_evidence` | **100% model-driven** if answered |
| **7** | **Logos / resurrection — weak affirmation rules** | Few `CITATION_SUPPORT_AFFIRMATIONS` entries | Class **C** even for reasonable refs | Evidence-driven wording not auto-approved |
| **8** | **Pipeline blocked** | No OpenAI output | Connection message — neither Scripture nor model doctrine | Measurement blocked |

---

## Per-topic model leak profile

### Third heaven — **HIGH model prior risk**

| Typical model prior | Class | Validator |
|---------------------|-------|-----------|
| "Believers go to the third heaven when they die" | D | ✅ Caught |
| "2 Cor 12:2 proves our destination" | D | ✅ Citation denial |

**Leak if:** reply states destination without extractable claim → orphan patterns may miss nuanced phrasing.

---

### Kingdom of God — **HIGH**

| Model prior | Class |
|-------------|-------|
| Kingdom in heaven / believers go there | D |

**Frozen evidence emphasizes:** kingdom on earth, New Jerusalem comes down.

---

### Acts 10 / Pork — **HIGH**

| Model prior | Class |
|-------------|-------|
| Acts 10 makes pork clean | D |
| Yes, pork is permitted | D |

**Frozen evidence:** dietary law card + caution passages.

---

### Sabbath — **HIGH**

| Model prior | Class |
|-------------|-------|
| Sunday replaced Sabbath | D |

---

### Death state — **HIGH**

| Model prior | Class |
|-------------|-------|
| Immediate heaven at death | D |
| 2 Cor 5:8 standalone proof | D |

**Evidence-aligned:** sleep in death, resurrection hope (B).

---

### Resurrection — **MEDIUM**

| Issue | Class |
|-------|-------|
| "Resurrection in heaven" framing | C |
| Routing uses `deathState` card | Retrieval overlap |

Validator catches drift but affirmation rules weaker than heaven/kingdom.

---

### Logos — **MEDIUM**

| Issue | Class |
|-------|-------|
| NIV/trinitarian gloss on Logos | C |
| `scriptureChainCount: 0` on card | Graph incomplete flag in gap audit |

Model theological lexicon competes with KJV messiahLogos card.

---

### Holy — **CRITICAL (evidence gap)**

| Issue | Class |
|-------|-------|
| No frozen card | C — `no_approved_evidence` |
| Any answer is model lexicon | **Inherent leak** |

Only topic where retrieval cannot anchor authority.

---

## Claims[] as authority gate

| State | Authority source |
|-------|------------------|
| `openaiCalled: true` + rich `claims[]` + validator pass | **Evidence-driven** (A/B) |
| `openaiCalled: true` + `claims[]` empty | **Reply prose unvalidated** — orphan scan only |
| `openaiCalled: false` | **No model authority** — connection fallback |
| Validator fail + degradation | Partial leak stripped |

**Phase 1B observation:** `openaiCalled: false` → `claims[]` empty → **cannot measure** Scripture vs model on live turns.

---

## Citation ≠ support leaks (class C)

Model cites **approved refs** but asserts **unsupported conclusions**:

| Pattern | Example | Class |
|---------|---------|-------|
| 2 Cor 12:2 → eternal home | Third heaven destination | D (denial rule) |
| Matt 6:10 → kingdom in heaven | Misread prayer | D |
| Leviticus 11 → pork clean | Wrong direction | D |
| John 1:1 → NIV theology | Translation prior | C |

This is the dominant **subtle** leak: looks Scripture-cited, remains model-driven.

---

## Orphan reply scan coverage

`matchesForbidden` + `scanReplyOrphans` detect known patterns in **reply text** without claims.

**Covered:** third heaven destination, Acts 10 pork, kingdom in heaven, heaven at death, Sunday Sabbath, John 3:13 violations.

**Gap:** Novel phrasing outside regex rules; general pastoral language; **holy** definitions.

---

## Reproduction

```bash
# Offline drift detection
node scripts/baeAuthorityGapAudit.js

# Validator fixtures (model-prior claims)
node scripts/baeClaimValidatorFixtures.js

# Live attribution (requires OpenAI)
node scripts/scriptureAuthorityAuditRunner.js
```

---

## Related documents

- [ScriptureAuthorityAudit.md](ScriptureAuthorityAudit.md)
- [AuthorityOrderScorecard.md](AuthorityOrderScorecard.md)

**No fixes implemented.**
