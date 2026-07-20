# Phase 6F — Part 14: Architecture, Cleanup, Scale, and Maintainability

## Method

Static analysis of the actual repository on this working tree: a
require-graph walk starting from `server.js` (capturing every quoted
relative-path string literal, not just direct `require('literal')`
calls, so it also follows the `mountRoute(label, mountPath,
requirePath)` dynamic-variable pattern used throughout `server.js`),
cross-referenced against a full-repo text search for every
`services/`, `routes/`, and `lib/` file's basename. No code was deleted
as part of this analysis — findings are reported for a deprecation
register, per the batch's explicit instruction.

## Headline Finding: Single-Process, File-Backed Architecture

```
package.json dependencies: axios, cookie-parser, csv-parse, dotenv,
                            express, multer, openai, pdf-parse
```

- **No database client dependency exists** (no `@prisma/client`, `pg`,
  `mongodb`, `redis`, etc.) even though `prisma/schema.prisma` is present
  in the repo. Prisma is not wired into any running code path — the
  schema file is currently a scaffold, not an active data layer.
- All persistence (`support-graph-candidates.jsonl`,
  `analytics-snapshots/*.json`, evidence/audit logs, companion memory)
  is local append-only JSONL/JSON files under `data/`, read/written with
  synchronous `fs.readFileSync` / `fs.writeFileSync` /
  `fs.appendFileSync` (140 files call `readFileSync`, 113 call
  `writeFileSync` across `services/*.js`).
- **No rate-limiting middleware** exists anywhere in `server.js` or
  `routes/*.js` (no `express-rate-limit` or equivalent dependency or
  hand-rolled limiter).
- `multer` (file-upload middleware) is an installed dependency that is
  **never required anywhere in the live code** — an unused dependency.
- `pdf-parse` **is** actively used, in `services/phase3fContentExtraction.js`
  — a real, working PDF-text-extraction capability that a future
  post-Alpha lesson-file-upload feature (Phase 6F Part 11) should reuse
  rather than reinventing.

### Classification

| Concern | Founder Alpha (few testers, one instance) | Closed Alpha (dozens) | Beta/Production (thousands–millions) |
|---|---|---|---|
| File-based persistence | `FOUNDER_ALPHA_SAFE` | `CLOSED_ALPHA_SAFE` | `PRODUCTION_SCALE_BLOCKER` — a single local disk cannot be shared across horizontally-scaled instances; no migration path exists yet from JSONL files to a real datastore |
| No rate limiting | `FOUNDER_ALPHA_SAFE` (small, known tester pool) | `BETA_REQUIRES_WORK` | `PRODUCTION_SCALE_BLOCKER` — an open `/buddy/chat` endpoint with no rate limit and OpenAI calls on the hot path is a direct cost/abuse risk at any real traffic level |
| Prisma schema present but unused | `FOUNDER_ALPHA_SAFE` (does not affect current runtime) | `CLOSED_ALPHA_SAFE` | `UNKNOWN_NEEDS_LOAD_TEST` — decide whether to wire it up or remove it before Beta; leaving an unused schema file is not itself a functional risk but signals incomplete migration |
| Unused `multer` dependency | `FOUNDER_ALPHA_SAFE` | `FOUNDER_ALPHA_SAFE` | `CLOSED_ALPHA_SAFE` — harmless but should be removed or wired up before Beta (see Deprecation register) |
| Single Node process, in-process OpenAI calls on hot path | `FOUNDER_ALPHA_SAFE` | `CLOSED_ALPHA_SAFE` | `PRODUCTION_SCALE_BLOCKER` — no horizontal scaling, no queueing/backpressure; a slow/blocked OpenAI call ties up a request handler with no timeout/circuit breaker observed in `server.js` |

**This batch does NOT claim the current single Node process is
production-scale merely because Phase 6 regressions pass.** The above
table is the honest scale classification requested by the batch.

## Require/Import Closure

- Starting from `server.js` and following every relative `require` path
  (including the dynamic-variable pattern `mountRoute(...)` uses),
  **283 distinct `.js` modules** are actually loaded when the live
  server process starts.
- There are **664 total `.js` files** across `services/`, `routes/`, and
  `lib/`.
- **385 files are not reachable from `server.js` at all.** This is
  *expected and by design* for a meaningful portion of them — the
  governed knowledge-acquisition pipeline, analytics engines, and
  regression/verification scripts are intentionally kept **outside the
  live answer hot path** (per this batch's own "Known Verified State"),
  and are invoked instead by operator-run scripts under `scripts/alpha/`.
- To separate "legitimately offline/batch-only" from "truly dead," a
  second, whole-repo text search (across `services/`, `routes/`, `lib/`,
  `scripts/`, `tests/`, `config/`, `worker/`, `project-brain/`,
  `templates/`, `render/`, `public/`, `admin/`, `data/`, and
  `server.js`/`package.json`) was run for every file's basename.
  **167 files' basenames appear nowhere outside their own file** —
  these are the highest-confidence orphan candidates (see
  `DeprecationAndCleanupRegister.md`). The remaining 218 of the 385 are
  referenced by at least one script/test/other module and are presumed
  intentional offline/batch-only infrastructure, not orphans.

## V1/V2 / Duplicate Runtime Scaffolds

Multiple companion-runtime files exist
(`bibleCompanionOrchestrator.js`, `openAiFirstCompanionRuntime.js`,
`reasonFirstBuddyRuntime.js`, `masterBuddyRuntime.js`,
`companionOperatingModelExperiment.js`). Live server startup log
(captured this session) identifies the actual active chain explicitly:

```
Buddy live path verified: POST /buddy/chat → routes/buddy.js →
  withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime →
  bibleCompanionOrchestrator
runtime mode: legacy → openAiFirstCompanionRuntime
```

This confirms **one** active runtime chain is unambiguous and
self-declared at startup — this is a good existing practice (already
built, not something this batch needed to add). `reasonFirstBuddyRuntime.js`
and `masterBuddyRuntime.js` were found in the require-graph walk; whether
they are legacy/experimental alternates or still-used internal
dependencies of the active chain was **not exhaustively traced further**
in this pass — flagged in the Deprecation register as
`UNKNOWN_NEEDS_REVIEW` rather than asserted either way, per the batch's
own caution against combining/removing without proof.

## Other Inspected Items

| Item | Finding |
|---|---|
| Unbounded caches | `services/canonicalScriptureProvider.js` already implements a bounded cache (`maxEntries: 2000`, TTL `21600000ms` — verified live via `/admin/api/bible-authority/provider-health` in Part 12). 48 files across `services/*.js` use `new Map()`; only a sample was manually spot-checked for boundedness (the Scripture cache) — a full audit of all 48 is `DEFER_POST_ALPHA` given Founder Alpha's small, known tester pool makes unbounded per-process memory growth low-risk in the near term, but is a real Beta-readiness item. |
| Synchronous file access | Confirmed extensive (140 `readFileSync` + 113 `writeFileSync` call sites in `services/*.js`). Acceptable for Founder Alpha's low concurrency; a `PRODUCTION_SCALE_BLOCKER` at real concurrency because synchronous disk I/O blocks the single Node event loop. |
| Per-request full-data scans | The Admin coverage/queue endpoints read entire JSONL/snapshot files per request (`readSupportGraphCandidates`, `readAllSnapshots`) — acceptable at current data volumes (低-hundreds of records), a `BETA_REQUIRES_WORK` item once candidate/evidence volume grows into the thousands. |
| Background-job concurrency | Ingestion/analytics jobs are invoked as one-shot operator scripts (`scripts/alpha/phase6d*.js`, `phase6e*.js`), not a persistent worker pool — no concurrent-job collision risk today, but also no queue/lock if an operator runs two jobs simultaneously. `DEFER_POST_ALPHA`. |
| In-memory user state / session isolation | Companion memory (`services/companionMemoryManager.js`) is keyed by `userId` and persisted to per-user file-backed stores (not a shared in-process Map that could leak across users) — verified live in Part 12 (`getMemorySnapshot`/`forgetMemory` probe). `FOUNDER_ALPHA_SAFE`. |
| Database persistence | None (see headline finding above). `PRODUCTION_SCALE_BLOCKER` for Beta+; not required for Founder Alpha. |
| Queue persistence | File-based JSONL append-only queue (`supportGraphCandidateQueue.js`) — durable across process restarts on the same disk, not shareable across multiple instances. `CLOSED_ALPHA_SAFE`. |
| Multi-instance / horizontal scaling | Not supported today (file-based state is per-instance-disk). `PRODUCTION_SCALE_BLOCKER`. |
| Rate limiting | None present (see headline finding). `PRODUCTION_SCALE_BLOCKER` before any public traffic. |
| Observability | Structured JSON console logs exist throughout the live path (`[LIVE_TRUTH_ORCHESTRATOR]`, `[ROUTE_OWNERSHIP]`, `[LIVE_TRUTH_RETURN]` — verified live in this session's regression runs) — good foundation, but there is no external log aggregation/alerting wired up. `CLOSED_ALPHA_SAFE`, `BETA_REQUIRES_WORK` for real alerting. |
| Deployment recovery | Covered in Part 15 (`FounderBuildAndRecoveryGuide.md`). |
| Schema migrations | None active (no live database). N/A for Founder Alpha; a real blocker only once/if a database is actually adopted. |
| Backup/restore | `data/` directory contains all durable state; no automated backup job exists today — `DEFER_POST_ALPHA`, document manual backup steps in Part 15. |
| Build reproducibility | Covered in Part 15. |
| Large uncommitted working tree | Confirmed at time of this report: `git status --short` shows a large number of untracked `docs/alpha/*` phase-report directories plus this batch's own new/modified files — expected given the volume of phase work product; not a runtime risk, but should be committed/organized promptly per repo hygiene. |

## Overall Scale Classification

- **Founder Alpha (this batch's target): `FOUNDER_ALPHA_SAFE`.** Every
  finding above that is a real concern is explicitly a `CLOSED_ALPHA_SAFE`,
  `BETA_REQUIRES_WORK`, or `PRODUCTION_SCALE_BLOCKER` item — none of them
  block a small, known Founder tester pool on a single running instance.
- **Closed Alpha:** `CLOSED_ALPHA_SAFE` with the caveat that rate
  limiting and a real backup routine should be added before opening to a
  larger, less-trusted tester pool.
- **Beta:** `BETA_REQUIRES_WORK` — needs a real database/queue for
  multi-instance state, request-level rate limiting, and async (non-blocking)
  disk I/O on the hot path.
- **Production (millions of users):** `PRODUCTION_SCALE_BLOCKER` on the
  current single-process, file-backed architecture. This is stated
  plainly per the batch's explicit instruction not to claim otherwise.

See `DeprecationAndCleanupRegister.md` for the specific file-level
cleanup candidates identified during this analysis.
