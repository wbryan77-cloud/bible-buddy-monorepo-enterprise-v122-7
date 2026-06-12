# Phase 4G Failure Forensics

Generated: 2026-06-11 (re-verified 18:43 UTC)  
**No patches applied** — root-cause identification only.

## Latest run snapshot (Render)

| Field | Acts 10 initial (remote) |
|-------|--------------------------|
| activeDoctrineTopic | Not set server-side (no strict gate; OpenAI path) |
| previousDoctrineTopic | N/A |
| latency | 20,692 ms |
| heapUsed / rss | Not available (`/api/runtime-health` → 404) |
| timeout count | Unknown on Render |
| error count | Unknown on Render |
| OpenAI status | configured + **called** |
| response path | `reason_first_openai` |

## Executive summary

Production failures are **not** random Render glitches in isolation. They match **pre–Phase 4F architecture**: strict doctrine goes through OpenAI, failures surface `core_connection_error`, and session state does not drive continuations on Render.

## Failure 1 — Acts 10 doctrine drift

| Field | Value |
|-------|-------|
| Request | `What does Acts 10 mean?` |
| Response path | `reason_first_openai` |
| openAiCalled | `true` |
| Latency | 12,161 ms |
| Reply pattern | "significant chapter", "inclusivity", Gentiles framing without Acts 10:28 contract |

**Root cause:** `strictDoctrineGate` / `doctrineFinalAuthorityEngine` **not in deployed build**. `attachDoctrineStrictContract` + OpenAI composer authors doctrine.

**Session state:** Remote `userId` had no local `doctrineConversationState` (Render file state unknown; behavior shows no gate).

## Failure 2 — Correction defends "primarily"

| Field | Value |
|-------|-------|
| Request | `Why are you saying primarily?` |
| Route | `reason_first_openai` |
| openAiCalled | true |
| Reply | Defends use of "primarily" and "inclusivity" |

**Root cause:** No `doctrine_correction_memory` handler on deployed path.

## Failure 3 — Service unavailable loop

| Field | Value |
|-------|-------|
| Requests | `show me another verse` (turns 3–10) |
| Route | `core_connection_error` |
| openAiCalled | false |
| User text | "I'm having trouble reaching the AI service right now." |
| Latency | 562–1,877 ms |

**Root cause:** Old `buildConnectionErrorReply` path without `responseGuarantee` / strict local fallback. OpenAI failures on prior turns left continuation on non-strict error speaker.

## Failure 4 — Blank replies (death continuation)

| Field | Value |
|-------|-------|
| Requests | Death `show me another verse` ×10 |
| Reply length | 0 |
| Latency | 79–311 ms |

**Root cause:** Likely degraded instance / empty structured reply from failed compose path; no witness inventory fallback. May correlate with OpenAI rate limits or partial deploy errors after error storm.

## Failure 5 — Missing runtime health

| Field | Value |
|-------|-------|
| Endpoint | `GET /api/runtime-health` |
| Status | 404 |

**Root cause:** Phase 4F `routes/runtimeHealth.js` not deployed.

## Environment deltas (contributing)

| Factor | Render | Local Phase 4F |
|--------|--------|----------------|
| Strict gate | Absent | Present |
| Phrase guard | Absent | Present |
| Error firewall on route | Partial | Full |
| Chat timeout guarantee | Absent | 55s wrapper |
| State TTL cleanup | Absent | Scheduled |

## OpenAI status

- Render: **configured** and **called** on strict doctrine (undesired).
- Local Phase 4F: configured but **blocked** for strict doctrine (`openAiCalled: false`).

## Recommended fix path (not applied in 4G)

1. **Deploy** workspace containing Phase 4E–4F to Render (commit + autoDeploy).
2. Add optional env to Render dashboard: `BIBLEBUDDY_CHAT_TIMEOUT_MS=55000`, `BIBLEBUDDY_STATE_TTL_MS=86400000`.
3. Re-run `scripts/runPhase4GProductionParityVerification.js`.
4. Confirm `/api/runtime-health` returns 200 and remote smoke ≥ 27/27.
