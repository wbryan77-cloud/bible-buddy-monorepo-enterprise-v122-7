# Environment Parity Report

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Goal:** Determine whether `responses.create` SUCCESS and `runBuddy` failure occur under different environments  
**Artifact:** `docs/regression-trace/e2e-doctrine-env-parity-audit.json`

---

## Executive answer

**Yes — prior failures were environment mismatch (A), not runtime mismatch (C).**

When the same shell exports a valid `sk-proj` key, **both** `responses.create` **and** `runBuddy` succeed. When the agent shell inherited a corrupted key (prefix `william`, len 257), **both** production compose **and** `chat.completions.create` failed with **401**.

---

## Environment comparison matrix

| Surface | PID | CWD | OPENAI_MODEL | Key fingerprint | NODE_ENV | dotenv | Compose result |
|---------|-----|-----|--------------|-----------------|----------|--------|----------------|
| **1. User terminal** | user shell | repo root | `gpt-4.1-mini` | `sk-proj` / 164 *(manual export)* | unset | N/A (manual export) | `responses.create` ✅ |
| **2. Local node (child, no dotenv)** | 94161 | repo root | `gpt-4.1-mini` | sha256_8 `a38b6209` | null | skipped | inherits parent export ✅ |
| **3. Local node (child, dotenv)** | 94162 | repo root | `gpt-4.1-mini` | sha256_8 `a38b6209` | null | `.env` **missing** | same ✅ |
| **4. Audit / runBuddy runtime** | 93986 | repo root | `gpt-4.1-mini` | sha256_8 `a38b6209` | null | no file loaded | `openaiCalled: true` ✅ |
| **5. Render (inferred)** | — | `/opt/render/...` | `gpt-4.1-mini` *(default)* | dashboard secret *(not probeable)* | **production** | N/A | **not live-probed** (404) |
| **6. Prior agent shell (blocked)** | — | repo root | `gpt-4.1-mini` | prefix `william` / len **257** | null | — | `openaiCalled: false` ❌ 401 |

---

## Key parity finding

| Metric | Healthy env | Polluted env (prior audits) |
|--------|-------------|----------------------------|
| `looksSk` | `true` | **`false`** |
| Key length | **164** | **257** |
| OpenAI error | none | `401 Incorrect API key provided: william@…` |
| `responses.create` | SUCCESS | Would fail if tested with same key |
| `runBuddy` | SUCCESS | Connection fallback |

**Conclusion:** `responses.create` SUCCESS in user terminal does **not** prove `runBuddy` health if a **different process** (Cursor agent shell) holds a different `OPENAI_API_KEY`.

---

## dotenv / env file status

| Item | Value |
|------|-------|
| `.env` in repo | **Does not exist** |
| `loadedEnvFiles` | `[]` |
| Effective key source | Shell `export OPENAI_API_KEY=sk-proj-…` |
| `render.yaml` `OPENAI_API_KEY` | `sync: false` — must be set in Render dashboard |

---

## API surface parity

| API | Same client singleton? | Proof run |
|-----|------------------------|-----------|
| `responses.create` | ✅ | SUCCESS (1753 ms) |
| `chat.completions.create` (minimal) | ✅ | SUCCESS (562 ms) |
| `chat.completions.create` (production prompt) | ✅ | SUCCESS (6363 ms, 8518 prompt tokens) |
| `runBuddy` full path | ✅ via `callOpenAI` | SUCCESS |

No OpenAI **client** mismatch between APIs — failures were **authentication/environment**, not API choice.

---

## Render runtime (PART B item 4)

| `render.yaml` setting | Value |
|----------------------|-------|
| `plan` | **standard** (2 GB) |
| `NODE_ENV` | `production` |
| `BUDDY_RUNTIME` | `legacy` (ignored by hard cutover) |
| `OPENAI_API_KEY` | dashboard secret |
| `BUDDY_DEBUG` | `0` |
| `BUDDY_LIVE_TRACE` | `0` |

**Live probe (2026-06-07):**

| URL | Status | Note |
|-----|--------|------|
| `https://bible-buddy.onrender.com/health` | **404** | Service name may differ from public URL |
| `https://bible-buddy.onrender.com/buddy/chat` | **404** | Cannot verify Render `OPENAI_API_KEY` fingerprint remotely |

Render parity for OpenAI auth **cannot be confirmed** from this audit — only inferred from `render.yaml` + prior OOM documentation.

---

## Working directory / process

| Field | Audit run |
|-------|-----------|
| `cwd` | `/Users/william/Documents/bible-buddy-monorepo-enterprise-v122-7` |
| `nodeVersion` | v26.0.0 |
| `process.pid` | 93986 |
