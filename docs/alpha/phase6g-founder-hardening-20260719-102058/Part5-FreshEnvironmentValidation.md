# Part 5 — Fresh-Environment Installation Validation

## Method used

Method 2/3 hybrid (per the batch's preferred order): the current Phase 6G
work is **uncommitted** on branch `sprint-2c-c3-explicit-scripture-handoff`
(157 changed/untracked paths at baseline), so a plain `git clone` of the
tested commit would not include it. Instead:

1. Created an isolated temp directory: `/tmp/bible-buddy-fresh-env/repo`.
2. Copied the **working tree as it stands right now** (all Phase 6G
   changes included, committed or not) via `rsync`, explicitly excluding
   `.git`, `node_modules`, and the 1.9GB `docs/` tree (kept only two
   subpaths — see finding #1 below).
3. Confirmed no `node_modules`, build output, caches, or hidden absolute
   paths were carried over (fresh `npm ci` from the lockfile only).
4. **Did not** copy the real local `.env`. Instead created `.env` from
   `.env.sample` with `PORT` changed to `3099` and every credential field
   (`OPENAI_API_KEY`, admin tokens, etc.) left blank — the true "new
   developer/founder, no secrets yet" condition — so that any
   credential-dependent behavior would surface honestly rather than being
   silently masked by borrowing my real key.
5. Ran `npm ci` (not `npm install`) to enforce exact lockfile fidelity.
6. Started the server on port 3099 (isolated from the port-3000 dev
   instance) and validated `/health`.
7. Ran `scriptureFidelitySmoke`, `alphaCoreTruthSmoke`,
   `openAiFirstRegressionTest`, `liveRuntimeVerification`,
   `decisionOwnershipSmoke`, `phase5OContinuationRegression`, and the full
   `founder-alpha:validate` command against this isolated instance.
8. Stopped the isolated server and deleted the entire temp directory
   (confirmed removed).

## Findings

### 1. REAL FINDING — runtime-required data lives inside `docs/`

The first fresh-env attempt (excluding all of `docs/`, on the assumption
it was pure documentation/reports) crashed at runtime:

```
Error: ENOENT: no such file or directory, open
'.../docs/bible-learning/approved-doctrine-registry.json'
  at loadApprovedDoctrineRegistry (services/approvedDoctrineRegistry.js:14)
  at retrieveEvidenceCards (services/evidenceCards/index.js:125)
  at buildRetrievalEvidencePack (services/retrievalEvidencePack.js:482)
  at runOpenAiFirstCompanionRuntime (services/openAiFirstCompanionRuntime.js:514)
```

Investigation confirmed **two** runtime-required data directories live
under `docs/`, not `data/`:

- `docs/bible-learning/` — read by `services/approvedDoctrineRegistry.js`,
  `services/bibleWordSenseEngine.js`, `services/bibleNaturalConcordanceBuilder.js`,
  `services/concordanceFoundation.js`, `services/scriptureDiscoveryEngine.js`.
- `docs/evidence-candidates/` — read by `services/phase4c1RuntimeDiagnostics.js`,
  `services/iogIcojGovernedIngestion.js`, `services/phase4a4GovernanceActivation.js`,
  `services/phase4aFinalHandoff.js`.

Both **are** tracked in git (`git ls-files docs/bible-learning/approved-doctrine-registry.json`
confirms this), so a genuine `git clone` of the repository does include
them — this is **not** a blocker for the currently-planned Render
deployment path (`buildCommand: npm install` operates on the full cloned
tree). It is, however, a real architectural fragility:

- Deploy tooling that trims `docs/` to reduce build-context size (a very
  common `.dockerignore`/CI-artifact pattern, and one this repo's own
  `docs/` folder invites at 1.9GB) would silently break Scripture
  retrieval and IOG/ICOJ diagnostics with no warning at build time — only
  a runtime crash on the first affected request.
- It is confusing for any future maintainer: a folder named `docs` should
  not contain files required for `runBuddy()` to complete a request.

**Disposition:** Documented, not fixed in this batch (moving these paths
is a structural change outside the "smallest safe fix" mandate of Phase
6G and risks breaking the four services above if done under time
pressure). **Recommendation for the next maintenance batch:** relocate
`docs/bible-learning/` and `docs/evidence-candidates/` under `data/` or a
new `runtime-config/` directory, with a single re-pointed `path.join`
constant in each of the ~9 consuming files, then re-run this same
fresh-environment validation to confirm the fix.

### 2. REAL FINDING — one high-severity transitive dependency vulnerability

`npm ci` in the fresh environment surfaced (also reproducible in the main
repository):

```
form-data  4.0.0 - 4.0.5  (Severity: high)
CRLF injection in form-data via unescaped multipart field names/filenames
https://github.com/advisories/GHSA-hmw2-7cc7-3qxx
Fix available via `npm audit fix`
```

Dependency chain: `axios@1.16.1 → form-data@4.0.5` and
`openai@4.104.0 → @types/node-fetch@2.6.13 → form-data@4.0.5` (deduped) —
both are transitive, not a direct dependency BibleBuddy code calls
directly with attacker-controlled multipart field names. `npm audit fix`
was attempted but rejected by this session's own command-safety review as
an out-of-scope networked dependency mutation; it was **not force-run**.
**Recommendation:** run `npm audit fix` (patch-level only, no direct
dependency major-version bump expected) in a dedicated, reviewed
commit before Founder Alpha, or immediately after if time-boxed.

### 3. Credential-dependent difference (expected, not a defect)

With `OPENAI_API_KEY` intentionally blank, exactly **one** test case
differs from the fully-provisioned run:

| Suite | With real key (Part 4, port 3000) | Fresh env, no key (port 3099) |
|---|---|---|
| scriptureFidelitySmoke | 4/4 | 4/4 (unchanged) |
| alphaCoreTruthSmoke | 6/6 | 6/6 (unchanged) |
| liveRuntimeVerification | 6/6 | 6/6 (unchanged) |
| decisionOwnershipSmoke | 14/14 | 14/14 (unchanged — the deterministic `companion_lane_fallback`/`health_support` reply already satisfies the safety check even with no OpenAI call) |
| phase5OContinuationRegression | pass | pass (unchanged) |
| openAiFirstRegressionTest | 10/10 | **9/10** |

The single difference is case `9_knees_health`, which explicitly asserts
`expectOpenAi: true`. Without a key, the companion correctly and safely
falls back to a deterministic `companion_lane_fallback` reply
("I'm sorry you're dealing with that. I can't diagnose medical
conditions...") instead of calling OpenAI — the *safety* property holds,
but the test's specific assertion that OpenAI must have been called
cannot be satisfied without a real key. This is a credential-dependent
result, not a Phase 6G regression, not a fresh-install defect, and not
falsely reported as passing — the validator honestly reports it as a
`FAIL` (conservative) attributable entirely to the missing
`OPENAI_API_KEY` in this specific isolated run.

### 4. Fresh-env `founder-alpha:validate` run (port 3099, no credentials)

```
=== FOUNDER READINESS: BLOCKED ===
pass=34 warn=4 fail=1 skip=0
```

The single FAIL is exactly finding #3 above (`openAiFirstRegressionTest`,
credential-dependent). The 4 warnings are the same categories already
documented in Part 4 (no admin token configured; `~6s` Admin snapshot
latency) plus the expected `OPENAI_API_KEY not set` provider warning and
a `git` `WARN` (the temp directory has no `.git` — expected, since it was
copied from the working tree, not cloned).

## No hidden machine-specific paths, undeclared dependencies, or startup races found

- `npm ci` succeeded cleanly from `package-lock.json` alone (151 packages,
  no manual `npm install` steps needed, no missing peer dependencies).
- `node -c server.js` and actual startup both succeeded with zero code
  changes needed.
- No absolute developer-machine paths found in source (all `path.join(__dirname, …)`).
- No port conflicts — the app respects `process.env.PORT`.
- No build step required (`"build": "echo \"no build step\""`) — confirmed accurate.
- No case-sensitive filename issues encountered (macOS test; a
  case-sensitive Linux CI/Render filesystem is the real target — no
  evidence of a mismatch found in the require graph scanned for Part 14).
- No startup race: `/health` was reachable within ~3s of process start on
  every attempt, consistent with the main dev instance.

## Cleanup

Temp directory `/tmp/bible-buddy-fresh-env` fully removed after
validation; isolated server on port 3099 stopped; main dev server on port
3000 left running and confirmed still healthy throughout.

## Files modified as a result of this Part

- None (findings #1 and #2 are documented, not remediated, per the
  "smallest safe change" / "do not redesign" mandate — see
  recommendations above for a follow-on batch).

## Acceptance

- Fresh-environment installation succeeded (`npm ci`, clean lockfile).
- Fresh-environment health check succeeded (`/health` → `200`).
- Founder Alpha-relevant regressions ran in the isolated environment;
  the only discrepancy from the fully-provisioned Part 4 run is
  transparently documented as credential-dependent, not silently passed.
- Two real, non-blocking findings (docs/-embedded runtime data;
  transitive `form-data` advisory) are explicitly listed with concrete
  file evidence and a recommended remediation path, per the "remaining
  unprocessed/unresolved items must be explicitly listed" requirement.
