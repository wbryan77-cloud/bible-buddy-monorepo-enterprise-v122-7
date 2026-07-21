# Holy Gap Analysis

**Date:** 2026-06-08  
**Phase:** 2E Part C

---

## Question

Does approved evidence for "holy" already exist but retrieval misses it — or is an admin-reviewed card required?

## Answer: **B — Admin-reviewed Holy card required**

---

## Audit results

### 1. Approved doctrine registry

`docs/bible-learning/approved-doctrine-registry.json` — **no `holiness` topic entry**

### 2. Existing Evidence Cards

| Card | Holy content |
|------|--------------|
| sabbath | "keep it holy" in question context only |
| lawCommandments | not holiness definition |
| dietaryLaw | not holiness |
| **holiness card** | **does not exist** |

### 3. Existing catalogs

| Catalog | Holy refs |
|---------|-----------|
| `bibleTopicCatalog` | no holiness entry |
| `approvedCatalogEvidence` | no holiness chain |
| `deathResurrectionKingdomCatalog` | none |

### 4. Runtime engines (NOT retrieval path)

| Engine | Refs |
|--------|------|
| `runtimeScriptureHolinessContinuityEngine` | Lev 11:44-45, Lev 19:2, 1 Pet 1:15-16, etc. |
| `runtimeCanonicalGraphRegistry.holiness` | graph nodes only |

These are **not** wired to `retrievalEvidencePack` → compose path.

### 5. Retrieval patterns

`evidenceCards/index.js` `MESSAGE_PATTERNS` — **no `/\bholy\b/` trigger**

Question "What does holy mean?" matches `currentMessageIntent` as `MEANING_WORD_STUDY` but retrieves **no evidence card**.

---

## Phase 2E live regression behavior

| Metric | holy topic |
|--------|------------|
| Claims extracted | **0** |
| Class C | 0 (vacuous pass) |
| Validator | pass (no doctrine claims) |
| Approval | approved |

Holy **passes approval only because no claims were extracted** — not because support is proven.

---

## Risk if ignored

When OpenAI produces holiness claims with scripture witnesses (as in Phase 2B: Lev 20:26, 1 Pet 1:15-16), they will be class C with `ungrounded_no_evidence_pack` until a card exists.

---

## Recommendation

See `HolyEvidenceCardRecommendation.md` — **ADMIN REVIEW REQUIRED**

Do not auto-create card in Phase 2E per stop conditions.
