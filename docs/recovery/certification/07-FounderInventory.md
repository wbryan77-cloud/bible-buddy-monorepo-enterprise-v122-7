# 07 — Historical Founder Failure Inventory (CLOSED)

**Gate:** 8 — Historical Founder Inventory  
**Final decision:** **FOUNDER_INVENTORY_PASS**  
**Date:** 2026-07-24  
**Rule:** Evidence-backed only. Unknown fields marked unknown. No invented history.

## Decision criteria

Every required historical P0/P1 family is:

- represented with an evidence source;
- linked to a regression script where applicable;
- production-validated or explicitly marked mitigated/unverified with residual.

## Status summary

| ID | Category | Status | Owning gate |
|---|---|---|---|
| FFI-01 | App identity / clarification loop | closed | Gate 3 / 7 |
| FFI-02 | Explicit Scripture → core_connection_error | closed | Gate 4 / 6 |
| FFI-03 | Acts 10 | closed | Gate 4 |
| FFI-04 | Isaiah 66 | closed | Gate 4 |
| FFI-05 | Resurrection timing | closed | Gate 4 |
| FFI-06 | Sabbath | closed | Gate 4 |
| FFI-07 | State of the dead | closed | Gate 4 |
| FFI-08 | Prayer | closed | Gate 4 / 3 |
| FFI-09 | Original language | mitigated | Gate 4 (routing); utilization residual |
| FFI-10 | Retrieval / evidence mismatch | mitigated | Gate 4; IOG utilization residual |
| FFI-11 | Memory short + long horizon | closed | Gate 2 |
| FFI-12 | Invented Turn 19 recall | closed | Gate 2 |
| FFI-13 | Go deeper context loss | closed | Gate 4 / 2 |
| FFI-14 | Correction failure | closed | Gate 3 |
| FFI-15 | Multi-part answer loss | closed | Gate 3 |
| FFI-16 | OpenAI failure behavior | closed | Gate 6 |
| FFI-17 | Browser/API/production mismatch | closed | Gate 7 (interactive browser P2) |
| FFI-18 | Duplicated ownership | mitigated | Gate 3 |
| FFI-19 | Deployment / stale commit | closed | Cross-cutting health SHA |
| FFI-20 | CI module parsing failure | closed | Gate 1 |
| FFI-21 | Resurrection timeline hijack (death-state / Matt 12:40 / 1 Cor 15) | closed | Gate 4 |
| FFI-22 | Claim verifier sentence-unless masking | closed | Gate 5 |
| FFI-23 | Empty OpenAI → `[object Object]` | closed | Gate 6 |

## Record table (compact)

| ID | Evidence | Symptom | Root cause | Repair | Regression | Prod validation |
|---|---|---|---|---|---|---|
| FFI-01 | ArchitectureTruth; FTC A1–A3 | Tell me more / Go deeper → ask-again | Phase 5K no continuation memory | `7fc7acf` | FTC; Gate 3/7 | FTC / UI identity PASS |
| FFI-02 | FTC W1; Gate 4 | Scripture → connection clarifier | Fall-through / empty compose | `7fc7acf`; `6c8a843` | FTC; Gate 4/6 | Gate 4 29/29; Gate 6 |
| FFI-03 | v3 RC-CERT; FTC H1/H2 | Opener mutation; missed-question on correction | Polarity guard; thin restatement | `fb2cb52`; `21314f9` | FTC; Gate 3/4 | FTC 32/32; Gate 4 C |
| FFI-04 | FTC H3; Gate 4 D/A | Missed Isaiah 66:17 follow-up | unknown (routing gap) | unknown | FTC; Gate 4 | Gate 4 PASS |
| FFI-05 | v5 RT report | Timing → hope doctrine | Intercept missing | `65c6382` | RT challenge; Gate 4 B | RT 8/8 prod |
| FFI-06 | FTC P1; Gate 4 E | Sabbath/history bleed | Doctrine lane + intent | unknown | FTC; Gate 4 | Gate 4 E PASS |
| FFI-07 | Gate 4 baseline FAIL | Death-state → timing lane | Bare `resurrection` in `detectSourceTopic` | `bef9092` | Gate 4; ownership test | 29/29 on `bef9092` |
| FFI-08 | FTC E; ArchitectureTruth | Prayer follow-up ask-again | Continuation not saved | `7fc7acf` | FTC; Gate 4/7 | Prayer PASS |
| FFI-09 | v3 HebrewGreek; Gate 4 H | Utilization uncertified | Stage 7 gap | `2510d76` (data) | FTC Q1; Gate 4 | Route PASS; util residual |
| FFI-10 | FTC Y1; IOG reports | Evidence vs Scripture risk | Utilization incomplete | unknown | FTC Y1; Gate 4 | Y1 PASS; IOG residual |
| FFI-11 | `01-MemoryCertification.md` | Clarification instead of pin | No durable pin; short history | `3e8d45c` | `runMemoryCertification.js` | 18/18 on `3e8d45c` |
| FFI-12 | Memory M4b; v6 repro | Invented “Turn 19” | Confabulation from short window | `3e8d45c` | Memory cert | 18/18 |
| FFI-13 | v5 MemoryRootCause MEM-V5-001 | Go deeper → Acts 10 dump | Revision owner wrong expansion | `65c6382` | RT JD1; Gate 4 I | JD1 PASS |
| FFI-14 | Lineage §2; Gate 3 | Correction → ask-again | No correction owner | `7fc7acf`; `fb2cb52`; `21314f9` | Gate 3; FTC | Gate 3 10/10 |
| FFI-15 | FTC B1; Gate 3 | Multi-part drop | bible_wide short-circuit | `3d9b5ff`; `cda87ef` | Gate 3/4 | G8 + J PASS |
| FFI-16 | Gate 6 cert | Unsafe OpenAI faults | Empty treated as success | `6c8a843` | Resiliency drill | 18/18; health `6c8a843` |
| FFI-17 | v3 Stage 5; Gate 7 | Channel mismatch risk | API-only cert historically | docs `b45b8af` | UI parity runner | 15/15 chat↔stream |
| FFI-18 | Gate 3 ownership | Competing owners | Ordered duplicates | `cda87ef` lineage | Gate 3 | CONVERSATION_PASS; residual dead phase5O |
| FFI-19 | RC4 root cause | Local green ≠ prod | Stale Render SHA | Deploy discipline | `/health.releaseCommit` | Each gate Check 1 |
| FFI-20 | `00-CIPipelineCertification.md` | ESM `import` CI fail | Bare `node --check` on ESM | `864cea0` | CI workflow | Actions success |
| FFI-21 | Gate 4 Check 2 | Matt 12:40 / 1 Cor 15 hijack | Same as FFI-07 detector | `bef9092` | Ownership test; Gate 4 | 29/29 |
| FFI-22 | Gate 5 cert | Bad sentence masked by “know not” | unless on whole reply | `c2f4ff7` | Claim verifier cert | 18/18 |
| FFI-23 | Gate 6 drill pre-fix | `[object Object]` empty reply | Empty content `ok:true` | `6c8a843` | Resiliency R5 | Post-fix safe fallback |

## Gaps (non-blocking for inventory PASS)

1. Forced live OpenAI outage on Render (local stub only — Gate 6 residual).
2. Full interactive browser Founder replay automation (Gate 7 P2).
3. State-of-the-dead depth variants (thief / Lazarus) not in Gate 4 matrix.
4. Exhaustive raw Founder chat archive.
5. Complete IOG per-answer utilization telemetry.
6. Multi-instance durable pin store on ephemeral disk.
7. Dead phase5O source removal (behavior already owned).

## Final decision

**FOUNDER_INVENTORY_PASS**

All required historical P0/P1 families are represented, evidence-linked, regression-covered (or residual-marked), and closed or explicitly mitigated.

## Next gate

Gate 9 — Final Founder Acceptance Challenge.
