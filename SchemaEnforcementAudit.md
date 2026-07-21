# Schema Enforcement Audit

**Date:** 2026-06-07  
**Phase:** 1C  
**Scope:** API constraints, parser behavior, validator discrimination

---

## PART C — Can OpenAI return valid JSON with empty metadata?

### `claims[]`

| State | API allows? | Observed in test? | Pipeline handling |
|-------|-------------|-------------------|-------------------|
| **Missing** (field absent) | ✅ Yes | **6/6 topics** | `normalizeClaims` → `c_inferred` |
| **Empty** (`claims: []`) | ✅ Yes | 0/6 (model skips field entirely) | Same inference path |
| **Invalid** (malformed objects) | ✅ Yes | Not observed | Empty `claim` text skipped; may infer |
| **Populated** | ✅ Yes | **0/6** | Normal path to validator |

`response_format: { type: 'json_object' }` enforces **JSON validity only** — not schema membership.

**No `json_schema` / `strict: true`** is used in `callOpenAI`.

### `doctrineConclusion`

| State | API allows? | Observed | Pipeline handling |
|-------|-------------|----------|-------------------|
| **Missing** | ✅ Yes | **6/6** | `extractDoctrineConclusion` → last doctrine claim |
| **Empty string** `""` | ✅ Yes | 0/6 | Treated as falsy → fallback to claims |
| **Populated** | ✅ Yes | **0/6** | Used directly |

---

## Parser behavior (`safeJsonParse` + `normalizeStructured`)

```636:655:services/buddyBrain.js
function safeJsonParse(text) { ... }

function normalizeStructured(parsed, ...) {
  return {
    reply: parsed?.reply || fallback.reply,
    scripture: Array.isArray(parsed?.scripture) ? parsed.scripture : [],
    claims: Array.isArray(parsed?.claims) ? parsed.claims : [],
    doctrineConclusion: parsed?.doctrineConclusion || null,
    ...
  };
}
```

| Raw state | After `normalizeStructured` | Data loss? |
|-----------|----------------------------|------------|
| `claims` missing | `claims: []` | No — preserved as empty |
| `claims: []` | `claims: []` | No |
| `doctrineConclusion` missing | `null` | No |
| `doctrineConclusion: ""` | `null` (falsy) | Collapsed to null |

**Parsing does not drop claims** — fields are absent from model output, not stripped by parser.

---

## Validator discrimination: missing vs empty vs invalid

### Input to validator

Validator receives **post-`normalizeClaims`** claims, not raw OpenAI output.

| Raw model state | What validator sees | Classification typical |
|-----------------|---------------------|------------------------|
| **Missing `claims`** | 1 × `c_inferred`, `supportingScriptures: []` | **C** — `ungrounded_claim` |
| **Empty `claims: []`** | Same (inferred) | **C** — `ungrounded_claim` |
| **Invalid claim objects** | Filtered; may infer | **C** |
| **Valid claims + refs** | Per-claim classify | A/B/C/D |

### Can validator distinguish missing vs empty vs invalid?

| Distinction | Possible today? | Mechanism |
|-------------|-----------------|-----------|
| Missing vs empty raw | **No** at validator | Both collapse to inference |
| Inferred vs model-authored | **Partially** | `claimId === 'c_inferred'`, `derivedFrom === 'inferred_from_reply'` |
| Invalid structure | **Partially** | Malformed items dropped before validator |
| Missing `supportingScriptures` | **Yes** | `ungrounded_claim` issue code |
| Orphan reply prose | **Yes** | `scanReplyOrphans` separate from claims |

**Validator cannot flag "model failed to emit claims[]"** — it only sees inferred low-confidence claims.

---

## Schema layers (stacked)

| Layer | Enforces `claims[]`? | Enforces `doctrineConclusion`? |
|-------|------------------------|-------------------------------|
| OpenAI `json_object` | ❌ | ❌ |
| `buildSystemPrompt` base shape | ❌ (omits both) | ❌ |
| `CLAIM_EXTRACTION_INSTRUCTION` | Text only ("required") | Text only |
| `normalizeClaims` | ❌ (infers fallback) | N/A |
| `validateClaimToScripture` | ❌ (validates what it receives) | N/A |
| Compose regen on claim fail | Only if claim **content** fails — not if **missing** |

---

## `scripture[]` vs `claims[]` split

Model consistently populates **`scripture[]`** (legacy schema) with `reference`, `text`, `reason` — but never maps these into **`claims[].supportingScriptures`**.

This indicates **schema selection**, not JSON incapacity — the model follows the first concrete JSON template in the prompt.
