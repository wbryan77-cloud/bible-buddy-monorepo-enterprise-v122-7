# Bible Authority Engine Strategic Recommendation

**Date:** 2026-06-07  
**Phase:** 1E-A — PART E Final Recommendation  
**Status:** Diagnosis only — no implementation

---

## The question

> Should BibleBuddy continue moving toward **validator-heavy OpenAI reasoning**?
>
> OR
>
> Should BibleBuddy gradually move **doctrine ownership away from OpenAI** toward a **Bible Authority Engine**?

---

## Recommendation

### **Move doctrine ownership toward the Bible Authority Engine.**

Do **not** treat validator-heavy OpenAI reasoning as the long-term architecture.

Validator-heavy OpenAI reasoning remains a **necessary bridge** (Phases 1–2) but is **misaligned with mission** as the destination.

---

## Rationale

### 1. Mission contradiction is structural, not cosmetic

The mission states **OpenAI should not determine doctrine**. Production `CORE_RESTORATION_INSTRUCTION` states **"You author the final reply"** with evidence as input. The model **does** determine doctrine today — in `reply` prose, before any validator runs.

Validators classify and degrade **after** reasoning occurred. They cannot make the system Bible-first; they can only reduce harm.

### 2. Infrastructure proof changed the bottleneck, not the architecture

| Proven ✅ | Not proven ❌ |
|-----------|---------------|
| Retrieval | OpenAI `claims[]` (0/6) |
| Evidence injection | Scripture-only authority |
| OpenAI compose | Model-reasoned doctrine alignment |
| Validator execution | Traceability (100% `c_inferred`) |

The next work is **ownership**, not more validation on model output.

### 3. Validator-heavy OpenAI reasoning has hit diminishing returns

| Investment | Return |
|------------|--------|
| `BIBLE_ONLY_AUTHORITY_INSTRUCTION` | Model still emits training priors in `reply` |
| `CLAIM_EXTRACTION_INSTRUCTION` | 0/6 compliance — ignored for `claims[]` |
| `FORBIDDEN_CLAIM_RULES` | Catches D after compose; orphan scan partial |
| Regen on fail | 2× API cost; same schema conflict |

Adding validators without moving reasoning **increases cost and complexity** without fixing who owns doctrine.

### 4. BibleBuddy already has authority infrastructure — not a reasoning engine

Frozen evidence cards, `approvedEvidenceGraph`, `claimSupportVerifier`, and `validateClaimToScripture` are **downstream authority tools**. Phase 3–4 promotes them to **upstream reasoning** — graph traversal produces claims before OpenAI speaks.

### 5. Three architectures ranked against mission

| Architecture | Mission fit |
|--------------|-------------|
| MODEL-FIRST (today) | ❌ Poor |
| HYBRID (staged) | ✅ Good — recommended path |
| EVIDENCE-FIRST (destination) | ✅ Strong — long-term target |

### 6. Claim strategy sequence (PART C)

| Stage | Approach | Role |
|-------|----------|------|
| **Now (Phase 2)** | BibleBuddy **extracts** from `reply` + `scripture[]` | Fix metadata; no new reasoning |
| **Next (Phase 3)** | BibleBuddy **generates** claims pre-compose | Doctrine from graph |
| **Not strategic** | OpenAI generates claims | 0/6 proven; self-report untrustworthy |

---

## What to continue vs change

### Continue (short-term)

- OpenAI compose for **prose fluency**
- Existing validators as **safety net** during migration
- Evidence retrieval and frozen cards
- E2E compliance measurement

### Change (strategic)

| From | To |
|------|-----|
| OpenAI authors doctrine | OpenAI **narrates** approved doctrine |
| Post-hoc validation as primary gate | **Pre-compose claims** as primary authority |
| `c_inferred` | Deterministic extractor → graph generator |
| Prompt-based line-upon-line | **Graph traversal** teaching order |
| Validator-heavy | **Evidence-first** with light narration check |

### Never delegate to OpenAI (steady state)

1. Doctrinal conclusions
2. Binding rule application
3. Claim-to-Scripture support determination
4. What may be taught as biblical fact
5. Final authority approval on doctrine content

---

## Answering PART E directly

| Path | Verdict |
|------|---------|
| Continue toward validator-heavy OpenAI reasoning | **No** — as end state |
| Move doctrine ownership to Bible Authority Engine | **Yes** — via Hybrid → Evidence-first roadmap |

**Confidence:** High — supported by Phases 1B–1D measurements and mission text.

---

## Immediate next step (when implementation authorized)

**Phase 2 / 1E-B:** Build claim extractor (Phase 1D decision) — **metadata only**, no reasoning shift yet.

**Phase 3 charter:** Design doctrine reasoning graph that consumes `approvedEvidenceGraph` + intent → `claims[]` before compose.

---

## Deliverables index (Phase 1E-A)

| Document | Purpose |
|----------|---------|
| `ReasoningOwnershipMap.md` | PART A — who owns what today |
| `AuthorityArchitectureComparison.md` | PART B — three architectures |
| `ClaimAuthorityComparison.md` | PART C — three claim strategies |
| `BibleAuthorityRoadmap.md` | PART D — Phases 2–4 |
| **This document** | PART E — final recommendation |

---

## Stop condition

Phase 1E-A complete. No implementation, prompts, schemas, doctrine, evidence, validators, deploy, or push.

**Strategic direction:** Bible Authority Engine owns doctrine; OpenAI owns narration.
