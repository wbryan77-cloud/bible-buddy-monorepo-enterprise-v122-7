# Bible Authority Engine — Implementation Recommendation

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Status:** RECOMMENDATION ONLY — no implementation, no push

---

## Recommendation summary

**Continue with OpenAI + Bible Authority Engine (hybrid RAG + claim validator + admin review).** Do not fine-tune or build a local Bible model in the near term. The control problem is **authority ordering and claim traceability**, not model vendor.

---

## Part B — Claim-to-Scripture validator (design)

### Current state (`417289c`)

`bibleOnlyAuthorityValidator.js` provides:

- Regex flags: third-heaven destination, 2 Cor 5:8 standalone, tradition afterlife, KJV drift fingerprints
- Weak citation check: book name / chapter:verse substring in reply
- Card contradiction heuristics
- One regen via guard layer

**Missing:** structured claim extraction and per-claim evidence matching.

### Proposed: `claimToScriptureValidator.js`

**Input:**

```json
{
  "reply": "…",
  "evidencePack": { "evidenceCards", "approvedCatalogEvidence", "bindingRules" },
  "userMessage": "…"
}
```

**Step 1 — Claim extraction** (choose one; ranked):

| Approach | Pros | Cons |
|----------|------|------|
| **A. Structured compose side-channel** — OpenAI returns `{ reply, claims[] }` in JSON | Accurate, same model | Extra tokens; must not become second author |
| **B. Lightweight NLP rules** — split sentences, classify doctrinal vs pastoral | No extra API call | Misses compound claims |
| **C. Secondary micro-call** — extract claims only, temperature 0 | Clean separation | +1 API call / memory |

**Recommendation:** **A for doctrine intents** — extend existing `response_format: json_object` schema:

```json
{
  "reply": "user-facing prose",
  "claims": [
    { "claimId": "c1", "text": "…", "type": "doctrine|pastoral|procedural", "citations": ["John 3:13"] }
  ]
}
```

Claims are **metadata for validation**; only `reply` is shown to user. Validator never rewrites `reply` except via one regen.

**Step 2 — Approved reference graph**

Build from:

- `collectApprovedReferences()` (existing)
- `bindingRules` on cards
- `cautionScriptures` (claims using these need co-witnesses)
- Forbidden claim templates (denylist)

**Step 3 — Match each doctrine claim**

| Result | Action |
|--------|--------|
| Claim cites approved ref + ref supports claim type | PASS |
| Claim cites ref not in approved set | FAIL — `unsupported_citation` |
| Doctrine claim with no citation | FAIL — `ungrounded_claim` |
| Claim matches forbidden template | FAIL — `forbidden_tradition` |
| Claim uses caution ref alone (e.g. 2 Cor 5:8) | FAIL — `caution_without_chain` |

**Step 4 — Output**

```json
{
  "passed": false,
  "claimsMade": [...],
  "unsupportedClaims": ["believers go to third heaven"],
  "validatorResult": "fail",
  "regenHint": "Answer again using only approved Scripture evidence…",
  "adminFindings": [...]
}
```

Validator **never** authors final prose.

### Flag library (minimum)

| ID | Pattern / rule |
|----|----------------|
| `third_heaven_destination` | Believers go/ascend to third heaven |
| `corinthians_58_standalone` | 2 Cor 5:8 as immediate heaven proof |
| `john_14_permanent_heaven` | Mansions = permanent away-from-earth without return |
| `kingdom_in_heaven_only` | Kingdom hope only in heaven, omitting Matt 6:10 / Rev 21 |
| `sunday_replaced_sabbath` | Sunday replaced Sabbath by command |
| `acts_10_pork_clean` | Acts 10 permits unclean food without Peter’s explanation |
| `heaven_at_death_settled` | Soul goes to heaven at death as settled doctrine |

Extend `doctrineBoundaries.FORBIDDEN_TEACHINGS` with claim-level IDs, not just regex boundaries.

---

## Part C — Evidence authority mode (composer)

### Already implemented (baseline)

- `BIBLE_ONLY_AUTHORITY_INSTRUCTION` in `reasonFirstComposer.js`
- `evidenceAuthority.bindingInstruction` in pack
- `binding: doctrine_claims_must_trace_to_these_references` on card payload

### Recommended upgrades (next implementation)

1. **`evidenceAuthorityMode: "binding"`** enum on pack when intent ∈ doctrine set or `bibleOnlyMode`
2. **Reorder prompt** — evidence JSON **before** North Star warmth lines for doctrine turns
3. **Explicit negative examples** in prompt (not answers): “Do not say believers go to third heaven unless evidence contains that claim”
4. **Require claims array** in structured output for doctrine mode only
5. **Strip duplicate evidence** from user payload when already in system prompt (memory)

### Binding prompt rule (canonical)

> Answer only from the retrieved approved Scripture evidence. Do not use general Christian tradition. Do not fill gaps from denominational teaching. If evidence does not prove a claim, say: **Scripture does not state that directly.**

---

## Part E — Own model vs OpenAI decision

### Options compared

| Criterion | OpenAI + BAE | Fine-tune OpenAI | Local/open Bible model | Hybrid (recommended) |
|-----------|--------------|------------------|------------------------|----------------------|
| **Cost** | API per turn + 1 regen max | High upfront + API | GPU infra or slow CPU | API + validator compute |
| **Doctrine control** | Medium→High with BAE | Medium (training drift) | High if small | **High** |
| **Infrastructure** | Low | Medium | High | Low–medium |
| **Memory (Render)** | 2GB likely OK with caps | Same | Heavy if self-hosted | Same as OpenAI path |
| **Hallucination** | High without BAE | Medium | High on rare verses | **Lower** with claim validator |
| **Safe doctrine updates** | Evidence Cards + admin | Retrain risk | Retrain risk | **Cards + admin review** |
| **Maintainability** | Good | Poor | Poor | **Best** |
| **KJV-first** | Prompt + quote guard | Trainable | Trainable | **KJV corpus check** |
| **Time to ship** | Weeks | Months | Months+ | **Weeks** |

### Recommendation: **Option 4 — Hybrid RAG + validator + admin review**

```
Approved Evidence (Cards, chains, catalog)
  → Retrieval (deterministic)
  → OpenAI composes (sole prose author)
  → Claim extractor (structured metadata)
  → Claim-to-Scripture validator (deterministic + patterns)
  → Max 1 regen
  → Admin findings for failures (learning engine)
```

**Do not fine-tune** until:

- BAE claim validator is live and still failing on identifiable patterns
- Admin review queue shows repeated gaps addressable only by model weights
- Cost of regen + validation exceeds fine-tune amortization (unlikely at current scale)

**Do not build local Bible LLM** until:

- API dependency is unacceptable
- Team can operate GPU infra and KJV corpus grounding
- BAE architecture is proven (local model without BAE repeats same tradition drift)

---

## Part G — Happy-path validation plan

### Script upgrade: `bibleAuthorityEngineValidation.js` (planned)

Extends `bibleOnlyAuthorityRegression.js` with per-test artifacts:

```json
{
  "id": "bo_02",
  "message": "Does the Bible say believers go to the third heaven?",
  "retrievedEvidence": {
    "cardIds": ["heavens"],
    "catalogKeys": ["threeHeavens"],
    "approvedReferences": ["Genesis 1:6-8", "John 3:13", "2 Corinthians 12:2", "..."]
  },
  "claimsMade": [],
  "unsupportedClaims": [],
  "validatorResult": "pass|fail",
  "finalAnswerAuthor": "openai",
  "openaiCalled": true,
  "openaiAttempts": 1,
  "memoryBefore": { "rssMB": 0, "heapUsedMB": 0 },
  "memoryAfter": { "rssMB": 0, "heapUsedMB": 0 },
  "replyPreview": "..."
}
```

### Test battery (12 + 8 authority audit questions)

Include all Part A questions plus Logos, grief, Alzheimer’s companion turns.

### Pass criteria

| Criterion | Measurement |
|-----------|-------------|
| Every doctrine claim traced | `unsupportedClaims.length === 0` |
| No tradition drift | forbidden + claim validator pass |
| KJV-first | no NIV fingerprint hits |
| No connection loop | `connectionErrors === 0` |
| No memory spike | `memoryAfter.rssMB - memoryBefore.rssMB < 15` per turn |
| OpenAI sole author | `finalAnswerAuthor === 'openai'` |
| Max 2 API calls | `openaiAttempts <= 2` |

### Gate before push

```bash
export OPENAI_API_KEY="..."
node scripts/bibleAuthorityEngineValidation.js
# Exit 0 + summary.allPass === true
```

**Current blocker:** no `OPENAI_API_KEY` in CI/local agent environment; `417289c` unproven on happy-path.

---

## Implementation priority (ranked)

| Rank | Task | Value | Risk if skipped |
|------|------|-------|-----------------|
| 1 | Happy-path validate `417289c` | Proves baseline | Push blind |
| 2 | Structured `claims[]` in compose JSON | Enables real BAE | Regex-only forever |
| 3 | `claimToScriptureValidator` | Per-claim trace | Tradition drift continues |
| 4 | Wire `firstResurrection` + all DRK chains | Death/resurrection gaps | Wrong resurrection answers |
| 5 | Harden `deathState.card` bindingRules | 2 Cor 5:8 drift | Afterlife tradition |
| 6 | KJV quote corpus check | Translation drift | NIV in replies |
| 7 | Admin findings JSONL | Learning loop | Repeat failures invisible |
| 8 | External teaching ingestion (admin only) | Research scale | Manual card authoring |

---

## What not to do

- Hardcode doctrine answers
- Re-enable template/study responders
- Auto-promote external teaching to Evidence Cards
- Push before happy-path `allPass`
- Fine-tune before BAE claim validator exists

**End of implementation recommendation.**
