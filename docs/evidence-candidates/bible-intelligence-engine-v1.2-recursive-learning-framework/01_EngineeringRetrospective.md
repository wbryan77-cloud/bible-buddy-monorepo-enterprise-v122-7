# 01 — Engineering Retrospective

Evidence tip: `99cb4c3` · Runtime foundation: `d8b584a` · Pre-v1.1A tip: `5499149`  
Sources: Phase 1A–1D finals, v1.1 FEL, v1.1A reasoning intelligence, `SprintResumeCheckpoint.md`, live owners under `services/` and `routes/`.

## Recurring engineering mistakes

| Issue class | Concrete instance | Root cause | How it happened | Fixed? | Recurrence still possible? | Smallest permanent prevention |
|---|---|---|---|---|---|---|
| Duplicate owners | Doctrine prose authored in gate *and* intended VLP composition | Multiple writers for final answer text | Fixed stamp in `doctrineFinalAuthorityEngine` before 1D | **Yes** (1D `composeDeterministicDoctrineReply`) | Yes if new lane adds prose outside owner | Owner map gate: one prose owner per route class |
| Duplicate runtime paths | Parallel companion / OpenAI-first forks historically | Feature growth without retirement | Partially consolidated; FEL forbids parallel runtime | Mostly | Yes if new client adds second chat path | Single chat instrumentation contract |
| Unused components | `evaluationRegistry` listed but no dispatcher | Spec ahead of wire | Registry file + HTTP list only | **No** | Yes | Do not register evaluators without a call site |
| Stored-but-unused memory | Durable user memory POSTGRES ≠ FEL durability | Assumed one durable store covers all | v1.1 JSONL FEL claimed durable via user-memory | Partially (v1.1A dual-write) | Yes if readers ignore durable overlays | One authoritative read path per record type |
| Indexed-but-unused knowledge | Approved books / IOG-ICOJ INDEXED_ONLY / disconnected | Governance without activation reader | Phase 1A–1C audits | **No** (evidence-gated) | Yes | Activation requires Admin + lawful body + runtime reader |
| Sync bottlenecks | Sync JSONL/index FS on request paths | File-first ledger | v1.1 speed-to-ship | Partial (async durable project) | Yes under load | Async append + durable-first read for multi-instance |
| Observability gaps | `/buddy/stream` no FEL capture; deploy/benchmark events declared unused | Happy-path instrumentation | `/buddy/chat` only | **No** | Yes | Coverage matrix as release gate |
| Evaluation dead ends | Seed calibration only; no post-repair outcome ingest | MEASURE AGAIN missing | v1.1A built shadow intelligence first | **No** | Yes | Outcome event required after APPROVED→implemented |
| Shadow systems | Discovery/hypothesis/prediction/watchers never promote | Correct safety default without promotion owner | Shadow-before-promotion policy | By design | Yes (stagnation) | Explicit Admin promotion → human patch → measure |
| Feature overlap | `recommendationIntelligence` vs `founderIntelligenceRecommendationStore` | Second recommendation source into queue | Pre-BIE + BIE both feed `adminDecisionQueue` | **No** | Yes | Queue source taxonomy + shared identity fingerprint |
| Lifecycle feedback break | `transitionLearningRecord` updates index/durable; `listLearningRecords` reads immutable JSONL only | Append-only JSONL without materialization | Overlay design incomplete | **No — primary V1.2 blocker** | Active now | Merge overlay into list/read APIs |
| Rejection fingerprint mismatch | Suppress hash ≠ `fingerprintPackage` | Two different fingerprint formulas | v1.1A ranking patch | **No — primary V1.2 blocker** | Active now | One fingerprint function for suppress + package |

## Verdict

The product did not fail from missing “intelligence features.” It repeatedly failed when **writers and readers disagreed** (dual stores, overlays, fingerprints) and when **shadow work had no governed close-the-loop owner**.
