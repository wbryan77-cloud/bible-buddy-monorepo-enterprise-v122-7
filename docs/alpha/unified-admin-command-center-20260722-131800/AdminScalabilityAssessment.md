# Admin Scalability Assessment — Unified Admin Command Center

Status: accurate as of the implementation in this batch. Documents what
was actually built, what was actually verified, and what is intentionally
deferred as future work rather than speculative infrastructure.

---

## 1. Design principles applied

Every new Command Center service (`adminCommandCenterAggregator.js`,
`adminDecisionQueue.js`, `adminAlertCenter.js`, `adminAuditTrail.js`,
`adminGlobalSearch.js`, `adminBriefingGenerator.js`, `adminChiefOfStaff.js`)
follows the same rules:

1. **Never load an unbounded number of records into memory or the browser.**
   Every read from an underlying store passes an explicit `limit`.
2. **Server-side pagination everywhere.** Every list-returning function
   accepts `limit`/`offset`, returns `total` alongside the page, and caps
   the maximum page size so a caller cannot request an unbounded page.
3. **Server-side filtering.** Severity/category/status/date/source filters
   are applied before pagination, not by shipping everything to the
   browser and filtering client-side.
4. **Partial-result tolerance.** Each aggregator section is wrapped so one
   slow/broken subsystem returns a `status: "ERROR"` section instead of
   failing the whole dashboard (Part 2 requirement, reused here for
   scalability — one hung subsystem cannot block the rest of the page).
5. **Cached/snapshot-backed sections stay cached.** Knowledge Coverage and
   Founder Readiness sections read pre-computed JSON snapshots (already
   built by existing systems) rather than recomputing analytics on every
   Admin page load.

## 2. Concrete bounds in place today

| Component | Bound | Where |
|---|---|---|
| Decision Queue — per-source read | 200 items/source (recommendations, review queue), 100 (lesson alignment) | `adminDecisionQueue.js: buildDecisionQueueItems()` |
| Decision Queue — page size | `min(requested, 200)`, default 50 | `adminDecisionQueue.js: listDecisionQueue()` |
| Global Search — per-provider scan | 500 records (recommendations, review queue, audit trail), 100 (lesson alignment) | `adminGlobalSearch.js` |
| Global Search — page size | `min(requested, 100)`, default 25 | `adminGlobalSearch.js: searchAdmin()` |
| Global Search — minimum query length | 2 characters (avoids scanning-everything on empty/1-char queries) | `adminGlobalSearch.js: searchAdmin()` |
| Audit Trail — file size | Rotates at 5MB, keeps 3 rotated backups (existing `safeJsonlWriter.js` policy, reused as-is) | `services/safeJsonlWriter.js` |
| Audit Trail — read | Reads at most the most recent 5000 lines from disk, then applies filters, then paginates (`min(requested, 500)`, default 100) | `adminAuditTrail.js: readAllAuditLines() / readAdminAuditTrail()` |
| Aggregator — recent errors/fallbacks | Last 10 only | `adminCommandCenterAggregator.js` |
| Aggregator — top categories/topics | Top 8 only | `adminCommandCenterAggregator.js` |
| Aggregator — decision queue preview | Top 10 only (full queue is its own paginated endpoint) | `adminCommandCenterAggregator.js` |
| Aggregator — alerts preview | Top 10 only (full alert list is its own endpoint) | `adminCommandCenterAggregator.js` |
| Alert Center — evidence per alert | Capped at 20 occurrences, deduplicated/grouped by category+summary | `adminAlertCenter.js` |
| Briefings | Computed from bounded runtime-health history windows + bounded decision-queue/alert reads; never a full historical session scan | `adminBriefingGenerator.js` |
| AI Chief of Staff | Never queries anything beyond the same bounded aggregator/queue/alert/briefing calls above; no raw session content is ever sent to the model | `adminChiefOfStaff.js` |

## 3. What this means for the "millions of users" requirement

The Command Center itself introduces **no new unbounded-memory-growth
risk**: it composes existing bounded reads (see table above). However,
the honest scalability ceiling of the entire Admin surface — not just the
new Command Center — is the same one documented in Part 14 of the prior
Architecture batch (`docs/alpha/.../ArchitectureFreezeDeclaration.md` and
related consolidation reports):

- **Storage is file-based (JSON/JSONL on local disk), not a database.**
  This is fine at Founder Alpha scale (single admin, single Render
  instance, low request volume) but will not scale to millions of users
  or multiple server instances without a real datastore. This was true
  before this batch and remains true after it — the Command Center does
  not make it worse, and does not fix it, because that would be
  "speculative infrastructure" outside this batch's scope.
- **No horizontal scaling / multi-instance support today.** The overlay
  file (`data/admin-command-center/decision-queue-overlay.json`) and the
  audit trail (`data/admin-command-center/unified-audit-trail.jsonl`) are
  local files. Running more than one server instance would create two
  independent, non-synchronized copies of Admin state. Not a regression —
  the pre-existing recommendation store and review queue already have
  this same limitation.

## 4. Issues found and repaired within this batch's scope

- Decision Queue and Global Search were designed with per-source/provider
  limits and page-size caps from the start (no repair needed — verified
  by code review above).
- Audit trail read path was verified against the existing bounded-file
  policy in `safeJsonlWriter.js` (5MB rotation, 3 backups) — confirmed
  sufficient for the current single-admin, low-volume usage pattern.
- No unbounded `readdirSync`/full-directory scans were introduced by any
  new Command Center service.

## 5. Documented future work (not implemented — out of scope for this batch)

- Migrate append-only JSONL/JSON stores (recommendations, review queue,
  decision-queue overlay, unified audit trail, alerts) to a real database
  (e.g., Postgres) once user/admin volume justifies it. This is the same
  finding already on record from the prior Architecture Freeze batch.
- Add true cursor-based pagination (opaque cursor tokens) instead of
  numeric offset once record counts are large enough that `offset`-based
  paging becomes inefficient. At current volumes (hundreds of items) this
  is not yet a real cost.
- Add background/async briefing pre-computation (e.g., a scheduled job
  that writes the daily briefing once and every request reads the cached
  result) once briefing generation cost grows. Today's briefing generator
  already only touches bounded, already-cached data, so this is a future
  optimization, not a current defect.
- Add real multi-admin/multi-instance-safe storage before this becomes a
  multi-admin, multi-instance product (tracked in
  `AdminRoleCapabilityPlan.md`).

## 6. Verification performed

- Manual code review of every new/modified Command Center service
  confirming every list-returning function takes and enforces
  `limit`/`offset` (see table in Section 2).
- Live endpoint tests confirming paginated responses return `total`
  alongside a bounded `items`/`results`/`entries` page (see
  `UnifiedAdminCommandCenterAcceptance.json` for exact recorded values).
- Confirmed the existing `safeJsonlWriter.js` rotation policy applies
  unchanged to the new unified audit trail file.
