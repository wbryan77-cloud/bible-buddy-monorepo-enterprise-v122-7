# Reasoning Ownership Map

**Date:** 2026-06-07  
**Phase:** 1E-A — Reasoning Ownership Audit  
**Status:** Diagnosis only — no implementation

---

## Mission anchor

BibleBuddy is intended to be:

- Bible first
- Scripture interprets Scripture
- Line upon line, precept upon precept
- Genesis to Revelation
- **OpenAI should not determine doctrine**

---

## Current production flow

```
User question
    │
    ▼
┌───────────────────────────────────────────────────────────┐
│  BIBLEBUDDY — Retrieval layer                             │
│  questionIntentResolver → retrievalEvidencePack           │
│  evidenceCards, approvedCatalogEvidence, answerGuidance   │
│  approvedEvidenceGraph (validator-only, post-compose)     │
└───────────────────────────┬───────────────────────────────┘
                            │ evidence JSON in prompt
                            ▼
┌───────────────────────────────────────────────────────────┐
│  OPENAI — Compose layer (reasonFirstComposer)             │
│  buildSystemPrompt + BIBLE_ONLY_AUTHORITY_INSTRUCTION     │
│  CORE_RESTORATION: "You author the final reply"           │
│  Model selects refs, structures argument, writes doctrine   │
│  Output: reply, scripture[] (legacy schema)                 │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│  BIBLEBUDDY — Post-hoc gates                              │
│  normalizeClaims (c_inferred fallback)                    │
│  validateClaimToScripture → A/B/C/D                       │
│  ownershipGuard, directnessGuard, bibleOnlyAuthority        │
│  applyClaimDegradation → approval                         │
└───────────────────────────┬───────────────────────────────┘
                            ▼
                      User-visible answer
```

**Path:** `runBuddy` → `openAiFirstCompanionRuntime` → `composeReasonFirstReply` → `callOpenAI`

---

## Ownership matrix (today)

| Capability | Owner today | Evidence |
|------------|-------------|----------|
| **Topic routing** | BibleBuddy | `questionIntentResolver`, `retrievalEvidencePack` |
| **Evidence selection** | BibleBuddy | Frozen evidence cards, catalog chains |
| **Binding rules (frozen)** | BibleBuddy | `evidenceCards/*.card.js`, `approvedEvidenceGraph` |
| **Doctrinal reasoning** | **OpenAI** | `CORE_RESTORATION`: "You author the final reply"; evidence is input only |
| **Scripture interpretation** | **OpenAI** | Model chooses which refs to cite and how to read them in `reply` |
| **Teaching order (line upon line)** | **OpenAI** (prompt-guided) | `teachingOrder` in evidence — not executed as code |
| **Doctrinal conclusions** | **OpenAI** | Encoded in `reply` prose; `doctrineConclusion` field 0/6 |
| **Claims metadata** | **OpenAI** (intended) / BibleBuddy (actual via `c_inferred`) | Phase 1C: 0/6 model claims |
| **Authority classification** | BibleBuddy | `validateClaimToScripture`, `claimSupportVerifier` |
| **Final answer text** | OpenAI (possibly degraded) | Validator strips/replaces; user sees model prose |
| **Companion tone / pastoral** | OpenAI | Appropriate delegation |

---

## PART A — Who owns what?

### Who owns reasoning?

| Layer | Owner | Assessment |
|-------|-------|------------|
| **Evidence gathering** | BibleBuddy | ✅ Aligned |
| **Doctrinal argument construction** | **OpenAI** | ⚠️ **Misaligned with mission** |
| **Logical chaining across refs** | **OpenAI** | Prompt asks line-upon-line; execution is model weights |
| **Validation / rejection** | BibleBuddy | Post-hoc — reasoning already happened |

**Verdict:** Reasoning is **model-owned** for doctrine turns. BibleBuddy reasons only in validators (pattern match, graph lookup), not in answer construction.

### Who owns doctrine?

| Artifact | Owner |
|----------|-------|
| Frozen baseline (cards, binding rules) | BibleBuddy |
| **What is taught this turn** | **OpenAI** |
| **What Scripture means here** | **OpenAI** |
| What is forbidden (D rules) | BibleBuddy (detection only) |

**Verdict:** Doctrine **content** is OpenAI-determined at compose time. BibleBuddy owns **constraints**, not **conclusions**.

### Who owns conclusions?

| Type | Owner |
|------|-------|
| `doctrineConclusion` field | Intended OpenAI — **0/6 emitted** |
| Effective conclusion in `reply` | **OpenAI** |
| Post-degradation conclusion | OpenAI prose + BibleBuddy denial append |

**Verdict:** Conclusions are **OpenAI-owned** in practice.

### Who owns authority?

| Function | Owner |
|----------|-------|
| Scripture as authority source (design) | BibleBuddy mission |
| **Which claims bind** | BibleBuddy validator |
| **Which claims ship** | OpenAI first; BibleBuddy degrades |
| Traceability | Broken — `c_inferred` without refs |

**Verdict:** Authority is **nominally** Bible-first; **operationally** model-first with validator correction.

---

## Mission alignment gap

```
MISSION SAYS                          SYSTEM DOES
─────────────────────────────────────────────────────────
OpenAI should not determine doctrine  OpenAI authors final reply
Scripture interprets Scripture        Model interprets with training priors
Line upon line (deterministic)        Stochastic compose + regen
Genesis to Revelation (ordered)       teachingOrder is prompt hint only
Bible-first authority                 Validator-heavy post-hoc gate
```

**Gap severity:** **High** for doctrine turns. Acceptable for pastoral/non-doctrine companion turns.

---

## What BibleBuddy already owns (foundation for shift)

| Component | File | Role |
|-----------|------|------|
| Evidence cards | `services/evidenceCards/` | Frozen doctrine baseline |
| Approved graph | `approvedEvidenceGraph.js` | Ref + binding rule index |
| Citation support rules | `claimSupportVerifier.js` | Affirmation/denial patterns |
| Claim validator | `claimToScriptureValidator.js` | A/B/C/D classification |
| Retrieval pack | `retrievalEvidencePack.js` | Evidence injection |

These are **authority infrastructure** — not yet a **reasoning engine**.
