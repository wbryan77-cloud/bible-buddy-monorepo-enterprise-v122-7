# Claim Extraction Failure Audit

**Date:** 2026-06-07  
**Phase:** 1C — Structured Claim Generation (diagnosis only)  
**Scope:** `services/reasonFirstComposer.js` + upstream `buildSystemPrompt`  
**Artifact:** `docs/regression-trace/phase1c-claim-generation-compliance.json`

---

## Executive finding

OpenAI **never emits** `claims[]` or `doctrineConclusion` on any of 6 doctrine questions (0/6). It **always** emits the **legacy companion JSON shape** from `buddyBrain.buildSystemPrompt` (`reply` + `scripture[]`). Post-processing invents `c_inferred` claims from reply prose — masking the failure until validator class **C**.

---

## PART A — Prompt instruction audit

### 1. Exact instructions for `claims[]`

From `CLAIM_EXTRACTION_INSTRUCTION` (`reasonFirstComposer.js:78-89`):

```
CLAIM EXTRACTION (required JSON fields for doctrine questions):
Return JSON with: reply, claims[], doctrineConclusion, confidence, memory_used.
Each claim object: { claimId, claim, type, supportingScriptures, confidence, derivedFrom }.
- type: doctrine | pastoral | procedural | clarification
- List every doctrinal assertion you make as a separate doctrine claim.
- supportingScriptures: KJV refs from the evidence pack that support that specific claim.
- derivedFrom: evidence_card:<cardId> | catalog:<key> | user_question | inference
- doctrineConclusion: one-sentence summary of your main doctrine answer.
- claims[] is metadata for validation; only reply is user-facing prose.
- If a doctrine claim is not supported by evidence, do not state it — or say: "Scripture does not state that directly."
```

**Injection point:** Only when `coreRestoration: true` — appended after `BIBLE_ONLY_AUTHORITY_INSTRUCTION`, before `CORE_RESTORATION_INSTRUCTION`.

### 2. Exact instructions for `doctrineConclusion`

Same block:

- Listed as required field in opening line
- Defined as: *"one-sentence summary of your main doctrine answer"*
- No separate examples or format constraints beyond that

### 3. Mandatory or optional?

| Layer | Says |
|-------|------|
| `CLAIM_EXTRACTION_INSTRUCTION` | **"required JSON fields for doctrine questions"** |
| `buildSystemPrompt` (base) | **Different schema** — no `claims[]`, no `doctrineConclusion` |
| `response_format` | `{ type: 'json_object' }` only — **no required keys** |
| `normalizeClaims` fallback | **Optional at model level** — infers from `reply` if absent |

**Effective status:** **Optional** — model can omit fields; pipeline still runs via inference.

### 4. Whether examples exist

| Source | Contains `claims[]` example? |
|--------|---------------------------|
| `CLAIM_EXTRACTION_INSTRUCTION` | Field names only — **no filled example** |
| `buildSystemPrompt` JSON shape | **No** — shows `scripture[]` instead |
| `goldenCompanionExamples` | **No** matches for `claims` or `doctrineConclusion` |
| User payload | Evidence cards only — **no claims template** |

**No few-shot examples** demonstrate a populated `claims[]` or `doctrineConclusion`.

### 5. Whether OpenAI can legally omit `claims[]`

**Yes.**

| Mechanism | Effect |
|-----------|--------|
| `json_object` mode | Valid JSON only — **any keys allowed** |
| No `json_schema` / `strict` | No API-level enforcement |
| Competing base schema | Model trained toward `reply` + `scripture[]` shape |
| `normalizeClaims` | Silently recovers with `c_inferred` — no compose retry for missing claims |

---

## Competing schema conflict (root prompt defect)

`buildComposerSystemPrompt` assembles:

```
1. base = buildSystemPrompt(...)     ← includes canonical JSON shape
2. composerBlock (coreRestoration)   ← includes CLAIM_EXTRACTION_INSTRUCTION
3. evidence pack JSON
```

**Base schema** (`buddyBrain.js:339-351`) — what the model actually follows:

```json
{
  "reply": "natural companion response",
  "scripture": [{ "reference": "...", "text": "...", "reason": "..." }],
  "mode": "...",
  "confidence": "...",
  "memory_used": false,
  "suggested_settings_change": null,
  "orb_state": "...",
  "safety_level": "...",
  "next_steps": [...],
  "admin_flags": []
}
```

**No `claims[]`. No `doctrineConclusion`.**

Measured `topLevelKeys` on all 6 doctrine turns match this shape exactly.

---

## Post-processing path (masks failure)

```309:311:services/reasonFirstComposer.js
    const claims = normalizeClaims(parsed.claims || structured.claims, { reply: structured.reply });
    structured.claims = claims;
    structured.doctrineConclusion = extractDoctrineConclusion(parsed, claims);
```

```38:47:services/claimNormalizer.js
  if (!claims.length && reply && !SAFE_DENIAL_RE.test(reply)) {
    claims.push({
      claimId: 'c_inferred',
      claim: String(reply).slice(0, 280),
      type: 'doctrine',
      supportingScriptures: [],
      confidence: 'low',
      derivedFrom: 'inferred_from_reply',
    });
  }
```

When raw `claims` is missing → **one inferred claim, no scriptures** → validator class **C**.

---

## First failure point

**Model JSON generation** — before `safeJsonParse`, before `normalizeClaims`, before validator.

The model completes the legacy `scripture[]` schema and **does not include** authority metadata fields.
