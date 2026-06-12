# Phase 4G Environment Parity Report

Generated: 2026-06-11 (re-verified 18:43 UTC)  
Deploy URL probed: `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`

## Summary

**Production does not match local Phase 4F runtime.** Render serves an older build (no `/api/runtime-health`, OpenAI-first doctrine path). Local verification uses Phase 4E–4F code in this workspace.

## LOCAL vs RENDER comparison

| Variable / setting | LOCAL (this workspace) | RENDER (`render.yaml` + live probe) | Parity |
|--------------------|------------------------|-------------------------------------|--------|
| `NODE_ENV` | unset (dev); `development` at runtime | `production` | Expected diff |
| `OPENAI_MODEL` | `gpt-5.5` (from `.env`) | Not in yaml; live OpenAI calls succeed | Unknown fingerprint |
| `OPENAI_API_KEY` | Present (sha256_8: `a38b6209`) | Present (`providers.openai: configured`) | Both configured |
| `BIBLEBUDDY_CHAT_TIMEOUT_MS` | unset → **55000 default** | Not in yaml → **not deployed** | **MISMATCH** |
| `BIBLEBUDDY_STATE_TTL_MS` | unset → **86400000 default** | Not in yaml → **not deployed** | **MISMATCH** |
| `BIBLEBUDDY_DISABLE_OPENAI` | unset | Not in yaml | N/A |
| `BUDDY_RUNTIME` | unset locally | `legacy` | Render explicit |
| `BUDDY_TEMPLATE_PROSE` | unset locally | `0` | Render explicit |
| `BUDDY_DISABLE_STUDY_FALLBACK` | unset locally | `1` | Render explicit |
| `BUDDY_LIVE_TRACE` | unset | `0` | Render explicit |
| Start command | `node server.js` | `node server.js` | Match |
| Data directory | `./data` (writable) | `/opt/render/project/src/data` (typical) | Same code path |
| Node | v26.0.0 (local shell) | `>=20.x` (package.json) | Compatible |
| Plan / memory | dev machine ~68MB RSS probe | Render **standard** plan | Render capped |

## Filesystem / paths

| Path | LOCAL | RENDER |
|------|-------|--------|
| `server.js` | repo root | same |
| `data/` | created at startup | `fs.mkdirSync` in server.js |
| `routes/runtimeHealth.js` | **present** | **404 on `/api/runtime-health`** → not in deployed build |

## CPU / memory limits

- **Render:** `plan: standard` in `render.yaml` (512MB class; not queried from API).
- **LOCAL:** heap ~11–17MB at idle; stress suite heap growth &lt; 80MB.

## Critical parity gaps

1. **Phase 4F code not on Render** — `/api/runtime-health` returns 404.
2. **Phase 4F env vars not in `render.yaml`** — timeout, TTL, disable-OpenAI flags absent from declared config.
3. **Runtime behavior diverges** — Render uses `reason_first_openai`; local uses `doctrine_final_authority` with `openAiCalled: false`.

## Raw artifacts

- `docs/regression-trace/phase4g-parity-results.json`
- `scripts/runPhase4GProductionParityVerification.js`
