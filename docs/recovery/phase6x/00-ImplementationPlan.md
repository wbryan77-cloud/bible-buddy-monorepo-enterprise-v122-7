# Phase 6X Implementation Plan

**Status:** AWAITING APPROVAL — no further production code changes until approved  
**Date:** 2026-07-27  
**Baseline:** Gates 1–10 **GO_FOR_FOUNDER_ALPHA** at `0bfcbf7`; prod tip `74da9bf` (docs/entry)  
**Constraint:** Evidence → Audit → Root Cause → Coordinated Repair. No speculative architecture rewrite.

---

## 1. Executive stance

Phase 6X batch Objectives 1–8 describe capabilities. Evidence shows most corresponding **failure families are already closed** under certified owners. Building parallel “Semantic Understanding Engine / Unified Evidence Broker / Universal Response Composer” systems would violate:

- Architecture Freeze  
- “This is not another architecture rewrite”  
- “Preserve all previously validated architecture unless evidence demonstrates…”  

**Plan:** treat Objectives as **acceptance criteria and enhancement targets on existing owners**, not greenfield engines. Repair only where residual evidence or new production FAIL appears.

---

## 2. Affected subsystems (existing)

| Subsystem | Path(s) | Role in 6X |
|---|---|---|
| Orchestrator / lanes | `services/bibleCompanionOrchestrator.js` | Intent/lane (Obj 1–2) |
| OpenAI-first runtime | `services/openAiFirstCompanionRuntime.js` | Pins, RT intercept, guards |
| Retrieval evidence pack | `services/retrievalEvidencePack.js` | Broker (Obj 3, 13–14) |
| Claim-to-Scripture validator | `services/claimToScriptureValidator.js` | Truth (Obj 4) |
| Reason-first composer | `services/reasonFirstComposer.js` | Composition / GK (Obj 5–6) |
| Companion lanes | prayer / presence / identity / polish | Companion (Obj 7–8) |
| Regression corpora | `scripts/runFounderTruthCorpus.js` + Gate runners | Obj 9 / Phase 4 |

**Out of scope unless new FAIL:** CI module repair, memory pin architecture rewrite, doctrine corpus expansion, Admin Command Center, public entry aliases.

---

## 3. Proposed workstreams (ordered)

### WS-A — Evidence completion (no runtime change)
1. Publish Phase 0–2 reports (this folder) — **DONE in this turn**  
2. Inventory IOG/ICOJ/historical corpus wiring vs usage telemetry  
3. Collect any new Founder transcripts (if available outside repo) into analysis  

### WS-B — Founder Truth Corpus v2 (regression only)
1. Promote FFI + Gate cases into versioned `FounderTruthCorpus-v2` schema: intent, route, evidence, structure, tone, behavior  
2. Add residual cases: concurrent go-deeper stress, malformed JSON OpenAI, thief/Lazarus depth, browser smoke checklist  
3. Keep runners production-first; no test gaming  

### WS-C — Residual P2 repairs (one surgical patch at a time, only with repro)
| Priority | Residual | Proposed change | Risk |
|---|---|---|---|
| P2-1 | Malformed non-JSON OpenAI content | Treat unparseable content like empty → compose failure (`reasonFirstComposer`) | Low; mirrors `6c8a843` |
| P2-2 | Concurrent go-deeper flake | Repro under load; if confirmed, harden continuation ownership | Medium; touches revision owner |
| P2-3 | Claim verifier early-lane bypass | Document or add detect-only audit on bypass lanes — **no second verifier** | Medium if mutating |
| P2-4 | Multi-instance pin durability | Shared store design — **separate change; high ops risk** | High — defer unless Alpha requires HA |

### WS-D — Audits before any Obj 3–6 code
1. **OpenAI Routing Audit** — when does general knowledge land on clarifier / doctrine / OpenAI?  
2. **Unified Evidence Broker Report** — does `retrievalEvidencePack` consult IOG/ICOJ/history automatically?  
3. **General Knowledge Recovery Report** — reproduce ordinary factual FAIL on production; identify first contract  
4. **Historical Classification Verification** — sample prod replies for Scripture/history blur  

### WS-E — Companion quality (measurement first)
1. Define measurable Companion Quality Score (intent, warmth, proportionality, fidelity)  
2. Score Gate 9 / FTC artifacts offline  
3. Only then adjust polish/composer prompts if scores show systematic robotic/verbose FAIL  

### WS-F — Certification gate
Do **not** re-issue Founder Alpha GO. Issue **Phase 6X Readiness Addendum** only when:
- Residual P2s chosen for Alpha are closed or explicitly deferred  
- Corpus v2 green on production  
- Companion quality score meets agreed threshold  
- No new P0/P1 on certified matrices  

---

## 4. Explicitly deferred (not this plan’s first repairs)

- New Semantic Understanding Engine module  
- New Conversation Intelligence store replacing orchestrator state  
- Second evidence broker or second composer  
- Doctrine/prompt rewrite campaigns  
- Reopening Gates 1–5 closed defects without new FAIL  

---

## 5. Expected risks

| Risk | Mitigation |
|---|---|
| Accidental reopen of certified paths | One-purpose commits; rerun touched Gate families + FTC |
| Speculative “engine” sprawl | Require FAIL artifact before code |
| Companion tone changes flipping doctrine | No tone patch without fidelity regression |
| Admin dirty tree pollution | Entry/runtime commits stay Companion-scoped |

---

## 6. Regression strategy

After any approved runtime patch:

1. Affected family runner  
2. `runFounderTruthCorpus.js` (32)  
3. If memory touched → Memory cert  
4. If orchestrator/revision touched → Gate 3 + Gate 4  
5. If composer/OpenAI touched → Gate 4 + Gate 6 drill  
6. If claim touched → Gate 5 + Gate 4  
7. Deploy; match `/health.releaseCommit`; production re-run  

---

## 7. Deliverables map (batch list → this plan)

| Required deliverable | When |
|---|---|
| 1 Founder Engineering History | `01-FounderEngineeringHistoryReport.md` — now |
| 2 Conversation Analysis | `02-FounderConversationAnalysisReport.md` — now |
| 3 Behavior Family Analysis | `03-BehaviorFamilyAndRootCause.md` — now |
| 4 Root Cause Analysis | same file — now |
| 5–6 Systemic Repair / Applied Changes | After approval + WS-C |
| 7–8 Regression + Corpus v2 | WS-B |
| 9 Companion Quality | WS-E |
| 10–15 Broker / OpenAI / History / IOG / ICOJ / GK reports | WS-D audits |
| 16 Final Founder Alpha Readiness | WS-F addendum |

---

## 8. Approval ask

Approve one of:

**A. Audit-first (recommended):** Execute WS-A, WS-B, WS-D, WS-E (docs + corpus + audits + quality scoring). No runtime code until a WS-D audit produces a reproducible FAIL.

**B. Residual repair now:** Additionally authorize WS-C P2-1 (malformed JSON → compose failure) as the first surgical production patch, with full regression.

**C. Full Objectives 1–8 greenfield:** Explicitly override freeze and authorize new engines (not recommended; conflicts with certified architecture).

Reply with **A**, **B**, or **C** (or a modified mix). No production code changes proceed until then.
