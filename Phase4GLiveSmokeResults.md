# Phase 4G Live Smoke Results

Generated: 2026-06-11 (re-verified 18:43 UTC)  
Plan: `Phase4FRenderManualSmokePlan.md`  
Artifact: `docs/regression-trace/phase4g-parity-results.json`

## LOCAL (runBuddy — Phase 4F code)

**28 / 28 PASS**

| Test | Latency | Route | OpenAI |
|------|---------|-------|--------|
| Acts 10 initial | 169 ms | `doctrine_final_authority` | false |
| Correction (primarily) | 95 ms | `doctrine_correction_memory` | false |
| Acts 10 food challenge | 104 ms | `strict_doctrine_challenge_rejection` | false |
| Another verse ×10 | 88–120 ms | `doctrine_witness_inventory` | false |
| Death initial | ~100 ms | `doctrine_final_authority` | false |
| Death verse ×10 | ~90 ms | witness inventory | false |
| Dietary (pork) | ~100 ms | `doctrine_final_authority` | false |
| Memory recall | ~90 ms | `doctrine_memory_recall` | false |
| Before that | 88 ms | `doctrine_memory_recall` | false |
| OpenAI disabled | 92 ms | `doctrine_final_authority` | false |

Acts 10 exact wording present. No hedge phrases. No service-unavailable text.

## RENDER (live production)

**0 / 27 PASS**

| Test | Pass | Latency | Route | OpenAI | Notes |
|------|------|---------|-------|--------|-------|
| Acts 10 initial | FAIL | 20,692 ms | `reason_first_openai` | **true** | Hedge: "pivotal", "primarily", "while touching on dietary" |
| Correction | FAIL | 2,812 ms | `reason_first_openai` | **true** | Defends "primarily" |
| Food challenge | FAIL | 6,290 ms | `reason_first_openai` | **true** | Dietary law shift framing |
| Another verse ×10 | FAIL | 562–9,169 ms | mixed | true / `core_connection_error` | Verses 3–10: AI service trouble |
| Death initial | FAIL | varies | OpenAI path | true | Drift risk |
| Death verse ×10 | FAIL | 79–311 ms | — | — | **Blank replies** |
| Dietary | FAIL | 113 ms | — | — | **Blank reply** |
| Memory | FAIL | 271 ms | — | — | Blank; no recall |
| Before that | FAIL | varies | `reason_first_openai` / blank | true / — | No session recall on Render |

## Required scenarios — Render status

| Scenario | Render result |
|----------|---------------|
| Acts 10 | **FAIL** — OpenAI hedge, no exact Acts 10:28 contract |
| Death state | **FAIL** — blanks / OpenAI |
| Dietary law | **FAIL** — blank |
| Memory recall | **FAIL** |
| Before that | **FAIL** (functional) |
| Another verse ×10 | **FAIL** — errors + OpenAI |
| Correction challenge | **FAIL** |
| OpenAI disabled mode | **Not testable** on Render (no local gate) |

## Parity conclusion

**Render does not behave like local Phase 4F.** Doctrine drift, OpenAI on strict topics, service-unavailable loops, and blank responses all reproduced on production.
