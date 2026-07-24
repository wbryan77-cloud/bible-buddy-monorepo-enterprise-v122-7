# 00 — CI Pipeline Certification

**Gate:** 1 — CI Pipeline (Blocking)  
**Decision:** **PASS** (GitHub Actions green for exact pushed commit)  
**Date:** 2026-07-24  
**Batch:** Master Continuation v7.0

## Original failure

| Field | Value |
|---|---|
| Workflow | `CI` (`.github/workflows/ci.yml`) |
| Job | `required` |
| Step | Syntax-check every tracked JS file |
| First error file | `lib/coach/engine.js` |
| Error | `SyntaxError: Cannot use import statement outside a module` |
| Prior failing commits | e.g. `21314f9` Actions conclusion `failure` |

## Exact root cause

1. Sole package scope: root `package.json` declares `"type": "commonjs"`.
2. That package governs all tracked `.js` under the repo (no nested `package.json`).
3. Required CI ran bare `node --check "$f"` on every tracked `.js` file.
4. Orphan stubs under `lib/` and `worker/` use ESM `import`/`export`.
5. Node therefore parsed valid ESM as CommonJS → false syntax failure.

Proven locally: same bytes fail under in-repo `node --check`; pass when mirrored as `.mjs`.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Convert project to `"type":"module"` | Forbidden module-system conversion; high blast radius |
| Convert orphan ESM stubs to CommonJS only (`12e6a4d`) | Masks the checker bug; changes source form without fixing CI semantics |
| Exclude `lib/` / `worker/` from syntax check | Silently skips tracked JS; can hide real errors |
| Add nested `package.json` `"type":"module"` under `lib/` | Broader package-boundary change than needed for a CI false positive |

## Final repair

Commit **`864cea0`** (`864cea076388682cffedd1338859300600a4845d`)

Subject: `fix(ci): validate mixed CommonJS and ESM syntax correctly`

Files:

- `.github/workflows/ci.yml` — ESM-aware syntax step:
  - CJS: `node --check` unchanged
  - ESM (top-of-file `import`/`export`): copy to unique temp, rename to `.mjs`, `node --check`, always `rm` (including on failure), `exit 1` on failure
  - Portable `mktemp` (X’s at end) + process substitution (no pipe subshell)
- Restored original ESM forms (undo prior CJS conversion):  
  `lib/coach/engine.js`, `lib/coach/scripts.js`, `lib/memory/adapter.js`, `lib/ocr/index.js`, `lib/persist/memory.js`, `lib/persist/prisma.js`, `lib/precept/engine.js`, `worker/jobs.js`

Branch: `main`  
Push: `12e6a4d..864cea0` → `origin/main`

## Phase 0 worktree reconciliation

UI appeared to show only `ci.yml` because:

- Eight ESM restores were **staged** (`M ` in column 1)
- `ci.yml` was **unstaged** (` M`)
- HEAD `12e6a4d` still held the CJS conversion until this commit

Unrelated dirty files (admin login, companion memory, etc.) were **excluded** from the CI commit.

## Local controls (Gate 1A)

| Control | Result |
|---|---|
| Valid CommonJS | PASS |
| Valid ESM | PASS |
| Invalid CommonJS | FAIL as expected |
| Invalid ESM | FAIL as expected |
| Temp cleanup after failed ESM check | PASS |
| Full tracked syntax (943 files) | PASS |
| Bare `node --check lib/coach/engine.js` still fails under type=commonjs | PASS (control) |
| `npm run build` | PASS |
| Phase 2 suite | 15/15 PASS |
| Server `/health` | PASS |
| Docker Node 20 spot-check | Unavailable on host (Actions used Node 20 successfully) |

## GitHub workflow result (Gate 1C)

| Field | Value |
|---|---|
| Run ID | `30064960517` |
| URL | https://github.com/wbryan77-cloud/bible-buddy-monorepo-enterprise-v122-7/actions/runs/30064960517 |
| Head SHA | `864cea076388682cffedd1338859300600a4845d` (matches push) |
| Event | `push` |
| Workflow conclusion | **success** |
| Job `required` | **success** |
| Syntax-check step | **success** |
| Phase 2 step | **success** |
| Boot server / `/health` | **success** |
| Job skipped? | No |
| `continue-on-error` on required? | No (only informational job uses it by design) |

## Residual risk

- ESM detection is a top-40-line `import`/`export` heuristic (sufficient for current orphan stubs; atypical ESM without those tokens could be checked as CJS).
- Local Gate 1A ran on Node 26; Actions certified on Node 20 for this commit.
- Informational job remains non-blocking by design (pre-existing).

## Gate 1 status

**PASS** — do not treat prior local-only runs as GitHub success; this certification is tied to run `30064960517` on `864cea0`.
