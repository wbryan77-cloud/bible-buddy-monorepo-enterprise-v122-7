# Bible Authority Roadmap

**Date:** 2026-06-07  
**Phase:** 1E-A — PART D  
**Horizon:** Phase 2–4 (Bible-first authority engine)  
**Status:** Strategic plan only — no implementation

---

## Guiding principle

**Move doctrine ownership from OpenAI toward BibleBuddy.** OpenAI remains the **narrator**, not the **authority**.

---

## Ownership evolution

| Component | Today | Phase 2 | Phase 3 | Phase 4 (steady state) |
|-----------|-------|---------|---------|------------------------|
| Evidence retrieval | BibleBuddy | BibleBuddy | BibleBuddy | BibleBuddy |
| Binding rules / cards | BibleBuddy | BibleBuddy | BibleBuddy | BibleBuddy |
| **Doctrinal reasoning** | OpenAI | Extract + graph assist | **BibleBuddy graph** | **BibleBuddy graph** |
| **claims[]** | `c_inferred` | **BB extractor** | **BB generator (pre-compose)** | **BB generator** |
| **doctrineConclusion** | Inferred | BB derived | **BB from graph** | **BB from graph** |
| **reply prose** | OpenAI | OpenAI | OpenAI (narration) | OpenAI (narration only) |
| **scripture[]** | OpenAI | BB canonical; model optional | BB-owned witness list | BB-owned |
| Validator | BibleBuddy | BibleBuddy | Narration fidelity + claims | Lightweight fidelity |
| Approval gate | BibleBuddy | BibleBuddy | BibleBuddy | BibleBuddy |

---

## Phase 2 — Structured authority metadata (near-term)

**Theme:** Fix the metadata bottleneck without changing who reasons.

### Goals

- Replace `c_inferred` with deterministic claim extractor
- Map `scripture[]` → witness claims with approved-ref filter
- Sentence-level ref linking from `reply`
- `doctrineConclusion` from lead claim or first sentence
- ≥80% claims with `supportingScriptures` on 6-topic suite

### OpenAI-owned (Phase 2)

- `reply` prose
- `scripture[]` (until Phase 3)
- Companion tone, pastoral framing
- Non-doctrine turns

### BibleBuddy-owned (Phase 2)

- `claims[]` extraction
- `doctrineConclusion` derivation
- Approved-ref filtering
- Validator + approval (unchanged)

### Never delegated (Phase 2)

- Binding rule truth
- A/B/C/D classification logic
- Evidence card content

### Exit criteria

- 0% `c_inferred` on doctrine turns
- Validator A/B rate ≥40% on aligned topics
- `doctrineAnswerTrace` shows real `derivedFrom`

---

## Phase 3 — Evidence-first doctrine engine (mid-term)

**Theme:** BibleBuddy determines **what** to teach; OpenAI determines **how** to say it.

### Goals

- **Doctrine reasoning graph** traverses `bindingRules`, `teachingOrder`, `cautionPassages` for intent
- Generate `claims[]` + `doctrineConclusion` **before** `callOpenAI`
- Compose prompt becomes **narration contract**: approved claims in, prose out
- Validator checks: narration ⊆ approved claims; no orphan doctrine
- Reduce `BIBLE_ONLY_AUTHORITY_INSTRUCTION` reliance (rules in code)

### OpenAI-owned (Phase 3)

- Natural language narration of **pre-approved** claims
- Emotional companion framing (non-doctrine)
- Rephrasing for readability (not meaning)

### BibleBuddy-owned (Phase 3)

- **Doctrinal conclusions**
- **Claim generation from evidence**
- Teaching order execution (line upon line as graph walk)
- Scripture witness list (canonical `scripture[]`)
- Authority classification

### Never delegated (Phase 3)

- What Scripture teaches (conclusions)
- Binding rule application
- Whether a citation supports a claim
- Approval to ship doctrine content

### Exit criteria

- Doctrine turns: claims exist **before** compose on 100% of turns
- Validator pass rate ≥60% without degradation on card-covered topics
- Orphan doctrine in `reply` <5% (narration leak)

---

## Phase 4 — Bible Authority Engine steady state (long-term)

**Theme:** Scripture-only authority as architecture, not aspiration.

### Goals

- **Evidence-first pipeline** for all doctrine intents
- OpenAI = **narrator + companion** only on doctrine turns
- Genesis-to-Revelation teaching paths as explicit graph routes
- Authority scorecard per answer (evidence % vs model %)
- Optional: local narration without OpenAI for read-only/trace modes

### OpenAI-owned (Phase 4)

| Keep | Rationale |
|------|-----------|
| Prose fluency | UX quality |
| Pastoral listening | Mission-appropriate |
| Crisis / emotional turns | Not doctrine authority |
| Study prompts (non-doctrine) | Companion feature |

### BibleBuddy-owned (Phase 4)

| Own | Rationale |
|-----|-----------|
| Full doctrine graph | Mission core |
| All claims + conclusions | Traceability |
| Teaching traversal | Line upon line |
| Scripture witness canon | Scripture interprets Scripture |
| Authority metrics | Audit + trust |

### Never delegate to OpenAI (Phase 4)

| Never | Rationale |
|-------|-----------|
| **Doctrinal truth determination** | Mission violation |
| **Binding rule interpretation** | Frozen doctrine |
| **Final authority decision** | Bible-first |
| **Claim-to-Scripture support judgment** | Already BB-owned |
| **Evidence card semantics** | Frozen baseline |
| **Whether to teach X** | Graph decision |

---

## Phase map (visual)

```
Phase 1 (complete)     Phase 2              Phase 3                 Phase 4
─────────────────────────────────────────────────────────────────────────────
Infrastructure ✅  →  Claim extractor  →  Pre-compose claims  →  Narrator-only
E2E proof ✅          scripture[] map      Doctrine graph          Full BAE
1D ownership ✅       Deprecate c_inferred Narration contract    Authority %
```

---

## Risk register

| Risk | Phase | Mitigation |
|------|-------|------------|
| Robotic narration | 3–4 | Hybrid prompts; warmth instructions without doctrine freedom |
| Graph coverage gaps | 3 | Fall back to safe denial, not OpenAI reasoning |
| Migration regression | 2–3 | Fixture suite + 6-topic compliance runner |
| Cost increase | 3–4 | Single compose call maintained; graph is CPU |

---

## Out of scope (all phases per current constraints)

- New evidence cards
- New doctrine content
- New validators (extend existing only)
- IOG ingestion
