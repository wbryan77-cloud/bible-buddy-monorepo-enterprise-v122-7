# Phase 4L.2 — Doctrine Answer Trace & Claim Bundle Staging Audit

Generated: 2026-06-12  
Scope: Read-only. No deploy, push, or doctrine logic changes.

---

## Part 1 — `services/doctrineAnswerTrace.js`

### Source reference

| Item | Value |
|------|-------|
| Path | `data/bae-doctrine-traces.jsonl` |
| Write gate | `process.env.BAE_TRACE === '1'` (opt-in) |
| Importer | `openAiFirstCompanionRuntime.js` (staged) — top-level `require` |

### 1. Does it write files on every request?

**No.**

| Step | When | Writes disk? |
|------|------|--------------|
| `require('./doctrineAnswerTrace')` | First `/buddy/chat` (lazy load OpenAI runtime) | No |
| `buildDoctrineAnswerTrace()` | Only when `openaiCalled === true` at end of OpenAI compose path | No — in-memory object only |
| `writeDoctrineAnswerTrace()` | After build, if trace object exists | **Only if `BAE_TRACE=1`** |

**Strict doctrine early return** (`runStrictDoctrineGate` handled): `openaiCalled` stays false → **no** `buildDoctrineAnswerTrace`, **no** write.

Default production: `BAE_TRACE` unset → writes **never** occur.

### 2. Does it append unbounded logs?

**Only when `BAE_TRACE=1`.**

```javascript
fs.appendFileSync(TRACE_FILE, `${JSON.stringify(trace)}\n`, 'utf8');
```

- No rotation, no size cap, no `safeJsonlWriter`
- One line per OpenAI-composed turn where trace is built
- **Risk if misconfigured:** `bae-doctrine-traces.jsonl` grows without bound on Render ephemeral disk

`render.yaml` does **not** set `BAE_TRACE`. Docs/regression treat default as **off**.

### 3. What does it store?

**In written trace (when enabled):**

| Data | Stored? | Notes |
|------|---------|-------|
| `runtimeContext` | **No** | Not passed to trace builder |
| Full `structured` payload | **No** | Only `composeMeta.doctrineConclusion`, `openaiAttempts` |
| Full `evidencePack` | **No** | Slim `retrieval`: intent, topic, effectiveTopic, cardIds, catalogKeys, counts |
| OpenAI raw response | **No** | `finalReplyHash` (16-char SHA-256 prefix) + `replyPreview` (400 chars) |
| Full conversation history | **No** | Single `userMessage` string |
| Claims | **Yes** — per-claim rows | claim text, scriptures, support class/reason, issues (not full graph) |
| `claimTraceabilityMatrix` | **Yes** | Matrix rows + summary counts |

**In memory during OpenAI path (before write):**

- `claimValidation` on `structured` may include `graph` from `validateClaimToScripture`, and `buildApprovedEvidenceGraph` embeds a reference to the full `evidencePack` on that graph object (`approvedEvidenceGraph.js` line 66). That is **claim validator retention**, not trace-file content; trace output does not serialize `evidencePack`.

### 4. Can it contribute to Render OOM?

| Vector | Risk | Condition |
|--------|------|-----------|
| Unbounded JSONL | **Medium** | `BAE_TRACE=1` in production |
| Per-request trace build | **Low** | Only when `openaiCalled`; object is KB-scale (claims + matrix), discarded after request |
| Module load | **Negligible** | ~3.6 KB source + `claimTraceabilityMatrix` chain |

**Not a primary OOM driver** if `BAE_TRACE` remains off (default). Mis-enabling trace is a **disk + parse** risk analogous to other unbounded JSONL (Phase 4J), not heap retention at scale.

### 5. Required for runtime operation or diagnostics only?

| Function | Role |
|----------|------|
| **Module file present** | **Required** — `openAiFirstCompanionRuntime` top-level `require('./doctrineAnswerTrace')` |
| `buildDoctrineAnswerTrace` | **Diagnostics / audit** on OpenAI path (in-memory) |
| `writeDoctrineAnswerTrace` | **Diagnostics only** — optional file audit |

Runtime **cannot start the buddy path** without the module file; trace **writing** is not required for correct chat behavior.

### 6. Can missing `doctrineAnswerTrace` crash runtime?

**Yes.**

```
Error: Cannot find module './doctrineAnswerTrace'
```

Thrown when first `runBuddy()` loads `openAiFirstCompanionRuntime.js` (lazy require in `buddyBrain.js`). Server `/health` may still respond; **first `/buddy/chat` fails**.

### 7. Is `doctrineAnswerTrace` safe to deploy as-is?

**Yes — with operational guardrail.**

| Check | Status |
|-------|--------|
| Default off disk writes | ✅ `BAE_TRACE` must be `'1'` to write |
| No full pack/history in trace JSON | ✅ Slim retrieval + claim rows |
| No rotation when enabled | ⚠️ Do not set `BAE_TRACE=1` on Render without a rotation plan |
| Required for module load | ✅ Must ship file with staged OpenAI runtime |

**Deploy-as-is recommendation:** Ship the file; keep `BAE_TRACE` unset or `0` in Render env.

---

## Part 2 — Full claim subsystem bundle staging audit

### Files reviewed

| File | Size | On `origin/main` | In Phase 4K staged index |
|------|------|------------------|--------------------------|
| `claimNormalizer.js` | 1,773 B | ❌ | ❌ |
| `claimExtractor.js` | 6,288 B | ❌ | ❌ |
| `claimSupportVerifier.js` | 9,524 B | ❌ | ❌ |
| `claimToScriptureValidator.js` | 11,934 B | ❌ | ❌ |
| `claimTraceabilityMatrix.js` | 2,999 B | ❌ | ❌ |
| `approvedEvidenceGraph.js` | 2,519 B | ❌ | ❌ |
| `approvedSupportGraph.js` | 38,807 B | ❌ | ❌ |
| `scriptureReferenceNormalizer.js` | 3,193 B | ❌ | ❌ |
| `supportRelationshipEngine.js` | 6,994 B | ❌ | ❌ |
| `doctrineConclusionBuilder.js` | 1,495 B | ❌ | ❌ |
| `doctrineAnswerTrace.js` | 3,587 B | ❌ | ❌ |

**Already on `origin/main` (transitive, do not duplicate):**

- `services/approvedCatalogEvidence.js`
- `services/bibleOnlyAuthorityValidator.js`

### Runtime role summary

| File | Live `/buddy/chat` | Strict doctrine gate | OpenAI companion path | BAE tooling only |
|------|--------------------|----------------------|------------------------|------------------|
| `claimNormalizer` | Module load + OpenAI path | No (gate bypass) | Yes | Scripts |
| `claimExtractor` | Transitive | No | Yes (fallback extract) | Scripts |
| `claimToScriptureValidator` | Module load + OpenAI path | No | Yes (validate/degrade/regen) | Many scripts |
| `claimSupportVerifier` | Transitive | No | Yes | Scripts |
| `claimTraceabilityMatrix` | Via trace build on OpenAI | No | Diagnostics | Scripts |
| `approvedEvidenceGraph` | Transitive | No | Yes | Scripts |
| `approvedSupportGraph` | Transitive (static edges) | No | Yes | Heavy BAE usage |
| `scriptureReferenceNormalizer` | Transitive | No | Yes | Scripts |
| `supportRelationshipEngine` | Transitive | No | Yes | Scripts |
| `doctrineConclusionBuilder` | `reasonFirstComposer` | No | Yes | No |
| `doctrineAnswerTrace` | Module load | No | Build on `openaiCalled` | Write if `BAE_TRACE=1` |

None of these files are imported by `strictDoctrineGate`, `doctrineFinalAuthorityEngine`, `doctrineWitnessInventory`, `doctrineConversationState`, `responseGuarantee`, or `runtimeHealthMonitor`.

### Memory / OOM notes for bundle

| Component | OOM note |
|-----------|----------|
| `approvedSupportGraph.js` | ~39 KB static module parse once; edges array in heap for process lifetime — **acceptable** |
| `validateClaimToScripture` | Builds graph per OpenAI doctrine turn; graph holds `evidencePack` reference until request ends — same as OpenAI path already |
| `doctrineAnswerTrace` write | Unbounded JSONL **only** if `BAE_TRACE=1` |
| Strict path | **Does not run** claim validation or trace build |

### Staging verdict

## **SAFE_TO_STAGE**

**Conditions (operational, not code changes):**

1. Stage the **complete load chain** below — partial staging recreates `Cannot find module` errors.
2. Do **not** set `BAE_TRACE=1` on Render without JSONL rotation.
3. Do **not** treat `approvedSupportGraph.js` as corpus/evidence-card edit — it is frozen support-edge metadata for validation (audit does not modify it).
4. `approvedCatalogEvidence.js` and `bibleOnlyAuthorityValidator.js` already on `origin/main` — no need to re-stage unless locally modified.

**Why not UNSAFE_TO_STAGE:**

- No literal secrets in bundle (Phase 4K secret scan pattern applies).
- No runtime unbounded logging **by default**.
- Required for staged `openAiFirstCompanionRuntime.js` and `reasonFirstComposer.js` to load.
- Does not alter Phase 4 strict doctrine authority path logic.

---

## Exact files required to eliminate `Cannot find module './claimNormalizer'`

Minimum set (11 services files) — **stage all of these together:**

```text
services/claimNormalizer.js
services/claimExtractor.js
services/claimSupportVerifier.js
services/claimToScriptureValidator.js
services/claimTraceabilityMatrix.js
services/approvedEvidenceGraph.js
services/approvedSupportGraph.js
services/scriptureReferenceNormalizer.js
services/supportRelationshipEngine.js
services/doctrineConclusionBuilder.js
services/doctrineAnswerTrace.js
```

### Dependency order (why each is required)

```text
openAiFirstCompanionRuntime (STAGED)
  ├── claimNormalizer.js          ← error if missing
  │     └── claimExtractor.js
  │           └── approvedEvidenceGraph.js
  │                 ├── approvedSupportGraph.js
  │                 │     ├── scriptureReferenceNormalizer.js
  │                 │     └── approvedCatalogEvidence.js (origin/main)
  │                 └── approvedCatalogEvidence.js (origin/main)
  ├── claimToScriptureValidator.js
  │     ├── claimNormalizer.js
  │     ├── scriptureReferenceNormalizer.js
  │     ├── claimSupportVerifier.js
  │     │     ├── claimNormalizer.js
  │     │     ├── scriptureReferenceNormalizer.js
  │     │     └── approvedSupportGraph.js
  │     ├── approvedEvidenceGraph.js (chain above)
  │     ├── supportRelationshipEngine.js
  │     │     ├── approvedEvidenceGraph.js
  │     │     └── claimSupportVerifier.js
  │     └── bibleOnlyAuthorityValidator.js (origin/main)
  └── doctrineAnswerTrace.js
        └── claimTraceabilityMatrix.js
              ├── claimSupportVerifier.js
              └── supportRelationshipEngine.js

reasonFirstComposer (STAGED)
  ├── claimNormalizer.js
  ├── claimToScriptureValidator.js (full chain above)
  └── doctrineConclusionBuilder.js
        └── claimNormalizer.js
```

### Staging command (when approved — not executed in this audit)

```bash
git add \
  services/claimNormalizer.js \
  services/claimExtractor.js \
  services/claimSupportVerifier.js \
  services/claimToScriptureValidator.js \
  services/claimTraceabilityMatrix.js \
  services/approvedEvidenceGraph.js \
  services/approvedSupportGraph.js \
  services/scriptureReferenceNormalizer.js \
  services/supportRelationshipEngine.js \
  services/doctrineConclusionBuilder.js \
  services/doctrineAnswerTrace.js
```

---

## Acceptance summary

| Item | Result |
|------|--------|
| `doctrineAnswerTrace` writes every request? | **No** (only if OpenAI called + `BAE_TRACE=1` for disk) |
| Unbounded logs? | **Only if `BAE_TRACE=1`** |
| Stores full pack/context/history? | **No** in trace file; hash + 400-char preview |
| OOM contributor? | **Low** default; **medium** if `BAE_TRACE=1` unbounded |
| Runtime vs diagnostics | **Module required**; **write diagnostics-only** |
| Missing file crashes? | **Yes** on first buddy chat |
| Safe deploy as-is? | **Yes** with `BAE_TRACE` off |
| Bundle staging | **SAFE_TO_STAGE** (11 files + existing origin deps) |

No deploy. No push. Audit only.
