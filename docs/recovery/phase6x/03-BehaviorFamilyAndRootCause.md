# Behavior Family Analysis + Root Cause Discovery

**Phase:** 6X — Phases 1–2  
**Date:** 2026-07-27  
**Rule:** No production modification until responsible subsystem identified. Prefer existing owners over new engines.

## Behavior families → root cause → status

| ID | Family | Originating subsystem | Root cause (evidence) | Status | Phase 6X action |
|---|---|---|---|---|---|
| BF-01 | Identity / continuation / ask-again | Continuation memory + orchestrator | Phase 5K didn’t persist continuation | Closed `7fc7acf` | Do not reopen |
| BF-02 | Correction failure | `responseRevisionOwner` | No owner before OpenAI fall-through | Closed Gate 3 | Do not reopen |
| BF-03 | Multi-part loss | Orchestrator bible_wide short-circuit | Single-concept owned multi-intent | Closed `cda87ef` | Do not reopen |
| BF-04 | Acts 10 / dietary polarity | Polish + correction lanes | Opener regex; thin restatement | Closed `fb2cb52`/`21314f9` | Do not reopen |
| BF-05 | Resurrection timing hijack | `detectSourceTopic` | Bare “resurrection” / Matt 12:40 | Closed `bef9092` | Do not reopen |
| BF-06 | Go-deeper topic dump | `responseRevisionOwner` | Dietary expansion on any scripture history | Closed `65c6382` | Monitor concurrent flake P2 |
| BF-07 | Memory horizon / Turn 19 | History window + no pin | Confabulation | Closed `3e8d45c` | Residual: multi-instance disk |
| BF-08 | Claim masking | `matchesForbidden` unless scope | Whole-reply `not` excused bad sentence | Closed `c2f4ff7` | Residual: early-lane bypass |
| BF-09 | Empty OpenAI reply | `callOpenAI` | Empty treated as success | Closed `6c8a843` | Residual: malformed JSON |
| BF-10 | IOG / evidence ≠ Scripture | Evidence pack utilization | Inventory ≠ used-in-answer | **Mitigated** | Audit utilization (Obj 3/13/14) |
| BF-11 | Original-language depth | Stage 7 utilization | Route exists; depth uncertified | **Mitigated** | Utilization verification |
| BF-12 | General knowledge / factual | OpenAI compose + guardrails | Suspected over-restriction / lane miss | **Unverified** | Obj 6 audit before repair |
| BF-13 | Companion tone / verbosity | Composer + polish | Quality not scored as gate | **Open (quality)** | Obj 7–8 measurement |
| BF-14 | Truth category labeling | Composer structure | No mandatory category headings | **Open (structure)** | Obj 4–5 if evidence shows blur on prod |
| BF-15 | Semantic multi-intent | Intent advisers | Keyword/heuristic limits | Certified for known matrix | Expand only on new FAIL evidence |
| BF-16 | Deploy / UI parity | Ops + channels | Stale SHA; browser E2E gap | SHA closed; browser P2 | Browser E2E deferred |

## Subsystem map (existing — prefer enhance)

| Phase 6X objective | Existing responsible system | New engine? |
|---|---|---|
| Semantic understanding | Orchestrator + intent advisers + current-intent pack | No — extend only on FAIL |
| Conversation intelligence | Conversation owner / continuation / doctrine state | No — extend state fields only if FAIL |
| Unified evidence broker | `retrievalEvidencePack` + catalogs | Audit/repair utilization; no second broker |
| Truth classification | `claimToScriptureValidator` + doctrine contracts | Extend labels in composer if blur proven |
| Universal response composer | Lane builders + `reasonFirstComposer` + polish | No parallel composer |
| General knowledge | `reason_first_openai` path | Audit restrictions before change |
| Companion engine | Companion lanes + presence/prayer/identity | Tone/quality scoring; no rewrite |
| Founder Truth Corpus v2 | FTC + Gate runners | Expand corpus + assertions |

## Phase 2 conclusion

Responsible subsystems for closed P0/P1 families are identified and repaired. **Open Phase 6X work is residual/unverified families BF-10…15** — starting with audit (IOG/ICOJ utilization, general-knowledge routing, companion quality scoring, corpus v2), not speculative new engines.
