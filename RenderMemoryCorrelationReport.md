# Render Memory Correlation Report

**Date:** 2026-06-07  
**Purpose:** PART G — Correlate Render restarts, memory, and doctrine failures  
**Artifacts:** `e2e-doctrine-env-parity-audit.json`, `render-stability-verification.json`, `RenderRestartRootCauseAudit.md`

---

## Executive summary

| Question | Answer |
|----------|--------|
| Are OOM events causing **local** proof-run failures? | **No** — peak RSS 151 MB |
| Are OOM events causing **prior audit** failures? | **No** — 401 auth, ~5 s failures, RSS < 150 MB |
| Can OOM cause production doctrine failures? | **Yes, historically** on Free 512 MB tier |
| Current Render plan mitigates OOM? | **Yes** — `standard` (2 GB) in `render.yaml` |

---

## Proof-run memory profile

| Metric | Value |
|--------|-------|
| RSS before turn | 72 MB |
| RSS after turn | 151 MB |
| RSS delta | **+79 MB** |
| Heap delta | +22 MB |
| OpenAI latency | 6,363 ms (raw) / ~23 s (full turn w/ regen) |
| Regen count | **1** |
| OpenAI attempts | **2** |
| Concurrent requests | **1** (sequential audit) |
| OOM likely | **false** |
| Exit 134 observed | **false** |

---

## Render configuration (`render.yaml`)

| Setting | Value | Memory impact |
|---------|-------|---------------|
| `plan` | **standard** (2 GB) | Headroom vs documented 512 MB OOM |
| `BUDDY_DEBUG` | `0` | Smaller response payloads |
| `BUDDY_LIVE_TRACE` | `0` | No sync trace file per chat |
| `NODE_ENV` | `production` | — |
| `PERSISTENCE` | `MEMORY` | File-backed JSON stores |

---

## Historical Render restart correlation (repo docs)

| Source | Finding |
|--------|---------|
| `RenderRestartRootCauseAudit.md` | OOM → SIGKILL → cold restart → connection errors mid-flight |
| `RenderStabilityVerificationReport.md` | Free tier 512 MB exit **134** |
| `RenderMemoryStabilityAudit.md` | Double serialization + regen spikes heap |
| `render-stability-verification.json` | Offline stress: peak RSS **67 MB**, stable |

**OOM symptom vs auth symptom:**

| Signal | OOM restart | Auth failure |
|--------|-------------|--------------|
| Process survives | No | Yes |
| `openaiCalled` | false (if mid-flight) | false |
| RSS at failure | Near plan limit | Normal (< 200 MB local) |
| Error text | Connection reset / 502 | `401 Incorrect API key` |
| All topics fail identically | Sometimes | **Yes** (401 pattern) |

Prior Phase 1B / authority audits match **auth pattern**, not OOM.

---

## Regen + memory interaction

Proof run triggered **1 regen** (`openaiAttempts: 2`), doubling compose cost:

| Effect | Proof run | Risk on Render |
|--------|-----------|----------------|
| Second `chat.completions.create` | +~6 s, +RSS | Heap spike if concurrent load |
| Peak RSS with regen | 151 MB local | Would be higher at scale |
| OOM threshold (2 GB plan) | Far below | Safer than 512 MB tier |

Regen contributes to latency and memory but **did not** cause failure in proof run.

---

## Render live probe

| URL | Status | Note |
|-----|--------|------|
| `bible-buddy.onrender.com/health` | 404 | Cannot correlate live memory events |
| `bible-buddy.onrender.com/buddy/chat` | 404 | Public URL unconfirmed |

**Render restart correlation for production:** Documented historically; **not live-verified** in this audit.

---

## Conclusion (PART G)

OOM **can** contribute to production doctrine failures under load on small plans. It is **not** the bottleneck for:

1. Local proof run (151 MB peak)
2. Prior agent-shell audits (401 auth)

Infrastructure bottleneck for measured failures: **Environment (A) / Authentication**, not Memory (G).
